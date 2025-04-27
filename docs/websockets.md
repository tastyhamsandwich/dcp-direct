# WebSocket Events Documentation

## Client to Server Events

### Authentication & Registration
- `register` - Register a new user with profile information
  - Data: `{ profile: { username: string, balance?: number, avatar?: string } }`

### Game Management
- `get_games_list` - Request list of available games
- `create_game` - Create a new game room
  - Data: `{ tableName: string, creator: User, maxPlayers: number, blinds: { small: number, big: number }, gameVariant: GameVariant }`
- `join_game` - Join an existing game
  - Data: `{ gameId: string, profile: UserProfile }`
- `get_seat_info` - Get information about occupied seats
  - Data: `{ gameId: string }`

### Game Actions
- `player_ready` - Toggle player ready status
  - Data: `{ gameId: string }`
- `player_action` - Perform a game action (fold, check, call, bet, raise)
  - Data: `{ gameId: string, action: { type: Action, amount?: number } }`

### Communication
- `chat_message` - Send a chat message to all players in a game
  - Data: `{ gameId: string, message: string }`
- `private_message` - Send a private message to specific player
  - Data: `targetSocketId: string, message: string`

## Server to Client Events

### Authentication & Registration
- `registration_success` - Confirms successful user registration
  - Data: `{ user: User }`
- `error` - Reports any error condition
  - Data: `{ message: string }`
### Game Management
- `games_list` - Returns list of available games
  - Data: `ListEntry[]`
- `game_created` - Confirms successful game creation
  - Data: `{ gameId: string }`
- `seat_info` - Returns information about occupied seats
  - Data: `{ seatInfo: number[] }`
- `game_state` - Current state of the game
  - Data: `{ game: GameState }`

### Game Flow
- `game_starting` - Announces game is about to start
  - Data: `{ message: string, game: GameState }`
- `round_starting` - Announces new round is about to start
  - Data: `{ message: string, game: GameState }`
- `game_update` - General game state update
  - Data: `{ game: GameState, message?: string }`
- `phase_changed` - Announces change in game phase
  - Data: `{ previousPhase: string, newPhase: string, game: GameState }`
- `your_turn` - Notifies player it's their turn
  - Data: `{ gameId: string, allowedActions: Action[] }`
- `round_winners` - Announces round winners
  - Data: `{ winners: WinnerInfo[], showdown: boolean }`
- `round_ended` - Announces end of round
  - Data: `{ game: GameState, message: string }`

### Player Events
- `player_joined` - Announces new player joining
  - Data: `{ player: User, game: GameState }`
- `player_left` - Announces player leaving
  - Data: `{ playerId: string, game: GameState }`
- `player_ready_changed` - Announces change in player ready status
  - Data: `{ playerId: string, playerName: string, isReady: boolean, game: GameState }`
- `active_player_changed` - Announces change in active player
  - Data: `{ activePlayerId: string, activePlayerName: string }`

### Communication
- `chat_message` - Broadcasts chat message to game room
  - Data: `{ sender: string, message: string, timestamp: string }`
- `private_message` - Delivers private message to specific player
  - Data: `senderId: string, message: string`

## Special Features

### Reconnection Handling
The server implements a 10-second grace period for disconnected players to allow for page navigation without losing their game position. During this period:
- Player's seat is reserved
- Game state is preserved
- Player can rejoin the same game with their previous state

### Action Validation
The server validates all player actions against the current game state:
- Checks if it's the player's turn
- Validates bet amounts against player's chip stack
- Ensures action is allowed in current game phase
- Handles all-in situations and sidepot creation automatically

### Game State Management
The server maintains game state integrity by:
- Tracking player roles (dealer, small blind, big blind)
- Managing betting rounds and phase progression
- Handling showdown evaluation and pot distribution
- Automatically resetting for new rounds

### Error Handling
The server provides robust error handling:
- Invalid actions are rejected with appropriate error messages
- Connection errors are logged and handled gracefully
- Game state inconsistencies are automatically corrected
- Player disconnections are managed with timeouts and cleanup

## Event Flow Examples

### Typical Game Start Flow
1. Players join via `join_game`
2. Players signal ready via `player_ready`
3. Server emits `game_starting`
4. Server emits `game_update` with initial state
5. Server emits `your_turn` to first player

### Typical Betting Round Flow
1. Active player receives `your_turn`
2. Player sends `player_action`
3. Server emits `game_update`
4. Server emits `active_player_changed`
5. Next player receives `your_turn`

### Showdown Flow
1. Server emits `phase_changed` to 'showdown'
2. Server evaluates hands
3. Server emits `round_winners`
4. Server waits 8 seconds
5. Server emits `round_ended`
6. Server automatically starts new round