import { Player, Deck, Card } from './classes';
import { Server } from 'socket.io'; 
import { Suit, Rank, User } from './types';

type PinochleGamePhase = "waiting" | "bid" | "meld" | "game" | "postgame";
type PinochleSeat = [1 | 2 | 3 | 4];
type PinochleCards = 'AS' | 'AC' | 'AH' | 'AD' | 'TS' | 'TC' | 'TH' | 'TD' | 'KS' | 'KC' | 'KH' | 'KD' | 'QS' | 'QC' | 'QH' | 'QD' | 'JS' | 'JC' | 'JH' | 'JD';
type PinochleTeam = 'teamOne' | 'teamTwo';
type RoomStatus = 'waitingForPlayers' | 'gameInProgress' | 'gameEnding';
type MeldCount = {
  acesAround: number,
  kingsAround: number,
  queensAround: number,
  jacksAround: number,
  pinochles: number,
  trumpRuns: number,
  marriages: {
    spades: number,
    clubs: number,
    hearts: number,
    diamonds: number
  }
}

interface PinochleTableSeats {
  seatOne:    Player | null;
  seatTwo:    Player | null;
  seatThree:  Player | null;
  seatFour:   Player | null;
}

type teamOne = 'seatOne' | 'seatThree';
type teamTwo = 'seatTwo' | 'seatFour';

interface PinochleGameState {
  id: string;
  players: Player[];
  teamOnePlayers: Player[];
  teamTwoPlayers: Player[];
  teamOneScore: number;
  teamTwoScore: number;
  roundBid?: number;
  roundBidTaker?: Player;
  biddingTeam?: PinochleTeam;
  trumpSuit?: Suit;
  roundNumber?: number;
  phase?: PinochleGamePhase;
  activePlayerId?: string;
  activePlayerIndex?: number;
}

export class PinochlePlayer implements User {
  id: string;
  username: string;
  chips: number;
  active: boolean;
  bidTaker: boolean;
}

/**  Represents a deck of cards.
 * @class
 * @param autoShuffle - Whether to shuffle the deck automatically.
 */
export class PinochleDeck {

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
    const ranks: Rank[] = ['ace', 'ten', 'king', 'queen', 'jack'];

    let cardArray: Card[] = [];

    // Generate deck contents in order, so that the deck is always the same
    for (const suit of suits) {               // for every suit
      for (const rank of ranks) {             // and for every rank
        for (let i = 0; i < 4; i++) {         // four times each
          const card = new Card(rank, suit);  // create that card
          cardArray.push(card);               // and add it to the array
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

  draw(): Card {
    if (this.cards.length < 1)
    throw new Error('Not enough cards to draw.');
    else return this.cards.pop()!;
  }
}

export class Pinochle {
  id: string;
  name: string;
  creator: Player;
  wagerPerRound: number;
  hasStarted: boolean;
  players: Player[];
  roomStatus: RoomStatus;
  seatAssignments: PinochleTableSeats;
  teamOnePlayers: Player[];
  teamTwoPlayers: Player[];
  trumpSuit: Suit;
  teamOneMeld: number;
  teamTwoMeld: number;
  teamOneScore: number;
  teamTwoScore: number;
  bidAmount: number;
  bidTaker: Player;
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

  constructor(id: string, name: string, creator: Player, wagerPerRound: number) {
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
      seatFour: null
    }
  }

  private dealCards(): void {

    if (this.deck.cards.length !== 80)
      this.deck = new PinochleDeck();

    this.deck.shuffle();

    for (let r = 0; r < 4; r++) {
      for (let p = 0; p < this.players.length; p++) {
        let currentPosition = (this.dealerIndex + 1) % this.players.length;
        const playerIndex = (currentPosition + p) % this.players.length;
        const player = this.players[playerIndex];
        let dealFiveArray: Card[] = [];
        for (let i = 0; i < 5; i++) { // Pinochle hands are dealt in groups of 5, four passes around, for 20 cards each
          const card = this.deck.draw();
          card.faceUp = false; // Ensure default is face down
          dealFiveArray.push(card);
        }
        dealFiveArray.forEach(card => player.cards.push(card));
      }
    }
    //console.log(`Dealt ${card.faceUp ? 'face up ' : ''}${card.name} to player '${player.username}'`);
  }

  private countMeld(hand: Card[], trumpSuit: Suit): MeldCount {
    let totalMeld = 0;

    const acesAround = (hand: Card[]): number => {
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

    const kingsAround = (hand: Card[]): number => {
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

    const queensAround = (hand: Card[]): number => {
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

    const jacksAround = (hand: Card[]): number => {
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

    const pinochles = (hand: Card[]): number => {
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

    const trumpRun = (hand: Card[], trumpSuit: Suit): number => {
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

    const marriages = (hand: Card[]): { [Suit: string]: number } => {
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
  private determineMeldCards(hand: Card[], trumpSuit: Suit): Card[] {
    const suits: Suit[] = ["spades", "clubs", "hearts", "diamonds"];
    const highlight = new Set<Card>();

    const cardsBySuit: Record<Suit, Card[]> = {
      spades: hand.filter((card) => card.suit === "spades"),
      clubs: hand.filter((card) => card.suit === "clubs"),
      hearts: hand.filter((card) => card.suit === "hearts"),
      diamonds: hand.filter((card) => card.suit === "diamonds"),
    };

    const bySuitAndRank = (suit: Suit, rank: Rank): Card[] =>
      cardsBySuit[suit].filter((card) => card.rank === rank);

    const addFirstN = (cards: Card[], n: number) => {
      for (let i = 0; i < Math.min(n, cards.length); i++) {
        highlight.add(cards[i]);
      }
    };

    const addAround = (rank: Rank) => {
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
    const runRanks: Rank[] = ["ace", "ten", "king", "queen", "jack"];
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
    playerHand: Card[],
    leadingCards: Card[]
  ): Card[] {
    if (leadingCards.length === 0) return playerHand;

    const leadingSuit = leadingCards[0].suit;
    const trumpSuit = this.trumpSuit;

    const getHighestValue = (cards: Card[]): number =>
      cards.reduce(
        (max, card) => Math.max(max, card.getPinochleValue()),
        -Infinity
      );

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
          (card) => card.getPinochleValue() > highestLeadValue
        );
        return higherLeadCards.length > 0
          ? higherLeadCards
          : playerLeadSuitCards;
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
        (card) => card.getPinochleValue() > highestTrumpValue
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
    const biddingPlayers: Player[] = [
      firstBidder,
      secondBidder,
      thirdBidder,
      fourthBidder,
    ];

    for (const player of biddingPlayers) player.active = false;
    biddingPlayers[bidderIndex].active = true;
  }
}

  