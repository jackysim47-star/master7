'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');
const { decrypt, encrypt, jdbCatalogue } = require('./jdb');
const { makeApp } = require('./server');

const env = {
  JDB_BASE_URL: 'https://provider.test',
  JDB_DC: 'jb',
  JDB_AES_KEY: 'key1234567Sample',
  JDB_AES_IV: 'iv12345678Sample',
  JDB_AGENT_ID: 'fixture-agent',
};
const now = () => new Date('2026-11-07T05:06:07.890Z');

async function run(handler, path) {
  const server = http.createServer(handler);
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  try { return await fetch(`http://127.0.0.1:${server.address().port}${path}`); }
  finally { await new Promise(resolve => server.close(resolve)); }
}

test('JDB AES-CBC space padding follows the official protocol', () => {
  const encrypted = encrypt('SampleData', env.JDB_AES_KEY, env.JDB_AES_IV);
  assert.equal(encrypted, 'xa--LwmZQjlxNJdFOm_-Xg');
  assert.equal(decrypt(encrypted, env.JDB_AES_KEY, env.JDB_AES_IV), 'SampleData');

  const aligned = '1234567890abcdef';
  const alignedCiphertext = encrypt(aligned, env.JDB_AES_KEY, env.JDB_AES_IV);
  assert.equal(Buffer.from(alignedCiphertext.replace(/-/g, '+').replace(/_/g, '/') + '==', 'base64').length, 16);
  assert.equal(decrypt(alignedCiphertext, env.JDB_AES_KEY, env.JDB_AES_IV), aligned);
});

test('JDB catalogue sends only Action 49 and projects public catalogue fields', async () => {
  const requests = [];
  const fetchImpl = async (url, options) => {
    requests.push({ url, options });
    return new Response(JSON.stringify({
      status: '0000',
      privateField: 'do-not-return',
      data: [
        { gType: 0, list: [
          { mType: 14093, image: 'https://images.example/slot.png', name: 'Dragon Soar', maintenance: false,
            betList: ['0.2'], privateField: 'do-not-return' },
        ] },
        { gType: 7, list: [
          { mtype: '7001', image: 'http://unsafe.example/fish.png', name: 'Dragon Treasure', maintenance: 1 },
        ] },
        { gType: 101, list: [
          { mType: 10101, name: 'Live Table' },
        ] },
      ],
    }), { status: 200, headers: { 'Content-Type': 'application/json' } });
  };

  const result = await jdbCatalogue({ env, fetchImpl, now });
  assert.deepEqual({ provider: result.provider, count: result.count }, { provider: 'jdb', count: 3 });
  assert.deepEqual(result.games[0], {
    gameCode: '0:14093', name: 'Dragon Soar', category: 'SLOT', gameType: 0, machineType: 14093,
    maintenance: false, imageUrl: null,
  });
  assert.equal(result.games[1].gameCode, '7:7001');
  assert.equal(result.games[1].category, 'FISH');
  assert.equal(result.games[1].maintenance, true);
  assert.equal(result.games[1].imageUrl, null);
  assert.equal(result.games[2].category, 'OTHER');
  assert.equal(result.games[2].maintenance, true);
  assert.equal(JSON.stringify(result).includes('do-not-return'), false);

  assert.equal(requests.length, 1);
  const request = requests[0];
  assert.equal(request.url, 'https://provider.test/apiRequest.do');
  assert.equal(request.options.method, 'POST');
  assert.equal(request.options.redirect, 'error');
  assert.equal(request.options.headers['Content-Type'], 'application/json');
  const body = JSON.parse(request.options.body);
  assert.equal(body.dc, env.JDB_DC);
  assert.deepEqual(JSON.parse(decrypt(body.x, env.JDB_AES_KEY, env.JDB_AES_IV)), {
    action: 49,
    ts: now().getTime(),
    parent: env.JDB_AGENT_ID,
    lang: 'en',
  });
  assert.equal(request.options.body.includes(env.JDB_AES_KEY), false);
  assert.equal(request.options.body.includes(env.JDB_AES_IV), false);
});

