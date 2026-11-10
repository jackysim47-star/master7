'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');
const { makeApp, megaSignature } = require('./server');

async function run(handler, path, options = {}) {
  const server = http.createServer(handler);
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const port = server.address().port;
  try { return await fetch(`http://127.0.0.1:${port}${path}`, options); }
  finally { await new Promise(resolve => server.close(resolve)); }
}

test('health exposes readiness without secrets', async () => {
  const env = { EVO_API_TOKEN: 'private', MEGA_OPERATOR_ID: 'operator', MEGA_SECRET_KEY: 'secret', PUBLIC_BASE_URL: 'https://example.test', CURRENCY: 'MYR' };
  const res = await run(makeApp({ env }), '/health');
  const data = await res.json();
  assert.equal(res.status, 200);
  assert.equal(data.configured.evo888h5, true);
  assert.equal(data.callbackUrls.pgsoft, 'https://example.test/callbacks/pgsoft');
  assert.equal(JSON.stringify(data).includes('private'), false);
  assert.equal(JSON.stringify(data).includes('secret'), false);
});

const DIRECT_PORTAL_ORIGIN = 'https://master7-v17-staging.onrender.com';
const PLATFORM_ORIGINS = [
  'https://master7.best',
  'https://www.master7.best',
  'https://master7.site',
  'https://www.master7.site',
  DIRECT_PORTAL_ORIGIN,
];

test('default browser origin is the current direct portal and excludes retired domains', async () => {
  const app = makeApp({ env: {} });
  const current = await run(app, '/health', { headers: { Origin: DIRECT_PORTAL_ORIGIN } });
  assert.equal(current.headers.get('access-control-allow-origin'), DIRECT_PORTAL_ORIGIN);
  assert.deepEqual((await current.json()).browserAccess.allowedOrigins, [DIRECT_PORTAL_ORIGIN]);
  for (const origin of ['https://www.master7.vip', 'https://admin.master7.vip']) {
    const retired = await run(app, '/health', { headers: { Origin: origin } });
    assert.equal(retired.headers.get('access-control-allow-origin'), null);
  }
});

test('all current platform origins work for GET and browser preflight', async () => {
  const app = makeApp({ env: { ALLOWED_ORIGINS: PLATFORM_ORIGINS.join(',') } });
  for (const origin of PLATFORM_ORIGINS) {
    const health = await run(app, '/health', { headers: { Origin: origin } });
    assert.equal(health.status, 200);
    assert.equal(health.headers.get('access-control-allow-origin'), origin);
    assert.equal(health.headers.get('vary'), 'Origin');
    assert.equal(health.headers.get('access-control-allow-credentials'), null);
    const data = await health.json();
    assert.equal(data.version, require('./package.json').version);
    assert.deepEqual(data.browserAccess.allowedOrigins, PLATFORM_ORIGINS);
    assert.equal(data.mode, 'uat');
    const preflight = await run(app, '/admin/vpay/order', { method: 'OPTIONS', headers: {
      Origin: origin, 'Access-Control-Request-Method': 'POST',
      'Access-Control-Request-Headers': 'authorization, content-type',
    } });
    assert.equal(preflight.status, 204);
    assert.equal(preflight.headers.get('access-control-allow-origin'), origin);
  }
});

test('untrusted, lookalike and opaque origins receive no browser access', async () => {
  const app = makeApp({ env: { ALLOWED_ORIGINS: PLATFORM_ORIGINS.join(',') } });
  for (const origin of ['https://master7.best.attacker.test', 'https://www.master7.vip', 'http://master7.best', 'null']) {
    const res = await run(app, '/health', { headers: { Origin: origin } });
    assert.equal(res.headers.get('access-control-allow-origin'), null);
    assert.equal(res.headers.get('vary'), 'Origin');
    const preflight = await run(app, '/health', { method: 'OPTIONS', headers: { Origin: origin, 'Access-Control-Request-Method': 'GET' } });
    assert.equal(preflight.status, 403);
    assert.equal(preflight.headers.get('access-control-allow-origin'), null);
  }
});

