import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { checkDomains, HOSTS, EXPECTED_RELEASE } from '../scripts/v173-web-domain-preflight.mjs';

const resolvers = {
  a: async () => ['192.0.2.21'],
  aaaa: async () => { throw Object.assign(new Error('DNS error'), { code: 'ENODATA' }); },
  cname: async () => ['example.onrender.com'],
};
const health = () => Response.json({ status: 'ok', scope: 'portal-liveness', release: EXPECTED_RELEASE, database: 'ready' });

test('fixed hostnames, anonymous GET only, never enables production state', async () => {
  const calls = [];
  const report = await checkDomains({ resolvers, fetchImpl: async (raw, options) => {
    calls.push({ url: new URL(raw), options });
    return new URL(raw).pathname === '/health/live' ? health() : new Response('Public entry', { status: 200, headers: { 'content-type': 'text/html; charset=utf-8' } });
  } });
  assert.equal(report.findings.length, 3);
  assert.deepEqual(report.findings.map(x => x.hostname), HOSTS.map(x => x.hostname));
  assert.equal(calls.length, 6);
  assert.equal(report.networkProbePassed, true);
  assert.equal(report.productionApproved, false);
  assert.equal(report.paymentVerified, false);
  assert.equal(report.gameLaunchVerified, false);
  for (const call of calls) {
    assert.equal(call.options.method, 'GET');
    assert.equal(call.options.redirect, 'manual');
    assert.equal(call.options.credentials, 'omit');
    assert.equal(call.options.body, undefined);
    assert.ok(['/', '/health/live'].includes(call.url.pathname));
    assert.ok(HOSTS.some(x => x.hostname === call.url.hostname));
  }
  assert.ok(report.findings.every(x => !x.tlsCertificateChainAudited && !x.authenticatedAccessTested));
});

test('forwards to a different origin fail, redirect never followed', async () => {
  let requests = 0;
  const report = await checkDomains({ resolvers, hosts: [HOSTS[0]], fetchImpl: async (raw) => {
    requests++;
    return new URL(raw).pathname === '/' ? new Response(null, { status: 302, headers: { Location: 'https://attacker.invalid/admin?private=secret' } }) : health();
  } });
  assert.equal(requests, 2);
  assert.equal(report.networkProbePassed, false);
  assert.equal(report.findings[0].entry.result, 'external_redirect_blocked');
  assert.ok(!JSON.stringify(report).includes('private=secret'));
});

test('a same-origin redirect loop does not prove entry availability', async () => {
  const paths = [];
  const report = await checkDomains({ resolvers, hosts: [HOSTS[1]], fetchImpl: async raw => {
    const url = new URL(raw);
    paths.push(url.pathname);
    return url.pathname === '/health/live' ? health() :
      new Response(null, { status: 303, headers: { Location: '/admin' } });
  } });
  assert.deepEqual(paths, ['/', '/admin', '/health/live']);
  assert.equal(report.findings[0].entry.result, 'entry_redirect_loop');
  assert.equal(report.networkProbePassed, false);
});

test('missing DNS fails closed, no HTTPS requests', async () => {
  let calls = 0;
  const missing = async () => { throw Object.assign(new Error('private-secret-do-not-echo'), { code: 'ENOTFOUND' }); };
  const report = await checkDomains({ hosts: [HOSTS[0]], resolvers: { a: missing, aaaa: missing, cname: missing }, fetchImpl: async () => { calls++; throw Error('Unexpected'); } });
  assert.equal(calls, 0);
  assert.equal(report.networkProbePassed, false);
  assert.equal(report.findings[0].dns.missingReason, 'ENOTFOUND');
  assert.ok(!JSON.stringify(report).includes('private-secret'));
});

test('wrong release and invalid JSON do not count as successful health', async () => {
  for (const body of [Response.json({ release: '17.0.0-selfbuilt.172-staff', database: 'ready' }), new Response('<html>not json</html>')]) {
    const report = await checkDomains({ resolvers, hosts: [HOSTS[0]], fetchImpl: async raw => new URL(raw).pathname === '/' ? new Response('ok') : body.clone() });
    assert.equal(report.networkProbePassed, false);
  }
});

