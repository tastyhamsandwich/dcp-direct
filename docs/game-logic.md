# Game Logic

The game logic in DCP Direct is implemented with a combination of client and server components, with the core game mechanics defined in TypeScript.

## Game Concepts

The core game is a poker game with the following concepts:

1. **Cards**: Standard playing cards with suit and value
2. **Players**: Users participating in a game
3. **Game Rooms**: Instances of games with unique IDs
4. **Rounds**: Game play sessions within a game
5. **Actions**: Player moves like bet, call, fold, etc.
6. **Variants**: Different types of poker games (Texas Hold'em, Omaha, etc.)

## Poker Round Flow

A poker round follows a detailed sequence of method calls, function invocations, and events. Here's the complete flow:

### 1. Round Start
```
startRound() → continueRoundSetup() → dealCards()
```
- Game rotates dealer position (except first round)
- Sets blind positions (small blind = dealer + 1, big blind = dealer + 2)
- For Dealer's Choice games, initiates variant selection with `startDealerVariantSelection()`
- Creates new deck and deals initial cards based on variant
- Posts blinds from small and big blind players
- Sets initial active player (after big blind)

### 2. Betting Rounds
For each betting round, the following cycle occurs:
```
checkPhaseStatus() → findNextActivePlayer() → player actions → repeat
```
- Active player receives 'your_turn' event with allowed actions
- Player can take one of these actions:
  - fold: Player's hand discarded
  - check: If no bets to call
  - call: Match current bet
  - bet: If no previous bets
  - raise: Increase current bet
- Each action triggers:
  - Pot updates
  - Player chip counts update
  - All-in situations create sidepots via `createSidepot()`
  - Game state broadcast to all players

### 3. Phase Progression (Texas Hold'em example)
```
PREFLOP → FLOP → TURN → RIVER → SHOWDOWN
```
- After each betting round completes:
  - `checkPhaseStatus()` advances the phase
  - Community cards dealt via `dealCommunityCards()`
  - New betting round begins
  - For Flop: 3 cards dealt
  - For Turn/River: 1 card dealt each

### 4. Round End Conditions
Two possible paths:
```
a) Everyone folds → immediate winner
b) Reach showdown → evaluateHands() → distributePots()
```
- If all but one player folds:
  - Last remaining player wins pot immediately
  - No hand evaluation needed
- At showdown:
  - All remaining hands evaluated
  - Pots distributed (main pot and any sidepots)
  - Winners announced via 'round_winners' event
  - Hand information displayed

### 5. Round Reset
```
resetForNextRound() → wait for ready → new round
```
- Reset all game state:
  - Clear cards, pots, bets
  - Reset player actions and flags
  - Rotate dealer position
  - Players must ready up for next round
  - New round begins when all players ready

### WebSocket Events
Throughout the round, these events are emitted:
- 'game_update': After any game state change
- 'your_turn': When it becomes a player's turn
- 'phase_changed': When moving to new betting round
- 'round_winners': When round ends
- 'round_ended': When round completes and ready for next round

All game state changes are managed through the Game class, with the WebSocket server (socket.ts) handling communication with clients and coordinating the game flow between players.

## Class Documentation 

### Game Class
```typescript
class Game
```

The `Game` class is the core class that manages game state and logic. It handles all aspects of a poker game including player management, dealing cards, managing bets, and game progression.

### Properties

- `id: string` - Unique identifier for the game instance
- `name: string` - Display name of the game
- `creator: Player` - The player who created the game
- `players: Player[]` - Array of players in the game
- `status: 'waiting' | 'playing' | 'paused'` - Current game status
- `socket: Server` - WebSocket server instance
- `phase: TGamePhase` - Current phase of the game
- `phaseOrder: GamePhases` - Ordered array of phases for current variant
- `maxPlayers: number` - Maximum number of players allowed
- `hasStarted: boolean` - Whether the game has started
- `roundActive: boolean` - Whether a round is currently active
- `tablePositions: TableSeat[]` - Array of table seats and their occupancy
- `smallBlind: number` - Small blind amount
- `bigBlind: number` - Big blind amount
- `dealerIndex: number` - Index of the current dealer in players array
- `smallBlindIndex?: number` - Index of small blind position
- `bigBlindIndex?: number` - Index of big blind position
- `dealerId?: string` - ID of current dealer
- `smallBlindId?: string` - ID of player in small blind
- `bigBlindId?: string` - ID of player in big blind
- `pot: number` - Current pot amount
- `sidepots: Sidepot[]` - Array of side pots
- `ineligiblePlayers: Player[]` - Players not eligible for certain pots
- `deck: Deck | null` - Current deck of cards
- `communityCards: Card[] | null` - Community cards on the table
- `burnPile: Card[] | null` - Burned cards
- `activePlayerId: string` - ID of player whose turn it is
- `activePlayerIndex: number | null` - Index of active player in players array
- `currentBet: number` - Current bet amount
- `roundCount: number` - Number of rounds played
- `gameVariant: GameVariant` - Type of poker being played
- `cardsPerPlayer: number` - Number of cards dealt to each player
- `customRules?: any` - Optional custom game rules
- `dealerSelectedVariant: GameVariant | null` - Selected variant in Dealer's Choice games
- `nextRoundVariant: GameVariant | null` - Variant selected for next round
- `variantSelectionActive: boolean` - Whether variant selection is active
- `variantSelectionTimeout: NodeJS.Timeout | null` - Timeout for variant selection

### Game Flow By Variant

The game flow varies depending on the selected variant:

#### Texas Hold'em/Omaha/Chicago
Phases: `['waiting', 'preflop', 'flop', 'turn', 'river', 'showdown']`
- **Preflop**: Deal hole cards (2 for Hold'em/Chicago, 4 for Omaha)
- **Flop**: Deal 3 community cards
- **Turn**: Deal 1 community card
- **River**: Deal 1 community card
- **Showdown**: Evaluate hands

#### Five Card Draw
Phases: `['waiting', 'predraw', 'draw', 'showdown']`
- **Predraw**: Initial 5 cards dealt
- **Draw**: Players can discard and draw new cards
- **Showdown**: Evaluate hands

#### Seven Card Stud
Phases: `['waiting', 'thirdstreet', 'fourthstreet', 'fifthstreet', 'sixthstreet', 'seventhstreet', 'showdown']`
- **Third Street**: 2 hole cards + 1 up card
- **Fourth Street**: Deal 1 up card
- **Fifth Street**: Deal 1 up card
- **Sixth Street**: Deal 1 up card
- **Seventh Street**: Deal 1 down card
- **Showdown**: Evaluate hands

### Methods

#### Core Game Management
- `constructor(id: string, name: string, creator: Player, maxPlayers?: number, smallBlind?: number, bigBlind?: number, gameVariant?: GameVariant, customRules?: CustomGameRules)` - Creates new game instance
- `startRound(): boolean` - Initiates a new round
- `continueRoundSetup(currentRoundVariant: GameVariant): boolean` - Finalizes round setup process
- `resetRound(): boolean` - Resets game state for next round
- `returnGameState(): GameState` - Returns safe version of game state for clients
- `sortPlayerList(): void` - Sorts players by seat number
- `checkPhaseProgress(): void` - Checks and updates game phase

#### Card Management
- `determineHighestShowingCard(): [ Player, Card ]` - Determines who has the highest showing card after deal, and what card, for 7-Card Stud and variants
- `dealCards(currentRoundVariant: GameVariant): boolean` - Parent dealing function
- `dealHoldEmCards(currentRoundVariant: GameVariant): boolean` - Deals Hold'em style cards
- `dealStudCards(): boolean` - Deals Seven Card Stud cards
- `dealCommunityCards(flop: boolean = false): boolean` - Deals community cards
- `dealCommunityCardsByPhase(): boolean` - Deals appropriate cards for current phase

#### Player Management
- `findNextActivePlayer(): boolean` - Sets next active player
- `setActivePlayerForNewPhase(): void` - Sets first active player for new phase
- `getAllowedActionsForPlayer(playerId?: string): string[]` - Gets allowed actions
- `getNextPlayerId(currentPlayerId: string): string` - Gets next player's ID
- `getRoleIds(isFirstRound: boolean): RoleIds` - Gets dealer/blind position IDs

#### Pot Management
- `createSidepot(allInPlayer: Player, allInAmount: number): void` - Creates side pot
- `distributePots(): { playerId: string, playerName: string, amount: number, potType: string }[]` - Distributes pots to winners
- `postBlinds(): void` - Handles blind bets

#### Dealer's Choice Management
- `updateCardsPerPlayer(variant: GameVariant, customRules?: CustomGameRules): void` - Updates cards per player
- `setDealerVariant(variant: GameVariant): boolean` - Sets dealer's chosen variant
- `startDealerVariantSelection(timeoutMs?: number): boolean` - Starts variant selection
- `handleVariantSelection(playerId: string, variant: GameVariant): boolean` - Processes variant selection

#### Hand Evaluation
- `evaluateHands(players: Player[], communityCards: Card[])` - Evaluates player hands to determine winners

#### Informative / Information Determination
- `getPhaseIndex()` - Returns the index value of the current phase as it lies within the phaseOrder array
- `getNextPhase()` - Returns the next phase in sequence as determined by the current phase and phaseOrder
- `getDealer()` - Returns the username of the player who is currently the dealer

### Player Class
```typescript
class Player implements User
```

The `Player` class represents a player in the poker game.

#### Properties
- `id: string` - Unique identifier for the player
- `seatNumber: number` - Player's seat position at the table
- `username: string` - Player's display name
- `chips: number` - Player's current chip count
- `folded: boolean` - Whether player has folded current hand
- `active: boolean` - Whether player is currently active in the game
- `ready: boolean` - Whether player is ready for next round
- `allIn: boolean` - Whether player has gone all-in
- `cards: Card[]` - Player's hole cards
- `currentBet: number` - Player's current bet in this round
- `previousAction: Action` - Player's last action in the round
- `avatar: string` - Player's avatar image URL
- `handRank: HandRank` - Player's current hand ranking

#### Methods
- `constructor(id, username, seatNumber, chips, avatar)` - Creates new player instance
- `getId()` - Returns player ID
- `getChips()` - Returns chip count
- `getCards()` - Returns hole cards
- `getSeat()` - Returns seat number
- `getActive()` - Returns active status
- `getReady()` - Returns ready status
- `getAllIn()` - Returns all-in status
- `getCurrentBet()` - Returns current bet amount
- `getPrevAction()` - Returns previous action
- `setId(value)` - Sets player ID
- `setChips(amount)` - Sets chip count
- `addChips(amountToAdd)` - Adds chips to player's stack
- `setSeat(seatNum)` - Sets seat number
- `setActive(value)` - Sets active status
- `setReady(value)` - Sets ready status
- `toggleReady()` - Toggles ready status
- `setAllIn(value)` - Sets all-in status
- `setCurrentBet(value)` - Sets current bet amount
- `setPrevAction(action)` - Sets previous action

### Card Class
```typescript
class Card implements Stringable
```

The `Card` class represents a playing card in the deck.

#### Properties
- `suit: Suit` - The card's suit (hearts, diamonds, clubs, spades)
- `rank: Rank` - The card's rank (two through ace)
- `rankValue: RankValue` - Numeric value of the rank
- `name: CardName` - Short name of card (e.g., "AH" for Ace of Hearts)
- `faceUp: boolean` - Whether card is face-up or face-down

#### Methods
- `constructor(rank?: RankValue | Rank | CardName, suit?: Suit, faceUp = false)` - Creates new card instance
- `getValue()` - Returns numeric rank value
- `suitValue()` - Returns numeric suit value (hearts=1, diamonds=2, clubs=3, spades=4)
- `printFullName()` - Returns full card name (e.g., "Ace of Hearts")
- `rankFromValue(value)` - Converts numeric value to rank
- `rankFromName(name)` - Converts short name to rank
- `suitFromName(name)` - Converts short name to suit
- `getRankAndSuitFromName(name)` - Splits CardName into rank and suit
- `getNameFromRankAndSuit(rank, suit)` - Creates CardName from rank and suit
- Private helper methods:
  - `getRandomSuit()` - Generates random suit
  - `getRandomRank()` - Generates random rank
  - `rankToInitial(rank)` - Converts rank to single character
  - `suitToInitial(suit)` - Converts suit to single character

### Deck Class
```typescript
class Deck
```

The `Deck` class represents a standard deck of 52 playing cards.

#### Properties
- `cards: Card[]` - Array of cards in the deck

#### Methods
- `constructor(autoShuffle: boolean = false)` - Creates new deck instance. Providing a parameter 'true' results in a deck that is shuffled immediately, rather than in-order.
- `[Symbol.iterator]()` - Makes deck iterable
- `generateDeck()` - Creates standard 52-card deck
- `regenerateDeck()` - Resets deck to new 52-card state
- `shuffle()` - Randomizes card order using Fisher-Yates
- `draw()` - Removes and returns top card

### Sidepot Class
```typescript
class Sidepot
```

The `Sidepot` class represents a side pot created when a player goes all-in.

#### Properties
- `amount: number` - The amount of chips in the side pot
- `eligiblePlayers: Player[]` - Players eligible to win this pot

#### Methods
- `constructor(amount: number, eligiblePlayers: Player[])` - Creates new side pot
- `addAmount(value: number)` - Adds chips to pot
- `getAmount()` - Returns pot amount
- `getEligiblePlayers()` - Returns eligible players
- `isPlayerEligible(player)` - Checks if player can win pot
- `addEligiblePlayer(player)` - Adds player to eligible list

## Implementation Files

Key files in the implementation:
- **Game Classes**: `src/game/classes.ts` - Core game classes implementation
- **Game Types**: `src/game/types.ts` - Type definitions
- **WebSocket Handler**: `socket.ts` - Server-side WebSocket implementation
- **Game Components**: `src/components/game/*` - React components for game UI