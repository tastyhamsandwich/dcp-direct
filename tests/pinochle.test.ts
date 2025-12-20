import {
  CalculateMeldScore,
  CountMeld,
  DetermineMeldCards,
  DeterminePlayableCards,
} from "../src/game/pinochleRules";
import { PinochleCard } from "../src/game/pinochle";

const DEFAULT_CARD_ID = 1;

/**
 * Creates a Pinochle card with the provided attributes.
 * @param rank - The card rank.
 * @param suit - The card suit.
 * @param idNum - The card id number.
 * @returns The created card instance.
 * @example
 * const card = CreateCard("ace", "spades", 1);
 */
function CreateCard(
  rank: PinochleRank,
  suit: Suit,
  idNum: number
): PinochleCard {
  return new PinochleCard(rank, suit, idNum);
}

/**
 * Asserts two card arrays contain the same card references.
 * @param actual - The actual cards returned by the logic.
 * @param expected - The expected cards.
 * @returns Nothing.
 * @example
 * ExpectSameCards(actual, expected);
 */
function ExpectSameCards(
  actual: PinochleCard[],
  expected: PinochleCard[]
): void {
  expect(actual).toHaveLength(expected.length);
  expect(actual).toEqual(expect.arrayContaining(expected));
}

/**
 * Creates a meld-focused hand for tests.
 * @returns The test hand with multiple melds.
 * @example
 * const hand = CreateMeldHand();
 */
function CreateMeldHand(): PinochleCard[] {
  return [
    CreateCard("ace", "spades", DEFAULT_CARD_ID),
    CreateCard("ace", "clubs", DEFAULT_CARD_ID),
    CreateCard("ace", "hearts", DEFAULT_CARD_ID),
    CreateCard("ace", "diamonds", DEFAULT_CARD_ID),
    CreateCard("king", "hearts", DEFAULT_CARD_ID),
    CreateCard("queen", "hearts", DEFAULT_CARD_ID),
    CreateCard("queen", "spades", DEFAULT_CARD_ID),
    CreateCard("jack", "diamonds", DEFAULT_CARD_ID),
  ];
}

describe("Pinochle rule helpers", () => {
  test("forces trump when void in lead suit", () => {
    const trumpSuit: Suit = "spades";
    const leadingSuit: Suit = "hearts";
    const trumpCard = CreateCard("jack", trumpSuit, DEFAULT_CARD_ID);
    const offSuitCard = CreateCard("queen", "clubs", DEFAULT_CARD_ID);
    const playerHand = [trumpCard, offSuitCard];
    const leadingCards = [CreateCard("ace", leadingSuit, DEFAULT_CARD_ID)];

    const playable = DeterminePlayableCards(
      playerHand,
      leadingCards,
      trumpSuit
    );

    ExpectSameCards(playable, [trumpCard]);
  });

  test("allows any card when void in lead suit and trump", () => {
    const trumpSuit: Suit = "spades";
    const leadingSuit: Suit = "hearts";
    const clubCard = CreateCard("king", "clubs", DEFAULT_CARD_ID);
    const diamondCard = CreateCard("ten", "diamonds", DEFAULT_CARD_ID);
    const playerHand = [clubCard, diamondCard];
    const leadingCards = [CreateCard("ace", leadingSuit, DEFAULT_CARD_ID)];

    const playable = DeterminePlayableCards(
      playerHand,
      leadingCards,
      trumpSuit
    );

    ExpectSameCards(playable, playerHand);
  });

  test("requires following suit even when holding trump", () => {
    const trumpSuit: Suit = "spades";
    const leadingSuit: Suit = "hearts";
    const leadCard = CreateCard("king", leadingSuit, DEFAULT_CARD_ID);
    const trumpCard = CreateCard("ace", trumpSuit, DEFAULT_CARD_ID);
    const playerHand = [leadCard, trumpCard];
    const leadingCards = [CreateCard("ace", leadingSuit, DEFAULT_CARD_ID)];

    const playable = DeterminePlayableCards(
      playerHand,
      leadingCards,
      trumpSuit
    );

    ExpectSameCards(playable, [leadCard]);
  });

  test("counts melds, scores them, and returns meld cards", () => {
    const trumpSuit: Suit = "hearts";
    const hand = CreateMeldHand();

    const meldCount = CountMeld(hand, trumpSuit);

    expect(meldCount).toEqual({
      acesAround: 1,
      kingsAround: 0,
      queensAround: 0,
      jacksAround: 0,
      pinochles: 1,
      trumpRuns: 0,
      marriages: {
        spades: 0,
        clubs: 0,
        hearts: 4,
        diamonds: 0,
      },
    });

    expect(CalculateMeldScore(meldCount)).toBe(18);

    const meldCards = DetermineMeldCards(hand, trumpSuit);
    ExpectSameCards(meldCards, hand);
  });
});
