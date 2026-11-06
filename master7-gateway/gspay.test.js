'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const {
  PROVIDER_BASE,
  PROVIDER_SERVER_IPS,
  amount2,
  duitNowSignature,
  paymentOrderRequest,
  paymentOrderResponse,
  paymentOrderSignature,
  paymentQueryRequest,
  paymentSignature,
  paymentStatusPayload,
  verifyDuitNowSignature,
  verifyPaymentSignature,
} = require('./gspay');

test('GSPAY MYR amounts have one canonical two-decimal representation', () => {
  assert.equal(amount2('10'), '10.00');
  assert.equal(amount2('10.0'), '10.00');
  assert.equal(amount2('10.00'), '10.00');
  assert.equal(amount2('0.01'), '0.01');
  for (const value of ['', '0', '0.00', '-1', '+1', '01', '1.001', '1e2', 10.5, {}, null]) {
    assert.throws(() => amount2(value), /invalid_amount/);
  }
});

test('GSPAY documented payment order signature vector matches exactly', () => {
  assert.equal(paymentOrderSignature({
    transactionId: 'transaction_id',
    playerUsername: 'player_username',
    amount: '10.00',
  }, 'operator_secret_key'), '0539187f3e6c875e6e5ec0bb6897e70c');
});

test('GSPAY documented payment callback and query signature vector matches exactly', () => {
  const payload = { paymentId: 'payment_id', amount: '10.00', transactionId: 'transaction_id_' };
  const signature = paymentSignature(payload, 'operator_secret_key');
  assert.equal(signature, '2d645fc5d5bbc784a57fe34eed72b8fa');
  assert.equal(verifyPaymentSignature({
    payment_id: payload.paymentId,
    amount: payload.amount,
    transaction_id: payload.transactionId,
    signature: signature.toUpperCase(),
  }, 'operator_secret_key'), true);
});

test('GSPAY MYR order and query builders pin the documented provider host and field placement', () => {
  const authenticationKey = 'fixture authentication/key';
  assert.throws(() => paymentOrderRequest({
    transactionId: 'order_1', playerUsername: 'member1', amount: '20.00',
  }, authenticationKey, 'operator_secret_key'), /invalid_operator_authentication_key/);

  const key = 'fixture-authentication-key';
  const order = paymentOrderRequest({
    transactionId: 'order_1', playerUsername: 'member1', amount: '20',
  }, key, 'operator_secret_key');
  assert.equal(order.method, 'POST');
  assert.equal(order.url, `${PROVIDER_BASE}/v2/integrations/operators/${key}/payment`);
  assert.deepEqual(order.body, {
    transaction_id: 'order_1',
    amount: '20.00',
    player_username: 'member1',
    signature: paymentOrderSignature({ transactionId: 'order_1', playerUsername: 'member1', amount: '20.00' }, 'operator_secret_key'),
  });

  const query = paymentQueryRequest('order_1', key);
  assert.equal(query.method, 'GET');
  const url = new URL(query.url);
  assert.equal(url.origin, PROVIDER_BASE);
  assert.equal(url.pathname, `/v2/integrations/operators/${key}/getpayment`);
  assert.equal(url.searchParams.get('auth_key'), key);
  assert.equal(url.searchParams.get('transaction_id'), 'order_1');
  assert.deepEqual(PROVIDER_SERVER_IPS, ['52.221.96.227']);
});

