'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');
const { decryptJson, encryptJson, rsghubCatalogue, signature } = require('./rsghub');
const { makeApp } = require('./server');

const publicCredentials = {
  clientId: '3df82c9b0af3',
  clientSecret: 'p@ssw0rd',
  key: 'N5MF76P7',
  iv: '4ANG4ACY',
  timestamp: '1494946640',
};

const env = {
  RSGHUB_BASE_URL: 'https://provider.test',
  RSGHUB_CLIENT_ID: publicCredentials.clientId,
  RSGHUB_CLIENT_SECRET: publicCredentials.clientSecret,
  RSGHUB_DES_KEY: publicCredentials.key,
  RSGHUB_DES_IV: publicCredentials.iv,
  RSGHUB_SYSTEM_CODE: 'TestSystem',
  RSGHUB_CURRENCY: 'KRW',
};
const now = () => new Date(Number(publicCredentials.timestamp) * 1000);

async function run(handler, path) {
  const server = http.createServer(handler);
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  try { return await fetch(`http://127.0.0.1:${server.address().port}${path}`); }
  finally { await new Promise(resolve => server.close(resolve)); }
}

test('RSGHub DES-CBC and signature match the published public vectors', () => {
  const gameList = encryptJson({ SystemCode: 'TestSystem' }, publicCredentials.key, publicCredentials.iv);
  assert.equal(gameList, 'viYfh1lH1HkxvFugb+0lidTef7h6slZSdAk0eDFp5rh8BRiGoGGd0A==');
  assert.equal(signature(publicCredentials.clientId, publicCredentials.clientSecret,
    publicCredentials.timestamp, gameList), '5bfc358d9564717873c9cdbf4b9b8f2e');

  const byCurrency = encryptJson({ SystemCode: 'TestSystem', Currency: 'KRW' }, publicCredentials.key, publicCredentials.iv);
  assert.equal(byCurrency, 'viYfh1lH1HkxvFugb+0lidTef7h6slZSZSuX8oWOdYr9396bFJpQwP4+JrwM7MPDA0ZgZnPtSK4=');
  assert.equal(signature(publicCredentials.clientId, publicCredentials.clientSecret,
    publicCredentials.timestamp, byCurrency), '281e5ec57c146eb6584f4363c132ff89');
  assert.deepEqual(decryptJson(byCurrency, publicCredentials.key, publicCredentials.iv),
    { SystemCode: 'TestSystem', Currency: 'KRW' });
});

test('RSGHub route requests the currency catalogue and projects only public game fields', async () => {
  const requests = [];
  const reply = {
    ErrorCode: 0,
    ErrorMessage: 'OK',
    Timestamp: Number(publicCredentials.timestamp),
    Data: { GameList: [
      { GameId: 36, GameType: 1, GameName: { en_US: 'Fortune Thai', zh_CN: '泰有钱' }, GameStatus: 1,
        GamePicUrl: 'https://images.example/game36.png', privateValue: 'do-not-return' },
      { GameId: 37, GameType: 2, GameName: { en_US: 'Fishing', zh_CN: '捕鱼' }, GameStatus: 2,
        GamePicUrl: 'http://unsafe.example/game37.png' },
    ] },
  };
  const fetchImpl = async (url, options) => {
    requests.push({ url, options });
    return new Response(encryptJson(reply, publicCredentials.key, publicCredentials.iv), {
      status: 200, headers: { 'Content-Type': 'text/plain' },
    });
  };
  const response = await run(makeApp({ env, fetchImpl, now }), '/providers/rsghub/games');
  const data = await response.json();
  assert.equal(response.status, 200);
  assert.deepEqual({ provider: data.provider, currency: data.currency, count: data.count },
    { provider: 'rsghub', currency: 'KRW', count: 2 });
  assert.equal(Object.prototype.hasOwnProperty.call(data, 'wallet'), false);
  assert.deepEqual(data.games[0], {
    gameCode: '36', name: 'Fortune Thai', nameZh: '泰有钱', category: 'SLOT', maintenance: false,
    imageUrl: 'https://images.example/game36.png',
  });
  assert.equal(data.games[1].category, 'FISH');
  assert.equal(data.games[1].maintenance, true);
  assert.equal(data.games[1].imageUrl, null);
  assert.equal(JSON.stringify(data).includes('do-not-return'), false);

  assert.equal(requests.length, 1);
  const request = requests[0];
  assert.equal(request.url, 'https://provider.test/api/v1/WithBalance/Game/GameListByCurrency');
  assert.equal(request.options.method, 'POST');
  assert.equal(request.options.redirect, 'error');
  assert.equal(request.options.headers['X-API-ClientID'], publicCredentials.clientId);
  assert.equal(request.options.headers['X-API-Timestamp'], publicCredentials.timestamp);
  const msg = new URLSearchParams(request.options.body).get('Msg');
  assert.equal(msg, 'viYfh1lH1HkxvFugb+0lidTef7h6slZSZSuX8oWOdYr9396bFJpQwP4+JrwM7MPDA0ZgZnPtSK4=');
  assert.equal(request.options.headers['X-API-Signature'],
    signature(publicCredentials.clientId, publicCredentials.clientSecret, publicCredentials.timestamp, msg));
  assert.equal(request.options.body.includes(publicCredentials.clientSecret), false);

  const health = await (await run(makeApp({ env }), '/health')).json();
  assert.equal(health.configured.rsghub, true);
  assert.equal(JSON.stringify(health).includes(publicCredentials.clientSecret), false);
});

