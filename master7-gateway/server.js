'use strict';

const http = require('node:http');
const crypto = require('node:crypto');
const { verifyVpayNotification, vpaySignature } = require('./vpay');
const {
  paymentOrderRequest,
  paymentOrderResponse,
  paymentOrderSignature,
  paymentQueryRequest,
  paymentSignature,
  paymentStatusPayload,
} = require('./gspay');
const { jiliCatalogueBody, normalizeJiliGames } = require('./jili');
const { parseEpicwinCatalogueResponse } = require('./epicwin');
const { parseKissh5CatalogueResponse } = require('./kissh5');
const { venusCatalogue } = require('./venus');
const { rsghubCatalogue } = require('./rsghub');
const { jdbCatalogue } = require('./jdb');
const { pragmaticCatalogue } = require('./pragmatic');
const {
  parseMegaBalanceResponse,
  parseMegaCatalogueResponse,
  parseMegaLaunchResponse,
  parseMegaTransferStatusResponse,
  validMegaGameCode,
  validMegaIpv4,
  validMegaLanguage,
  validMegaRedirectUrl,
} = require('./megah5');
const {
  buildMetaRequest,
  metaAccount,
  parseMetaCatalogueResponse,
  publicMetaAccountStatus,
} = require('./metagaming');
const {
  configuredUrl,
  gamePeerCredential,
  gameWalletCredential,
  gspayPeerCredential,
  gspayReadiness,
  megah5TransferReadiness,
  normalizeHttpsUrl,
  peerCredential,
  vpayReadiness,
  integrationReadiness,
  megah5ProviderMappingVerified,
  officialVpayPaymentForwardUrl,
  officialVpayReturnUrl,
} = require('./readiness');

const { version: VERSION } = require('./package.json');
const PROVIDERS = ['cosmoplay', 'creative-gaming', 'pgsoft', 'spade-gaming'];
const PROVIDER_USER_AGENT = `MASTER7-Integration-Gateway/${VERSION}`;
const DEFAULT_PORTAL_ORIGIN = 'https://master7-v17-staging.onrender.com';

function browserOrigins(env) {
  const configured = env.ALLOWED_ORIGINS !== undefined
    ? env.ALLOWED_ORIGINS
    : (env.ALLOWED_ORIGIN || DEFAULT_PORTAL_ORIGIN);
  const origins = new Set();
  for (const item of String(configured).split(',')) {
    const value = item.trim();
    if (!value) continue;
    let url;
    try { url = new URL(value); }
    catch { throw new Error('Invalid browser origin configuration'); }
    if (!['https:', 'http:'].includes(url.protocol) || url.username || url.password
        || url.pathname !== '/' || url.search || url.hash || url.hostname.includes('*')) {
      throw new Error('Browser origins must be exact HTTP(S) origins without paths or credentials');
    }
    origins.add(url.origin);
  }
  return origins;
}

function cleanBase(value, fallback) {
  return String(value || fallback).replace(/\/+$/, '');
}

function utcSeconds(now = new Date()) {
  return now.toISOString().replace(/\.\d{3}Z$/, 'Z');
}

function md5(value) {
  return crypto.createHash('md5').update(value, 'utf8').digest('hex');
}

function megaSignature(method, requestDateTime, operatorId, secretKey, playerId = '', signatureTail = '') {
  return md5(`${method}${requestDateTime}${operatorId}${secretKey}${playerId}${signatureTail}`);
}

function validMegaPlayerId(value) {
  return /^[A-Za-z0-9._$?-]{1,50}$/.test(value);
}

function validMegaReferenceId(value) {
  return /^[A-Za-z0-9][A-Za-z0-9._:-]{0,49}$/.test(value);
}

function canonicalMegaAmount(value) {
  return /^(?:0|[1-9]\d{0,9})\.\d{2}$/.test(value) && value !== '0.00';
}

function megaTransferType(value) {
  if (value === 'deposit') return 1;
  if (value === 'withdrawal') return 2;
  return 0;
}

function safeEqual(a, b) {
  const left = Buffer.from(String(a || ''));
  const right = Buffer.from(String(b || ''));
  return left.length === right.length && crypto.timingSafeEqual(left, right);
}

function gspayEnvelopePayload(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)
      || ![200, '200'].includes(value.code)) throw new TypeError('invalid_gspay_envelope');
  let payload = value.data ?? value;
  if (typeof payload === 'string') {
    if (Buffer.byteLength(payload, 'utf8') > 65536) throw new TypeError('invalid_gspay_envelope');
    try { payload = JSON.parse(payload); }
    catch { throw new TypeError('invalid_gspay_envelope'); }
  }
  if (Array.isArray(payload)) {
    if (payload.length !== 1) throw new TypeError('invalid_gspay_envelope');
    [payload] = payload;
  }
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
    throw new TypeError('invalid_gspay_envelope');
  }
  return payload;
}

