import { Game, Deck, evaluateHands, GamePhase, RoomStatus } from '@game/pokerLogic';
import { createServer } from "node:http";
import next from "next";
import { Server } from "socket.io";
import { v4 as uuidv4 } from 'uuid';

const dev = process.env.NODE_ENV !== "production";
const hostname = "localhost";
const port = 3003;
// when using middleware `hostname` and `port` must be provided below
const app = next({ dev, hostname, port });
const handler = app.getRequestHandler();

app.prepare().then(() => {
  const httpServer = createServer(handler);

  const io = new Server(httpServer);

  io.on("connection", (socket) => {
    // ...
  });

  httpServer
    .once("error", (err) => {
      console.error(err);
      process.exit(1);
  })
    .listen(port, () => {
      console.log(`> Ready on http://${hostname}:${port}`);
  });


  // Store active games
  const games: {[key: string]: Game } = {};

  // Store user sessions
  const users = {};

  // Handle socket connections
  io.on('connection', (socket) => {
    console.log('User connected:', socket.id);
    
    // Handle user registration
    socket.on('register', ({ username }) => {
      console.log(`Received socket event 'register'...`);
      users[socket.id] = {
        id: socket.id,
        username,
        chips: 1000, // Starting chips
      };
      
      console.log(`Emitting socket event 'registration_success'...`);
      socket.emit('registration_success', { user: users[socket.id] });
      
    });
    
    // Create a new game
    socket.on('create_game', ({ tableName, creator, maxPlayers, blinds }) => {
      console.log(`Received socket event 'create_game'...`);

      const gameId = uuidv4();
      const userId = socket.id;
      
      
      if (!users[userId]) {
        socket.emit('error', { message: 'You must register first' });
        return;
      }
      
      games[gameId] = new Game(gameId, tableName, creator, maxPlayers, blinds?.small || 5, blinds?.big || 10);
      
      // Join the game room
      console.log(`Socket.join(gameId) executing...`);
      socket.join(gameId);
      
      console.log(`Emitting socket event 'game_created'...`);
      socket.emit('game_created', { gameId });
    });
    
    // Join an existing game
    socket.on('join_game', ({ gameId }) => {
      console.log(`Received socket event 'join_game'...`);
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
      
      // Add player to the game
      game.players.push({
        ...users[userId],
        position: game.players.length
      });
      
      // Join the game room
      console.log(`Socket.join(gameId) executing...`);
      socket.join(gameId);
      
      // Let everyone know someone joined
      console.log(`Emitting socket event 'player_joined' to specific room '${gameId}'...`);
      io.to(gameId).emit('player_joined', { 
        player: users[userId],
        game: games[gameId]
      });
      
      // Check if we can start the game
      if (game.players.length >= 2 && game.phase === 'waiting') {
        game.startRound();
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
      
//      handlePlayerAction(gameId, userId, action);
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
    
    // Handle disconnections
    socket.on('disconnect', () => {
      console.log(`Received socket event 'disconnect'...`);
      const userId = socket.id;
      
      // Handle player leaving games
      Object.keys(games).forEach(gameId => {
        const game = games[gameId];
        const playerIndex = game.players.findIndex(p => p.id === userId);
        
        if (playerIndex >= 0) {
          // Remove player from game
          game.players.splice(playerIndex, 1);
          
          if (game.players.length < 2) {
            game.hasStarted = false;
            // Not enough players, reset game
            game.phase = GamePhase.WAITING;
            game.status = 'waiting';
            game.communityCards = [];
            game.pot = 0;
          }
          
          // Let remaining players know
          console.log(`Emitting socket event 'player_left' to specific room '${gameId}'...`);
          io.to(gameId).emit('player_left', {
            playerId: userId,
            game: games[gameId]
          });
        }
      });
      
      // Remove user from users list
      delete users[userId];
    });
  });
});


/*

function handlePlayerAction(gameId, playerId, action, amount?) {
  const game = games[gameId];
  const playerIndex = game.players.findIndex(p => p.id === playerId);
  const player = game.players[playerIndex];
  
  switch (action.type) {
    case 'fold':
      player.folded = true;
      break;
      
    case 'check':
      // No action needed, just pass the turn
      break;
      
    case 'call':
      const callAmount = game.currentBet - player.bet;
      if (callAmount > player.chips) {
        // Player is going all-in
        game.pot += player.chips;
        player.bet += player.chips;
        player.chips = 0;
        player.allIn = true;
      } else {
        game.pot += callAmount;
        player.bet = game.currentBet;
        player.chips -= callAmount;
      }
      break;
      
    case 'raise':
      const raiseTotal = game.currentBet + action.amount;
      const raiseAmount = raiseTotal - player.bet;
      
      if (raiseAmount >= player.chips) {
        // All-in
        game.pot += player.chips;
        player.bet += player.chips;
        player.chips = 0;
        player.allIn = true;
        game.currentBet = player.bet;
      } else {
        game.pot += raiseAmount;
        player.bet = raiseTotal;
        player.chips -= raiseAmount;
        game.currentBet = raiseTotal;
      }
      break;
  }
  
  // Move to next player
  moveToNextPlayer(gameId);
  
  // Update everyone
  io.to(gameId).emit('game_update', { game: games[gameId] });
}

function moveToNextPlayer(gameId) {
  const game = games[gameId];
  
  // Find current player index
  const currentPlayerIndex = game.players.findIndex(p => p.id === game.currentTurn);
  
  // Find next active player
  let nextPlayerIndex = (currentPlayerIndex + 1) % game.players.length;
  let roundComplete = false;
  
  // Check if we've gone all the way around back to the first bettor
  while (nextPlayerIndex !== currentPlayerIndex) {
    const nextPlayer = game.players[nextPlayerIndex];
    
    if (!nextPlayer.folded && !nextPlayer.allIn && nextPlayer.chips > 0) {
      // Found next active player
      game.currentTurn = nextPlayer.id;
      return;
    }
    
    nextPlayerIndex = (nextPlayerIndex + 1) % game.players.length;
    
    // If we've checked all players
    if (nextPlayerIndex === currentPlayerIndex) {
      roundComplete = true;
      break;
    }
  }
  
  // If everyone has acted and bets are matched or all but one player folded
  const activePlayers = game.players.filter(p => !p.folded);
  const notAllInPlayers = activePlayers.filter(p => !p.allIn);
  const betsMatched = activePlayers.every(p => p.allIn || p.bet === game.currentBet);
  
  if (roundComplete || betsMatched || activePlayers.length === 1 || notAllInPlayers.length === 0) {
    // Move to next phase
    advanceGamePhase(gameId);
  }
}

function advanceGamePhase(gameId) {
  const game = games[gameId];
  const activePlayers = game.players.filter(p => !p.folded);
  
  // Reset bets for next round
  game.players.forEach(p => p.bet = 0);
  game.currentBet = 0;
  
  // If only one player remains active, they win
  if (activePlayers.length === 1) {
    endHand(gameId, [activePlayers[0].id]);
    return;
  }
  
  switch (game.phase) {
    case 'betting':
      if (game.bettingRound === 0) {
        // Deal flop (3 cards)
        console.log(`Dealing flop...`);
        dealCommunityCards(game.deck, game.burnPile, game.communityCards, true);
        game.bettingRound = 1;
      } else if (game.bettingRound === 1) {
        // Deal turn (1 card)
        console.log(`Dealing turn...`);
        dealCommunityCards(game.deck, game.burnPile, game.communityCards, false);
        game.bettingRound = 2;
      } else if (game.bettingRound === 2) {
        // Deal river (1 card)
        console.log(`Dealing river...`);
        dealCommunityCards(game.deck, game.burnPile, game.communityCards, false);
        game.bettingRound = 3;
      } else {
        // Final betting round complete, go to showdown
        game.phase = 'showdown';
        determineWinner(gameId);
        return;
      }
      
      // Set first active player after dealer to act
      const startPos = (game.dealerPosition + 1) % game.players.length;
      let nextPlayerIndex = startPos;
      
      while (true) {
        const nextPlayer = game.players[nextPlayerIndex];
        if (!nextPlayer.folded && !nextPlayer.allIn && nextPlayer.chips > 0) {
          game.currentTurn = nextPlayer.id;
          break;
        }
        
        nextPlayerIndex = (nextPlayerIndex + 1) % game.players.length;
        
        // If no one can act, go to showdown
        if (nextPlayerIndex === startPos) {
          game.phase = 'showdown';
          determineWinner(gameId);
          return;
        }
      }
      break;
  }
  
  // Update everyone
  io.to(gameId).emit('game_update', { game: games[gameId] });
}

function determineWinner(gameId) {
  const game = games[gameId];
  const activePlayers = game.players.filter(p => !p.folded);
  
  // Evaluate hands and determine winner(s)
  const winners = evaluateHands(activePlayers, game.communityCards);
  
  endHand(gameId, winners.map(w => w.sessionId));
}

function endHand(gameId, winnerIds) {
  const game = games[gameId];
  
  // Distribute pot among winners
  const winAmount = Math.floor(game.pot / winnerIds.length);
  
  winnerIds.forEach(winnerId => {
    const winner = game.players.find(p => p.id === winnerId);
    winner.chips += winAmount;
  });
  
  // Reset for next hand
  game.phase = 'end';
  game.currentTurn = null;
  
  // Notify everyone
  io.to(gameId).emit('game_update', { 
    game: games[gameId],
    winners: winnerIds
  });
  
  // Schedule next hand
  setTimeout(() => {
    // Move dealer button
    game.dealerPosition = (game.dealerPosition + 1) % game.players.length;
    
    // Remove players who have no chips
    game.players = game.players.filter(p => p.chips > 0);
    
    if (game.players.length >= 2) {
      startGame(gameId);
    } else {
      game.phase = 'waiting';
      io.to(gameId).emit('game_update', { game: games[gameId] });
    }
  }, 5000); // 5 second delay before next hand
}

// Start server
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

*/