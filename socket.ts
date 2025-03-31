import { Server } from 'socket.io';
import { User, GamePhase, ListEntry, Action } from '@game/types';
import { Player, Game, Sidepot } from '@game/classes';
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

      console.log(`Creating new game: ${tableName} by ${creator.username}, creator chips: ${creator.chips}`);
      
      // Ensure creator has valid chips value
      if (typeof creator.chips !== 'number' || isNaN(creator.chips)) {
        console.warn(`Invalid chips value for creator ${creator.username}: ${creator.chips}, setting default 1000`);
        creator.chips = 1000;
      }
      
      games[gameId] = new Game(gameId, tableName, creator, socket, maxPlayers, blinds?.small || 5, blinds?.big || 10);
      
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
    socket.on('join_game', (data) => {
      console.log(`Received socket event 'join_game'...`, data);
      
      if (!data || !data.gameId || !data.profile) {
        socket.emit('error', { message: 'Invalid join_game data' });
        return;
      }
      
      const { gameId, profile } = data;
      
      // Check if this is a reconnection after page navigation
      if (profile && profile.username && pendingReconnects.has(gameId + profile.username)) {
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
        console.log(`Socket Error: Game not found.`);
        socket.emit('error', { message: 'Game not found' });
        return;
      }
      
      if (game.players.length >= game.maxPlayers) {
        console.log(`Socket Error: Game is full.`);
        socket.emit('error', { message: 'Game is full' });
        return;
      }
      
      if (!users[userId]) {
        console.log(`Socket Error: User must register first.`);
        socket.emit('error', { message: 'You must register first' });
        return;
      }

      // Check if player is already in the game (by username, not socket id)
      const existingPlayerIndex = game.players.findIndex(p => p.username === users[userId].username);
      if (existingPlayerIndex >= 0) {
        // Update the player's socket ID
        game.players[existingPlayerIndex].id = userId;
        console.log(`Player ${users[userId].username} reconnected to game '${game.name}' with new socket ID ${userId}`);
      } else {
        const username = profile.username;
        // Fix: Use profile.balance instead of profile.chips
        const chips = profile.balance || 1000; // Fallback to 1000 if balance is undefined
        const avatar = profile.avatar || profile.avatar_url;

        console.log(`Player joining with username: ${username}, chips: ${chips} (from balance: ${profile.balance}), avatar: ${avatar}`);

        // Find an available seat
        let availableSeat = -1;
        for (let i = 0; i < game.tablePositions.length; i++) {
          if (!game.tablePositions[i].occupied) {
            availableSeat = i;
            break;
          }
        }

        if (availableSeat === -1) {
          socket.emit('error', { message: 'No available seats' });
          return;
        }

        // Create player object for new player
        const player: Player = new Player(userId, username, availableSeat, chips, avatar);
                
        // Add player to the game
        game.players.push(player);
        
        // Update table positions
        game.tablePositions[availableSeat].occupied = true;
        game.tablePositions[availableSeat].playerId = player.id;
        
        // Sort players by seat number to maintain consistent order
        game.sortPlayerList();
        
        console.log(`New player ${player.username} joined game '${game.name}' at seat ${availableSeat}`);
      }
      
      // Join the game room
      console.log(`Socket.join(${gameId}) executing for user '${profile.username}'...`);
      socket.join(gameId);
      
      // Update the game state for the player who just joined
      socket.emit('game_state', { game: games[gameId].returnGameState() });
      
      // Let everyone know someone joined
      console.log(`Emitting socket event 'player_joined' to specific room '${gameId}'...`);
      io.to(gameId).emit('player_joined', { 
        player: users[userId],
        game: games[gameId].returnGameState()
      });
      
      // Let everyone know about the updated game state
      io.to(gameId).emit('game_state', { game: games[gameId].returnGameState() });
      
      // Check if we have at least 2 players and all are ready
      if (game.players.length >= 2 && game.phase === GamePhase.Waiting) {
        checkRoundStatus(game, io);
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
    socket.on('player_action', (data) => {
            
      if (!data || !data.gameId || !data.action) {
        socket.emit('error', { message: 'Invalid player action data' });
        return;
      }
      
      const { gameId, action } = data;      
      const game = games[gameId];
      const userId = socket.id;
      const actionType = action.type;
      
      if (!game) {
        socket.emit('error', { message: 'Game not found' });
        return;
      }
      
      const player = game.players.find(p => p.id === userId);
      if (!player) {
        socket.emit('error', { message: 'Player not found' });
        return;
      }
      
      // Validate player chips
      if (typeof player.chips !== 'number' || isNaN(player.chips)) {
        console.warn(`Invalid chips value for player ${player.username} performing action: ${player.chips}, fixing to 1000`);
        player.chips = 1000;
      }

      console.log(`Received socket event 'player_action'...\nGame Name: ${game.name} (ID: ${gameId})\nUser: ${player.username} (Chips: ${player.chips})\nAction: ${actionType} (${action.amount})`);
      
      if (game.hasStarted && actionType !== 'toggleReady' && game.activePlayerId !== userId) {
        socket.emit('error', { message: 'Not your turn' });
        return;
      }

      // Process player action
      let actionSuccess = false;
      let allIn = false;

      switch (actionType) {
        case 'toggleReady':
          player.ready = !player.ready;
          console.log(`${player.username}'s ready status is now set to '${player.ready}'`);
          
          // Send immediate update to all clients about this player's ready status
          io.to(gameId).emit('player_ready_changed', {
            playerId: player.id,
            playerName: player.username,
            isReady: player.ready,
            game: game.returnGameState()
          });
          
          // Check if all players are ready to start the game
          checkRoundStatus(game, io);
          actionSuccess = true;
          break;

        case 'fold':
          player.previousAction = 'fold';
          player.folded = true;
          actionSuccess = true;
          break;

        case 'check':
          if (game.currentBet > player.currentBet) {
            socket.emit('error', { message: 'You must call or raise. You cannot check when the current bet is higher than the amount you have bet this round.'});
            return false;
          }

          player.previousAction = 'check';
          
          // Log player check action
          console.log(`Player ${player.username} checks`);
          
          // No need to adjust currentBet or player.currentBet since a check doesn't change those
          actionSuccess = true;
          break;

        case 'call':
          const callAmount = game.currentBet - player.currentBet;
          if (callAmount > player.chips) {
            // Player is going all-in
            game.pot += player.chips;
            player.currentBet += player.chips;
            player.chips = 0;
            player.allIn = true;
            allIn = true;
          } else {
            game.pot += callAmount;
            player.currentBet = game.currentBet;
            player.chips -= callAmount;
          }
          player.previousAction = 'call';
          actionSuccess = true;
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
          if (betAmount === player.chips) {
            allIn = true;
          }
          game.pot += betAmount;
          player.currentBet = betAmount;
          player.chips -= betAmount;
          player.previousAction = 'bet';
          game.currentBet = betAmount;
          actionSuccess = true;
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
            allIn = true;
          } else {
            game.pot += raiseAmount;
            player.currentBet = raiseTotal;
            player.chips -= raiseAmount;
            game.currentBet = raiseTotal;
          }
          player.previousAction = 'raise';
          actionSuccess = true;
          break;
      }

      if (allIn) {
        const sidepot = new Sidepot(game.pot, [player]);
      }

      // If action was successful, advance the game
      if (actionSuccess) {
        // Track the previous phase to detect phase changes
        const previousPhase = game.phase;

        // Advance to next player or phase
        game.checkPhaseStatus();

        // If we've moved to showdown, handle the showdown
        if (game.phase === GamePhase.Showdown && previousPhase !== GamePhase.Showdown) {
          handleShowdown(game, io);
        }

        // Broadcast updated game state to all players
        io.to(gameId).emit('game_update', { game: game.returnGameState() });

        // If the phase changed, send a specific event
        if (previousPhase !== game.phase) {
          io.to(gameId).emit('phase_changed', {
            previousPhase: previousPhase,
            newPhase: game.phase,
            game: game.returnGameState()
          });
        }

        // Notify the new active player it's their turn
        if (game.activePlayerId) {
          console.log(`Notifying player ${game.activePlayerId} it's their turn`);
          const allowedActions = getAllowedActions(game, game.activePlayerId);
          io.to(game.activePlayerId).emit('your_turn', {
            gameId: game.id,
            allowedActions: allowedActions
          });
          
          // Also broadcast a message to everyone about whose turn it is
          io.to(gameId).emit('active_player_changed', {
            activePlayerId: game.activePlayerId,
            activePlayerName: game.players.find(p => p.id === game.activePlayerId)?.username || 'Unknown player'
          });
        }
      }
    });
    
    // Handle chat messages
    socket.on('chat_message', (data) => {
      console.log(`Received socket event 'chat_message'...`, data);
      const userId = socket.id;
      let sender = '';

      if (!users[userId]) sender = 'SYSTEM:';
      else sender = users[userId].username + ':';
      if (!data || !data.gameId || !data.message) {
        socket.emit('error', { message: 'Invalid chat message data' });
        return;
      }
      
      const { gameId, message } = data;
      
      console.log(`Emitting socket event 'chat_message' to specific room '${gameId}'...`);
      io.to(gameId).emit('chat_message', {
        sender,
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
              const playerToRemove = game.players[currentPlayerIndex];
              const seatNumber = playerToRemove.seatNumber;
              
              // Update table positions first
              if (seatNumber >= 0 && seatNumber < game.tablePositions.length) {
                game.tablePositions[seatNumber].occupied = false;
                game.tablePositions[seatNumber].playerId = null;
              }
              
              // Then remove the player from the players array
              game.players.splice(currentPlayerIndex, 1);
              
              // If player was dealer, small blind, or big blind, adjust roles
              if (game.players.length > 0) {
                // Ensure dealer index is valid
                if (game.dealerIndex >= game.players.length) {
                  game.dealerIndex = 0;
                }
                
                // Recalculate roles if we still have players
                if (game.status === 'playing') {
                  game.smallBlindIndex = (game.dealerIndex + 1) % game.players.length;
                  game.bigBlindIndex = (game.smallBlindIndex + 1) % game.players.length;
                  game.dealerId = game.players[game.dealerIndex].id;
                  game.smallBlindId = game.players[game.smallBlindIndex].id;
                  game.bigBlindId = game.players[game.bigBlindIndex].id;
                }
              }
              
              if (game.players.length < 2) {
                game.hasStarted = false;
                // Not enough players, reset game
                game.phase = GamePhase.Waiting;
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

function checkRoundStatus(game: Game, io) {
  // Sort players to ensure consistent order
  game.sortPlayerList();
  
  // Count ready players 
  const readyPlayers = game.players.filter(p => p.ready).length;
  const totalPlayers = game.players.length;
  
  console.log(`Checking round status: ${totalPlayers} players, ${readyPlayers} ready`);
  
  // Check if all players are ready and we're in waiting status
  if (game.status === 'waiting' && game.roundCount === 0) {
    const allReady = game.players.every(isReady);
    const enoughPlayers = totalPlayers >= 2;
    
    console.log(`Waiting status check: ${totalPlayers} players, all ready: ${allReady}`);
    
    if (enoughPlayers && allReady) {
      console.log(`All players are ready. Starting game...`);
      game.status = 'playing';
      game.hasStarted = true;
      
      // Announce game starting to all players
      if (game.id) {
        io.to(game.id).emit('game_starting', {
          message: 'All players ready! Game is starting...',
          game: game.returnGameState()
        });
        
        // Start the game after a short delay to allow clients to update UI
        setTimeout(() => {
          // Start the game round
          game.startRound();
          
          // Send the initial game state to all players
          io.to(game.id).emit('game_update', { 
            game: game.returnGameState(),
            message: 'Game has started!' 
          });
          
          // Notify the active player it's their turn
          if (game.activePlayerId) {
            io.to(game.activePlayerId).emit('your_turn', {
              gameId: game.id,
              allowedActions: getAllowedActions(game, game.activePlayerId)
            });
          }
        }, 1000);
      }
    }
  }

  // If we're already playing and need to check player readiness between rounds
  if (game.status === 'playing' && game.phase === GamePhase.Waiting && game.roundCount > 1) {
    const allReady = game.players.every(isReady);
    const enoughPlayers = totalPlayers >= 2;
    
    console.log(`Between rounds check: ${totalPlayers} players, all ready: ${allReady}`);
    
    if (enoughPlayers && allReady) {
      console.log(`All players are ready for next round. Starting new round...`);
      
      // Announce new round starting
      if (game.id) {
        io.to(game.id).emit('round_starting', {
          message: 'All players ready! New round is starting...',
          game: game.returnGameState()
        });
        
        // Start the next round after a short delay
        setTimeout(() => {
          game.startRound();
          
          // Send the updated game state to all players
          io.to(game.id).emit('game_update', { 
            game: game.returnGameState(),
            message: 'New round has started!' 
          });
          
          // Notify the active player it's their turn
          if (game.activePlayerId) {
            io.to(game.activePlayerId).emit('your_turn', {
              gameId: game.id,
              allowedActions: getAllowedActions(game, game.activePlayerId)
            });
          }
        }, 1000);
      }
    }
  }
}

function isReady(player) {
  return player.ready;
}

// Add a function to determine allowed actions for a player
function getAllowedActions(game, playerId) {
  console.log(`Getting allowed actions for player ${playerId} in game ${game.id}`);
  console.log(`Current game phase: ${game.phase}, current bet: ${game.currentBet}`);
  
  const player: Player = game.players.find(p => p.id === playerId);
  if (!player) {
    console.log(`Player not found`);
    return [];
  }
  
  // Validate player chips
  if (typeof player.chips !== 'number' || isNaN(player.chips)) {
    console.warn(`Invalid chips value for player ${player.username}: ${player.chips}, fixing to 1000`);
    player.chips = 1000;
  }
  
  console.log(`Player ${player.username} has ${player.chips} chips`);
  
  const actions: Action[] = [];

  // Always allow fold unless we're in preflop and player is big blind without additional bets
  if (!(game.phase === GamePhase.Preflop && player.id === game.bigBlindId && game.currentBet === game.bigBlind)) {
    actions.push('fold');
  }

  // Check if player can check - They can check if their current bet matches the highest bet
  // and there's no additional betting (or they're the big blind in preflop with no raises)
  if (player.currentBet === game.currentBet) {
    actions.push('check');
  }

  // Call is allowed if there's a bet to call and player has enough chips
  if (game.currentBet > player.currentBet && player.chips > 0) {
    actions.push('call');
  }

  // Bet is allowed if there's no current bet and player has chips
  if ((game.currentBet === 0 || 
      (game.phase === GamePhase.Preflop && player.id === game.bigBlindId && game.currentBet === game.bigBlind)) 
      && player.chips > 0) {
    actions.push('bet');
  }

  // Raise is allowed if there's a current bet and player has enough chips to raise
  if (game.currentBet > 0 && player.chips > game.currentBet) {
    actions.push('raise');
  }

  console.log(`Allowed actions for ${player.username}: ${actions.join(', ')}`);
  return actions;
}

// Add a function to handle showdown
function handleShowdown(game, io) {
  // If we're in showdown phase, determine winners
  if (game.phase === GamePhase.Showdown) {
    // If only one player remains (everyone else folded)
    const activePlayers = game.players.filter(p => !p.folded);
    if (activePlayers.length === 1) {
      // Award pot to the last remaining player
      const winner = activePlayers[0];
      winner.chips += game.pot;

      // Record the win
      winner.previousAction = 'win';

      // Reset the game for next round
      setTimeout(() => {
        resetForNextRound(game, io);
      }, 5000); // Give players 5 seconds to see the result

      return;
    }

    // If multiple players remain, determine winner by hand strength
    const winners = game.evaluateHands(activePlayers, game.communityCards);

    // Split pot among winners
    const potPerWinner = Math.floor(game.pot / winners.length);
    winners.forEach(winner => {
      winner.chips += potPerWinner;
      winner.previousAction = 'win';
    });

    // Reset the game for next round
    setTimeout(() => {
      resetForNextRound(game, io);
    }, 8000); // Give players 8 seconds to see the result
  }
}

function resetForNextRound(game, io) {
  // Sort players first to ensure consistent ordering
  game.sortPlayerList();
  
  // Make sure the dealer index is valid
  if (game.dealerIndex >= game.players.length) {
    game.dealerIndex = 0;
  }
  
  // Advance dealer position
  game.dealerIndex = (game.dealerIndex + 1) % game.players.length;

  // Reset game state for next round
  game.roundActive = false;
  game.phase = GamePhase.Waiting;
  game.pot = 0;
  game.currentBet = 0;
  game.communityCards = [];
  game.burnPile = [];

  // Reset player states
  game.players.forEach(p => {
    p.folded = false;
    p.allIn = false;
    p.cards = [];
    p.currentBet = 0;
    p.previousAction = 'none';
  });

  // Set all players to not ready for next round
  // This is critical - players must actively opt-in to the next round
  game.players.forEach(p => {
    p.ready = false;
  });
  
  // Also update roles based on new dealer position
  if (game.players.length >= 2) {
    game.smallBlindIndex = (game.dealerIndex + 1) % game.players.length;
    game.bigBlindIndex = (game.smallBlindIndex + 1) % game.players.length;
    game.dealerId = game.players[game.dealerIndex].id;
    game.smallBlindId = game.players[game.smallBlindIndex].id;
    game.bigBlindId = game.players[game.bigBlindIndex].id;
  }

  // Emit round ended event and wait for players to ready up again
  if (game.players.length >= 2) {
    // Notify all players that the round has ended and they need to ready up again
    io.to(game.id).emit('round_ended', { 
      game: game.returnGameState(),
      message: 'Round ended. Click Ready to play the next round.'
    });
  }
}