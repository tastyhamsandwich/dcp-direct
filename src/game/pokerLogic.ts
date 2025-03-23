import { valueToRank, capitalize } from '@lib/utils';

export type Suit = 'hearts' | 'diamonds' | 'clubs' | 'spades';
export type SuitCapitalized = 'Hearts' | 'Diamonds' | 'Clubs' | 'Spades';

export type Rank = 'ace' | 'two' | 'three' | 'four' | 'five' | 'six' | 'seven' | 'eight' | 'nine' | 'ten' | 'jack' | 'queen' | 'king' | 'wild';
export type RankCapitalized = 'Ace' | 'Two' | 'Three' | 'Four' | 'Five' | 'Six' | 'Seven' | 'Eight' | 'Nine' | 'Ten' | 'Jack' | 'Queen' | 'King' | 'Wild';

export type RankValue = 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 | 13 | 14 | 100;

export type CardName = 'AH' | '2H' | '3H' | '4H' | '5H' | '6H' | '7H' | '8H' | '9H' | 'TH' | 'JH' | 'QH' | 'KH' | 'AD' | '2D' | '3D' | '4D' | '5D' | '6D' | '7D' | '8D' | '9D' | 'TD' | 'JD' | 'QD' | 'KD' | 'AC' | '2C' | '3C' | '4C' | '5C' | '6C' | '7C' | '8C' | '9C' | 'TC' | 'JC' | 'QC' | 'KC' | 'AS' | '2S' | '3S' | '4S' | '5S' | '6S' | '7S' | '8S' | '9S' | 'TS' | 'JS' | 'QS' | 'KS';

export type Hand = Card[];

export type TableRole = 'Dealer' | 'SmallBlind' | 'BigBlind' | 'None';
export type BlindType = 'small' | 'big';

export type GameVariant = 'TexasHoldEm' | 'Omaha' ;

export enum GamePhase {
    WAITING = 'waiting',
    PREFLOP = 'pre-flop',
    FLOP = 'flop',
    TURN = 'turn',
    RIVER = 'river',
    SHOWDOWN = 'showdown',
    ENDGAME = 'endgame'
}

export enum RoomStatus {
  WAITING = 'waiting',
  PLAYING = 'playing',
  PAUSED = 'paused'
}

export type Action = 'none' | 'fold' | 'check' | 'bet' | 'call' | 'raise';

export interface GameState {
    id: string;
  name: string;           
  creator: Player;        
  players: Player[];
  status: 'waiting' | 'playing' | 'paused';
  phase: GamePhase;
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
  sidepots?: Sidepot[];
  deck: Deck | null;
  communityCards: Card[];
  burnPile: Card[];
  activePlayerId: string;
  activePlayerIndex: number | null;
  currentBet: number;
}

interface Stringable {
  toString: () => string;
}

/**
 * Represents an entry in the list of games.
 * 
 * @typedef {Object} ListEntry
 * @property {string} id - The unique identifier for the game.
 * @property {string} name - The name of the game.
 * @property {number} playerCount - The number of players in the game.
 * @property {number} maxPlayers - The maximum number of players allowed.
 * @property {boolean} isStarted - Indicates whether the game has started.
 */
export type ListEntry = {
  id: string;
  name: string;
  playerCount: number;
  maxPlayers: number;
  isStarted: boolean;
}





/**
 * Represents the role IDs of the players.
 * 
 * @interface RoleIds
 * @property {string} dealerId - The ID of the dealer.
 * @property {string} smallBlindId - The ID of the small blind.
 * @property {string} bigBlindId - The ID of the big blind.
 */
export interface RoleIds {
  dealerId: string;
  smallBlindId: string;
  bigBlindId: string;
}

/**
 * Represents a seat at the table.
 * 
 * @interface TableSeat
 * @property {number} seatNumber - The number of the seat.
 * @property {boolean} occupied - Indicates whether the seat is occupied.
 * @property {string | null} playerId - The ID of the player occupying the seat.
 */
export interface TableSeat {
  seatNumber: number;
  occupied: boolean;
  playerId: string | null;
}

