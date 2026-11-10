'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { MAX_EVO_GAMES, parseEvoCatalogueResponse } = require('./evo');

function game(changes = {}) {
  return {
    gameid: '2340',
    title: 'Lord Guan Yu',
    thumbnail: 'https://backendapi.evo888h5.com/slots/cover-img/private.png?token=hidden',
    ...changes,
  };
}

test('EVO catalogue projects bounded public fields and keeps titles unavailable', () => {
  const parsed = parseEvoCatalogueResponse({code: 0, secret: 'hidden', data: [game({weekturnover: 90000})]});
  assert.deepEqual(parsed, {ok: true, status: 0, games: [{
    gameid: '2340', title: 'Lord Guan Yu', thumbnail: null, maintenance: true,
  }]});
  assert.equal(JSON.stringify(parsed).includes('hidden'), false);
  assert.equal(JSON.stringify(parsed).includes('weekturnover'), false);
  assert.equal(JSON.stringify(parsed).includes('backendapi'), false);
});

test('EVO catalogue preserves a bounded denial status without the provider body', () => {
  assert.deepEqual(parseEvoCatalogueResponse({code: 130, message: 'IP address is not in whitelist'}), {
    ok: false, status: 130, games: [],
  });
  assert.deepEqual(parseEvoCatalogueResponse({code: '130', private: 'hidden'}), {
    ok: false, status: 130, games: [],
  });
});

test('EVO catalogue rejects malformed, duplicate and oversized success bodies', () => {
  const invalid = [
    null,
    [],
    {},
    {code: null, data: []},
    {code: false, data: []},
    {code: 0},
    {code: 0, data: [null]},
    {code: 0, data: [game({gameid: ''})]},
    {code: 0, data: [game({gameid: 'space code'})]},
    {code: 0, data: [game({title: '   '})]},
    {code: 0, data: [game({title: 'bad\nname'})]},
    {code: 0, data: [game({title: 'x'.repeat(161)})]},
    {code: 0, data: [game(), game()]},
    {code: 0, data: Array.from({length: MAX_EVO_GAMES + 1}, (_, index) => game({gameid: String(index)}))},
  ];
  for (const payload of invalid) {
    assert.throws(() => parseEvoCatalogueResponse(payload), /invalid_evo_catalogue/);
  }
});

test('EVO catalogue accepts a safe integer game ID and string zero envelope', () => {
  const parsed = parseEvoCatalogueResponse({code: '0', data: [game({gameid: 2340, title: '  Lord Guan Yu  '})]});
  assert.deepEqual(parsed.games[0], {
    gameid: '2340', title: 'Lord Guan Yu', thumbnail: null, maintenance: true,
  });
});
