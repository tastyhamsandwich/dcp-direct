import type { Player, SuitSymbol, Suit, RankValue, SuitCapitalized, SuitInitial, Winner, HandRank } from './types';
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

export function suitNameToInitial(suit: Suit | SuitCapitalized): SuitInitial {
  let suitLetter: SuitInitial;
  switch (suit) {
    case 'clubs':
    case 'Clubs':
      suitLetter = 'C'
      break;
    case 'diamonds':
    case 'Diamonds':
      suitLetter = 'D';
      break;
    case 'hearts':
    case 'Hearts':
      suitLetter = 'H';
      break;
    case 'spades':
    case 'Spades':
      suitLetter = 'S';
      break;
    default:
      throw Error("An unknown error occurred.");
  }

  return suitLetter;
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
  let winningHand = '';
  
  //* Check if hand is empty
  if (!allCards || allCards.length === 0) {
    winningHand = "Empty Hand";
    return { hand: winningHand, value: 0 }; // Return lowest possible rank
  }
  
  //* Initialize empty histogram object
  const hist: {[key in RankValue]?: number} = {};
  
  //* Iterate over cards in hand array and increment counter for each RankValue present
  allCards.reduce((hist: {[key in RankValue]?: number}, card: Card) => {
    hist[card.rankValue] = (hist[card.rankValue] || 0) + 1;
    return hist;
  }, hist);
  
  //* Create scored histogram
  const scoredHist: (number | undefined)[][] = Object
    .keys(hist)
    .map(rankNum => [parseInt(rankNum), hist[rankNum as unknown as RankValue]])
    .sort((a, b) => (a[1] ?? 0) === (b[1] ?? 0) ? (b[0] ?? 0) - (a[0] ?? 0) : (b[1] ?? 0) - (a[1] ?? 0));
  
  //* Add safety check before continuing
  if (scoredHist.length === 0) {
    winningHand = "Invalid Hand";
    return { hand: winningHand, value: 0 };
  }
  
  //* Suits
  //* [ suit: count ]
  
  const suits = allCards.reduce((suits: number[], card: Card) => {
    suits[card.suitValue()]++;
    return suits;
  }, [0,0,0,0]);
  
  //* Ranked Hand
  //* (descending by rank)
  //* [ index : rank ]
  
  const rankedHand = allCards.map(card => card.rankValue).sort((a, b) => a - b);
  
  //* Evaluate for non-histogram based hands and set a flag accordingly, to be used for final evaluation chain
  const isFlush   = suits.indexOf(5) >= 0;
  const isWheel   = rankedHand[4] === 14 && rankedHand[0] === 2;
  const isStraight  = ( rankedHand[4]
    - rankedHand[3] === 1 || isWheel
  ) && (
    rankedHand[3]   - rankedHand[2] === 1 &&
    rankedHand[2]   - rankedHand[1] === 1 &&
    rankedHand[1]   - rankedHand[0] === 1
  );
  
  //* Final Evaluation Chain
  //* Starting with Royal Flush and working downwards
  //* Using ternary operators to chain evaluations together
  
  const bestHand = (isStraight && isFlush && rankedHand[4] === 14 && !isWheel) ? (10) // Royal Flush
    : (isStraight && isFlush) ? (9 + (rankedHand[4] / 100)) // Straight Flush
      : (scoredHist[0][1] === 4) ? (8 + ((scoredHist[0][0] ?? 0) / 100)) // Four of a Kind
        : (scoredHist[0][1] === 3 && scoredHist[1][1] === 2) ? (7 + ((scoredHist[0][0] ?? 0) / 100) + ((scoredHist[1][0] ?? 0) / 1000)) // Full House
          : (isFlush) ? (6 + (rankedHand[4] / 100)) // Flush
            : (isStraight) ? (5 + (rankedHand[4] / 100)) // Straight
              : (scoredHist[0][1] === 3 && scoredHist[1][1] === 1) ? (4 + ((scoredHist[0][0] ?? 0) / 100)) // Three of a Kind
                : (scoredHist[0][1] === 2 && scoredHist[1][1] === 2) ? (3 + ((scoredHist[0][0] ?? 0) / 100) + ((scoredHist[1][0] ?? 0) / 1000)) // Two Pair
                  : (scoredHist[0][1] === 2 && scoredHist[1][1] === 1) ? (2 + ((scoredHist[0][0] ?? 0) / 100)) // One Pair
                    : (1 + ((scoredHist[0][0] ?? 0) / 100)); // High Card
  
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