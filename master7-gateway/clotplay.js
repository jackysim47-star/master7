'use strict';

const MAX_GAMES_PER_PAGE = 100;
const MAX_PAGE = 999999;
const GAME_CODE = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,99}$/;

function object(value) {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function text(value, max, { optional = false } = {}) {
  if ((value === undefined || value === null || value === '') && optional) return '';
  if (typeof value !== 'string') throw new TypeError('invalid_clotplay_response');
  const result = value.trim();
  if ((!result && !optional) || result.length > max || /[\u0000-\u001f\u007f-\u009f]/u.test(result)) {
    throw new TypeError('invalid_clotplay_response');
  }
  return result;
}

function integer(value, min, max = Number.MAX_SAFE_INTEGER) {
  if (!Number.isSafeInteger(value) || value < min || value > max) {
    throw new TypeError('invalid_clotplay_response');
  }
  return value;
}

function parseClotplayCatalogueResponse(value, requestedPage) {
  const page = integer(requestedPage, 1, MAX_PAGE);
  if (!object(value) || !Array.isArray(value.data) || value.data.length > MAX_GAMES_PER_PAGE
      || !object(value.pagination)) throw new TypeError('invalid_clotplay_response');

  const pagination = {
    current_page: integer(value.pagination.current_page, 1, MAX_PAGE),
    last_page: integer(value.pagination.last_page, 1, MAX_PAGE),
    per_page: integer(value.pagination.per_page, 1, MAX_GAMES_PER_PAGE),
    total: integer(value.pagination.total, 0),
  };
  const expectedLastPage = Math.max(1, Math.ceil(pagination.total / pagination.per_page));
  const expectedRows = page < pagination.last_page
    ? pagination.per_page
    : pagination.total - ((page - 1) * pagination.per_page);
  if (pagination.current_page !== page || pagination.last_page !== expectedLastPage || pagination.last_page < page
      || expectedRows < 0 || value.data.length !== expectedRows) {
    throw new TypeError('invalid_clotplay_response');
  }

  const seen = new Set();
  const games = value.data.map(row => {
    if (!object(row)) throw new TypeError('invalid_clotplay_response');
    const gameCode = text(row.slug, 100);
    if (!GAME_CODE.test(gameCode) || seen.has(gameCode)) throw new TypeError('invalid_clotplay_response');
    seen.add(gameCode);
    if (row.is_maintenance !== undefined && row.is_maintenance !== false && row.is_maintenance !== true
        && row.is_maintenance !== 0 && row.is_maintenance !== 1) {
      throw new TypeError('invalid_clotplay_response');
    }
    return {
      gameCode,
      name: text(row.name, 200),
      nameZh: text(row.name_cn, 200, { optional: true }),
      category: text(row.category, 40, { optional: true }),
      // Missing availability never proves that a title can launch.
      maintenance: row.is_maintenance !== false && row.is_maintenance !== 0,
      // No supplier-approved image origin is recorded. The portal must use
      // bundled artwork until that contract is reviewed independently.
      thumbnails: {
        en: { square: null, portrait: null },
        cn: { square: null, portrait: null },
        th: { square: null, portrait: null },
      },
    };
  });

  return { games, pagination };
}

module.exports = { MAX_GAMES_PER_PAGE, parseClotplayCatalogueResponse };
