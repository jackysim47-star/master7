'use strict';

const MAX_EVO_GAMES = 2000;
const GAME_CODE = /^[A-Za-z0-9._:-]{1,100}$/;

function isObject(value) {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function printable(value, max) {
  return typeof value === 'string' && value.length > 0 && value.length <= max
    && !/[\u0000-\u001f\u007f-\u009f]/u.test(value);
}

function publicCode(value) {
  if (Number.isSafeInteger(value) && value >= 0) value = String(value);
  return typeof value === 'string' && GAME_CODE.test(value) ? value : null;
}

function providerStatus(value) {
  if (Number.isSafeInteger(value)) return value;
  if (typeof value === 'string' && /^-?\d{1,12}$/.test(value)) {
    const parsed = Number(value);
    if (Number.isSafeInteger(parsed)) return parsed;
  }
  return null;
}

function parseEvoCatalogueResponse(value) {
  if (!isObject(value) || providerStatus(value.code) === null) {
    throw new TypeError('invalid_evo_catalogue');
  }
  const status = providerStatus(value.code);
  if (status !== 0) return { ok: false, status, games: [] };
  if (!Array.isArray(value.data) || value.data.length > MAX_EVO_GAMES) {
    throw new TypeError('invalid_evo_catalogue');
  }
  const codes = new Set();
  const games = value.data.map(item => {
    if (!isObject(item)) throw new TypeError('invalid_evo_catalogue');
    const gameid = publicCode(item.gameid);
    const title = typeof item.title === 'string' ? item.title.trim() : '';
    if (!gameid || !printable(title, 160) || codes.has(gameid)) {
      throw new TypeError('invalid_evo_catalogue');
    }
    codes.add(gameid);
    return {
      gameid,
      title,
      // The supplied game-list evidence does not bind an approved artwork
      // origin or a per-title availability signal. Keep both fail-closed.
      thumbnail: null,
      maintenance: true,
    };
  });
  return { ok: true, status, games };
}

module.exports = { MAX_EVO_GAMES, parseEvoCatalogueResponse };
