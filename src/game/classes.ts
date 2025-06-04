import { Ruge_Boogie, Truculenta } from 'next/font/google';
import { Stringable, Suit, Rank, RankValue, CardName, RoomStatus, TGamePhase, TGamePhaseCommon, GamePhases, TGamePhaseStud, GameVariant, GameState, TableSeat, RoleIds, User, CustomGameRules, Hand, Action, Winner, RoomPhase} from './types';
import { capitalize, valueToRank } from '@lib/utils';
import { evaluateHand, evaluateHands } from '@game/utils';
import { Socket, Server } from 'socket.io';
import { socketManager, type SocketManager } from '@lib/socketManager';

type HandRank = {
  hand: string,
  value: number
}

/** Represents a player in the game.
 * Implements the `User` interface.
 * 
 * @class Player
 * @implements {User}
 * 
 * @property {string} id - The unique identifier for the player.
 * @property {number} seatNumber - The seat number assigned to the player at the table.
 * @property {string} username - The username of the player.
 * @property {number} chips - The number of chips the player has.
 * @property {boolean} folded - Indicates whether the player has folded.
 * @property {boolean} active - Indicates whether the player is currently active in the game.
 * @property {boolean} ready - Indicates whether the player is ready to play.
 * @property {boolean} allIn - Indicates whether the player has gone all-in.
 * @property {Card[]} cards - The cards currently held by the player.
 * @property {number} currentBet - The current bet amount placed by the player.
 * @property {Action} previousAction - The last action performed by the player.
 * @property {string} avatar - The avatar image or identifier for the player.
 * 
 * @constructor
 * @param {string} id - The unique identifier for the player.
 * @param {string} username - The username of the player.
 * @param {number} seatNumber - The seat number assigned to the player.
 * @param {number} chips - The initial number of chips the player has.
 * @param {string} avatar - The avatar image or identifier for the player.
 * 
 * @method getId - Returns the player's unique identifier.
 * @method getChips - Returns the number of chips the player has.
 * @method getCards - Returns the cards currently held by the player.
 * @method getSeat - Returns the player's seat number.
 * @method getActive - Returns whether the player is currently active.
 * @method getReady - Returns whether the player is ready to play.
 * @method getAllIn - Returns whether the player has gone all-in.
 * @method getCurrentBet - Returns the current bet amount placed by the player.
 * @method getPrevAction - Returns the last action performed by the player.
 * @method setId - Sets the player's unique identifier.
 * @param {string} value - The new identifier for the player.
 * @method setChips - Sets the number of chips the player has.
 * @param {number} amount - The new chip count for the player.
 * @method addChips - Adds chips to the player's total.
 * @param {number} amountToAdd - The number of chips to add.
 * @method setSeat - Sets the player's seat number.
 * @param {number} seatNum - The new seat number for the player.
 * @method setActive - Sets whether the player is active.
 * @param {boolean} value - The new active status for the player.
 * @method setReady - Sets whether the player is ready to play.
 * @param {boolean} value - The new ready status for the player.
 * @method toggleReady - Toggles the player's ready status.
 * @method setAllIn - Sets whether the player has gone all-in.
 * @param {boolean} value - The new all-in status for the player.
 * @method setCurrentBet - Sets the current bet amount for the player.
 * @param {number} value - The new bet amount.
 * @method setPrevAction - Sets the last action performed by the player.
 * @param {Action} action - The new action to set.
 */
export class Player implements User {
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
  handRank: HandRank;

  constructor(id, username, seatNumber, chips, avatar) {
    this.id = id;
    this.username = username;
    this.seatNumber = seatNumber;
    // Ensure chips is a valid number
    this.chips = typeof chips === 'number' && !isNaN(chips) ? chips : 1000;
    this.avatar = avatar;
    this.folded = false;
    this.active = true;
    this.ready = false;
    this.allIn = false;
    this.cards = [];
    this.currentBet = 0;
    this.previousAction = 'none';
    this.handRank = {
      hand: '',
      value: 0
    }
    
    // Log player creation for debugging
    console.log(`Player created: ${username} with ${this.chips} chips at seat ${seatNumber}`);
  }

  getId() { return this.id; }
  getChips() { return this.chips; }
  getCards() { return this.cards; }
  getSeat() { return this.seatNumber; }
  getActive() { return this.active; }
  getReady() { return this.ready; }
  getAllIn() { return this.allIn; }
  getCurrentBet() { return this.currentBet; }
  getPrevAction() { return this.previousAction; }
  setId(value) { return this.id = value; }
  setChips(amount) { return this.chips = amount; }
  addChips(amountToAdd) { return this.chips += amountToAdd; }
  setSeat(seatNum) { return this.seatNumber = seatNum; }
  setActive(value) { return this.active = value; }
  setReady(value) { return this.ready = value; }
  toggleReady() { return this.ready = !this.ready; }
  setAllIn(value) { return this.allIn = value; }
  setCurrentBet(value) { return this.currentBet = value; }
  setPrevAction(action) { return this.previousAction = action; }

}

/** Represents a playing card.
 * @class
 * @param suit - The suit of the card
 * @param rank - The rank of the card
 * @param faceUp - Whether the card is shown face-up or not
 * @example <caption>Creating a new Card instance with a Rank and Suit</caption>
 * const card = new Card('ace', 'hearts'); // Ace of Hearts
 * @example <caption>Creating a new Card instance with a RankValue and Suit</caption>
 * const card = new Card(12, 'diamonds'); // Queen of Diamonds
 * @example <caption>Creating a new Card instance with just two-character card name</caption>
 * const card = new Card('AS'); // Ace of Spades
 * const card = new Card('4C'); // Four of Clubs
 * const card = new Card('TH'); // Ten of Hearts
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
  constructor(rank?: RankValue | Rank | CardName, suit?: Suit, faceUp = false) {
    if (!rank)
      rank = this.getRandomRank();
    if (!suit)
      suit = this.getRandomSuit();
    if (typeof rank === 'number')
      this.rank = this.rankFromValue(rank);
    else if (typeof rank === 'string' && rank.length === 2)
      [this.rank, this.suit] = this.getRankAndSuitFromName(rank as CardName);
    else if (typeof rank === 'string' && rank.length > 2)
      this.rank = rank as Rank;
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
      case 'hearts':    return 1;
      case 'diamonds':  return 2;
      case 'clubs':     return 3;
      case 'spades':    return 4;
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

  private getRandomSuit() {
    const rand = Math.floor(Math.random() * 4);

    switch (rand) {
      case 0: return 'hearts';
      case 1: return 'diamonds';
      case 2: return 'clubs';
      case 3: return 'spades';
      default: throw new Error(`Invalid random suit value: ${rand}`);
    }
  }

  private getRandomRank() {
    const rand = Math.floor(Math.random() * 13);

    switch (rand) {
      case 0: return 'two';
      case 1: return 'three';
      case 2: return 'four';
      case 3: return 'five';
      case 4: return 'six';
      case 5: return 'seven';
      case 6: return 'eight';
      case 7: return 'nine';
      case 8: return 'ten';
      case 9: return 'jack';
      case 10: return 'queen';
      case 11: return 'king';
      case 12: return 'ace';
      default: throw new Error(`Invalid random rank alue: ${rand}`);
    }
  }
}

/**  Represents a deck of cards.
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
    let cards = this.cards;
    
    return {
      next: function() {
        return {
          value: cards[index++],
          done: index > cards.length
        };
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

/** Represents a sidepot.
 * @class
 * @param amount - The amount of the sidepot.
 * @param possibleWinners - The players eligible to win this pot.
 */
export class Sidepot {
  amount: number;
  eligiblePlayers: Player[];
  
