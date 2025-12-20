export type PinochleCardLike = {
  suit: Suit;
  rank: PinochleRank;
  rankValue: PinochleRankValue;
  getValue?: () => PinochleRankValue;
};

type MarriageScores = {
  spades: number;
  clubs: number;
  hearts: number;
  diamonds: number;
};

const SUITS: Suit[] = ["spades", "clubs", "hearts", "diamonds"];
const RUN_RANKS: PinochleRank[] = ["ace", "ten", "king", "queen", "jack"];

/**
 * Groups cards by suit for fast lookups.
 * @param hand - The cards to group by suit.
 * @returns A record keyed by suit with arrays of cards.
 * @example
 * const cardsBySuit = GetCardsBySuit(hand);
 */
function GetCardsBySuit<T extends PinochleCardLike>(
  hand: T[]
): Record<Suit, T[]> {
  const cardsBySuit: Record<Suit, T[]> = {
    spades: [],
    clubs: [],
    hearts: [],
    diamonds: [],
  };

  hand.forEach((card) => {
    cardsBySuit[card.suit].push(card);
  });

  return cardsBySuit;
}

/**
 * Filters cards by suit and rank.
 * @param cardsBySuit - Suit-grouped cards.
 * @param suit - The suit to filter.
 * @param rank - The rank to filter.
 * @returns Cards matching the suit and rank.
 * @example
 * const spadeAces = GetBySuitAndRank(cardsBySuit, "spades", "ace");
 */
function GetBySuitAndRank<T extends PinochleCardLike>(
  cardsBySuit: Record<Suit, T[]>,
  suit: Suit,
  rank: PinochleRank
): T[] {
  return cardsBySuit[suit].filter((card) => card.rank === rank);
}

/**
 * Counts how many sets of a rank exist across all suits.
 * @param cardsBySuit - Suit-grouped cards.
 * @param rank - The rank to count across suits.
 * @returns The number of complete arounds (0-4).
 * @example
 * const acesAround = CountAroundRank(cardsBySuit, "ace");
 */
function CountAroundRank<T extends PinochleCardLike>(
  cardsBySuit: Record<Suit, T[]>,
  rank: PinochleRank
): number {
  const counts = SUITS.map(
    (suit) => GetBySuitAndRank(cardsBySuit, suit, rank).length
  );
  return Math.min(...counts);
}

/**
 * Counts the number of pinochle sets (Q spades + J diamonds).
 * @param cardsBySuit - Suit-grouped cards.
 * @returns The number of pinochle sets (0-4).
 * @example
 * const pinochles = CountPinochleSets(cardsBySuit);
 */
function CountPinochleSets<T extends PinochleCardLike>(
  cardsBySuit: Record<Suit, T[]>
): number {
  const queenSpades = GetBySuitAndRank(cardsBySuit, "spades", "queen").length;
  const jackDiamonds = GetBySuitAndRank(cardsBySuit, "diamonds", "jack").length;
  return Math.min(queenSpades, jackDiamonds);
}

/**
 * Counts how many trump runs exist in the hand.
 * @param cardsBySuit - Suit-grouped cards.
 * @param trumpSuit - The current trump suit.
 * @returns The number of trump runs (0-4).
 * @example
 * const runs = CountTrumpRuns(cardsBySuit, "hearts");
 */
function CountTrumpRuns<T extends PinochleCardLike>(
  cardsBySuit: Record<Suit, T[]>,
  trumpSuit: Suit
): number {
  const counts = RUN_RANKS.map(
    (rank) => GetBySuitAndRank(cardsBySuit, trumpSuit, rank).length
  );
  return Math.min(...counts);
}

/**
 * Calculates marriage scores for each suit.
 * @param cardsBySuit - Suit-grouped cards.
 * @param trumpSuit - The current trump suit.
 * @returns The scored marriages by suit.
 * @example
 * const marriages = GetMarriageScores(cardsBySuit, "spades");
 */
