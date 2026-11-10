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

function validHttps(value, max = 2000) {
  if (!printable(value, max) || !value.startsWith('https://')) return false;
  try {
    const url = new URL(value);
    return url.protocol === 'https:' && !url.username && !url.password && !url.hash;
  } catch { return false; }
}

function validMegaGameCode(value) {
  return typeof value === 'string' && GAME_CODE.test(value);
}

function validMegaIpv4(value) {
  if (typeof value !== 'string' || !/^\d{1,3}(?:\.\d{1,3}){3}$/.test(value)) return false;
  return value.split('.').every(part => Number(part) <= 255 && (part === '0' || !part.startsWith('0')));
}

function validMegaLanguage(value) {
  return typeof value === 'string' && /^[a-z]{2}(?:-[a-z]{2})?$/.test(value);
}

function validMegaRedirectUrl(value) {
  return validHttps(value, 1000);
}

function responseEnvelope(value) {
  if (!isObject(value) || !Number.isSafeInteger(value.Status)
      || !printable(value.Description, 200) || !printable(value.ResponseDateTime, 50)) {
    throw new TypeError('invalid_megah5_response');
  }
  return {
    ok: value.Status === 200,
    status: value.Status,
    publicResult: {
      Status: value.Status,
      Description: value.Description,
      ResponseDateTime: value.ResponseDateTime,
    },
  };
}

function decimal(value, { positive = false } = {}) {
  if (!['number', 'string'].includes(typeof value) || value === '') return null;
  const raw = String(value);
  if (!/^(?:0|[1-9]\d{0,15})(?:\.\d{1,4})?$/.test(raw)) return null;
  if (positive && Number(raw) <= 0) return null;
  return raw;
}

function parseMegaLaunchResponse(value) {
  const envelope = responseEnvelope(value);
  if (!envelope.ok) return envelope;
  if (!validHttps(value.Url)) throw new TypeError('invalid_megah5_response');
  return { ...envelope, publicResult: { ...envelope.publicResult, Url: value.Url } };
}

function parseMegaBalanceResponse(value, expectedCurrency) {
  const envelope = responseEnvelope(value);
  if (!envelope.ok) return envelope;
  const currentBalance = decimal(value.CurrentBalance);
  if (currentBalance === null || typeof value.Currency !== 'string'
      || !/^[A-Z0-9]{3,5}$/.test(value.Currency)
      || (expectedCurrency && value.Currency !== expectedCurrency)) {
    throw new TypeError('invalid_megah5_response');
  }
  return { ...envelope, publicResult: { ...envelope.publicResult,
    CurrentBalance: currentBalance, Currency: value.Currency } };
}

function parseMegaTransferStatusResponse(value) {
  const envelope = responseEnvelope(value);
  if (!envelope.ok) return envelope;
  const trans = value.Trans;
  const transactionId = isObject(trans) && (typeof trans.TranId === 'string' || Number.isSafeInteger(trans.TranId))
    ? String(trans.TranId) : '';
  const amount = isObject(trans) ? decimal(trans.Amount, { positive: true }) : null;
  const previousBalance = isObject(trans) ? decimal(trans.PrevBalance) : null;
  const newBalance = isObject(trans) ? decimal(trans.NewBalance) : null;
  if (!printable(transactionId, 50) || amount === null || previousBalance === null || newBalance === null) {
    throw new TypeError('invalid_megah5_response');
  }
  return { ...envelope, publicResult: { ...envelope.publicResult, Trans: {
    TranId: transactionId,
    Amount: amount,
    PrevBalance: previousBalance,
    NewBalance: newBalance,
  } } };
}

function publicGame(value) {
  if (!isObject(value) || !validMegaGameCode(value.GameCode) || !printable(value.GameName, 160)
      || !Number.isSafeInteger(value.GameType) || value.GameType < 0
      || typeof value.HasDemo !== 'boolean'
      || (value.ImageUrl !== '' && value.ImageUrl != null && !validHttps(value.ImageUrl))
      || (value.Brand != null && value.Brand !== '' && !printable(value.Brand, 100))) {
    throw new TypeError('invalid_megah5_catalogue');
  }
  return {
    GameCode: value.GameCode,
    GameName: value.GameName,
    GameType: value.GameType,
    HasDemo: value.HasDemo,
    ImageUrl: value.ImageUrl || '',
    ...(value.Brand ? { Brand: value.Brand } : {}),
  };
}

function parseMegaCatalogueResponse(value) {
  let envelope;
  try { envelope = responseEnvelope(value); }
  catch { throw new TypeError('invalid_megah5_catalogue'); }
  if (!envelope.ok) return envelope;
  if (!Array.isArray(value.Game) || value.Game.length > MAX_PUBLIC_GAMES) {
    throw new TypeError('invalid_megah5_catalogue');
  }
  const codes = new Set();
  const games = value.Game.map(game => {
    const projected = publicGame(game);
    if (codes.has(projected.GameCode)) {
      throw new TypeError('invalid_megah5_catalogue');
    }
    codes.add(projected.GameCode);
    return projected;
  });
  return { ...envelope, publicResult: { ...envelope.publicResult, Game: games } };
}

module.exports = {
  MAX_PUBLIC_GAMES,
  parseMegaBalanceResponse,
  parseMegaCatalogueResponse,
  parseMegaLaunchResponse,
  parseMegaTransferStatusResponse,
  validMegaGameCode,
  validMegaIpv4,
  validMegaLanguage,
  validMegaRedirectUrl,
};
