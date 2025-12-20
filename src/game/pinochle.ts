import { Player, Deck, Card } from './classes';
import { Server } from 'socket.io';
import {
  CalculateMeldScore,
  CountMeld,
  DetermineMeldCards,
  DeterminePlayableCards,
} from './pinochleRules';


export class PinochlePlayer implements User {
  id: string;
  username: string;
  chips: number;
  active: boolean;
  bidTaker: boolean;
  cards: PinochleCard[];
}

export class PinochleCard implements Stringable {
  suit: Suit;
  rank: PinochleRank;
  rankValue: PinochleRankValue;
  idNum: number;
  name: PinochleCardName;
  faceUp: boolean;

  /**
   * Creates a new Card instance.
   * @param rank - The first argument, can be a Rank or RankValue type
   * @param suit - The second argument, must be Suit type
   * @param faceUp - The third argument, defaults to 'false' if omitted, determines if card is shown or not.
   * @throws {Error} If the arguments are invalid.
   */
  constructor(rank: PinochleRank, suit: Suit, idNum: number, faceUp = false) {
    this.suit = suit;
    this.idNum = idNum;
    this.rank = rank;
    this.rankValue = this.getValue();
    this.name = this.getNameFromRankAndSuit(rank as PinochleRank, suit, idNum!);
    this.faceUp = faceUp;
  }

  getRankAndSuitFromName(name: PinochleCardName): [PinochleRank, Suit] {
    const rankChar = name.charAt(0);
    const suitChar = name.charAt(1);
    let rank: PinochleRank;
    let suit: Suit;

    switch (rankChar) {
      case "A":
        rank = "ace";
        break;
      case "T":
        rank = "ten";
        break;
      case "J":
        rank = "jack";
        break;
      case "Q":
        rank = "queen";
        break;
      case "K":
        rank = "king";
        break;
      default:
        throw new Error(`Invalid rank name: ${rankChar}`);
    }

    switch (suitChar) {
      case "H":
        suit = "hearts";
        break;
      case "D":
        suit = "diamonds";
        break;
      case "C":
        suit = "clubs";
        break;
      case "S":
        suit = "spades";
        break;
      default:
        throw new Error(`Invalid suit name: ${suitChar}`);
    }

    return [rank as PinochleRank, suit as Suit];
  }
  /**
   * Gets the CardName from the rank and suit.
   * @param rank - The rank of the card.
   * @param suit - The suit of the card.
   * @returns The CardName.
   */
  private getNameFromRankAndSuit(
    rank: PinochleRank,
    suit: Suit,
    id: number
  ): PinochleCardName {
    const rankInitial = this.rankToInitial(rank);
    const suitInitial = this.suitToInitial(suit);
    return `${rankInitial}${suitInitial}${id}` as PinochleCardName;
  }

  /**
   * Converts a rank to its initial.
   * @param rank - The rank to convert.
   * @returns The initial of the rank.
   */
  private rankToInitial(rank: PinochleRank): string {
    const rankMap: { [key in PinochleRank]: string } = {
      ace: "A",
      ten: "T",
      jack: "J",
      queen: "Q",
      king: "K",
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
      case "hearts":
        return "H";
      case "diamonds":
        return "D";
      case "clubs":
        return "C";
      case "spades":
        return "S";
      default:
        throw new Error(`Invalid suit: ${suit}`);
    }
  }

  /**
   * Gets the suit from its name.
   * @param name - The name of the suit.
   * @returns The suit.
   */
  suitFromName(name: string): Suit {
    switch (name) {
      case "H":
        return "hearts";
      case "D":
        return "diamonds";
      case "C":
        return "clubs";
      case "S":
        return "spades";
      default:
        throw new Error(`Invalid suit name: ${name}`);
    }
  }

  /**
   * Gets the rank from its name.
   * @param name - The name of the rank.
   * @returns The rank.
   */
  rankFromName(name: string): PinochleRank {
    switch (name) {
      case "A":
        return "ace";
      case "T":
        return "ten";
      case "J":
        return "jack";
      case "Q":
        return "queen";
      case "K":
        return "king";
      default:
        throw new Error(`Invalid rank name: ${name}`);
    }
  }

  /**
   * Gets the value of the card.
   * @returns The value of the card.
   */
  getValue(): PinochleRankValue {
    return this.rankToValue(this.rank);
  }