function GetMarriageScores<T extends PinochleCardLike>(
  cardsBySuit: Record<Suit, T[]>,
  trumpSuit: Suit
): MarriageScores {
  const marriageScores: MarriageScores = {
    spades: 0,
    clubs: 0,
    hearts: 0,
    diamonds: 0,
  };

  SUITS.forEach((suit) => {
    const kings = GetBySuitAndRank(cardsBySuit, suit, "king").length;
    const queens = GetBySuitAndRank(cardsBySuit, suit, "queen").length;
    const marriages = Math.min(kings, queens);
    const multiplier = suit === trumpSuit ? 4 : 2;
    marriageScores[suit] = marriages * multiplier;
  });

  return marriageScores;
}

/**
 * Reads the effective value of a Pinochle card.
 * @param card - The card to evaluate.
 * @returns The rank value of the card.
 * @example
 * const value = GetCardValue(card);
 */
function GetCardValue(card: PinochleCardLike): PinochleRankValue {
  if (typeof card.getValue === "function") {
    return card.getValue();
  }
  return card.rankValue;
}

/**
 * Computes the highest rank value within a set of cards.
 * @param cards - Cards to evaluate.
 * @returns The maximum rank value, or -Infinity if empty.
 * @example
 * const highest = GetHighestValue(cards);
 */
function GetHighestValue<T extends PinochleCardLike>(cards: T[]): number {
  return cards.reduce((max, card) => Math.max(max, GetCardValue(card)), -Infinity);
}

/**
 * Adds the cards contributing to an around meld of a specific rank.
 * @param highlight - The set to add meld cards into.
 * @param cardsBySuit - Suit-grouped cards.
 * @param rank - The rank to evaluate for arounds.
 * @returns Nothing.
 * @example
 * AddAroundCards(highlight, cardsBySuit, "ace");
 */
function AddAroundCards<T extends PinochleCardLike>(
  highlight: Set<T>,
  cardsBySuit: Record<Suit, T[]>,
  rank: PinochleRank
): void {
  const perSuit = SUITS.map((suit) => GetBySuitAndRank(cardsBySuit, suit, rank));
  const sets = Math.min(...perSuit.map((cards) => cards.length));
  for (let i = 0; i < sets; i++) {
    perSuit.forEach((cards) => highlight.add(cards[i]));
  }
}

/**
 * Adds cards contributing to pinochle melds (Q spades + J diamonds).
 * @param highlight - The set to add meld cards into.
 * @param cardsBySuit - Suit-grouped cards.
 * @returns Nothing.
 * @example
 * AddPinochleCards(highlight, cardsBySuit);
 */
function AddPinochleCards<T extends PinochleCardLike>(
  highlight: Set<T>,
  cardsBySuit: Record<Suit, T[]>
): void {
  const queensSpades = GetBySuitAndRank(cardsBySuit, "spades", "queen");
  const jacksDiamonds = GetBySuitAndRank(cardsBySuit, "diamonds", "jack");
  const sets = Math.min(queensSpades.length, jacksDiamonds.length);
  for (let i = 0; i < sets; i++) {
    highlight.add(queensSpades[i]);
    highlight.add(jacksDiamonds[i]);
  }
}

/**
 * Adds cards contributing to trump runs.
 * @param highlight - The set to add meld cards into.
 * @param cardsBySuit - Suit-grouped cards.
 * @param trumpSuit - The current trump suit.
 * @returns Nothing.
 * @example
 * AddTrumpRunCards(highlight, cardsBySuit, "hearts");
 */
function AddTrumpRunCards<T extends PinochleCardLike>(
  highlight: Set<T>,
  cardsBySuit: Record<Suit, T[]>,
  trumpSuit: Suit
): void {
  const trumpRankCards = RUN_RANKS.map((rank) =>
    GetBySuitAndRank(cardsBySuit, trumpSuit, rank)
  );
  const sets = Math.min(...trumpRankCards.map((cards) => cards.length));
  for (let i = 0; i < sets; i++) {
    trumpRankCards.forEach((cards) => highlight.add(cards[i]));
  }
}

/**
 * Adds cards contributing to marriages across suits.
 * @param highlight - The set to add meld cards into.
 * @param cardsBySuit - Suit-grouped cards.
 * @returns Nothing.
 * @example
 * AddMarriageCards(highlight, cardsBySuit);
 */
