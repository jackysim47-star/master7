'use strict';

const crypto = require('node:crypto');

const MAX_RESPONSE_BYTES = 2 * 1024 * 1024;
const MAX_GAMES = 10000;

const CATEGORY_BY_GAME_TYPE = new Map([
  [0, 'SLOT'],
  [7, 'FISH'],
  [9, 'ARCADE'],
  [12, 'LOTTERY'],
  [18, 'CARD'],
]);

function fail(code, status = 502) {
  throw Object.assign(new Error(code), { status });
}

function keyBytes(value, errorCode = 'jdb_invalid_configuration') {
  const bytes = Buffer.from(String(value || ''), 'utf8');
  if (bytes.length !== 16) fail(errorCode, 503);
  return bytes;
}

function zeroPad(value) {
  const input = Buffer.from(String(value).trim(), 'utf8');
  const padding = (16 - (input.length % 16)) % 16;
  return padding ? Buffer.concat([input, Buffer.alloc(padding)]) : input;
}

function base64Url(value) {
  return value.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function decodeBase64Url(value) {
  const encoded = String(value || '').trim();
  if (!encoded || !/^[A-Za-z0-9_-]+$/.test(encoded) || encoded.length % 4 === 1) {
    fail('jdb_invalid_ciphertext');
  }
  const canonical = encoded.replace(/-/g, '+').replace(/_/g, '/');
  const padded = canonical + '='.repeat((4 - (canonical.length % 4)) % 4);
  const bytes = Buffer.from(padded, 'base64');
  if (!bytes.length || bytes.length % 16 !== 0 || base64Url(bytes) !== encoded) {
    fail('jdb_invalid_ciphertext');
  }
  return bytes;
}

function encrypt(value, key, iv) {
  const cipher = crypto.createCipheriv('aes-128-cbc', keyBytes(key), keyBytes(iv));
  cipher.setAutoPadding(false);
  return base64Url(Buffer.concat([cipher.update(zeroPad(value)), cipher.final()]));
}

function decrypt(value, key, iv) {
  let plaintext;
  try {
    const decipher = crypto.createDecipheriv('aes-128-cbc', keyBytes(key), keyBytes(iv));
    decipher.setAutoPadding(false);
    plaintext = Buffer.concat([decipher.update(decodeBase64Url(value)), decipher.final()]);
  } catch (error) {
    if (error?.message === 'jdb_invalid_configuration' || error?.message === 'jdb_invalid_ciphertext') throw error;
    fail('jdb_invalid_ciphertext');
  }
  let end = plaintext.length;
  while (end > 0 && plaintext[end - 1] === 0) end--;
  if (plaintext.subarray(0, end).includes(0)) fail('jdb_invalid_ciphertext');
  return plaintext.subarray(0, end).toString('utf8');
}

function configuration(env) {
  let base;
  try { base = new URL(String(env.JDB_BASE_URL || '')); }
  catch { fail('jdb_invalid_configuration', 503); }
  if (base.protocol !== 'https:' || base.username || base.password || base.search || base.hash
      || !['', '/'].includes(base.pathname)) {
    fail('jdb_invalid_configuration', 503);
  }
  const dc = String(env.JDB_DC || '').trim();
  const parent = String(env.JDB_AGENT_ID || '').trim();
  const key = String(env.JDB_AES_KEY || '');
  const iv = String(env.JDB_AES_IV || '');
  if (!/^[A-Za-z0-9_-]{1,32}$/.test(dc) || !/^[A-Za-z0-9._-]{1,50}$/.test(parent)) {
    fail('jdb_not_configured', 503);
  }
  keyBytes(key);
  keyBytes(iv);
  return { base, dc, parent, key, iv };
}

async function boundedJson(response) {
  if (!response.body) fail('jdb_invalid_response');
  const chunks = [];
  let bytes = 0;
  for await (const chunk of response.body) {
    const value = Buffer.from(chunk);
    bytes += value.length;
    if (bytes > MAX_RESPONSE_BYTES) {
      await response.body.cancel?.().catch?.(() => {});
      fail('jdb_response_too_large');
    }
    chunks.push(value);
  }
  try {
    const parsed = JSON.parse(Buffer.concat(chunks).toString('utf8'));
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) fail('jdb_invalid_response');
    return parsed;
  } catch (error) {
    if (error?.message === 'jdb_invalid_response') throw error;
    fail('jdb_invalid_response');
  }
}

function imageUrl(value) {
  if (typeof value !== 'string' || !value) return null;
  try {
    const url = new URL(value);
    return url.protocol === 'https:' && !url.username && !url.password && !url.hash ? url.href : null;
  } catch { return null; }
}

function normalizeGames(groups) {
  if (!Array.isArray(groups) || groups.length > 1000) fail('jdb_invalid_response');
  const games = [];
  const seen = new Set();
  for (const group of groups) {
    if (!group || typeof group !== 'object' || Array.isArray(group)
        || !Number.isSafeInteger(group.gType) || group.gType < 0 || group.gType > 9999
        || !Array.isArray(group.list)) fail('jdb_invalid_game');
    for (const row of group.list) {
      if (games.length >= MAX_GAMES || !row || typeof row !== 'object' || Array.isArray(row)) {
        fail('jdb_invalid_game');
      }
      const rawMachineType = row.mType ?? row.mtype;
      const machineType = typeof rawMachineType === 'string' && /^\d+$/.test(rawMachineType)
        ? Number(rawMachineType) : rawMachineType;
      const validMaintenance = row.maintenance === undefined || typeof row.maintenance === 'boolean'
        || row.maintenance === 0 || row.maintenance === 1;
      if (!Number.isSafeInteger(machineType) || machineType < 0 || machineType > Number.MAX_SAFE_INTEGER
          || typeof row.name !== 'string' || row.name.length > 512 || !validMaintenance) {
        fail('jdb_invalid_game');
      }
      const gameCode = `${group.gType}:${machineType}`;
      if (seen.has(gameCode)) fail('jdb_duplicate_game');
      seen.add(gameCode);
      games.push({
        gameCode,
        name: row.name,
        category: CATEGORY_BY_GAME_TYPE.get(group.gType) || 'OTHER',
        gameType: group.gType,
        machineType,
        maintenance: row.maintenance === true || row.maintenance === 1,
        imageUrl: imageUrl(row.image),
      });
    }
  }
  return games;
}

async function jdbCatalogue({ env, fetchImpl = global.fetch, now = () => new Date() }) {
  const config = configuration(env);
  const current = now();
  if (!(current instanceof Date) || !Number.isFinite(current.getTime())) fail('jdb_invalid_clock', 503);
  const request = { action: 49, ts: current.getTime(), parent: config.parent, lang: 'en' };
  const x = encrypt(JSON.stringify(request), config.key, config.iv);
  const endpoint = new URL('/apiRequest.do', config.base);
  let response;
  try {
    response = await fetchImpl(endpoint.href, {
      method: 'POST',
      redirect: 'error',
      signal: AbortSignal.timeout(15000),
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({ dc: config.dc, x }).toString(),
    });
  } catch { fail('jdb_catalogue_unreachable'); }
  if (!response.ok) fail(`jdb_upstream_http_${response.status}`);
  const envelope = await boundedJson(response);
  if (!/^\d{4}$/.test(String(envelope.status || ''))) fail('jdb_invalid_response');
  if (envelope.status !== '0000') fail(`jdb_provider_rejected_${envelope.status}`);
  const games = normalizeGames(envelope.data);
  return { provider: 'jdb', count: games.length, games };
}

module.exports = { decrypt, encrypt, jdbCatalogue, normalizeGames };
