'use strict';

const crypto = require('node:crypto');

const MAX_GAMES = 10000;

function fail(code) {
  throw Object.assign(new Error(code), { status: 502 });
}

function gameName(value, required = false) {
  if (value === undefined || value === null) {
    if (required) fail('jili_invalid_game');
    return '';
  }
  if (typeof value !== 'string') fail('jili_invalid_game');
  const text = value.trim();
  if ((required && !text) || text.length > 512 || /[\u0000-\u001f\u007f-\u009f]/u.test(text)) {
    fail('jili_invalid_game');
  }
  return text;
}

// JILI API manual 1.1.2: fixed UTC-4; yyMMd (day is not zero-padded).
function jiliDate(now = new Date()) {
  const date = new Date(now.getTime() - 4 * 60 * 60 * 1000);
  return `${String(date.getUTCFullYear()).slice(-2)}${String(date.getUTCMonth() + 1).padStart(2, '0')}${date.getUTCDate()}`;
}

function md5(value) {
  return crypto.createHash('md5').update(value, 'utf8').digest('hex');
}

function jiliKey(query, agentId, agentKey, now = new Date()) {
  const keyG = md5(jiliDate(now) + agentId + agentKey);
  return crypto.randomBytes(3).toString('hex') + md5(query + keyG) + crypto.randomBytes(3).toString('hex');
}

function jiliCatalogueBody(agentId, agentKey, now) {
  // GetGameList has no specific fields; AgentId is the last signed parameter.
  if (!/^[A-Za-z0-9_]+$/.test(agentId)) throw new Error('jili_invalid_agent_id');
  const query = `AgentId=${agentId}`;
  return new URLSearchParams({ AgentId: agentId, Key: jiliKey(query, agentId, agentKey, now) }).toString();
}

// Legacy GetGameList contract 3.1.6.1 requires typed identity, name, category
// and jackpot fields, but exposes no per-title availability signal. Reject
// ambiguous rows and publish every title under maintenance until a separately
// accepted merchant contract provides a trustworthy availability field.
function normalizeJiliGames(rows) {
  if (!Array.isArray(rows) || rows.length > MAX_GAMES) fail('jili_invalid_response');
  const seen = new Set();
  return rows.map(row => {
    if (!row || typeof row !== 'object' || Array.isArray(row)
        || !Number.isSafeInteger(row.GameId) || row.GameId <= 0
        || !row.name || typeof row.name !== 'object' || Array.isArray(row.name)
        || !Number.isSafeInteger(row.GameCategoryId) || row.GameCategoryId < 0
        || typeof row.JP !== 'boolean') {
      fail('jili_invalid_game');
    }
    const gameCode = String(row.GameId);
    if (seen.has(gameCode)) fail('jili_duplicate_game');
    seen.add(gameCode);
    return {
      gameCode,
      name: gameName(row.name['en-US'], true),
      nameZh: gameName(row.name['zh-CN']),
      category: String(row.GameCategoryId),
      jackpot: row.JP,
      maintenance: true,
    };
  });
}

module.exports = { jiliDate, jiliKey, jiliCatalogueBody, normalizeJiliGames };