/**
 * Represents a Player object.
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
export interface Player {
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
}


/** 
 * Represents a playing card.
 * @class
 * @param suit - The suit of the card
 * @param rank - The rank of the card
 * @param faceUp - Whether the card is shown face-up or not
 * @example <caption>Creating a new Card instance with a Rank and Suit</caption>
 * const card = new Card('ace', 'hearts'); // Ace of Hearts
 * @example <caption>Creating a new Card instance with a RankValue and Suit</caption>
 * const card = new Card(12, 'diamonds'); // Queen of Diamonds
 */
export class Card implements Stringable {

  suit:   Suit;
  rank:   Rank;
  rankValue:  RankValue;
  name:   CardName;
  faceUp: boolean;

  /**
   * Creates a new Card instance.
   * @param rank - The first argument, can be a Rank or RankValue type
   * @param suit - The second argument, must be Suit type
   * @param faceUp - The third argument, defaults to 'false' if omitted, determines if card is shown or not.
   * @throws {Error} If the arguments are invalid.
   */
  constructor(rank: RankValue | Rank, suit, faceUp = false) {
    if (typeof rank === 'number')
      this.rank = this.rankFromValue(rank);
    else
      this.rank = rank;
    this.suit = suit;
    this.rankValue = this.getValue();
    this.name = this.getNameFromRankAndSuit(rank as Rank, suit);
    this.faceUp = faceUp;
  }

  getRankAndSuitFromName(name: CardName): [Rank, Suit] {
    const rankChar = name.charAt(0);
    const suitChar = name.charAt(1);
    let rank: Rank;
    let suit: Suit;
  
    switch (rankChar) {
      case 'A': rank = 'ace'; break;
      case '2': rank = 'two'; break;
      case '3': rank = 'three'; break;
      case '4': rank = 'four'; break;
      case '5': rank = 'five'; break;
      case '6': rank = 'six'; break;
      case '7': rank = 'seven'; break;
      case '8': rank = 'eight'; break;
      case '9': rank = 'nine'; break;
      case 'T': rank = 'ten'; break;
      case 'J': rank = 'jack'; break;
      case 'Q': rank = 'queen'; break;
      case 'K': rank = 'king'; break;
      default: throw new Error(`Invalid rank name: ${rankChar}`);
    }
  
    switch (suitChar) {
      case 'H': suit = 'hearts'; break;
      case 'D': suit = 'diamonds'; break;
      case 'C': suit = 'clubs'; break;
      case 'S': suit = 'spades'; break;
      default: throw new Error(`Invalid suit name: ${suitChar}`);
    }
  
    return [rank as Rank, suit as Suit];
  }
  /**
   * Gets the CardName from the rank and suit.
   * @param rank - The rank of the card.
   * @param suit - The suit of the card.
   * @returns The CardName.
   */
  private getNameFromRankAndSuit(rank: Rank, suit: Suit): CardName {
    const rankInitial = this.rankToInitial(rank);
    const suitInitial = this.suitToInitial(suit);
    return `${rankInitial}${suitInitial}` as CardName;
  }

  /**
   * Converts a rank to its initial.
   * @param rank - The rank to convert.
   * @returns The initial of the rank.
   */
  private rankToInitial(rank: Rank): string {
    const rankMap: { [key in Rank]: string } = {
      'ace': 'A', 'two': '2', 'three': '3', 'four': '4', 'five': '5',
      'six': '6', 'seven': '7', 'eight': '8', 'nine': '9', 'ten': 'T',
      'jack': 'J', 'queen': 'Q', 'king': 'K', 'wild': 'W'
    };
    if (rank in rankMap) {
      return rankMap[rank];
    }
    throw new Error(`Invalid rank: ${rank}`);
  }

  /**
   * Converts a suit to its initial.
   * @param suit - The suit to convert.
   * @returns The initial of the suit.
   */
  private suitToInitial(suit: Suit): string {
    switch (suit) {
      case 'hearts'   : return 'H';
      case 'diamonds' : return 'D';
      case 'clubs'  : return 'C';
      case 'spades'   : return 'S';
      default     : throw new Error(`Invalid suit: ${suit}`);
    }
  }