test('RSGHub fails closed before fetch for missing or unsafe configuration', async () => {
  let calls = 0;
  const fetchImpl = async () => { calls++; throw new Error('must not call'); };
  for (const invalid of [
    {},
    { ...env, RSGHUB_BASE_URL: 'http://provider.test' },
    { ...env, RSGHUB_DES_KEY: 'short' },
    { ...env, RSGHUB_SYSTEM_CODE: 'bad-system-code' },
  ]) {
    const response = await run(makeApp({ env: invalid, fetchImpl, now }), '/providers/rsghub/games');
    assert.equal(response.status, 503);
  }
  assert.equal(calls, 0);
  await assert.rejects(rsghubCatalogue({ env, fetchImpl, now: () => new Date('invalid') }), /rsghub_invalid_clock/);
  assert.equal(calls, 0);
});

test('RSGHub rejects provider errors, malformed encryption and invalid catalogues without leaking responses', async () => {
  const cases = [
    [async () => new Response('upstream-private-body', { status: 403 }), /rsghub_upstream_http_403/],
    [async () => new Response('not-base64-private-body'), /rsghub_invalid_response/],
    [async () => new Response(encryptJson({ ErrorCode: 3011, ErrorMessage: 'private-provider-message', Data: null },
      publicCredentials.key, publicCredentials.iv)), /rsghub_provider_rejected_3011/],
    [async () => new Response(encryptJson({ ErrorCode: 0, ErrorMessage: 'OK', Data: { GameList: 'private-value' } },
      publicCredentials.key, publicCredentials.iv)), /rsghub_invalid_response/],
    [async () => new Response(encryptJson({ ErrorCode: 0, ErrorMessage: 'OK', Data: { GameList: [
      { GameId: 1, GameType: 1, GameStatus: 1, GameName: {} },
      { GameId: 1, GameType: 1, GameStatus: 1, GameName: {} },
    ] } }, publicCredentials.key, publicCredentials.iv)), /rsghub_duplicate_game/],
  ];
  for (const [fetchImpl, expected] of cases) {
    const response = await run(makeApp({ env, fetchImpl, now }), '/providers/rsghub/games');
    const raw = await response.text();
    assert.equal(response.status, 502);
    assert.match(raw, expected);
    assert.equal(raw.includes('private'), false);
  }
});

test('RSGHub direct adapter rejects malformed game records', async () => {
  const reply = { ErrorCode: 0, ErrorMessage: 'OK', Data: { GameList: [
    { GameId: 1, GameType: 99, GameStatus: 1, GameName: {} },
  ] } };
  await assert.rejects(rsghubCatalogue({ env, now, fetchImpl: async () =>
    new Response(encryptJson(reply, publicCredentials.key, publicCredentials.iv)) }), /rsghub_invalid_game/);
});