  /**
   * Converts a rank to its value.
   * @param rank - The rank to convert.
   * @returns The value of the rank.
   */
  rankToValue(rank: PinochleRank): PinochleRankValue {
    switch (rank) {
      case "jack":
        return 1;
      case "queen":
        return 2;
      case "king":
        return 3;
      case "ten":
        return 4;
      case "ace":
        return 5;
      default:
        throw new Error(`Invalid rank value: ${rank}`);
    }
  }

  suitValue(): number {
    switch (this.suit) {
      case "hearts":
        return 1;
      case "diamonds":
        return 2;
      case "clubs":
        return 3;
      case "spades":
        return 4;
      default:
        throw new Error(`Invalid suit value: ${this.suit}`);
    }
  }

  /**
   * Converts a value to its rank.
   * @param value - The value to convert.
   * @returns The rank corresponding to the value.
   */
  rankFromValue(value: PinochleRankValue): PinochleRank {
    switch (value) {
      case 1:
        return "jack";
      case 2:
        return "queen";
      case 3:
        return "king";
      case 4:
        return "ten";
      case 5:
        return "ace";
      default:
        throw new Error(`Invalid rank value: ${value}`);
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
      case 0:
        return "hearts";
      case 1:
        return "diamonds";
      case 2:
        return "clubs";
      case 3:
        return "spades";
      default:
        throw new Error(`Invalid random suit value: ${rand}`);
    }
  }

  private getRandomRank() {
    const rand = Math.floor(Math.random() * 13);

    switch (rand) {
      case 1:
        return "jack";
      case 2:
        return "queen";
      case 3:
        return "king";
      case 4:
        return "ten";
      case 5:
        return "ace";
      default:
        throw new Error(`Invalid random rank alue: ${rand}`);
    }
  }
}

/**  Represents a deck of Pinohcle cards.
 * @class
 * @param autoShuffle - Whether to shuffle the deck automatically.
 */
export class PinochleDeck {
  cards: PinochleCard[];

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
      next: function () {
        return {
          value: cards[index++],
          done: index > cards.length,
        };
      },
    };
  }

  private generateDeck(): PinochleCard[] {
    const suits: Suit[] = ["hearts", "diamonds", "clubs", "spades"];
    const ranks: PinochleRank[] = ["ace", "ten", "king", "queen", "jack"];
    const idNum: number[] = [1, 2, 3, 4];

    let cardArray: PinochleCard[] = [];

    // Generate deck contents in order, so that the deck is always the same
    for (const suit of suits) {
      // for every suit
      for (const rank of ranks) {
        // and for every rank
        for (const id of idNum) {
          // four times each
          const card = new PinochleCard(rank, suit, id); // create that card
          cardArray.push(card); // and add it to the array
        }
      }
    }
    return cardArray; // and return it
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

  draw(): PinochleCard {
    if (this.cards.length < 1) throw new Error("Not enough cards to draw.");
    else return this.cards.pop()!;
  }
}

export class Pinochle {
  id: string;
  name: string;
  creator: PinochlePlayer;
  wagerPerRound: number;
  hasStarted: boolean;
  players: PinochlePlayer[];
  roomStatus: PinochleRoomStatus;
  seatAssignments: PinochleTableSeats;
  teamOnePlayers: PinochlePlayer[];
  teamTwoPlayers: PinochlePlayer[];
  trumpSuit: Suit;
  teamOneMeld: number;
  teamTwoMeld: number;
  teamOneScore: number;
  teamTwoScore: number;
  bidAmount: number;
  bidTaker: PinochlePlayer;
  biddingTeam: PinochleTeam;
  phase: PinochleGamePhase;
  socket: Server;
  roundActive: boolean;
  dealerIndex: number;
  dealerId?: string;
  pot: number;
  deck: PinochleDeck;
  activePlayerId: string;
  activePlayerIndex: number | null;
  roundCount: number;
  //stats: CompositeStatsObject;

  constructor(
    id: string,
    name: string,
    creator: PinochlePlayer,
    wagerPerRound: number
  ) {
    this.id = id;
    this.name = name;
    this.creator = creator;
    this.wagerPerRound = wagerPerRound;
    this.phase = "waiting";
    this.roomStatus = "waitingForPlayers";
    this.players = [creator];
    this.teamOnePlayers = [creator];
    this.teamTwoPlayers = [];
    this.hasStarted = false;
    this.roundCount = 0;
    this.deck = new PinochleDeck();
    this.seatAssignments = {
      seatOne: creator,
      seatTwo: null,
      seatThree: null,
      seatFour: null,
    };
  }

