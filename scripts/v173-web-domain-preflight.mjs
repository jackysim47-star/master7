#!/usr/bin/env node
/**
 * MASTER7 V173: non-transactional website infrastructure read-only preflight.
 * DNS resolution and public GET / + GET /health/live only. No logins, POST,
 * callbacks, cookies, payment routes, game routes, mutations, or redirects.
 * A passing result is NOT permission to go live or proof of authentication.
 */
import { Resolver } from 'node:dns/promises';

export const EXPECTED_RELEASE = '17.0.0-selfbuilt.173-staff-setup-route';
export const HOSTS = Object.freeze([
  Object.freeze({ hostname: 'www.master7.best', kind: 'customer' }),
  Object.freeze({ hostname: 'www.master7.site', kind: 'legacy-staff' }),
  Object.freeze({ hostname: 'admin.master7.best', kind: 'proposed-staff' }),
]);

const MAX_BYTES = 4_096;
const DEFAULT_TIMEOUT_MS = 6_000;
const DEFAULT_DNS_TIMEOUT_MS = 2_000;

function errorCode(error) {
  const code = typeof error?.code === 'string' ? error.code : '';
  if (['ENOTFOUND', 'ENODATA', 'ETIMEOUT', 'EAI_AGAIN', 'ECONNREFUSED', 'ABORT_ERR'].includes(code)) return code;
  return error?.name === 'AbortError' ? 'TIMEOUT' : 'UNAVAILABLE';
}

async function optionalResolve(resolver, host) {
  try { return { values: await resolver(host), reason: null }; }
  catch (error) { return { values: [], reason: errorCode(error) }; }
}


async function readBoundedDns(hostname, injectedResolvers, dnsTimeoutMs) {
  // Own a resolver instance so pending system DNS requests can be cancelled.
  const resolver = injectedResolvers ? null : new Resolver();
  const resolvers = injectedResolvers || {
    a: resolver.resolve4.bind(resolver),
    aaaa: resolver.resolve6.bind(resolver),
    cname: resolver.resolveCname.bind(resolver),
  };
  const unavailable = { values: [], reason: 'DNS_TIMEOUT' };
  let timer;
  const deadline = new Promise(resolve => {
    timer = setTimeout(() => resolve([unavailable, unavailable, unavailable]), dnsTimeoutMs);
  });
  try {
    return await Promise.race([
      Promise.all([
        optionalResolve(resolvers.a, hostname),
        optionalResolve(resolvers.aaaa, hostname),
        optionalResolve(resolvers.cname, hostname),
      ]),
      deadline,
    ]);
  } finally {
    clearTimeout(timer);
    if (resolver) resolver.cancel();
  }
}

function examineEntry(response, origin) {
  const status = response.status;
  if (status >= 200 && status < 300) return { status, result: 'direct_http_success' };
  if (status >= 300 && status < 400) {
    const loc = response.headers.get('location');
    let local = false;
    try { local = Boolean(loc) && new URL(loc, origin).origin === origin; } catch { /* sanitized */ }
    return { status, result: local ? 'same_origin_redirect_not_followed' : 'external_redirect_blocked' };
  }
  return { status, result: 'unexpected_http_status' };
}

async function readSmallText(response, maxBytes = MAX_BYTES, timeoutMs = DEFAULT_TIMEOUT_MS) {
  let reader;
  let timeout;
  const cutoff = new Promise(resolve => {
    timeout = setTimeout(() => resolve({ ok: false, reason: 'response_timeout' }), timeoutMs);
  });
  const read = (async () => {
    try {
      const len = response.headers.get('content-length');
      if (len && Number(len) > maxBytes) return { ok: false, reason: 'response_too_large' };
      if (!response.body) return { ok: true, text: '' };
      reader = response.body.getReader();
      const chunks = [];
      let total = 0;
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        total += value.byteLength;
        if (total > maxBytes) return { ok: false, reason: 'response_too_large' };
        chunks.push(value);
      }
      const joined = new Uint8Array(total);
      let offset = 0;
      for (const chunk of chunks) { joined.set(chunk, offset); offset += chunk.byteLength; }
      return { ok: true, text: new TextDecoder().decode(joined) };
    } catch {
      return { ok: false, reason: 'response_unreadable' };
    }
  })();
  try {
    return await Promise.race([read, cutoff]);
  } finally {
    clearTimeout(timeout);
    // Never wait for body cancellation: a broken stream must not stall the preflight.
    try {
      if (reader) void reader.cancel().catch(() => {});
      else if (response.body) void response.body.cancel().catch(() => {});
    } catch { /* best-effort cleanup */ }
  }
}

function discardResponseBody(response) {
  // The public page itself is deliberately not downloaded or processed.
  try { if (response?.body) void response.body.cancel().catch(() => {}); }
  catch { /* best-effort cleanup */ }
}

