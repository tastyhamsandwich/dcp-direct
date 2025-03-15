import { string } from 'zod';
import { loadGameState } from './gameStorage';
import { Card, Deck, Player, RoomStatus, GamePhase, Sidepot, Suit, Rank, RankValue, Action } from './pokerLogic';

// Game state
export interface GameState {
  id: string;
  name?: string;           // Name of the game room
  players: Player[];
  deck: Deck;
  currentPlayerId: string | null;
  phase: GamePhase;
  status: RoomStatus;
  message: string;
  lastUpdate: number;
  maxPlayers?: number;     // Maximum number of players allowed
  isStarted?: boolean;     // Whether the game has started
  dealerIndex: number;
  smallBlindIndex: number;
  bigBlindIndex: number;
  dealerId: string | null;
  smallBlindId: string | null;
  bigBlindId: string | null;
  tablePositions: TableSeat[];
  getNextPlayerId: (currentPlayerId: string, tablePositions: TableSeat[]) => string;
  initTableSeats: (maxPlayers: number) => TableSeat[];
}

interface TableSeat {
  seatNumber: number;
  occupied: boolean;
  playerId: string | null;
}

export function initTableSeats(maxPlayers): TableSeat[] {
  const tablePositions: TableSeat[] = [];
  for (let i = 0; i < maxPlayers ; i++)
    tablePositions.push({seatNumber: i, occupied: false, playerId: null})

  return tablePositions;
}

export function getNextPlayerId(currentPlayerId: string, tablePositions: TableSeat[]): string {
  for (let i = 0; i < tablePositions.length; i++) {
    if (!tablePositions[i].occupied)
      continue;
    
    if (tablePositions[i].playerId === currentPlayerId) {
      for (let j = i+1; j <= tablePositions.length; j++) {
        if (j === tablePositions.length)
          j = 0;
        if (tablePositions[j].occupied)
          return tablePositions[j].playerId!
        else
          continue;
      }
    }
  }
  throw new Error("Unknown error occurred finding Player Id");
}

// Initialize a new game
export function initializeGame(
  gameId: string, 
  players: Player[], 
  options?: { name?: string; maxPlayers?: number; isStarted?: boolean }
): GameState {
  const deck = new Deck();
  deck.shuffleDeck();
  
  return {
    id: gameId,
    name: options?.name,
    players,
    deck,
    currentPlayerId: players.length > 0 ? players[0].id : null,
    phase: GamePhase.WAITING,
    status: RoomStatus.WAITING,
    message: 'Waiting for players...',
    lastUpdate: Date.now(),
    maxPlayers: options?.maxPlayers || 8,
    isStarted: options?.isStarted || false,
    dealerIndex: 0,
    dealerId: string,
    smallBlindIndex: 1,
    smallBlindId: string,
    bigBlindIndex: 2,
    bigBlindId: string
  };
}

// Start a new round
export function startRound(state: GameState): GameState {
  const newState = { ...state };
  const deck = new Deck();
  deck.shuffleDeck();
  newState.deck = deck;
  newState.phase = GamePhase.PREFLOP;
  newState.status = RoomStatus.PLAYING;
  
  // Deal initial cards
  return dealCards(state);
}

// Handle player turn action
export function processPlayerAction(state: GameState, playerId: string, action: string, data?: any): GameState {
  // TODO implement handling of player actions
  return state;
}


// Deal cards to players at start of round, accounting for progressive change in dealer position
export function dealCards(state: GameState) {
  const deck = state.deck;
  const numCards = 2; // Can be made dynamic at a later date for other game types, like Omaha

  for (let i = 0; i < numCards; i++) {
    let currentPosition = (state.dealerIndex + 1) % state.players.length;  // Start left of dealer
    let playersDealtTo = 0;  // Track how many players we've dealt to
    
    while (playersDealtTo < state.players.length) {  // Continue until all players have been dealt to
        const player = state.players[currentPosition];
        if (player && player.active) {
            const card = deck.draw();
            player.cards.push(card);
            console.log(`Dealt ${card} to player '${player.name}'`);
        }
        
        currentPosition = (currentPosition + 1) % state.players.length;  // Move to next player, wrap around if needed
        playersDealtTo++;
    }
  }

  return state;
}

// Check if the round is over
export function checkRoundEnd(state: GameState): GameState {
  const newState = { ...state };
  
  // Example condition: Round ends when a player has no cards left
  const roundOver = newState.players.some(player => player.cards.length === 0);
  
  if (roundOver) {
    newState.phase = GamePhase.ENDGAME;
    newState.message = 'Round complete!';
    
    // Find winner
    const winner = newState.players[0];
    
    newState.message = `${winner.name} wins the round!`;
  }
  
  return newState;
}