  /**
   * Gets the suit from its name.
   * @param name - The name of the suit.
   * @returns The suit.
   */
  suitFromName(name: string): Suit {
    switch (name) {
      case 'H': return 'hearts';
      case 'D': return 'diamonds';
      case 'C': return 'clubs';
      case 'S': return 'spades';
      default : throw new Error(`Invalid suit name: ${name}`);
    }
  }

  /**
   * Gets the rank from its name.
   * @param name - The name of the rank.
   * @returns The rank.
   */
  rankFromName(name: string): Rank {
    switch (name) {
      case 'A': return 'ace';
      case '2': return 'two';
      case '3': return 'three';
      case '4': return 'four';
      case '5': return 'five';
      case '6': return 'six';
      case '7': return 'seven';
      case '8': return 'eight';
      case '9': return 'nine';
      case 'T': return 'ten';
      case 'J': return 'jack';
      case 'Q': return 'queen';
      case 'K': return 'king';
      default : throw new Error(`Invalid rank name: ${name}`);
    }
  }

  /**
   * Gets the value of the card.
   * @returns The value of the card.
   */
  getValue(): RankValue {
    return this.rankToValue(this.rank);
  }

  /**
   * Converts a rank to its value.
   * @param rank - The rank to convert.
   * @returns The value of the rank.
   */
  rankToValue(rank: Rank): RankValue {
    switch (rank) {
      case 'two':   return 2;
      case 'three': return 3;
      case 'four':  return 4;
      case 'five':  return 5;
      case 'six':   return 6;
      case 'seven': return 7;
      case 'eight': return 8;
      case 'nine':  return 9;
      case 'ten':   return 10;
      case 'jack':  return 11;
      case 'queen': return 12;
      case 'king':  return 13;
      case 'ace':   return 14;
      case 'wild':  return 100;
      default: throw new Error(`Invalid rank value: ${rank}`);
    }
  }

  suitValue(): number {
    switch (this.suit) {
      case 'hearts':   return 1;
      case 'diamonds': return 2;
      case 'clubs':  return 3;
      case 'spades':   return 4;
      default: throw new Error(`Invalid suit value: ${this.suit}`);
    }
  }

  /**
   * Converts a value to its rank.
   * @param value - The value to convert.
   * @returns The rank corresponding to the value.
   */
  rankFromValue(value: RankValue): Rank {
    switch (value) {
      case 2:   return 'two';
      case 3:   return 'three';
      case 4:   return 'four';
      case 5:   return 'five';
      case 6:   return 'six';
      case 7:   return 'seven';
      case 8:   return 'eight';
      case 9:   return 'nine';
      case 10:  return 'ten';
      case 11:  return 'jack';
      case 12:  return 'queen';
      case 13:  return 'king';
      case 14:  return 'ace';
      case 100: return 'wild';
      default: throw new Error(`Invalid rank value: ${value}`);
    }
  }

  /**
   * Prints the full name of the card.
   * @returns The full name of the card.
   */
  printFullName(): string {
    const capRank = this.rank.charAt(0).toUpperCase() + this.rank.slice(1);
    const capSuit = this.suit.charAt(0).toUpperCase() + this.suit.slice(1);
    return `${capRank} of ${capSuit}`;
  }
}

/** 
 * Represents a deck of cards.
 * @class
 * @param autoShuffle - Whether to shuffle the deck automatically.
 */
export class Deck {

  cards: Card[];

  constructor(autoShuffle: boolean = false) {
    
    // Construct new deck, and shuffle if shuffle flag is set true
    if (autoShuffle === true) {
    this.cards = this.generateDeck();
    this.shuffle();
    // If no shuffle flag is set, just generate new deck in order
    } else {
    this.cards = this.generateDeck();
    }
  }

