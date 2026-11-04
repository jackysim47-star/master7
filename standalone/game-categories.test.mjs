import test from 'node:test';
import assert from 'node:assert/strict';
import { classifyGameCategory, gameCategories } from '../shared/game-categories.mjs';

test('the lobby exposes all six agreed game categories', () => {
  assert.deepEqual(gameCategories.map(({ id }) => id), ['slots', 'fast_game', 'live', 'fishing', 'sports', 'others']);
});

test('known provider category labels map to the agreed lobby categories', () => {
  for (const [label, expected] of [
    ['Slot Game', 'slots'], ['电子游艺', 'slots'], ['Live Casino', 'live'], ['真人娱乐', 'live'],
    ['Baccarat', 'live'], ['Sportsbook', 'sports'], ['football', 'sports'], ['Fishing Game', 'fishing'],
    ['Fast Game', 'fast_game'], ['4D Lottery', 'fast_game'], ['mini-game', 'others'], ['街机', 'others'],
  ]) assert.equal(classifyGameCategory(label), expected, label);
});

test('unknown and malformed provider labels are not guessed into a category', () => {
  assert.equal(classifyGameCategory('casino'), null);
  assert.equal(classifyGameCategory('provider-new-category'), null);
  assert.equal(classifyGameCategory(''), null);
  assert.equal(classifyGameCategory(null), null);
  assert.equal(classifyGameCategory('x'.repeat(81)), null);
});
