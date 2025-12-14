import { test } from 'node:test';
import assert from 'node:assert/strict';

import { Pinochle } from '../src/game/pinochle';
import { Card, Player } from '../src/game/classes';
import type { Rank, Suit } from '../src/game/types';

const makeCard = (rank: Rank, suit: Suit) => new Card(rank, suit);

const createGame = (trumpSuit: Suit) => {
  const creator = new Player('test-player', 'Creator', 0, 1000, '');
  const game = new Pinochle('game-id', 'Test Game', creator, 0) as any;
  game.trumpSuit = trumpSuit;
  return game;
};

test('determinePlayableCards requires beating the lead when possible', () => {
  const game = createGame('spades');
  const leading = [makeCard('queen', 'hearts')];
  const hand = [makeCard('king', 'hearts'), makeCard('ace', 'spades')];

  const playable = (game as any).determinePlayableCards(hand, leading);
  assert.deepStrictEqual(playable, [hand[0]]);
});

test('determinePlayableCards allows any lead suit card when you cannot beat', () => {
  const game = createGame('spades');
  const leading = [makeCard('king', 'hearts')];
  const hand = [makeCard('queen', 'hearts'), makeCard('jack', 'hearts')];

  const playable = (game as any).determinePlayableCards(hand, leading);
  assert.deepStrictEqual(playable, hand);
});

test('determinePlayableCards with trump led still enforces beating in suit', () => {
  const game = createGame('spades');
  const leading = [makeCard('jack', 'spades')];
  const hand = [makeCard('queen', 'spades'), makeCard('king', 'hearts')];

  const playable = (game as any).determinePlayableCards(hand, leading);
  assert.deepStrictEqual(playable, [hand[0]]);
});

test('determinePlayableCards after a trump cut lets you play any lead suit rank', () => {
  const game = createGame('spades');
  const leading = [makeCard('king', 'hearts'), makeCard('jack', 'spades')];
  const hand = [makeCard('jack', 'hearts')];

  const playable = (game as any).determinePlayableCards(hand, leading);
  assert.deepStrictEqual(playable, hand);
});

test('determinePlayableCards forces you to overtrump if possible when void in lead suit', () => {
  const game = createGame('spades');
  const leading = [makeCard('queen', 'hearts'), makeCard('jack', 'spades')];
  const hand = [makeCard('queen', 'spades'), makeCard('king', 'clubs')];

  const playable = (game as any).determinePlayableCards(hand, leading);
  assert.deepStrictEqual(playable, [hand[0]]);
});

test('determinePlayableCards lets you play any trump if you cannot beat the cutting trump', () => {
  const game = createGame('spades');
  const leading = [makeCard('queen', 'hearts'), makeCard('queen', 'spades')];
  const hand = [makeCard('jack', 'spades'), makeCard('king', 'clubs')];

  const playable = (game as any).determinePlayableCards(hand, leading);
  assert.deepStrictEqual(playable, [hand[0]]);
});

test('determinePlayableCards falls back to any card when void in lead and trump and no trump played', () => {
  const game = createGame('spades');
  const leading = [makeCard('queen', 'hearts')];
  const hand = [makeCard('king', 'clubs'), makeCard('jack', 'diamonds')];

  const playable = (game as any).determinePlayableCards(hand, leading);
  assert.deepStrictEqual(playable, hand);
});

test('countMeld identifies single aces around with zero bonuses elsewhere', () => {
  const game = createGame('hearts');
  const hand = [
    makeCard('ace', 'hearts'),
    makeCard('ace', 'diamonds'),
    makeCard('ace', 'clubs'),
    makeCard('ace', 'spades')
  ];

  const counts = (game as any).countMeld(hand, 'hearts');
  assert.equal(counts.acesAround, 1);
  assert.equal(counts.kingsAround, 0);
  assert.equal(counts.queensAround, 0);
  assert.equal(counts.jacksAround, 0);
  assert.equal(counts.pinochles, 0);
  assert.equal(counts.trumpRuns, 0);
  assert.deepStrictEqual(counts.marriages, { spades: 0, clubs: 0, hearts: 0, diamonds: 0 });
});

test('meldScore totals trump run + pinochle + trump marriage correctly', () => {
  const game = createGame('hearts');
  const hand = [
    makeCard('ace', 'hearts'),
    makeCard('ten', 'hearts'),
    makeCard('king', 'hearts'),
    makeCard('queen', 'hearts'),
    makeCard('jack', 'hearts'),
    makeCard('queen', 'spades'),
    makeCard('jack', 'diamonds')
  ];

  const counts = (game as any).countMeld(hand, 'hearts');
  assert.equal(counts.trumpRuns, 1);
  assert.equal(counts.pinochles, 1);
  assert.equal(counts.marriages.hearts, 4);

  const score = (game as any).meldScore(counts);
  assert.equal(score, 19);
});

test('determineMeldCards deduplicates a card used in multiple melds', () => {
  const game = createGame('spades');
  const queenSpades = makeCard('queen', 'spades');
  const kingSpades = makeCard('king', 'spades');
  const jackDiamonds = makeCard('jack', 'diamonds');
  const hand = [queenSpades, kingSpades, jackDiamonds, makeCard('ace', 'clubs')];

  const meldCards = (game as any).determineMeldCards(hand, 'hearts');
  const names = meldCards.map((c: Card) => c.name).sort();

  assert.deepStrictEqual(names, ['JD', 'KS', 'QS']);
  assert.equal(new Set(meldCards).size, meldCards.length);
});

test('determineMeldCards captures multiple arounds without duplication', () => {
  const game = createGame('hearts');
  const hand = [
    makeCard('ace', 'hearts'), makeCard('ace', 'hearts'),
    makeCard('ace', 'diamonds'), makeCard('ace', 'diamonds'),
    makeCard('ace', 'clubs'), makeCard('ace', 'clubs'),
    makeCard('ace', 'spades'), makeCard('ace', 'spades')
  ];

  const meldCards = (game as any).determineMeldCards(hand, 'hearts');
  assert.equal(meldCards.length, 8);
  assert.equal(new Set(meldCards).size, 8);
});

test('determineMeldCards picks the trump run cards', () => {
  const game = createGame('hearts');
  const hand = [
    makeCard('ace', 'hearts'),
    makeCard('ten', 'hearts'),
    makeCard('king', 'hearts'),
    makeCard('queen', 'hearts'),
    makeCard('jack', 'hearts'),
    makeCard('queen', 'spades')
  ];

  const meldCards = (game as any).determineMeldCards(hand, 'hearts');
  const names = meldCards.map((c: Card) => c.name).sort();
  assert.deepStrictEqual(names, ['AH', 'JH', 'KH', 'QH', 'TH']);
});
