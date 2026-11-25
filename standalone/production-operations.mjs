import { appendFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { setTimeout as delay } from 'node:timers/promises';

const customer = 'https://www.master7.best';
const admin = 'https://admin.master7.best';
const alias = 'https://www.master7.site';
const renderOrigin = /^https:\/\/[a-z0-9-]+\.onrender\.com\/?$/;

async function inspect(fetchImpl, origin, path, validate) {
  const response = await fetchImpl(origin + path, {
    method: 'GET', redirect: 'manual', signal: AbortSignal.timeout(10000),
  });
  try {
    if (await validate(response)) return '';
    return response.ok ? 'UNEXPECTED_RESPONSE' : 'HTTP_' + response.status;
  } finally {
    if (!response.bodyUsed) await response.body?.cancel();
  }
}

async function retry(name, check, wait) {
  const durationMs = [];
  const failures = new Set();
  for (let attempt = 1; attempt <= 3; attempt++) {
    const started = performance.now();
    let failure;
    try {
      failure = await check();
    } catch (error) {
      const timedOut = error?.name === 'TimeoutError' || error?.name === 'AbortError';
      failure = timedOut ? 'TIMEOUT_OR_ABORT' : 'REQUEST_FAILED';
    }
    durationMs.push(Math.round(performance.now() - started));
    if (!failure) return { name, ok: true, durationMs, failures: [...failures] };
    failures.add(failure);
    if (attempt < 3) await wait(attempt * 1000);
  }
  return { name, ok: false, durationMs, failures: [...failures] };
}

async function health(response) {
  if (!response.ok) return false;
  const data = await response.json().catch(error => {
    if (error instanceof SyntaxError) return null;
    throw error;
  });
  return data?.status === 'ok' && data.database === 'ready';
}

async function login(response) {
  return response.ok && /<form\b(?=[^>]*\saction=["']\/auth\/login["'])(?=[^>]*\smethod=["']post["'])/i.test(await response.text());
}

function aliasRedirect(response) {
  if (![301, 302, 307, 308].includes(response.status)) return false;
  const location = response.headers.get('location');
  return Boolean(location && URL.parse(location, alias)?.href === customer + '/');
}

export function monitor({ env = process.env, fetchImpl = fetch, wait = delay } = {}) {
  function check(name, origin, path, validate) {
    return retry(name, () => inspect(fetchImpl, origin, path, validate), wait);
  }
  function checkRender(name, origin, validate) {
    if (!renderOrigin.test(origin ?? '')) {
      return { name, ok: false, durationMs: [], failures: ['RENDER_ORIGIN_NOT_CONFIGURED'] };
    }
    return check(name, origin.replace(/\/$/, ''), '/health', validate);
  }

  return Promise.all([
    check('customer_health', customer, '/health', health),
    check('customer_signin', customer, '/signin', login),
    check('admin_health', admin, '/health', health),
    check('admin_signin', admin, '/signin', login),
    check('customer_alias_redirect', alias, '/', aliasRedirect),
    checkRender('render_portal_health', env.OPERATIONS_RENDER_PORTAL_ORIGIN, health),
    checkRender('gateway_health', env.OPERATIONS_GATEWAY_ORIGIN, response => response.ok),
  ]);
}

async function summary(message) {
  if (process.env.GITHUB_STEP_SUMMARY) await appendFile(process.env.GITHUB_STEP_SUMMARY, message + '\n');
  console.log(message);
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const mode = process.argv[2];
  if (mode === 'monitor') {
    const results = await monitor();
    await summary(results.map(({ name, ok, durationMs, failures }) => {
      const state = !ok ? '失败' : failures.length ? '复测通过' : '通过';
      return `- ${state} · ${name} · 检查 ${durationMs.length} 次` +
        (durationMs.length ? ` · 耗时 ${durationMs.join(' / ')} ms` : '') +
        (failures.length ? ` · ${failures.join(', ')}` : '');
    }).join('\n'));
    if (results.some(result => !result.ok)) process.exitCode = 1;
  } else if (mode === 'test-alert') {
    await summary('MASTER7 测试告警，请确认收到通知。本次为模拟故障。');
    process.exitCode = 1;
  } else {
    await summary('UNKNOWN_OPERATION');
    process.exitCode = 1;
  }
}