  // Implement iterator for deck, so that it can be looped through easily
  [Symbol.iterator]() {
    let index = 0;
    const cards = this.cards;

    return {
    next(): IteratorResult<Card> {
      if (index < cards.length) {
      return { value: cards[index++], done: false };
      } else {
      return { value: undefined, done: true };
      }
    }
    };
  }


  private generateDeck(): Card[] {
    const suits: Suit[] = ['hearts', 'diamonds', 'clubs', 'spades'];
    const ranks: Rank[] = ['two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'jack', 'queen', 'king', 'ace'];

    let cardArray: Card[] = [];

    // Generate deck contents in order, so that the deck is always the same
    for (const suit of suits) {
    for (const rank of ranks) {
      const card = new Card(rank, suit);
      cardArray.push(card);
    }
    }
    return cardArray;
  }

  regenerateDeck(): void {

    this.cards = [];

    this.cards = this.generateDeck();
  }

  shuffle(): void {
    // Shuffle deck using Fisher-Yates
    for (let i = this.cards.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [this.cards[i], this.cards[j]] = [this.cards[j], this.cards[i]];
    }
    return;
  }

  draw(): Card {
    if (this.cards.length < 1)
    throw new Error('Not enough cards to draw.');
    else return this.cards.pop()!;
  }
}

export function dealCards(deck: Deck, count: number) {
  return deck.cards.splice(0, count);
}
  
// Evaluate poker hands
export function evaluateHands(players: Player[], communityCards: Card[]) {
  const evaluatedHands = players.map(player => {
    const allCards: Card[] = [...player.cards,...communityCards] as Card[];
    const handRank = evaluateHand(allCards);
    
    return {
        ...player,
        handRank
    };
  });
  
  // Sort by hand strength (highest first)
  evaluatedHands.sort((a, b) => b.handRank.value - a.handRank.value);
  
  // Find players with the best hand
  const bestRank = evaluatedHands[0].handRank.value;
  const winners = evaluatedHands.filter(p => p.handRank.value === bestRank);
  
  return winners;
  }
  
export function evaluateHand(allCards: Card[]): {hand: string, value: number} {
  let winningHand = '';
  
  // Check if hand is empty
  if (!allCards || allCards.length === 0) {
    winningHand = "Empty Hand";
    return { hand: winningHand, value: 0 }; // Return lowest possible rank
  }
  
  // Initialize empty histogram object
  const hist: {[key in RankValue]?: number} = {};
  
  // Iterate over cards in hand array and increment counter for each RankValue present
  allCards.reduce((hist: {[key in RankValue]?: number}, card: Card) => {
    hist[card.rankValue as RankValue] = (hist[card.rankValue as RankValue] || 0) + 1;
    return hist;
  }, hist);
  
  // Create scored histogram
  const scoredHist: (number | undefined)[][] = Object
    .keys(hist)
    .map(rankNum => [parseInt(rankNum), hist[rankNum as unknown as RankValue]])
    .sort((a, b) => (a[1] ?? 0) === (b[1] ?? 0) ? (b[0] ?? 0) - (a[0] ?? 0) : (b[1] ?? 0) - (a[1] ?? 0));
  
  // Add safety check before continuing
  if (scoredHist.length === 0) {
    winningHand = "Invalid Hand";
    return { hand: winningHand, value: 0 };
  }
  
  // Suits
  // [ suit: count ]
  
  const suits = allCards.reduce((suits: number[], card: Card) => {
    suits[card.suitValue()]++;
    return suits;
  }, [0,0,0,0]);
  
  // Ranked Hand
  // (descending by rank)
  // [ index : rank ]
  
  const rankedHand = allCards.map(card => card.rankValue).sort((a, b) => a - b);
  
  // Evaluate for non-histogram based hands and set a flag accordingly, to be used for final evaluation chain
  const isFlush   = suits.indexOf(5) >= 0;
  const isWheel   = rankedHand[4] === 14 && rankedHand[0] === 2;
  const isStraight  = ( rankedHand[4]
    - rankedHand[3] === 1 || isWheel
  ) && (
    rankedHand[3]   - rankedHand[2] === 1 &&
    rankedHand[2]   - rankedHand[1] === 1 &&
    rankedHand[1]   - rankedHand[0] === 1
  );
  
  // Final Evaluation Chain
  // Starting with Royal Flush and working downwards
  // Using ternary operators to chain evaluations together
  
  // High Card
  const bestHand = (isStraight && isFlush && rankedHand[4] === 14 && !isWheel) ? (10) // Royal Flush
    : (isStraight && isFlush) ? (9 + (rankedHand[4] / 100)) // Straight Flush
      : (scoredHist[0][1] === 4) ? (8 + ((scoredHist[0][0] ?? 0) / 100)) // Four of a Kind
        : (scoredHist[0][1] === 3 && scoredHist[1][1] === 2) ? (7 + ((scoredHist[0][0] ?? 0) / 100) + ((scoredHist[1][0] ?? 0) / 1000)) // Full House
          : (isFlush) ? (6 + (rankedHand[4] / 100)) // Flush
            : (isStraight) ? (5 + (rankedHand[4] / 100)) // Straight
              : (scoredHist[0][1] === 3 && scoredHist[1][1] === 1) ? (4 + ((scoredHist[0][0] ?? 0) / 100)) // Three of a Kind
                : (scoredHist[0][1] === 2 && scoredHist[1][1] === 2) ? (3 + ((scoredHist[0][0] ?? 0) / 100) + ((scoredHist[1][0] ?? 0) / 1000)) // Two Pair
                  : (scoredHist[0][1] === 2 && scoredHist[1][1] === 1) ? (2 + ((scoredHist[0][0] ?? 0) / 100)) // One Pair
                    : (1 + ((scoredHist[0][0] ?? 0) / 100));
  
  winningHand = (bestHand >= 10) ? `Royal Flush`
    : (bestHand >= 9) ? `Straight Flush${isWheel ? ` (Wheel, ${capitalize(allCards[0].suit)})` : ` (${rankedHand[0]} - ${rankedHand[4]}, ${capitalize(allCards[0].suit)})`}`
      : (bestHand >= 8)  ? `Four of a Kind (${capitalize(valueToRank(scoredHist[0][0] as RankValue))}s)`
        : (bestHand >= 7)  ? `Full House (${capitalize(valueToRank(scoredHist[0][0] as RankValue))}s over ${capitalize(valueToRank(scoredHist[1][0] as RankValue))}s)`
          : (bestHand >= 6)  ? `Flush (${capitalize(allCards[0].suit)})`
            : (bestHand >= 5)  ? `Straight${isWheel ? ` (Wheel)` : ` (${rankedHand[0]} - ${rankedHand[4]})`}`
              : (bestHand >= 4)  ? `Three of a Kind (${capitalize(valueToRank(scoredHist[0][0] as RankValue))}s)`
                : (bestHand >= 3)  ? `Two Pair (${capitalize(valueToRank(scoredHist[0][0] as RankValue))}s and ${capitalize(valueToRank(scoredHist[1][0] as RankValue))}s)`
                  : (bestHand >= 2)  ? `Pair of ${capitalize(valueToRank(scoredHist[0][0] as RankValue))}s`
                    : `High Card (${capitalize(valueToRank(scoredHist[0][0] as RankValue))})`;
  
  return { hand: winningHand, value: bestHand }
}

/** 
 * Represents a sidepot.
 * @class
 * @param amount - The amount of the sidepot.
 * @param possibleWinners - The players in the sidepot.
 */
export class Sidepot {
  private amount: number;
  private possibleWinners: Player[];
  private usableHands: { [key: string]: Hand };

