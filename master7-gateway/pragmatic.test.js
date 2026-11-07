'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');
const { OPTIONS, normalizeGames, pragmaticCatalogue, requestHash } = require('./pragmatic');
const { makeApp } = require('./server');

const env = {
  PRAGMATIC_BASE_URL: 'https://api-2104.api-pp.net',
  PRAGMATIC_SECURE_LOGIN: 'fixtureLogin',
  PRAGMATIC_SECRET_KEY: 'fixtureSecret123456789',
};

async function run(handler, path) {
  const server = http.createServer(handler);
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  try { return await fetch(`http://127.0.0.1:${server.address().port}${path}`); }
  finally { await new Promise(resolve => server.close(resolve)); }
}

function json(value, status = 200) {
  return new Response(JSON.stringify(value), { status, headers: { 'Content-Type': 'application/json' } });
}

test('Pragmatic Play hash matches the documented sorted nonempty parameter contract', () => {
  assert.equal(OPTIONS, 'GetFeatures,GetFrbDetails,GetLines,GetDataTypes');
  assert.equal(requestHash({ secureLogin: env.PRAGMATIC_SECURE_LOGIN, options: OPTIONS }, env.PRAGMATIC_SECRET_KEY),
    '899eb9bf1287f14669837219c7388a11');
  assert.equal(requestHash({ z: '', hash: 'ignored', b: 'two', a: 'one' }, env.PRAGMATIC_SECRET_KEY),
    requestHash({ a: 'one', b: 'two' }, env.PRAGMATIC_SECRET_KEY));
});

test('Pragmatic Play catalogue uses only GetCasinoGames and projects bounded public fields', async () => {
  const requests = [];
  const fetchImpl = async (url, options) => {
    requests.push({ url, options });
    return json({
      error: '0',
      description: 'Success',
      providerPrivate: 'do-not-return',
      gameList: [
        {
          gameID: 'vs20doghouse', gameName: 'The Dog House', gameTypeID: 'vs', typeDescription: 'Slot',
          technologyID: 'H5', platform: 'MOBILE,WEB,MOBILE', demoGameAvailable: true, dataType: 'RNG',
          jurisdictions: ['private'], features: ['private'],
        },
        {
          gameID: '101', gameName: 'Live Baccarat', gameTypeID: 'live', typeDescription: 'Live Casino',
          technology: 'HTML5', platform: 'WEB', demoGameAvailable: false, dataType: 'LC',
        },
      ],
    });
  };

  const result = await pragmaticCatalogue({ env, fetchImpl });
  assert.deepEqual(result, {
    provider: 'pragmaticplay',
    count: 2,
    games: [
      {
        gameCode: 'vs20doghouse', name: 'The Dog House', category: 'SLOT', maintenance: false,
        technology: 'H5', platforms: ['MOBILE', 'WEB'], demoAvailable: true,
      },
      {
        gameCode: '101', name: 'Live Baccarat', category: 'LIVE', maintenance: false,
        technology: 'HTML5', platforms: ['WEB'], demoAvailable: false,
      },
    ],
  });
  assert.equal(JSON.stringify(result).includes('do-not-return'), false);
  assert.equal(JSON.stringify(result).includes('jurisdictions'), false);

  assert.equal(requests.length, 1);
  assert.equal(requests[0].url,
    'https://api-2104.api-pp.net/IntegrationService/v3/http/CasinoGameAPI/getCasinoGames/');
  assert.equal(requests[0].options.method, 'POST');
  assert.equal(requests[0].options.redirect, 'error');
  assert.equal(requests[0].options.headers['Content-Type'], 'application/x-www-form-urlencoded');
  const form = new URLSearchParams(requests[0].options.body);
  assert.deepEqual([...form.keys()], ['secureLogin', 'options', 'hash']);
  assert.equal(form.get('secureLogin'), env.PRAGMATIC_SECURE_LOGIN);
  assert.equal(form.get('options'), OPTIONS);
  assert.equal(form.get('hash'), '899eb9bf1287f14669837219c7388a11');
  assert.equal(requests[0].options.body.includes(env.PRAGMATIC_SECRET_KEY), false);
  assert.equal(normalizeGames([{
    gameID: 'webslot', gameName: 'Web Slot', gameTypeID: 'vs', typeDescription: 'Slot', dataType: 'WEB',
  }])[0].category, 'SLOT');
});

