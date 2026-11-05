'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const http = require('node:http');
const { makeApp } = require('./server');
const { gamePeerCredential, gameWalletCredential, megah5TransferReadiness } = require('./readiness');

const gameToken = 'g'.repeat(48);
const walletToken = 'w'.repeat(48);
const fixed = new Date('2026-11-06T02:30:00Z');
const baseEnv = {
  PLATFORM_GAME_TOKEN: gameToken,
  PLATFORM_GAME_WALLET_TOKEN: walletToken,
  MEGA_OPERATOR_ID: 'master7',
  MEGA_SECRET_KEY: 'provider-fixture-secret-key',
  MEGA_BASE_URL: 'https://provider.example.test/api/opgateway/v1/op',
  CURRENCY: 'MYR',
};

function md5(value) {
  return crypto.createHash('md5').update(value, 'utf8').digest('hex');
}

async function request(app, path, { token, body = {} } = {}) {
  const server = http.createServer(app);
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  try {
    const response = await fetch(`http://127.0.0.1:${server.address().port}${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      body: JSON.stringify(body),
    });
    return { status: response.status, data: await response.json() };
  } finally {
    await new Promise(resolve => server.close(resolve));
  }
}

test('MegaH5 game and transfer credentials are separate and reject privileged aliases', async () => {
  assert.equal(gamePeerCredential(baseEnv), gameToken);
  assert.equal(gameWalletCredential(baseEnv), walletToken);
  assert.equal(gameWalletCredential({ ...baseEnv, PLATFORM_GAME_WALLET_TOKEN: gameToken }), '');
  assert.equal(gameWalletCredential({ ...baseEnv, PLATFORM_GAME_WALLET_TOKEN: baseEnv.MEGA_SECRET_KEY }), '');
  assert.equal(gameWalletCredential({ ...baseEnv, PLATFORM_GAME_WALLET_TOKEN: 'x'.repeat(31) }), '');

  let calls = 0;
  const env = { ...baseEnv, MEGA_TRANSFERS_ENABLED: 'true' };
  const app = makeApp({ env, fetchImpl: async () => { calls++; throw new Error('must not call provider'); } });
  const transfer = await request(app, '/platform/megah5/deposit', {
    token: gameToken, body: { playerId: 'member_1', amount: '1.00', referenceId: 'deposit-1' },
  });
  assert.equal(transfer.status, 401);
  const session = await request(app, '/platform/megah5/session', {
    token: walletToken, body: { playerId: 'member_1', gameCode: '55021', ip: '203.0.113.8' },
  });
  assert.equal(session.status, 401);
  const balance = await request(app, '/platform/megah5/balance', {
    token: walletToken, body: { playerId: 'member_1' },
  });
  assert.equal(balance.status, 401);
  assert.equal(calls, 0);
});

test('MegaH5 money and transfer-status routes make zero provider calls while switches are off', async () => {
  let calls = 0;
  const app = makeApp({ env: baseEnv, fetchImpl: async () => { calls++; throw new Error('must not call provider'); } });
  for (const [path, body] of [
    ['/platform/megah5/deposit', { playerId: 'member_1', amount: '1.00', referenceId: 'deposit-1' }],
    ['/platform/megah5/withdraw', { playerId: 'member_1', amount: '1.00', referenceId: 'withdraw-1' }],
    ['/platform/megah5/transfer-status', { playerId: 'member_1', referenceId: 'deposit-1', transferType: 'deposit' }],
  ]) {
    const response = await request(app, path, { token: walletToken, body });
    assert.equal(response.status, 503, path);
  }
  assert.equal(calls, 0);
});

test('MegaH5 transfer status uses the provider-documented signature and enum', async () => {
  let sent;
  const env = { ...baseEnv, MEGA_TRANSFER_STATUS_ENABLED: 'true' };
  const app = makeApp({ env, now: () => fixed, fetchImpl: async (url, options) => {
    sent = { url, body: JSON.parse(options.body) };
    return Response.json({ Status: 200, Description: 'Success', Trans: { TranId: '123' } });
  } });
  const response = await request(app, '/platform/megah5/transfer-status', {
    token: walletToken,
    body: { playerId: 'member_123', referenceId: 'deposit-20261106-1', transferType: 'deposit' },
  });
  assert.equal(response.status, 200);
  assert.ok(sent.url.endsWith('/CheckTransferStatus'));
  assert.equal(sent.body.TransferType, 1);
  assert.equal(sent.body.ReferenceId, 'deposit-20261106-1');
  assert.equal(sent.body.Signature, md5('CheckTransferStatus2026-11-06T02:30:00Zmaster7provider-fixture-secret-keymember_123deposit-20261106-11'));

  const withdrawal = await request(app, '/platform/megah5/transfer-status', {
    token: walletToken,
    body: { playerId: 'member_123', referenceId: 'withdraw-20261106-1', transferType: 'withdrawal' },
  });
  assert.equal(withdrawal.status, 200);
  assert.equal(sent.body.TransferType, 2);
});

test('MegaH5 deposit and withdrawal require canonical positive amounts and sign only documented fields', async () => {
  const sent = [];
  const env = { ...baseEnv, MEGA_TRANSFERS_ENABLED: 'true' };
  const app = makeApp({ env, now: () => fixed, fetchImpl: async (url, options) => {
    sent.push({ url, body: JSON.parse(options.body) });
    return Response.json({ Status: 200, Description: 'Success', CurrentBalance: 1, Currency: 'MYR' });
  } });
  for (const [path, method, amount, referenceId] of [
    ['/platform/megah5/deposit', 'Deposit', '20.00', 'dep-20261106-1'],
    ['/platform/megah5/withdraw', 'Withdraw', '1.25', 'wd-20261106-1'],
  ]) {
    const response = await request(app, path, {
      token: walletToken, body: { playerId: 'member_123', amount, referenceId },
    });
    assert.equal(response.status, 200);
    const latest = sent.at(-1);
    assert.ok(latest.url.endsWith(`/${method}`));
    assert.equal(latest.body.Amount, amount);
    assert.equal(latest.body.ReferenceId, referenceId);
    assert.equal(latest.body.Signature, md5(`${method}2026-11-06T02:30:00Zmaster7provider-fixture-secret-keymember_123`));
  }
});

test('invalid MegaH5 transfer values never reach the provider', async () => {
  let calls = 0;
  const env = { ...baseEnv, MEGA_TRANSFERS_ENABLED: 'true', MEGA_TRANSFER_STATUS_ENABLED: 'true' };
  const app = makeApp({ env, fetchImpl: async () => { calls++; throw new Error('must not call provider'); } });
  for (const amount of [1, '', '0.00', '1', '1.0', '01.00', '-1.00', '0.001', '1e2', '10000000000.00']) {
    const response = await request(app, '/platform/megah5/deposit', {
      token: walletToken, body: { playerId: 'member_1', amount, referenceId: 'deposit-1' },
    });
    assert.equal(response.status, 400, String(amount));
  }
  for (const body of [
    { playerId: 'member 1', amount: '1.00', referenceId: 'deposit-1' },
    { playerId: 'member_1', amount: '1.00', referenceId: '' },
    { playerId: 'member_1', amount: '1.00', referenceId: '../bad' },
  ]) assert.equal((await request(app, '/platform/megah5/deposit', { token: walletToken, body })).status, 400);

  for (const transferType of ['', 1, 'refund', 'Deposit']) {
    const response = await request(app, '/platform/megah5/transfer-status', {
      token: walletToken, body: { playerId: 'member_1', referenceId: 'deposit-1', transferType },
    });
    assert.equal(response.status, 400);
  }
  assert.equal(calls, 0);
});

test('MegaH5 transfer readiness stays unverified even when configuration switches are on', () => {
  const ready = megah5TransferReadiness({
    ...baseEnv, MEGA_TRANSFERS_ENABLED: 'true', MEGA_TRANSFER_STATUS_ENABLED: 'true',
  });
  assert.equal(ready.mode, 'fund_transfer');
  assert.equal(ready.walletTokenConfigured, true);
  assert.equal(ready.channels.status.configurationReady, true);
  assert.equal(ready.channels.deposit.configurationReady, true);
  assert.equal(ready.channels.withdrawal.configurationReady, true);
  assert.equal(ready.channels.deposit.productionQa, 'not_verified');
  assert.equal(ready.channels.deposit.liveReady, false);
});