test('approved website origins do not bypass admin or callback authorization', async () => {
  let calls = 0;
  const app = makeApp({ env: {
    ALLOWED_ORIGINS: PLATFORM_ORIGINS.join(','), GATEWAY_ADMIN_TOKEN: 'x'.repeat(32),
    VPAY_TRADER_ID: '123', VPAY_API_TOKEN: 'private-test-key',
  }, fetchImpl: async () => { calls++; throw new Error('must not send upstream'); } });
  for (const path of ['/admin/vpay/order', '/callbacks/vpay/payment', '/callbacks/vpay/withdrawal']) {
    const res = await run(app, path, { method: 'POST', headers: {
      Origin: PLATFORM_ORIGINS[2], 'Content-Type': 'application/json',
    }, body: '{}' });
    assert.equal(res.status, 401);
    assert.equal(res.headers.get('access-control-allow-origin'), PLATFORM_ORIGINS[2]);
    assert.equal((await res.text()).includes('private-test-key'), false);
  }
  assert.equal(calls, 0);
});

test('legacy origin, explicit override and empty list behave predictably', async () => {
  const legacy = makeApp({ env: { ALLOWED_ORIGIN: 'https://legacy.example/' } });
  const res = await run(legacy, '/health', { headers: { Origin: 'https://legacy.example' } });
  assert.equal(res.headers.get('access-control-allow-origin'), 'https://legacy.example');
  const custom = makeApp({ env: { ALLOWED_ORIGIN: 'https://legacy.example', ALLOWED_ORIGINS: ' https://master7.best/, https://master7.best ' } });
  const status = await run(custom, '/health');
  assert.deepEqual((await status.json()).browserAccess.allowedOrigins, ['https://master7.best']);
  const denied = await run(custom, '/health', { headers: { Origin: 'https://legacy.example' } });
  assert.equal(denied.headers.get('access-control-allow-origin'), null);
  const closed = await run(makeApp({ env: { ALLOWED_ORIGINS: '' } }), '/health', { headers: { Origin: PLATFORM_ORIGINS[0] } });
  assert.equal(closed.headers.get('access-control-allow-origin'), null);
});

test('bad origin configuration and unsupported preflights are rejected', async () => {
  for (const value of ['*', 'null', 'https://*.example.com', 'https://user:pass@example.com', 'https://example.com/path', 'https://example.com?x=1', 'https://example.com#x', 'file:///tmp']) {
    assert.throws(() => makeApp({ env: { ALLOWED_ORIGINS: value } }), /origin/i);
  }
  const app = makeApp({ env: { ALLOWED_ORIGINS: PLATFORM_ORIGINS[0] } });
  for (const extra of [{ 'Access-Control-Request-Method': 'DELETE' }, { 'Access-Control-Request-Headers': 'x-admin-secret' }]) {
    const res = await run(app, '/health', { method: 'OPTIONS', headers: { Origin: PLATFORM_ORIGINS[0], ...extra } });
    assert.equal(res.status, 403);
  }
});

test('MegaH5 catalog signs the documented fields', async () => {
  let request;
  const fetchImpl = async (url, options) => {
    request = { url, options, body: JSON.parse(options.body) };
    return Response.json({ Status: 200, Description: 'Success',
      ResponseDateTime: '2026-10-12T10:00:00Z', Game: [] });
  };
  const env = { MEGA_OPERATOR_ID: 'master7', MEGA_SECRET_KEY: 'secret', MEGA_BASE_URL: 'https://provider.test/api', CURRENCY: 'MYR' };
  const fixed = new Date('2026-10-12T10:00:00Z');
  const res = await run(makeApp({ env, fetchImpl, now: () => fixed }), '/providers/megah5/games');
  assert.equal(res.status, 200);
  assert.equal(request.url, 'https://provider.test/api/GetGameList');
  assert.equal(request.body.Currency, 'MYR');
  assert.equal(request.body.Signature, megaSignature('GetGameList', '2026-10-12T10:00:00Z', 'master7', 'secret'));
});

function megaGame(overrides = {}) {
  return {
    GameCode: '55021',
    GameName: 'Fixture game',
    GameType: 1,
    HasDemo: true,
    ImageUrl: 'https://gth.megah5.com/thumbs/55021.png',
    Brand: 'Fixture brand',
    ...overrides,
  };
}

