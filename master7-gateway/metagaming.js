'use strict';

const crypto = require('node:crypto');

const ACCOUNT_NAMES = Object.freeze(['normal', 'free']);
const MAX_META_GAMES = 2000;
const PLAYER_ID = /^[A-Za-z0-9._$?-]{1,50}$/;
const REFERENCE_ID = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,49}$/;
const UTC_DATE_TIME = /^\d{4}-(?:0[1-9]|1[0-2])-(?:0[1-9]|[12]\d|3[01]) (?:[01]\d|2[0-3]):[0-5]\d:[0-5]\d$/;

const METHOD_SPECS = Object.freeze({
  GetGameList: { required: [], optional: [] },
  GameLogin: {
    required: ['PlayerId', 'Ip', 'GameCode', 'Currency'],
    optional: ['Lang', 'RedirectUrl', 'AuthToken', 'LaunchDemo'],
    player: true,
  },
  KickPlayer: { required: ['PlayerId'], optional: [], player: true },
  GetUnfinishRound: { required: ['PlayerId'], optional: [], player: true },
  CreatePlayer: { required: ['PlayerId'], optional: [], player: true },
  CheckBalance: { required: ['PlayerId'], optional: [], player: true },
  Deposit: { required: ['PlayerId', 'Amount', 'ReferenceId'], optional: [], player: true },
  Withdraw: { required: ['PlayerId', 'Amount', 'ReferenceId'], optional: [], player: true },
  PullLog: { required: [], optional: [] },
  FlagLog: { required: ['TransactionIds'], optional: [] },
  CheckTransferStatus: {
    required: ['PlayerId', 'ReferenceId', 'TransferType'], optional: [], player: true, transferStatus: true,
  },
});

