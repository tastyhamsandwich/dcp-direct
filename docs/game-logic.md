# Game Logic

The game logic in DCP Direct is implemented with a combination of client and server components, with the core game mechanics defined in TypeScript.

## Game Concepts

The core game is a card game with the following concepts:

1. **Cards**: Standard playing cards with suit and value
2. **Players**: Users participating in a game
3. **Game Rooms**: Instances of games with unique IDs
4. **Rounds**: Game play sessions within a game
5. **Actions**: Player moves like playing cards

## Data Structures

### Card

```typescript
// src/lib/utils/gameLogic.ts
export interface Card {
  id: number;
  value: number;  // 1-13 (Ace=1, Jack=11, Queen=12, King=13)
  suit: 'hearts' | 'diamonds' | 'clubs' | 'spades';
  faceUp: boolean;
}
```

### Player

```typescript
// src/lib/utils/gameLogic.ts
export interface Player {
  id: string;        // User ID
  name: string;      // Display name
  score: number;     // Current score
  hand: Card[];      // Cards in hand
  isActive: boolean; // Still in the game
  isReady: boolean;  // Ready to start
}
```

### Game State

```typescript
// src/lib/utils/gameLogic.ts
export interface GameState {
  id: string;             // Game ID
  name?: string;          // Game room name
  players: Player[];      // Players in the game
  deck: Card[];           // Remaining deck
  currentPlayerId: string | null; // Whose turn
  phase: GamePhase;       // Current game phase
  roundNumber: number;    // Current round
  message: string;        // Game message
  lastUpdate: number;     // Timestamp
  maxPlayers?: number;    // Max players allowed
  isStarted?: boolean;    // Game has started
}

export type GamePhase = 'waiting' | 'playing' | 'roundEnd' | 'gameOver';
```

## Core Game Functions

### Deck Management

```typescript
// Create a standard deck of cards
export function createDeck(): Card[] {
  const deck: Card[] = [];
  const suits: Array<'hearts' | 'diamonds' | 'clubs' | 'spades'> = ['hearts', 'diamonds', 'clubs', 'spades'];
  
  let id = 0;
  for (const suit of suits) {
    for (let value = 1; value <= 13; value++) {
      deck.push({
        id: id++,
        value,
        suit,
        faceUp: false
      });
    }
  }
  
  return deck;
}

// Shuffle the deck
export function shuffleDeck(deck: Card[]): Card[] {
  const shuffled = [...deck];
  
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  
  return shuffled;
}
```

### Game Initialization

```typescript
// Initialize a new game
export function initializeGame(
  gameId: string, 
  players: Player[], 
  options?: { name?: string; maxPlayers?: number; isStarted?: boolean }
): GameState {
  const deck = shuffleDeck(createDeck());
  
  return {
    id: gameId,
    name: options?.name,
    players,
    deck,
    currentPlayerId: players.length > 0 ? players[0].id : null,
    phase: 'waiting',
    roundNumber: 0,
    message: 'Waiting for players...',
    lastUpdate: Date.now(),
    maxPlayers: options?.maxPlayers || 8,
    isStarted: options?.isStarted || false
  };
}
```

### Game Actions

```typescript
// Handle player turn action
export function processPlayerAction(state: GameState, playerId: string, action: string, data?: any): GameState {
  const newState = { ...state };
  
  // Example: Simple "play card" action
  if (action === 'playCard' && typeof data?.cardId === 'number') {
    const playerIndex = newState.players.findIndex(p => p.id === playerId);
    
    if (playerIndex >= 0 && newState.currentPlayerId === playerId) {
      const player = newState.players[playerIndex];
      const cardIndex = player.hand.findIndex(card => card.id === data.cardId);
      
      if (cardIndex >= 0) {
        // Remove card from player's hand
        player.hand.splice(cardIndex, 1);
        
        // Update player score
        player.score += 1;
        
        // Move to next player
        const nextPlayerIndex = (playerIndex + 1) % newState.players.length;
        newState.currentPlayerId = newState.players[nextPlayerIndex].id;
        
        newState.message = `${player.name} played a card!`;
      }
    }
  }
  
  return newState;
}
```

## Game Context

The Game Context provides game state and actions to components:

```typescript
// src/contexts/gameContext.tsx (simplified)
export const GameProvider: React.FC<GameProviderProps> = ({ gameId, children }) => {
  const { user, profile } = useAuth();
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [connected, setConnected] = useState(false);
  
  // Socket connection
  // Game state updates
  // Player actions
  
  const value = {
    gameState,
    connected,
    playerReady,
    playCard,
    // Other actions
  };
  
  return <GameContext.Provider value={value}>{children}</GameContext.Provider>;
};
```

## Server-Side Game Management

Games are managed on the server through WebSockets:

```typescript
// From src/app/api/socket/route.ts

// In-memory game state storage
const gameRooms = new Map<string, GameRoom>();

// Handle game creation
const newGame = initializeGame(gameId, initialPlayers, {
  name: `Game ${gameId}`,
  maxPlayers: 8,
  isStarted: false
});

gameRooms.set(gameId, {
  game: newGame,
  players: new Set([connectionId])
});

// Process player actions
try {
  // Process the player action
  const updatedState = processPlayerAction(
    room.game,
    message.userId,
    message.action.type,
    message.action.data || {}
  );
  
  // Check if the round is over
  const finalState = checkRoundEnd(updatedState);
  room.game = finalState;
  
  // Broadcast updated state
  broadcastGameState(gameId);
} catch (actionError) {
  console.error('Action processing error:', actionError);
}
```

## Game Flow

1. **Game Creation**:
   - User creates new game room
   - Server initializes game state
   - Client connects via WebSocket

2. **Joining Games**:
   - Users join existing game rooms
   - Server adds player to game
   - Game state broadcast to all players

3. **Game Play**:
   - Players perform actions on their turn
   - Server validates and processes actions
   - Updated state broadcast to all players

4. **Round Completion**:
   - Round ends based on game rules
   - Scores updated
   - New round can be started

## Implementation Files

- **Game Logic**: `src/lib/utils/gameLogic.ts`
- **Game Context**: `src/contexts/gameContext.tsx`
- **WebSocket API**: `src/app/api/socket/route.ts`
- **Game Component**: `src/components/game/CardGame.tsx`
- **Game Page**: `src/app/game/[gameId]/page.tsx`
- **Game Lobby**: `src/app/game/page.tsx`