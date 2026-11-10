'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { MAX_GAMES_PER_PAGE, parseClotplayCatalogueResponse } = require('./clotplay');

function response(overrides = {}) {
  return {
    data: [{
      slug: 'slot-1', name: 'Sample Slot', name_cn: '样板', category: 'SLOT',
      is_maintenance: 0, thumbnails: { en: { square: 'https://unapproved.test/1.png' } },
    }],
    pagination: { current_page: 1, last_page: 1, per_page: 100, total: 1 },
    privateToken: 'must-not-leak',
    ...overrides,
  };
}

test('CLOTPLAY catalogue is strictly projected and remote artwork is withheld', () => {
  const parsed = parseClotplayCatalogueResponse(response(), 1);
  assert.deepEqual(parsed, {
    games: [{
      gameCode: 'slot-1', name: 'Sample Slot', nameZh: '样板', category: 'SLOT',
      maintenance: false,
      thumbnails: {
        en: { square: null, portrait: null },
        cn: { square: null, portrait: null },
        th: { square: null, portrait: null },
      },
    }],
    pagination: { current_page: 1, last_page: 1, per_page: 100, total: 1 },
  });
  assert.equal(JSON.stringify(parsed).includes('must-not-leak'), false);
  assert.equal(JSON.stringify(parsed).includes('unapproved.test'), false);
});

test('CLOTPLAY unknown maintenance stays closed', () => {
  const value = response();
  delete value.data[0].is_maintenance;
  assert.equal(parseClotplayCatalogueResponse(value, 1).games[0].maintenance, true);
  value.data[0].is_maintenance = true;
  assert.equal(parseClotplayCatalogueResponse(value, 1).games[0].maintenance, true);
  value.data[0].is_maintenance = 1;
  assert.equal(parseClotplayCatalogueResponse(value, 1).games[0].maintenance, true);
});

test('CLOTPLAY rejects malformed, duplicate, oversized and inconsistent pages', () => {
  const malformed = [
    null,
    response({ data: {} }),
    response({ pagination: null }),
    response({ data: [{ slug: '', name: 'Bad' }] }),
    response({ data: [{ slug: 'bad/code', name: 'Bad' }] }),
    response({ data: [{ slug: 'x', name: 'Bad', is_maintenance: '0' }] }),
    response({ data: [{ slug: 'x', name: 'One' }, { slug: 'x', name: 'Two' }] }),
    response({ data: Array.from({ length: MAX_GAMES_PER_PAGE + 1 }, (_, index) => ({ slug: `g-${index}`, name: `Game ${index}` })) }),
    response({ data: [{ slug: 'partial', name: 'Partial' }], pagination: { current_page: 1, last_page: 2, per_page: 100, total: 101 } }),
    response({ pagination: { current_page: 2, last_page: 2, per_page: 100, total: 101 } }),
    response({ pagination: { current_page: 1, last_page: 0, per_page: 100, total: 1 } }),
    response({ pagination: { current_page: 1, last_page: 9, per_page: 100, total: 1 } }),
    response({ pagination: { current_page: 1, last_page: 1, per_page: 100, total: 0 } }),
  ];
  for (const value of malformed) {
    assert.throws(() => parseClotplayCatalogueResponse(value, 1), /invalid_clotplay_response/);
  }
});