async function safeGet(url, fetchImpl, timeoutMs) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetchImpl(url, {
      method: 'GET', redirect: 'manual', credentials: 'omit',
      headers: { Accept: new URL(url).pathname === '/health/live' ? 'application/json' : 'text/html' },
      signal: controller.signal,
    });
    return { response, error: null };
  } catch (error) { return { response: null, error: errorCode(error) }; }
  finally { clearTimeout(timeout); }
}

export async function checkDomains({
  hosts = HOSTS, expectedRelease = EXPECTED_RELEASE,
  resolvers = null,
  fetchImpl = fetch, timeoutMs = DEFAULT_TIMEOUT_MS, dnsTimeoutMs = DEFAULT_DNS_TIMEOUT_MS,
} = {}) {
  if (process.env.NODE_TLS_REJECT_UNAUTHORIZED === '0') {
    throw new Error('TLS verification disabled: preflight must not run');
  }
  if (!/^17\.0\.0-selfbuilt\.173-[a-z0-9-]+$/.test(expectedRelease)) {
    throw new Error('Invalid V173 expectedRelease');
  }
  if (!Number.isInteger(timeoutMs) || timeoutMs < 100 || timeoutMs > 30_000) {
    throw new Error('Invalid timeoutMs');
  }
  if (!Number.isInteger(dnsTimeoutMs) || dnsTimeoutMs < 100 || dnsTimeoutMs > 30_000) {
    throw new Error('Invalid dnsTimeoutMs');
  }
  if (!Array.isArray(hosts) || hosts.length === 0 || !hosts.every(h =>
    HOSTS.some(allowed => allowed.hostname === h.hostname && allowed.kind === h.kind))) {
    throw new Error('Only fixed, approved website hostnames can be checked');
  }
  const findings = [];
  for (const { hostname, kind } of hosts) {
    const [a, aaaa, cname] = await readBoundedDns(hostname, resolvers, dnsTimeoutMs);
    const dnsResolved = a.values.length > 0 || aaaa.values.length > 0;
    const dns = {
      resolved: dnsResolved,
      ipv4Count: a.values.length,
      ipv6Count: aaaa.values.length,
      // Do not claim authoritative DNS or Render verification from resolver data.
      cname: cname.values.slice(0, 3),
      missingReason: dnsResolved ? null : (a.reason || aaaa.reason || 'UNKNOWN'),
    };
    const origin = `https://${hostname}`;
    let entry = { status: null, result: 'not_checked_no_dns' };
    let health = { status: null, result: 'not_checked_no_dns' };
    if (dnsResolved) {
      const pageGet = await safeGet(`${origin}/`, fetchImpl, timeoutMs);
      entry = pageGet.error ? { status: null, result: pageGet.error } : examineEntry(pageGet.response, origin);
      discardResponseBody(pageGet.response);
      const liveGet = await safeGet(`${origin}/health/live`, fetchImpl, timeoutMs);
      if (liveGet.error) {
        health = { status: null, result: liveGet.error };
      } else if (liveGet.response.status !== 200) {
        health = { status: liveGet.response.status, result: 'health_http_not_200' };
        discardResponseBody(liveGet.response);
      } else {
        const body = await readSmallText(liveGet.response, MAX_BYTES, timeoutMs);
        if (!body.ok) health = { status: 200, result: body.reason };
        else {
          try {
            const parsed = JSON.parse(body.text);
            health = {
              status: 200,
              result: parsed?.release === expectedRelease && parsed?.database === 'ready' ? 'v173_database_ready' : 'not_expected_release_or_database',
            };
          } catch { health = { status: 200, result: 'health_invalid_json' }; }
        }
      }
    }
    findings.push({ hostname, kind, dns, entry, health,
      // A redirect still requires a separate domain/entry acceptance.
      networkProbePassed: dnsResolved && entry.result === 'direct_http_success' && health.result === 'v173_database_ready',
      tlsCertificateChainAudited: false,
      authenticatedAccessTested: false,
    });
  }
  return {
    release: expectedRelease,
    findings,
    networkProbePassed: findings.every(item => item.networkProbePassed),
    productionApproved: false,
    paymentVerified: false,
    gameLaunchVerified: false,
    note: 'Preflight checks are DNS plus anonymous HTTPS GET only; production acceptance requires independent review.',
  };
}

if (process.argv[1] && import.meta.url === new URL(`file://${process.argv[1]}`).href) {
  checkDomains().then(result => {
    console.log(JSON.stringify(result, null, 2));
    if (!result.networkProbePassed) process.exitCode = 1;
  }, error => {
    console.error(`Preflight could not start: ${error.message}`);
    process.exitCode = 2;
  });
}
