'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const http = require('node:http');
const { makeApp } = require('./server');
const {
  buildMetaRequest,
  metaAccount,
  metaSignature,
  metaUtcDateTime,
  parseMetaCatalogueResponse,
  parseMetaKickResponse,
  parseMetaTransferStatusResponse,
  publicMetaAccountStatus,
  MAX_META_GAMES,
} = require('./metagaming');
const { metaGamingPeerCredential, metaGamingReadiness } = require('./readiness');

const fixed = new Date('2026-11-10T03:04:05.678Z');
const normalSecret = 'normal-provider-secret-key';
const freeSecret = 'free-provider-secret-key';
const baseEnv = {
  META_GAMING_NORMAL_BASE_URL: 'https://smapi.xystem138.com/api/opgateway/v1/op',
  META_GAMING_NORMAL_OPERATOR_ID: 'MASTER7NORMAL',
  META_GAMING_NORMAL_SECRET_KEY: normalSecret,
  META_GAMING_NORMAL_CURRENCY: 'MYR',
  META_GAMING_FREE_BASE_URL: 'https://smapi.xystem138.com/api/opgateway/v1/op',
  META_GAMING_FREE_OPERATOR_ID: 'MASTER7FREE',
  META_GAMING_FREE_SECRET_KEY: freeSecret,
  META_GAMING_FREE_CURRENCY: 'MYR',
};

function md5(value) {
  return crypto.createHash('md5').update(value, 'utf8').digest('hex');
}

async function request(app, path, { method = 'GET', token, body } = {}) {
  const server = http.createServer(app);
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  try {
    const response = await fetch(`http://127.0.0.1:${server.address().port}${path}`, {
      method,
      headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(body === undefined ? {} : { 'Content-Type': 'application/json' }) },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    });
    return { status: response.status, data: await response.json() };
  } finally {
    await new Promise(resolve => server.close(resolve));
  }
}

test('META v3.4.8 requests use the documented UTC format and exact signature fields', () => {
  assert.equal(metaUtcDateTime(fixed), '2026-11-10 03:04:05');
  const catalogue = buildMetaRequest('GetGameList', {
    operatorId: 'MASTER7NORMAL', secretKey: normalSecret, now: fixed,
  });
  assert.deepEqual(Object.keys(catalogue), ['OperatorId', 'RequestDateTime', 'Signature']);
  assert.equal(catalogue.Signature,
    md5(`GetGameList2026-11-10 03:04:05MASTER7NORMAL${normalSecret}`));

  const transfer = buildMetaRequest('CheckTransferStatus', {
    operatorId: 'MASTER7NORMAL', secretKey: normalSecret, now: fixed,
    fields: { PlayerId: 'member_1', ReferenceId: 'deposit-1', TransferType: 1 },
  });
  assert.equal(transfer.Signature,
    md5(`CheckTransferStatus2026-11-10 03:04:05MASTER7NORMAL${normalSecret}member_1deposit-11`));
  assert.equal(transfer.Signature, metaSignature('CheckTransferStatus', transfer.RequestDateTime,
    'MASTER7NORMAL', normalSecret, transfer));

  const deposit = buildMetaRequest('Deposit', {
    operatorId: 'MASTER7NORMAL', secretKey: normalSecret, now: fixed,
    fields: { PlayerId: 'member_1', Amount: '1.2500', ReferenceId: 'deposit-2' },
  });
  assert.equal(deposit.Signature,
    md5(`Deposit2026-11-10 03:04:05MASTER7NORMAL${normalSecret}member_1`));
});

test('META request builder rejects undocumented fields and malformed transactional values', () => {
  const common = { operatorId: 'MASTER7NORMAL', secretKey: normalSecret, now: fixed };
  assert.throws(() => buildMetaRequest('GetGameList', { ...common, fields: { Currency: 'MYR' } }), /invalid_meta_request/);
  assert.throws(() => buildMetaRequest('Deposit', { ...common,
    fields: { PlayerId: 'member_1', Amount: '-1.00', ReferenceId: 'deposit-1' } }), /invalid_meta_request/);
  assert.throws(() => buildMetaRequest('FlagLog', { ...common,
    fields: { TransactionIds: [1, 1] } }), /invalid_meta_request/);
  assert.throws(() => buildMetaRequest('UnknownMethod', common), /invalid_meta_request/);
});