  constructor(amount: number, eligiblePlayers: Player[]) {
    this.amount = amount;
    this.eligiblePlayers = eligiblePlayers;
  }

  public addAmount(value: number): void {
    this.amount += value;
  }
  
  public getAmount(): number {
    return this.amount;
  }
  
  public getEligiblePlayers(): Player[] {
    return this.eligiblePlayers;
  }
  
  public isPlayerEligible(player: Player): boolean {
    return this.eligiblePlayers.includes(player);
  }
  
  public addEligiblePlayer(player: Player): void {
    if (!this.isPlayerEligible(player)) {
      this.eligiblePlayers.push(player);
    }
  }
}

/** Represents the game and all necessary properties and objects necessary for play
 * @class
 * @param {string} id The unique ID of the game room
 * @param {string} name The name of the game room
 * @param {Player} creator The player object of the player who created the game room
 * @param {Socket} socket
 * @param {number} maxPlayers Maximum number of allowed players. Defaults to 6.
 * @param {number} smallBlind Starting small blind amount. Defaults to 5.
 * @param {number} bigBlind Starting big blind amount. Defaults to twice the small blind amount.
 * @param {GameVariant} gameVariant The game variant for the first round of play. Defaults to Texas Hold 'Em.
 * @param {CustomGameRules} CustomGameRules Any custom game rules for the custom variant chosen to start play
 */
export class Game {
  id: string;
  name: string;           
  creator: Player;        
  players: Player[];
  status: RoomStatus;
  roomPhase: RoomPhase;
  socket: Server;
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
  sidepots: Sidepot[];
  ineligiblePlayers: Player[];
  deck: Deck | null;
  communityCards: Card[] | null;
  burnPile: Card[] | null;
  activePlayerId: string;
  activePlayerIndex: number | null;
  currentBet: number;
  roundCount: number;
  gameVariant: GameVariant;
  cardsPerPlayer: number;
  customRules?: any;
  dealerSelectedVariant: GameVariant | null;
  nextRoundVariant: GameVariant | null;
  variantSelectionActive: boolean;
  variantSelectionTimeout: NodeJS.Timeout | null;
  wildcard: Rank | Card | null;

  constructor(id: string, name: string, creator: Player, maxPlayers?: number, smallBlind?: number, bigBlind?: number, gameVariant?: GameVariant, customRules?: CustomGameRules) {
    this.id = id;
    this.name = name;
    this.creator = creator;
    this.maxPlayers = maxPlayers || 6;
    this.smallBlind = smallBlind || 5;
    this.bigBlind = bigBlind || this.smallBlind * 2;
    this.players = [creator];
    this.socket = socketManager.getIO();
    this.status = 'waiting';
    this.phase = 'waiting';
    this.hasStarted = false;
    this.roundActive = false;
    this.tablePositions = this.initTableSeats(this.maxPlayers);
    this.pot = 0;
    this.sidepots = [];
    this.ineligiblePlayers = [];
    this.deck = null;
    this.communityCards = [];
    this.burnPile = [];
    this.activePlayerId = '';
    this.activePlayerIndex = null;
    this.currentBet = 0;
    this.dealerIndex = 0;
    this.roundCount = 0;
    this.gameVariant = gameVariant || 'TexasHoldEm';
    this.dealerSelectedVariant = null;
    this.nextRoundVariant = this.gameVariant;
    this.variantSelectionActive = false;
    this.variantSelectionTimeout = null;

    this.updateCardsPerPlayer(this.gameVariant, customRules)
    switch (gameVariant) {
      case 'TexasHoldEm':
      case 'Omaha':
      case 'OmahaHiLo':
      case 'Chicago':
        this.phaseOrder = ['waiting', 'preflop', 'flop', 'turn', 'river', 'showdown'];
        break;
      case 'FiveCardDraw':
        this.phaseOrder = ['waiting', 'predraw', 'draw', 'showdown'];
        break;
      case 'SevenCardStud':
        this.phaseOrder = ['waiting', 'thirdstreet', 'fourthstreet', 'fifthstreet', 'sixthstreet', 'seventhstreet', 'showdown'];
        break;
      default:
        this.phaseOrder = ['waiting', 'preflop', 'flop', 'turn', 'river', 'showdown'];
        break;
    }
  }

  /** Sets cardsPerPlayer based on provided game variant and/or custom variant rule definitions.
   * @function updateCardsPerPlayer
   * @param {GameVariant} variant The game variant in use.
   * @param {CustomGameRules} customRules Any potential custom game rules in use by custom game types.
   */
  updateCardsPerPlayer(variant: GameVariant, customRules?: CustomGameRules): void {
      switch (variant) {
        case 'Omaha':
        case 'OmahaHiLo':
          this.cardsPerPlayer = 4;
          break;
        case 'FiveCardDraw':
          this.cardsPerPlayer = 5;
          break;
        case 'SevenCardStud':
          this.cardsPerPlayer = 3;
          break;
        case 'Custom':
          this.customRules = customRules; // Ensure customRules are updated if variant changes to Custom
          this.cardsPerPlayer = customRules?.cardsPerPlayer || 2; // Default for custom if not specified
          break;
        // Default for Texas Hold'Em, Chicago, potentially DealersChoice before selection
        case 'TexasHoldEm':
        case 'Chicago':
        case 'DealersChoice': // Default until selected
        default:
          this.cardsPerPlayer = 2;
      }
      console.log(`Updated cardsPerPlayer to ${this.cardsPerPlayer} for variant ${variant}`);
  }

  /** Initializes the table seats.
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

  /** Gets the ID of the next player around the table, ignoring empty seats.
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

  /** Gets the role IDs for the current round.
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

  /** Handles dealer's selection of game variant for Dealer's Choice games
   * @param variant The game variant selected by the dealer
   * @returns Boolean indicating whether the selection was successful
   */
  setDealerVariant(variant: GameVariant): boolean {
    // Only allow selection if this is a Dealer's Choice game
    if (this.gameVariant !== 'DealersChoice') {
      console.log('Cannot set dealer variant: not a Dealer\'s Choice game');
      return false;
    }
    
    // Only allow selection when variant selection is active
    if (!this.variantSelectionActive) {
      console.log('Cannot set dealer variant: selection not currently active');
      return false;
    }

    // Validate that the selected variant is allowed
    const allowedVariants: GameVariant[] = [
      'TexasHoldEm', 'Omaha', 'FiveCardDraw', 'SevenCardStud', 'OmahaHiLo', 'Chicago'
    ];
    
    if (!allowedVariants.includes(variant)) {
      console.log(`Invalid variant selected: ${variant}`);
      return false;
    }

    console.log(`Dealer selected variant: ${variant}`);
    this.dealerSelectedVariant = variant;
    
    this.updateCardsPerPlayer(variant);
    
    // Cancel the selection timeout if it exists
    if (this.variantSelectionTimeout) {
      clearTimeout(this.variantSelectionTimeout);
      this.variantSelectionTimeout = null;
    }
    
    // End the selection phase
    this.variantSelectionActive = false;
    
    // Notify all players of the selected variant
    if (this.socket) {
      this.socket.to(this.id).emit('variant_selected', {
        dealerId: this.dealerId,
        dealerName: this.players[this.dealerIndex].username,
        selectedVariant: variant
      });
    }
    
    return true;
  }

