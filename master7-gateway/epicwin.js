'use strict';

const MAX_PUBLIC_GAMES = 2000;
const GAME_CODE = /^[A-Za-z0-9._:-]{1,50}$/;

function isObject(value) {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function printable(value, max) {
  return typeof value === 'string' && value.length > 0 && value.length <= max
    && !/[\u0000-\u001f\u007f-\u009f]/u.test(value);
}

function gameCode(value) {
  if (Number.isSafeInteger(value) && value >= 0) value = String(value);
  return typeof value === 'string' && GAME_CODE.test(value) ? value : null;
}

function category(value) {
  if (Number.isSafeInteger(value) && value >= 0) return String(value);
  if (typeof value === 'string' && /^[A-Za-z0-9 _.-]{1,80}$/.test(value)) return value;
  return null;
}

function publicGame(value) {
  if (!isObject(value)) throw new TypeError('invalid_epicwin_catalogue');
  const code = gameCode(value.GameCode);
  const name = value.GameName ?? value.Name;
  const type = category(value.GameType);
  if (!code || !printable(name, 160) || type === null) {
    throw new TypeError('invalid_epicwin_catalogue');
  }
  return {
    gameCode: code,
    name,
    category: type,
    // No supplier image or availability contract is bound to these accounts.
    // The Portal uses local brand artwork and keeps every title fail-closed.
    imageUrl: null,
    maintenance: true,
  };
}

function parseEpicwinCatalogueResponse(value) {
  if (!isObject(value) || !Number.isSafeInteger(value.Status)) {
    throw new TypeError('invalid_epicwin_catalogue');
  }
  if (value.Status !== 200) return { ok: false, status: value.Status, games: [] };
  if (!Array.isArray(value.Game) || value.Game.length > MAX_PUBLIC_GAMES) {
    throw new TypeError('invalid_epicwin_catalogue');
  }
  const codes = new Set();
  const games = value.Game.map(item => {
    const game = publicGame(item);
    if (codes.has(game.gameCode)) throw new TypeError('invalid_epicwin_catalogue');
    codes.add(game.gameCode);
    return game;
  });
  return { ok: true, status: value.Status, games };
}

module.exports = { MAX_PUBLIC_GAMES, parseEpicwinCatalogueResponse };