test('JDB catalogue availability and names fail closed', async () => {
  const fetchImpl = async () => new Response(JSON.stringify({
    status: '0000', data: [{ gType: 0, list: [
      { mType: 1, name: 'Explicit false', maintenance: false },
      { mType: 2, name: 'Explicit zero', maintenance: 0 },
      { mType: 3, name: 'Missing field' },
      { mType: 4, name: 'Explicit true', maintenance: true },
      { mType: 5, name: 'Explicit one', maintenance: 1 },
    ] }],
  }), { headers: { 'Content-Type': 'application/json' } });
  const result = await jdbCatalogue({ env, fetchImpl, now });
  assert.deepEqual(result.games.map(game => game.maintenance), [false, false, true, true, true]);

  for (const name of ['', '   ', 'unsafe\nname']) {
    const invalidFetch = async () => Response.json({
      status: '0000', data: [{ gType: 0, list: [{ mType: 1, name }] }],
    });
    await assert.rejects(jdbCatalogue({ env, fetchImpl: invalidFetch, now }), /jdb_invalid_game/);
  }
});

test('JDB route and health expose no credentials', async () => {
  const fetchImpl = async () => new Response(JSON.stringify({
    status: '0000', data: [{ gType: 9, list: [{ mType: 9001, name: 'Arcade', maintenance: false }] }],
  }));
  const response = await run(makeApp({ env, fetchImpl, now }), '/providers/jdb/games');
  const data = await response.json();
  assert.equal(response.status, 200);
  assert.equal(data.provider, 'jdb');
  assert.equal(data.games[0].category, 'ARCADE');

  const healthResponse = await run(makeApp({ env }), '/health');
  const healthText = await healthResponse.text();
  assert.equal(healthResponse.status, 200);
  assert.equal(JSON.parse(healthText).configured.jdb, true);
  for (const secret of [env.JDB_AES_KEY, env.JDB_AES_IV, env.JDB_AGENT_ID]) {
    assert.equal(healthText.includes(secret), false);
  }
});

test('JDB fails closed before fetch for missing or unsafe configuration', async () => {
  let calls = 0;
  const fetchImpl = async () => { calls++; throw new Error('must not call'); };
  for (const invalid of [
    {},
    { ...env, JDB_BASE_URL: 'http://provider.test' },
    { ...env, JDB_BASE_URL: 'https://provider.test/path' },
    { ...env, JDB_AES_KEY: 'short' },
    { ...env, JDB_DC: 'bad dc' },
    { ...env, JDB_AGENT_ID: '' },
  ]) {
    await assert.rejects(jdbCatalogue({ env: invalid, fetchImpl, now }), /jdb_(?:not_configured|invalid_configuration)/);
  }
  assert.equal(calls, 0);
});

test('JDB rejects upstream and malformed catalogues without leaking provider data', async () => {
  const cases = [
    [async () => new Response('private-upstream-body', { status: 403 }), /jdb_upstream_http_403/],
    [async () => new Response('not-json-private-body'), /jdb_invalid_response/],
    [async () => new Response(JSON.stringify({ status: '9005', err_text: 'private-provider-message' })), /jdb_provider_rejected_9005/],
    [async () => new Response(JSON.stringify({ status: '0000', data: 'private-value' })), /jdb_invalid_response/],
    [async () => new Response(JSON.stringify({ status: '0000', data: [
      { gType: 0, list: [{ mType: 1, name: 'One' }, { mType: 1, name: 'Duplicate' }] },
    ] })), /jdb_duplicate_game/],
  ];
  for (const [fetchImpl, expected] of cases) {
    await assert.rejects(jdbCatalogue({ env, fetchImpl, now }), expected);
  }
});