  /** Starts the dealer's choice selection phase
   * @param timeoutMs Time in milliseconds to wait for dealer selection before defaulting
   * @returns Boolean indicating if selection started successfully
   */
  startDealerVariantSelection(timeoutMs = 15000): boolean {
    if (this.gameVariant !== 'DealersChoice' || this.dealerIndex === undefined || !this.players[this.dealerIndex]) {
      return false;
    }

    console.log(`Starting dealer variant selection, dealer: ${this.players[this.dealerIndex].username}`);
    this.variantSelectionActive = true;
    this.phase = 'waiting'; // Ensure phase is waiting during selection
    this.roomPhase = 'dealersetup';
    this.dealerSelectedVariant = null; // Clear previous selection

    // ... (rest of notification and timeout logic remains the same)

    // Handle timeout - it should now call continueRoundSetup with the default variant
    this.variantSelectionTimeout = setTimeout(() => {
      if (this.variantSelectionActive) {
        console.log('Dealer variant selection timed out, defaulting to Texas Hold\'em');
        this.dealerSelectedVariant = 'TexasHoldEm';
        this.variantSelectionActive = false;
        this.updateCardsPerPlayer(this.dealerSelectedVariant); // Update cardsPerPlayer

        // Notify all players of the default selection
        if (this.socket) {
          // Emit via io instance in socket.ts
          this.socket.to(this.id).emit('variant_selected', {
            dealerId: this.dealerId,
            dealerName: this.players[this.dealerIndex].username,
            selectedVariant: this.dealerSelectedVariant
          });
        }

        // *** NOW CALL continueRoundSetup with the chosen variant ***
        this.continueRoundSetup(this.dealerSelectedVariant);
        // Trigger game_update from socket.ts after setup is complete
      }
    }, timeoutMs);

    return true;
  }

  /** Starts a new round.
   * @function startRound
   * @param {GameState} state - The current state of the game.
   * @returns {GameState} The updated game state.
   */
  startRound() {
    try {
      console.log(`Starting round!\n...Initializing values`);
      // Reset game flags & arrays, reset game objects
      this.communityCards = [];
      this.burnPile = [];
      this.pot = 0;
      this.sidepots = [];
      this.ineligiblePlayers = [];
      
      switch (this.gameVariant) {
        case 'TexasHoldEm':
        case 'Omaha':
        case 'OmahaHiLo':
        case 'Chicago':
          this.phaseOrder = ['waiting', 'preflop', 'flop', 'turn', 'river', 'showdown'];
          break;
        case 'FiveCardDraw':
          this.phaseOrder = ['waiting', 'predraw', 'draw', 'showdown'];
          break;
        case 'SevenCardStud':
          this.phaseOrder = ['waiting', 'thirdstreet', 'fourthstreet', 'fifthstreet', 'sixthstreet', 'seventhstreet', 'showdown'];
          break;
      }

      // Increment round count
      this.roundCount++;

      // Advance dealer position (except for first round)
      if (this.roundCount > 1) this.dealerIndex = (this.dealerIndex + 1) % this.players.length;

      // Set position indexes
      this.smallBlindIndex = (this.dealerIndex + 1) % this.players.length;
      this.bigBlindIndex = (this.smallBlindIndex + 1) % this.players.length;

      // Set Id values for tracked roles, to simplify data access for other methods.
      this.dealerId = this.players[this.dealerIndex].id;
      this.smallBlindId = this.players[this.smallBlindIndex].id;
      this.bigBlindId = this.players[this.bigBlindIndex].id;

      let roundVariant = this.gameVariant; // Default to the game's base variant
      
      if (this.nextRoundVariant) {
        console.log(`Using pre-selected variant for this round: ${this.nextRoundVariant}`);
        roundVariant = this.nextRoundVariant;
        this.nextRoundVariant = null; // Consume the selection
        // Update cardsPerPlayer based on the actual round variant
        this.updateCardsPerPlayer(roundVariant, this.customRules);
      }
      // For Dealer's Choice, start the variant selection phase
      else if (this.gameVariant === 'DealersChoice') {
        console.log('Starting dealer variant selection before dealing cards');
        this.startDealerVariantSelection();
        
        // We'll continue the round setup once the dealer makes a selection
        // or when the selection timeout occurs (handled in those methods)
        return true;
      }
      // If no pre-selection and not Dealer's Choice, ensure cardsPerPlayer matches the game's default variant
      else {
        this.updateCardsPerPlayer(this.gameVariant, this.customRules);
      }
      
      // For regular games or post-selection, continue with standard round setup
      // Pass the determined roundVariant to the continuation method
      return this.continueRoundSetup(roundVariant);
      
    } catch (error) {
      console.log(`Error starting round: ${error}`);
      // Consider emitting an error state to clients
      throw new Error("Failed to start round");
    }
  }
  
  confirmDealerIdFromIndex(): boolean {
    if (this.dealerId !== this.players[this.dealerIndex].id) {
      if (this.players.findIndex(p => p.id === this.dealerId) !== this.dealerIndex)
        return false;
    }
    return true;
  }

  confirmDealerIndexFromId(): boolean {
    if (this.dealerIndex !== this.players.findIndex(p => p.id === this.dealerId))
      return false;
    return true;
  }

  /** Finalizes round setup.
   * @function continueRoundSetup
   * @param {GameVariant} currentRoundVariant The current game variant in use.
   * @returns {boolean} Returns true/false based on successful function execution.
   */
  continueRoundSetup(currentRoundVariant: GameVariant): boolean {
    try {
      console.log(`Continuing round setup for variant: ${currentRoundVariant}`);
      // Create a new deck
      this.deck = new Deck(true);
      // Set phase based on the variant type
      if (this.phaseOrder && this.phaseOrder.length > 1)
        this.phase = this.phaseOrder[1];

      this.status = 'playing';

      console.log(`...Resetting player flags`);
      // Reset player flags, settings, and objects
      this.players.forEach(p => {
        p.currentBet = 0;
        p.active = true;
        p.folded = false;
        p.allIn = false;
        p.previousAction = 'none';
        p.cards = [];
      });

      console.log(`Dealer: ${this.players[this.dealerIndex].username}`);
      console.log(`...Dealing cards using variant ${currentRoundVariant}`);
      // Deal initial cards based on the ROUND variant
      this.dealCards(currentRoundVariant);

      // Post blinds (Handle all-in)
      this.postBlinds();

      // Set current bet to big blind amount
      this.currentBet = this.bigBlind;

      console.log(`...Setting active player`);
      if (currentRoundVariant === 'SevenCardStud')
        this.activePlayerIndex = this.players.indexOf(this.determineHighestShowingCard()[0]);
      else
        this.activePlayerIndex = (this.bigBlindIndex! + 1) % this.players.length;
      
      // Set active player ID
      this.activePlayerId = this.players[this.activePlayerIndex].id;
      console.log(
				"[DEBUG continueRoundSetup] Set activePlayerIndex:",
				this.activePlayerIndex,
				"activePlayerId:",
				this.activePlayerId,
				"username:",
				this.players[this.activePlayerIndex].username
			);

      return true;

    } catch (error) {
      console.log(`Error continuing round setup: ${error}`);
      throw new Error("Failed to continue round setup");
    }
  }

  /** Function for handling blind bets at the start of a round.
   * @function postBlinds
   * @returns {void}
   */
  private postBlinds(): void {

    const smallBlindPlayer = this.players[this.smallBlindIndex!];
    const bigBlindPlayer = this.players[this.bigBlindIndex!];

    console.log(`Small blind: ${smallBlindPlayer.username}\nBig blind:${bigBlindPlayer.username}`);
    console.log(`...Taking blinds`);

    const sbAmount = Math.min(this.smallBlind, smallBlindPlayer.chips);
    this.pot += sbAmount;
    smallBlindPlayer.currentBet = sbAmount;
    smallBlindPlayer.chips -= sbAmount;
    smallBlindPlayer.allIn = smallBlindPlayer.chips === 0;
    smallBlindPlayer.previousAction = 'bet'; 

    const bbAmount = Math.min(this.bigBlind, bigBlindPlayer.chips);
    this.pot += bbAmount;
    bigBlindPlayer.currentBet = bbAmount;
    bigBlindPlayer.chips -= bbAmount;
    bigBlindPlayer.allIn = bigBlindPlayer.chips === 0;
    bigBlindPlayer.previousAction = 'none'; 
    // Big blind previous action is 'none' to allow the action to return to them in first round. 
  }

