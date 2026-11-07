import {capabilityMismatches, PROVIDERS} from './parity.mjs';

// Public GET requests only. No cookie, credential, order, payout, or wallet write.
const base = new URL(process.argv[2] || 'https://master7-v17-staging.onrender.com');
if (base.protocol !== 'https:' || base.username || base.password || base.pathname !== '/' || base.search || base.hash) {
  throw new Error('Supply an HTTPS origin without credentials, a path, a query, or a fragment.');
}
const paths = ['/health', ...PROVIDERS.map(provider => `/api/payments/${provider}/status`)];
const responses = await Promise.allSettled(paths.map(async path => {
  const response = await fetch(new URL(path, base), {
    method: 'GET', cache: 'no-store', redirect: 'error',
    headers: {Accept: 'application/json'}, signal: AbortSignal.timeout(15000),
  });
  if (!response.ok || !response.headers.get('content-type')?.includes('application/json')) {
    throw new Error(`Status unavailable for ${path} (HTTP ${response.status}).`);
  }
  const data = await response.json();
  if (!data || typeof data !== 'object' || Array.isArray(data)) throw new Error(`Invalid JSON object for ${path}.`);
  return data;
}));
if (responses.some(response => response.status !== 'fulfilled')) {
  console.error('Status unavailable; no capability conclusion has been made.');
  process.exitCode = 2;
} else {
  const health = responses[0].value;
  const statuses = Object.fromEntries(PROVIDERS.map((provider, index) => [provider, responses[index + 1].value]));
  const mismatches = capabilityMismatches(health, statuses);
  console.log(JSON.stringify({checkedAt: new Date().toISOString(), origin: base.origin, release: health.release, mismatches}, null, 2));
  if (mismatches.length) process.exitCode = 1;
}