test('MegaH5 catalogue validates every row and returns only public game fields', async () => {
  const upstream = {
    Status: 200,
    Description: 'Success',
    ResponseDateTime: '2026-11-10T06:00:00Z',
    Game: [megaGame({ ProviderSecret: 'must-never-leave-gateway' })],
    InternalAccount: 'must-never-leave-gateway',
  };
  const response = await run(makeApp({
    env: { MEGA_OPERATOR_ID: 'master7', MEGA_SECRET_KEY: 'secret', CURRENCY: 'MYR' },
    fetchImpl: async () => Response.json(upstream),
  }), '/providers/megah5/games');
  const data = await response.json();
  assert.equal(response.status, 200);
  assert.deepEqual(Object.keys(data.result.Game[0]).sort(), [
    'Brand', 'GameCode', 'GameName', 'GameType', 'HasDemo', 'ImageUrl', 'Maintenance',
  ].sort());
  assert.equal(data.result.Game[0].Maintenance, true);
  assert.equal(JSON.stringify(data).includes('must-never-leave-gateway'), false);
});

test('MegaH5 catalogue availability is fail-closed without explicit active H5 evidence', async () => {
  const rows = [
    megaGame({ GameCode: '55021' }),
    megaGame({ GameCode: '55022', IsActive: true, IsH5Support: true, Maintenance: '1|2|3|4|5|6' }),
    megaGame({ GameCode: '55023', IsActive: false, IsH5Support: true, Maintenance: false }),
    megaGame({ GameCode: '55024', IsActive: true, IsH5Support: false, Maintenance: false }),
    megaGame({ GameCode: '55025', IsActive: true, IsH5Support: true, Maintenance: false }),
  ];
  const response = await run(makeApp({
    env: { MEGA_OPERATOR_ID: 'master7', MEGA_SECRET_KEY: 'secret', CURRENCY: 'MYR' },
    fetchImpl: async () => Response.json({ Status: 200, Description: 'Success',
      ResponseDateTime: '2026-11-10T06:00:00Z', Game: rows }),
  }), '/providers/megah5/games');
  const data = await response.json();
  assert.equal(response.status, 200);
  assert.deepEqual(data.result.Game.map(game => game.Maintenance), [true, true, true, true, false]);
  assert.ok(data.result.Game.every(game => typeof game.Maintenance === 'boolean'));
});

test('malformed or duplicate MegaH5 catalogue rows fail closed and are not cached', async () => {
  let calls = 0;
  const responses = [
    { Status: 200, Description: 'Success', ResponseDateTime: '2026-11-10T06:00:00Z',
      Game: [megaGame(), megaGame({ GameId: 55022 })] },
    { Status: 200, Description: 'Success', ResponseDateTime: '2026-11-10T06:00:01Z',
      Game: [megaGame()] },
  ];
  const app = makeApp({
    env: { MEGA_OPERATOR_ID: 'master7', MEGA_SECRET_KEY: 'secret', CURRENCY: 'MYR' },
    fetchImpl: async () => Response.json(responses[calls++]),
  });
  const invalid = await run(app, '/providers/megah5/games');
  assert.equal(invalid.status, 502);
  assert.equal((await invalid.json()).error, 'megah5_catalogue_invalid');
  const repaired = await run(app, '/providers/megah5/games');
  assert.equal(repaired.status, 200);
  assert.equal(calls, 2);
});

test('MegaH5 catalogue rejection does not expose the provider body', async () => {
  const response = await run(makeApp({
    env: { MEGA_OPERATOR_ID: 'master7', MEGA_SECRET_KEY: 'secret', CURRENCY: 'MYR' },
    fetchImpl: async () => Response.json({ Status: 403, Description: 'private provider account detail',
      ResponseDateTime: '2026-11-10T06:00:00Z', DebugToken: 'private-debug-token' }),
  }), '/providers/megah5/games');
  const data = await response.json();
  assert.equal(response.status, 502);
  assert.equal(data.error, 'megah5_catalogue_rejected');
  assert.equal(data.providerStatus, 403);
  assert.equal(JSON.stringify(data).includes('private'), false);
});