test('rejects arbitrary hosts and invalid release before networking', async () => {
  let calls = 0;
  const fetchImpl = async () => { calls++; throw Error('Must not fetch'); };
  await assert.rejects(checkDomains({ hosts: [{ hostname: 'attacker.invalid', kind: 'other' }], resolvers, fetchImpl }), /hostnames/);
  await assert.rejects(checkDomains({ expectedRelease: 'secret\nheader', resolvers, fetchImpl }), /expectedRelease/);
  await assert.rejects(checkDomains({ expectedRelease: '17.0.0-selfbuilt.173-unapproved-variant', resolvers, fetchImpl }), /expectedRelease/);
  await assert.rejects(checkDomains({ timeoutMs: 0, resolvers, fetchImpl }), /timeoutMs/);
  assert.equal(calls, 0);
});


test('a stalled health response body times out without hanging or reporting success', async () => {
  const healthWithStalledBody = new Response(new ReadableStream({
    start(controller) { controller.enqueue(new TextEncoder().encode('{"release":')); },
    // Intentionally never close the stream or produce the remaining JSON.
  }), { status: 200, headers: { 'content-type': 'application/json' } });
  const started = Date.now();
  const report = await checkDomains({
    hosts: [HOSTS[0]], resolvers, timeoutMs: 100,
    fetchImpl: async url => new URL(url).pathname === '/' ? new Response('ok') : healthWithStalledBody,
  });
  assert.equal(report.findings[0].health.result, 'response_timeout');
  assert.equal(report.networkProbePassed, false);
  assert.ok(Date.now() - started < 2_000);
});

test('oversized health bodies are rejected and cannot produce a passing result', async () => {
  const report = await checkDomains({ hosts: [HOSTS[0]], resolvers,
    fetchImpl: async url => new URL(url).pathname === '/' ? new Response('ok') :
      new Response('x'.repeat(5_000), { headers: { 'content-type': 'application/json' } }),
  });
  assert.equal(report.findings[0].health.result, 'response_too_large');
  assert.equal(report.networkProbePassed, false);
});


test('unresponsive DNS queries are bounded and never trigger HTTPS requests', async () => {
  let requests = 0;
  const hangs = async () => new Promise(() => {});
  const started = Date.now();
  const report = await checkDomains({
    hosts: [HOSTS[0]], dnsTimeoutMs: 100,
    resolvers: { a: hangs, aaaa: hangs, cname: hangs },
    fetchImpl: async () => { requests++; throw new Error('HTTPS not allowed without DNS'); },
  });
  assert.equal(requests, 0);
  assert.equal(report.findings[0].dns.missingReason, 'DNS_TIMEOUT');
  assert.equal(report.networkProbePassed, false);
  assert.ok(Date.now() - started < 2_000);
});


test('an HTTPS fetch that ignores AbortSignal still times out and cannot block the audit', async () => {
  let calls = 0;
  const fetchImpl = async () => {
    calls++;
    return new Promise(() => {});
  };
  const started = Date.now();
  const report = await checkDomains({
    hosts: [HOSTS[0]], resolvers, timeoutMs: 100, fetchImpl,
  });
  assert.equal(calls, 2);
  assert.equal(report.findings[0].entry.result, 'TIMEOUT');
  assert.equal(report.findings[0].health.result, 'TIMEOUT');
  assert.equal(report.networkProbePassed, false);
  assert.equal(report.productionApproved, false);
  assert.ok(Date.now() - started < 2_000);
});


test('CLI --help starts directly on Windows and Linux paths without network calls', () => {
  const scriptPath = fileURLToPath(new URL('../scripts/v173-web-domain-preflight.mjs', import.meta.url));
  const child = spawnSync(process.execPath, [scriptPath, '--help'], {
    encoding: 'utf8', timeout: 3000,
    env: { ...process.env, NODE_TLS_REJECT_UNAUTHORIZED: '1' },
  });
  assert.equal(child.error, undefined);
  assert.equal(child.status, 0, child.stderr);
  assert.match(child.stdout, /MASTER7 V173 read-only/);
  assert.match(child.stdout, /never logs in/);
  assert.equal(child.stderr, '');
});

