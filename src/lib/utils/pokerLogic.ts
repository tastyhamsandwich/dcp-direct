const SUITS = ['hearts', 'diamonds', 'clubs', 'spades'];
const RANKS = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];

export class Card {
  suit: string
  rank: string
  name: string

  constructor(suit, rank) {
    this.suit = suit;
    this.rank = rank;
    this.name = `${rank}${suit}`
  }

}
// Create a standard 52-card deck
export function createDeck() {
  const deck: Card[] = [];
  
  for (const suit of SUITS) {
    for (const rank of RANKS) {
      const card = new Card(suit, rank);
      deck.push(card);
    }
  }
  
  return deck;
}

// Shuffle the deck using Fisher-Yates algorithm
export function shuffleDeck(deck) {
  const shuffled = [...deck];
  
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  
  return shuffled;
}

// Deal cards from the deck
export function dealCards(deck, count) {
  return deck.splice(0, count);
}

// Evaluate poker hands
export function evaluateHands(players, communityCards) {
  const evaluatedHands = players.map(player => {
    const allCards = [...player.cards, ...communityCards];
    const handRank = evaluateHand(allCards);
    
    return {
      ...player,
      handRank
    };
  });
  
  // Sort by hand strength (highest first)
  evaluatedHands.sort((a, b) => b.handRank.rank - a.handRank.rank);
  
  // Find players with the best hand
  const bestRank = evaluatedHands[0].handRank.rank;
  const winners = evaluatedHands.filter(p => p.handRank.rank === bestRank);
  
  return winners;
}

// Hand evaluation - simplified for brevity
// In a real implementation, use a robust poker hand evaluator library
export function evaluateHand(cards) {
  // This is a simplified evaluation that just looks for basic hand types
  // In a real app, you would want a more sophisticated algorithm that 
  // properly ranks all poker hands and handles ties correctly
  
  // Check for flush (all same suit)
  const suits = cards.map(card => card.suit);
  const isFlush = SUITS.some(suit => 
    suits.filter(s => s === suit).length >= 5
  );
  
  // Check for straight (5 cards in sequence)
  const ranks = cards.map(card => {
    // Convert face cards to numerical values
    if (card.rank === 'A') return 14;
    if (card.rank === 'K') return 13;
    if (card.rank === 'Q') return 12;
    if (card.rank === 'J') return 11;
    return parseInt(card.rank);
  }).sort((a, b) => a - b);
  
  let isStraight = false;
  for (let i = 0; i <= ranks.length - 5; i++) {
    if (ranks[i + 4] - ranks[i] === 4) {
      isStraight = true;
      break;
    }
  }
  
  // Count occurrences of each rank
  const rankCounts = {};
  ranks.forEach(rank => {
    rankCounts[rank] = (rankCounts[rank] || 0) + 1;
  });
  
  const hasFourOfAKind = Object.values(rankCounts).some(count => count === 4);
  const hasThreeOfAKind = Object.values(rankCounts).some(count => count === 3);
  const pairCount = Object.values(rankCounts).filter(count => count === 2).length;
  
  // Determine hand rank (higher is better)
  let handRank = 0;
  let handName = 'High Card';
     
  // Check for straight flush
  if (isFlush && isStraight) {
    handRank = 8;
    handName = 'Straight Flush';
  }
  // Four of a kind
  else if (hasFourOfAKind) {
    handRank = 7;
    handName = 'Four of a Kind';
  }
  // Full house (three of a kind and a pair)
  else if (hasThreeOfAKind && pairCount >= 1) {
    handRank = 6;
    handName = 'Full House';
  }
  // Flush
  else if (isFlush) {
    handRank = 5;
    handName = 'Flush';
  }
  // Straight
  else if (isStraight) {
    handRank = 4;
    handName = 'Straight';
  }
  // Three of a kind
  else if (hasThreeOfAKind) {
    handRank = 3;
    handName = 'Three of a Kind';
  }
  // Two pair
  else if (pairCount >= 2) {
    handRank = 2;
    handName = 'Two Pair';
  }
  // One pair
  else if (pairCount === 1) {
    handRank = 1;
    handName = 'One Pair';
  }
  
  return {
    rank: handRank,
    name: handName,
    // For a real implementation, you'd also return the cards that make up the hand
    // and handle tie-breakers (kickers) properly
  };
}