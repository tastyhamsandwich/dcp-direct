import { Card } from '../game/classes';

declare global {
  type SuitInitial = 'C' | 'D' | 'H' | 'S';
  type Suit = 'hearts' | 'diamonds' | 'clubs' | 'spades';
  type SuitCapitalized = 'Hearts' | 'Diamonds' | 'Clubs' | 'Spades';

  type Rank = 'ace' | 'two' | 'three' | 'four' | 'five' | 'six' | 'seven' | 'eight' | 'nine' | 'ten' | 'jack' | 'queen' | 'king' | 'wild';
  type RankCapitalized = 'Ace' | 'Two' | 'Three' | 'Four' | 'Five' | 'Six' | 'Seven' | 'Eight' | 'Nine' | 'Ten' | 'Jack' | 'Queen' | 'King' | 'Wild';

  type RankValue = 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 | 13 | 14 | 100;

  type CardName = 'AH' | '2H' | '3H' | '4H' | '5H' | '6H' | '7H' | '8H' | '9H' | 'TH' | 'JH' | 'QH' | 'KH' | 'AD' | '2D' | '3D' | '4D' | '5D' | '6D' | '7D' | '8D' | '9D' | 'TD' | 'JD' | 'QD' | 'KD' | 'AC' | '2C' | '3C' | '4C' | '5C' | '6C' | '7C' | '8C' | '9C' | 'TC' | 'JC' | 'QC' | 'KC' | 'AS' | '2S' | '3S' | '4S' | '5S' | '6S' | '7S' | '8S' | '9S' | 'TS' | 'JS' | 'QS' | 'KS';

  type HandType = Array<CardName | Card | Array<Rank | Suit>>;

  type TableRole = 'Dealer' | 'SmallBlind' | 'BigBlind' | 'None';
  type BlindType = 'small' | 'big';

  type GameType = 'Poker' | 'Pinochle';

  type GameVariant =
    | 'TexasHoldEm'
    | 'Omaha'
    | 'OmahaHiLo'
    | 'SevenCardStud'
    | 'FiveCardDraw'
    | 'Chicago'
    | 'DealersChoice' // Keep this if you want the dedicated mode
    | 'Custom';

  type BlackSuitSymbol = '♠' | '♣';
  type RedSuitSymbol = '♦' | '♥';
  type SuitSymbol = BlackSuitSymbol | RedSuitSymbol;

  type FixedSizeArray<T, N extends number> = N extends 0 ? [] : {
    0: T;
    length: N;
  } & T[];

  type FlopArray = FixedSizeArray<Card, 3>;
  type TurnRiverArray = FixedSizeArray<Card, 2>;

  type TGamePhaseCommon = TGamePhaseHoldEm | TGamePhaseDraw | TGamePhaseStud;

  type TGamePhaseHoldEm = 'waiting' | 'preflop' | 'flop' | 'turn' | 'river' | 'showdown';
  type HoldEmPhases = ['waiting', 'preflop', 'flop', 'turn', 'river', 'showdown'];

  type TGamePhaseDraw = 'waiting' | 'predraw' | 'draw' | 'showdown'
  type DrawPhases = ['waiting', 'predraw', 'draw', 'showdown'];

  type TGamePhaseStud = 'waiting' | 'thirdstreet' | 'fourthstreet' | 'fifthstreet' | 'sixthstreet' | 'seventhstreet' | 'showdown';
  type StudPhases = ['waiting', 'thirdstreet', 'fourthstreet', 'fifthstreet', 'sixthstreet', 'seventhstreet', 'showdown'];

  type InitPhase = ['waiting', 'preflop'];

  type TGamePhase = TGamePhaseHoldEm | TGamePhaseStud | TGamePhaseDraw;
  type GamePhases = HoldEmPhases | DrawPhases | StudPhases | InitPhase;

  type RoomStatus = 'waiting' | 'playing' | 'paused';

  type Action = 'none' | 'fold' | 'check' | 'bet' | 'call' | 'raise' | 'win';

  type RoomPhase = 'dealersetup' | 'active' | 'interround';

  interface WinnerInfo {
    playerId: string;
    playerName: string;
    amount: number;
    potType: string;
    hand?: string;
    cards?: Card[];
  }

  interface GameState {
    id: string;
    name: string;           
    creator: {
      id: string;
      username: string;
      seatNumber: number;
      chips: number;
      ready: boolean;
      avatar: string;
    };
    players: {
      id: string;
      username: string;
      seatNumber: number;
      chips: number;
      folded: boolean;
      active: boolean;
      ready: boolean;
      allIn: boolean;
      cards: {
        suit: Suit;
        rank: Rank;
        rankValue: RankValue;
        name: CardName;
        faceUp: boolean;
      }[],
      currentBet: number;
      previousAction: Action;
      avatar: string;
    }[];
    status: RoomStatus;
    gameVariant: GameVariant;
    phase: TGamePhase;
    phaseOrder: GamePhases;
    maxPlayers: number;
    hasStarted: boolean;
    roundActive: boolean;
    tablePositions: TableSeat[];
    smallBlind: number;
    bigBlind: number;
    dealerIndex: number;
    smallBlindIndex?: number;
    bigBlindIndex?: number;
    dealerId?: string;
    smallBlindId?: string;
    bigBlindId?: string;
    pot: number;
    sidepots?: {
      amount: number;
      eligiblePlayers: string[];
    }[];
    communityCards: {
      suit: Suit;
      rank: Rank;
      rankValue: RankValue;
      name: CardName;
      faceUp: boolean;
    }[];
    activePlayerId: string;
    activePlayerIndex: number | null;
    currentBet: number;
    variantSelectionActive: boolean;
    currentSelectedVariant: GameVariant | null;
    activeVariant: GameVariant;
    nextRoundVariant: GameVariant | null;
    cardsPerPlayer?: number; // Number of hole cards per player
    customRules?: CustomGameRules; // For custom game variants
  }

  interface Stringable {
    toString: () => string;
  }

  interface CustomGameRules {
    name: string;
    description: string;
    creator: string;
    cardsPerPlayer: number;
    communityCardStructure: {
      rounds: number;
      cardsPerRound: number[];
    };
    handEvaluationRules: {
      useHoleCards: number; // How many hole cards must be used (0 for any, 2 for Omaha, etc.)
      useCommunityCards: number; // How many community cards must be used (0 for any)
      isHiLo: boolean; // Does game use hi/lo evaluation
    };
    bettingRounds: number;
    allowDiscards: boolean;
  }

  /** Represents an entry in the list of games.
   * 
   * @typedef {Object} ListEntry
   * @property {string} id - The unique identifier for the game.
   * @property {string} name - The name of the game.
   * @property {number} playerCount - The number of players in the game.
   * @property {number} maxPlayers - The maximum number of players allowed.
   * @property {boolean} isStarted - Indicates whether the game has started.
   * @property {GameType} [gameType] - Indicates the type of game (Poker or Pinochle)
   * @property {number} [wagerPerGame] - Table entry cost for Pinochle games.
   */
  interface ListEntry {
    index: number;
    id: string;
    name: string;
    playerCount: number;
    maxPlayers: number;
    isStarted: boolean;
    gameType?: GameType;
    wagerPerGame?: number;
  }

  /** Represents the role IDs of the players.
   * 
   * @interface RoleIds
   * @property {string} dealerId - The ID of the dealer.
   * @property {string} smallBlindId - The ID of the small blind.
   * @property {string} bigBlindId - The ID of the big blind.
   */
  interface RoleIds {
    dealerId: string;
    smallBlindId: string;
    bigBlindId: string;
  }

  /** Represents a seat at the table.
   * 
   * @interface TableSeat
   * @property {number} seatNumber - The number of the seat.
   * @property {boolean} occupied - Indicates whether the seat is occupied.
   * @property {string | null} playerId - The ID of the player occupying the seat.
   */
  interface TableSeat {
    seatNumber: number;
    occupied: boolean;
    playerId: string | null;
  }

  interface HandRank {
    hand: string;
    value: number;
  }

  interface Winner extends Player {
    handRank: HandRank;
  }

  /** Represents a Player object.
   * @object
   * @property sessionId - The player's sessionId for the game instance
   * @property username - The player's username
   * @property chips - How many chips the player has
   * @property folded - Whether the player is folded or not
   * @property active - Whether the player is currently active
   * @property ready - If the player is ready to begin a round or not
   * @property allIn - If the player is currently all-in
   * @property cards - An array of the player's cards
   * @property currentBet - What the player's current bet for this round is
   * @property previousAction - The last action the player took.
   * @property avatar - The URI for the player's avatar image.
   * @property name - A fallback for the player's username
   */
  interface Player extends User {
    id: string;
    seatNumber: number;
    username: string;
    chips: number;
    folded: boolean;
    active: boolean;
    ready: boolean;
    allIn: boolean;
    cards: Card[];
    currentBet: number;
    previousAction: Action
    avatar: string;
    name?: string; // Fallback for name if displayName is not available
    joinedAt?: string;
    leftAt?: string | null;
  }

  interface User {
    id: string;
    username: string;
    chips: number;
  }
}

export {};