  /** Determines the player with the highest showing card to determine the first player to act in Stud games.
   * @returns {[Player, Card]} An array containing the player with the highest showing card, and that card.
   */
  private determineHighestShowingCard(): [ Player, Card ] {
    // Logic to determine the highest showing card for the first player
    // This is specific to Seven Card Stud abd is used to determine who begins the round
    let highestCard: Card | null = null;
    let highestPlayer: Player | null = null;

    for (let i = 0; i < this.players.length; i++) {
      const player = this.players[i];
      if (player.cards.length > 0 && !player.folded) {
        const playerShowingCard = player.cards.find(c => c.faceUp);
        if (!highestCard || playerShowingCard!.getValue() > highestCard.getValue()) {
          highestCard = playerShowingCard!;
          highestPlayer = player;
        }
        if (playerShowingCard?.getValue() === highestCard?.getValue() && highestPlayer && highestPlayer.username !== player.username) {
          if (playerShowingCard.suitValue() > highestCard.suitValue()) {
            highestCard = playerShowingCard;
            highestPlayer = player;
          }
        }
      }
    };

    if (!highestPlayer) throw new Error('Unknown error: Could not determine player with high card!');
    if (!highestCard) throw new Error('Unknown error: Could not determine highest card!');
    return [ highestPlayer, highestCard ];
  }

  /** Continues the round setup after variant selection for Dealer's Choice games.
   * @function continueRoundAfterVariantSelection
   * @returns {boolean} Boolean indicating if the setup was successful
   */
  continueRoundAfterVariantSelection(): boolean {
    try {
      // If this is a Dealer's Choice game, use the selected variant
      if (this.gameVariant === 'DealersChoice' && this.dealerSelectedVariant) {
        console.log(`Using dealer selected variant: ${this.dealerSelectedVariant}`);
        // Create a new deck after variant selection
        this.deck = new Deck(true); // Auto-shuffled
        this.phase = 'preflop';
        this.status = 'playing';
      } else {
        // For standard games, create a new deck
        this.deck = new Deck(true); // Auto-shuffled
        this.phase = 'preflop'
        this.status = 'playing';
      }

      console.log(`...Resetting player flags`);
      // Reset player flags, settings, and objects
      this.players.forEach(p => {
        p.currentBet = 0;
        p.active = true;
        p.folded = false;
        p.allIn = false;
        p.previousAction = 'none';
        p.cards = [];
      })

      console.log(`Dealer: ${this.players[this.dealerIndex].username}`);
      console.log(`...Dealing cards`);
      // Deal initial cards
      this.dealCards(this.gameVariant);

      console.log(`...Taking blinds`)
      const smallBlindPlayer = this.players[this.smallBlindIndex!];
      const bigBlindPlayer = this.players[this.bigBlindIndex!];
      console.log(`Small blind: ${smallBlindPlayer.username}\nBig blind:${bigBlindPlayer.username}`);

      // Small blind posts blind bet
      if (this.smallBlind > smallBlindPlayer.chips) {
        this.pot += smallBlindPlayer.chips;
        smallBlindPlayer.currentBet = smallBlindPlayer.chips;
        smallBlindPlayer.chips = 0;
        smallBlindPlayer.allIn = true;
      } else {
        this.pot += this.smallBlind;
        smallBlindPlayer.currentBet = this.smallBlind;
        smallBlindPlayer.chips -= this.smallBlind;
      }

      // Big blind posts blind bet
      if (this.bigBlind > bigBlindPlayer.chips) {
        this.pot += bigBlindPlayer.chips;
        bigBlindPlayer.currentBet = bigBlindPlayer.chips;
        bigBlindPlayer.chips = 0;
        bigBlindPlayer.allIn = true;
      } else {
        this.pot += this.bigBlind;
        bigBlindPlayer.currentBet = this.bigBlind;
        bigBlindPlayer.chips -= this.bigBlind;
      }
      
      // Set current bet to big blind amount
      this.currentBet = this.bigBlind;

      console.log(`...Setting active player`);
      this.activePlayerIndex = (this.bigBlindIndex! + 1) % this.players.length;
      this.activePlayerId = this.players[this.activePlayerIndex].id;
      console.log(
				"[DEBUG continueRoundAfterVariantSelection] Set activePlayerIndex:",
				this.activePlayerIndex,
				"activePlayerId:",
				this.activePlayerId,
				"username:",
				this.players[this.activePlayerIndex].username
			);

      if (this.socket) {
        this.socket.to(this.id).emit('game_update', { game: this.returnGameState() });
      }
      return true;
      
    } catch (error) {
      console.log(`Threw error: ${error}`);
      throw new Error();
    }
  }

  /** Parent function for dealing cards to players. Calls the appropriate dealing function based on game variant.
   * @function dealCards
   * @param {GameVariant} currentRoundVariant The game variant in use.
   * @returns {boolean} Returns true/false based on success of function execution. 
   */
  dealCards(currentRoundVariant: GameVariant): boolean {
    let success = false;
    switch (currentRoundVariant) {
      case 'TexasHoldEm':
      case 'Omaha':
      case 'OmahaHiLo':
      case 'Chicago':
        success = this.dealHoldEmCards(currentRoundVariant);
        break;
      case 'SevenCardStud':
        success = this.dealStudCards();
        break;
      case 'FiveCardDraw':
        // TODO deal Five Card Draw function
        break;
      case 'Custom':
      case 'DealersChoice':
        // TODO handle these types of card deals
        break;
    }
    return success;
  }

  /** Deal cards to players at start of round, starting from dealer's left position, according to Hold 'Em variant rules.
   * @function dealHoldEmCards
   * @param {GameVariant} currentRoundVariant The game variant in use.
   * @returns {boolean} - Returns true/false depending upon successful function execution.
   */
  dealHoldEmCards(currentRoundVariant: GameVariant): boolean {
    // Standard dealing pattern for most games

    if (!this.deck) return false;
    const numCards = this.cardsPerPlayer;
    
    for (let i = 0; i < numCards; i++) {
      let currentPosition = (this.dealerIndex + 1) % this.players.length;
      for (let p = 0; p < this.players.length; p++) {
        const playerIndex = (currentPosition + p) % this.players.length;
        const player = this.players[playerIndex];
        // Only deal to active (non-folded) players who don't have enough cards yet
        if (player && !player.folded && player.cards.length < numCards) {
          const card = this.deck.draw();
          // Handle face-up cards (e.g., Chicago's last card)
          if (currentRoundVariant === 'Chicago' && i === numCards - 1)
            card.faceUp = true;
          else
            card.faceUp = false; // Ensure default is face down

          player.cards.push(card);
          console.log(`Dealt ${card.faceUp ? 'face up ' : ''}${card.name} to player '${player.username}'`);
        }
      }
    }
    return true;
  }

