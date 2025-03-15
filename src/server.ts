import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import { v4 as uuidv4 } from 'uuid';
import { createDeck, shuffleDeck, dealCards, evaluateHands } from '@game/pokerLogic';

// Game logic utils


const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "http://localhost:3003", // Your frontend URL
    methods: ["GET", "POST"]
  }
});

// Store active games
const games = {};
// Store user sessions
const users = {};

// Handle socket connections
io.on('connection', (socket) => {
  console.log('User connected:', socket.id);
  
  // Handle user registration
  socket.on('register', ({ username }) => {
    users[socket.id] = {
      id: socket.id,
      username,
      chips: 1000, // Starting chips
    };
    
    socket.emit('registration_success', { user: users[socket.id] });
  });
  
  // Create a new game
  socket.on('create_game', ({ tableName, maxPlayers, blinds }) => {
    const gameId = uuidv4();
    const userId = socket.id;
    
    if (!users[userId]) {
      socket.emit('error', { message: 'You must register first' });
      return;
    }
    
    games[gameId] = {
      id: gameId,
      name: tableName,
      maxPlayers: maxPlayers || 6,
      players: [{ ...users[userId], position: 0 }],
      smallBlind: blinds?.small || 5,
      bigBlind: blinds?.big || 10,
      dealerPosition: 0,
      currentTurn: null,
      phase: 'waiting',
      deck: [],
      communityCards: [],
      pot: 0,
      sidePots: [],
      bettingRound: 0,
      currentBet: 0,
      createdBy: userId
    };
    
    // Join the game room
    socket.join(gameId);
    
    socket.emit('game_created', { gameId, game: games[gameId] });
  });
  
  // Join an existing game
  socket.on('join_game', ({ gameId }) => {
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
    socket.join(gameId);
    
    // Let everyone know someone joined
    io.to(gameId).emit('player_joined', { 
      player: users[userId],
      game: games[gameId]
    });
    
    // Check if we can start the game
    if (game.players.length >= 2 && game.phase === 'waiting') {
      startGame(gameId);
    }
  });
  
  // Handle player actions (fold, check, call, raise)
  socket.on('player_action', ({ gameId, action }) => {
    const game = games[gameId];
    const userId = socket.id;
    
    if (!game) {
      socket.emit('error', { message: 'Game not found' });
      return;
    }
    
    if (game.currentTurn !== userId) {
      socket.emit('error', { message: 'Not your turn' });
      return;
    }
    
    handlePlayerAction(gameId, userId, action);
  });
  
  // Handle chat messages
  socket.on('chat_message', ({ gameId, message }) => {
    const userId = socket.id;
    
    if (!users[userId]) return;
    
    io.to(gameId).emit('chat_message', {
      sender: users[userId].username,
      message,
      timestamp: new Date().toISOString()
    });
  });
  
  // Handle disconnections
  socket.on('disconnect', () => {
    const userId = socket.id;
    
    // Handle player leaving games
    Object.keys(games).forEach(gameId => {
      const game = games[gameId];
      const playerIndex = game.players.findIndex(p => p.id === userId);
      
      if (playerIndex >= 0) {
        // Remove player from game
        game.players.splice(playerIndex, 1);
        
        if (game.players.length < 2) {
          // Not enough players, reset game
          game.phase = 'waiting';
          game.communityCards = [];
          game.pot = 0;
        }
        
        // Let remaining players know
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

// Game logic functions
function startGame(gameId) {
  const game = games[gameId];
  
  if (game.players.length < 2) return;
  
  game.phase = 'dealing';
  game.deck = shuffleDeck(createDeck());
  game.communityCards = [];
  game.pot = 0;
  game.currentBet = 0;
  game.bettingRound = 0;
  
  // Deal cards to players
  game.players.forEach(player => {
    player.cards = dealCards(game.deck, 2);
    player.bet = 0;
    player.folded = false;
    player.allIn = false;
  });
  
  // Set blinds and first betting round
  const smallBlindPos = (game.dealerPosition + 1) % game.players.length;
  const bigBlindPos = (game.dealerPosition + 2) % game.players.length;
  
  // Post blinds
  game.players[smallBlindPos].bet = game.smallBlind;
  game.players[smallBlindPos].chips -= game.smallBlind;
  game.pot += game.smallBlind;
  
  game.players[bigBlindPos].bet = game.bigBlind;
  game.players[bigBlindPos].chips -= game.bigBlind;
  game.pot += game.bigBlind;
  
  game.currentBet = game.bigBlind;
  
  // Set first player to act (after big blind)
  game.currentTurn = game.players[(bigBlindPos + 1) % game.players.length].id;
  game.phase = 'betting';
  
  // Notify players
  io.to(gameId).emit('game_update', { game: games[gameId] });
}

function handlePlayerAction(gameId, playerId, action) {
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
        game.communityCards = dealCards(game.deck, 3);
        game.bettingRound = 1;
      } else if (game.bettingRound === 1) {
        // Deal turn (1 card)
        game.communityCards.push(dealCards(game.deck, 1)[0]);
        game.bettingRound = 2;
      } else if (game.bettingRound === 2) {
        // Deal river (1 card)
        game.communityCards.push(dealCards(game.deck, 1)[0]);
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
  
  endHand(gameId, winners.map(w => w.id));
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