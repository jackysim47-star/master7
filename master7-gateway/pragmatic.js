'use strict';

const crypto = require('node:crypto');

const PRODUCTION_ORIGIN = 'https://api-2104.api-pp.net';
const CATALOGUE_PATH = '/IntegrationService/v3/http/CasinoGameAPI/getCasinoGames/';
const OPTIONS = 'GetFeatures,GetFrbDetails,GetLines,GetDataTypes';
const MAX_RESPONSE_BYTES = 4 * 1024 * 1024;
const MAX_GAMES = 10000;

function fail(code, status = 502) {
  throw Object.assign(new Error(code), { status });
}

function configuration(env) {
  let base;
  try { base = new URL(String(env.PRAGMATIC_BASE_URL || '')); }
  catch { fail('pragmatic_invalid_configuration', 503); }
  if (base.origin !== PRODUCTION_ORIGIN || !['', '/'].includes(base.pathname)
      || base.username || base.password || base.search || base.hash) {
    fail('pragmatic_invalid_configuration', 503);
  }
  const secureLogin = String(env.PRAGMATIC_SECURE_LOGIN || '').trim();
  const secretKey = String(env.PRAGMATIC_SECRET_KEY || '');
  if (!/^[A-Za-z0-9._-]{3,100}$/.test(secureLogin)
      || Buffer.byteLength(secretKey, 'utf8') < 16
      || Buffer.byteLength(secretKey, 'utf8') > 1024
      || /[\u0000-\u0020\u007f-\u009f]/u.test(secretKey)) {
    fail('pragmatic_not_configured', 503);
  }
  return { base, secureLogin, secretKey };
}

function requestHash(parameters, secretKey) {
  const canonical = Object.entries(parameters)
    .filter(([key, value]) => key !== 'hash' && value !== undefined && value !== null && String(value) !== '')
    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
    .map(([key, value]) => `${key}=${value}`)
    .join('&');
  return crypto.createHash('md5').update(canonical + secretKey, 'utf8').digest('hex');
}

async function boundedJson(response) {
  if (!response.body) fail('pragmatic_invalid_response');
  const chunks = [];
  let bytes = 0;
  for await (const chunk of response.body) {
    const value = Buffer.from(chunk);
    bytes += value.length;
    if (bytes > MAX_RESPONSE_BYTES) {
      await response.body.cancel?.().catch?.(() => {});
      fail('pragmatic_response_too_large');
    }
    chunks.push(value);
  }
  try {
    const parsed = JSON.parse(Buffer.concat(chunks).toString('utf8'));
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) fail('pragmatic_invalid_response');
    return parsed;
  } catch (error) {
    if (error?.message === 'pragmatic_invalid_response') throw error;
    fail('pragmatic_invalid_response');
  }
}

function category(row) {
  const dataType = boundedText(row.dataType, 20).toUpperCase();
  const gameType = boundedText(row.gameTypeID, 40).toLowerCase();
  const description = boundedText(row.typeDescription, 100).toLowerCase();
  if (dataType === 'LC'
      || /(live|roulette|blackjack|baccarat|game show)/.test(description)) return 'LIVE';
  if (gameType === 'vs' || /slot/.test(description)) return 'SLOT';
  if (/poker|card|table/.test(description)) return 'TABLE';
  return 'OTHER';
}

function boundedText(value, maximum, { required = false, pattern } = {}) {
  if (value === undefined || value === null) {
    if (required) fail('pragmatic_invalid_game');
    return '';
  }
  if (typeof value !== 'string' && typeof value !== 'number') fail('pragmatic_invalid_game');
  const text = String(value).trim();
  if ((required && !text) || text.length > maximum || /[\u0000-\u001f\u007f-\u009f]/u.test(text)
      || (pattern && !pattern.test(text))) fail('pragmatic_invalid_game');
  return text;
}

function normalizeGames(rows) {
  if (!Array.isArray(rows) || rows.length > MAX_GAMES) fail('pragmatic_invalid_response');
  const seen = new Set();
  return rows.map(row => {
    if (!row || typeof row !== 'object' || Array.isArray(row)) fail('pragmatic_invalid_game');
    const gameCode = boundedText(row.gameID, 64, { required: true, pattern: /^[A-Za-z0-9._-]+$/ });
    const name = boundedText(row.gameName, 200, { required: true });
    const technology = boundedText(row.technologyID ?? row.technology, 30);
    const platform = boundedText(row.platform, 100);
    if (row.demoGameAvailable !== undefined && typeof row.demoGameAvailable !== 'boolean') fail('pragmatic_invalid_game');
    if (seen.has(gameCode)) fail('pragmatic_duplicate_game');
    seen.add(gameCode);
    return {
      gameCode,
      name,
      category: category(row),
      // getCasinoGames is catalogue metadata and the supplied contract does
      // not define a per-title availability field. Do not infer that a title
      // can launch from its presence in the list.
      maintenance: true,
      technology,
      platforms: [...new Set(platform.split(',').map(value => value.trim().toUpperCase())
        .filter(value => value === 'MOBILE' || value === 'WEB'))],
      demoAvailable: row.demoGameAvailable === true,
    };
  });
}

async function pragmaticCatalogue({ env, fetchImpl = global.fetch }) {
  const config = configuration(env);
  const parameters = { secureLogin: config.secureLogin, options: OPTIONS };
  const hash = requestHash(parameters, config.secretKey);
  const endpoint = new URL(CATALOGUE_PATH, config.base);
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
      body: new URLSearchParams({ ...parameters, hash }).toString(),
    });
  } catch { fail('pragmatic_catalogue_unreachable'); }
  if (!response.ok) fail(`pragmatic_upstream_http_${response.status}`);
  const envelope = await boundedJson(response);
  if (String(envelope.error) !== '0') {
    const code = /^[A-Za-z0-9_-]{1,20}$/.test(String(envelope.error || '')) ? String(envelope.error) : 'unknown';
    fail(`pragmatic_provider_rejected_${code}`);
  }
  const games = normalizeGames(envelope.gameList);
  return { provider: 'pragmaticplay', count: games.length, games };
}

module.exports = { OPTIONS, normalizeGames, pragmaticCatalogue, requestHash };