  /** Deal cards to players per Stud variant rules, number and face up/face down depending on current round phase.
   * @function dealStudCards
   * @returns {boolean} - Returns true/false depending upon successful function execution.
   */
  dealStudCards(): boolean {
    if (!this.deck) return false;
    
    let cardsToDeal = 0;
    let faceUp = false;
    
    switch(this.phase) {
      case 'thirdstreet':
        cardsToDeal = 3; // 2 down, 1 up
        break;
      case 'fourthstreet':
      case 'fifthstreet':
      case 'sixthstreet':
        cardsToDeal = 1;
        faceUp = true;
        break;
      case 'seventhstreet': // River card in Stud
        cardsToDeal = 1;
        faceUp = false; // River card is dealt face down in Stud
        break;
      default:
        console.error(`Invalid phase for Stud dealing: ${this.phase}`);
        return false;
    }
    
    console.log(`Dealing Stud: Phase ${this.phase}, Cards ${cardsToDeal}, FaceUp ${faceUp}`);
    
    for (let i = 0; i < cardsToDeal; i++) {
      let currentPosition = (this.dealerIndex + 1) % this.players.length;
      for (let p = 0; p < this.players.length; p++) {
        const playerIndex = (currentPosition + p) % this.players.length;
        const player = this.players[playerIndex];
        if (player && !player.folded) {
          const card = this.deck!.draw();
          // Third street: first 2 down, 3rd up. Others depend on 'faceUp' flag.
          if (this.phase === 'thirdstreet')
            card.faceUp = (i === 2); // Only the 3rd card is face up initially
          else
            card.faceUp = faceUp;

          player.cards.push(card);
          console.log(`Dealt ${card.faceUp ? 'face up' : 'face down'} ${card.name} to player '${player.username}'`);
        }
      }
    }
    return true;
  }

  dealCommunityCardsByPhase(): boolean {
    switch (this.phase) {
      case 'flop':
        console.log('Dealing the flop');
        return this.dealCommunityCards(true); // Deal flop (3 cards)
        break;
      case 'turn':
        console.log('Dealing the turn');
        return this.dealCommunityCards(); // Deal turn (1 card)
        break;
      case 'river':
        console.log('Dealing the river');
        return this.dealCommunityCards(); // Deal river (1 card)
        break;
      case 'showdown':
        break;
      default:
        console.log(`Unknown phase: ${this.phase}`);
        break;
      }
      return false;
  }

  /** Deal out community cards from the active deck
   * @function dealCommunityCards
   * @param {boolean} [flop=false] Whether to deal out 3 cards for the flop, or just one
   * @returns {boolean} Returns true or false based on fuction execution success
   */
  dealCommunityCards(flop: boolean = false): boolean {
    // Check if deck is initialized and arrays exist
    if (this.deck === null || !Array.isArray(this.burnPile) || !Array.isArray(this.communityCards)) return false;

    // Determine which game variant to use
    let effectiveVariant = this.gameVariant;
    if (this.gameVariant === 'DealersChoice' && this.dealerSelectedVariant) {
      effectiveVariant = this.dealerSelectedVariant;
    }

    // Draw games like Five Card Draw don't use community cards
    if (effectiveVariant === 'FiveCardDraw') {
      console.log('Skipping community cards for Five Card Draw');
      return true;
    }

    const faceUp = this.gameVariant === 'Chicago' && flop === false;
    const burnCard = this.deck.draw();
    this.burnPile.push(burnCard);
    console.log(`Burned card: ${burnCard.name}`);

    if (flop) {
      for (let i = 0; i < 3; i++) {
        const card = this.deck.draw();
        card.faceUp = faceUp;
        this.communityCards.push(card);
        console.log(`Dealt flop card #${i+1}: ${card.name}`);
      }
    } else {
      const card = this.deck.draw();
      card.faceUp = faceUp;
      this.communityCards.push(card);
      console.log(`Dealt turn/river card: ${card.name}`);
    }

    return true;
  }

  /** Returns the current dealer's username based on the current value of dealerId 
   * @function getDealer
   * @returns {string} The username of the current dealer
  */
  public getDealer(): string {
    return this.players.find(p => p.id === this.dealerId)?.username || 'Unknown Dealer';
  }

  /** Sort the player array by seat index.
   * This is critical for allowing game logic to neatly loop through players in order.
   * All sorts of processes would get out of order if we just appended new players to the array.
   * @function sortPlayerList
   * @returns {void}
   */
  sortPlayerList(): void {
    this.players.sort((a, b) => a.seatNumber - b.seatNumber);
    return;
  }

  /** Return object containing state of Game class
   * @function returnGameState
   * @returns {GameState} GameState object
   */
  returnGameState(): GameState {
    const gameState: GameState = {
      id: this.id,
      name: this.name,
      creator: {
        id: this.creator.id,
        username: this.creator.username,
        seatNumber: this.creator.seatNumber,
        chips: this.creator.chips,
        ready: this.creator.ready,
        avatar: this.creator.avatar
      },
      maxPlayers: this.maxPlayers,
      smallBlind: this.smallBlind,
      bigBlind: this.bigBlind,
      players: this.players.map(player => ({
        id: player.id,
        username: player.username,
        seatNumber: player.seatNumber,
        chips: player.chips,
        folded: player.folded,
        active: player.active,
        ready: player.ready,
        allIn: player.allIn,
        cards: player.cards.map(card => ({
          suit: card.suit,
          rank: card.rank,
          rankValue: card.rankValue,
          name: card.name,
          faceUp: card.faceUp
        })),
        currentBet: player.currentBet,
        previousAction: player.previousAction,
        avatar: player.avatar
      })),
      status: this.status,
      phase: this.phase,
      phaseOrder: this.phaseOrder,
      hasStarted: this.hasStarted,
      roundActive: this.roundActive,
      tablePositions: this.tablePositions.map(pos => ({
        seatNumber: pos.seatNumber, 
        occupied: pos.occupied, 
        playerId: pos.playerId
      })),
      pot: this.pot,
      sidepots: this.sidepots.map(sidepot => ({
        amount: sidepot.amount,
        eligiblePlayers: sidepot.eligiblePlayers.map(p => p.id)
      })),
      communityCards: this.communityCards ? this.communityCards.map(card => ({
        suit: card.suit,
        rank: card.rank,
        rankValue: card.rankValue,
        name: card.name,
        faceUp: card.faceUp
      })) : [],
      activePlayerId: this.activePlayerId,
      activePlayerIndex: this.activePlayerIndex,
      smallBlindIndex: this.smallBlindIndex,
      bigBlindIndex: this.bigBlindIndex,
      smallBlindId: this.smallBlindId,
      bigBlindId: this.bigBlindId,
      currentBet: this.currentBet,
      dealerIndex: this.dealerIndex,
      dealerId: this.dealerId,
      // Dealer's Choice specific properties
      gameVariant: this.gameVariant,
      variantSelectionActive: this.variantSelectionActive || false,
      currentSelectedVariant: this.dealerSelectedVariant || null,
      cardsPerPlayer: this.cardsPerPlayer,
      activeVariant: this.dealerSelectedVariant || this.gameVariant, // Variant currently in play if Dealer's Choice selected
      nextRoundVariant: this.nextRoundVariant, // Variant selected for the *next* round
    }
    
    return gameState;
  }

  /** Returns, and potentialy sets the activePlayerIndex, the value of the next player's index.
   * @param {boolean} advanceActive If provided, and true, the function will set it's parent Game object's "activePlayerIndex" property to the value of the next player's index before returning it.
   * @returns {number} Returns the next player's index
   */
  getNextPlayer(advanceActive = false): number | void {
    
    this.sortPlayerList();

    if (!this.activePlayerIndex) return;

    const currentPlayerIndex = this.activePlayerIndex;
    const nextPlayerIndex = (currentPlayerIndex + 1) % this.players.length;

    if (advanceActive) this.activePlayerIndex = nextPlayerIndex;
    return nextPlayerIndex;
  }

  /** Gets the index of the current phase in the phase order list
   * @function getPhaseIndex
   * @returns {number} Index of the active phase in the phase order list
   */
  getPhaseIndex(): number {
    return this.phaseOrder.indexOf(this.phase)
  }

