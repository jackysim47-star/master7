'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');
const { makeApp } = require('./server');
const { gspayPeerCredential, gspayReadiness } = require('./readiness');
const { paymentOrderSignature, paymentSignature } = require('./gspay');

const orderToken = 'G'.repeat(48);
const queryToken = 'H'.repeat(48);
const callbackToken = 'I'.repeat(48);
const env = {
  PUBLIC_BASE_URL: 'https://gateway.example.test',
  GSPAY_MODE: 'uat',
  GSPAY_OPERATOR_AUTH_KEY: 'fixture-authentication-key',
  GSPAY_OPERATOR_SECRET_KEY: 'fixture-secret-key',
  PLATFORM_GSPAY_ORDER_TOKEN: orderToken,
  PLATFORM_GSPAY_QUERY_TOKEN: queryToken,
  PLATFORM_GSPAY_CALLBACK_TOKEN: callbackToken,
  GSPAY_MYR_ORDERS_ENABLED: 'true',
  GSPAY_MYR_QUERIES_ENABLED: 'true',
  GSPAY_MYR_CALLBACKS_ENABLED: 'true',
  GSPAY_PAYMENT_FORWARD_URL: 'https://portal.example.test/api/v1/payment-callbacks/gspay/payment',
  GSPAY_DUITNOW_FORWARD_URL: 'https://portal.example.test/api/v1/payment-callbacks/gspay/duitnow',
};

async function request(app, path, { method = 'GET', token, payload } = {}) {
  const server = http.createServer(app);
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  try {
    const response = await fetch(`http://127.0.0.1:${server.address().port}${path}`, {
      method,
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(payload === undefined ? {} : { 'Content-Type': 'application/json' }),
      },
      ...(payload === undefined ? {} : { body: JSON.stringify(payload) }),
    });
    return { status: response.status, text: await response.text() };
  } finally {
    await new Promise(resolve => server.close(resolve));
  }
}

test('GSPAY status and peer configuration expose active routes without claiming live acceptance', async () => {
  let calls = 0;
  const app = makeApp({ env: { ...env, GSPAY_BASE_URL: 'https://attacker.example.test' }, fetchImpl: async () => {
    calls++;
    throw Error('must not call upstream');
  } });
  const status = await request(app, '/providers/gspay/status');
  assert.equal(status.status, 200);
  const publicData = JSON.parse(status.text);
  assert.deepEqual({
    provider: publicData.provider,
    configured: publicData.configured,
    active: publicData.transactionRoutesActive,
    qa: publicData.productionQa,
    live: publicData.liveReady,
  }, { provider: 'gspay', configured: true, active: true, qa: 'not_verified', live: false });
  assert.equal((await request(app, '/platform/gspay/config')).status, 401);
  const config = await request(app, '/platform/gspay/config', { token: queryToken });
  assert.equal(config.status, 200);
  const privateData = JSON.parse(config.text);
  assert.equal(privateData.providerBase, 'https://api.thegspay.com');
  assert.deepEqual(privateData.contract.providerServerIps, ['52.221.96.227']);
  assert.ok(privateData.contract.confirmed.includes('myr_query_request'));
  assert.equal(privateData.transactionRoutesActive, true);
  assert.equal(privateData.createProgramReady, true);
  assert.equal(privateData.orderReady, true);
  assert.equal(privateData.queryReady, true);
  assert.equal(privateData.callbacksReady, true);
  for (const secret of [env.GSPAY_OPERATOR_AUTH_KEY, env.GSPAY_OPERATOR_SECRET_KEY,
    orderToken, queryToken, callbackToken, 'attacker.example.test']) {
    assert.equal((status.text + config.text).includes(secret), false);
  }
  assert.equal(calls, 0);
});

test('all GSPAY money routes remain closed without provider or wallet traffic', async () => {
  let calls = 0;
  const closed = { ...env, GSPAY_MYR_ORDERS_ENABLED: 'false', GSPAY_MYR_QUERIES_ENABLED: 'false', GSPAY_MYR_CALLBACKS_ENABLED: 'false' };
  const app = makeApp({ env: closed, fetchImpl: async () => {
    calls++;
    return new Response('SUCCESS');
  } });
  const cases = [
    ['/platform/gspay/order', orderToken, { transactionId: 'order_1', amount: '10.00' }],
    ['/platform/gspay/order-query', queryToken, { transactionId: 'order_1' }],
    ['/callbacks/gspay/payment', null, { success: true, completed: true, signature: '0'.repeat(32) }],
    ['/callbacks/gspay/duitnow', null, { status: 2, signature: '0'.repeat(32) }],
  ];
  for (const [path, token, payload] of cases) {
    const response = await request(app, path, { method: 'POST', token, payload });
    assert.equal(response.status, 503, path);
    assert.equal(response.text, path.startsWith('/callbacks/')
      ? JSON.stringify({ error: 'gspay_callback_contract_not_active' })
      : JSON.stringify({ error: path.endsWith('order-query') ? 'gspay_queries_disabled' : 'gspay_orders_disabled' }));
    assert.equal(response.text.includes('SUCCESS'), false);
  }
  assert.equal(calls, 0);
});

