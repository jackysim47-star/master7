import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { monitor } from './production-operations.mjs';

const portal = 'https://test-portal.onrender.com';
const gateway = 'https://test-gateway.onrender.com';
const customer = 'https://www.master7.best';
const admin = 'https://admin.master7.best';
const alias = 'https://www.master7.site';
const env = { OPERATIONS_RENDER_PORTAL_ORIGIN: portal + '/', OPERATIONS_GATEWAY_ORIGIN: gateway };

function fixture(overrides = {}) {
  const calls = [];
  const delays = [];
  const healthy = () => Response.json({ status: 'ok', database: 'ready' });
  const signIn = () => new Response('<form method="post" action="/auth/login"></form>');
  const routes = {
    [customer + '/health']: healthy,
    [customer + '/signin']: signIn,
    [admin + '/health']: healthy,
    [admin + '/signin']: signIn,
    [alias + '/']: () => Response.redirect(customer + '/', 308),
    [portal + '/health']: healthy,
    [gateway + '/health']: () => new Response(null, { status: 204 }),
    ...overrides,
  };
  return {
    calls,
    delays,
    async run(configuration = env) {
      const results = await monitor({
        env: configuration,
        wait: milliseconds => { delays.push(milliseconds); },
        fetchImpl: async (url, options) => {
          calls.push({ url, ...options });
          return routes[url]();
        },
      });
      assert(calls.every(({ url, method, redirect, signal, body }) =>
        Object.hasOwn(routes, url) && method === 'GET' && redirect === 'manual' && signal && body === undefined));
      return Object.fromEntries(results.map(result => [result.name, result]));
    },
  };
}

test('checks all seven production entrances with GET and records elapsed time', async () => {
  const fixtureRun = fixture();
  const results = await fixtureRun.run();
  assert.equal(fixtureRun.calls.length, 7);
  assert.equal(new Set(fixtureRun.calls.map(call => call.url)).size, 7);
  assert(Object.values(results).every(result => result.ok && result.durationMs.length === 1 &&
    Number.isInteger(result.durationMs[0]) && result.durationMs[0] >= 0));
  assert.deepEqual(fixtureRun.delays, []);
});

test('rechecks a transient failure and records both the failure and recovery', async () => {
  let attempts = 0;
  const fixtureRun = fixture({
    [gateway + '/health']: () => new Response(null, { status: ++attempts === 1 ? 503 : 204 }),
  });
  const result = (await fixtureRun.run()).gateway_health;
  assert.equal(result.ok, true);
  assert.equal(result.durationMs.length, 2);
  assert.deepEqual(result.failures, ['HTTP_503']);
  assert.deepEqual(fixtureRun.delays, [1000]);
});

test('retries an unready database, invalid login and wrong alias without following redirects', async () => {
  const fixtureRun = fixture({
    [customer + '/health']: () => Response.json({ status: 'ok', database: 'unavailable' }),
    [admin + '/signin']: () => new Response('<form method="get" action="/auth/login"></form>'),
    [alias + '/']: () => Response.redirect('https://unrelated.example.test/', 302),
  });
  const results = await fixtureRun.run();
  for (const name of ['customer_health', 'admin_signin', 'customer_alias_redirect']) {
    assert.equal(results[name].ok, false);
    assert.equal(results[name].durationMs.length, 3);
  }
  assert.equal(fixtureRun.calls.length, 13);
});

test('reports a timeout separately and rejects missing or invalid Render origins before fetch', async () => {
  const fixtureRun = fixture({
    [customer + '/health']: () => { throw new DOMException('Private exception details', 'TimeoutError'); },
  });
  const results = await fixtureRun.run({ OPERATIONS_RENDER_PORTAL_ORIGIN: portal + '/unexpected-path' });
  assert.deepEqual(results.customer_health.failures, ['TIMEOUT_OR_ABORT']);
  assert.equal(results.customer_health.ok, false);
  for (const name of ['render_portal_health', 'gateway_health']) {
    assert.equal(results[name].ok, false);
    assert.deepEqual(results[name].durationMs, []);
    assert.deepEqual(results[name].failures, ['RENDER_ORIGIN_NOT_CONFIGURED']);
  }
  assert.equal(fixtureRun.calls.length, 7);
});

test('the test notification creates a failing run and summary without performing a network request', () => {
  const dir = mkdtempSync(join(tmpdir(), 'master7-monitor-test-'));
  try {
    const summary = join(dir, 'summary.md');
    const script = fileURLToPath(new URL('./production-operations.mjs', import.meta.url));
    const noFetch = 'data:text/javascript,' + encodeURIComponent('globalThis.fetch = () => { console.error("UNEXPECTED_FETCH"); throw Error(); };');
    const result = spawnSync(process.execPath, ['--import', noFetch, script, 'test-alert'], {
      env: { ...process.env, GITHUB_STEP_SUMMARY: summary }, encoding: 'utf8',
    });
    assert.equal(result.status, 1);
    assert.equal(result.stderr, '');
    assert.match(readFileSync(summary, 'utf8'), /MASTER7 测试告警/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