function isObject(value) {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function printable(value, max) {
  return typeof value === 'string' && value.length > 0 && value.length <= max
    && !/[\u0000-\u001f\u007f-\u009f]/u.test(value);
}

function metaUtcDateTime(value = new Date()) {
  if (!(value instanceof Date) || Number.isNaN(value.getTime())) throw new TypeError('invalid_meta_datetime');
  return value.toISOString().slice(0, 19).replace('T', ' ');
}

function metaSignature(method, requestDateTime, operatorId, secretKey, fields = {}) {
  const spec = METHOD_SPECS[method];
  if (!spec || !UTC_DATE_TIME.test(requestDateTime) || !validOperatorId(operatorId)
      || !validSecret(secretKey) || !isObject(fields)) throw new TypeError('invalid_meta_signature_input');
  let material = `${method}${requestDateTime}${operatorId}${secretKey}`;
  if (spec.player) {
    if (!PLAYER_ID.test(String(fields.PlayerId || ''))) throw new TypeError('invalid_meta_signature_input');
    material += fields.PlayerId;
  }
  if (spec.transferStatus) {
    if (!REFERENCE_ID.test(String(fields.ReferenceId || '')) || ![1, 2].includes(fields.TransferType)) {
      throw new TypeError('invalid_meta_signature_input');
    }
    material += `${fields.ReferenceId}${fields.TransferType}`;
  }
  return crypto.createHash('md5').update(material, 'utf8').digest('hex');
}

function validOperatorId(value) {
  return typeof value === 'string' && /^[A-Za-z0-9._$?-]{1,20}$/.test(value);
}

function validSecret(value) {
  return typeof value === 'string' && value === value.trim()
    && Buffer.byteLength(value, 'utf8') >= 16 && Buffer.byteLength(value, 'utf8') <= 1024
    && !/[\u0000-\u0020\u007f-\u009f]/u.test(value);
}

function validIpv4(value) {
  if (typeof value !== 'string' || !/^\d{1,3}(?:\.\d{1,3}){3}$/.test(value)) return false;
  return value.split('.').every(part => Number(part) <= 255 && (part === '0' || !part.startsWith('0')));
}

function validHttps(value, max = 2000) {
  if (!printable(value, max) || !value.startsWith('https://')) return false;
  try {
    const url = new URL(value);
    return url.protocol === 'https:' && !url.username && !url.password && !url.hash;
  } catch { return false; }
}

function validateField(name, value) {
  if (name === 'PlayerId') return PLAYER_ID.test(String(value || ''));
  if (name === 'Ip') return validIpv4(value);
  if (name === 'GameCode') return printable(value, 50);
  if (name === 'Currency') return typeof value === 'string' && /^[A-Z0-9]{3,5}$/.test(value);
  if (name === 'Lang') return typeof value === 'string' && /^[a-z]{2}(?:-[a-z]{2})?$/.test(value);
  if (name === 'RedirectUrl') return validHttps(value, 1000);
  if (name === 'AuthToken') return printable(value, 500);
  if (name === 'LaunchDemo') return typeof value === 'boolean';
  if (name === 'Amount') return typeof value === 'string'
    && /^(?:0|[1-9]\d{0,9})\.\d{1,4}$/.test(value) && Number(value) > 0;
  if (name === 'ReferenceId') return REFERENCE_ID.test(String(value || ''));
  if (name === 'TransferType') return [1, 2].includes(value);
  if (name === 'TransactionIds') return Array.isArray(value) && value.length > 0 && value.length <= 1000
    && new Set(value).size === value.length
    && value.every(item => Number.isSafeInteger(item) && item > 0);
  return false;
}

function buildMetaRequest(method, { operatorId, secretKey, now = new Date(), fields = {} } = {}) {
  const spec = METHOD_SPECS[method];
  if (!spec || !isObject(fields) || !validOperatorId(operatorId) || !validSecret(secretKey)) {
    throw new TypeError('invalid_meta_request');
  }
  const allowed = new Set([...spec.required, ...spec.optional]);
  if (Object.keys(fields).some(name => !allowed.has(name))
      || spec.required.some(name => !Object.prototype.hasOwnProperty.call(fields, name))
      || Object.entries(fields).some(([name, value]) => !validateField(name, value))) {
    throw new TypeError('invalid_meta_request');
  }
  const requestDateTime = metaUtcDateTime(now);
  return {
    OperatorId: operatorId,
    RequestDateTime: requestDateTime,
    Signature: metaSignature(method, requestDateTime, operatorId, secretKey, fields),
    ...fields,
  };
}

function normalizeMetaBaseUrl(value) {
  if (typeof value !== 'string' || value !== value.trim() || value.includes('\\')
      || /[\u0000-\u0020\u007f-\u009f]/u.test(value)) return '';
  try {
    const url = new URL(value);
    if (url.protocol !== 'https:' || url.username || url.password || url.search || url.hash || url.port
        || !url.pathname.replace(/\/+$/, '').endsWith('/api/opgateway/v1/op')) return '';
    return `${url.origin}${url.pathname.replace(/\/+$/, '')}`;
  } catch { return ''; }
}

function metaAccounts(env = {}) {
  return Object.fromEntries(ACCOUNT_NAMES.map(name => {
    const prefix = `META_GAMING_${name.toUpperCase()}`;
    const baseUrl = normalizeMetaBaseUrl(env[`${prefix}_BASE_URL`]);
    const operatorId = String(env[`${prefix}_OPERATOR_ID`] || '').trim();
    const secretKey = String(env[`${prefix}_SECRET_KEY`] || '');
    const currency = String(env[`${prefix}_CURRENCY`] || 'MYR').toUpperCase();
    const configured = Boolean(baseUrl && validOperatorId(operatorId) && validSecret(secretKey)
      && /^[A-Z0-9]{3,5}$/.test(currency));
    return [name, { name, baseUrl, operatorId, secretKey, currency, configured }];
  }));
}

function publicMetaAccountStatus(env = {}) {
  return Object.fromEntries(Object.entries(metaAccounts(env)).map(([name, value]) => [name, {
    configured: value.configured,
    currency: value.currency,
  }]));
}

function metaAccount(env, name) {
  if (!ACCOUNT_NAMES.includes(name)) throw new TypeError('invalid_meta_account');
  const account = metaAccounts(env)[name];
  if (!account.configured) throw new TypeError('meta_account_not_configured');
  return account;
}

function responseEnvelope(value) {
  if (!isObject(value) || !Number.isSafeInteger(value.Status)
      || !printable(value.Description, 200) || !UTC_DATE_TIME.test(String(value.ResponseDateTime || ''))) {
    throw new TypeError('invalid_meta_response');
  }
  return {
    ok: value.Status === 200,
    status: value.Status,
    description: value.Description,
    responseDateTime: value.ResponseDateTime,
  };
}

function parseMetaCatalogueResponse(value) {
  const envelope = responseEnvelope(value);
  if (!envelope.ok) return { ...envelope, games: [] };
  if (!Array.isArray(value.Game) || value.Game.length > MAX_META_GAMES) throw new TypeError('invalid_meta_response');
  const codes = new Set();
  const games = value.Game.map(game => {
    if (!isObject(game) || !printable(game.GameCode, 50) || !printable(game.GameName, 100)
        || !Number.isSafeInteger(game.GameType) || typeof game.HasDemo !== 'boolean'
        || (game.ImageUrl !== '' && game.ImageUrl != null && !validHttps(game.ImageUrl))) {
      throw new TypeError('invalid_meta_response');
    }
    if (codes.has(game.GameCode)) throw new TypeError('invalid_meta_response');
    codes.add(game.GameCode);
    return {
      gameCode: game.GameCode,
      name: game.GameName,
      gameType: game.GameType,
      // No supplier-approved artwork origin has been recorded. Keep the
      // remote value out of the public gateway response until that contract
      // is reviewed; the portal uses its bundled provider artwork.
      imageUrl: null,
      hasDemo: game.HasDemo,
      // GetGameList v3.4.8 has no title-availability field. Keep every title
      // closed until a separately reviewed supplier contract proves one.
      maintenance: true,
    };
  });
  return { ...envelope, games };
}

function finiteDecimal(value) {
  return (typeof value === 'number' || typeof value === 'string') && value !== ''
    && Number.isFinite(Number(value)) && Math.abs(Number(value)) <= Number.MAX_SAFE_INTEGER;
}

function parseMetaBalanceResponse(value) {
  const envelope = responseEnvelope(value);
  if (!envelope.ok) return { ...envelope, currentBalance: null, currency: null };
  if (!finiteDecimal(value.CurrentBalance) || typeof value.Currency !== 'string'
      || !/^[A-Z0-9]{3,5}$/.test(value.Currency)) throw new TypeError('invalid_meta_response');
  return { ...envelope, currentBalance: String(value.CurrentBalance), currency: value.Currency };
}

function parseMetaLaunchResponse(value) {
  const envelope = responseEnvelope(value);
  if (!envelope.ok) return { ...envelope, url: null };
  if (!validHttps(value.Url)) throw new TypeError('invalid_meta_response');
  return { ...envelope, url: value.Url };
}

function parseMetaKickResponse(value) {
  const envelope = responseEnvelope(value);
  return {
    ...envelope,
    kickAccepted: envelope.ok,
    closureFinal: false,
    closureReason: 'kick_is_temporary_and_does_not_prove_round_or_wallet_closure',
  };
}

function parseMetaUnfinishedRoundsResponse(value) {
  const envelope = responseEnvelope(value);
  if (!envelope.ok) return { ...envelope, rounds: [] };
  if (!Array.isArray(value.Rounds) || value.Rounds.length > 100000) throw new TypeError('invalid_meta_response');
  const rounds = value.Rounds.map(round => {
    if (!isObject(round) || !printable(round.RoundId, 50) || !printable(round.GameId, 30)
        || !printable(round.GameName, 100) || !finiteDecimal(round.Turnover)) {
      throw new TypeError('invalid_meta_response');
    }
    return { roundId: round.RoundId, gameId: round.GameId, gameName: round.GameName, turnover: String(round.Turnover) };
  });
  return { ...envelope, rounds };
}

function parseMetaTransferStatusResponse(value) {
  const envelope = responseEnvelope(value);
  if (!envelope.ok) return { ...envelope, transaction: null };
  const trans = value.Trans;
  if (!isObject(trans) || !['string', 'number'].includes(typeof trans.TranId)
      || !finiteDecimal(trans.Amount) || !finiteDecimal(trans.PrevBalance) || !finiteDecimal(trans.NewBalance)) {
    throw new TypeError('invalid_meta_response');
  }
  return { ...envelope, transaction: {
    transactionId: String(trans.TranId), amount: String(trans.Amount),
    previousBalance: String(trans.PrevBalance), newBalance: String(trans.NewBalance),
  } };
}

function parseMetaLogsResponse(value) {
  const envelope = responseEnvelope(value);
  if (!envelope.ok) return { ...envelope, logs: [] };
  if (!Array.isArray(value.Logs) || value.Logs.length > 1000) throw new TypeError('invalid_meta_response');
  const logs = value.Logs.map(log => {
    if (!isObject(log) || !Number.isSafeInteger(log.TranId) || log.TranId <= 0
        || !PLAYER_ID.test(String(log.PlayerId || '')) || !finiteDecimal(log.Turnover)
        || !finiteDecimal(log.ValidTurnover) || !finiteDecimal(log.Payout) || !finiteDecimal(log.WinLose)
        || !printable(log.TranDt, 50) || !Number.isSafeInteger(log.TranType)
        || !printable(log.GameCode, 50) || !Number.isSafeInteger(log.GameType)
        || !printable(log.GameName, 100)) throw new TypeError('invalid_meta_response');
    return {
      transactionId: log.TranId, playerId: log.PlayerId, turnover: String(log.Turnover),
      validTurnover: String(log.ValidTurnover), payout: String(log.Payout), winLose: String(log.WinLose),
      transactionDateTime: log.TranDt, transactionType: log.TranType, gameCode: log.GameCode,
      gameType: log.GameType, gameName: log.GameName,
    };
  });
  return { ...envelope, logs };
}

module.exports = {
  MAX_META_GAMES,
  ACCOUNT_NAMES,
  METHOD_SPECS,
  buildMetaRequest,
  metaAccount,
  metaAccounts,
  metaSignature,
  metaUtcDateTime,
  normalizeMetaBaseUrl,
  parseMetaBalanceResponse,
  parseMetaCatalogueResponse,
  parseMetaKickResponse,
  parseMetaLaunchResponse,
  parseMetaLogsResponse,
  parseMetaTransferStatusResponse,
  parseMetaUnfinishedRoundsResponse,
  publicMetaAccountStatus,
};