test('confirmed GSPAY create contract reaches only the pinned supplier and projects a checkout', async () => {
  let calls = 0;
  const paymentId = '35802335';
  const paymentUrl = `https://secured.gspay.online/channel?id=${paymentId}&key=${'a'.repeat(32)}`;
  const app = makeApp({ env, fetchImpl: async (url, init) => {
    calls++;
    assert.equal(url, `https://api.thegspay.com/v2/integrations/operators/${encodeURIComponent(env.GSPAY_OPERATOR_AUTH_KEY)}/payment`);
    assert.equal(init.method, 'POST');
    return Response.json({ code: 200, data: JSON.stringify([{ payment_id: paymentId, payment_url: paymentUrl }]), message: 'ok' });
  } });
  const response = await request(app, '/platform/gspay/order', {
    method: 'POST', token: orderToken,
    payload: { transactionId: 'M7ORDER_00000001', playerUsername: 'm7fixture', amount: '15.00', currency: 'MYR', contract: 'gspay-myr-create-v1' },
  });
  assert.equal(response.status, 200);
  const data = JSON.parse(response.text);
  assert.equal(data.result.paymentId, paymentId);
  assert.equal(data.result.paymentUrl, paymentUrl);
  assert.equal(data.result.fundsProcessed, false);
  assert.equal(calls, 1);
});

test('GSPAY create rejects malformed input before the provider', async () => {
  let calls = 0;
  const invalid = makeApp({ env, fetchImpl: async () => { calls++; throw Error('must not call provider'); } });
  const bad = await request(invalid, '/platform/gspay/order', { method: 'POST', token: orderToken,
    payload: { transactionId: 'bad', playerUsername: 'BAD USER', amount: '1e2', currency: 'USD', contract: 'wrong' } });
  assert.equal(bad.status, 400);
  assert.equal(calls, 0);
});

test('GSPAY provider-compatible bridge signs orders, queries and callbacks across the trust boundary', async () => {
  const transactionId = 'G7NETWORKBRIDGE0001';
  const playerUsername = 'm7fixture';
  const amount = '15.00';
  const paymentId = '35802335';
  const paymentUrl = `https://secured.gspay.online/channel?id=${paymentId}&key=${'a'.repeat(32)}`;
  let providerOrders = 0;
  let providerQueries = 0;
  let walletCallbacks = 0;
  const app = makeApp({ env, fetchImpl: async (url, init) => {
    const target = new URL(url);
    if (target.origin === 'https://api.thegspay.com' && target.pathname.endsWith('/payment')) {
      providerOrders++;
      const body = JSON.parse(init.body);
      assert.equal(body.signature, paymentOrderSignature({ transactionId, playerUsername, amount }, env.GSPAY_OPERATOR_SECRET_KEY));
      return Response.json({ code: 200, data: JSON.stringify([{ payment_id: paymentId, payment_url: paymentUrl }]), message: 'ok' });
    }
    if (target.origin === 'https://api.thegspay.com' && target.pathname.endsWith('/getpayment')) {
      providerQueries++;
      const providerResult = {
        payment_id: paymentId,
        transaction_id: transactionId,
        player_username: playerUsername,
        amount,
        completed: true,
        success: true,
        remark: 'paid',
      };
      providerResult.signature = paymentSignature({ paymentId, amount, transactionId }, env.GSPAY_OPERATOR_SECRET_KEY);
      return Response.json({ code: 200, data: providerResult, message: 'ok' });
    }
    if (url === env.GSPAY_PAYMENT_FORWARD_URL) {
      walletCallbacks++;
      assert.equal(init.headers.Authorization, `Bearer ${callbackToken}`);
      const forwarded = JSON.parse(init.body);
      assert.equal(forwarded.auth_key, orderToken);
      assert.equal(forwarded.signature, paymentSignature({ paymentId, amount, transactionId }, queryToken));
      return new Response('ok');
    }
    throw Error(`unexpected upstream ${url}`);
  } });

  const internalOrder = {
    transaction_id: transactionId,
    player_username: playerUsername,
    amount,
    signature: paymentOrderSignature({ transactionId, playerUsername, amount }, queryToken),
  };
  const created = await request(app, `/v2/integrations/operators/${encodeURIComponent(orderToken)}/payment`, {
    method: 'POST', payload: internalOrder,
  });
  assert.equal(created.status, 200);
  assert.equal(JSON.parse(JSON.parse(created.text).data)[0].payment_id, paymentId);

  const queried = await request(app, `/v2/integrations/operators/${encodeURIComponent(orderToken)}/getpayment?auth_key=${encodeURIComponent(orderToken)}&transaction_id=${transactionId}`);
  assert.equal(queried.status, 200);
  const queryData = JSON.parse(queried.text).data;
  assert.equal(queryData.success, true);
  assert.equal(queryData.signature, paymentSignature({ paymentId, amount, transactionId }, queryToken));

  const callback = {
    auth_key: env.GSPAY_OPERATOR_AUTH_KEY,
    success: true,
    completed: true,
    payment_id: paymentId,
    transaction_id: transactionId,
    player_username: playerUsername,
    amount,
    remark: 'paid',
    signature: paymentSignature({ paymentId, amount, transactionId }, env.GSPAY_OPERATOR_SECRET_KEY),
  };
  const notified = await request(app, '/callbacks/gspay/payment', { method: 'POST', payload: callback });
  assert.equal(notified.status, 200);
  assert.equal(notified.text, 'ok');
  assert.deepEqual({ providerOrders, providerQueries, walletCallbacks }, { providerOrders: 1, providerQueries: 1, walletCallbacks: 1 });
});

