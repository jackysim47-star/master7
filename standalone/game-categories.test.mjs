import test from 'node:test';
import assert from 'node:assert/strict';
import { classifyGameCategory, gameCategories } from '../shared/game-categories.mjs';

test('the lobby exposes the five agreed game categories', () => {
  assert.deepEqual(gameCategories.map(({ id }) => id), ['slots', 'live', 'sports', 'fishing', 'arcade']);
});

test('known provider category labels map to the agreed lobby categories', () => {
  for (const [label, expected] of [
    ['Slot Game', 'slots'], ['电子游艺', 'slots'], ['Live Casino', 'live'], ['真人娱乐', 'live'],
    ['Baccarat', 'live'], ['Sportsbook', 'sports'], ['football', 'sports'], ['Fishing Game', 'fishing'],
    ['mini-game', 'arcade'], ['街机', 'arcade'],
  ]) assert.equal(classifyGameCategory(label), expected, label);
});

test('unknown and malformed provider labels are not guessed into a category', () => {
  assert.equal(classifyGameCategory('casino'), null);
  assert.equal(classifyGameCategory('provider-new-category'), null);
  assert.equal(classifyGameCategory(''), null);
  assert.equal(classifyGameCategory(null), null);
  assert.equal(classifyGameCategory('x'.repeat(81)), null);
});
