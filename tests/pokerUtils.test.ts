import { Card, Player } from "../src/game/classes";
import { evaluateHand, evaluateHands } from "../src/game/utils";

const DEFAULT_CHIPS = 1000;

/**
 * Creates a standard playing card.
 * @param rank - The card rank.
 * @param suit - The card suit.
 * @returns The created card instance.
 * @example
 * const card = CreateCard("ace", "spades");
 */
function CreateCard(rank: Rank, suit: Suit): Card {
  return new Card(rank, suit);
}

/**
 * Creates a poker player for evaluation tests.
 * @param id - The player id.
 * @param username - The player username.
 * @param seatNumber - The seat number at the table.
 * @returns The initialized player.
 * @example
 * const player = CreatePlayer("p1", "Tester", 0);
 */
function CreatePlayer(id: string, username: string, seatNumber: number): Player {
  return new Player(id, username, seatNumber, DEFAULT_CHIPS, "");
}

describe("Poker hand evaluation", () => {
  test("scores a royal flush", () => {
    const cards = [
      CreateCard("ace", "hearts"),
      CreateCard("king", "hearts"),
      CreateCard("queen", "hearts"),
      CreateCard("jack", "hearts"),
      CreateCard("ten", "hearts"),
    ];

    const result = evaluateHand(cards) as HandRank;
    expect(result.hand).toBe("Royal Flush");
    expect(result.value).toBe(10);
  });

  test("recognizes a wheel straight", () => {
    const cards = [
      CreateCard("ace", "hearts"),
      CreateCard("two", "clubs"),
      CreateCard("three", "spades"),
      CreateCard("four", "hearts"),
      CreateCard("five", "diamonds"),
    ];

    const result = evaluateHand(cards) as HandRank;
    expect(result.hand).toContain("Straight");
    expect(result.hand).toContain("Wheel");
  });

  test("evaluates a full house", () => {
    const cards = [
      CreateCard("seven", "hearts"),
      CreateCard("seven", "clubs"),
      CreateCard("seven", "diamonds"),
      CreateCard("king", "spades"),
      CreateCard("king", "hearts"),
    ];

    const result = evaluateHand(cards) as HandRank;
    expect(result.hand).toContain("Full House");
  });

  test("returns all winners on a tie", () => {
    const communityCards = [
      CreateCard("ten", "hearts"),
      CreateCard("jack", "clubs"),
      CreateCard("queen", "diamonds"),
      CreateCard("king", "spades"),
      CreateCard("ace", "hearts"),
    ];

    const playerOne = CreatePlayer("p1", "PlayerOne", 0);
    const playerTwo = CreatePlayer("p2", "PlayerTwo", 1);

    const winners = evaluateHands([playerOne, playerTwo], communityCards);
    const winnerNames = winners.map((winner) => winner.username).sort();

    expect(winnerNames).toEqual(["PlayerOne", "PlayerTwo"]);
  });
});