test('GSPAY platform routes use isolated per-capability credentials', async () => {
  const app = makeApp({ env, fetchImpl: async () => { throw Error('must not call upstream'); } });
  assert.equal((await request(app, '/platform/gspay/order', { method: 'POST', token: queryToken, payload: {} })).status, 401);
  assert.equal((await request(app, '/platform/gspay/order-query', { method: 'POST', token: orderToken, payload: {} })).status, 401);

  for (const name of ['PLATFORM_GSPAY_ORDER_TOKEN', 'PLATFORM_GSPAY_QUERY_TOKEN', 'PLATFORM_GSPAY_CALLBACK_TOKEN']) {
    assert.equal(gspayPeerCredential({ ...env, [name]: env.PLATFORM_ORDER_TOKEN || orderToken }, name), name === 'PLATFORM_GSPAY_ORDER_TOKEN' ? orderToken : '');
  }
  assert.equal(gspayPeerCredential({ ...env, GATEWAY_ADMIN_TOKEN: queryToken }, 'PLATFORM_GSPAY_QUERY_TOKEN'), '');
  assert.equal(gspayPeerCredential({ ...env, PLATFORM_QUERY_TOKEN: queryToken }, 'PLATFORM_GSPAY_QUERY_TOKEN'), '');
  assert.equal(gspayPeerCredential({ ...env, GSPAY_OPERATOR_SECRET_KEY: callbackToken }, 'PLATFORM_GSPAY_CALLBACK_TOKEN'), '');
});

test('GSPAY readiness separates configured routes from paid settlement acceptance', () => {
  const result = gspayReadiness(env);
  assert.equal(result.credentialsConfigured, true);
  for (const channel of Object.values(result.channels)) {
    assert.equal(channel.enabled, true);
    assert.equal(channel.configurationReady, true);
    assert.equal(channel.liveReady, false);
    assert.ok(channel.blockers.includes('supplier_uat_not_verified'));
  }
  assert.equal(result.channels.orders.programReady, true);
  assert.equal(result.channels.orders.routeReady, true);
  assert.equal(result.channels.queries.programReady, true);
  assert.equal(result.channels.queries.routeReady, true);
  assert.equal(result.channels.callbacks.routeReady, true);
  assert.deepEqual(result.contract.unconfirmed, ['master7_paid_settlement_acceptance']);
  assert.equal(gspayReadiness({ ...env, GSPAY_MODE: env.GSPAY_OPERATOR_SECRET_KEY }).mode, 'disabled');
  assert.equal(gspayReadiness({ ...env, GATEWAY_ADMIN_TOKEN: env.GSPAY_OPERATOR_SECRET_KEY }).credentialsConfigured, false);
});

test('GSPAY callback discovery is reachable but explicitly inactive', async () => {
  const app = makeApp({ env: {}, fetchImpl: async () => { throw Error('must not call upstream'); } });
  for (const kind of ['payment', 'duitnow']) {
    const response = await request(app, `/callbacks/gspay/${kind}`);
    assert.equal(response.status, 200);
    assert.deepEqual(JSON.parse(response.text), {
      ok: true, provider: 'gspay', callback: kind, active: false, productionQa: 'not_verified',
    });
  }
});