  private dealCards(): void {
    if (this.deck.cards.length !== 80) this.deck = new PinochleDeck();

    this.deck.shuffle();

    for (let r = 0; r < 4; r++) {
      for (let p = 0; p < this.players.length; p++) {
        let currentPosition = (this.dealerIndex + 1) % this.players.length;
        const playerIndex = (currentPosition + p) % this.players.length;
        const player = this.players[playerIndex];
        let dealFiveArray: PinochleCard[] = [];
        for (let i = 0; i < 5; i++) {
          // Pinochle hands are dealt in groups of 5, four passes around, for 20 cards each
          const card = this.deck.draw();
          card.faceUp = false; // Ensure default is face down
          dealFiveArray.push(card);
        }
        dealFiveArray.forEach((card) => player.cards.push(card));
      }
    }

    for (const player of this.players) {
      player.cards = this.sortHand(player.cards);
    }
    //console.log(`Dealt ${card.faceUp ? 'face up ' : ''}${card.name} to player '${player.username}'`);
  }

  private sortHand(hand: PinochleCard[]): PinochleCard[] {
    const spadeCards = hand.filter((card) => card.suit === "spades");
    const clubCards = hand.filter((card) => card.suit === "clubs");
    const heartCards = hand.filter((card) => card.suit === "hearts");
    const diamondCards = hand.filter((card) => card.suit === "diamonds");

    spadeCards.sort((a, b) => b.rankValue - a.rankValue);
    clubCards.sort((a, b) => b.rankValue - a.rankValue);
    heartCards.sort((a, b) => b.rankValue - a.rankValue);
    diamondCards.sort((a, b) => b.rankValue - a.rankValue);

    if (spadeCards.length === 0) {
      const twoSuits = heartCards.concat(clubCards);
      const threeSuits = twoSuits.concat(diamondCards);
      return threeSuits;
    } else if (clubCards.length === 0) {
      const twoSuits = heartCards.concat(spadeCards);
      const threeSuits = twoSuits.concat(diamondCards);
      return threeSuits;
    } else if (heartCards.length === 0) {
      const twoSuits = spadeCards.concat(diamondCards);
      const threeSuits = twoSuits.concat(clubCards);
      return threeSuits;
    } else if (diamondCards.length === 0) {
      const twoSuits = spadeCards.concat(heartCards);
      const threeSuits = twoSuits.concat(clubCards);
      return threeSuits;
    }

    const twoSuits = spadeCards.concat(heartCards);
    const threeSuits = twoSuits.concat(clubCards);
    const allSuits = threeSuits.concat(diamondCards);
    return allSuits;
  }

  private countMeld(hand: PinochleCard[], trumpSuit: Suit): MeldCount {
    return CountMeld(hand, trumpSuit);
  }

  private meldScore(meldObject: MeldCount): number {
    return CalculateMeldScore(meldObject);
  }

  // Returns the unique set of cards that contribute to any meld scored in the hand.
  private determineMeldCards(
    hand: PinochleCard[],
    trumpSuit: Suit
  ): PinochleCard[] {
    return DetermineMeldCards(hand, trumpSuit);
  }

  private determinePlayableCards(
    playerHand: PinochleCard[],
    leadingCards: PinochleCard[]
  ): PinochleCard[] {
    return DeterminePlayableCards(playerHand, leadingCards, this.trumpSuit);
  }

  private handleBidding() {
    this.bidAmount = 50;
    let bidderIndex = 0;
    const firstBidder =
      this.players[this.dealerIndex + (1 % this.players.length)];
    const secondBidder =
      this.players[this.dealerIndex + (2 % this.players.length)];
    const thirdBidder =
      this.players[this.dealerIndex + (3 % this.players.length)];
    const fourthBidder =
      this.players[this.dealerIndex + (4 % this.players.length)];
    const biddingPlayers: PinochlePlayer[] = [
      firstBidder,
      secondBidder,
      thirdBidder,
      fourthBidder,
    ];

    for (const player of biddingPlayers) player.active = false;
    biddingPlayers[bidderIndex].active = true;
  }
}

  