function makeApp({ env = process.env, fetchImpl = global.fetch, now = () => new Date() } = {}) {
  const currency = String(env.CURRENCY || 'MYR').toUpperCase();
  const publicBase = normalizeHttpsUrl(env.PUBLIC_BASE_URL, { originOnly: true });
  const allowedOrigins = browserOrigins(env);
  const evoBase = cleanBase(env.EVO_BASE_URL, 'https://api.evo888h5.com');
  const megaBase = cleanBase(env.MEGA_BASE_URL, 'https://smakermicsvc.back138.com/api/opgateway/v1/op');
  const vpayBase = cleanBase(env.VPAY_BASE_URL, 'https://gateway.vpay.club');
  const vpayTraderId = String(env.VPAY_TRADER_ID || '').trim();
  const vpayApiToken = String(env.VPAY_API_TOKEN || '').trim();
  const vpayTimeZone = String(env.VPAY_TIME_ZONE || 'Asia/Kuala_Lumpur');
  const vpayReturnUrl = officialVpayReturnUrl(String(env.VPAY_RETURN_URL || ''));
  const clotplayBase = cleanBase(env.CLOTPLAY_BASE_URL, 'https://api.coldboxservice.com/api/MOGI');
  const clotplayToken = String(env.CLOTPLAY_OPERATOR_TOKEN || '').trim();
  const jiliBase = cleanBase(env.JILI_BASE_URL, 'https://wb-api-2.jiscc77s.com/api1');
  const jiliAccounts = {
    '1to1': { id: env.JILI_1TO1_AGENT_ID, secret: env.JILI_1TO1_AGENT_KEY, ratio: '1:1' },
    '1to100': { id: env.JILI_1TO100_AGENT_ID, secret: env.JILI_1TO100_AGENT_KEY, ratio: '1:100' },
  };
  const catalogueProfiles = {
    epicwin: {
      base: cleanBase(env.EPICWIN_BASE_URL, 'https://smapi.eptech88.com/api/opgateway/v1/op'),
      accounts: {
        normal: { id: env.EPICWIN_NORMAL_OPERATOR_ID, secret: env.EPICWIN_NORMAL_SECRET_KEY, currency: 'MYR' },
        free: { id: env.EPICWIN_FREE_OPERATOR_ID, secret: env.EPICWIN_FREE_SECRET_KEY, currency: 'MYR' },
      },
    },
    '918kissh5': {
      base: cleanBase(env.KISSH5_BASE_URL, 'https://kh5api.kisssysapi.com/api/opgateway/v1/op'),
      accounts: {
        normal: { id: env.KISSH5_NORMAL_OPERATOR_ID, secret: env.KISSH5_NORMAL_SECRET_KEY, currency: 'MYR' },
        my1: { id: env.KISSH5_MY1_OPERATOR_ID, secret: env.KISSH5_MY1_SECRET_KEY, currency: 'MY1' },
        free: { id: env.KISSH5_FREE_OPERATOR_ID, secret: env.KISSH5_FREE_SECRET_KEY, currency: 'MYR' },
      },
    },
  };
  const cache = new Map();

  function headers(extra = {}) {
    return {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store',
      'X-Content-Type-Options': 'nosniff',
      'X-Frame-Options': 'DENY',
      'Referrer-Policy': 'no-referrer',
      ...extra,
    };
  }

  function send(res, status, body, extraHeaders) {
    res.writeHead(status, headers(extraHeaders));
    res.end(JSON.stringify(body));
  }

  function sendText(res, status, value) {
    res.writeHead(status, {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'no-store',
      'X-Content-Type-Options': 'nosniff',
    });
    res.end(String(value));
  }

  function isAdmin(req) {
    const expected = String(env.GATEWAY_ADMIN_TOKEN || '');
    const supplied = String(req.headers.authorization || '').replace(/^Bearer\s+/i, '');
    return expected.length >= 32 && safeEqual(expected, supplied);
  }

  // A wallet query credential may confirm an existing payment, but may not
  // create orders, read the merchant balance, withdraw or access game admins.
  function walletPeerCredential(name) {
    return peerCredential(env, name);
  }

  function isWalletQueryPeer(req) {
    const expected = walletPeerCredential('PLATFORM_QUERY_TOKEN');
    const supplied = String(req.headers.authorization || '').replace(/^Bearer\s+/i, '');
    return Boolean(expected) && safeEqual(expected, supplied);
  }

  function isWalletOrderPeer(req) {
    const expected = walletPeerCredential('PLATFORM_ORDER_TOKEN');
    const supplied = String(req.headers.authorization || '').replace(/^Bearer\s+/i, '');
    return Boolean(expected) && safeEqual(expected, supplied);
  }

  function isWalletPayoutPeer(req) {
    const expected = walletPeerCredential('PLATFORM_PAYOUT_TOKEN');
    const supplied = String(req.headers.authorization || '').replace(/^Bearer\s+/i, '');
    return Boolean(expected) && safeEqual(expected, supplied);
  }

  function isGspayPeer(req, name) {
    const expected = gspayPeerCredential(env, name);
    const supplied = String(req.headers.authorization || '').replace(/^Bearer\s+/i, '');
    return Boolean(expected) && safeEqual(expected, supplied);
  }

  function isGamePeer(req) {
    const expected = gamePeerCredential(env);
    const supplied = String(req.headers.authorization || '').replace(/^Bearer\s+/i, '');
    return Boolean(expected) && safeEqual(expected, supplied);
  }

  function isGameWalletPeer(req) {
    const expected = gameWalletCredential(env);
    const supplied = String(req.headers.authorization || '').replace(/^Bearer\s+/i, '');
    return Boolean(expected) && safeEqual(expected, supplied);
  }

  function walletPaymentConfiguration() {
    let tradeCodes = [];
    try {
      const values = JSON.parse(env.VPAY_ENABLED_TRADE_CODES || '[]');
      if (Array.isArray(values) && values.length && new Set(values).size === values.length
        && values.every(value => typeof value === 'string' && ['1', '2', '3', '4', '5', '7'].includes(value))) tradeCodes = values;
    } catch {}
    const returnUrl = vpayReturnUrl;
    return {
      provider: 'vpay', traderId: vpayTraderId, mode: String(env.VPAY_MODE || 'uat'),
      configured: Boolean(vpayTraderId && vpayApiToken),
      paymentReady: vpayReadiness(env).channels.payment.configurationReady && tradeCodes.length > 0
        && configuredUrl(returnUrl) && Boolean(walletPeerCredential('PLATFORM_ORDER_TOKEN')) && Boolean(walletPeerCredential('PLATFORM_QUERY_TOKEN')),
      tradeCodes, notifyUrl: callbackUrls().vpayPayment, returnUrl,
    };
  }

  function gspayConfiguration() {
    const readiness = gspayReadiness(env);
    const orderReady = readiness.channels.orders.routeReady === true;
    const queryReady = readiness.channels.queries.routeReady === true;
    const callbacksReady = readiness.channels.callbacks.routeReady === true;
    return {
      provider: 'gspay',
      currency: 'MYR',
      mode: readiness.mode,
      configured: readiness.credentialsConfigured,
      providerBase: readiness.providerBase,
      contract: readiness.contract,
      transactionRoutesActive: orderReady || queryReady || callbacksReady,
      createProgramReady: readiness.channels.orders.programReady === true,
      orderReady,
      queryReady,
      callbacksReady,
      callbackUrls: {
        payment: callbackUrls().gspayPayment,
        duitNow: callbackUrls().gspayDuitNow,
      },
      blockers: {
        orders: readiness.channels.orders.blockers,
        queries: readiness.channels.queries.blockers,
        callbacks: readiness.channels.callbacks.blockers,
      },
    };
  }

  async function body(req) {
    const chunks = [];
    let bytes = 0;
    for await (const chunk of req.iterator({ destroyOnReturn: false })) {
      const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
      bytes += buffer.length;
      if (bytes > 65536) {
        req.resume();
        throw Object.assign(new Error('request_too_large'), { status: 413 });
      }
      chunks.push(buffer);
    }
    if (!bytes) return {};
    let data;
    try { data = JSON.parse(Buffer.concat(chunks).toString('utf8')); }
    catch { throw Object.assign(new Error('invalid_json'), { status: 400 }); }
    if (!data || typeof data !== 'object' || Array.isArray(data)) {
      throw Object.assign(new Error('json_object_required'), { status: 400 });
    }
    return data;
  }

  async function upstream(url, options = {}) {
    if (!configuredUrl(url)) throw Object.assign(new Error('upstream_url_invalid'), { status: 503 });
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 15000);
    try {
      const response = await fetchImpl(url, { ...options, redirect: options.redirect === 'error' ? 'error' : 'manual', signal: controller.signal });
      if (response.status >= 300 && response.status < 400) {
        await response.body?.cancel();
        throw Object.assign(new Error('upstream_redirect_rejected'), { status: 502 });
      }
      // Catalogue responses can be large, but must remain bounded in memory.
      const chunks = [];
      let bytes = 0;
      if (response.body) for await (const chunk of response.body) {
        bytes += chunk.length;
        if (bytes > 2097152) throw Object.assign(new Error('upstream_response_too_large'), { status: 502 });
        chunks.push(Buffer.from(chunk));
      }
      const raw = Buffer.concat(chunks).toString('utf8');
      let data;
      try { data = raw ? JSON.parse(raw) : {}; }
      catch { data = { message: raw.slice(0, 500) }; }
      return { ok: response.ok, status: response.status, data, raw, acknowledgement: raw === 'SUCCESS' };
    } finally {
      clearTimeout(timer);
    }
  }

  async function cached(key, action, cacheable = value => value.ok) {
    const current = cache.get(key);
    if (current && current.expires > Date.now()) return current.value;
    const value = await action();
    // An upstream can return HTTP 200 with a provider-level rejection.  Do not
    // retain those responses: once a supplier fixes an IP allowlist or account
    // permission, the next catalogue check must be able to recover immediately.
    if (cacheable(value)) cache.set(key, { value, expires: Date.now() + 300000 });
    return value;
  }

  async function evo(path, method = 'GET', payload) {
    const token = String(env.EVO_API_TOKEN || '').trim();
    if (!token) return { ok: false, status: 503, data: { code: 'EVO_NOT_CONFIGURED' } };
    const requestHeaders = {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    };
    return upstream(`${evoBase}${path}`, {
      method,
      headers: requestHeaders,
      body: payload ? JSON.stringify(payload) : undefined,
    });
  }

  async function mega(method, fields = {}) {
    const operatorId = String(env.MEGA_OPERATOR_ID || '').trim();
    const secretKey = String(env.MEGA_SECRET_KEY || '').trim();
    if (!operatorId || !secretKey) return { ok: false, status: 503, data: { code: 'MEGA_NOT_CONFIGURED' } };
    const requestDateTime = utcSeconds(now());
    const playerId = fields.PlayerId ? String(fields.PlayerId) : '';
    const signatureTail = method === 'CheckTransferStatus'
      ? `${String(fields.ReferenceId || '')}${String(fields.TransferType || '')}` : '';
    const payload = {
      OperatorId: operatorId,
      RequestDateTime: requestDateTime,
      Signature: megaSignature(method, requestDateTime, operatorId, secretKey, playerId, signatureTail),
      ...fields,
    };
    return upstream(`${megaBase}/${encodeURIComponent(method)}`, {
      method: 'POST',
      headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
  }

  async function vpay(action, fields = {}) {
    if (!vpayTraderId || !vpayApiToken) return { ok: false, status: 503, data: { code: 'VPAY_NOT_CONFIGURED' } };
    const timestamp = Math.floor(now().getTime() / 1000);
    const payload = { action, trader_id: vpayTraderId, ...fields };
    payload.sign = vpaySignature(payload, vpayApiToken, timestamp, vpayTimeZone);
    return upstream(`${vpayBase}/app/v1/trader/rest?t=${timestamp}`, {
      method: 'POST',
      headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
  }

  function callbackUrls() {
    const base = publicBase || 'https://SERVICE-URL';
    return {
      ...Object.fromEntries(PROVIDERS.map(name => [name, `${base}/callbacks/${name}`])),
      vpayPayment: `${base}/callbacks/vpay/payment`,
      vpayWithdrawal: `${base}/callbacks/vpay/withdrawal`,
      gspayPayment: `${base}/callbacks/gspay/payment`,
      gspayDuitNow: `${base}/callbacks/gspay/duitnow`,
    };
  }

  return async function handler(req, res) {
    // Generated locally: never trust a client-supplied request ID in audit output.
    res.setHeader('X-Request-Id', crypto.randomUUID());
    const origin = String(req.headers.origin || '');
    const originAllowed = allowedOrigins.has(origin);
    const cors = originAllowed ? {
      'Access-Control-Allow-Origin': origin,
      'Vary': 'Origin',
    } : { 'Vary': 'Origin' };
    // Set once so validation errors, admin denials and text callbacks also
    // preserve the same exact-origin policy. CORS never replaces authorization.
    for (const [name, value] of Object.entries(cors)) res.setHeader(name, value);
    if (req.method === 'OPTIONS') {
      const method = String(req.headers['access-control-request-method'] || '').toUpperCase();
      const requestedHeaders = String(req.headers['access-control-request-headers'] || '')
        .split(',').map(value => value.trim().toLowerCase()).filter(Boolean);
      if ((origin && !originAllowed) || (method && !['GET', 'POST', 'OPTIONS'].includes(method))
          || requestedHeaders.some(value => !['authorization', 'content-type'].includes(value))) {
        return send(res, 403, { error: 'cors_request_denied' });
      }
      res.writeHead(204, headers({ ...cors, 'Access-Control-Allow-Methods': 'GET,POST,OPTIONS', 'Access-Control-Allow-Headers': 'Authorization,Content-Type' }));
      return res.end();
    }

    const url = new URL(req.url, 'http://localhost');
    try {
      if (req.method === 'GET' && url.pathname === '/') {
        const base = publicBase || 'https://master7-integration-gateway.onrender.com';
        return send(res, 200, {
          ok: true,
          service: 'MASTER7 API',
          version: VERSION,
          status: 'online',
          currency,
          mode: String(env.GATEWAY_MODE || 'uat'),
          health: `${base}/health`,
          readiness: `${base}/readiness`,
          endpoints: {
            megah5Games: `${base}/providers/megah5/games`,
            metaGamingGames: `${base}/providers/metagaming/games?account=normal`,
            evo888h5Games: `${base}/providers/evo888h5/games`,
            epicwinGames: `${base}/providers/epicwin/games`,
            kissh5Games: `${base}/providers/918kissh5/games`,
            clotplayGames: `${base}/providers/clotplay/games`,
            jiliGames: `${base}/providers/jili/games?account=1to1`,
            venusGames: `${base}/providers/venus/games`,
            rsghubGames: `${base}/providers/rsghub/games`,
            jdbGames: `${base}/providers/jdb/games`,
            pragmaticPlayGames: `${base}/providers/pragmaticplay/games`,
            vpayStatus: `${base}/providers/vpay/status`,
            gspayStatus: `${base}/providers/gspay/status`,
            callbacks: `${base}/callbacks`,
          },
        }, cors);
      }

      if (req.method === 'GET' && url.pathname === '/health') {
        return send(res, 200, {
          ok: true,
          service: 'master7-integration-gateway',
          version: VERSION,
          currency,
          mode: String(env.GATEWAY_MODE || 'uat'),
          readiness: { scope: 'process_health_only', productionQa: 'not_verified', liveReady: false },
          browserAccess: { allowedOrigins: [...allowedOrigins], credentials: false },
          configured: {
            evo888h5: Boolean(env.EVO_API_TOKEN),
            venus: Boolean(env.VENUS_SITE_CODE && env.VENUS_API_KEY),
            megah5: Boolean(env.MEGA_OPERATOR_ID && env.MEGA_SECRET_KEY),
            metaGaming: publicMetaAccountStatus(env),
            epicwin: Object.fromEntries(Object.entries(catalogueProfiles.epicwin.accounts).map(([name, account]) => [name, Boolean(account.id && account.secret)])),
            kissh5: Object.fromEntries(Object.entries(catalogueProfiles['918kissh5'].accounts).map(([name, account]) => [name, Boolean(account.id && account.secret)])),
            clotplay: Boolean(clotplayToken),
            jili: Object.fromEntries(Object.entries(jiliAccounts).map(([name, account]) => [name, Boolean(account.id && account.secret)])),
            rsghub: Boolean(env.RSGHUB_CLIENT_ID && env.RSGHUB_CLIENT_SECRET
              && env.RSGHUB_DES_KEY && env.RSGHUB_DES_IV && env.RSGHUB_SYSTEM_CODE),
            jdb: Boolean(env.JDB_BASE_URL && env.JDB_DC && env.JDB_AES_KEY
              && env.JDB_AES_IV && env.JDB_AGENT_ID),
            pragmaticplay: Boolean(env.PRAGMATIC_BASE_URL && env.PRAGMATIC_SECURE_LOGIN
              && env.PRAGMATIC_SECRET_KEY),
            vpay: Boolean(vpayTraderId && vpayApiToken),
            gspay: gspayReadiness(env).credentialsConfigured,
          },
          callbackUrls: callbackUrls(),
        }, cors);
      }

      if (req.method === 'GET' && url.pathname === '/readiness') {
        return send(res, 200, { service: 'master7-integration-gateway', version: VERSION,
          checkedAt: now().toISOString(), ...integrationReadiness(env) }, cors);
      }

      if (req.method === 'GET' && url.pathname === '/providers/evo888h5/games') {
        const result = await cached('evo-games', () => evo('/game/list'), value =>
          value.ok && (value.data?.code === 0 || value.data?.code === '0'));
        const providerOK = result.data?.code === 0 || result.data?.code === '0';
        return send(res, result.ok && providerOK ? 200 : 502, { provider: 'evo888h5', upstreamStatus: result.status, result: result.data }, cors);
      }

      if (req.method === 'GET' && url.pathname === '/providers/megah5/games') {
        const result = await cached('mega-games', () => mega('GetGameList', { Lang: 'en-us', Currency: currency }), value => {
          try { return value.ok && parseMegaCatalogueResponse(value.data).ok; }
          catch { return false; }
        });
        let parsed;
        try { parsed = parseMegaCatalogueResponse(result.data); }
        catch {
          return send(res, 502, { error: 'megah5_catalogue_invalid', provider: 'megah5',
            upstreamStatus: result.status }, cors);
        }
        if (!result.ok || !parsed.ok) {
          return send(res, 502, { error: 'megah5_catalogue_rejected', provider: 'megah5',
            upstreamStatus: result.status, providerStatus: parsed.status }, cors);
        }
        return send(res, 200, { provider: 'megah5', upstreamStatus: result.status,
          result: parsed.publicResult }, cors);
      }

      if (req.method === 'GET' && url.pathname === '/providers/metagaming/games') {
        const accountName = url.searchParams.get('account') || 'normal';
        if (!['normal', 'free'].includes(accountName)) {
          return send(res, 400, { error: 'invalid_catalogue_account' }, cors);
        }
        let account;
        try { account = metaAccount(env, accountName); }
        catch { return send(res, 503, { error: 'metagaming_catalogue_not_configured', account: accountName }, cors); }
        const requestPayload = buildMetaRequest('GetGameList', {
          operatorId: account.operatorId,
          secretKey: account.secretKey,
          now: now(),
        });
        const result = await cached(`metagaming-games-${accountName}`, () => upstream(`${account.baseUrl}/GetGameList`, {
          method: 'POST',
          redirect: 'error',
          headers: { Accept: 'application/json', 'Content-Type': 'application/json', 'User-Agent': PROVIDER_USER_AGENT },
          body: JSON.stringify(requestPayload),
        }), value => {
          try { return value.ok && parseMetaCatalogueResponse(value.data).ok; }
          catch { return false; }
        });
        if (!result.ok) {
          let providerStatus = null;
          try { providerStatus = parseMetaCatalogueResponse(result.data).status; }
          catch { /* HTTP failure bodies are not trusted provider envelopes. */ }
          return send(res, 502, { error: 'metagaming_catalogue_failed', account: accountName,
            upstreamStatus: result.status, providerStatus }, cors);
        }
        let parsed;
        try { parsed = parseMetaCatalogueResponse(result.data); }
        catch {
          return send(res, 502, { error: 'metagaming_catalogue_invalid', account: accountName,
            upstreamStatus: result.status }, cors);
        }
        if (!result.ok || !parsed.ok) {
          return send(res, 502, { error: 'metagaming_catalogue_failed', account: accountName,
            upstreamStatus: result.status, providerStatus: parsed.status }, cors);
        }
        return send(res, 200, {
          provider: 'metagaming',
          apiVersion: '3.4.8',
          account: accountName,
          currency: account.currency,
          games: parsed.games,
        }, cors);
      }

      if (req.method === 'GET' && url.pathname === '/providers/venus/games') {
        const result = await cached('venus-games', async () => ({ ok: true, data: await venusCatalogue({ env, fetchImpl, now }) }));
        return send(res, 200, result.data, cors);
      }

      if (req.method === 'GET' && url.pathname === '/providers/rsghub/games') {
        const result = await cached('rsghub-games', async () => ({ ok: true, data: await rsghubCatalogue({ env, fetchImpl, now }) }));
        return send(res, 200, result.data, cors);
      }

      if (req.method === 'GET' && url.pathname === '/providers/jdb/games') {
        const result = await cached('jdb-games', async () => ({ ok: true, data: await jdbCatalogue({ env, fetchImpl, now }) }));
        return send(res, 200, result.data, cors);
      }

      if (req.method === 'GET' && url.pathname === '/providers/pragmaticplay/games') {
        const result = await cached('pragmaticplay-games', async () => ({ ok: true, data: await pragmaticCatalogue({ env, fetchImpl }) }));
        return send(res, 200, result.data, cors);
      }

      if (req.method === 'GET' && url.pathname === '/providers/jili/games') {
        const accountName = url.searchParams.get('account') || '1to1';
        if (!Object.prototype.hasOwnProperty.call(jiliAccounts, accountName)) {
          return send(res, 400, { error: 'invalid_catalogue_account' }, cors);
        }
        const account = jiliAccounts[accountName];
        if (!account.id || !account.secret) return send(res, 503, { error: 'catalogue_not_configured' }, cors);
        const endpoint = new URL(`${jiliBase}/GetGameList`);
        if (endpoint.protocol !== 'https:' || endpoint.username || endpoint.password || endpoint.search || endpoint.hash) {
          return send(res, 503, { error: 'jili_invalid_configuration' }, cors);
        }
        const agentId = String(account.id).trim();
        if (!/^[A-Za-z0-9_]+$/.test(agentId)) return send(res, 503, { error: 'jili_invalid_configuration' }, cors);
        const result = await upstream(endpoint.toString(), {
          method: 'POST',
          redirect: 'error',
          headers: { Accept: 'application/json', 'Content-Type': 'application/x-www-form-urlencoded' },
          body: jiliCatalogueBody(agentId, String(account.secret), now()),
        });
        if (!result.ok || result.data?.ErrorCode !== 0 || !Array.isArray(result.data?.Data)) {
          return send(res, 502, {
            error: 'provider_catalogue_failed', provider: 'jili', upstreamStatus: result.status,
            providerStatus: Number.isSafeInteger(result.data?.ErrorCode) ? result.data.ErrorCode : null,
          }, cors);
        }
        return send(res, 200, {
          provider: 'jili', account: accountName, currency: 'MYR', ratio: account.ratio,
          games: normalizeJiliGames(result.data.Data),
        }, cors);
      }

      const catalogueMatch = url.pathname.match(/^\/providers\/(epicwin|918kissh5)\/games$/);
      if (req.method === 'GET' && catalogueMatch) {
        const provider = catalogueMatch[1];
        const profile = catalogueProfiles[provider];
        const accountName = url.searchParams.get('account') || 'normal';
        if (!Object.prototype.hasOwnProperty.call(profile.accounts, accountName)) {
          return send(res, 400, { error: 'invalid_catalogue_account' }, cors);
        }
        const account = profile.accounts[accountName];
        if (!account.id || !account.secret) return send(res, 503, { error: 'catalogue_not_configured' }, cors);
        const date = utcSeconds(now());
        const result = await upstream(`${profile.base}/GetGameList`, {
          method: 'POST',
          headers: { Accept: 'application/json', 'Content-Type': 'application/json', 'User-Agent': PROVIDER_USER_AGENT },
          body: JSON.stringify({
            OperatorId: String(account.id),
            RequestDateTime: date,
            Signature: megaSignature('GetGameList', date, String(account.id), String(account.secret)),
            Currency: account.currency,
            Lang: 'en-us',
          }),
        });
        let catalogue = null;
        if (result.ok) {
          try {
            catalogue = provider === '918kissh5'
              ? parseKissh5CatalogueResponse(result.data)
              : parseEpicwinCatalogueResponse(result.data);
          }
          catch { /* A malformed success response cannot publish a partial catalogue. */ }
        }
        const providerStatus = Number.isSafeInteger(result.data?.Status) ? result.data.Status : null;
        if (!result.ok || !catalogue?.ok) {
          return send(res, 502, {
            error: 'provider_catalogue_failed',
            provider,
            upstreamStatus: result.status,
            providerStatus,
          }, cors);
        }
        return send(res, 200, {
          provider,
          account: accountName,
          currency: account.currency,
          games: catalogue.games,
        }, cors);
      }

      if (req.method === 'GET' && url.pathname === '/providers/clotplay/games') {
        const page = url.searchParams.get('page') || '1';
        if (!/^[1-9]\d{0,5}$/.test(page)) return send(res, 400, { error: 'invalid_page' }, cors);
        if (!clotplayToken) return send(res, 503, { error: 'clotplay_not_configured' }, cors);
        const result = await upstream(`${clotplayBase}/get-game-list?per_page=100&page=${page}`, {
          headers: { Accept: 'application/json', Authorization: clotplayToken, 'User-Agent': PROVIDER_USER_AGENT },
        });
        if (!result.ok || !Array.isArray(result.data && result.data.data)) {
          return send(res, 502, { error: 'clotplay_catalogue_failed', upstreamStatus: result.status }, cors);
        }
        // Project public catalogue fields only; never forward authentication or member data.
        const games = result.data.data.map(game => ({
          gameCode: String(game.slug || ''),
          name: String(game.name || ''),
          nameZh: String(game.name_cn || ''),
          category: String(game.category || ''),
          maintenance: Number(game.is_maintenance) === 1,
          thumbnails: Object.fromEntries(['en', 'cn', 'th'].map(lang => [
            lang, Object.fromEntries(['square', 'portrait'].map(shape => {
              const value = game.thumbnails?.[lang]?.[shape];
              return [shape, typeof value === 'string' && value.startsWith('https://') ? value : null];
            })),
          ])),
        }));
        const pagination = result.data.pagination || {};
        return send(res, 200, {
          provider: 'clotplay',
          games,
          pagination: Object.fromEntries(['current_page', 'last_page', 'per_page', 'total'].map(key => [
            key, Number.isSafeInteger(pagination[key]) && pagination[key] >= 0 ? pagination[key] : null,
          ])),
        }, cors);
      }

      if (req.method === 'GET' && url.pathname === '/callbacks') {
        return send(res, 200, { currency, callbackUrls: callbackUrls() }, cors);
      }

      if (req.method === 'GET' && url.pathname === '/diagnostics/egress-ip') {
        const result = await upstream('https://api64.ipify.org?format=json', { headers: { Accept: 'application/json' } });
        const ip = result.data && typeof result.data.ip === 'string' ? result.data.ip : null;
        return send(res, result.ok && ip ? 200 : 502, { ok: Boolean(result.ok && ip), ip });
      }

      if (req.method === 'GET' && url.pathname === '/providers/vpay/status') {
        return send(res, 200, {
          provider: 'vpay',
          configured: Boolean(vpayTraderId && vpayApiToken),
          mode: String(env.VPAY_MODE || 'uat'),
          readiness: vpayReadiness(env),
          gateway: vpayBase,
          callbackUrls: {
            payment: callbackUrls().vpayPayment,
            withdrawal: callbackUrls().vpayWithdrawal,
          },
        }, cors);
      }

      if (req.method === 'GET' && url.pathname === '/providers/gspay/status') {
        const readiness = gspayReadiness(env);
        const transactionRoutesActive = Object.values(readiness.channels).some(channel => channel.routeReady);
        return send(res, 200, {
          provider: 'gspay',
          currency: 'MYR',
          configured: readiness.credentialsConfigured,
          mode: readiness.mode,
          createProgramReady: readiness.channels.orders.programReady === true,
          orderRouteEnabled: readiness.channels.orders.routeReady === true,
          transactionRoutesActive,
          productionQa: 'not_verified',
          liveReady: false,
          contract: readiness.contract,
          callbackUrls: {
            payment: callbackUrls().gspayPayment,
            duitNow: callbackUrls().gspayDuitNow,
          },
        }, cors);
      }

      const gspayProviderBridgeMatch = url.pathname.match(
        /^\/v2\/integrations\/operators\/([^/]+)\/(payment|getpayment)$/,
      );
      if (gspayProviderBridgeMatch) {
        let suppliedAuth;
        try { suppliedAuth = decodeURIComponent(gspayProviderBridgeMatch[1]); }
        catch { return send(res, 401, { error: 'invalid_gspay_platform_auth' }); }
        const operation = gspayProviderBridgeMatch[2];
        const readiness = gspayReadiness(env);
        const internalAuth = gspayPeerCredential(env, 'PLATFORM_GSPAY_ORDER_TOKEN');
        const internalSecret = gspayPeerCredential(env, 'PLATFORM_GSPAY_QUERY_TOKEN');
        if (!internalAuth || !internalSecret || !safeEqual(suppliedAuth, internalAuth)) {
          if (req.method === 'POST') await body(req);
          return send(res, 401, { error: 'invalid_gspay_platform_auth' });
        }

        if (operation === 'payment' && req.method === 'POST') {
          if (!readiness.channels.orders.routeReady) {
            await body(req);
            return send(res, 503, { error: 'gspay_orders_disabled' });
          }
          const payload = await body(req);
          let expectedSignature;
          try {
            expectedSignature = paymentOrderSignature({
              transactionId: payload.transaction_id,
              playerUsername: payload.player_username,
              amount: payload.amount,
            }, internalSecret);
          } catch { return send(res, 400, { error: 'invalid_gspay_order' }); }
          if (!safeEqual(payload.signature, expectedSignature)) {
            return send(res, 401, { error: 'invalid_gspay_order_signature' });
          }
          let providerRequest;
          try {
            providerRequest = paymentOrderRequest({
              transactionId: payload.transaction_id,
              playerUsername: payload.player_username,
              amount: payload.amount,
            }, env.GSPAY_OPERATOR_AUTH_KEY, env.GSPAY_OPERATOR_SECRET_KEY);
          } catch { return send(res, 503, { error: 'gspay_provider_not_configured' }); }
          const result = await upstream(providerRequest.url, {
            method: providerRequest.method,
            headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
            body: JSON.stringify(providerRequest.body),
            redirect: 'error',
          });
          if (!result.ok) return send(res, 502, { error: 'gspay_provider_rejected_order', upstreamStatus: result.status });
          try { paymentOrderResponse(result.data); }
          catch { return send(res, 502, { error: 'gspay_invalid_order_response', upstreamStatus: result.status }); }
          return send(res, 200, result.data);
        }

        if (operation === 'getpayment' && req.method === 'GET') {
          if (!readiness.channels.queries.routeReady) {
            return send(res, 503, { error: 'gspay_queries_disabled' });
          }
          const transactionId = url.searchParams.get('transaction_id') || '';
          if (!safeEqual(url.searchParams.get('auth_key'), internalAuth)
              || !/^[A-Za-z0-9_-]{8,100}$/.test(transactionId)) {
            return send(res, 400, { error: 'invalid_gspay_query' });
          }
          let providerRequest;
          try { providerRequest = paymentQueryRequest(transactionId, env.GSPAY_OPERATOR_AUTH_KEY); }
          catch { return send(res, 503, { error: 'gspay_provider_not_configured' }); }
          const result = await upstream(providerRequest.url, {
            method: providerRequest.method,
            headers: { Accept: 'application/json' },
            redirect: 'error',
          });
          if (!result.ok) return send(res, 502, { error: 'gspay_provider_query_failed', upstreamStatus: result.status });
          let verified;
          try { verified = paymentStatusPayload(gspayEnvelopePayload(result.data), env.GSPAY_OPERATOR_SECRET_KEY); }
          catch { return send(res, 502, { error: 'gspay_invalid_query_response', upstreamStatus: result.status }); }
          return send(res, 200, {
            code: 200,
            message: 'ok',
            data: {
              payment_id: verified.paymentId,
              transaction_id: verified.transactionId,
              player_username: verified.playerUsername,
              amount: verified.amount,
              completed: verified.completed,
              success: verified.success,
              remark: verified.remark,
              signature: paymentSignature({
                paymentId: verified.paymentId,
                amount: verified.amount,
                transactionId: verified.transactionId,
              }, internalSecret),
            },
          });
        }

        if (req.method === 'POST') await body(req);
        return send(res, 405, { error: 'method_not_allowed' });
      }

      const gspayCallbackMatch = url.pathname.match(/^\/callbacks\/gspay\/(payment|duitnow)$/);
      if (gspayCallbackMatch && req.method === 'GET') {
        const readiness = gspayReadiness(env);
        return send(res, 200, {
          ok: true,
          provider: 'gspay',
          callback: gspayCallbackMatch[1],
          active: gspayCallbackMatch[1] === 'payment' && readiness.channels.callbacks.routeReady,
          productionQa: 'not_verified',
        });
      }
      if (gspayCallbackMatch && req.method === 'POST') {
        const readiness = gspayReadiness(env);
        if (gspayCallbackMatch[1] !== 'payment' || !readiness.channels.callbacks.routeReady) {
          await body(req);
          return send(res, 503, { error: 'gspay_callback_contract_not_active' });
        }
        const payload = await body(req);
        if (!safeEqual(payload.auth_key, env.GSPAY_OPERATOR_AUTH_KEY)) {
          return send(res, 401, { error: 'invalid_gspay_callback_auth' });
        }
        let verified;
        try { verified = paymentStatusPayload(payload, env.GSPAY_OPERATOR_SECRET_KEY); }
        catch { return send(res, 401, { error: 'invalid_gspay_callback_signature' }); }
        const internalAuth = gspayPeerCredential(env, 'PLATFORM_GSPAY_ORDER_TOKEN');
        const internalSecret = gspayPeerCredential(env, 'PLATFORM_GSPAY_QUERY_TOKEN');
        const callbackToken = gspayPeerCredential(env, 'PLATFORM_GSPAY_CALLBACK_TOKEN');
        const forwardUrl = normalizeHttpsUrl(String(env.GSPAY_PAYMENT_FORWARD_URL || ''));
        if (!internalAuth || !internalSecret || !callbackToken || !forwardUrl) {
          return send(res, 503, { error: 'platform_gspay_callback_not_configured' });
        }
        const forwarded = {
          auth_key: internalAuth,
          success: verified.success,
          completed: verified.completed,
          payment_id: verified.paymentId,
          transaction_id: verified.transactionId,
          player_username: verified.playerUsername,
          amount: verified.amount,
          remark: verified.remark,
          signature: paymentSignature({
            paymentId: verified.paymentId,
            amount: verified.amount,
            transactionId: verified.transactionId,
          }, internalSecret),
        };
        const forward = await upstream(forwardUrl, {
          method: 'POST',
          headers: {
            Accept: 'text/plain,application/json',
            'Content-Type': 'application/json',
            Authorization: `Bearer ${callbackToken}`,
          },
          body: JSON.stringify(forwarded),
        });
        return forward.ok && /^(?:ok|success)$/i.test(forward.raw.trim())
          ? sendText(res, 200, 'ok')
          : send(res, 502, { error: 'platform_gspay_callback_failed' });
      }

      const vpayCallbackMatch = url.pathname.match(/^\/callbacks\/vpay\/(payment|withdrawal)$/);
      if (vpayCallbackMatch && req.method === 'GET') {
        return send(res, 200, {
          ok: true,
          provider: 'vpay',
          callback: vpayCallbackMatch[1],
          configured: Boolean(vpayTraderId && vpayApiToken),
          currency,
        });
      }
      if (vpayCallbackMatch && req.method === 'POST') {
        if (!vpayTraderId || !vpayApiToken) return send(res, 503, { error: 'vpay_not_configured' });
        const payload = await body(req);
        if (String(payload.trader_id || '') !== vpayTraderId || !verifyVpayNotification(payload, vpayApiToken)) {
          return send(res, 401, { error: 'invalid_vpay_signature' });
        }
        const forwardUrl = vpayCallbackMatch[1] === 'payment'
          ? officialVpayPaymentForwardUrl(String(env.VPAY_PAYMENT_FORWARD_URL || ''))
          : normalizeHttpsUrl(String(env.VPAY_WITHDRAWAL_FORWARD_URL || ''));
        const callbackToken = walletPeerCredential('PLATFORM_CALLBACK_TOKEN');
        if (!forwardUrl || !callbackToken) {
          return send(res, 503, { error: 'platform_wallet_callback_not_configured' });
        }
        const forward = await upstream(forwardUrl, {
          method: 'POST',
          headers: {
            Accept: 'application/json,text/plain',
            'Content-Type': 'application/json',
            Authorization: `Bearer ${callbackToken}`,
          },
          body: JSON.stringify(payload),
        });
        // Only the platform wallet's explicit durable acknowledgement may stop
        // provider retries. An arbitrary HTTP 200 (e.g. a login page) is not it.
        return forward.ok && forward.acknowledgement
          ? sendText(res, 200, 'SUCCESS')
          : send(res, 502, { error: 'platform_wallet_callback_failed' });
      }

      const callbackMatch = url.pathname.match(/^\/callbacks\/(cosmoplay|creative-gaming|pgsoft|spade-gaming)(?:\/([A-Za-z0-9_-]+))?$/);
      if (callbackMatch && req.method === 'GET') {
        return send(res, 200, { ok: true, provider: callbackMatch[1], callback: 'reachable', currency });
      }
      if (callbackMatch && req.method === 'POST') {
        await body(req);
        return send(res, 503, { ok: false, provider: callbackMatch[1], code: 'CALLBACK_CONTRACT_NOT_ACTIVE' });
      }

      if (req.method === 'GET' && url.pathname === '/platform/vpay/config') {
        if (!isWalletQueryPeer(req)) return send(res, 401, { error: 'unauthorized' });
        return send(res, 200, walletPaymentConfiguration());
      }

      if (req.method === 'GET' && url.pathname === '/platform/gspay/config') {
        if (!isGspayPeer(req, 'PLATFORM_GSPAY_QUERY_TOKEN')) return send(res, 401, { error: 'unauthorized' });
        return send(res, 200, gspayConfiguration());
      }

      if (req.method === 'POST' && url.pathname === '/platform/gspay/order') {
        if (!isGspayPeer(req, 'PLATFORM_GSPAY_ORDER_TOKEN')) return send(res, 401, { error: 'unauthorized' });
        const readiness = gspayReadiness(env);
        if (!readiness.channels.orders.routeReady) {
          await body(req);
          return send(res, 503, { error: 'gspay_orders_disabled' });
        }
        const payload = await body(req);
        if (payload.currency !== 'MYR' || payload.contract !== 'gspay-myr-create-v1'
          || typeof payload.transactionId !== 'string' || !/^[A-Za-z0-9_-]{8,100}$/.test(payload.transactionId)
          || typeof payload.playerUsername !== 'string' || !/^[a-z0-9_-]{3,40}$/.test(payload.playerUsername)) {
          return send(res, 400, { error: 'invalid_gspay_order' });
        }
        let request;
        try {
          request = paymentOrderRequest({
            transactionId: payload.transactionId,
            playerUsername: payload.playerUsername,
            amount: payload.amount,
          }, env.GSPAY_OPERATOR_AUTH_KEY, env.GSPAY_OPERATOR_SECRET_KEY);
        } catch {
          return send(res, 400, { error: 'invalid_gspay_order' });
        }
        const result = await upstream(request.url, {
          method: request.method,
          headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
          body: JSON.stringify(request.body),
          redirect: 'error',
        });
        if (!result.ok) return send(res, 502, {
          error: 'gspay_provider_rejected_order', upstreamStatus: result.status,
        });
        let created;
        try { created = paymentOrderResponse(result.data); }
        catch { return send(res, 502, { error: 'gspay_invalid_order_response', upstreamStatus: result.status }); }
        return send(res, 200, {
          provider: 'gspay_myr',
          contract: 'gspay-myr-create-v1',
          upstreamStatus: result.status,
          result: {
            transactionId: payload.transactionId,
            playerUsername: payload.playerUsername,
            currency: 'MYR',
            amount: request.body.amount,
            paymentId: created.paymentId,
            paymentUrl: created.paymentUrl,
            responseSchemaVerified: false,
            fundsProcessed: false,
          },
        });
      }

      if (req.method === 'POST' && url.pathname === '/platform/gspay/order-query') {
        if (!isGspayPeer(req, 'PLATFORM_GSPAY_QUERY_TOKEN')) return send(res, 401, { error: 'unauthorized' });
        const readiness = gspayReadiness(env);
        if (!readiness.channels.queries.routeReady) {
          await body(req);
          return send(res, 503, { error: 'gspay_queries_disabled' });
        }
        const payload = await body(req);
        const transactionId = typeof payload.transactionId === 'string' ? payload.transactionId : '';
        if (!/^[A-Za-z0-9_-]{8,100}$/.test(transactionId)) {
          return send(res, 400, { error: 'invalid_gspay_query' });
        }
        let providerRequest;
        try { providerRequest = paymentQueryRequest(transactionId, env.GSPAY_OPERATOR_AUTH_KEY); }
        catch { return send(res, 503, { error: 'gspay_provider_not_configured' }); }
        const result = await upstream(providerRequest.url, {
          method: providerRequest.method,
          headers: { Accept: 'application/json' },
          redirect: 'error',
        });
        if (!result.ok) return send(res, 502, { error: 'gspay_provider_query_failed', upstreamStatus: result.status });
        let verified;
        try { verified = paymentStatusPayload(gspayEnvelopePayload(result.data), env.GSPAY_OPERATOR_SECRET_KEY); }
        catch { return send(res, 502, { error: 'gspay_invalid_query_response', upstreamStatus: result.status }); }
        return send(res, 200, {
          provider: 'gspay_myr',
          contract: 'gspay-myr-query-v1',
          upstreamStatus: result.status,
          result: {
            paymentId: verified.paymentId,
            transactionId: verified.transactionId,
            playerUsername: verified.playerUsername,
            amount: verified.amount,
            completed: verified.completed,
            success: verified.success,
            remark: verified.remark,
          },
        });
      }

      if (req.method === 'POST' && ['/admin/vpay/order', '/platform/vpay/order'].includes(url.pathname)) {
        const walletOrder = url.pathname === '/platform/vpay/order';
        if (walletOrder ? !isWalletOrderPeer(req) : !isAdmin(req)) return send(res, 401, { error: 'unauthorized' });
        if (String(env.VPAY_ORDERS_ENABLED || '').toLowerCase() !== 'true') {
          return send(res, 503, { error: 'vpay_orders_disabled' });
        }
        const payload = await body(req);
        const outTradeNo = String(payload.outTradeNo || '');
        const title = String(payload.title || '');
        const amount = String(payload.amount || '');
        const tradeCode = String(payload.tradeCode || '');
        const payerName = String(payload.payerName || '');
        if (!/^[A-Za-z0-9_-]{1,50}$/.test(outTradeNo) || !/^\d{1,7}(?:\.\d{1,2})?$/.test(amount)
          || Number(amount) <= 0
          || !['1', '2', '3', '4', '5', '7'].includes(tradeCode)
          || title.length < 1 || title.length > 100 || payerName.length < 1 || payerName.length > 30) {
          return send(res, 400, { error: 'invalid_vpay_order' });
        }
        if (!vpayReadiness(env).channels.payment.configurationReady) {
          return send(res, 503, { error: 'vpay_payment_configuration_incomplete' });
        }
        const peerConfiguration = walletPaymentConfiguration();
        if (walletOrder && (!peerConfiguration.paymentReady || !peerConfiguration.tradeCodes.includes(tradeCode)
          || payload.notifyUrl !== peerConfiguration.notifyUrl || payload.callbackUrl !== peerConfiguration.returnUrl)) {
          return send(res, 503, { error: 'vpay_payment_configuration_incomplete' });
        }
        const returnUrl = walletOrder ? peerConfiguration.returnUrl
          : (env.VPAY_RETURN_URL ? vpayReturnUrl : officialVpayReturnUrl(`${DEFAULT_PORTAL_ORIGIN}/payment/return`));
        if (!returnUrl) return send(res, 503, { error: 'vpay_payment_configuration_incomplete' });
        const result = await vpay('TRADER_ORDER', {
          title,
          out_trade_no: outTradeNo,
          amount,
          trade_code: tradeCode,
          payer_name: payerName,
          notify_url: callbackUrls().vpayPayment,
          callback_url: returnUrl,
        });
        const providerOK = result.data?.code === 0 || result.data?.code === '0';
        return send(res, result.ok && providerOK ? 200 : 502, {
          provider: 'vpay',
          upstreamStatus: result.status,
          result: result.data,
        });
      }

      if (req.method === 'POST' && ['/admin/vpay/order-query', '/platform/vpay/order-query'].includes(url.pathname)) {
        const walletQuery = url.pathname === '/platform/vpay/order-query';
        if (walletQuery ? !isWalletQueryPeer(req) : !isAdmin(req)) return send(res, 401, { error: 'unauthorized' });
        const payload = await body(req);
        const outTradeNo = String(payload.outTradeNo || '');
        if (!/^[A-Za-z0-9_-]{1,50}$/.test(outTradeNo)) return send(res, 400, { error: 'invalid_out_trade_no' });
        const tradeNo = String(payload.tradeNo || '');
        const hasTradeNo = Object.hasOwn(payload, 'tradeNo');
        if (walletQuery && hasTradeNo && !/^[A-Za-z0-9_-]{1,128}$/.test(tradeNo)) return send(res, 400, { error: 'invalid_trade_no' });
        // An ambiguous create may have no supplier reference. ORDER_GET already
        // supports the merchant order ID on the admin path; allow the same
        // read-only lookup for the query peer. Never create or infer a payment.
        const result = await vpay('ORDER_GET', { out_trade_no: outTradeNo, ...(walletQuery && hasTradeNo ? { trade_no: tradeNo } : {}) });
        const providerOK = result.data?.code === 0 || result.data?.code === '0';
        const message = typeof result.data?.msg === 'string' ? result.data.msg.trim().toLowerCase().replace(/[.!?]+$/, '') : '';
        const failureClass = ['invalid signature','invalid sign','signature error','sign error','wrong signature','签名错误','签名失败'].includes(message) ? 'vpay_invalid_signature'
          : ['order not found','order does not exist','the order does not exist',"order doesn't exist",'this deposit is not exist','订单不存在','订单号不存在'].includes(message) ? 'vpay_order_not_found'
          : ['invalid token','invalid api key','invalid api token','api key not found'].includes(message) ? 'vpay_invalid_credentials' : 'vpay_query_rejected';
        return send(res, result.ok && providerOK ? 200 : 502, {
          ...(!providerOK ? { error: failureClass } : {}),
          provider: 'vpay',
          upstreamStatus: result.status,
          result: result.data,
        });
      }

      if (req.method === 'POST' && url.pathname === '/admin/vpay/balance') {
        if (!isAdmin(req)) return send(res, 401, { error: 'unauthorized' });
        const result = await vpay('TRADER_BALANCE');
        const providerOK = result.data?.code === 0 || result.data?.code === '0';
        return send(res, result.ok && providerOK ? 200 : 502, {
          provider: 'vpay',
          upstreamStatus: result.status,
          result: result.data,
        });
      }

      if (req.method === 'POST' && ['/admin/vpay/withdrawal', '/platform/vpay/withdrawal'].includes(url.pathname)) {
        const walletPayout = url.pathname === '/platform/vpay/withdrawal';
        if (walletPayout ? !isWalletPayoutPeer(req) : !isAdmin(req)) return send(res, 401, { error: 'unauthorized' });
        if (String(env.VPAY_WITHDRAWALS_ENABLED || '').toLowerCase() !== 'true') {
          return send(res, 503, { error: 'vpay_withdrawals_disabled' });
        }
        const payload = await body(req);
        const amount = String(payload.amount || '');
        const bankName = String(payload.bankName || '');
        const accountName = String(payload.accountName || '');
        const accountNumber = String(payload.accountNumber || '');
        const refId = String(payload.refId || '');
        const supportedBanks = new Set(['MBB', 'CIMB', 'HLB', 'RHB', 'PBB', 'AMB', 'BSN', 'ISLAM',
          'HSBC', 'SCB', 'UOB', 'OCBC', 'ALB', 'AFB', 'BMM', 'GXB', 'TNG', 'RJHIB', 'DuitNow',
          'BOOSTB', 'BOOST', 'SPP', 'AGRO', 'RYT', 'KRYT']);
        if (!/^\d{1,7}\.\d{2}$/.test(amount) || !supportedBanks.has(bankName)
          || Number(amount) <= 0
          || accountName.length < 1 || accountName.length > 100 || !/^[A-Za-z0-9-]{4,40}$/.test(accountNumber)
          || !/^[A-Za-z0-9_-]{8,50}$/.test(refId)
          || (walletPayout && (payload.contract !== 'vpay-payout-v1' || payload.currency !== 'MYR'))) {
          return send(res, 400, { error: 'invalid_vpay_withdrawal' });
        }
        if (!vpayReadiness(env).channels.withdrawal.configurationReady) {
          return send(res, 503, { error: 'vpay_withdrawal_configuration_incomplete' });
        }
        const result = await vpay('MONEY_OUT', {
          amount,
          bank_name: bankName,
          acc_name: accountName,
          acc_no: accountNumber,
          ...(payload.openBankName ? { open_bank_name: String(payload.openBankName) } : {}),
          ref_id: refId,
          notify_url: callbackUrls().vpayWithdrawal,
        });
        const providerOK = result.data?.code === 0 || result.data?.code === '0';
        return send(res, result.ok && providerOK ? 200 : 502, {
          provider: 'vpay',
          upstreamStatus: result.status,
          result: result.data,
        });
      }

      if (req.method === 'POST' && ['/admin/vpay/withdrawal-query', '/platform/vpay/withdrawal-query'].includes(url.pathname)) {
        const walletPayout = url.pathname === '/platform/vpay/withdrawal-query';
        if (walletPayout ? !isWalletPayoutPeer(req) : !isAdmin(req)) return send(res, 401, { error: 'unauthorized' });
        const payload = await body(req);
        const outMoneyId = String(payload.outMoneyId || '');
        if (!/^[A-Za-z0-9_-]{8,50}$/.test(outMoneyId)
          || (walletPayout && payload.contract !== 'vpay-payout-query-v1')) {
          return send(res, 400, { error: 'invalid_out_money_id' });
        }
        const result = await vpay('MONEY_GET', { out_money_id: outMoneyId });
        const providerOK = result.data?.code === 0 || result.data?.code === '0';
        return send(res, result.ok && providerOK ? 200 : 502, {
          provider: 'vpay',
          upstreamStatus: result.status,
          result: result.data,
        });
      }

      if (req.method === 'POST' && url.pathname === '/admin/evo888h5/player') {
        if (!isAdmin(req)) return send(res, 401, { error: 'unauthorized' });
        const payload = await body(req);
        if (!/^[A-Za-z0-9]{4,20}$/.test(String(payload.userid || ''))) return send(res, 400, { error: 'invalid_userid' });
        const result = await evo('/user/create', 'POST', { userid: String(payload.userid) });
        const providerOK = result.data?.code === 0 || result.data?.code === '0';
        return send(res, result.ok && providerOK ? 200 : 502, { provider: 'evo888h5', upstreamStatus: result.status, result: result.data });
      }

      if (req.method === 'POST' && url.pathname === '/admin/evo888h5/balance') {
        if (!isAdmin(req)) return send(res, 401, { error: 'unauthorized' });
        const payload = await body(req);
        if (!/^[A-Za-z0-9]{4,20}$/.test(String(payload.userid || ''))) return send(res, 400, { error: 'invalid_userid' });
        const result = await evo('/user/balance', 'POST', { userid: String(payload.userid) });
        const providerOK = result.data?.code === 0 || result.data?.code === '0';
        return send(res, result.ok && providerOK ? 200 : 502, { provider: 'evo888h5', upstreamStatus: result.status, result: result.data });
      }

      if (req.method === 'POST' && ['/admin/megah5/session', '/platform/megah5/session'].includes(url.pathname)) {
        const platformRequest = url.pathname === '/platform/megah5/session';
        if (platformRequest ? !isGamePeer(req) : !isAdmin(req)) return send(res, 401, { error: 'unauthorized' });
        if (!megah5ProviderMappingVerified(env)) {
          return send(res, 503, { error: 'megah5_provider_mapping_unverified' });
        }
        const payload = await body(req);
        const playerId = String(payload.playerId || '');
        const gameCode = typeof payload.gameCode === 'string' ? payload.gameCode : '';
        const ip = String(payload.ip || '');
        const lang = payload.lang === undefined ? 'en-us' : payload.lang;
        const demo = payload.demo === undefined ? false : payload.demo;
        const redirectUrl = String(env.REDIRECT_URL || DEFAULT_PORTAL_ORIGIN);
        if (!validMegaPlayerId(playerId) || !validMegaGameCode(gameCode)
            || !validMegaIpv4(ip) || !validMegaLanguage(lang) || typeof demo !== 'boolean') {
          return send(res, 400, { error: 'invalid_session_input' });
        }
        if (!validMegaRedirectUrl(redirectUrl)) {
          return send(res, 503, { error: 'megah5_session_configuration_invalid' });
        }
        const result = await mega('GameLogin', {
          PlayerId: playerId,
          Ip: ip,
          GameCode: gameCode,
          Currency: currency,
          Lang: lang,
          RedirectUrl: redirectUrl,
          LaunchDemo: demo,
        });
        let parsed;
        try { parsed = parseMegaLaunchResponse(result.data); }
        catch {
          return send(res, 502, { error: 'megah5_launch_response_invalid', provider: 'megah5',
            upstreamStatus: result.status });
        }
        if (!result.ok || !parsed.ok) {
          return send(res, 502, { error: 'megah5_launch_rejected', provider: 'megah5',
            upstreamStatus: result.status, providerStatus: parsed.status });
        }
        return send(res, 200, { provider: 'megah5', upstreamStatus: result.status,
          result: parsed.publicResult });
      }

      if (req.method === 'POST' && url.pathname === '/platform/megah5/balance') {
        if (!isGamePeer(req)) return send(res, 401, { error: 'unauthorized' });
        if (!megah5ProviderMappingVerified(env)) {
          return send(res, 503, { error: 'megah5_provider_mapping_unverified' });
        }
        const payload = await body(req);
        const playerId = String(payload.playerId || '');
        if (!validMegaPlayerId(playerId)) return send(res, 400, { error: 'invalid_player_id' });
        const result = await mega('CheckBalance', { PlayerId: playerId });
        let parsed;
        try { parsed = parseMegaBalanceResponse(result.data, currency); }
        catch {
          return send(res, 502, { error: 'megah5_balance_response_invalid', provider: 'megah5',
            upstreamStatus: result.status });
        }
        if (!result.ok || !parsed.ok) {
          return send(res, 502, { error: 'megah5_balance_rejected', provider: 'megah5',
            upstreamStatus: result.status, providerStatus: parsed.status });
        }
        return send(res, 200, { provider: 'megah5', upstreamStatus: result.status,
          result: parsed.publicResult });
      }

      if (req.method === 'POST' && url.pathname === '/platform/megah5/transfer-status') {
        if (!isGameWalletPeer(req)) return send(res, 401, { error: 'unauthorized' });
        if (!megah5ProviderMappingVerified(env)) {
          return send(res, 503, { error: 'megah5_provider_mapping_unverified' });
        }
        if (!megah5TransferReadiness(env).channels.status.configurationReady) {
          return send(res, 503, { error: 'megah5_transfer_status_disabled' });
        }
        const payload = await body(req);
        const playerId = String(payload.playerId || '');
        const referenceId = String(payload.referenceId || '');
        const transferType = megaTransferType(payload.transferType);
        if (!validMegaPlayerId(playerId) || !validMegaReferenceId(referenceId) || !transferType) {
          return send(res, 400, { error: 'invalid_megah5_transfer_status' });
        }
        const result = await mega('CheckTransferStatus', {
          PlayerId: playerId,
          ReferenceId: referenceId,
          TransferType: transferType,
        });
        let parsed;
        try { parsed = parseMegaTransferStatusResponse(result.data); }
        catch {
          return send(res, 502, { error: 'megah5_transfer_status_response_invalid', provider: 'megah5',
            operation: 'transfer_status', upstreamStatus: result.status });
        }
        if (!result.ok || !parsed.ok) {
          return send(res, 502, { error: 'megah5_transfer_status_rejected', provider: 'megah5',
            operation: 'transfer_status', upstreamStatus: result.status, providerStatus: parsed.status });
        }
        return send(res, 200, { provider: 'megah5', operation: 'transfer_status',
          upstreamStatus: result.status, result: parsed.publicResult });
      }

      const megaTransferMatch = url.pathname.match(/^\/platform\/megah5\/(deposit|withdraw)$/);
      if (req.method === 'POST' && megaTransferMatch) {
        if (!isGameWalletPeer(req)) return send(res, 401, { error: 'unauthorized' });
        if (!megah5ProviderMappingVerified(env)) {
          return send(res, 503, { error: 'megah5_provider_mapping_unverified' });
        }
        const operation = megaTransferMatch[1];
        const readiness = megah5TransferReadiness(env).channels[operation === 'deposit' ? 'deposit' : 'withdrawal'];
        if (!readiness.configurationReady) return send(res, 503, { error: 'megah5_transfers_disabled' });
        const payload = await body(req);
        const playerId = String(payload.playerId || '');
        const amount = typeof payload.amount === 'string' ? payload.amount : '';
        const referenceId = String(payload.referenceId || '');
        if (!validMegaPlayerId(playerId) || !canonicalMegaAmount(amount) || !validMegaReferenceId(referenceId)) {
          return send(res, 400, { error: 'invalid_megah5_transfer' });
        }
        const method = operation === 'deposit' ? 'Deposit' : 'Withdraw';
        const result = await mega(method, { PlayerId: playerId, Amount: amount, ReferenceId: referenceId });
        let parsed;
        try { parsed = parseMegaBalanceResponse(result.data, currency); }
        catch {
          return send(res, 502, { error: 'megah5_transfer_response_invalid', provider: 'megah5',
            operation, referenceId, upstreamStatus: result.status });
        }
        if (!result.ok || !parsed.ok) {
          return send(res, 502, { error: 'megah5_transfer_rejected', provider: 'megah5', operation,
            referenceId, upstreamStatus: result.status, providerStatus: parsed.status });
        }
        return send(res, 200, { provider: 'megah5', operation, referenceId,
          upstreamStatus: result.status, result: parsed.publicResult });
      }

      return send(res, 404, { error: 'not_found' }, cors);
    } catch (error) {
      const status = Number(error.status) || (['AbortError', 'TimeoutError'].includes(error.name) ? 504 : 500);
      return send(res, status, { error: status === 500 ? 'internal_error' : status === 504 ? 'upstream_timeout' : error.message });
    }
  };
}

function start(env = process.env) {
  const port = Number(env.PORT || 3000);
  const server = http.createServer(makeApp({ env }));
  server.listen(port, '0.0.0.0', () => console.log(`master7-integration-gateway ${VERSION} listening on ${port}`));
  return server;
}

if (require.main === module) start();

module.exports = { makeApp, megaSignature, start, utcSeconds };


