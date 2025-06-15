import type { Player, SuitSymbol, Suit, RankValue, SuitCapitalized, SuitInitial, Winner, HandRank, Hand } from './types';
import { Card } from '@game/classes';
import { capitalize, valueToRank } from '@lib/utils';

export function toggleReady(player: Player) {
  return player.ready = !player.ready;
}

export function rankToNumStr(rank: string): string {
  let rankNum: string = '';
  switch (rank) {
    case 'two':
      rankNum = '2';
      break;
    case 'three':
      rankNum = '3';
      break;
    case 'four':
      rankNum = '4';
      break;
    case 'five':
      rankNum = '5';
      break;
    case 'six':
      rankNum = '6';
      break;
    case 'seven':
      rankNum = '7';
      break;
    case 'eight':
      rankNum = '8';
      break;
    case 'nine':
      rankNum = '9';
      break;
    case 'ten':
      rankNum = 'T';
      break;
    case 'jack':
      rankNum = 'J';
      break;
    case 'queen':
      rankNum = 'Q';
      break;
    case 'king':
      rankNum = 'K';
      break;
    case 'ace':
      rankNum = 'A';
      break;
    default:
      rankNum = '?';
      break;
  }

  return rankNum;
}

export function suitNameToInitial(suit: Suit | SuitCapitalized): string {
	let suitLetter = suit.substring(0, 1).toUpperCase();

	if (
		suitLetter === "S" ||
		suitLetter === "C" ||
		suitLetter === "D" ||
		suitLetter === "H"
	)
		return suitLetter;
	else return "H";
}

export function suitToSymbol(suit: SuitInitial | Suit | SuitCapitalized): SuitSymbol {

  const formattedSuit: SuitInitial | SuitCapitalized = capitalize(suit) as SuitInitial | SuitCapitalized;

  switch (formattedSuit) {
    case 'S':
    case 'Spades':
      return '♠';
    case 'C':
    case 'Clubs':
      return '♣';
    case 'D':
    case 'Diamonds':
      return '♦';
    case 'H':
    case 'Hearts':
      return '♥';
    default:
      throw Error("Invalid suit type provided.");
  }
}