  constructor(amount: number, possibleWinners: Player[]) {
      this.amount = amount;
      this.possibleWinners = possibleWinners;
      this.usableHands = {};
      possibleWinners.forEach((player) => {
          this.usableHands[player.username] = player.cards;
      });
  }

  public addHand(player: Player, hand: Hand) {
      if (!this.possibleWinners.includes(player)) {
          throw new Error('Player is not a possible winner');
      }
      this.usableHands[player.username] = hand;
  }

  public getUsableHands(): { [key: string]: Hand } {
      return this.usableHands;
  }
}

export class Game {
  id: string;
  name: string;           
  creator: Player;        
  players: Player[];
  status: 'waiting' | 'playing' | 'paused';
  phase: GamePhase;
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
  sidepots?: Sidepot[];
  deck: Deck | null;
  communityCards: Card[];
  burnPile: Card[];
  activePlayerId: string;
  activePlayerIndex: number | null;
  currentBet: number;

  constructor(id, name, creator, maxPlayers?, smallBlind?, bigBlind?) {
    this.id = id;
    this.name = name;
    this.creator = creator;
    this.maxPlayers = maxPlayers || 6;
    this.smallBlind = smallBlind || 5;
    this.bigBlind = bigBlind || 10;
    this.players = [creator];
    this.status = 'waiting';
    this.phase = GamePhase.WAITING;
    this.hasStarted = false;
    this.roundActive = false;
    this.tablePositions = this.initTableSeats(this.maxPlayers);
    this.pot = 0;
    this.sidepots = [];
    this.deck = null;
    this.communityCards = [];
    this.burnPile = [];
    this.activePlayerId = '';
    this.activePlayerIndex = null;
    this.currentBet = 0;
    this.dealerIndex = 0;
  }

