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
    imageUrl: 'https://cdn.example.test/10001.png', hasDemo: true,
  }]);
  assert.equal(JSON.stringify(parsed).includes('must-not-leak'), false);
  assert.throws(() => parseMetaCatalogueResponse({
    Status: 200, Description: 'Success', ResponseDateTime: '2026-11-10 03:04:06',
    Game: [{ GameCode: '1', GameName: 'Bad', GameType: 1, ImageUrl: 'http://bad.test/a.png', HasDemo: true }],
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
    assert.equal(JSON.stringify(response.data).includes('hidden'), false);
    const outbound = sent.at(-1);
    assert.equal(outbound.url, 'https://smapi.xystem138.com/api/opgateway/v1/op/GetGameList');
    assert.deepEqual(Object.keys(outbound.body), ['OperatorId', 'RequestDateTime', 'Signature']);
    assert.equal(outbound.body.OperatorId, id);
    assert.equal(outbound.body.Signature,
      md5(`GetGameList2026-11-10 03:04:05${id}${secret}`));
  }
});

test('META catalogue rejects unknown or unconfigured accounts before provider traffic', async () => {
  let calls = 0;
  const app = makeApp({ env: {}, fetchImpl: async () => { calls++; throw new Error('must not call provider'); } });
  assert.equal((await request(app, '/providers/metagaming/games?account=bonus')).status, 400);
  assert.equal((await request(app, '/providers/metagaming/games?account=normal')).status, 503);
  assert.equal(calls, 0);
});

test('META privileged capabilities stay unimplemented despite flags and isolated tokens', async () => {
  const tokenValues = {
    PLATFORM_METAGAMING_PLAYER_TOKEN: 'p'.repeat(48),
    PLATFORM_METAGAMING_WALLET_TOKEN: 'w'.repeat(48),
    PLATFORM_METAGAMING_RECOVERY_TOKEN: 'r'.repeat(48),
    PLATFORM_METAGAMING_REPORT_TOKEN: 'l'.repeat(48),
  };
  const flags = Object.fromEntries([
    'PLAYER', 'LAUNCH', 'BALANCE', 'TRANSFER', 'TRANSFER_STATUS', 'KICK', 'UNFINISHED_ROUND', 'REPORT', 'FLAG_LOG',
  ].map(name => [`META_GAMING_${name}_ENABLED`, 'true']));
  const env = { ...baseEnv, ...tokenValues, ...flags };
  const readiness = metaGamingReadiness(env);
  for (const capability of Object.values(readiness.capabilities)) {
    assert.equal(capability.routeImplemented, false);
    assert.equal(capability.configurationReady, false);
    assert.ok(capability.blockers.includes('route_not_implemented'));
  }
  assert.equal(metaGamingPeerCredential(env, 'PLATFORM_METAGAMING_PLAYER_TOKEN'), tokenValues.PLATFORM_METAGAMING_PLAYER_TOKEN);
  assert.equal(metaGamingPeerCredential({ ...env,
    PLATFORM_METAGAMING_PLAYER_TOKEN: tokenValues.PLATFORM_METAGAMING_WALLET_TOKEN,
  }, 'PLATFORM_METAGAMING_PLAYER_TOKEN'), '');

  let calls = 0;
  const app = makeApp({ env, fetchImpl: async () => { calls++; throw new Error('must not call provider'); } });
  for (const [path, token] of [
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
  ]) {
    assert.equal((await request(app, path, { method: 'POST', token, body: {} })).status, 404, path);
  }
  assert.equal(calls, 0);
});