test('META normal and free accounts remain distinct and public status never contains secrets', () => {
  assert.equal(metaAccount(baseEnv, 'normal').operatorId, 'MASTER7NORMAL');
  assert.equal(metaAccount(baseEnv, 'free').operatorId, 'MASTER7FREE');
  const status = publicMetaAccountStatus(baseEnv);
  assert.deepEqual(status, {
    normal: { configured: true, currency: 'MYR' },
    free: { configured: true, currency: 'MYR' },
  });
  assert.equal(JSON.stringify(status).includes(normalSecret), false);
  assert.throws(() => metaAccount({ ...baseEnv, META_GAMING_FREE_SECRET_KEY: '' }, 'free'),
    /meta_account_not_configured/);
});

test('META catalogue parser projects only documented public game fields', () => {
  const parsed = parseMetaCatalogueResponse({
    Status: 200,
    Description: 'Success',
    ResponseDateTime: '2026-11-10 03:04:06',
    Game: [{
      GameCode: '10001', GameName: 'Example Slot', GameType: 1,
      ImageUrl: 'https://cdn.example.test/10001.png', HasDemo: true,
      ProviderPrivateField: 'must-not-leak',
    }],
    SecretEcho: 'must-not-leak',
  });
  assert.deepEqual(parsed.games, [{
    gameCode: '10001', name: 'Example Slot', gameType: 1,
    imageUrl: null, hasDemo: true, maintenance: true,
  }]);
  assert.equal(JSON.stringify(parsed).includes('must-not-leak'), false);
  assert.throws(() => parseMetaCatalogueResponse({
    Status: 200, Description: 'Success', ResponseDateTime: '2026-11-10 03:04:06',
    Game: [{ GameCode: '1', GameName: 'Bad', GameType: 1, ImageUrl: 'http://bad.test/a.png', HasDemo: true }],
  }), /invalid_meta_response/);
  assert.throws(() => parseMetaCatalogueResponse({
    Status: 200, Description: 'Success', ResponseDateTime: '2026-11-10 03:04:06',
    Game: [
      { GameCode: '1', GameName: 'One', GameType: 1, ImageUrl: '', HasDemo: true },
      { GameCode: '1', GameName: 'Duplicate', GameType: 1, ImageUrl: '', HasDemo: false },
    ],
  }), /invalid_meta_response/);
  assert.throws(() => parseMetaCatalogueResponse({
    Status: 200, Description: 'Success', ResponseDateTime: '2026-11-10 03:04:06',
    Game: Array.from({ length: MAX_META_GAMES + 1 }, (_, index) => ({
      GameCode: String(index), GameName: `Game ${index}`, GameType: 1, ImageUrl: '', HasDemo: false,
    })),
  }), /invalid_meta_response/);
});

test('KickPlayer success is never represented as final closure', () => {
  const parsed = parseMetaKickResponse({
    Status: 200, Description: 'Success', ResponseDateTime: '2026-11-10 03:04:06',
  });
  assert.equal(parsed.kickAccepted, true);
  assert.equal(parsed.closureFinal, false);
  assert.match(parsed.closureReason, /temporary/);
});

test('transfer-status response is strict and safely projected', () => {
  const parsed = parseMetaTransferStatusResponse({
    Status: 200, Description: 'Success', ResponseDateTime: '2026-11-10 03:04:06',
    Trans: { TranId: '123456', Amount: '10.00', PrevBalance: '2.00', NewBalance: '12.00', Extra: 'hidden' },
  });
  assert.deepEqual(parsed.transaction, {
    transactionId: '123456', amount: '10.00', previousBalance: '2.00', newBalance: '12.00',
  });
  assert.throws(() => parseMetaTransferStatusResponse({
    Status: 200, Description: 'Success', ResponseDateTime: 'not-a-date', Trans: {},
  }), /invalid_meta_response/);
});