  /** Returns the next phase from current phase, based on phase order list.
   * @function getNextPhase
   * @returns {TGamePhaseCommon} The next phase in the list of current game variant phases.
   */
  getNextPhase(): TGamePhaseCommon {
    return this.phaseOrder[this.getPhaseIndex() + 1];
  }

  /** Returns the name of the current phase plus an optional index offset. 
   * Clamps to final phase in list if computed value is outside the range. 
   * @function getPhaseName
   * @param {number} addNum Optional index offset from current phase to return.
   * @returns {string} Formatted name of computed phase, e.g. 'Third Street' or 'Pre-Flop'.
   */
  private getPhaseName(addNum = 0): string {
    const currPhaseIndex = this.phaseOrder.indexOf(this.phase);
    let finalPhaseIndex = currPhaseIndex + addNum;
    if (finalPhaseIndex >= this.phaseOrder.length)
      finalPhaseIndex = this.phaseOrder.length - 1;
    const finalPhase = this.phaseOrder[finalPhaseIndex];

    switch (finalPhase) {
      case 'preflop':
        return 'Pre-Flop';
      case 'flop':
        return 'Flop';
      case 'turn':
        return 'Turn';
      case 'river':
        return 'River';
      case 'thirdstreet':
        return 'Third Street';
      case 'fourthstreet':
        return 'Fourth Street';
      case 'fifthstreet':
        return 'Fifth Street';
      case 'sixthstreet':
        return 'Sixth Street';
      case 'seventhstreet':
        return 'Seventh Street';
      case 'predraw':
        return 'Pre-Draw';
      case 'draw':
        return 'Draw';
      case 'showdown':
        return 'Showdown';
      default:
        return 'Unknown Phase';
    }
  }

  checkPhaseProgress() {
    const activePlayers = this.players.filter(p => !p.folded);
    
    // Handle case where only one player remains
    if (activePlayers.length === 1) {
      console.log(`Only one active player remains: ${activePlayers[0].username}`);
      // Award pot to the last remaining player
      const winner = activePlayers[0];
      let totalWinnings = this.pot;
      winner.chips += this.pot;
      winner.previousAction = 'win';
      
      // Handle any sidepots
      if (this.sidepots.length > 0) {
        this.sidepots.forEach(sidepot => {
          const sidepotAmount = sidepot.getAmount();
          winner.chips += sidepotAmount;
          totalWinnings += sidepotAmount;
        });
      }
      
      this.pot = 0;
      this.sidepots = [];

      if (this.resetRound()) {
        this.dealCards(this.gameVariant);
        return true;
      }
      return false;
    }

    // Check if all active players have acted and matched current bet
    const allPlayersActed = this.players.every(p =>
      p.folded || // Folded players don't need to act
      p.allIn  || // All-in players can't act
      (p.previousAction !== 'none' && p.currentBet === this.currentBet) // Player has acted and matched current bet
    );

    // Special handling for preflop - big blind must get opportunity to act if there was a raise
    if (this.phase === 'preflop') {
      const bigBlindPlayer = this.players.find(p => p.id === this.bigBlindId);
      if (bigBlindPlayer && !bigBlindPlayer.folded && !bigBlindPlayer.allIn && 
          (bigBlindPlayer.previousAction === 'none' && this.currentBet > this.bigBlind)) {
        console.log('Big blind still needs to act');
        this.findNextActivePlayer();
        return;
      }
    }

    // If not all players have acted, find next player
    if (!allPlayersActed) {
      this.findNextActivePlayer();
      return;
    }

    // All players have acted - advance to next phase if not in showdown
    if (this.phase !== 'showdown') {
      const oldPhase = this.phase;
      this.phase = this.getNextPhase();
      console.log(`${oldPhase} phase complete, advancing to ${this.phase} phase`);

      // Deal community cards based on the new phase
      this.dealCommunityCardsByPhase();
      
      // Reset bets and set active player for new phase
      if (this.resetBets()) {
				this.setActivePlayerForNewPhase();
				return;
			}
    } else {
      // Handle showdown
      // TODO: Implement showdown logic
      return;
    }
  } 
  
  /** Returns an array of the allowed actions for a given player. If no playerId parameter is provided, defaults to active player.
   * @function getAllowedActionsForPlayer
   * @param {string} [playerId] The ID of the player to check actions for. Defaults to the active player.
   * @returns {string[]} An array of allowed actions for the player. Returns an empty array if player not found.
   */
  getAllowedActionsForPlayer(playerId: string = this.activePlayerId): string[] {
    console.log(
			"[DEBUG getAllowedActionsForPlayer] Called with playerId:",
			playerId
		);
		console.log(
			"[DEBUG getAllowedActionsForPlayer] All player IDs:",
			this.players.map((p) => p.id)
		);
		console.log(
			"[DEBUG getAllowedActionsForPlayer] activePlayerId:",
			this.activePlayerId,
			"activePlayerIndex:",
			this.activePlayerIndex
		);
		const player = this.players.find((p) => p.id === playerId);
		if (!player) {
			console.log(
				"[DEBUG getAllowedActionsForPlayer] No player found for playerId:",
				playerId
			);
			return [];
		}
		console.log(
			"[DEBUG getAllowedActionsForPlayer] Found player:",
			player.username,
			player.id
		);

		const actions: string[] = [];

		// Don't allow any actions if player is folded or all-in
		if (player.folded || player.allIn) {
			return actions;
		}

		const isPreflop = this.phase === "preflop";
		const isBigBlind = player.id === this.bigBlindId;
		const noAdditionalBets = this.currentBet === this.bigBlind;

		// Player can always fold
		actions.push("fold");

		// Check is allowed if player has matched the current bet (regardless of previousAction)
		if (player.currentBet === this.currentBet) {
			actions.push("check");
		}

		// Calculate how much more the player needs to call
		const callAmount = this.currentBet - player.currentBet;

		// Call is allowed if:
		// 1. There's a bet to call AND
		// 2. Player has enough chips AND
		// 3. Player hasn't matched the current bet
		if (this.currentBet > 0 && callAmount > 0 && player.chips >= callAmount) {
			actions.push("call");
		}

		// Bet is allowed if:
		// 1. No current bet AND
		// 2. Player has enough chips for minimum bet
		const minBet = this.bigBlind;
		if (this.currentBet === 0 && player.chips >= minBet) {
			actions.push("bet");
		}

		// Raise is allowed if:
		// 1. There's a current bet AND
		// 2. Player has enough chips for minimum raise
		const minRaise = this.currentBet * 2 - player.currentBet;
		if (this.currentBet > 0 && player.chips >= minRaise) {
			actions.push("raise");
		}

		console.log(
			`Allowed actions for ${player.username}: ${actions.join(", ")}`
		);
    return actions;
  }

  /** Sets the active player index and ID - Starts from the position to the left of the dealer in its search.
   * This is used to set the active player for a new phase of the game.
   * @function setActivePlayerForNewPhase
   * @returns {void}
   */
  setActivePlayerForNewPhase() {
    let startPos = (this.dealerIndex + 1) % this.players.length;
    let foundActive;
		foundActive = false;
    
    for (let i = 0; i < this.players.length; i++) {
      const idx = (startPos + i) % this.players.length;
      if (!this.players[idx].folded && !this.players[idx].allIn) {
        this.activePlayerIndex = idx;
        this.activePlayerId = this.players[idx].id;
        foundActive = true;
        console.log(
					"[DEBUG setActivePlayerForNewPhase] Set activePlayerIndex:",
					idx,
					"activePlayerId:",
					this.activePlayerId,
					"username:",
					this.players[idx].username
				);
        break;
      }
    }
  }