  /**
   * Initializes the table seats.
   * 
   * @function initTableSeats
   * @param {number} maxPlayers - The maximum number of players.
   * @returns {TableSeat[]} The initialized table seats.
   */
  initTableSeats(maxPlayers): TableSeat[] {
    const tablePositions: TableSeat[] = [];
    tablePositions.push({seatNumber: 0, occupied: true, playerId: this.creator.id})
    this.creator.seatNumber = 0;
    for (let i = 1; i < maxPlayers ; i++)
      tablePositions.push({seatNumber: i, occupied: false, playerId: null})

    return tablePositions;
  }

  /**
   * Gets the ID of the next player around the table, ignoring empty seats.
   * 
   * @function getNextPlayerId
   * @param {string} currentPlayerId - The ID of the current player.
   * @returns {string} The ID of the next player.
   * @throws {Error} If an unknown error occurs while finding the player ID.
   */
  getNextPlayerId(currentPlayerId: string): string {
    for (let i = 0; i < this.tablePositions.length; i++) {
      if (this.tablePositions[i].occupied)
        continue;
      
      if (this.tablePositions[i].playerId === currentPlayerId) {
        for (let j = i+1; j <= this.tablePositions.length; j++) {
          if (j === this.tablePositions.length)
            j = 0;
          if (this.tablePositions[j].occupied)
            return this.tablePositions[j].playerId!
          else
            continue;
        }
      }
    }
    throw new Error("Unknown error occurred finding Player Id");
  }


  /**
   * Gets the role IDs for the current round.
   * 
   * @function getRoleIds
   * @param {GameState} state - The current state of the game.
   * @param {boolean} isFirstRound - Indicates whether it is the first round.
   * @returns {RoleIds} The role IDs for the current round.
   */
  getRoleIds(isFirstRound: boolean): RoleIds {
    const players         = this.players;
    const maxPlayers      = players.length;
    const maxAdjusted     = maxPlayers - 1;
    const prevDealerIndex = this.dealerIndex;
    
    const dIndex  = isFirstRound ? 0 : (prevDealerIndex! + 1) % (maxAdjusted);
    const sbIndex = (dIndex + 1) % maxPlayers;
    const bbIndex = (dIndex + 2) % maxPlayers;

    return {
      dealerId: players[dIndex].id,
      smallBlindId: players[sbIndex].id,
      bigBlindId: players[bbIndex].id
    }
  } 