// Evaluate poker hands
export function evaluateHands(players: Player[], communityCards: Card[]): Winner[] {
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
  
export function evaluateHand(allCards: Card[]): HandRank {
  let winningHand = "";

  //* Check if hand is empty
  if (!allCards || allCards.length === 0) {
    winningHand = "Empty Hand";
    return { hand: winningHand, value: 0 }; // Return lowest possible rank
  }

  //* Initialize empty histogram object
  const hist: { [key in RankValue]?: number } = {};

  //* Create basic histogram
  //* Which we will use next, for our megazord histogram
  //* This creates a basic counter for each rank of card in an object.
  //* Example: If you have [7S, 7D, 9S, KH, KC], it will output:
  //* { 7: 2, 9: 1, 13: 2 }

  allCards.reduce((hist: { [key in RankValue]?: number }, card: Card) => {
    hist[card.rankValue] = (hist[card.rankValue] || 0) + 1;
    return hist;
  }, hist);

  //* Create scored histogram
  //* This is the primary muscle that allows for the evaluation to work properly
  //* It creates a 2D array of each card rank and the number of times it appears in a hand, sorted first by count then by rank
  //* Example: If you have a hand with two kings and three sevens:
  //* [7, 3] ( 3 sevens )
  //* [13, 2] ( 2 kings )
  //* After sorting you get [[7, 3], [13, 2]]
  //* x[0][0] will give you the rank of the most frequently appearing card in the hand, and x[0][1] will give you the exact amount of times it appeared
  //* x[1][0] will give you the second most frequently appearing card's rank, x[1][1] wil give you that card's number of appearances, and so on...

  const scoredHist: (number | undefined)[][] = Object.keys(hist)
    .map((rankNum) => [
      parseInt(rankNum),
      hist[rankNum as unknown as RankValue],
    ])
    .sort((a, b) =>
      (a[1] ?? 0) === (b[1] ?? 0)
        ? (b[0] ?? 0) - (a[0] ?? 0)
        : (b[1] ?? 0) - (a[1] ?? 0)
    );

  //* Add safety check before continuing
  if (scoredHist.length === 0) {
    winningHand = "Invalid Hand";
    return { hand: winningHand, value: 0 };
  }

  //* We need a few more checks to account for certain hands, but we're almost equipped to begin evaluation

  //* Suits (creates an array with how many of each suit are present in the hand, 5 or more in any element here equals a flush)
  //* [Hearts, Diamonds, Clubs, Spades]

  const suits = allCards.reduce(
    (suits: number[], card: Card) => {
      suits[card.suitValue() - 1]++;
      return suits;
    },
    [0, 0, 0, 0]
  );

  //* Ranked Hand - we just want to sort the hand in order of rank so we can evaluate straights easily
  //* (descending by rank)
  //* [ index : rank ]

  const rankedHand = allCards
    .map((card) => card.rankValue)
    .sort((a, b) => a - b);

  //* Evaluate for non-histogram based hands and set a flag accordingly, to be used for final evaluation chain
  const isFlush = suits.indexOf(5) >= 0; // The above suits reduction should have one array element with a value of 5 or higher if they have a flush
  const isWheel = rankedHand[4] === 14 && rankedHand[0] === 2; // A wheel is an Ace through Five straight, so the highest card should be a value 14 (Ace) and the lowest should be a 2 (Two)
  const isStraight = // For normal straights, each card should have a value difference of one from the ones adjacent to it.
    (rankedHand[4] - rankedHand[3] === 1 || isWheel) &&
    rankedHand[3] - rankedHand[2] === 1 &&
    rankedHand[2] - rankedHand[1] === 1 &&
    rankedHand[1] - rankedHand[0] === 1;

  //* Final Evaluation Chain
  //* Starting with Royal Flush and working downwards
  //* Using ternary operators to chain evaluations together
  // Each hand is ranked from 1 to 10, each whole number corresponding to a type of hand and the significant digits in the decimal corresponding to the rank of the cards used.
  // I'm sure there is a slightly bettwe way to do this exact part, using base 2 or something maybe, but it works for the time being.

  const bestHand =
    isStraight && isFlush && rankedHand[4] === 14 && !isWheel // If it's a straight, and a flush, and the highest card is an ace, but it's not a wheel, it's a royal flush
      ? 10 // Royal Flush
      : isStraight && isFlush // If it's a straight, and a flush, it's a straight flush
      ? 9 + rankedHand[4] / 100 // Straight Flush
      : scoredHist[0][1] === 4 // If you have four of the same rank card, you got quads
      ? 8 + (scoredHist[0][0] ?? 0) / 100 // Four of a Kind
      : scoredHist[0][1] === 3 && scoredHist[1][1] === 2 // If you have three of one rank of cards and two of another, it's a boat
      ? 7 + (scoredHist[0][0] ?? 0) / 100 + (scoredHist[1][0] ?? 0) / 1000 // Full House
      : isFlush // Five of a single suit, as set by above flag checks
      ? 6 + rankedHand[4] / 100 // Flush
      : isStraight // Five adjacent-ranked cards, as set by above flag checks
      ? 5 + rankedHand[4] / 100 // Straight
      : scoredHist[0][1] === 3 && scoredHist[1][1] === 1 // Three of one rank of card, but without another rank pairing up makes three of a kind
      ? 4 + (scoredHist[0][0] ?? 0) / 100 // Three of a Kind
      : scoredHist[0][1] === 2 && scoredHist[1][1] === 2 // Two occurrences of a given rank appearing twice in the hand is two pairs
      ? 3 + (scoredHist[0][0] ?? 0) / 100 + (scoredHist[1][0] ?? 0) / 1000 // Two Pair
      : scoredHist[0][1] === 2 && scoredHist[1][1] === 1 // The highest occurrence of a rank in the hand is two, all other occurences are single instances - one pair
      ? 2 + (scoredHist[0][0] ?? 0) / 100 // One Pair
      : 1 + (scoredHist[0][0] ?? 0) / 100; // High Card

  // Now we just generate a verbal description of the hand as well for user experience...
  winningHand =
    bestHand >= 10
      ? `Royal Flush`
      : bestHand >= 9
      ? `Straight Flush${
          isWheel
            ? ` (Wheel, ${capitalize(allCards[0].suit)})`
            : ` (${rankedHand[0]} - ${rankedHand[4]}, ${capitalize(
                allCards[0].suit
              )})`
        }`
      : bestHand >= 8
      ? `Four of a Kind (${capitalize(
          valueToRank(scoredHist[0][0] as RankValue)
        )}s)`
      : bestHand >= 7
      ? `Full House (${capitalize(
          valueToRank(scoredHist[0][0] as RankValue)
        )}s over ${capitalize(valueToRank(scoredHist[1][0] as RankValue))}s)`
      : bestHand >= 6
      ? `Flush (${capitalize(allCards[0].suit)})`
      : bestHand >= 5
      ? `Straight${
          isWheel ? ` (Wheel)` : ` (${rankedHand[0]} - ${rankedHand[4]})`
        }`
      : bestHand >= 4
      ? `Three of a Kind (${capitalize(
          valueToRank(scoredHist[0][0] as RankValue)
        )}s)`
      : bestHand >= 3
      ? `Two Pair (${capitalize(
          valueToRank(scoredHist[0][0] as RankValue)
        )}s and ${capitalize(valueToRank(scoredHist[1][0] as RankValue))}s)`
      : bestHand >= 2
      ? `Pair of ${capitalize(valueToRank(scoredHist[0][0] as RankValue))}s`
      : `High Card (${capitalize(valueToRank(scoredHist[0][0] as RankValue))})`;

  //  ...And output the score and the string description in an object. Whee!!!
  return { hand: winningHand, value: bestHand };
}

export function compareHands(handOne: Card[], handTwo: Card[]) {
  const evaluatedHandOne = evaluateHand(handOne);
  const evaluatedHandTwo = evaluateHand(handTwo);

  const evaluatedHands = [evaluatedHandOne, evaluatedHandTwo];
  evaluatedHands.sort((a, b) => b.value - a.value);

  return { hand: evaluatedHands[0].hand, value: evaluatedHands[0].value };
}