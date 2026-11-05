'use strict';

const crypto = require('node:crypto');

const PROVIDER_BASE = 'https://api.thegspay.com';
const PROVIDER_SERVER_IPS = Object.freeze(['52.221.96.227']);

function text(value, name, maximum) {
  const result = typeof value === 'string' ? value : '';
  if (!result || result.length > maximum || /[\u0000-\u001f\u007f]/u.test(result)) {
    throw new TypeError(`invalid_${name}`);
  }
  return result;
}

function amount2(value) {
  const input = typeof value === 'number' && Number.isSafeInteger(value)
    ? String(value)
    : value;
  if (typeof input !== 'string' || !/^(?:0|[1-9]\d{0,7})(?:\.\d{1,2})?$/.test(input)) {
    throw new TypeError('invalid_amount');
  }
  const [whole, fraction = ''] = input.split('.');
  if (whole === '0' && !/[1-9]/.test(fraction)) throw new TypeError('invalid_amount');
  return `${whole}.${fraction.padEnd(2, '0')}`;
}

function identifier(value, name) {
  let input;
  if (typeof value === 'string') input = value;
  else if (typeof value === 'bigint' && value >= 0n) input = value.toString();
  else if (typeof value === 'number' && Number.isSafeInteger(value) && value >= 0) input = String(value);
  else throw new TypeError(`invalid_${name}`);
  return text(input, name, 128);
}

function secret(value) {
  return text(value, 'operator_secret_key', 1024);
}

function operatorKey(value) {
  const result = typeof value === 'string' ? value : '';
  const bytes = Buffer.byteLength(result, 'utf8');
  if (bytes < 16 || bytes > 1024 || result !== result.trim()
      || /[\u0000-\u0020\u007f-\u009f]/u.test(result)) {
    throw new TypeError('invalid_operator_authentication_key');
  }
  return result;
}

function md5(value) {
  return crypto.createHash('md5').update(value, 'utf8').digest('hex');
}

function safeEqual(left, right) {
  const a = Buffer.from(String(left || '').toLowerCase());
  const b = Buffer.from(String(right || '').toLowerCase());
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

function paymentOrderSignature({ transactionId, playerUsername, amount }, operatorSecretKey) {
  const raw = text(transactionId, 'transaction_id', 128)
    + text(playerUsername, 'player_username', 100)
    + amount2(amount)
    + secret(operatorSecretKey);
  return md5(raw);
}

// Offline request builders mirror the MYR contract visible in the supplier
// backoffice. They cannot be redirected to a caller-controlled provider host.
function paymentOrderRequest({ transactionId, playerUsername, amount }, operatorAuthenticationKey, operatorSecretKey) {
  const authenticationKey = operatorKey(operatorAuthenticationKey);
  const normalized = {
    transaction_id: text(transactionId, 'transaction_id', 128),
    amount: amount2(amount),
    player_username: text(playerUsername, 'player_username', 100),
  };
  normalized.signature = paymentOrderSignature({
    transactionId: normalized.transaction_id,
    playerUsername: normalized.player_username,
    amount: normalized.amount,
  }, operatorSecretKey);
  return {
    method: 'POST',
    url: `${PROVIDER_BASE}/v2/integrations/operators/${encodeURIComponent(authenticationKey)}/payment`,
    body: normalized,
  };
}

function paymentQueryRequest(transactionId, operatorAuthenticationKey) {
  const authenticationKey = operatorKey(operatorAuthenticationKey);
  const id = text(transactionId, 'transaction_id', 128);
  const url = new URL(`${PROVIDER_BASE}/v2/integrations/operators/${encodeURIComponent(authenticationKey)}/getpayment`);
  url.searchParams.set('auth_key', authenticationKey);
  url.searchParams.set('transaction_id', id);
  return { method: 'GET', url: url.href };
}

function paymentSignature({ paymentId, amount, transactionId }, operatorSecretKey) {
  const raw = identifier(paymentId, 'payment_id')
    + amount2(amount)
    + text(transactionId, 'transaction_id', 128)
    + secret(operatorSecretKey);
  return md5(raw);
}

function duitNowSignature({ dnpaymentId, amount, transactionId, status }, operatorSecretKey) {
  const normalizedStatus = typeof status === 'number' && Number.isSafeInteger(status)
    ? status
    : (typeof status === 'string' && /^(?:0|1|2|4)$/.test(status) ? Number(status) : NaN);
  if (![0, 1, 2, 4].includes(normalizedStatus)) {
    throw new TypeError('invalid_status');
  }
  const raw = identifier(dnpaymentId, 'dnpayment_id')
    + amount2(amount)
    + text(transactionId, 'transaction_id', 128)
    + String(normalizedStatus)
    + secret(operatorSecretKey);
  return md5(raw);
}

function verifyPaymentSignature(payload, operatorSecretKey) {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)
      || !/^[a-f0-9]{32}$/i.test(String(payload.signature || ''))) return false;
  try {
    return safeEqual(paymentSignature({
      paymentId: payload.payment_id,
      amount: payload.amount,
      transactionId: payload.transaction_id,
    }, operatorSecretKey), payload.signature);
  } catch { return false; }
}

function verifyDuitNowSignature(payload, operatorSecretKey) {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)
      || !/^[a-f0-9]{32}$/i.test(String(payload.signature || ''))) return false;
  try {
    return safeEqual(duitNowSignature({
      dnpaymentId: payload.dnpayment_id,
      amount: payload.amount,
      transactionId: payload.transaction_id,
      status: payload.status,
    }, operatorSecretKey), payload.signature);
  } catch { return false; }
}

function providerBoolean(value, name) {
  if (value === true || value === 1) return true;
  if (value === false || value === 0) return false;
  throw new TypeError(`invalid_${name}`);
}

function paymentStatusPayload(payload, operatorSecretKey) {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)
      || !verifyPaymentSignature(payload, operatorSecretKey)) {
    throw new TypeError('invalid_payment_status_signature');
  }
  const completed = providerBoolean(payload.completed, 'completed');
  const success = providerBoolean(payload.success, 'success');
  if (success && !completed) throw new TypeError('invalid_payment_status_state');
  if (typeof payload.remark !== 'string' || payload.remark.length > 1000
      || /[\u0000-\u001f\u007f]/u.test(payload.remark)) {
    throw new TypeError('invalid_remark');
  }
  return {
    paymentId: identifier(payload.payment_id, 'payment_id'),
    transactionId: text(payload.transaction_id, 'transaction_id', 128),
    playerUsername: text(payload.player_username, 'player_username', 100),
    amount: amount2(payload.amount),
    completed,
    success,
    remark: payload.remark,
    signature: String(payload.signature).toLowerCase(),
  };
}

module.exports = {
  PROVIDER_BASE,
  PROVIDER_SERVER_IPS,
  amount2,
  duitNowSignature,
  paymentOrderRequest,
  paymentOrderSignature,
  paymentQueryRequest,
  paymentSignature,
  paymentStatusPayload,
  verifyDuitNowSignature,
  verifyPaymentSignature,
};