function AddMarriageCards<T extends PinochleCardLike>(
  highlight: Set<T>,
  cardsBySuit: Record<Suit, T[]>
): void {
  SUITS.forEach((suit) => {
    const kings = GetBySuitAndRank(cardsBySuit, suit, "king");
    const queens = GetBySuitAndRank(cardsBySuit, suit, "queen");
    const sets = Math.min(kings.length, queens.length);
    for (let i = 0; i < sets; i++) {
      highlight.add(kings[i]);
      highlight.add(queens[i]);
    }
  });
}

/**
 * Counts the meld categories found in a Pinochle hand.
 * @param hand - The cards to evaluate.
 * @param trumpSuit - The trump suit for the round.
 * @returns The meld counts by category.
 * @example
 * const meldCount = CountMeld(hand, "hearts");
 */
export function CountMeld<T extends PinochleCardLike>(
  hand: T[],
  trumpSuit: Suit
): MeldCount {
  const cardsBySuit = GetCardsBySuit(hand);

  return {
    acesAround: CountAroundRank(cardsBySuit, "ace"),
    kingsAround: CountAroundRank(cardsBySuit, "king"),
    queensAround: CountAroundRank(cardsBySuit, "queen"),
    jacksAround: CountAroundRank(cardsBySuit, "jack"),
    pinochles: CountPinochleSets(cardsBySuit),
    trumpRuns: CountTrumpRuns(cardsBySuit, trumpSuit),
    marriages: GetMarriageScores(cardsBySuit, trumpSuit),
  };
}

/**
 * Computes the meld score from a meld count object.
 * @param meldObject - The meld count data.
 * @returns The total meld score.
 * @example
 * const score = CalculateMeldScore(meldCount);
 */
export function CalculateMeldScore(meldObject: MeldCount): number {
  let totalMeld = 0;

  switch (meldObject.acesAround) {
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

/**
 * Returns the unique set of cards that contribute to any meld scored in the hand.
 * @param hand - The cards to evaluate.
 * @param trumpSuit - The trump suit for the round.
 * @returns The cards that participate in melds.
 * @example
 * const meldCards = DetermineMeldCards(hand, "spades");
 */
export function DetermineMeldCards<T extends PinochleCardLike>(
  hand: T[],
  trumpSuit: Suit
): T[] {
  const cardsBySuit = GetCardsBySuit(hand);
  const highlight = new Set<T>();

  AddAroundCards(highlight, cardsBySuit, "ace");
  AddAroundCards(highlight, cardsBySuit, "king");
  AddAroundCards(highlight, cardsBySuit, "queen");
  AddAroundCards(highlight, cardsBySuit, "jack");

  AddPinochleCards(highlight, cardsBySuit);
  AddTrumpRunCards(highlight, cardsBySuit, trumpSuit);
  AddMarriageCards(highlight, cardsBySuit);

  return Array.from(highlight);
}

/**
 * Determines which cards a player can legally play for the current trick.
 * @param playerHand - The player's hand.
 * @param leadingCards - The cards already played in the trick.
 * @param trumpSuit - The trump suit for the round.
 * @returns The list of playable cards.
 * @example
 * const playable = DeterminePlayableCards(hand, leadingCards, "spades");
 */
export function DeterminePlayableCards<T extends PinochleCardLike>(
  playerHand: T[],
  leadingCards: T[],
  trumpSuit: Suit
): T[] {
  if (leadingCards.length === 0) return playerHand;

  const leadingSuit = leadingCards[0].suit;

  const leadSuitCardsOnTable = leadingCards.filter(
    (card) => card.suit === leadingSuit
  );
  const highestLeadValue = GetHighestValue(leadSuitCardsOnTable);

  const trumpCardsOnTable = leadingCards.filter(
    (card) => card.suit === trumpSuit
  );
  const trumpPlayed = trumpCardsOnTable.length > 0;
  const highestTrumpValue = GetHighestValue(trumpCardsOnTable);

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
        (card) => GetCardValue(card) > highestLeadValue
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
      (card) => GetCardValue(card) > highestTrumpValue
    );
    return winningTrumps.length > 0 ? winningTrumps : playerTrumpCards;
  }

  return playerHand;
}
