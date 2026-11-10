'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { MAX_PUBLIC_GAMES, parseKissh5CatalogueResponse } = require('./kissh5');

function game(changes = {}) {
  return {
    GameCode: '265022',
    GameName: 'Supreme Zeus Power Scatter',
    GameType: 1,
    ImageUrl: 'https://gth.kissh5.com/thumbs/web/265022.png',
    IsActive: true,
    IsH5Support: true,
    Maintenance: false,
    ...changes,
  };
}

test('projects only bounded public KISSH5 catalogue fields', () => {
  const result = parseKissh5CatalogueResponse({ Status: 200, SecretKey: 'hidden', Game: [game({ private: 'hidden' })] });
  assert.deepEqual(result, { ok: true, status: 200, games: [{
    gameCode: '265022',
    name: 'Supreme Zeus Power Scatter',
    category: '1',
    imageUrl: 'https://gth.kissh5.com/thumbs/web/265022.png',
    maintenance: false,
  }] });
  assert.ok(!JSON.stringify(result).includes('hidden'));
});

test('availability stays fail-closed unless all three upstream fields explicitly prove it', () => {
  const cases = [
    [{}, true],
    [{ IsActive: false }, true],
    [{ IsH5Support: false }, true],
    [{ Maintenance: true }, true],
    [{ Maintenance: '00:00-06:00' }, true],
    [{ IsActive: true, IsH5Support: true, Maintenance: false }, false],
  ];
  for (const [changes, expected] of cases) {
    const projected = parseKissh5CatalogueResponse({ Status: 200, Game: [game({
      IsActive: undefined, IsH5Support: undefined, Maintenance: undefined, ...changes,
    })] });
    assert.equal(projected.games[0].maintenance, expected);
  }
});

test('provider denials remain denials without requiring a game list', () => {
  assert.deepEqual(parseKissh5CatalogueResponse({ Status: 900403, SecretKey: 'hidden' }), {
    ok: false, status: 900403, games: [],
  });
});

test('rejects malformed, duplicate and oversized success catalogues', () => {
  const invalid = [
    null,
    [],
    { Status: '200', Game: [] },
    { Status: 200 },
    { Status: 200, Game: [null] },
    { Status: 200, Game: [game({ GameCode: '' })] },
    { Status: 200, Game: [game({ GameCode: 'space code' })] },
    { Status: 200, Game: [game({ GameName: 'bad\nname' })] },
    { Status: 200, Game: [game({ GameName: 'x'.repeat(161) })] },
    { Status: 200, Game: [game({ GameType: -1 })] },
    { Status: 200, Game: [game({ GameType: {} })] },
    { Status: 200, Game: [game({ ImageUrl: 'http://gth.kissh5.com/thumbs/web/1.png' })] },
    { Status: 200, Game: [game({ ImageUrl: 'https://user:pass@gth.kissh5.com/thumbs/web/1.png' })] },
    { Status: 200, Game: [game({ ImageUrl: 'https://gth.kissh5.com/other/1.png' })] },
    { Status: 200, Game: [game(), game()] },
    { Status: 200, Game: Array.from({ length: MAX_PUBLIC_GAMES + 1 }, (_, index) => game({ GameCode: String(index) })) },
  ];
  for (const payload of invalid) {
    assert.throws(() => parseKissh5CatalogueResponse(payload), /invalid_kissh5_catalogue/);
  }
});

test('accepts safe integer codes, bounded text categories and absent artwork', () => {
  const result = parseKissh5CatalogueResponse({ Status: 200, Game: [game({
    GameCode: 265022, GameType: 'slot', ImageUrl: null,
  })] });
  assert.deepEqual(result.games[0], {
    gameCode: '265022', name: 'Supreme Zeus Power Scatter', category: 'slot', imageUrl: null, maintenance: false,
  });
});