test('a spoofed health document missing the official liveness scope is never accepted', async () => {
  const fakeBodies = [
    { release: EXPECTED_RELEASE, database: 'ready' },
    { status: 'error', scope: 'portal-liveness', release: EXPECTED_RELEASE, database: 'ready' },
    { status: 'ok', scope: 'fake-service', release: EXPECTED_RELEASE, database: 'ready' },
    { status: 'ok', scope: 'portal-liveness', release: EXPECTED_RELEASE, database: 'unavailable' },
  ];
  for (const payload of fakeBodies) {
    const report = await checkDomains({
      resolvers, hosts: [HOSTS[0]],
      fetchImpl: async url => new URL(url).pathname === '/' ? new Response('ok') : Response.json(payload),
    });
    assert.equal(report.networkProbePassed, false);
    assert.equal(report.findings[0].health.result, 'not_expected_release_or_database');
    assert.equal(report.productionApproved, false);
  }
});


test('blank or non-HTML entry responses fail even when V173 health succeeds', async () => {
  const entries = [
    { response: new Response(null, { status: 204 }), expected: 'unexpected_http_status' },
    { response: new Response('plain text', { status: 200 }), expected: 'unexpected_content_type' },
    { response: Response.json({ status: 'ok' }), expected: 'unexpected_content_type' },
  ];
  for (const { response, expected } of entries) {
    const report = await checkDomains({
      resolvers,
      hosts: [HOSTS[0]],
      fetchImpl: async url => new URL(url).pathname === '/'
        ? response.clone()
        : health(),
    });
    assert.equal(report.findings[0].entry.result, expected);
    assert.equal(report.networkProbePassed, false);
    assert.equal(report.productionApproved, false);
  }
});


test('legitimate anonymous customer and staff entry redirects are verified safely', async () => {
  for (const [host, path] of [[HOSTS[0], '/signin'], [HOSTS[1], '/admin']]) {
    const calls = [];
    const report = await checkDomains({
      resolvers, hosts: [host], fetchImpl: async (raw, options) => {
        const u = new URL(raw);
        calls.push({ path: u.pathname, options });
        if (u.pathname === '/') return new Response(null, { status: 303, headers: { Location: path } });
        if (u.pathname === '/health/live') return health();
        return new Response('<!doctype html><title>Sign in</title>', { status: 200,
          headers: { 'content-type': 'text/html; charset=utf-8' } });
      },
    });
    assert.deepEqual(calls.map(x => x.path), ['/', path, '/health/live']);
    assert.ok(calls.every(x => x.options.method === 'GET' && x.options.redirect === 'manual' &&
      x.options.credentials === 'omit' && x.options.body === undefined));
    assert.equal(report.findings[0].entry.result, 'same_origin_entry_verified');
    assert.equal(report.networkProbePassed, true);
    assert.equal(report.productionApproved, false);
    assert.equal(report.findings[0].authenticatedAccessTested, false);
  }
});

test('unapproved paths, query secrets and external redirects are never followed', async () => {
  const locations = ['/logout', '/staff-setup#secret', '/signin?token=private', '/admin/other',
    'https://attacker.invalid/admin', '//attacker.invalid/signin'];
  for (const location of locations) {
    const calls = [];
    const report = await checkDomains({
      resolvers, hosts: [HOSTS[0]], fetchImpl: async raw => {
        const u = new URL(raw);
        calls.push(u.pathname);
        return u.pathname === '/health/live' ? health() :
          new Response(null, { status: 303, headers: { Location: location } });
      },
    });
    assert.deepEqual(calls, ['/', '/health/live']);
    assert.equal(report.networkProbePassed, false);
    assert.ok(['unapproved_entry_redirect', 'external_redirect_blocked'].includes(report.findings[0].entry.result));
    assert.ok(!JSON.stringify(report).includes('secret'));
    assert.ok(!JSON.stringify(report).includes('private'));
  }
});