  /** Sets activePlayerIndex and activePlayerId, returning true/false based on success or failure.
   * @function findNextActivePlayer
   * @returns {boolean} Returns true/false based on whether activePlayerIndex and activePlayerId were successfully set.
   */
  findNextActivePlayer(): boolean {
    if (this.activePlayerIndex === null) {
      console.log(
				"[DEBUG findNextActivePlayer] No active player index set, cannot find next player"
			);
      return false;
    }
    
    // Ensure players are properly sorted before finding the next player
    this.sortPlayerList();
    
    // Validate the active player index is within bounds
    if (this.activePlayerIndex >= this.players.length) {
      this.activePlayerIndex = 0;
    }
    
    let currentPlayerIndex = this.activePlayerIndex;
    let nextPlayerIndex = (currentPlayerIndex + 1) % this.players.length;
    const startingIndex = nextPlayerIndex;
    
    // Track if there's any betting action in this round
    const bettingRound = this.currentBet > 0;
    
    do {
      const player = this.players[nextPlayerIndex];
      
      // Skip players who are folded, all-in, or inactive
      if (!player.folded && !player.allIn && player.active) {
        // Player is eligible if they haven't matched the current bet
        if (bettingRound && player.currentBet < this.currentBet) {
          this.activePlayerIndex = nextPlayerIndex;
          this.activePlayerId = player.id;
          console.log(
						"[DEBUG findNextActivePlayer] Set activePlayerIndex:",
						nextPlayerIndex,
						"activePlayerId:",
						player.id,
						"username:",
						player.username
					);
          return true;
        }
        // Or if they haven't acted in this betting round
        else if (player.previousAction === 'none') {
          this.activePlayerIndex = nextPlayerIndex;
          this.activePlayerId = player.id;
          console.log(
						"[DEBUG findNextActivePlayer] Set activePlayerIndex:",
						nextPlayerIndex,
						"activePlayerId:",
						player.id,
						"username:",
						player.username
					);
          return true;
        }
      }
      
      nextPlayerIndex = (nextPlayerIndex + 1) % this.players.length;
    } while (nextPlayerIndex !== startingIndex);

    console.log("[DEBUG findNextActivePlayer] No eligible players found");
    return false;
  }

  /** Resets the current bet to 0 and all players' bets to 0, and previousAction to 'none'
   * @function resetBets
   * @returns {boolean} Returns true/false based on all players being successfully reset.
   */
  resetBets(): boolean {
    this.currentBet = 0;
    this.players.forEach(p => {
      p.currentBet = 0;
      p.previousAction = 'none';
    });

    // Fix validation logic - was missing proper return statement comparison
    return this.currentBet === 0 && this.players.every(p => 
      p.currentBet === 0 && p.previousAction === 'none'
    );
  }

  /** Iterates through all players and sets currentBet t0 0, previousAction to 'none', 
   * allIn & folded to false, and cards to an empty array 
   * @function resetPlayers
   * @returns {boolean} Returns true/false based on whether player properties were all successfully reset.
   */
  private resetPlayers(): boolean {
    this.players.forEach(p => {
      p.currentBet = 0;
      p.previousAction = 'none';
      p.allIn = false;
      p.folded = false;
      p.cards = [];
    });

    if (this.players.every(p => {
      p.currentBet &&
      p.previousAction === 'none' &&
      p.allIn === false &&
      p.folded === false &&
      p.cards.length === 0
    })) return true;
    else return false;
  }

  /** Advances the ID & Index for dealer, small blind, big blind, and active player roles
   * @function advanceRoleIndices
   */
  private advanceRoleIndices(): void {
    const numPlayers = this.players.length;

    this.dealerIndex        = (this.dealerIndex     + 1) % numPlayers;
    this.smallBlindIndex    = (this.dealerIndex     + 1) % numPlayers;
    this.bigBlindIndex      = (this.smallBlindIndex + 1) % numPlayers;
    this.activePlayerIndex  = (this.bigBlindIndex   + 1) % numPlayers;

    this.dealerId       = this.players[this.dealerIndex      ].id;
    this.smallBlindId   = this.players[this.smallBlindIndex  ].id;
    this.bigBlindId     = this.players[this.bigBlindIndex    ].id;
    this.activePlayerId = this.players[this.activePlayerIndex].id;
    console.log(
			"[DEBUG advanceRoleIndices] dealerIndex:",
			this.dealerIndex,
			"dealerId:",
			this.dealerId,
			"smallBlindIndex:",
			this.smallBlindIndex,
			"smallBlindId:",
			this.smallBlindId,
			"bigBlindIndex:",
			this.bigBlindIndex,
			"bigBlindId:",
			this.bigBlindId,
			"activePlayerIndex:",
			this.activePlayerIndex,
			"activePlayerId:",
			this.activePlayerId
		);
  }

  /** Handles an incoming selection message from a player for Dealer's Choice games
   * @param playerId The ID of the player making the selection
   * @param variant The game variant they've selected
   * @returns {boolean} Returns true/false, indicating if the selection was processed successfully
   */
  handleVariantSelection(playerId: string, variant: GameVariant): boolean {
    // Validate that this is a Dealer's Choice game
    if (this.gameVariant !== 'DealersChoice') {
      console.log('Cannot handle variant selection: not a Dealer\'s Choice game');
      return false;
    }
    
    // Validate that selections are currently being accepted
    if (!this.variantSelectionActive) {
      console.log('Cannot handle variant selection: selection not currently active');
      return false;
    }
    
    // Validate that the player making the selection is the dealer
    if (playerId !== this.dealerId) {
      console.log(`Player ${playerId} cannot select variant: not the dealer`);
      return false;
    }
    
    // Use our existing method to set the dealer's variant
    const result = this.setDealerVariant(variant);
    
    if (result) {
      // Continue the round now that a variant has been selected
      this.continueRoundSetup(this.dealerSelectedVariant!);
    }
    
    return result;
  }

  /** Resets all properties and objects to initial state to prepare for next round
   * @function resetRound
   * @returns {boolean} Returns true upon successful function execution.
   */
  private resetRound(): boolean {
    // Sort players first toensure consistent ordering
    this.sortPlayerList();

    // Make sure we have valid player count
    const numPlayers = this.players.length;
    if (numPlayers <= 1)
      this.status = 'waiting';

    // Reset game state
    this.pot = 0;
    this.currentBet = 0;
    this.sidepots = [];
    this.ineligiblePlayers = [];
    this.deck = null;
    this.burnPile = []; // Initialize as an empty array instead of null
    this.communityCards = []; // Initialize as an empty array instead of null
    this.phase = 'waiting';
    this.roundCount++;
    
    // Reset dealer's choice variant for next round
    if (this.gameVariant === 'DealersChoice') {
      this.dealerSelectedVariant = null;
      this.variantSelectionActive = false;
      if (this.variantSelectionTimeout) {
        clearTimeout(this.variantSelectionTimeout);
        this.variantSelectionTimeout = null;
      }
    }

    // Reset player state but don't change ready status here
    this.resetPlayers();

    // Advance dealer position if we have enough players
    if (numPlayers >= 2) this.advanceRoleIndices();

    // Verify player IDs in tablePositions match players array
    for (let i = 0; i < this.tablePositions.length; i++) {
      // If seat is marked as occupied
      if (this.tablePositions[i].occupied) {
        // Check if player still exists in players array
        const playerExists = this.players.some(p => p.id === this.tablePositions[i].playerId);
        if (!playerExists) {
          // Player no longer exists, update tablePositions
          this.tablePositions[i].occupied = false;
          this.tablePositions[i].playerId = null;
        }
      }
    }

    return true;
  }


