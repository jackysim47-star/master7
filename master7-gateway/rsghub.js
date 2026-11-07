'use strict';

const crypto = require('node:crypto');

const MAX_RESPONSE_BYTES = 2 * 1024 * 1024;
const MAX_GAMES = 10000;

function fail(code, status = 502) {
  throw Object.assign(new Error(code), { status });
}

function desKey(key) {
  const value = Buffer.from(String(key || ''), 'utf8');
  if (value.length !== 8) fail('rsghub_invalid_configuration', 503);
  return Buffer.concat([value, value, value]);
}

function desIv(iv) {
  const value = Buffer.from(String(iv || ''), 'utf8');
  if (value.length !== 8) fail('rsghub_invalid_configuration', 503);
  return value;
}

function encryptJson(value, key, iv) {
  const plaintext = JSON.stringify(value, null, 2);
  const cipher = crypto.createCipheriv('des-ede3-cbc', desKey(key), desIv(iv));
  return Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]).toString('base64');
}

function decryptJson(value, key, iv) {
  const encoded = String(value || '').trim();
  if (!encoded || encoded.length % 4 !== 0 || !/^[A-Za-z0-9+/]+={0,2}$/.test(encoded)) {
    fail('rsghub_invalid_response');
  }
  let plaintext;
  try {
    const ciphertext = Buffer.from(encoded, 'base64');
    if (!ciphertext.length || ciphertext.toString('base64') !== encoded) fail('rsghub_invalid_response');
    const decipher = crypto.createDecipheriv('des-ede3-cbc', desKey(key), desIv(iv));
    plaintext = Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString('utf8');
  } catch (error) {
    if (error?.message === 'rsghub_invalid_configuration') throw error;
    fail('rsghub_invalid_response');
  }
  try {
    const parsed = JSON.parse(plaintext);
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) fail('rsghub_invalid_response');
    return parsed;
  } catch (error) {
    if (error?.message === 'rsghub_invalid_response') throw error;
    fail('rsghub_invalid_response');
  }
}

function signature(clientId, clientSecret, timestamp, msg) {
  return crypto.createHash('md5').update(`${clientId}${clientSecret}${timestamp}${msg}`, 'utf8').digest('hex');
}

function configuration(env) {
  let base;
  try { base = new URL(String(env.RSGHUB_BASE_URL || 'https://api.rsghub.io')); }
  catch { fail('rsghub_invalid_configuration', 503); }
  if (base.protocol !== 'https:' || base.username || base.password || base.search || base.hash || !['', '/'].includes(base.pathname)) {
    fail('rsghub_invalid_configuration', 503);
  }
  const clientId = String(env.RSGHUB_CLIENT_ID || '').trim();
  const clientSecret = String(env.RSGHUB_CLIENT_SECRET || '');
  const systemCode = String(env.RSGHUB_SYSTEM_CODE || '').trim();
  const currency = String(env.RSGHUB_CURRENCY || 'MYR').trim().toUpperCase();
  const key = String(env.RSGHUB_DES_KEY || '');
  const iv = String(env.RSGHUB_DES_IV || '');
  if (!/^[A-Za-z0-9]{1,128}$/.test(clientId) || !clientSecret || clientSecret.length > 512
      || !/^[A-Za-z0-9]{2,20}$/.test(systemCode) || !/^[A-Z0-9]{2,5}$/.test(currency)) {
    fail('rsghub_not_configured', 503);
  }
  // Validate exact UTF-8 byte lengths before making any upstream request.
  desKey(key);
  desIv(iv);
  return { base, clientId, clientSecret, systemCode, currency, key, iv };
}

async function boundedText(response) {
  if (!response.body) fail('rsghub_invalid_response');
  const chunks = [];
  let bytes = 0;
  for await (const chunk of response.body) {
    const value = Buffer.from(chunk);
    bytes += value.length;
    if (bytes > MAX_RESPONSE_BYTES) {
      await response.body.cancel?.().catch?.(() => {});
      fail('rsghub_response_too_large');
    }
    chunks.push(value);
  }
  return Buffer.concat(chunks).toString('utf8');
}

function imageUrl(value) {
  if (typeof value !== 'string' || !value) return null;
  try {
    const url = new URL(value);
    return url.protocol === 'https:' && !url.username && !url.password && !url.hash ? url.href : null;
  } catch { return null; }
}

function normalizeGames(rows) {
  if (!Array.isArray(rows) || rows.length > MAX_GAMES) fail('rsghub_invalid_response');
  const seen = new Set();
  return rows.map(row => {
    if (!row || typeof row !== 'object' || Array.isArray(row)
        || !Number.isSafeInteger(row.GameId) || row.GameId < 0
        || ![1, 2, 3].includes(row.GameType) || ![1, 2].includes(row.GameStatus)
        || !row.GameName || typeof row.GameName !== 'object' || Array.isArray(row.GameName)) {
      fail('rsghub_invalid_game');
    }
    const gameCode = String(row.GameId);
    if (seen.has(gameCode)) fail('rsghub_duplicate_game');
    seen.add(gameCode);
    const category = row.GameType === 1 ? 'SLOT' : row.GameType === 2 ? 'FISH' : 'FAST GAME';
    return {
      gameCode,
      name: typeof row.GameName.en_US === 'string' ? row.GameName.en_US : '',
      nameZh: typeof row.GameName.zh_CN === 'string' ? row.GameName.zh_CN : '',
      category,
      maintenance: row.GameStatus === 2,
      imageUrl: imageUrl(row.GamePicUrl),
    };
  });
}

async function rsghubCatalogue({ env, fetchImpl = global.fetch, now = () => new Date() }) {
  const config = configuration(env);
  const current = now();
  if (!(current instanceof Date) || !Number.isFinite(current.getTime())) fail('rsghub_invalid_clock', 503);
  const timestamp = String(Math.floor(current.getTime() / 1000));
  const msg = encryptJson({ SystemCode: config.systemCode, Currency: config.currency }, config.key, config.iv);
  const endpoint = new URL('/api/v1/WithBalance/Game/GameListByCurrency', config.base);
  let response;
  try {
    response = await fetchImpl(endpoint.href, {
      method: 'POST',
      redirect: 'error',
      signal: AbortSignal.timeout(15000),
      headers: {
        Accept: 'text/plain',
        'Content-Type': 'application/x-www-form-urlencoded',
        'X-API-ClientID': config.clientId,
        'X-API-Signature': signature(config.clientId, config.clientSecret, timestamp, msg),
        'X-API-Timestamp': timestamp,
      },
      body: new URLSearchParams({ Msg: msg }).toString(),
    });
  } catch { fail('rsghub_catalogue_unreachable'); }
  if (!response.ok) fail(`rsghub_upstream_http_${response.status}`);
  const envelope = decryptJson(await boundedText(response), config.key, config.iv);
  if (!Number.isSafeInteger(envelope.ErrorCode)) fail('rsghub_invalid_response');
  if (envelope.ErrorCode !== 0) fail(`rsghub_provider_rejected_${envelope.ErrorCode}`);
  const games = normalizeGames(envelope.Data?.GameList);
  return { provider: 'rsghub', currency: config.currency, count: games.length, games };
}

module.exports = { decryptJson, encryptJson, rsghubCatalogue, signature };
