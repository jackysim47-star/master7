'use strict';

// These are configuration gates, not a provider availability or QA attestation.
// Public callback bases are origins; return/forward/provider URLs keep paths and
// query strings. Never apply the origin-only rule to a signed provider request.
function normalizeHttpsUrl(value, { originOnly = false } = {}) {
  if (typeof value !== 'string' || !value || value !== value.trim()
      || /[\u0000-\u0020\u007f-\u009f]/u.test(value) || value.includes('\\')
      || value.includes('#') || !/^https:\/\//i.test(value)
      || /^https:\/\/[^/?#]*@/i.test(value)) return '';
  try {
    const url = new URL(value);
    if (url.protocol !== 'https:' || url.username || url.password || url.hash) return '';
    if (originOnly && (url.pathname !== '/' || value.includes('?') || url.port
        || !/^https:\/\/[^/?#]+\/?$/i.test(value))) return '';
    return originOnly ? url.origin : url.href;
  } catch { return ''; }
}

function configuredUrl(value) {
  return Boolean(normalizeHttpsUrl(value));
}

// VPay payment redirects and wallet callbacks carry live transaction context.
// Keep them on the exact portal hosts we operate; a generic HTTPS URL or a
// forwarding service must never become a payment destination.
const VPAY_PORTAL_ORIGINS = new Set([
  'https://master7-v17-staging.onrender.com',
  'https://master7.best',
  'https://www.master7.best',
]);

function officialVpayPortalUrl(value, expectedPath) {
  const normalized = normalizeHttpsUrl(value);
  if (!normalized || value.includes('?')) return '';
  try {
    const url = new URL(normalized);
    if (!VPAY_PORTAL_ORIGINS.has(url.origin) || url.pathname !== expectedPath
        || url.search || url.hash || url.username || url.password || url.port) return '';
    return url.href;
  } catch { return ''; }
}

function officialVpayReturnUrl(value) {
  return officialVpayPortalUrl(value, '/payment/return');
}

function officialVpayPaymentForwardUrl(value) {
  return officialVpayPortalUrl(value, '/api/payment-callbacks/vpay/payment');
}

// The callback, query and order credentials share the same byte limits and may
// never alias another peer credential or the full administrator credential.
const VPAY_PEERS = ['PLATFORM_CALLBACK_TOKEN', 'PLATFORM_QUERY_TOKEN', 'PLATFORM_ORDER_TOKEN',
  'PLATFORM_PAYOUT_TOKEN'];
const GSPAY_PEERS = ['PLATFORM_GSPAY_CALLBACK_TOKEN', 'PLATFORM_GSPAY_QUERY_TOKEN', 'PLATFORM_GSPAY_ORDER_TOKEN'];
const GAME_PEERS = ['PLATFORM_GAME_TOKEN', 'PLATFORM_GAME_WALLET_TOKEN'];
const PRIVILEGED_CREDENTIALS = ['GATEWAY_ADMIN_TOKEN', ...VPAY_PEERS, ...GSPAY_PEERS, ...GAME_PEERS,
  'VPAY_API_TOKEN', 'GSPAY_OPERATOR_AUTH_KEY', 'GSPAY_OPERATOR_SECRET_KEY', 'MEGA_SECRET_KEY'];

function isolatedCredential(env, name, allowed) {
  if (!allowed.includes(name)) return '';
  const expected = String(env[name] || '');
  const bytes = Buffer.byteLength(expected, 'utf8');
  if (bytes < 32 || bytes > 1024 || PRIVILEGED_CREDENTIALS
    .some(key => key !== name && String(env[key] || '') === expected)) return '';
  return expected;
}

function peerCredential(env, name) {
  return isolatedCredential(env, name, VPAY_PEERS);
}

function gspayPeerCredential(env, name) {
  return isolatedCredential(env, name, GSPAY_PEERS);
}

function gamePeerCredential(env, name = 'PLATFORM_GAME_TOKEN') {
  return isolatedCredential(env, name, GAME_PEERS);
}

function gameWalletCredential(env) {
  return isolatedCredential(env, 'PLATFORM_GAME_WALLET_TOKEN', GAME_PEERS);
}

function megah5TransferReadiness(env = {}) {
  const credentialsConfigured = /^[A-Za-z0-9._$?-]{1,20}$/.test(String(env.MEGA_OPERATOR_ID || '').trim())
    && providerCredential(String(env.MEGA_SECRET_KEY || ''));
  const walletTokenConfigured = Boolean(gameWalletCredential(env));
  const switches = {
    status: String(env.MEGA_TRANSFER_STATUS_ENABLED || '').toLowerCase() === 'true',
    transfers: String(env.MEGA_TRANSFERS_ENABLED || '').toLowerCase() === 'true',
  };
  const channel = (enabled) => {
    const blockers = [];
    if (!credentialsConfigured) blockers.push('provider_credentials_missing_or_invalid');
    if (!walletTokenConfigured) blockers.push('platform_game_wallet_token_missing_or_aliased');
    if (!enabled) blockers.push('transaction_switch_off');
    return {
      enabled,
      configurationReady: blockers.length === 0,
      blockers,
      productionQa: 'not_verified',
      liveReady: false,
    };
  };
  return {
    mode: 'fund_transfer',
    credentialsConfigured,
    walletTokenConfigured,
    switches,
    channels: {
      status: channel(switches.status),
      deposit: channel(switches.transfers),
      withdrawal: channel(switches.transfers),
    },
  };
}

function vpayReadiness(env = {}) {
  const credentialsConfigured = /^\d{1,10}$/.test(String(env.VPAY_TRADER_ID || '').trim())
    && Boolean(String(env.VPAY_API_TOKEN || '').trim());
  const callbackTokenConfigured = Boolean(peerCredential(env, 'PLATFORM_CALLBACK_TOKEN'));
  const payoutTokenConfigured = Boolean(peerCredential(env, 'PLATFORM_PAYOUT_TOKEN'));
  const baseConfigured = Boolean(normalizeHttpsUrl(env.PUBLIC_BASE_URL, { originOnly: true }));
  const channels = {};
  for (const [kind, flag, target] of [
    ['payment', 'VPAY_ORDERS_ENABLED', 'VPAY_PAYMENT_FORWARD_URL'],
    ['withdrawal', 'VPAY_WITHDRAWALS_ENABLED', 'VPAY_WITHDRAWAL_FORWARD_URL'],
  ]) {
    const enabled = String(env[flag] || '').toLowerCase() === 'true';
    const forwardConfigured = kind === 'payment'
      ? Boolean(officialVpayPaymentForwardUrl(env[target]))
      : configuredUrl(env[target]);
    const blockers = [];
    if (!credentialsConfigured) blockers.push('provider_credentials_missing');
    if (!baseConfigured) blockers.push('public_callback_base_missing_or_invalid');
    if (!callbackTokenConfigured) blockers.push('platform_callback_token_missing_or_short');
    if (kind === 'withdrawal' && !payoutTokenConfigured) {
      blockers.push('platform_payout_token_missing_or_aliased');
    }
    if (!forwardConfigured) blockers.push('platform_callback_url_missing_or_invalid');
    // Admin-created orders retain the existing staging return fallback when
    // no dedicated return URL is set. An explicitly configured value must be
    // one of the exact official portal return URLs.
    if (kind === 'payment' && env.VPAY_RETURN_URL && !officialVpayReturnUrl(env.VPAY_RETURN_URL)) {
      blockers.push('payment_return_url_missing_or_invalid');
    }
    if (!enabled) blockers.push('transaction_switch_off');
    channels[kind] = {
      enabled, callbackForwardingConfigured: forwardConfigured && callbackTokenConfigured,
      configurationReady: blockers.length === 0, blockers,
      // No persisted supplier acceptance or end-to-end wallet test exists here.
      productionQa: 'not_verified', liveReady: false,
    };
  }
  return { mode: String(env.VPAY_MODE || 'uat'), credentialsConfigured, channels };
}

function providerCredential(value) {
  return typeof value === 'string' && value === value.trim()
    && Buffer.byteLength(value, 'utf8') >= 16 && Buffer.byteLength(value, 'utf8') <= 1024
    && !/[\u0000-\u0020\u007f-\u009f]/u.test(value);
}

function gspayReadiness(env = {}) {
  const authenticationKey = String(env.GSPAY_OPERATOR_AUTH_KEY || '');
  const secretKey = String(env.GSPAY_OPERATOR_SECRET_KEY || '');
  const credentialAliases = ['GATEWAY_ADMIN_TOKEN', 'VPAY_API_TOKEN', ...VPAY_PEERS, ...GSPAY_PEERS]
    .map(name => String(env[name] || '')).filter(Boolean);
  const credentialsConfigured = providerCredential(authenticationKey)
    && providerCredential(secretKey) && authenticationKey !== secretKey
    && !credentialAliases.includes(authenticationKey) && !credentialAliases.includes(secretKey);
  const baseConfigured = Boolean(normalizeHttpsUrl(env.PUBLIC_BASE_URL, { originOnly: true }));
  const orderTokenConfigured = Boolean(gspayPeerCredential(env, 'PLATFORM_GSPAY_ORDER_TOKEN'));
  const queryTokenConfigured = Boolean(gspayPeerCredential(env, 'PLATFORM_GSPAY_QUERY_TOKEN'));
  const callbackTokenConfigured = Boolean(gspayPeerCredential(env, 'PLATFORM_GSPAY_CALLBACK_TOKEN'));
  const paymentForwardConfigured = configuredUrl(env.GSPAY_PAYMENT_FORWARD_URL);
  const switches = {
    orders: String(env.GSPAY_MYR_ORDERS_ENABLED || '').toLowerCase() === 'true',
    queries: String(env.GSPAY_MYR_QUERIES_ENABLED || '').toLowerCase() === 'true',
    callbacks: String(env.GSPAY_MYR_CALLBACKS_ENABLED || '').toLowerCase() === 'true',
  };
  const common = [];
  if (!credentialsConfigured) common.push('provider_credentials_missing_or_invalid');
  if (!baseConfigured) common.push('public_callback_base_missing_or_invalid');
  const requirements = {
    orders: [...common, ...(!orderTokenConfigured ? ['platform_order_token_missing_or_aliased'] : []),
      ...(!queryTokenConfigured ? ['platform_signing_token_missing_or_aliased'] : [])],
    queries: [...common, ...(!orderTokenConfigured ? ['platform_auth_token_missing_or_aliased'] : []),
      ...(!queryTokenConfigured ? ['platform_query_token_missing_or_aliased'] : [])],
    callbacks: [...common, ...(!orderTokenConfigured ? ['platform_auth_token_missing_or_aliased'] : []),
      ...(!queryTokenConfigured ? ['platform_signing_token_missing_or_aliased'] : []),
      ...(!callbackTokenConfigured ? ['platform_callback_token_missing_or_aliased'] : []),
      ...(!paymentForwardConfigured ? ['platform_callback_url_missing_or_invalid'] : [])],
  };
  const requestedMode = String(env.GSPAY_MODE || 'disabled').toLowerCase();
  return {
    mode: ['disabled', 'uat', 'production'].includes(requestedMode) ? requestedMode : 'disabled',
    providerBase: 'https://api.thegspay.com',
    contract: {
      observedAt: '2026-11-07',
      providerServerIps: ['52.221.96.227'],
      confirmed: ['myr_order_request', 'myr_order_response', 'myr_query_request',
        'myr_payment_status_fields', 'myr_signature_formulas', 'callback_ack_ok_or_success'],
      unconfirmed: ['master7_paid_settlement_acceptance'],
    },
    credentialsConfigured,
    switches,
    channels: Object.fromEntries(Object.entries(requirements).map(([name, required]) => {
      const programReady = required.length === 0;
      const blockers = [...required, ...(!switches[name] ? ['transaction_switch_off'] : []),
        'supplier_uat_not_verified'];
      return [name, {
        enabled: switches[name],
        programReady,
        routeReady: programReady && switches[name],
        configurationReady: programReady, blockers,
        productionQa: 'not_verified', liveReady: false,
      }];
    })),
  };
}

function integrationReadiness(env = {}) {
  return {
    scope: 'configuration_only',
    productionQa: 'not_verified',
    liveReady: false,
    gameCallbacks: Object.fromEntries(['cosmoplay', 'creative-gaming', 'pgsoft', 'spade-gaming']
      .map(provider => [provider, { reachableRoute: true, businessReady: false, reason: 'callback_contract_not_active' }])),
    megah5Transfer: megah5TransferReadiness(env),
    vpay: vpayReadiness(env),
    gspay: gspayReadiness(env),
  };
}

module.exports = {
  configuredUrl,
  gamePeerCredential,
  gameWalletCredential,
  gspayPeerCredential,
  gspayReadiness,
  integrationReadiness,
  megah5TransferReadiness,
  normalizeHttpsUrl,
  officialVpayPaymentForwardUrl,
  officialVpayReturnUrl,
  peerCredential,
  vpayReadiness,
};
