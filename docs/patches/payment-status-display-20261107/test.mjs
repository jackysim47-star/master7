import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync, mkdtempSync, mkdirSync, writeFileSync, existsSync, rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {spawnSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {capabilityMismatches, PROVIDERS} from './parity.mjs';

const here = fileURLToPath(new URL('.', import.meta.url));
const before = readFileSync(join(here, 'before.js'), 'utf8');
const after = readFileSync(join(here, 'after.js'), 'utf8');
const evidence = JSON.parse(readFileSync(join(here, 'evidence.json'), 'utf8'));
const paths = PROVIDERS.map(provider => `/api/payments/${provider}/status`);
const clone = value => JSON.parse(JSON.stringify(value));
const sha256 = value => createHash('sha256').update(value).digest('hex');

class Element {
  constructor(tag) { this.tagName = tag; this.children = []; this.attributes = {}; this._text = ''; }
  append(...children) { this.children.push(...children); }
  replaceChildren(...children) { this._text = ''; this.children = children; }
  setAttribute(name, value) { this.attributes[name] = String(value); }
  set textContent(value) { this._text = String(value); this.children = []; }
  get textContent() { return this._text + this.children.map(child => child.textContent ?? child).join(''); }
}

async function render(source, overrides = {}, lang = 'en') {
  const host = new Element('div');
  const calls = [];
  const responses = Object.fromEntries(PROVIDERS.map(provider => [provider, clone(evidence.statuses[provider])]));
  Object.assign(responses, overrides);
  const context = vm.createContext({
    state: {lang}, document: {createElement: tag => new Element(tag)},
    $: id => id === 'paymentGatewayChecks' ? host : null,
    clear: element => element.replaceChildren(),
    node: (tag, className = '', text = '') => { const element = new Element(tag); element.className = className; element.textContent = text; return element; },
    api: async (path, ...args) => {
      calls.push({path, args});
      const provider = PROVIDERS.find(item => path === `/api/payments/${item}/status`);
      if (!provider) throw new Error('Unexpected route');
      const response = responses[provider];
      if (response instanceof Error) throw response;
      return response;
    },
  });
  vm.runInContext(source, context, {timeout: 1000});
  await context.renderPaymentGatewayChecks();
  const table = host.children[0];
  return {host, table, rows: table.children[1].children, headers: table.children[0].children[0].children, calls, responses};
}

function checks(row) { return row.children.slice(1).map(cell => cell.children[0]?.textContent); }

test('the original display reproduces the defect: a failed GET appears as seven false checks', async () => {
  const result = await render(before, {vpay: new Error('network unavailable')});
  assert.deepEqual(checks(result.rows[0]), Array(7).fill('❌'));
});

test('a failed provider GET is visibly unavailable while healthy rows retain their real checks', async () => {
  const result = await render(after, {vpay: new Error('network unavailable')});
  assert.equal(result.rows[0].children.length, 2);
  assert.equal(result.rows[0].children[1].colSpan, 7);
  assert.match(result.rows[0].children[1].textContent, /Status unavailable/);
  assert.equal(result.rows[0].children[1].attributes.role, 'status');
  assert.ok(!result.rows[0].textContent.includes('❌'));
  for (const row of result.rows.slice(1)) assert.deepEqual(checks(row), ['✅','✅','✅','✅','❌','❌','❌']);
});

test('null, array, and non-object responses remain unavailable rather than false', async () => {
  for (const value of [null, [], 'login page']) {
    const result = await render(after, {vpay: value});
    assert.equal(result.rows[0].children[1].colSpan, 7);
    assert.ok(!result.rows[0].textContent.includes('❌'));
  }
});

test('valid false capabilities remain false; the patch does not turn the final three checks green', async () => {
  const result = await render(after);
  for (const row of result.rows) assert.deepEqual(checks(row), ['✅','✅','✅','✅','❌','❌','❌']);
  assert.deepEqual(result.responses, evidence.statuses);
});

test('payout and wallet checks still require both existing boolean flags', async () => {
  for (const [enabled, submissionEnabled, settlementVerified, liveReady, expectedPayout, expectedWallet] of [
    [true,false,true,false,'❌','❌'],
    [false,true,false,true,'❌','❌'],
    [true,true,true,true,'✅','✅'],
  ]) {
    const status = clone(evidence.statuses.vpay);
    Object.assign(status.capabilities.payout, {enabled, submissionEnabled});
    Object.assign(status, {settlementVerified, liveReady});
    const result = await render(after, {vpay: status});
    assert.equal(checks(result.rows[0])[4], expectedPayout);
    assert.equal(checks(result.rows[0])[6], expectedWallet);
  }
});

test('empty, error, incomplete, and non-boolean status payloads are unavailable rather than false', async () => {
  const missingBalance = clone(evidence.statuses.vpay);
  delete missingBalance.capabilities.balance;
  const missingFlag = clone(evidence.statuses.vpay);
  delete missingFlag.capabilities.payout.submissionEnabled;
  const stringFlags = clone(evidence.statuses.vpay);
  Object.assign(stringFlags.capabilities.payout, {enabled:'true', submissionEnabled:'true'});
  const arrayCapability = clone(evidence.statuses.vpay);
  arrayCapability.capabilities.deposit = [];
  for (const status of [{}, {error:'unavailable'}, {capabilities:{}}, missingBalance, missingFlag, stringFlags, arrayCapability]) {
    const result = await render(after, {vpay:status});
    assert.equal(result.rows[0].children[1].colSpan, 7);
    assert.match(result.rows[0].children[1].textContent, /Status unavailable/);
    assert.ok(!result.rows[0].textContent.includes('❌'));
    for (const row of result.rows.slice(1)) assert.deepEqual(checks(row), ['✅','✅','✅','✅','❌','❌','❌']);
  }
});

test('English, Chinese, and Malay labels explain the same seven checks', async () => {
  for (const [lang, company, wallet, unavailable] of [
    ['en','Company','Wallet verified','Status unavailable. Refresh to try again.'],
    ['zh','供应商','钱包结算已验收','状态读取失败，请刷新重试。'],
    ['ms','Syarikat','Penyelesaian dompet disahkan','Status tidak tersedia. Muat semula untuk mencuba lagi.'],
  ]) {
    const result = await render(after, {vpay: new Error('offline')}, lang);
    assert.equal(result.headers.length, 8);
    assert.equal(result.headers[0].textContent, company);
    assert.equal(result.headers[7].textContent, wallet);
    assert.equal(result.rows[0].children[1].textContent, unavailable);
    assert.ok(result.headers.every(header => header.scope === 'col'));
  }
});

test('unknown locales fall back to English and error details are never inserted into the DOM', async () => {
  const detail = '<script>secret-diagnostic</script>';
  const result = await render(after, {vpay: new Error(detail)}, 'unsupported');
  assert.equal(result.headers[0].textContent, 'Company');
  assert.ok(!result.host.textContent.includes(detail));
  assert.ok(!result.host.textContent.includes('secret-diagnostic'));
});

test('the display performs the same three read-only API calls and no write', async () => {
  const result = await render(after);
  assert.deepEqual(result.calls.map(call => call.path).sort(), [...paths].sort());
  assert.ok(result.calls.every(call => call.args.length === 0));
});

test('the regression probe detects the three observed VPay payout disagreements without rewriting them', () => {
  const input = clone({health: evidence.health, statuses: evidence.statuses});
  const original = JSON.stringify(input);
  assert.deepEqual(capabilityMismatches(input.health, input.statuses), [
    {provider:'vpay',capability:'payout',field:'configured',health:true,status:false},
    {provider:'vpay',capability:'payout',field:'enabled',health:true,status:false},
    {provider:'vpay',capability:'payout',field:'submissionEnabled',health:true,status:false},
  ]);
  assert.equal(JSON.stringify(input), original);
});

test('the parity probe passes matching capabilities even when external settlement remains unverified', () => {
  const statuses = clone(evidence.statuses);
  statuses.vpay.capabilities = clone(evidence.health.providerCapabilities.vpay);
  assert.deepEqual(capabilityMismatches(evidence.health, statuses), []);
  assert.equal(statuses.vpay.settlementVerified, false);
  assert.equal(statuses.vpay.liveReady, false);
});

test('the parity probe reports absent provider capabilities as unavailable', () => {
  const statuses = clone(evidence.statuses);
  delete statuses.gspay;
  const missing = capabilityMismatches(evidence.health, statuses).filter(item => item.provider === 'gspay');
  assert.equal(missing.length, 3);
  assert.ok(missing.every(item => item.kind === 'unavailable'));
});

test('the guarded apply tool refuses a changed source without creating a backup or altering it', () => {
  const temp = mkdtempSync(join(tmpdir(), 'master7-status-guard-'));
  try {
    mkdirSync(join(temp, 'public/assets'), {recursive: true});
    const target = join(temp, 'public/assets/app.js');
    const original = '// This is not the inspected .94 asset.\n';
    writeFileSync(target, original);
    const result = spawnSync(process.execPath, [join(here, 'apply.mjs'), temp, '--apply'], {encoding:'utf8'});
    assert.notEqual(result.status, 0);
    assert.equal(readFileSync(target, 'utf8'), original);
    assert.equal(existsSync(`${target}.master7-payment-status-display.bak`), false);
  } finally { rmSync(temp, {recursive:true, force:true}); }
});

// Optional exact-asset integration test. It uses a temporary copy and no network.
if (process.env.MASTER7_INSPECTED_APP_JS) test('the exact inspected asset supports check, apply, repeat, and checksum-verified rollback', () => {
  const asset = readFileSync(process.env.MASTER7_INSPECTED_APP_JS);
  assert.equal(sha256(asset), evidence.source.sha256);
  const temp = mkdtempSync(join(tmpdir(), 'master7-status-apply-'));
  try {
    mkdirSync(join(temp, 'public/assets'), {recursive:true});
    const target = join(temp, 'public/assets/app.js');
    writeFileSync(target, asset);
    const run = mode => {
      const result = spawnSync(process.execPath, [join(here, 'apply.mjs'), temp, mode], {encoding:'utf8'});
      assert.equal(result.status, 0, result.stderr);
    };
    run('--check');
    assert.equal(sha256(readFileSync(target)), evidence.source.sha256);
    assert.equal(existsSync(`${target}.master7-payment-status-display.bak`), false);
    run('--apply');
    assert.equal(sha256(readFileSync(target)), evidence.patchedSourceSha256);
    assert.equal(sha256(readFileSync(`${target}.master7-payment-status-display.bak`)), evidence.source.sha256);
    run('--apply');
    run('--rollback');
    assert.equal(sha256(readFileSync(target)), evidence.source.sha256);
    assert.ok(existsSync(`${target}.master7-payment-status-display.bak`));
  } finally { rmSync(temp, {recursive:true, force:true}); }
});