  /**
   * Starts a new round.
   * 
   * @function startRound
   * @param {GameState} state - The current state of the game.
   * @returns {GameState} The updated game state.
   */
  startRound() {

    try {
      // Reset game flags & arrays, reset game objects
      this.communityCards = [];
      this.burnPile = [];
      this.pot = 0;
      this.sidepots = [];
      this.deck = new Deck(true);
      this.phase = GamePhase.PREFLOP;
      this.status = 'playing';

      // Dealer Index is advanced at end of a round, to avoid it being advanced
      // on the first round of a game
      this.smallBlindIndex = (this.dealerIndex + 1) % this.players.length;
      this.bigBlindIndex = (this.smallBlindIndex + 1) % this.players.length;

      // Set Id values for tracked roles, to simplify data access for other methods.
      this.dealerId = this.players[this.dealerIndex].id;
      this.smallBlindId = this.players[this.smallBlindIndex].id;
      this.bigBlindId = this.players[this.bigBlindIndex].id;

      // Reset player flags, settings, and objects
      this.players.forEach(p => {
        p.currentBet = 0;
        p.active = true;
        p.folded = false;
        p.allIn = false;
        p.ready = true;
        p.previousAction = 'none';
        p.cards = [];
      })
      
      // Deal initial cards
      this.dealCards();

      // Small blind posts blind bet
      if (this.smallBlind > this.players[this.smallBlindIndex].chips) {
        this.pot += this.players[this.smallBlindIndex].chips;
        this.players[this.smallBlindIndex].chips = 0;
        this.players[this.smallBlindIndex].allIn = true;
      } else {
        this.pot += this.smallBlind;
        this.players[this.smallBlindIndex].chips -= this.smallBlind;
      }

      // Big blind posts blind bet
      if (this.bigBlind > this.players[this.bigBlindIndex].chips) {
        this.pot += this.players[this.bigBlindIndex].chips;
        this.players[this.bigBlindIndex].chips = 0;
        this.players[this.bigBlindIndex].allIn = true;
      } else {
        this.pot += this.bigBlind;
        this.players[this.bigBlindIndex].chips -= this.bigBlind;
      }

      this.activePlayerIndex = (this.bigBlindIndex + 1) % this.players.length;
      this.activePlayerId = this.players[this.activePlayerIndex].id;

      return true;
      
    } catch (error) {
      console.log(`Threw error: ${error}`);
      throw new Error();
    }
  }

  /**
   * Deal cards to players at start of round, accounting for progressive change in dealer position
   * 
   * @function dealCards
   * @param {GameState} state - The current state of the game.
   * @returns {boolean} - Returns true/false depending upon successful function execution.
   */
  dealCards() {
    const deck = this.deck;

    if (deck === null) return false;

    const numCards = 2; // Can be made dynamic at a later date for other game types, like Omaha

    for (let i = 0; i < numCards; i++) {
      let currentPosition = (this.dealerIndex + 1) % this.players.length;  // Start left of dealer
      let playersDealtTo = 0;  // Track how many players we've dealt to
      
      while (playersDealtTo < this.players.length) {  // Continue until all players have been dealt to
          if (this.players[currentPosition] && this.players[currentPosition].active) {
              const card = deck.draw();
              this.players[currentPosition].cards.push(card);
              console.log(`Dealt ${card} to player '${this.players[currentPosition].username}'`);
          }
          
          currentPosition = (currentPosition + 1) % this.players.length;  // Move to next player, wrap around if needed
          playersDealtTo++;
      }
    }

    return true;
  }

  /**
   * Sort the player array by seat index.
   * This is critical for allowing game logic to neatly loop through players in order.
   * All sorts of processes would get out of order if we just appended new players to the array.
   * 
   * @function sortPlayerList
   * @returns {void}
   */
  sortPlayerList() {
    this.players.sort((a, b) => a.seatNumber - b.seatNumber);
    return;
  }

  dealCommunityCards(flop: boolean = false) {

    if (this.deck === null) return false;

    this.burnPile.push(this.deck.draw());
    console.log(`Burned card ${Card.name}`);

    if (flop) {
      for (let i = 0; i < 3; i++) {
        const card = this.deck.draw();
        this.communityCards.push(card);
        console.log(`Dealt card ${card.name}`);
      }
    } else {
      const card = this.deck.draw();
      this.communityCards.push(card);
      console.log(`Dealt card ${card.name}`);
    }

    return;
  }
}