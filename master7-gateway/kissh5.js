'use strict';

const MAX_PUBLIC_GAMES = 2000;
const GAME_CODE = /^[A-Za-z0-9._:-]{1,50}$/;
const KISSH5_IMAGE_HOST = 'gth.kissh5.com';
const KISSH5_IMAGE_PREFIX = '/thumbs/';

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

function gameCategory(value) {
  if (Number.isSafeInteger(value) && value >= 0) return String(value);
  if (typeof value === 'string' && /^[A-Za-z0-9 _.-]{1,80}$/.test(value)) return value;
  return null;
}

function imageUrl(value) {
  if (value === '' || value == null) return null;
  if (!printable(value, 2000) || !value.startsWith('https://')) {
    throw new TypeError('invalid_kissh5_catalogue');
  }
  let url;
  try { url = new URL(value); }
  catch { throw new TypeError('invalid_kissh5_catalogue'); }
  if (url.protocol !== 'https:' || url.username || url.password || url.hash || url.port
      || url.hostname !== KISSH5_IMAGE_HOST || !url.pathname.startsWith(KISSH5_IMAGE_PREFIX)) {
    throw new TypeError('invalid_kissh5_catalogue');
  }
  return url.href;
}

function publicGame(value) {
  if (!isObject(value)) throw new TypeError('invalid_kissh5_catalogue');
  const code = gameCode(value.GameCode);
  const category = gameCategory(value.GameType);
  if (!code || !printable(value.GameName, 160) || category === null) {
    throw new TypeError('invalid_kissh5_catalogue');
  }
  // Availability fields are outside the supplied catalogue contract. Keep a
  // title closed unless the upstream explicitly proves the narrow safe state;
  // never infer availability from a missing field or schedule string.
  const maintenance = value.IsActive !== true
    || value.IsH5Support !== true
    || value.Maintenance !== false;
  return {
    gameCode: code,
    name: value.GameName,
    category,
    imageUrl: imageUrl(value.ImageUrl),
    maintenance,
  };
}

function parseKissh5CatalogueResponse(value) {
  if (!isObject(value) || !Number.isSafeInteger(value.Status)) {
    throw new TypeError('invalid_kissh5_catalogue');
  }
  if (value.Status !== 200) return { ok: false, status: value.Status, games: [] };
  if (!Array.isArray(value.Game) || value.Game.length > MAX_PUBLIC_GAMES) {
    throw new TypeError('invalid_kissh5_catalogue');
  }
  const codes = new Set();
  const games = value.Game.map(item => {
    const game = publicGame(item);
    if (codes.has(game.gameCode)) throw new TypeError('invalid_kissh5_catalogue');
    codes.add(game.gameCode);
    return game;
  });
  return { ok: true, status: value.Status, games };
}

module.exports = {
  KISSH5_IMAGE_HOST,
  MAX_PUBLIC_GAMES,
  parseKissh5CatalogueResponse,
};
