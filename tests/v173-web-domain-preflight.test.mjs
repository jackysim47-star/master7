import { test } from 'node:test';
import assert from 'node:assert/strict';
import { checkDomains, HOSTS, EXPECTED_RELEASE } from '../scripts/v173-web-domain-preflight.mjs';

const resolvers = {
  a: async () => ['192.0.2.21'],
  aaaa: async () => { throw Object.assign(new Error('DNS error'), { code: 'ENODATA' }); },
  cname: async () => ['example.onrender.com'],
};
const health = () => Response.json({ release: EXPECTED_RELEASE, database: 'ready' });

test('fixed hostnames, anonymous GET only, never enables production state', async () => {
  const calls = [];
  const report = await checkDomains({ resolvers, fetchImpl: async (raw, options) => {
    calls.push({ url: new URL(raw), options });
    return new URL(raw).pathname === '/health/live' ? health() : new Response('Public entry', { status: 200 });
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

test('same-origin redirect is recorded but does not prove final page availability', async () => {
  const report = await checkDomains({ resolvers, hosts: [HOSTS[1]], fetchImpl: async raw =>
    new URL(raw).pathname === '/' ? new Response(null, { status: 303, headers: { Location: '/admin' } }) : health() });
  assert.equal(report.findings[0].entry.result, 'same_origin_redirect_not_followed');
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
