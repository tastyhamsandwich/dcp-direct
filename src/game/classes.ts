
import { Truculenta } from 'next/font/google';
import { Stringable, Suit, Rank, RankValue, CardName, GamePhase, TableSeat, RoleIds, User, Hand, Action} from './types';
import { capitalize, valueToRank } from '@lib/utils';
import { evaluateHand, evaluateHands } from '@game/utils';
import { Socket } from 'socket.io';

type HandRank = {
  hand: string,
  value: number
}

/**
 * Represents a player in the game.
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
  o


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
  

/** 
 * Represents a sidepot.
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
  sidepots: Sidepot[];
  ineligiblePlayers: Player[];
  deck: Deck | null;
  communityCards: Card[] | null;
  burnPile: Card[] | null;
  activePlayerId: string;
  activePlayerIndex: number | null;
  currentBet: number;
  socket: Socket;
  roundCount: number;

  constructor(id, name, creator, socket, maxPlayers?, smallBlind?, bigBlind?) {
    this.id = id;
    this.name = name;
    this.creator = creator;
    this.maxPlayers = maxPlayers || 6;
    this.smallBlind = smallBlind || 5;
    this.bigBlind = bigBlind || 10;
    this.players = [creator];
    this.status = 'waiting';
    this.phase = GamePhase.Waiting;
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
    this.socket = socket;
    this.roundCount = 0;
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
      console.log(`Starting round!\n...Initializing values`);
      // Reset game flags & arrays, reset game objects
      this.communityCards = [];
      this.burnPile = [];
      this.pot = 0;
      this.sidepots = [];
      this.ineligiblePlayers = [];
      this.deck = new Deck(true);
      this.phase = GamePhase.Preflop;
      this.status = 'playing';
      this.roundCount++;

      if (this.roundCount > 1) this.dealerIndex = (this.dealerIndex + 1) % this.players.length;

      // Dealer Index is advanced at end of a round, to avoid it being advanced
      // on the first round of a game
      this.smallBlindIndex = (this.dealerIndex + 1) % this.players.length;
      this.bigBlindIndex = (this.smallBlindIndex + 1) % this.players.length;

      // Set Id values for tracked roles, to simplify data access for other methods.
      this.dealerId = this.players[this.dealerIndex].id;
      this.smallBlindId = this.players[this.smallBlindIndex].id;
      this.bigBlindId = this.players[this.bigBlindIndex].id;

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
      this.dealCards();

      console.log(`...Taking blinds`)
      const smallBlindPlayer = this.players[this.smallBlindIndex];
      const bigBlindPlayer = this.players[this.bigBlindIndex];
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
      this.activePlayerIndex = (this.bigBlindIndex + 1) % this.players.length;
      this.activePlayerId = this.players[this.activePlayerIndex].id;
      console.log(`...Active player set to: ${this.players[this.activePlayerIndex].username}`)

      if (this.socket) {
        this.socket.to(this.id).emit('game_update', { game: this.returnGameState() });
      }
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
              console.log(`Dealt ${card.name} to player '${this.players[currentPosition].username}'`);
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

  dealCommunityCards(flop: boolean = false): boolean {

    if (this.deck === null || this.burnPile === null || this.communityCards === null) return false;

    const burnCard = this.deck.draw();
    this.burnPile.push(burnCard);
    console.log(`Burned card: ${burnCard.name}`);

    if (flop) {
      for (let i = 0; i < 3; i++) {
        const card = this.deck.draw();
        this.communityCards.push(card);
        console.log(`Dealt flop card #${i+1}: ${card.name}`);
      }
    } else {
      const card = this.deck.draw();
      this.communityCards.push(card);
      console.log(`Dealt turn/river card: ${card.name}`);
    }

    return true;
  }

  returnGameState() {
    // Create a safe version without circular references
    const gameState = {
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
      // Don't send deck to client
      communityCards: this.communityCards ? this.communityCards.map(card => ({
        suit: card.suit,
        rank: card.rank,
        rankValue: card.rankValue,
        name: card.name,
        faceUp: card.faceUp
      })) : [],
      // Don't send burn pile to client
      activePlayerId: this.activePlayerId,
      activePlayerIndex: this.activePlayerIndex,
      smallBlindIndex: this.smallBlindIndex,
      bigBlindIndex: this.bigBlindIndex,
      smallBlindId: this.smallBlindId,
      bigBlindId: this.bigBlindId,
      currentBet: this.currentBet,
      dealerIndex: this.dealerIndex,
      dealerId: this.dealerId,
      currentPlayerId: this.socket?.id || null
    }

    return gameState;
  }

  /**
   * Returns, and potentialy sets the activePlayerIndex, the value of the next player's index.
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

  private getPhaseName(addNum = 0) {
    const finalPhase = this.phase + addNum;
    switch (finalPhase) {
      case GamePhase.Preflop:
        return 'Pre-Flop';
      case GamePhase.Flop:
        return 'Flop';
      case GamePhase.Turn:
        return 'Turn';
      case GamePhase.River:
        return 'River';
      case GamePhase.Showdown:
        return 'Showdown';
    }
  }

  checkPhaseStatus() {
    this.sortPlayerList();

    console.log(`Checking phase status in phase ${this.phase}`);
    console.log(`Active player: ${this.players[this.activePlayerIndex || 0].username}`);
    console.log(`Current bet: ${this.currentBet}, Pot: ${this.pot}`);

    // Check if only one active player remains (everyone else folded)
    const activePlayers = this.players.filter(p => !p.folded);
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
      
      // Socket will handle emitting the win announcement outside this method
      this.pot = 0;
      this.sidepots = [];

      // Handle round reset
      if (this.resetRound()) {
        this.dealCards();
        return true;
      }
    }

    // Track if all players have had a chance to act in this betting round
    const allPlayersActed = this.players.every(p => 
      p.folded || 
      p.allIn || 
      p.previousAction !== 'none'
    );

    // Special handling for the first round of betting
    if (this.phase === GamePhase.Preflop && !allPlayersActed) {
      // If not all players have acted, find the next player
      return this.findNextActivePlayer();
    }

    // Enhanced tracking to determine if the betting round is complete
    const bettingRoundComplete = this.players.every(p =>
      p.folded || 
      p.allIn || 
      (p.previousAction !== 'none' && p.currentBet === this.currentBet)
    );

    console.log(`All players acted: ${allPlayersActed}, Betting round complete: ${bettingRoundComplete}`);

    // Find next active player if the betting round isn't complete
    let foundNextPlayer = !bettingRoundComplete ? this.findNextActivePlayer() : false;

    console.log(`Found next player: ${foundNextPlayer}, Betting round complete: ${bettingRoundComplete}`);
    
    // Advance to next phase when:
    // 1. We can't find next eligible player, OR
    // 2. Betting round is complete (everyone has acted and matched or folded)
    if (!foundNextPlayer || bettingRoundComplete) {
      console.log(`Advancing to next phase (${this.getPhaseName(1)}) from ${this.getPhaseName()}`);
      
      this.phase++;
      /*switch (this.phase) {
        case GamePhase.Preflop:
          this.phase = GamePhase.Flop;
          this.dealCommunityCards(true); // Deal flop (3 cards)
          break;
        case GamePhase.Flop:
          this.phase = GamePhase.Turn;
          this.dealCommunityCards(); // Deal turn (1 card)
          break;
        case GamePhase.Turn:
          this.phase = GamePhase.River;
          this.dealCommunityCards(); // Deal river (1 card)
          break;
        case GamePhase.River:
          this.phase = GamePhase.Showdown;
          // Showdown logic will be handled elsewhere
          break;
      }*/

      // Reset player bets for the new phase
      this.resetBets();

      // Only proceed to set active player if we're not in showdown
      if (this.phase !== GamePhase.Showdown) {
        // Set active player to first non-folded player after dealer
        let startPos = (this.dealerIndex + 1) % this.players.length;
        let foundActive = false;

        for (let i = 0; i < this.players.length; i++) {
          const idx = (startPos + i) % this.players.length;
          if (!this.players[idx].folded && !this.players[idx].allIn) {
            this.activePlayerIndex = idx;
            this.activePlayerId = this.players[idx].id;
            foundActive = true;
            console.log(`Set active player to ${this.players[idx].username} for new phase`);
            break;
          }
        }

        // If no eligible player found (everyone all-in), go to showdown
        if (!foundActive) {
          console.log(`No active players found, going to showdown`);
          this.phase = GamePhase.Showdown;
        }
      }
    }
  }
  
  private findNextActivePlayer(): boolean {
    if (this.activePlayerIndex === null) return false;
    
    // Ensure players are properly sorted before finding the next player
    this.sortPlayerList();
    
    // Validate the active player index is within bounds
    if (this.activePlayerIndex >= this.players.length) {
      this.activePlayerIndex = 0;
    }
    
    let foundNextPlayer = false;
    let currentPlayerIndex = this.activePlayerIndex;
    let nextPlayerIndex = (currentPlayerIndex + 1) % this.players.length;

    // Modified eligibility criteria to properly handle check actions
    // We need to consider whether any bets have been made in this betting round
    const bettingRound = this.currentBet > 0;
    
    // Check if we have any eligible players first
    const eligiblePlayers = this.players.filter(p => {
      // Basic player status checks
      if (p.folded || p.allIn || !p.active) return false;
      
      // If player hasn't acted at all this round, they're eligible
      if (p.previousAction === 'none') return true;
      
      // If there are bets and player hasn't matched, they're eligible
      if (p.currentBet < this.currentBet) return true;
      
      // Otherwise, player has already fully acted in this round
      return false;
    });
    
    if (eligiblePlayers.length === 0) {
      console.log('No eligible players found who can act');
      return false;
    }

    // Loop through players until we find an eligible one
    const startingIndex = nextPlayerIndex;
    do {
      if (nextPlayerIndex >= this.players.length) {
        console.log(`Invalid player index: ${nextPlayerIndex}, resetting to 0`);
        nextPlayerIndex = 0;
      }
      
      const player = this.players[nextPlayerIndex];
      console.log(`Checking player ${player.username} folded=${player.folded}, allIn=${player.allIn}, active=${player.active}, currentBet=${player.currentBet}, gameBet=${this.currentBet}, previousAction=${player.previousAction}`);

      // Skip players who are folded, all-in, or inactive
      if (!player.folded && !player.allIn && player.active) {
        // Modified eligibility check to handle checked players correctly
        if (player.previousAction === 'none' || (bettingRound && player.currentBet < this.currentBet)) {
          this.activePlayerIndex = nextPlayerIndex;
          this.activePlayerId = player.id;
          foundNextPlayer = true;
          console.log(`Found next active player: ${player.username}`);
          break;
        }
      }

      // Move to next player
      nextPlayerIndex = (nextPlayerIndex + 1) % this.players.length;
    } while (nextPlayerIndex !== startingIndex);
    
    return foundNextPlayer;
  }

  private resetBets(): boolean {

    this.currentBet = 0;
    this.players.forEach(p => {
      p.currentBet = 0;
      p.previousAction = 'none';
    });

    if (this.currentBet === 0 && this.players.every(p => {
      p.currentBet === 0 ||
      p.previousAction === 'none'
    })) return true;
    else return false;
  }

  private resetRound(): boolean {
    // Sort players first to ensure consistent ordering
    this.sortPlayerList();

    // Make sure we have valid player count
    const numPlayers = this.players.length;
    if (numPlayers === 0) {
      this.phase = GamePhase.Waiting;
      this.status = 'waiting';
      return true;
    }

    // Reset game state
    this.pot = 0;
    this.currentBet = 0;
    this.sidepots = [];
    this.ineligiblePlayers = [];
    this.deck = null;
    this.burnPile = null;
    this.communityCards = null;
    this.phase = GamePhase.Waiting;
    this.roundCount++;

    // Reset player state but don't change ready status here
    this.players.forEach(p => {
      p.currentBet = 0;
      p.previousAction = 'none';
      p.allIn = false;
      p.folded = false;
      p.cards = [];
    });

    // Make sure dealer index is valid after potential player changes
    if (this.dealerIndex >= numPlayers) {
      this.dealerIndex = 0;
    }

    // Advance dealer position if we have enough players
    if (numPlayers >= 2) {
      this.dealerIndex = (this.dealerIndex + 1) % numPlayers;
      this.smallBlindIndex = (this.dealerIndex + 1) % numPlayers;
      this.bigBlindIndex = (this.smallBlindIndex + 1) % numPlayers;
      this.activePlayerIndex = (this.bigBlindIndex + 1) % numPlayers;

      this.dealerId = this.players[this.dealerIndex].id;
      this.smallBlindId = this.players[this.smallBlindIndex].id;
      this.bigBlindId = this.players[this.bigBlindIndex].id;
      this.activePlayerId = this.players[this.activePlayerIndex].id;
    }

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

  evaluateHands(players: Player[], communityCards: Card[]) {
    return evaluateHands(players, communityCards);
  }
  
  /**
   * Creates a sidepot when a player goes all-in.
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
  
  /**
   * Distributes pot(s) to winner(s) at showdown.
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
        const winners = this.evaluateHands(eligiblePlayers, this.communityCards as Card[]);
        
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
        const winners = this.evaluateHands(eligiblePlayers, this.communityCards as Card[]);
        
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
      }
    }
    
    // Reset pots
    this.pot = 0;
    this.sidepots = [];
    
    return winnerInfo;
  }
}