test('platform game credential can create only a MegaH5 session', async () => {
  const token = 'platform-game-peer-credential-'.padEnd(48, 'x');
  let request;
  const fixed = new Date('2026-11-06T01:00:00Z');
  const fetchImpl = async (url, options) => {
    request = { url, body: JSON.parse(options.body) };
    return Response.json({ Status: 200, Description: 'Success',
      ResponseDateTime: '2026-11-06 01:00:00', Url: 'https://launch.example.test/session' });
  };
  const env = { PLATFORM_GAME_TOKEN: token, MEGA_OPERATOR_ID: 'master7', MEGA_SECRET_KEY: 'secret',
    MEGA_PROVIDER_MAPPING_VERIFIED: 'true', CURRENCY: 'MYR' };
  const payload = { playerId: 'member_123', gameCode: '55021', ip: '203.0.113.8', lang: 'en-us' };
  const denied = await run(makeApp({ env, fetchImpl, now: () => fixed }), '/platform/megah5/session', {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload),
  });
  assert.equal(denied.status, 401);
  const res = await run(makeApp({ env, fetchImpl, now: () => fixed }), '/platform/megah5/session', {
    method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }, body: JSON.stringify(payload),
  });
  assert.equal(res.status, 200);
  assert.ok(request.url.endsWith('/GameLogin'));
  assert.equal(request.body.PlayerId, payload.playerId);
  assert.equal(request.body.GameCode, payload.gameCode);
  assert.equal(request.body.Currency, 'MYR');
  assert.equal(request.body.RedirectUrl, DIRECT_PORTAL_ORIGIN);
  assert.equal(request.body.Signature, megaSignature('GameLogin', '2026-11-06T01:00:00Z', 'master7', 'secret', payload.playerId));
  const adminDenied = await run(makeApp({ env, fetchImpl }), '/admin/evo888h5/player', {
    method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ userid: 'member123' }),
  });
  assert.equal(adminDenied.status, 401);
});

test('platform game credential can query only a MegaH5 player balance', async () => {
  const token = 'platform-game-peer-credential-'.padEnd(48, 'x');
  let request;
  const fixed = new Date('2026-11-06T01:05:00Z');
  const fetchImpl = async (url, options) => {
    request = { url, body: JSON.parse(options.body) };
    return Response.json({ Status: 200, Description: 'Success',
      ResponseDateTime: '2026-11-06 01:05:00', CurrentBalance: 0, Currency: 'MYR' });
  };
  const env = { PLATFORM_GAME_TOKEN: token, MEGA_OPERATOR_ID: 'master7', MEGA_SECRET_KEY: 'secret',
    MEGA_PROVIDER_MAPPING_VERIFIED: 'true' };
  const denied = await run(makeApp({ env, fetchImpl, now: () => fixed }), '/platform/megah5/balance', {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ playerId: 'member_123' }),
  });
  assert.equal(denied.status, 401);
  const response = await run(makeApp({ env, fetchImpl, now: () => fixed }), '/platform/megah5/balance', {
    method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ playerId: 'member_123' }),
  });
  assert.equal(response.status, 200);
  assert.ok(request.url.endsWith('/CheckBalance'));
  assert.equal(request.body.PlayerId, 'member_123');
  assert.equal(request.body.Signature, megaSignature('CheckBalance', '2026-11-06T01:05:00Z', 'master7', 'secret', 'member_123'));
});

test('EVO catalog uses bearer token and hides it from response', async () => {
  let authorization;
  const fetchImpl = async (_url, options) => {
    authorization = options.headers.Authorization;
    return new Response(JSON.stringify({ code: 0, data: [] }), { status: 200 });
  };
  const res = await run(makeApp({ env: { EVO_API_TOKEN: 'token-value' }, fetchImpl }), '/providers/evo888h5/games');
  const data = await res.json();
  assert.equal(res.status, 200);
  assert.equal(authorization, 'Bearer token-value');
  assert.equal(JSON.stringify(data).includes('token-value'), false);
});

test('EVO provider error is not reported as a successful connection', async () => {
  const fetchImpl = async () => new Response(JSON.stringify({ code: 130, message: 'IP address is not in whitelist' }), { status: 200 });
  const res = await run(makeApp({ env: { EVO_API_TOKEN: 'token-value' }, fetchImpl }), '/providers/evo888h5/games');
  assert.equal(res.status, 502);
});

test('EVO provider rejection is not cached after an allowlist is repaired', async () => {
  let calls = 0;
  const fetchImpl = async () => {
    calls += 1;
    return new Response(JSON.stringify(calls === 1
      ? { code: 130, message: 'IP address is not in whitelist' }
      : { code: 0, data: [] }), { status: 200 });
  };
  const app = makeApp({ env: { EVO_API_TOKEN: 'token-value' }, fetchImpl });
  assert.equal((await run(app, '/providers/evo888h5/games')).status, 502);
  assert.equal((await run(app, '/providers/evo888h5/games')).status, 200);
  assert.equal(calls, 2);
});

