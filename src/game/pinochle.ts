import { Player, Deck, Card } from './classes';
import { Server } from 'socket.io'; 


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
    let totalMeld = 0;

    const acesAround = (hand: PinochleCard[]): number => {
      const spadesCards = hand.filter((card) => card.suit === "spades");
      const clubsCards = hand.filter((card) => card.suit === "clubs");
      const heartsCards = hand.filter((card) => card.suit === "hearts");
      const diamondsCards = hand.filter((card) => card.suit === "diamonds");

      const numAceSpades = spadesCards.filter(
        (card) => card.rank === "ace"
      ).length;
      const numAceClubs = clubsCards.filter(
        (card) => card.rank === "ace"
      ).length;
      const numAceHearts = heartsCards.filter(
        (card) => card.rank === "ace"
      ).length;
      const numAceDiamonds = diamondsCards.filter(
        (card) => card.rank === "ace"
      ).length;

      if (
        numAceSpades >= 4 &&
        numAceClubs >= 4 &&
        numAceHearts >= 4 &&
        numAceDiamonds >= 4
      )
        return 4;
      if (
        numAceSpades >= 3 &&
        numAceClubs >= 3 &&
        numAceHearts >= 3 &&
        numAceDiamonds >= 3
      )
        return 3;
      if (
        numAceSpades >= 2 &&
        numAceClubs >= 2 &&
        numAceHearts >= 2 &&
        numAceDiamonds >= 2
      )
        return 2;
      if (
        numAceSpades >= 1 &&
        numAceClubs >= 1 &&
        numAceHearts >= 1 &&
        numAceDiamonds >= 1
      )
        return 1;
      return 0;
    };

    const kingsAround = (hand: PinochleCard[]): number => {
      const spadesCards = hand.filter((card) => card.suit === "spades");
      const clubsCards = hand.filter((card) => card.suit === "clubs");
      const heartsCards = hand.filter((card) => card.suit === "hearts");
      const diamondsCards = hand.filter((card) => card.suit === "diamonds");

      const numKingSpades = spadesCards.filter(
        (card) => card.rank === "king"
      ).length;
      const numKingClubs = clubsCards.filter(
        (card) => card.rank === "king"
      ).length;
      const numKingHearts = heartsCards.filter(
        (card) => card.rank === "king"
      ).length;
      const numKingDiamonds = diamondsCards.filter(
        (card) => card.rank === "king"
      ).length;

      if (
        numKingSpades >= 4 &&
        numKingClubs >= 4 &&
        numKingHearts >= 4 &&
        numKingDiamonds >= 4
      )
        return 4;
      if (
        numKingSpades >= 3 &&
        numKingClubs >= 3 &&
        numKingHearts >= 3 &&
        numKingDiamonds >= 3
      )
        return 3;
      if (
        numKingSpades >= 2 &&
        numKingClubs >= 2 &&
        numKingHearts >= 2 &&
        numKingDiamonds >= 2
      )
        return 2;
      if (
        numKingSpades >= 1 &&
        numKingClubs >= 1 &&
        numKingHearts >= 1 &&
        numKingDiamonds >= 1
      )
        return 1;
      return 0;
    };

    const queensAround = (hand: PinochleCard[]): number => {
      const spadesCards = hand.filter((card) => card.suit === "spades");
      const clubsCards = hand.filter((card) => card.suit === "clubs");
      const heartsCards = hand.filter((card) => card.suit === "hearts");
      const diamondsCards = hand.filter((card) => card.suit === "diamonds");

      const numQueenSpades = spadesCards.filter(
        (card) => card.rank === "queen"
      ).length;
      const numQueenClubs = clubsCards.filter(
        (card) => card.rank === "queen"
      ).length;
      const numQueenHearts = heartsCards.filter(
        (card) => card.rank === "queen"
      ).length;
      const numQueenDiamonds = diamondsCards.filter(
        (card) => card.rank === "queen"
      ).length;

      if (
        numQueenSpades >= 4 &&
        numQueenClubs >= 4 &&
        numQueenHearts >= 4 &&
        numQueenDiamonds >= 4
      )
        return 4;
      if (
        numQueenSpades >= 3 &&
        numQueenClubs >= 3 &&
        numQueenHearts >= 3 &&
        numQueenDiamonds >= 3
      )
        return 3;
      if (
        numQueenSpades >= 2 &&
        numQueenClubs >= 2 &&
        numQueenHearts >= 2 &&
        numQueenDiamonds >= 2
      )
        return 2;
      if (
        numQueenSpades >= 1 &&
        numQueenClubs >= 1 &&
        numQueenHearts >= 1 &&
        numQueenDiamonds >= 1
      )
        return 1;
      return 0;
    };

    const jacksAround = (hand: PinochleCard[]): number => {
      const spadesCards = hand.filter((card) => card.suit === "spades");
      const clubsCards = hand.filter((card) => card.suit === "clubs");
      const heartsCards = hand.filter((card) => card.suit === "hearts");
      const diamondsCards = hand.filter((card) => card.suit === "diamonds");

      const numJackSpades = spadesCards.filter(
        (card) => card.rank === "jack"
      ).length;
      const numJackClubs = clubsCards.filter(
        (card) => card.rank === "jack"
      ).length;
      const numJackHearts = heartsCards.filter(
        (card) => card.rank === "jack"
      ).length;
      const numJackDiamonds = diamondsCards.filter(
        (card) => card.rank === "jack"
      ).length;

      if (
        numJackSpades >= 4 &&
        numJackClubs >= 4 &&
        numJackHearts >= 4 &&
        numJackDiamonds >= 4
      )
        return 4;
      if (
        numJackSpades >= 3 &&
        numJackClubs >= 3 &&
        numJackHearts >= 3 &&
        numJackDiamonds >= 3
      )
        return 3;
      if (
        numJackSpades >= 2 &&
        numJackClubs >= 2 &&
        numJackHearts >= 2 &&
        numJackDiamonds >= 2
      )
        return 2;
      if (
        numJackSpades >= 1 &&
        numJackClubs >= 1 &&
        numJackHearts >= 1 &&
        numJackDiamonds >= 1
      )
        return 1;
      return 0;
    };

    const pinochles = (hand: PinochleCard[]): number => {
      const queenSpades = hand.filter(
        (card) => card.suit === "spades" && card.rank === "queen"
      ).length;
      const jackDiamonds = hand.filter(
        (card) => card.suit === "diamonds" && card.rank === "jack"
      ).length;

      if (queenSpades >= 4 && jackDiamonds >= 4) return 4;
      if (queenSpades >= 3 && jackDiamonds >= 3) return 3;
      if (queenSpades >= 2 && jackDiamonds >= 2) return 2;
      if (queenSpades >= 1 && jackDiamonds >= 1) return 1;
      return 0;
    };

    const trumpRun = (hand: PinochleCard[], trumpSuit: Suit): number => {
      const numAces = hand.filter(
        (card) => card.suit === trumpSuit && card.rank === "ace"
      ).length;
      const numTens = hand.filter(
        (card) => card.suit === trumpSuit && card.rank === "ten"
      ).length;
      const numKings = hand.filter(
        (card) => card.suit === trumpSuit && card.rank === "king"
      ).length;
      const numQueens = hand.filter(
        (card) => card.suit === trumpSuit && card.rank === "queen"
      ).length;
      const numJacks = hand.filter(
        (card) => card.suit === trumpSuit && card.rank === "jack"
      ).length;

      if (
        numAces >= 4 &&
        numTens >= 4 &&
        numKings >= 4 &&
        numQueens >= 4 &&
        numJacks >= 4
      )
        return 4;
      if (
        numAces >= 3 &&
        numTens >= 3 &&
        numKings >= 3 &&
        numQueens >= 3 &&
        numJacks >= 3
      )
        return 3;
      if (
        numAces >= 2 &&
        numTens >= 2 &&
        numKings >= 2 &&
        numQueens >= 2 &&
        numJacks >= 2
      )
        return 2;
      if (
        numAces >= 1 &&
        numTens >= 1 &&
        numKings >= 1 &&
        numQueens >= 1 &&
        numJacks >= 1
      )
        return 1;
      return 0;
    };

    const marriages = (hand: PinochleCard[]): { [Suit: string]: number } => {
      const spadesCards = hand.filter((card) => card.suit === "spades");
      const clubsCards = hand.filter((card) => card.suit === "clubs");
      const heartsCards = hand.filter((card) => card.suit === "hearts");
      const diamondsCards = hand.filter((card) => card.suit === "diamonds");

      const spadesKings = spadesCards.filter(
        (card) => card.rank === "king"
      ).length;
      const spadesQueens = spadesCards.filter(
        (card) => card.rank === "queen"
      ).length;

      const clubsKings = clubsCards.filter(
        (card) => card.rank === "king"
      ).length;
      const clubsQueens = clubsCards.filter(
        (card) => card.rank === "queen"
      ).length;

      const heartsKings = heartsCards.filter(
        (card) => card.rank === "king"
      ).length;
      const heartsQueens = heartsCards.filter(
        (card) => card.rank === "queen"
      ).length;

      const diamondsKings = diamondsCards.filter(
        (card) => card.rank === "king"
      ).length;
      const diamondsQueens = diamondsCards.filter(
        (card) => card.rank === "queen"
      ).length;

      const spadesMarriages = Math.min(spadesKings, spadesQueens);
      const clubsMarriages = Math.min(clubsKings, clubsQueens);
      const heartsMarriages = Math.min(heartsKings, heartsQueens);
      const diamondsMarriages = Math.min(diamondsKings, diamondsQueens);

      const perSuitScores = (counts, trump: Suit) => {
        return {
          spades: counts.spades * (trump === "spades" ? 4 : 2),
          clubs: counts.clubs * (trump === "clubs" ? 4 : 2),
          hearts: counts.hearts * (trump === "hearts" ? 4 : 2),
          diamonds: counts.diamonds * (trump === "diamonds" ? 4 : 2),
        };
      };

      const scoringObj = {
        spades: spadesMarriages,
        clubs: clubsMarriages,
        hearts: heartsMarriages,
        diamonds: diamondsMarriages,
      };

      const marriageResults = perSuitScores(scoringObj, trumpSuit);

      return marriageResults;
    };

    const numAcesAround = acesAround(hand);
    const numKingsAround = kingsAround(hand);
    const numQueensAround = queensAround(hand);
    const numJacksAround = jacksAround(hand);

    const numPinochles = pinochles(hand);

    const numTrumpRuns = trumpRun(hand, trumpSuit);

    const numMarriages = marriages(hand);

    const meldTypeCounts: MeldCount = {
      acesAround: numAcesAround,
      kingsAround: numKingsAround,
      queensAround: numQueensAround,
      jacksAround: numJacksAround,
      pinochles: numPinochles,
      trumpRuns: numTrumpRuns,
      marriages: {
        spades: numMarriages.spades,
        clubs: numMarriages.clubs,
        hearts: numMarriages.hearts,
        diamonds: numMarriages.diamonds,
      },
    };
    return meldTypeCounts;
  }

  private meldScore(meldObject: MeldCount): number {
    let totalMeld = 0;

    switch (meldObject.acesAround) {
      case 0:
        break;
      case 1:
        totalMeld += 10;
        break;
      case 2:
        totalMeld += 100;
        break;
      case 3:
        totalMeld += 200;
        break;
      case 4:
        totalMeld += 300;
        break;
    }

    switch (meldObject.kingsAround) {
      case 0:
        break;
      case 1:
        totalMeld += 8;
        break;
      case 2:
        totalMeld += 80;
        break;
      case 3:
        totalMeld += 160;
        break;
      case 4:
        totalMeld += 240;
        break;
    }

    switch (meldObject.queensAround) {
      case 0:
        break;
      case 1:
        totalMeld += 6;
        break;
      case 2:
        totalMeld += 60;
        break;
      case 3:
        totalMeld += 120;
        break;
      case 4:
        totalMeld += 180;
        break;
    }

    switch (meldObject.jacksAround) {
      case 0:
        break;
      case 1:
        totalMeld += 4;
        break;
      case 2:
        totalMeld += 40;
        break;
      case 3:
        totalMeld += 80;
        break;
      case 4:
        totalMeld += 120;
        break;
    }

    switch (meldObject.pinochles) {
      case 0:
        break;
      case 1:
        totalMeld += 4;
        break;
      case 2:
        totalMeld += 30;
        break;
      case 3:
        totalMeld += 90;
        break;
      case 4:
        totalMeld += 300;
        break;
    }

    switch (meldObject.trumpRuns) {
      case 0:
        break;
      case 1:
        totalMeld += 11;
        break;
      case 2:
        totalMeld += 142;
        break;
      case 3:
        totalMeld += 288;
        break;
      case 4:
        totalMeld += 334;
        break;
    }

    totalMeld += meldObject.marriages.spades;
    totalMeld += meldObject.marriages.clubs;
    totalMeld += meldObject.marriages.hearts;
    totalMeld += meldObject.marriages.diamonds;

    return totalMeld;
  }

  // Returns the unique set of cards that contribute to any meld scored in the hand.
  private determineMeldCards(
    hand: PinochleCard[],
    trumpSuit: Suit
  ): PinochleCard[] {
    const suits: Suit[] = ["spades", "clubs", "hearts", "diamonds"];
    const highlight = new Set<PinochleCard>();

    const cardsBySuit: Record<Suit, PinochleCard[]> = {
      spades: hand.filter((card) => card.suit === "spades"),
      clubs: hand.filter((card) => card.suit === "clubs"),
      hearts: hand.filter((card) => card.suit === "hearts"),
      diamonds: hand.filter((card) => card.suit === "diamonds"),
    };

    const bySuitAndRank = (suit: Suit, rank: PinochleRank): PinochleCard[] =>
      cardsBySuit[suit].filter((card) => card.rank === rank);

    const addFirstN = (cards: PinochleCard[], n: number) => {
      for (let i = 0; i < Math.min(n, cards.length); i++) {
        highlight.add(cards[i]);
      }
    };

    const addAround = (rank: PinochleRank) => {
      const perSuit = suits.map((suit) => bySuitAndRank(suit, rank));
      const sets = Math.min(...perSuit.map((arr) => arr.length));
      for (let i = 0; i < sets; i++) {
        perSuit.forEach((arr) => highlight.add(arr[i]));
      }
    };

    // Arounds
    addAround("ace");
    addAround("king");
    addAround("queen");
    addAround("jack");

    // Pinochle(s): Q♠ + J♦
    const queensSpades = bySuitAndRank("spades", "queen");
    const jacksDiamonds = bySuitAndRank("diamonds", "jack");
    const pinochleSets = Math.min(queensSpades.length, jacksDiamonds.length);
    for (let i = 0; i < pinochleSets; i++) {
      highlight.add(queensSpades[i]);
      highlight.add(jacksDiamonds[i]);
    }

    // Trump run(s): A,10,K,Q,J of trump
    const runRanks: PinochleRank[] = ["ace", "ten", "king", "queen", "jack"];
    const trumpRankCards = runRanks.map((rank) =>
      bySuitAndRank(trumpSuit, rank)
    );
    const runSets = Math.min(...trumpRankCards.map((arr) => arr.length));
    for (let i = 0; i < runSets; i++) {
      trumpRankCards.forEach((arr) => highlight.add(arr[i]));
    }

    // Marriages (per suit)
    suits.forEach((suit) => {
      const kings = bySuitAndRank(suit, "king");
      const queens = bySuitAndRank(suit, "queen");
      const marriageSets = Math.min(kings.length, queens.length);
      for (let i = 0; i < marriageSets; i++) {
        highlight.add(kings[i]);
        highlight.add(queens[i]);
      }
    });

    return Array.from(highlight);
  }

  private determinePlayableCards(
    playerHand: PinochleCard[],
    leadingCards: PinochleCard[]
  ): PinochleCard[] {
    if (leadingCards.length === 0) return playerHand;

    const leadingSuit = leadingCards[0].suit;
    const trumpSuit = this.trumpSuit;

    const getHighestValue = (cards: PinochleCard[]): number =>
      cards.reduce((max, card) => Math.max(max, card.getValue()), -Infinity);

    const leadSuitCardsOnTable = leadingCards.filter(
      (card) => card.suit === leadingSuit
    );
    const highestLeadValue = getHighestValue(leadSuitCardsOnTable);

    const trumpCardsOnTable = leadingCards.filter(
      (card) => card.suit === trumpSuit
    );
    const trumpPlayed = trumpCardsOnTable.length > 0;
    const highestTrumpValue = getHighestValue(trumpCardsOnTable);

    const playerLeadSuitCards = playerHand.filter(
      (card) => card.suit === leadingSuit
    );
    const playerTrumpCards = playerHand.filter(
      (card) => card.suit === trumpSuit
    );

    // No trump has been played yet (or trump was led). Follow suit and beat if possible.
    if (!trumpPlayed || leadingSuit === trumpSuit) {
      if (playerLeadSuitCards.length > 0) {
        const higherLeadCards = playerLeadSuitCards.filter(
          (card) => card.getValue() > highestLeadValue
        );
        return higherLeadCards.length > 0
          ? higherLeadCards
          : playerLeadSuitCards;
      }
      if (playerTrumpCards.length > 0) {
        return playerTrumpCards;
      }
      return playerHand;
    }

    // Trump already cut the trick. Lead-suit holders may play any rank of that suit.
    if (playerLeadSuitCards.length > 0) {
      return playerLeadSuitCards;
    }

    // No lead suit; must beat the trump if possible, otherwise any trump, otherwise anything.
    if (playerTrumpCards.length > 0) {
      const winningTrumps = playerTrumpCards.filter(
        (card) => card.getValue() > highestTrumpValue
      );
      return winningTrumps.length > 0 ? winningTrumps : playerTrumpCards;
    }

    return playerHand;
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

  