test('Pragmatic Play route, discovery and health expose no credentials', async () => {
  const fetchImpl = async () => json({ error: '0', description: 'Success', gameList: [
    { gameID: 'vs1', gameName: 'Fixture', gameTypeID: 'vs', platform: 'MOBILE', demoGameAvailable: true },
  ] });
  const app = makeApp({ env, fetchImpl });
  const response = await run(app, '/providers/pragmaticplay/games');
  assert.equal(response.status, 200);
  assert.equal((await response.json()).games[0].gameCode, 'vs1');

  const root = await run(app, '/');
  assert.match((await root.json()).endpoints.pragmaticPlayGames, /\/providers\/pragmaticplay\/games$/);

  const health = await run(app, '/health');
  const text = await health.text();
  assert.equal(health.status, 200);
  assert.equal(JSON.parse(text).configured.pragmaticplay, true);
  for (const value of [env.PRAGMATIC_SECURE_LOGIN, env.PRAGMATIC_SECRET_KEY]) {
    assert.equal(text.includes(value), false);
  }
});

test('Pragmatic Play fails closed before fetch for missing, redirected or unsafe configuration', async () => {
  let calls = 0;
  const fetchImpl = async () => { calls++; throw new Error('must not call'); };
  for (const invalid of [
    {},
    { ...env, PRAGMATIC_BASE_URL: 'http://api-2104.api-pp.net' },
    { ...env, PRAGMATIC_BASE_URL: 'https://api-2104.api-pp.net/IntegrationService' },
    { ...env, PRAGMATIC_BASE_URL: 'https://example.test' },
    { ...env, PRAGMATIC_SECURE_LOGIN: 'bad login' },
    { ...env, PRAGMATIC_SECRET_KEY: 'short' },
    { ...env, PRAGMATIC_SECRET_KEY: 'fixture secret with spaces' },
  ]) {
    await assert.rejects(pragmaticCatalogue({ env: invalid, fetchImpl }),
      /pragmatic_(?:not_configured|invalid_configuration)/);
  }
  assert.equal(calls, 0);
});

test('Pragmatic Play rejects provider failures and malformed or oversized catalogues', async () => {
  const cases = [
    [async () => new Response('private-upstream-body', { status: 403 }), /pragmatic_upstream_http_403/],
    [async () => new Response('not-json-private-body'), /pragmatic_invalid_response/],
    [async () => json({ error: '17', description: 'private-provider-message' }), /pragmatic_provider_rejected_17/],
    [async () => json({ error: 'private secret value', description: 'private' }), /pragmatic_provider_rejected_unknown/],
    [async () => json({ error: '0', gameList: 'private-value' }), /pragmatic_invalid_response/],
    [async () => json({ error: '0', gameList: [
      { gameID: 'same', gameName: 'One' }, { gameID: 'same', gameName: 'Duplicate' },
    ] }), /pragmatic_duplicate_game/],
    [async () => json({ error: '0', gameList: [{ gameID: '../unsafe', gameName: 'Unsafe' }] }),
      /pragmatic_invalid_game/],
    [async () => json({ error: '0', gameList: [{ gameID: 'ok', gameName: { private: true } }] }),
      /pragmatic_invalid_game/],
    [async () => new Response(`{"error":"0","gameList":[],"padding":"${'x'.repeat(4 * 1024 * 1024)}"}`),
      /pragmatic_response_too_large/],
  ];
  for (const [fetchImpl, expected] of cases) {
    await assert.rejects(pragmaticCatalogue({ env, fetchImpl }), expected);
  }
  assert.throws(() => normalizeGames(new Array(10001).fill(null)), /pragmatic_invalid_response/);
});

test('Pragmatic Play route returns a sanitized gateway error', async () => {
  const app = makeApp({ env, fetchImpl: async () => json({ error: '17', description: env.PRAGMATIC_SECRET_KEY }) });
  const response = await run(app, '/providers/pragmaticplay/games');
  const text = await response.text();
  assert.equal(response.status, 502);
  assert.equal(JSON.parse(text).error, 'pragmatic_provider_rejected_17');
  assert.equal(text.includes(env.PRAGMATIC_SECRET_KEY), false);
});