test('read-only META catalogue route selects normal/free credentials and returns a safe projection', async () => {
  const sent = [];
  const app = makeApp({ env: baseEnv, now: () => fixed, fetchImpl: async (url, options) => {
    sent.push({ url, body: JSON.parse(options.body) });
    return Response.json({
      Status: 200, Description: 'Success', ResponseDateTime: '2026-11-10 03:04:06',
      Game: [{ GameCode: '10001', GameName: 'Example Slot', GameType: 1,
        ImageUrl: 'https://cdn.example.test/10001.png', HasDemo: false, Internal: 'hidden' }],
    });
  } });
  for (const [name, id, secret] of [
    ['normal', 'MASTER7NORMAL', normalSecret], ['free', 'MASTER7FREE', freeSecret],
  ]) {
    const response = await request(app, `/providers/metagaming/games?account=${name}`);
    assert.equal(response.status, 200);
    assert.equal(response.data.provider, 'metagaming');
    assert.equal(response.data.apiVersion, '3.4.8');
    assert.equal(response.data.account, name);
    assert.equal(response.data.games[0].gameCode, '10001');
    assert.equal(response.data.games[0].maintenance, true);
    assert.equal(JSON.stringify(response.data).includes('hidden'), false);
    const outbound = sent.at(-1);
    assert.equal(outbound.url, 'https://smapi.xystem138.com/api/opgateway/v1/op/GetGameList');
    assert.deepEqual(Object.keys(outbound.body), ['OperatorId', 'RequestDateTime', 'Signature']);
    assert.equal(outbound.body.OperatorId, id);
    assert.equal(outbound.body.Signature,
      md5(`GetGameList2026-11-10 03:04:05${id}${secret}`));
  }
});

test('META HTTP rejection is classified without parsing or exposing its body', async () => {
  const app = makeApp({ env: baseEnv, fetchImpl: async () => new Response('<html>allowlist denied secret</html>', {
    status: 403, headers: { 'content-type': 'text/html' },
  }) });
  const response = await request(app, '/providers/metagaming/games?account=normal');
  assert.deepEqual(response, { status: 502, data: {
    error: 'metagaming_catalogue_failed', account: 'normal', upstreamStatus: 403, providerStatus: null,
  } });
  assert.equal(JSON.stringify(response.data).includes('secret'), false);
});

test('META catalogue rejects unknown or unconfigured accounts before provider traffic', async () => {
  let calls = 0;
  const app = makeApp({ env: {}, fetchImpl: async () => { calls++; throw new Error('must not call provider'); } });
  assert.equal((await request(app, '/providers/metagaming/games?account=bonus')).status, 400);
  assert.equal((await request(app, '/providers/metagaming/games?account=normal')).status, 503);
  assert.equal(calls, 0);
});

const tokenValues = Object.freeze({
  PLATFORM_METAGAMING_PLAYER_TOKEN: 'p'.repeat(48),
  PLATFORM_METAGAMING_WALLET_TOKEN: 'w'.repeat(48),
  PLATFORM_METAGAMING_RECOVERY_TOKEN: 'r'.repeat(48),
  PLATFORM_METAGAMING_REPORT_TOKEN: 'l'.repeat(48),
});
const runtimeFlags = Object.freeze(Object.fromEntries([
  'PLAYER', 'LAUNCH', 'BALANCE', 'TRANSFER', 'TRANSFER_STATUS', 'KICK', 'UNFINISHED_ROUND', 'REPORT', 'FLAG_LOG',
].map(name => [`META_GAMING_${name}_ENABLED`, 'true'])));
const runtimeRoutes = Object.freeze([
  ['/platform/metagaming/player', tokenValues.PLATFORM_METAGAMING_PLAYER_TOKEN],
  ['/platform/metagaming/launch', tokenValues.PLATFORM_METAGAMING_PLAYER_TOKEN],
  ['/platform/metagaming/balance', tokenValues.PLATFORM_METAGAMING_PLAYER_TOKEN],
  ['/platform/metagaming/deposit', tokenValues.PLATFORM_METAGAMING_WALLET_TOKEN],
  ['/platform/metagaming/withdraw', tokenValues.PLATFORM_METAGAMING_WALLET_TOKEN],
  ['/platform/metagaming/transfer-status', tokenValues.PLATFORM_METAGAMING_WALLET_TOKEN],
  ['/platform/metagaming/kick', tokenValues.PLATFORM_METAGAMING_RECOVERY_TOKEN],
  ['/platform/metagaming/unfinished-rounds', tokenValues.PLATFORM_METAGAMING_RECOVERY_TOKEN],
  ['/platform/metagaming/reports', tokenValues.PLATFORM_METAGAMING_REPORT_TOKEN],
  ['/platform/metagaming/flag-log', tokenValues.PLATFORM_METAGAMING_REPORT_TOKEN],
]);

