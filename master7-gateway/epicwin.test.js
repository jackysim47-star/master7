'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { MAX_PUBLIC_GAMES, parseEpicwinCatalogueResponse } = require('./epicwin');

function game(changes = {}) {
  return {
    GameCode: '10001',
    GameName: 'Sample EPICWIN game',
    GameType: 1,
    ImageUrl: 'https://unverified.example.test/private.png',
    ...changes,
  };
}

test('projects bounded EPICWIN fields and keeps availability closed', () => {
  const result = parseEpicwinCatalogueResponse({Status: 200, SecretKey: 'hidden', Game: [game({private: 'hidden'})]});
  assert.deepEqual(result, {ok: true, status: 200, games: [{
    gameCode: '10001', name: 'Sample EPICWIN game', category: '1', imageUrl: null, maintenance: true,
  }]});
  assert.ok(!JSON.stringify(result).includes('hidden'));
  assert.ok(!JSON.stringify(result).includes('unverified.example.test'));
});

test('preserves provider denials without parsing a game array', () => {
  assert.deepEqual(parseEpicwinCatalogueResponse({Status: 900403, SecretKey: 'hidden'}), {
    ok: false, status: 900403, games: [],
  });
});

test('rejects malformed, duplicate and oversized success catalogues', () => {
  const invalid = [
    null,
    [],
    {Status: '200', Game: []},
    {Status: 200},
    {Status: 200, Game: [null]},
    {Status: 200, Game: [game({GameCode: ''})]},
    {Status: 200, Game: [game({GameCode: 'space code'})]},
    {Status: 200, Game: [game({GameName: 'bad\nname'})]},
    {Status: 200, Game: [game({GameName: 'x'.repeat(161)})]},
    {Status: 200, Game: [game({GameType: -1})]},
    {Status: 200, Game: [game(), game()]},
    {Status: 200, Game: Array.from({length: MAX_PUBLIC_GAMES + 1}, (_, index) => game({GameCode: String(index)}))},
  ];
  for (const payload of invalid) {
    assert.throws(() => parseEpicwinCatalogueResponse(payload), /invalid_epicwin_catalogue/);
  }
});

test('accepts a safe integer code and documented alternative name field', () => {
  const result = parseEpicwinCatalogueResponse({Status: 200, Game: [game({
    GameCode: 10001, GameName: undefined, Name: 'Alternative name', GameType: 'slot',
  })]});
  assert.deepEqual(result.games[0], {
    gameCode: '10001', name: 'Alternative name', category: 'slot', imageUrl: null, maintenance: true,
  });
});