  /** Evaluates the hands of the players against the community cards.
   * @param players - The array of players to evaluate.
   * @param communityCards - The community cards to use for evaluation.
   * @returns An array of winners with their respective hands.
   */
  evaluateHands(players: Player[], communityCards: Card[]): Winner[] { return evaluateHands(players, communityCards); }

  
  /** Creates a sidepot when a player goes all-in.
   * @param allInPlayer - The player who went all-in.
   * @param allInAmount - The amount the player went all-in for.
   */
  createSidepot(allInPlayer: Player, allInAmount: number): void {
    // Filter out players who have folded
    const activePlayers = this.players.filter(p => !p.folded);
    
    // Calculate contributions to this sidepot
    let sidepotAmount = 0;
    
    // Add the all-in player's entire bet to the sidepot
    sidepotAmount += allInAmount;
    
    // Add matching amounts from other players to the sidepot
    activePlayers.forEach(player => {
      if (player !== allInPlayer) {
        // How much of this player's bet goes to the sidepot (capped at all-in amount)
        const contributionToSidepot = Math.min(player.currentBet, allInAmount);
        sidepotAmount += contributionToSidepot;
      }
    });
    
    // Mark this player as ineligible for future pots
    this.ineligiblePlayers.push(allInPlayer);
    
    // Create a new sidepot with all active players who contributed
    const eligiblePlayers = activePlayers.filter(p => !this.ineligiblePlayers.includes(p) || p === allInPlayer);
    const newSidepot = new Sidepot(sidepotAmount, eligiblePlayers);
    
    console.log(`Created sidepot of ${sidepotAmount} for all-in player ${allInPlayer.username}`);
    console.log(`Eligible players: ${eligiblePlayers.map(p => p.username).join(', ')}`);
    
    // Add the sidepot to the list
    this.sidepots.push(newSidepot);
    
    // Recalculate the main pot (reduce by the sidepot amount)
    this.pot -= sidepotAmount;
    
    // If main pot is negative, something went wrong
    if (this.pot < 0) {
      console.error('Error: Main pot became negative after creating sidepot');
      this.pot = 0;
    }
  }
  
  /** Distributes pot(s) to winner(s) at showdown.
   * Handles both main pot and sidepots.
   * @returns An array of winner information containing player IDs and amounts won
   */
  distributePots(): { playerId: string, playerName: string, amount: number, potType: string }[] {
    const winnerInfo: { playerId: string, playerName: string, amount: number, potType: string }[] = [];
    
    // First deal with any sidepots (from earliest to latest)
    for (let i = 0; i < this.sidepots.length; i++) {
      const sidepot = this.sidepots[i];
      const potIndex = i + 1; // Numbering sidepots from 1
      const eligiblePlayers = sidepot.getEligiblePlayers().filter(p => !p.folded);
      
      if (eligiblePlayers.length === 0) {
        console.error('No eligible players for sidepot');
        continue;
      }
      
      if (eligiblePlayers.length === 1) {
        // Only one eligible player, award pot directly
        const winner = eligiblePlayers[0];
        winner.chips += sidepot.getAmount();
        winner.previousAction = 'win';
        console.log(`Player ${winner.username} awarded ${sidepot.getAmount()} from sidepot ${potIndex} (uncontested)`);

        // Record winner info
        winnerInfo.push({
          playerId: winner.id,
          playerName: winner.username,
          amount: sidepot.getAmount(),
          potType: `Sidepot ${potIndex}`
        });
      } else {
        // Multiple eligible players, evaluate hands
        if (Array.isArray(this.communityCards) && this.communityCards.length > 0) {
          const winners = this.evaluateHands(eligiblePlayers, this.communityCards);
          
          // Split pot among winners
          const potPerWinner = Math.floor(sidepot.getAmount() / winners.length);
          const remainder = sidepot.getAmount() % winners.length;
          
          winners.forEach(winner => {
            winner.chips += potPerWinner;
            winner.previousAction = 'win';
            console.log(`Player ${winner.username} awarded ${potPerWinner} from sidepot ${potIndex}`);
            
            // Record winner info
            winnerInfo.push({
              playerId: winner.id,
              playerName: winner.username,
              amount: potPerWinner,
              potType: `Sidepot ${potIndex}`
            });
          });
          
          // Give remainder to first position after dealer
          if (remainder > 0) {
            let currentPos = (this.dealerIndex + 1) % this.players.length;
            while (!winners.includes(this.players[currentPos])) {
              currentPos = (currentPos + 1) % this.players.length;
            }
            this.players[currentPos].chips += remainder;
            console.log(`Player ${this.players[currentPos].username} awarded ${remainder} remainder from sidepot ${potIndex}`);
            
            // Add the remainder to the winner's total in winnerInfo
            const winnerIndex = winnerInfo.findIndex(w => 
              w.playerId === this.players[currentPos].id && 
              w.potType === `Sidepot ${potIndex}`
            );
            
            if (winnerIndex >= 0) {
              winnerInfo[winnerIndex].amount += remainder;
            }
          }
        } else {
          console.error('Community cards are not available for hand evaluation');
        }
      }
    }
    
    // Handle the main pot (if any)
    if (this.pot > 0) {
      // Filter eligible players (not folded and not in the ineligible list)
      const eligiblePlayers = this.players.filter(p => 
        !p.folded && !this.ineligiblePlayers.includes(p)
      );
      
      if (eligiblePlayers.length === 0) {
        console.error('No eligible players for main pot');
        return winnerInfo;
      }
      
      if (eligiblePlayers.length === 1) {
        // Only one eligible player, award pot directly
        const winner = eligiblePlayers[0];
        winner.chips += this.pot;
        winner.previousAction = 'win';
        console.log(`Player ${winner.username} awarded ${this.pot} from main pot (uncontested)`);
        
        // Record winner info
        winnerInfo.push({
          playerId: winner.id,
          playerName: winner.username,
          amount: this.pot,
          potType: 'Main pot'
        });
      } else {
        // Multiple eligible players, evaluate hands
        if (Array.isArray(this.communityCards) && this.communityCards.length > 0) {
          const winners = this.evaluateHands(eligiblePlayers, this.communityCards);
          
          // Split pot among winners
          const potPerWinner = Math.floor(this.pot / winners.length);
          const remainder = this.pot % winners.length;
          
          winners.forEach(winner => {
            winner.chips += potPerWinner;
            winner.previousAction = 'win';
            console.log(`Player ${winner.username} awarded ${potPerWinner} from main pot`);
            
            // Record winner info
            winnerInfo.push({
              playerId: winner.id,
              playerName: winner.username,
              amount: potPerWinner,
              potType: 'Main pot'
            });
          });
          
          // Give remainder to first position after dealer
          if (remainder > 0) {
            let currentPos = (this.dealerIndex + 1) % this.players.length;
            while (!winners.includes(this.players[currentPos])) {
              currentPos = (currentPos + 1) % this.players.length;
            }
            this.players[currentPos].chips += remainder;
            console.log(`Player ${this.players[currentPos].username} awarded ${remainder} remainder from main pot`);
            
            // Add the remainder to the winner's total in winnerInfo
            const winnerIndex = winnerInfo.findIndex(w => 
              w.playerId === this.players[currentPos].id && 
              w.potType === 'Main pot'
            );
            
            if (winnerIndex >= 0) {
              winnerInfo[winnerIndex].amount += remainder;
            }
          }
        } else {
          console.error('Community cards are not available for hand evaluation');
        }
      }
    }

    console.log(`Main pot: ${this.pot}`);
    console.log(`Sidepots: ${this.sidepots.map(sp => sp.getAmount()).join(', ')}`);
    winnerInfo.forEach(w => {
      console.log(`Player ${w.playerName} won ${w.amount} from ${w.potType}`);
    })
    
    // Reset pots
    this.pot = 0;
    this.sidepots = [];
    
    return winnerInfo;
  }
}