test('META runtime routes are compiled but make zero provider calls while switches are off', async () => {
  const env = { ...baseEnv, ...tokenValues };
  const readiness = metaGamingReadiness(env);
  assert.equal(readiness.scope, 'catalogue_and_gated_runtime');
  for (const capability of Object.values(readiness.capabilities)) {
    assert.equal(capability.routeImplemented, true);
    assert.equal(capability.configurationReady, false);
    assert.ok(capability.blockers.includes('capability_switch_off'));
    assert.equal(capability.liveReady, false);
  }
  let calls = 0;
  const app = makeApp({ env, fetchImpl: async () => { calls++; throw new Error('must not call provider'); } });
  for (const [path, token] of runtimeRoutes) {
    assert.equal((await request(app, path, { method: 'POST', token, body: {} })).status, 503, path);
  }
  assert.equal(calls, 0);
});

test('META runtime enforces peer-token and profile/account isolation before provider traffic', async () => {
  const env = { ...baseEnv, ...tokenValues, ...runtimeFlags };
  const readiness = metaGamingReadiness(env);
  for (const capability of Object.values(readiness.capabilities)) {
    assert.equal(capability.routeImplemented, true);
    assert.equal(capability.configurationReady, true);
    assert.equal(capability.productionQa, 'not_verified');
    assert.equal(capability.liveReady, false);
  }
  assert.equal(metaGamingPeerCredential(env, 'PLATFORM_METAGAMING_PLAYER_TOKEN'), tokenValues.PLATFORM_METAGAMING_PLAYER_TOKEN);
  assert.equal(metaGamingPeerCredential({ ...env,
    PLATFORM_METAGAMING_PLAYER_TOKEN: tokenValues.PLATFORM_METAGAMING_WALLET_TOKEN,
  }, 'PLATFORM_METAGAMING_PLAYER_TOKEN'), '');
  let calls = 0;
  const app = makeApp({ env, fetchImpl: async () => { calls++; throw new Error('must not call provider'); } });
  assert.equal((await request(app, '/platform/metagaming/player', { method: 'POST',
    token: tokenValues.PLATFORM_METAGAMING_WALLET_TOKEN,
    body: { profileId: 'metagaming_normal_myr', account: 'normal', playerId: 'member_1' } })).status, 401);
  assert.equal((await request(app, '/platform/metagaming/player', { method: 'POST',
    token: tokenValues.PLATFORM_METAGAMING_PLAYER_TOKEN,
    body: { profileId: 'metagaming_normal_myr', account: 'free', playerId: 'member_1' } })).status, 400);
  assert.equal((await request(app, '/platform/metagaming/player', { method: 'POST',
    token: tokenValues.PLATFORM_METAGAMING_PLAYER_TOKEN,
    body: { profileId: 'metagaming_normal_myr', account: 'normal', playerId: 'member_1', apiUrl: 'https://attacker.test' } })).status, 400);
  const missing = makeApp({ env: { ...env, META_GAMING_FREE_SECRET_KEY: '' },
    fetchImpl: async () => { calls++; throw new Error('must not call provider'); } });
  assert.equal((await request(missing, '/platform/metagaming/player', { method: 'POST',
    token: tokenValues.PLATFORM_METAGAMING_PLAYER_TOKEN,
    body: { profileId: 'metagaming_free_myr', account: 'free', playerId: 'member_1' } })).status, 503);
  assert.equal(calls, 0);
});

