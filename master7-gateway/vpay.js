'use strict';

const crypto = require('node:crypto');

function canonicalize(fields = {}) {
  return Object.entries(fields)
    .filter(([key, value]) => key !== 'sign' && value !== '' && value !== null && value !== undefined)
    .sort(([left], [right]) => left < right ? -1 : left > right ? 1 : 0)
    .map(([key, value]) => `${key}=${String(value)}`)
    .join('&');
}

function md5Upper(value) {
  return crypto.createHash('md5').update(value, 'utf8').digest('hex').toUpperCase();
}

function formatVpayDateTime(timestampSeconds, timeZone = 'Asia/Kuala_Lumpur') {
  const date = new Date(Number(timestampSeconds) * 1000);
  if (!Number.isFinite(date.getTime())) throw new TypeError('invalid_timestamp');
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(date);
  const get = type => parts.find(part => part.type === type)?.value;
  return `${get('year')}-${get('month')}-${get('day')} ${get('hour')}:${get('minute')}:${get('second')}`;
}

function signWithDateTime(fields, apiToken, dateTime) {
  const token = String(apiToken || '');
  if (!token) throw new TypeError('missing_api_token');
  const digest = md5Upper(canonicalize(fields));
  return Buffer.from(`token=${token}&dt=${dateTime}&ap=${digest}`, 'utf8').toString('base64');
}

function vpaySignature(fields, apiToken, timestampSeconds, timeZone) {
  return signWithDateTime(fields, apiToken, formatVpayDateTime(timestampSeconds, timeZone));
}

function safeEqual(left, right) {
  const a = Buffer.from(String(left || ''));
  const b = Buffer.from(String(right || ''));
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

function verifyVpayNotification(payload, apiToken) {
  if (!payload || typeof payload !== 'object') return false;
  const dateTime = String(payload.notify_time || '');
  const supplied = String(payload.sign || '');
  if (!/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(dateTime) || !supplied) return false;
  return safeEqual(signWithDateTime(payload, apiToken, dateTime), supplied);
}

function normalizeVpayBalance(payload) {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) return null;
  const amount = value => {
    if (typeof value !== 'string' || value !== value.trim()
        || !/^(?:0|[1-9]\d{0,11})(?:\.\d{1,2})?$/.test(value)) return null;
    const [whole, fraction = ''] = value.split('.');
    return `${whole}.${fraction.padEnd(2, '0')}`;
  };
  // VPay's official TRADER_BALANCE contract returns these three fields.
  // Expose only the available merchant balance and never the raw response.
  const total = amount(payload.trader_balance);
  const available = amount(payload.trader_real_balance);
  const frozen = amount(payload.freeze_balance);
  if (!total || !available || !frozen) return null;
  return { currency: 'MYR', balance: available };
}

function classifyVpayOrderFailure(value) {
 const message=typeof value==='string'?value.trim().toLowerCase().replace(/[.!?]+$/,''):'';
 if(/(?:invalid|wrong).*sign|sign(?:ature)?\s*(?:error|failed|invalid)|签名(?:错误|失败)/.test(message))return 'vpay_invalid_signature';
 if(/invalid\s*(?:api\s*)?(?:key|token|credential)|(?:api\s*)?(?:key|token|credential).*invalid/.test(message))return 'vpay_invalid_credentials';
 const allowlist=/white[\s-]*list|allow[\s-]*list|白名单/.test(message);
 const explicitIp=/(?:^|[^a-z0-9])ip(?:v[46])?(?:_address|address)?(?:$|[^a-z0-9])/.test(message);
 if(allowlist){
  if(/callback[_ -]*url|return[_ -]*url|redirect|返回|跳转/.test(message))return 'vpay_return_url_not_allowed';
  if(/notify|notification|回调|通知/.test(message))return 'vpay_notify_url_not_allowed';
  if(/domain|hostname|域名/.test(message))return 'vpay_domain_not_allowed';
  if(explicitIp)return 'vpay_ip_not_allowed';
  return 'vpay_allowlist_rejected';
 }
 if(explicitIp&&/not.{0,12}allow|denied|不允许|未授权/.test(message))return 'vpay_ip_not_allowed';
 if(/(?:amount|minimum|maximum|金额|最低|最高)/.test(message))return 'vpay_amount_rejected';
 if(/(?:channel|trade\s*code|payment\s*method|通道|支付方式)/.test(message))return 'vpay_channel_rejected';
 if(/(?:permission|not\s+(?:enabled|open)|disabled|merchant|trader|权限|未开通|关闭)/.test(message))return 'vpay_order_permission_rejected';
 return 'vpay_order_rejected';
}

module.exports = {
  classifyVpayOrderFailure,
  canonicalize,
  formatVpayDateTime,
  md5Upper,
  normalizeVpayBalance,
  signWithDateTime,
  verifyVpayNotification,
  vpaySignature,
};
