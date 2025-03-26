import { Server, Socket } from 'socket.io';
import type { GameList, GameRoom, WSMessage } from '@lib/socketTypes';
import { Game, GameState, Player, User, GamePhase, ListEntry } from '@game/pokerLogic';
import { v4 as uuidv4 } from 'uuid';

export function initializeSocket(io: Server) {
  // Store active games
  const games: {[key: string]: Game } = {};
  const gamesArray: ListEntry[] = [];
  
  // Track recently disconnected users to allow for page navigation
  const pendingReconnects = new Map<string, {
    userId: string;
    gameId: string;
    timestamp: number;
    timeout: NodeJS.Timeout;
  }>();

  // Store user sessions
  const users: {[key: string]: User } = {};

  // Log all events for debugging
  io.engine.on("connection_error", (err) => {
    console.log('Connection error:', err.req, err.code, err.message, err.context);
  });

  // Handle socket connections
  io.on('connection', (socket) => {
    console.log('User connected:', socket.id);
    
    // Handle user registration
    socket.on('register', (data) => {
      console.log(`Received socket event 'register'...`, data);
      
      // Check if data contains profile information
      if (!data || !data.profile) {
        console.error('Invalid register data:', data);
        socket.emit('error', { message: 'Invalid registration data' });
        return;
      }
      
      const profile = data.profile;
      
      users[socket.id] = {
        id: socket.id,
        username: profile.username || 'Anonymous',
        chips: profile.balance || 1000, // Starting chips
      };
      
      console.log(`Registered user:`, users[socket.id]);
      console.log(`Emitting socket event 'registration_success'...`);
      socket.emit('registration_success', { user: users[socket.id] });
    });
    
    socket.on('get_games_list', () => {
      console.log(`Received socket event 'get_games_list'...`);
      console.log(`Sending games list:`, gamesArray);
      socket.emit('games_list', gamesArray);
    });
    
    // Create a new game
    socket.on('create_game', (data) => {
      console.log(`Received socket event 'create_game'...`, data);

      const { tableName, creator, maxPlayers, blinds } = data;
      const gameId = uuidv4();
      const userId = socket.id;
      
      if (!users[userId]) {
        console.error(`User ${userId} not registered`);
        socket.emit('error', { message: 'You must register first' });
        return;
      }

      console.log(`Creating new game: ${tableName} by ${creator.username}`);
      games[gameId] = new Game(gameId, tableName, creator, maxPlayers, blinds?.small || 5, blinds?.big || 10);
      
      const listEntry: ListEntry = {
        index: gamesArray.length,
        id: gameId,
        name: games[gameId].name,
        playerCount: games[gameId].players.length,
        maxPlayers: games[gameId].maxPlayers,
        isStarted: games[gameId].hasStarted
      };

      gamesArray.push(listEntry);
      console.log(`Added game to list:`, listEntry);
      
      // Join the game room
      console.log(`Socket.join(${gameId}) executing...`);
      socket.join(gameId);
      
      console.log(`Emitting socket event 'game_created'...`);
      socket.emit('game_created', { gameId });
      
      // Update all clients with the new games list
      io.emit('games_list', gamesArray);
    });
    
    // Join an existing game
    socket.on('join_game', ({ gameId, profile }) => {
      console.log(`Received socket event 'join_game'...`, gameId);
      
      // Check if this is a reconnection after page navigation
      if (pendingReconnects.has(gameId + profile.username)) {
        const reconnectData = pendingReconnects.get(gameId + profile.username);
        if (reconnectData) {
          clearTimeout(reconnectData.timeout);
          pendingReconnects.delete(gameId + profile.username);
          console.log(`User ${profile.username} reconnected to game ${gameId}`);
        }
      }
      
      const userId = socket.id;
      const game = games[gameId];
      
      if (!game) {
        socket.emit('error', { message: 'Game not found' });
        return;
      }
      
      if (game.players.length >= game.maxPlayers) {
        socket.emit('error', { message: 'Game is full' });
        return;
      }
      
      if (!users[userId]) {
        socket.emit('error', { message: 'You must register first' });
        return;
      }

      // Check if player is already in the game (by username, not socket id)
      const existingPlayerIndex = game.players.findIndex(p => p.username === users[userId].username);
      if (existingPlayerIndex >= 0) {
        // Update the player's socket ID
        game.players[existingPlayerIndex].id = userId;
        console.log(`Player ${users[userId].username} reconnected with new socket ID ${userId}`);
      } else {
        // Create player object for new player
        const player: Player = {
          ...users[userId],
          seatNumber: game.players.length,
          folded: false,
          active: true,
          ready: false,
          allIn: false,
          cards: [],
          currentBet: 0,
          previousAction: 'none',
          avatar: profile.avatar_url
        };
        
        // Add player to the game
        game.players.push(player);
        console.log(`New player ${users[userId].username} joined game ${gameId}`);
      }
      
      // Join the game room
      console.log(`Socket.join(${gameId}) executing...`);
      socket.join(gameId);
      
      // Update the game state for the player who just joined
      socket.emit('game_state', { game: games[gameId].returnGameState() });
      
      // Let everyone know someone joined
      console.log(`Emitting socket event 'player_joined' to specific room '${gameId}'...`);
      io.to(gameId).emit('player_joined', { 
        player: users[userId],
        game: games[gameId].returnGameState()
      });
      
      // Check if we can start the game
      if (game.players.length >= 2 && game.phase === 'waiting') {
        game.startRound();
      }
      
      // Update the games list for all clients
      const gameIndex = gamesArray.findIndex(g => g.id === gameId);
      if (gameIndex !== -1) {
        gamesArray[gameIndex].playerCount = game.players.length;
        gamesArray[gameIndex].isStarted = game.hasStarted;
        io.emit('games_list', gamesArray);
      }
    });
    
    // Handle player actions (fold, check, call, raise)
    socket.on('player_action', ({ gameId, action }) => {
      console.log(`Received socket event 'player_action'...`);
      const game = games[gameId];
      const userId = socket.id;
      
      if (!game) {
        socket.emit('error', { message: 'Game not found' });
        return;
      }
      
      if (game.activePlayerId !== userId) {
        socket.emit('error', { message: 'Not your turn' });
        return;
      }
      
      const actionType = action.type;
      const player = game.players.find(p => p.id === userId);

      if (typeof player === 'undefined') return false;

      switch (actionType) {
        case 'fold':
          player.previousAction = 'fold';
          player.folded = true;
          break;
          
        case 'check':
          if (game.currentBet > player.currentBet) {
            socket.emit('error', { message: 'You must call or raise. You cannot check when the current bet is higher than the amount you have bet this round.'});
            return false;
          }

          player.previousAction = 'check';
          break;
          
        case 'call':
          const callAmount = game.currentBet - player.currentBet;
          if (callAmount > player.chips) {
            // Player is going all-in
            game.pot += player.chips;
            player.currentBet += player.chips;
            player.chips = 0;
            player.allIn = true;
          } else {
            game.pot += callAmount;
            player.currentBet = game.currentBet;
            player.chips -= callAmount;
          }
          player.previousAction = 'call';
          break;
          
        case 'bet':
          const betAmount = action.amount;
          if (betAmount > player.chips) {
            socket.emit('error', { message: 'You do not have enough chips to bet that amount.'});
            return false;
          }
          if (game.currentBet > 0) {
            socket.emit('error', { message: 'You cannot bet when there is already a bet in place. You must call or raise.'});
            return false;
          }
          game.pot += betAmount;
          player.currentBet = betAmount;
          player.chips -= betAmount;
          player.previousAction = 'bet';
          game.currentBet = betAmount;

          break;
          
        case 'raise':
          const raiseTotal = game.currentBet + action.amount;
          const raiseAmount = raiseTotal - player.currentBet;

          if (raiseAmount >= player.chips) {
            // All-in
            game.pot += player.chips;
            player.currentBet += player.chips;
            player.chips = 0;
            player.allIn = true;
            game.currentBet = player.currentBet;
          } else {
            game.pot += raiseAmount;
            player.currentBet = raiseTotal;
            player.chips -= raiseAmount;
            game.currentBet = raiseTotal;
          }
          player.previousAction = 'raise';

          break;
      }
    });
    
    // Handle chat messages
    socket.on('chat_message', ({ gameId, message }) => {
      console.log(`Received socket event 'chat_message'...`);
      const userId = socket.id;
      
      if (!users[userId]) return;
      
      console.log(`Emitting socket event 'chat_message' to specific room '${gameId}'...`);
      io.to(gameId).emit('chat_message', {
        sender: users[userId].username,
        message,
        timestamp: new Date().toISOString()
      });
    });

    socket.on('private_message', (targetSocketId, message) => {
      console.log(`Received socket event 'private_message'...`);
      const userId = socket.id;
      if (!users[userId]) return;
      
      const sender = users[userId].username;
      const formattedMessage = `[${sender}]: ${message}`;

      socket.to(targetSocketId).emit('private_message', socket.id, formattedMessage);
    });
    
    // Handle disconnections
    socket.on('disconnect', () => {
      console.log(`Received socket event 'disconnect'...`, socket.id);
      const userId = socket.id;
      
      // Skip if no user is associated with this socket
      if (!users[userId]) {
        return;
      }
      
      const username = users[userId].username;
      
      // Handle player leaving games
      Object.keys(games).forEach(gameId => {
        const game = games[gameId];
        const playerIndex = game.players.findIndex(p => p.id === userId);
        
        if (playerIndex >= 0) {
          // Don't immediately remove the player, set a timeout to allow page navigation
          const player = game.players[playerIndex];
          
          // Create a reconnection key
          const reconnectKey = gameId + username;
          
          // Clear any existing timeout
          if (pendingReconnects.has(reconnectKey)) {
            clearTimeout(pendingReconnects.get(reconnectKey)?.timeout);
          }
          
          // Set a timeout to remove the player if they don't reconnect
          const timeout = setTimeout(() => {
            console.log(`Timeout expired for player ${username} in game ${gameId}, removing...`);
            
            // Now actually remove the player
            const currentPlayerIndex = game.players.findIndex(p => p.username === username);
            if (currentPlayerIndex >= 0) {
              game.players.splice(currentPlayerIndex, 1);
              
              if (game.players.length < 2) {
                game.hasStarted = false;
                // Not enough players, reset game
                game.phase = GamePhase.WAITING;
                game.status = 'waiting';
                game.communityCards = [];
                game.pot = 0;
              }

              if (game.players.length === 0) {
                delete games[gameId];
                
                // Remove from games array
                const gameIndex = gamesArray.findIndex(g => g.id === gameId);
                if (gameIndex !== -1) {
                  gamesArray.splice(gameIndex, 1);
                }
                
                console.log(`Room '${game.name}' (ID: ${gameId}) no longer has any participants, destroying room...`);
              } else {
                // Update the games list
                const gameIndex = gamesArray.findIndex(g => g.id === gameId);
                if (gameIndex !== -1) {
                  gamesArray[gameIndex].playerCount = game.players.length;
                  gamesArray[gameIndex].isStarted = game.hasStarted;
                }
              }
              
              // Let remaining players know
              console.log(`Emitting socket event 'player_left' to specific room '${gameId}'...`);
              io.to(gameId).emit('player_left', {
                playerId: userId,
                game: games[gameId]?.returnGameState()
              });
              
              // Update the games list for all clients
              io.emit('games_list', gamesArray);
            }
            
            // Clean up the pending reconnect
            pendingReconnects.delete(reconnectKey);
          }, 10000); // 10 second grace period for reconnection
          
          // Store the timeout
          pendingReconnects.set(reconnectKey, {
            userId,
            gameId,
            timestamp: Date.now(),
            timeout
          });
          
          console.log(`Player ${username} disconnected from game ${gameId}. Setting 10-second timeout for reconnection.`);
        }
      });
      
      // Remove user from users list
      delete users[userId];
    });
  });
}