test('META runtime routes sign exact documented methods and return only safe projections', async () => {
  const sent = [];
  const common = { Status: 200, Description: 'Success', ResponseDateTime: '2026-11-10 03:04:06' };
  const env = { ...baseEnv, ...tokenValues, ...runtimeFlags };
  const app = makeApp({ env, now: () => fixed, fetchImpl: async (url, options) => {
    const method = new URL(url).pathname.split('/').at(-1), payload = JSON.parse(options.body);
    sent.push({ url, method, payload });
    if (method === 'GameLogin') return Response.json({ ...common, Url: 'https://games.example.test/play?session=fixture' });
    if (['CheckBalance', 'Deposit', 'Withdraw'].includes(method)) return Response.json({ ...common, CurrentBalance: '12.3400', Currency: 'MYR' });
    if (method === 'CheckTransferStatus') return Response.json({ ...common,
      Trans: { TranId: '778899', Amount: '1.25', PrevBalance: '11.09', NewBalance: '12.34', Private: 'hidden' } });
    if (method === 'GetUnfinishRound') return Response.json({ ...common,
      Rounds: [{ RoundId: 'round-1', GameId: '10001', GameName: 'Fixture Slot', Turnover: '1.25', Private: 'hidden' }] });
    if (method === 'PullLog') return Response.json({ ...common, Logs: [{ TranId: 5511, PlayerId: 'member_1',
      Turnover: '1.25', ValidTurnover: '1.25', Payout: '2.00', WinLose: '0.75',
      TranDt: '2026-11-10T03:00:00Z', TranType: 0, GameCode: '10001', GameType: 1,
      GameName: 'Fixture Slot', Private: 'hidden' }] });
    return Response.json({ ...common, Private: 'hidden' });
  } });
  const normal = { profileId: 'metagaming_normal_myr', account: 'normal' };
  const free = { profileId: 'metagaming_free_myr', account: 'free' };
  const cases = [
    ['/platform/metagaming/player', tokenValues.PLATFORM_METAGAMING_PLAYER_TOKEN, { ...normal, playerId: 'member_1' }, 'player'],
    ['/platform/metagaming/launch', tokenValues.PLATFORM_METAGAMING_PLAYER_TOKEN, { ...normal, playerId: 'member_1', ip: '203.0.113.8', gameCode: '10001', language: 'en', returnUrl: 'https://www.master7.best/games', demo: false }, 'launch'],
    ['/platform/metagaming/balance', tokenValues.PLATFORM_METAGAMING_PLAYER_TOKEN, { ...free, playerId: 'member_1' }, 'balance'],
    ['/platform/metagaming/deposit', tokenValues.PLATFORM_METAGAMING_WALLET_TOKEN, { ...normal, playerId: 'member_1', amount: '1.25', referenceId: 'deposit-1' }, 'deposit'],
    ['/platform/metagaming/withdraw', tokenValues.PLATFORM_METAGAMING_WALLET_TOKEN, { ...normal, playerId: 'member_1', amount: '1.25', referenceId: 'withdraw-1' }, 'withdraw'],
    ['/platform/metagaming/transfer-status', tokenValues.PLATFORM_METAGAMING_WALLET_TOKEN, { ...normal, playerId: 'member_1', referenceId: 'deposit-1', transferType: 'deposit' }, 'transfer-status'],
    ['/platform/metagaming/kick', tokenValues.PLATFORM_METAGAMING_RECOVERY_TOKEN, { ...normal, playerId: 'member_1' }, 'kick'],
    ['/platform/metagaming/unfinished-rounds', tokenValues.PLATFORM_METAGAMING_RECOVERY_TOKEN, { ...normal, playerId: 'member_1' }, 'unfinished-rounds'],
    ['/platform/metagaming/reports', tokenValues.PLATFORM_METAGAMING_REPORT_TOKEN, { ...normal }, 'reports'],
    ['/platform/metagaming/flag-log', tokenValues.PLATFORM_METAGAMING_REPORT_TOKEN, { ...normal, transactionIds: [5511] }, 'flag-log'],
  ];
  for (const [path, token, body, operation] of cases) {
    const response = await request(app, path, { method: 'POST', token, body });
    assert.equal(response.status, 200, path);
    assert.equal(response.data.provider, 'metagaming');
    assert.equal(response.data.profileId, body.profileId);
    assert.equal(response.data.account, body.account);
    assert.equal(response.data.operation, operation);
    assert.equal(JSON.stringify(response.data).includes('hidden'), false);
  }
  assert.equal(sent.length, cases.length);
  const launch = sent.find(item => item.method === 'GameLogin');
  assert.equal(launch.payload.OperatorId, 'MASTER7NORMAL');
  assert.equal(launch.payload.Currency, 'MYR');
  assert.equal(launch.payload.Lang, 'en-us');
  assert.equal(launch.payload.Signature, md5(`GameLogin2026-11-10 03:04:05MASTER7NORMAL${normalSecret}member_1`));
  const balance = sent.find(item => item.method === 'CheckBalance');
  assert.equal(balance.payload.OperatorId, 'MASTER7FREE');
  assert.equal(balance.payload.Signature, md5(`CheckBalance2026-11-10 03:04:05MASTER7FREE${freeSecret}member_1`));
  const status = sent.find(item => item.method === 'CheckTransferStatus');
  assert.equal(status.payload.Signature, md5(`CheckTransferStatus2026-11-10 03:04:05MASTER7NORMAL${normalSecret}member_1deposit-11`));
  assert.deepEqual(sent.find(item => item.method === 'FlagLog').payload.TransactionIds, [5511]);
});