test('tentative generic create response parser projects one pinned checkout URL', () => {
  const paymentId = '90000001';
  const paymentUrl = `https://secured.gspay.online/channel?id=${paymentId}&key=${'a'.repeat(32)}`;
  const response = paymentOrderResponse({
    code: 200,
    data: JSON.stringify([{ payment_id: paymentId, payment_url: paymentUrl }]),
    message: 'ok',
  });
  assert.deepEqual(response, {
    paymentId,
    paymentUrl,
  });
  for (const value of [
    { code: 500, data: '[]', message: 'ok' },
    { code: 200, data: '{}', message: 'ok' },
    { code: 200, data: '[{}]', message: 'ok' },
    { code: 200, data: JSON.stringify([{ payment_id: '1', payment_url: 'http://secured.gspay.online/channel?id=1&key='+'a'.repeat(32) }]), message: 'ok' },
    { code: 200, data: JSON.stringify([{ payment_id: '1', payment_url: 'https://evil.example/channel?id=1&key='+'a'.repeat(32) }]), message: 'ok' },
    { code: 200, data: JSON.stringify([{ payment_id: '1', payment_url: 'https://secured.gspay.online/channel?id=2&key='+'a'.repeat(32) }]), message: 'ok' },
  ]) assert.throws(() => paymentOrderResponse(value));
});

test('GSPAY payment status parser accepts only signed, completed-consistent payloads', () => {
  const secret = 'operator_secret_key';
  const payload = {
    payment_id: '9007199254740993',
    transaction_id: 'order_1',
    player_username: 'member1',
    amount: '20.00',
    completed: 1,
    success: true,
    remark: 'paid',
  };
  payload.signature = paymentSignature({
    paymentId: payload.payment_id, amount: payload.amount, transactionId: payload.transaction_id,
  }, secret);
  assert.deepEqual(paymentStatusPayload(payload, secret), {
    paymentId: payload.payment_id,
    transactionId: 'order_1',
    playerUsername: 'member1',
    amount: '20.00',
    completed: true,
    success: true,
    remark: 'paid',
    signature: payload.signature,
  });
  assert.throws(() => paymentStatusPayload({ ...payload, completed: false }, secret), /invalid_payment_status_state/);
  assert.throws(() => paymentStatusPayload({ ...payload, success: '1' }, secret), /invalid_success/);
  assert.throws(() => paymentStatusPayload({ ...payload, amount: '20.01' }, secret), /invalid_payment_status_signature/);
});

test('GSPAY documented DuitNow callback signature vector matches exactly', () => {
  const payload = { dnpaymentId: 'dnpayment_id', amount: '10.00', transactionId: 'transaction_id', status: 2 };
  const signature = duitNowSignature(payload, 'operator_secret_key');
  assert.equal(signature, '86c9cf2250d35f4e766becb636099236');
  assert.equal(verifyDuitNowSignature({
    dnpayment_id: payload.dnpaymentId,
    amount: payload.amount,
    transaction_id: payload.transactionId,
    status: payload.status,
    signature,
  }, 'operator_secret_key'), true);
});

test('GSPAY verifiers reject altered fields, invalid status and oversized identifiers', () => {
  const secret = 'operator_secret_key';
  const payment = { payment_id: '12345678901234567890', amount: '10.00', transaction_id: 'order_1' };
  payment.signature = paymentSignature({ paymentId: payment.payment_id, amount: payment.amount, transactionId: payment.transaction_id }, secret);
  assert.equal(verifyPaymentSignature({ ...payment, amount: '10.01' }, secret), false);
  assert.equal(verifyPaymentSignature({ ...payment, transaction_id: 'order_2' }, secret), false);
  assert.equal(verifyPaymentSignature({ ...payment, signature: 'x'.repeat(32) }, secret), false);
  assert.equal(verifyPaymentSignature({ ...payment, payment_id: '9'.repeat(129) }, secret), false);
  assert.throws(() => paymentSignature({ paymentId: 9007199254740992, amount: '1.00', transactionId: 'order' }, secret), /invalid_payment_id/);
  assert.equal(paymentSignature({ paymentId: 9007199254740993n, amount: '1.00', transactionId: 'order' }, secret),
    paymentSignature({ paymentId: '9007199254740993', amount: '1.00', transactionId: 'order' }, secret));
  for (const status of [-1, 3, 5, 1.5, 'unknown', true, null, '', '02']) {
    assert.throws(() => duitNowSignature({ dnpaymentId: '1', amount: '1.00', transactionId: 'order', status }, secret), /invalid_status/);
  }
});