test('egress diagnostic returns the current service IP without credentials', async () => {
  const fetchImpl = async () => new Response(JSON.stringify({ ip: '203.0.113.9' }), { status: 200 });
  const res = await run(makeApp({ env: {}, fetchImpl }), '/diagnostics/egress-ip');
  assert.deepEqual(await res.json(), { ok: true, ip: '203.0.113.9' });
});

test('admin routes reject missing token', async () => {
  const res = await run(makeApp({ env: { GATEWAY_ADMIN_TOKEN: 'x'.repeat(32) } }), '/admin/evo888h5/player', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ userid: 'test1' }) });
  assert.equal(res.status, 401);
});

test('callback URLs are reachable but do not accept unsigned events', async () => {
  const handler = makeApp({ env: {} });
  const check = await run(handler, '/callbacks/pgsoft');
  assert.equal(check.status, 200);
  const event = await run(handler, '/callbacks/pgsoft/Bet', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' });
  assert.equal(event.status, 503);
});


test('CLOTPLAY catalogue uses documented auth, pagination and excludes private fields', async () => {
  let request;
  const fetchImpl = async (url, options) => {
    request = { url, options };
    return new Response(JSON.stringify({ data: [{slug:'sample', name:'Sample', name_cn:'样板', is_maintenance:1, secret:'hidden', thumbnails:{en:{square:'https://example.test/a.png',portrait:'http://example.test/b.png'}}}], pagination:{current_page:2,last_page:3,per_page:100,total:201}, token:'hidden' }));
  };
  const res = await run(makeApp({env:{CLOTPLAY_OPERATOR_TOKEN:'private-token'},fetchImpl}), '/providers/clotplay/games?page=2');
  const data = await res.json();
  assert.equal(res.status,200);
  assert.ok(request.url.endsWith('/get-game-list?per_page=100&page=2'));
  assert.equal(request.options.headers.Authorization,'private-token');
  assert.match(request.options.headers['User-Agent'], /^MASTER7-Integration-Gateway\//);
  assert.equal(request.options.body,undefined);
  assert.equal(data.games[0].maintenance,true);
  assert.equal(data.games[0].thumbnails.en.portrait,null);
  assert.equal(data.pagination.total,201);
  assert.ok(!JSON.stringify(data).includes('hidden'));
  assert.ok(!JSON.stringify(data).includes('private-token'));
});
test('CLOTPLAY rejects missing configuration and bad pages without upstream calls', async () => {
  let calls=0;
  const fetchImpl=async()=>{calls++;throw new Error('unexpected');};
  assert.equal((await run(makeApp({env:{},fetchImpl}),'/providers/clotplay/games')).status,503);
  for (const page of ['0','-1','2x','9999999']) {
    assert.equal((await run(makeApp({env:{CLOTPLAY_OPERATOR_TOKEN:'token'},fetchImpl}),'/providers/clotplay/games?page='+page)).status,400);
  }
  assert.equal(calls,0);
});
test('CLOTPLAY upstream failure does not leak response credentials', async () => {
  const fetchImpl=async()=>new Response(JSON.stringify({secret:'hidden'}),{status:403});
  const res=await run(makeApp({env:{CLOTPLAY_OPERATOR_TOKEN:'token'},fetchImpl}),'/providers/clotplay/games');
  assert.equal(res.status,502);
  assert.deepEqual(await res.json(),{error:'clotplay_catalogue_failed',upstreamStatus:403});
});

test('EPICWIN and KISSH5 catalogue profiles keep credentials and currencies separate', async () => {
  const cases = [
    ['epicwin','normal','epic-normal','epic-n-secret','MYR'],
    ['epicwin','free','epic-free','epic-f-secret','MYR'],
    ['918kissh5','normal','kiss-normal','kiss-n-secret','MYR'],
    ['918kissh5','my1','kiss-my1','kiss-m-secret','MY1'],
    ['918kissh5','free','kiss-free','kiss-f-secret','MYR'],
  ];
  const env={
    EPICWIN_NORMAL_OPERATOR_ID:'epic-normal',EPICWIN_NORMAL_SECRET_KEY:'epic-n-secret',
    EPICWIN_FREE_OPERATOR_ID:'epic-free',EPICWIN_FREE_SECRET_KEY:'epic-f-secret',
    KISSH5_NORMAL_OPERATOR_ID:'kiss-normal',KISSH5_NORMAL_SECRET_KEY:'kiss-n-secret',
    KISSH5_MY1_OPERATOR_ID:'kiss-my1',KISSH5_MY1_SECRET_KEY:'kiss-m-secret',
    KISSH5_FREE_OPERATOR_ID:'kiss-free',KISSH5_FREE_SECRET_KEY:'kiss-f-secret',
  };
  for(const [provider,account,id,secret,currency] of cases){
    let sent;
    const now=()=>new Date('2026-10-12T22:00:00Z');
    const fetchImpl=async(url,options)=>{
      sent={url,headers:options.headers,body:JSON.parse(options.body)};
      const game = provider === '918kissh5'
        ? {GameCode:'1',GameName:'Sample',GameType:1,ImageUrl:'https://gth.kissh5.com/thumbs/web/1.png',IsActive:true,IsH5Support:true,Maintenance:false,private:'hidden'}
        : {GameCode:'1',GameName:'Sample',GameType:1,ImageUrl:'https://unverified.example.test/a.png',private:'hidden'};
      return new Response(JSON.stringify({Status:200,Game:[game],SecretKey:secret}));
    };
    const res=await run(makeApp({env,fetchImpl,now}),'/providers/'+provider+'/games?account='+account);
    const data=await res.json();
    assert.equal(res.status,200);
    assert.equal(sent.body.OperatorId,id);assert.equal(sent.body.Currency,currency);
    assert.equal(sent.body.Signature,megaSignature('GetGameList','2026-10-12T22:00:00Z',id,secret));
    assert.match(sent.headers['User-Agent'], /^MASTER7-Integration-Gateway\//);
    assert.equal(data.games[0].imageUrl,provider==='918kissh5'?'https://gth.kissh5.com/thumbs/web/1.png':null);
    assert.equal(data.games[0].maintenance,provider!=='918kissh5');
    assert.ok(!JSON.stringify(data).includes(secret));assert.ok(!JSON.stringify(data).includes('hidden'));
    assert.equal(data.currency,currency);
  }
});
test('catalogue profiles reject unknown accounts and missing keys without network requests', async()=>{
  let calls=0;const fetchImpl=async()=>{calls++;throw new Error('unexpected');};
  for(const p of ['epicwin','918kissh5']){
    assert.equal((await run(makeApp({env:{},fetchImpl}),'/providers/'+p+'/games')).status,503);
    assert.equal((await run(makeApp({env:{},fetchImpl}),'/providers/'+p+'/games?account=toString')).status,400);
  }
  assert.equal(calls,0);
});
test('catalogue provider denial remains a failure and hides upstream secrets',async()=>{
  const fetchImpl=async()=>new Response(JSON.stringify({Status:900403,SecretKey:'private'}));
  const res=await run(makeApp({env:{EPICWIN_NORMAL_OPERATOR_ID:'id',EPICWIN_NORMAL_SECRET_KEY:'secret'},fetchImpl}),'/providers/epicwin/games');
  const data=await res.json();assert.equal(res.status,502);assert.equal(data.providerStatus,900403);
  assert.ok(!JSON.stringify(data).includes('private'));
});

test('KISSH5 rejects malformed success catalogues without leaking upstream fields',async()=>{
  const env={KISSH5_NORMAL_OPERATOR_ID:'kiss-normal',KISSH5_NORMAL_SECRET_KEY:'kiss-secret'};
  const invalid=[
    {Status:'200',Game:[]},
    {Status:200,Game:[{GameCode:'',GameName:'Missing code',GameType:1}]},
    {Status:200,Game:[{GameCode:'1',GameName:'Duplicate',GameType:1},{GameCode:'1',GameName:'Duplicate',GameType:1}]},
    {Status:200,Game:[{GameCode:'1',GameName:'Unsafe image',GameType:1,ImageUrl:'https://attacker.example.test/thumbs/1.png'}]},
  ];
  for(const payload of invalid){
    payload.SecretKey='must-not-pass';
    const fetchImpl=async()=>Response.json(payload);
    const response=await run(makeApp({env,fetchImpl}),'/providers/918kissh5/games');
    const data=await response.json();
    assert.equal(response.status,502);
    assert.deepEqual(data,{error:'provider_catalogue_failed',provider:'918kissh5',upstreamStatus:200,providerStatus:Number.isSafeInteger(payload.Status)?payload.Status:null});
    assert.ok(!JSON.stringify(data).includes('must-not-pass'));
  }
});