test('META runtime fails closed on currency mismatch, malformed success and HTTP rejection', async () => {
  const env = { ...baseEnv, ...tokenValues, ...runtimeFlags };
  let mode = 'currency';
  const app = makeApp({ env, fetchImpl: async () => {
    if (mode === 'http') return new Response('<html>provider secret</html>', { status: 403 });
    if (mode === 'launch') return Response.json({ Status: 200, Description: 'Success',
      ResponseDateTime: '2026-11-10 03:04:06', Url: 'http://insecure.example.test' });
    return Response.json({ Status: 200, Description: 'Success', ResponseDateTime: '2026-11-10 03:04:06',
      CurrentBalance: '1.00', Currency: 'USD' });
  } });
  const base = { profileId: 'metagaming_normal_myr', account: 'normal', playerId: 'member_1' };
  let response = await request(app, '/platform/metagaming/balance', { method: 'POST',
    token: tokenValues.PLATFORM_METAGAMING_PLAYER_TOKEN, body: base });
  assert.equal(response.status, 502);assert.equal(response.data.error, 'metagaming_currency_mismatch');
  mode = 'launch';
  response = await request(app, '/platform/metagaming/launch', { method: 'POST',
    token: tokenValues.PLATFORM_METAGAMING_PLAYER_TOKEN,
    body: { ...base, ip: '203.0.113.8', gameCode: '10001', language: 'en', returnUrl: 'https://www.master7.best/games' } });
  assert.equal(response.status, 502);assert.equal(response.data.error, 'metagaming_response_invalid');
  mode = 'http';
  response = await request(app, '/platform/metagaming/player', { method: 'POST',
    token: tokenValues.PLATFORM_METAGAMING_PLAYER_TOKEN, body: base });
  assert.equal(response.status, 502);assert.equal(response.data.error, 'metagaming_operation_failed');
  assert.equal(JSON.stringify(response.data).includes('secret'), false);
});
