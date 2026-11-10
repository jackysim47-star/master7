import {test} from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {readFileSync,readdirSync} from 'node:fs';
import {randomBytes,createHash,scryptSync} from 'node:crypto';
import {handle} from '../lib/backend.ts';

function fixture(){
 const sqlite=new DatabaseSync(':memory:');
 for(const name of readdirSync(new URL('../drizzle/',import.meta.url)).filter(x=>x.endsWith('.sql')).sort())sqlite.exec(readFileSync(new URL('../drizzle/'+name,import.meta.url),'utf8'));
 class Statement{constructor(sql,args=[]){this.sql=sql;this.args=args;}bind(...args){return new Statement(this.sql,args);}async first(){return sqlite.prepare(this.sql).get(...this.args)??null;}async all(){return {results:sqlite.prepare(this.sql).all(...this.args)};}async run(){return sqlite.prepare(this.sql).run(...this.args);}}
 const db={prepare:sql=>new Statement(sql),async batch(statements){sqlite.exec('BEGIN');try{const out=[];for(const s of statements)out.push(await s.run());sqlite.exec('COMMIT');return out;}catch(e){sqlite.exec('ROLLBACK');throw e;}}};
 const code=randomBytes(32).toString('base64url'),config={db,identity:null,ownerEmail:'owner@example.test',ownerLoginId:'master7_owner',ownerSetupHash:createHash('sha256').update(code).digest('hex'),ownerSetupExpires:Math.floor(Date.now()/1000)+3600};
 const sessions={};
 async function call(name,path,data,extra={}){
  const entry=sessions[name]??{};
  const req=new Request('https://portal.example.test'+path,{method:data===undefined?'GET':'POST',headers:{'content-type':'application/json',origin:'https://portal.example.test',cookie:entry.cookie??'','x-csrf-token':entry.csrf??'','cf-connecting-ip':'192.0.2.8',...extra},...(data===undefined?{}:{body:JSON.stringify(data)})});
  const response=await handle(req,config),setCookie=response.headers.get('set-cookie');
  if(name&&setCookie)sessions[name]={...entry,cookie:setCookie.split(';')[0]};
  const body=await response.json();if(name&&path==='/api/session')sessions[name]={...sessions[name],csrf:body.csrf};
  return {status:response.status,body,setCookie};
 }
 function enableSms(){const base=`https://anchor-${randomBytes(4).toString('hex')}.test`;config.anchorApiBaseUrl=base;config.anchorUsername='test-user';config.anchorPassword='test-password';config.anchorSenderId='66886';config.otpHashSecret='test-only-secret-that-is-long-enough-123456';config.smsFetch=async(url,init)=>{const parsed=new URL(url),q=parsed.searchParams;assert.equal(parsed.pathname,'/mt/sendMtSmsNoToken');assert.equal(init.method,'GET');assert.equal(q.get('user'),'test-user');assert.equal(q.get('pass'),'test-password');config.lastOtp=/\b(\d{6})\b/.exec(q.get('text'))?.[1];config.lastSms={pathname:parsed.pathname,method:init.method,to:q.get('to'),sender:q.get('from'),dataCoding:q.get('dataCoding')};return Response.json({status:201,data:[{statusCode:'001',umgTxId:'synthetic-receipt'}]},{status:201});};return base;}

 return {sqlite,config,code,call,sessions,enableSms};
}
const pass='Local test password / one 2026';
const nextPass='Local test password / two 2026';
async function memberOtpLogin(f,sessionName,username,memberPassword){
 const issued=await f.call(null,'/api/auth/otp/send',{username,password:memberPassword,purpose:'login'});
 assert.equal(issued.status,200);
 return f.call(sessionName,'/api/auth/otp/login',{username,password:memberPassword,challengeId:issued.body.challengeId,otp:f.config.lastOtp});
}
test('trusted Render public origin allows activation behind an internal request URL',async()=>{
 const f=fixture();f.config.allowedOrigins=['https://master7-v17-staging.onrender.com'];
 try{
  const allowed=await f.call(null,'/api/auth/activate',{code:f.code,password:pass},{origin:'https://master7-v17-staging.onrender.com'});
  assert.equal(allowed.status,201);
  const g=fixture();g.config.allowedOrigins=['https://master7-v17-staging.onrender.com'];
  try{const denied=await g.call(null,'/api/auth/activate',{code:g.code,password:pass},{origin:'https://attacker.example.test'});assert.equal(denied.status,403);}
  finally{g.sqlite.close();}
 }finally{f.sqlite.close();}
});
test('owner password requires at least twelve characters',async()=>{
 const accepted=fixture();try{
  assert.equal((await accepted.call(null,'/api/auth/activate',{code:accepted.code,password:'123456789012'})).status,201);
  assert.equal((await accepted.call('owner','/api/auth/login',{username:'master7_owner',password:'123456789012'})).status,200);
 }finally{accepted.sqlite.close();}
 const rejected=fixture();try{
  assert.equal((await rejected.call(null,'/api/auth/activate',{code:rejected.code,password:'12345678901'})).status,400);
 }finally{rejected.sqlite.close();}
});
async function resetFixture(){
 const f=fixture();await f.call(null,'/api/auth/activate',{code:f.code,password:pass});
 f.resetCode=randomBytes(32).toString('base64url');f.config.ownerResetHash=createHash('sha256').update(f.resetCode).digest('hex');
 f.config.ownerResetIssuedAt=Math.floor(Date.now()/1000);f.config.ownerResetExpires=f.config.ownerResetIssuedAt+3600;
 f.sqlite.prepare('UPDATE password_credentials SET changed_at=?').run(f.config.ownerResetIssuedAt-10);return f;
}
test('owner recovery preserves data and renamed identity, revokes sessions and requires a new login',async()=>{
 const f=await resetFixture();try{
  f.enableSms();const issued=await f.call(null,'/api/auth/otp/send',{username:'member_one',password:pass,phone:'010-801 8801'});await f.call(null,'/api/auth/register',{username:'member_one',password:pass,phone:'010-801 8801',challengeId:issued.body.challengeId,otp:f.config.lastOtp});
  f.sqlite.prepare("UPDATE password_credentials SET username='renamed_owner' WHERE username='master7_owner'").run();
  await f.call('owner','/api/auth/login',{username:'renamed_owner',password:pass});await f.call('owner','/api/session');
  await f.call('second','/api/auth/login',{username:'renamed_owner',password:pass});
  const users=f.sqlite.prepare('SELECT * FROM users ORDER BY id').all(),member=f.sqlite.prepare("SELECT * FROM password_credentials WHERE username='member_one'").get();
  const oldVersion=f.sqlite.prepare("SELECT version FROM password_credentials WHERE username='renamed_owner'").get().version;
  assert.equal((await f.call(null,'/api/auth/options')).body.ownerResetAvailable,true);
  const r=await f.call(null,'/api/auth/reset-owner',{code:f.resetCode,password:nextPass,userId:member.user_id,username:'member_one'});
  assert.equal(r.status,200);assert.equal(r.body.username,'renamed_owner');assert.equal(r.body.signInAgain,true);assert.match(r.setCookie,/Max-Age=0/);
  assert.deepEqual(f.sqlite.prepare('SELECT * FROM users ORDER BY id').all(),users);
  assert.deepEqual(f.sqlite.prepare("SELECT * FROM password_credentials WHERE username='member_one'").get(),member);
  assert.equal(f.sqlite.prepare("SELECT version FROM password_credentials WHERE username='renamed_owner'").get().version,oldVersion+1);
  assert.equal((await f.call('owner','/api/session')).body.user,null);assert.equal((await f.call('second','/api/session')).body.user,null);
  assert.equal((await f.call(null,'/api/auth/login',{username:'renamed_owner',password:pass})).status,401);
  assert.equal((await f.call('owner','/api/auth/login',{username:'renamed_owner',password:nextPass})).status,200);await f.call('owner','/api/session');
  assert.equal((await f.call('owner','/api/admin/summary')).status,200);
  const exported=JSON.stringify((await f.call('owner','/api/admin/export')).body);
  for(const secret of [f.resetCode,f.config.ownerResetHash,'owner_password_setup','owner_password_reset:'])assert.equal(exported.includes(secret),false);
  assert.equal((await f.call(null,'/api/auth/options')).body.ownerResetAvailable,false);
  assert.equal((await f.call(null,'/api/auth/reset-owner',{code:f.resetCode,password:pass})).status,409);
  assert.equal(f.sqlite.prepare("SELECT count(*) n FROM audit WHERE event='owner_password_reset'").get().n,1);
 }finally{f.sqlite.close();}
});
test('invalid, expired, weak, cross-origin and stale recovery requests never change credentials',async t=>{
 for(const variant of ['invalid','expired','weak','cross-origin','changed','missing-owner'])await t.test(variant,async()=>{
  const f=await resetFixture();try{
   let code=f.resetCode,password=nextPass,headers={},status=403;
   if(variant==='invalid')code='x'.repeat(43);
   if(variant==='expired')f.config.ownerResetExpires=1;
   if(variant==='weak'){password='short';status=400;}
   if(variant==='cross-origin')headers.origin='https://evil.test';
   if(variant==='changed'){f.sqlite.prepare('UPDATE password_credentials SET changed_at=?').run(f.config.ownerResetIssuedAt);status=409;}
   if(variant==='missing-owner'){f.sqlite.prepare("DELETE FROM settings WHERE id='owner_password_setup'").run();status=409;}
   const before=f.sqlite.prepare('SELECT * FROM password_credentials').all();
   assert.equal((await f.call(null,'/api/auth/reset-owner',{code,password},headers)).status,status);
   assert.deepEqual(f.sqlite.prepare('SELECT * FROM password_credentials').all(),before);
   assert.equal(f.sqlite.prepare("SELECT count(*) n FROM settings WHERE id LIKE 'owner_password_reset:%'").get().n,0);
  }finally{f.sqlite.close();}
 });
});
test('recovery rolls back all changes if a later database write fails',async()=>{
 const f=await resetFixture();try{
  await f.call('owner','/api/auth/login',{username:'master7_owner',password:pass});
  const before=f.sqlite.prepare('SELECT * FROM password_credentials').all(),sessions=f.sqlite.prepare('SELECT * FROM password_sessions').all();
  f.sqlite.exec("CREATE TRIGGER fail_reset BEFORE INSERT ON audit WHEN NEW.event='owner_password_reset' BEGIN SELECT RAISE(ABORT,'test write failure'); END;");
  assert.equal((await f.call(null,'/api/auth/reset-owner',{code:f.resetCode,password:nextPass})).status,503);
  assert.deepEqual(f.sqlite.prepare('SELECT * FROM password_credentials').all(),before);assert.deepEqual(f.sqlite.prepare('SELECT * FROM password_sessions').all(),sessions);
  assert.equal(f.sqlite.prepare("SELECT count(*) n FROM settings WHERE id LIKE 'owner_password_reset:%'").get().n,0);
  f.sqlite.exec('DROP TRIGGER fail_reset');assert.equal((await f.call(null,'/api/auth/reset-owner',{code:f.resetCode,password:nextPass})).status,200);
 }finally{f.sqlite.close();}
});
test('recovery rejects a concurrent credential change between read and transaction',async()=>{
 const f=await resetFixture();try{
  const batch=f.config.db.batch;
  f.config.db.batch=async statements=>{f.sqlite.prepare('UPDATE password_credentials SET version=version+1').run();return batch(statements);};
  const before=f.sqlite.prepare('SELECT password_hash FROM password_credentials').get().password_hash;
  assert.equal((await f.call(null,'/api/auth/reset-owner',{code:f.resetCode,password:nextPass})).status,503);
  assert.equal(f.sqlite.prepare('SELECT password_hash FROM password_credentials').get().password_hash,before);
  assert.equal(f.sqlite.prepare("SELECT count(*) n FROM settings WHERE id LIKE 'owner_password_reset:%'").get().n,0);
 }finally{f.sqlite.close();}
});
test('recovery guesses are rate limited',async()=>{
 const f=await resetFixture();try{for(let i=0;i<5;i++)assert.equal((await f.call(null,'/api/auth/reset-owner',{code:'x'.repeat(43),password:nextPass})).status,403);assert.equal((await f.call(null,'/api/auth/reset-owner',{code:f.resetCode,password:nextPass})).status,429);}finally{f.sqlite.close();}
});
test('password login and one-use owner handover',async t=>{
 const f=fixture(),{call,sqlite,code,sessions}=f;
 try{
 await t.test('invalid, expired, foreign-origin and weak-password activation cannot create an owner',async()=>{
  assert.equal((await call(null,'/api/auth/options')).body.ownerSetupComplete,false);
  assert.equal((await call(null,'/api/auth/activate',{code:'x'.repeat(43),password:pass})).status,403);
  assert.equal((await call(null,'/api/auth/activate',{code,password:pass},{origin:'https://evil.test'})).status,403);
  assert.equal((await call(null,'/api/auth/activate',{code,password:'short'})).status,400);
  f.config.ownerSetupExpires=1;assert.equal((await call(null,'/api/auth/activate',{code,password:pass})).status,403);f.config.ownerSetupExpires=Math.floor(Date.now()/1000)+3600;
  assert.equal(sqlite.prepare('SELECT count(*) n FROM users').get().n,0);
 });
 await t.test('activation is atomic and single use; only salted password hash is stored',async()=>{
  const r=await call(null,'/api/auth/activate',{code,password:pass});assert.equal(r.status,201);assert.equal(r.body.username,'master7_owner');assert.equal(r.setCookie,null);
  assert.equal((await call(null,'/api/auth/activate',{code,password:nextPass})).status,409);
  const stored=sqlite.prepare('SELECT * FROM password_credentials').get();assert.notEqual(stored.password_hash,pass);assert.equal(stored.password_hash.length,64);assert.equal(stored.salt.length,43);
  assert.equal((await call(null,'/api/auth/options')).body.ownerSetupAvailable,false);
  assert.equal((await call(null,'/api/auth/options')).body.ownerSetupComplete,true);
 });
 await t.test('login rejects wrong credentials and untrusted origins, sets secure cookie',async()=>{
  assert.equal((await call('bad','/api/auth/login',{username:'master7_owner',password:'bad password'})).status,401);
  assert.equal((await call('bad','/api/auth/login',{username:'missing_user',password:pass})).status,401);
  assert.equal((await call('owner','/api/auth/login',{username:'master7_owner',password:pass},{origin:'https://evil.test'})).status,403);
  const r=await call('owner','/api/auth/login',{username:'MASTER7_OWNER',password:pass});assert.equal(r.status,200);for(const flag of ['Secure','HttpOnly','SameSite=Strict','Path=/'])assert.ok(r.setCookie.includes(flag));
  const s=await call('owner','/api/session');assert.equal(s.body.user.role,'owner');assert.equal(s.body.authMethod,'password');assert.equal((await call('owner','/api/admin/summary')).status,200);
 });
 await t.test('verified registration creates member access only and cannot claim owner ID or administration',async()=>{
  assert.equal((await call(null,'/api/auth/register',{username:'master7_owner',password:pass,phone:'010-801 8802',role:'owner'})).status,409);
  f.enableSms();const issued=await call(null,'/api/auth/otp/send',{username:'member_one',password:pass,phone:'010-801 8801'});assert.equal((await call(null,'/api/auth/register',{username:'member_one',password:pass,phone:'010-801 8801',role:'owner',approved:true,challengeId:issued.body.challengeId,otp:f.config.lastOtp})).status,201);
  sqlite.prepare('DELETE FROM rate_limits').run();assert.equal((await memberOtpLogin(f,'member','member_one',pass)).status,200);const s=await call('member','/api/session');assert.equal(s.body.user.role,'member');assert.equal(s.body.user.approved,true);
  assert.equal((await call('member','/api/admin/summary')).status,403);assert.equal((await call('member','/api/tickets',{subject:'Login help',message:'Please help me'})).status,201);
  assert.equal((await call('owner','/api/admin/approve',{userId:s.body.user.id})).status,200);
  assert.equal((await call('member','/api/tickets',{subject:'Login help',message:'Please help me'})).status,201);
 });
 await t.test('password and ID change needs current password and CSRF; invalidates every old session',async()=>{
  await call('otherOwnerDevice','/api/auth/login',{username:'master7_owner',password:pass});await call('otherOwnerDevice','/api/session');
  const saved={...sessions.owner};
  assert.equal((await call('owner','/api/auth/change-password',{currentPassword:pass,newPassword:nextPass},{'x-csrf-token':'bad'})).status,403);
  assert.equal((await call('owner','/api/auth/change-password',{currentPassword:'incorrect',newPassword:nextPass})).status,401);
  assert.equal((await call('owner','/api/auth/change-password',{currentPassword:pass,newPassword:nextPass,newUsername:'member_one'})).status,409);
  assert.equal((await call('owner','/api/auth/change-password',{currentPassword:pass,newPassword:nextPass,newUsername:'renamed_owner'})).status,200);
  sessions.owner=saved;
  assert.equal((await call('owner','/api/session')).body.user,null);assert.equal((await call('otherOwnerDevice','/api/session')).body.user,null);
  assert.equal((await call(null,'/api/auth/login',{username:'master7_owner',password:pass})).status,401);
  assert.equal((await call(null,'/api/auth/login',{username:'renamed_owner',password:pass})).status,401);
  assert.equal((await call('owner','/api/auth/login',{username:'renamed_owner',password:nextPass})).status,200);assert.equal((await call('owner','/api/session')).body.user.role,'owner');
 });
 await t.test('exports contain neither password hashes, salts nor session/activation tokens',async()=>{
  const r=await call('owner','/api/admin/export');assert.equal(r.status,200);const text=JSON.stringify(r.body);for(const field of ['password_hash','salt','csrf','token_hash','credential_version',code,pass,nextPass])assert.equal(text.includes(field),false);
 });
 await t.test('logout rejects cross-site requests and revokes cookie server-side',async()=>{
  const saved={...sessions.owner};assert.equal((await call('owner','/api/auth/logout',{}, {origin:'https://evil.test'})).status,403);
  assert.equal((await call('owner','/api/auth/logout',{})).status,200);sessions.owner=saved;assert.equal((await call('owner','/api/admin/summary')).status,401);
 });
 }finally{sqlite.close();}
});
test('expired sessions and throttled logins fail closed',async t=>{
 // Keep the attempts inside one ten-minute rate bucket; wall-clock rollover
 // otherwise makes this assertion depend on when the suite was started.
 const timestamp=Date.now();t.mock.method(Date,'now',()=>timestamp);
 const f=fixture();try{
  await f.call(null,'/api/auth/activate',{code:f.code,password:pass});await f.call('owner','/api/auth/login',{username:'master7_owner',password:pass});
  f.sqlite.prepare('UPDATE password_sessions SET expires_at=1').run();assert.equal((await f.call('owner','/api/session')).body.user,null);
  let last;for(let i=0;i<11;i++)last=await f.call(null,'/api/auth/login',{username:'master7_owner',password:'not correct'});assert.equal(last.status,429);
 }finally{f.sqlite.close();}
});

test('member registration requires a unique Malaysian mobile; customer login requires OTP',async()=>{
 const f=fixture();try{
  assert.equal((await f.call(null,'/api/auth/register',{username:'member_phone',password:'12345678'})).status,400);
  assert.equal((await f.call(null,'/api/auth/register',{username:'member_phone',password:'12345678',phone:'555'})).status,400);
  f.enableSms();const issued=await f.call(null,'/api/auth/otp/send',{username:'member_phone',password:'12345678',phone:'010-801 8800'});assert.equal(issued.status,200);assert.equal((await f.call(null,'/api/auth/register',{username:'member_phone',password:'12345678',phone:'010-801 8800',challengeId:issued.body.challengeId,otp:f.config.lastOtp})).status,201);
  assert.equal(f.sqlite.prepare("SELECT phone FROM users WHERE username='member_phone'").get().phone,'+60108018800');
  assert.equal((await f.call(null,'/api/auth/register',{username:'another_member',password:'12345678',phone:'+60108018800'})).status,409);
  assert.equal((await f.call('member','/api/auth/login',{username:'member_phone',password:'wrong-password'})).status,401);
  assert.equal((await f.call('member','/api/auth/login',{username:'member_phone',password:'12345678'})).status,403);
  f.sqlite.prepare('DELETE FROM rate_limits').run();assert.equal((await memberOtpLogin(f,'member','member_phone','12345678')).status,200);
  const ownerPassword='owner-pass-1234';await f.call(null,'/api/auth/activate',{code:f.code,password:ownerPassword});
  assert.equal((await f.call('owner','/api/auth/login',{username:'master7_owner',password:ownerPassword})).status,200);
 }finally{f.sqlite.close();}
});

function staffSetupFrom(response){assert.match(response.body.staffSetup.setupUrl,/^\/staff-setup#staff-setup=/);const encoded=response.body.staffSetup.setupUrl.split('#staff-setup=')[1],params=new URLSearchParams(decodeURIComponent(encoded));return {userId:params.get('userId'),code:params.get('code'),setupUrl:response.body.staffSetup.setupUrl};}
async function registeredMember(f,username='legacy_staff',memberPassword='123456',phone='010-801 8866'){
 f.enableSms();const issued=await f.call(null,'/api/auth/otp/send',{username,password:memberPassword,phone});assert.equal(issued.status,200);assert.equal((await f.call(null,'/api/auth/register',{username,password:memberPassword,phone,challengeId:issued.body.challengeId,otp:f.config.lastOtp})).status,201);return f.sqlite.prepare('SELECT user_id FROM password_credentials WHERE username=?').get(username).user_id;
}
test('pre-v172 staff password and session fail closed until owner reissues setup',async()=>{
 const f=fixture();try{
  await f.call(null,'/api/auth/activate',{code:f.code,password:pass});await f.call('owner','/api/auth/login',{username:'master7_owner',password:pass});await f.call('owner','/api/session');
  const userId='legacy-human-staff',username='old_staff',oldPassword='123456',salt=randomBytes(32).toString('base64url'),passwordHash=scryptSync(oldPassword,salt,32,{N:32768,r:8,p:3,maxmem:64*1024*1024}).toString('hex'),rawToken=randomBytes(32).toString('base64url'),tokenHash=createHash('sha256').update(rawToken).digest('hex'),expires=Math.floor(Date.now()/1000)+3600;
  f.sqlite.prepare("INSERT INTO users(id,username,role,approved,csrf,created_at) VALUES(?,?,'staff',1,'legacy-csrf',1)").run(userId,username);
  f.sqlite.prepare('INSERT INTO password_credentials(username,user_id,salt,password_hash,version,changed_at) VALUES(?,?,?,?,1,1)').run(username,userId,salt,passwordHash);
  f.sqlite.prepare('INSERT INTO password_sessions(token_hash,user_id,csrf,credential_version,expires_at,created_at) VALUES(?,?,?,1,?,1)').run(tokenHash,userId,'legacy-session-csrf',expires);f.sessions.legacy={cookie:`__Host-master7_session=${rawToken}`};
  assert.equal((await f.call('legacy','/api/session')).body.user,null);assert.equal((await f.call(null,'/api/auth/login',{username,password:oldPassword})).status,401);
  const setup=staffSetupFrom(await f.call('owner','/api/admin/role',{userId,role:'staff'}));assert.equal((await f.call(null,'/api/auth/setup-staff',{...setup,username,password:'new legacy staff password 2026'})).status,200);
  const version=f.sqlite.prepare('SELECT version FROM password_credentials WHERE user_id=?').get(userId).version;assert.equal(f.sqlite.prepare('SELECT value FROM settings WHERE id=?').get(`staff_password_ready:${userId}`).value,String(version));
  assert.equal((await f.call('legacy','/api/auth/login',{username,password:'new legacy staff password 2026'})).status,200);assert.equal((await f.call('legacy','/api/session')).body.user.role,'staff');
  assert.equal((await f.call('legacy','/api/auth/change-password',{currentPassword:'new legacy staff password 2026',newPassword:'rotated legacy staff password 2026'})).status,200);const rotatedVersion=f.sqlite.prepare('SELECT version FROM password_credentials WHERE user_id=?').get(userId).version;assert.equal(f.sqlite.prepare('SELECT value FROM settings WHERE id=?').get(`staff_password_ready:${userId}`).value,String(rotatedVersion));assert.equal((await f.call('legacy','/api/session')).body.user,null);
  assert.equal((await f.call('legacy','/api/auth/login',{username,password:'rotated legacy staff password 2026'})).status,200);assert.equal((await f.call('legacy','/api/session')).body.user.role,'staff');f.sqlite.prepare('DELETE FROM settings WHERE id=?').run(`staff_password_ready:${userId}`);assert.equal((await f.call('legacy','/api/session')).body.user,null);f.sqlite.prepare('DELETE FROM rate_limits').run();assert.equal((await f.call(null,'/api/auth/login',{username,password:'rotated legacy staff password 2026'})).status,401);
 }finally{f.sqlite.close();}
});
test('staff promotion revokes old access and requires one-use twelve-character setup',async()=>{
 const f=fixture();try{
  await f.call(null,'/api/auth/activate',{code:f.code,password:pass});await f.call('owner','/api/auth/login',{username:'master7_owner',password:pass});await f.call('owner','/api/session');
  const staffId=await registeredMember(f);f.sqlite.prepare('DELETE FROM rate_limits').run();assert.equal((await memberOtpLogin(f,'member','legacy_staff','123456')).status,200);await f.call('member','/api/session');
  const oldVersion=f.sqlite.prepare('SELECT version FROM password_credentials WHERE user_id=?').get(staffId).version,promoted=await f.call('owner','/api/admin/role',{userId:staffId,role:'staff'}),setup=staffSetupFrom(promoted);assert.equal(promoted.status,200);assert.equal(promoted.body.staffSetup.username,'legacy_staff');
  assert.equal(f.sqlite.prepare('SELECT role FROM users WHERE id=?').get(staffId).role,'staff');assert.equal(f.sqlite.prepare('SELECT version FROM password_credentials WHERE user_id=?').get(staffId).version,oldVersion+1);assert.equal((await f.call('member','/api/session')).body.user,null);
  f.sqlite.prepare('DELETE FROM rate_limits').run();assert.equal((await f.call(null,'/api/auth/login',{username:'legacy_staff',password:'123456'})).status,401);assert.equal((await f.call(null,'/api/auth/otp/send',{username:'legacy_staff',password:'123456',purpose:'login'})).status,401);
  const exported=JSON.stringify((await f.call('owner','/api/admin/export')).body),stored=f.sqlite.prepare("SELECT value FROM settings WHERE id LIKE 'staff_password_setup:%'").get().value;assert.equal(exported.includes('staff_password_setup'),false);assert.equal(exported.includes(setup.code),false);assert.equal(stored.includes(setup.code),false);assert.equal(JSON.parse(stored).tokenHash,createHash('sha256').update(setup.code).digest('hex'));
  assert.equal((await f.call(null,'/api/auth/setup-staff',{...setup,password:'12345678901',username:'legacy_staff'})).status,400);assert.equal((await f.call(null,'/api/auth/setup-staff',{...setup,password:'staff password 2026',username:'legacy_staff'})).status,200);assert.equal((await f.call(null,'/api/auth/setup-staff',{...setup,password:'different staff password',username:'legacy_staff'})).status,403);
  assert.equal((await f.call('staff','/api/auth/login',{username:'legacy_staff',password:'staff password 2026'})).status,200);await f.call('staff','/api/session');assert.equal((await f.call('staff','/api/admin/summary')).status,200);
  const expired=staffSetupFrom(await f.call('owner','/api/admin/role',{userId:staffId,role:'staff'}));assert.equal((await f.call('staff','/api/session')).body.user,null);f.sqlite.prepare('DELETE FROM rate_limits').run();assert.equal((await f.call(null,'/api/auth/login',{username:'legacy_staff',password:'staff password 2026'})).status,401);const markerKey=`staff_password_setup:${staffId}`,marker=JSON.parse(f.sqlite.prepare('SELECT value FROM settings WHERE id=?').get(markerKey).value);marker.issuedAt-=7200;marker.expiresAt=marker.issuedAt+3600;f.sqlite.prepare('UPDATE settings SET value=? WHERE id=?').run(JSON.stringify(marker),markerKey);assert.equal((await f.call(null,'/api/auth/setup-staff',{...expired,password:'expired staff password 2026',username:'legacy_staff'})).status,403);const reissued=staffSetupFrom(await f.call('owner','/api/admin/role',{userId:staffId,role:'staff'}));assert.equal((await f.call(null,'/api/auth/setup-staff',{...setup,password:'stale password 2026',username:'legacy_staff'})).status,403);assert.equal((await f.call(null,'/api/auth/setup-staff',{...reissued,password:'replacement staff password 2026',username:'legacy_staff'})).status,200);
  assert.equal((await f.call('staff','/api/auth/login',{username:'legacy_staff',password:'replacement staff password 2026'})).status,200);await f.call('staff','/api/session');const beforeDemotion=f.sqlite.prepare('SELECT version FROM password_credentials WHERE user_id=?').get(staffId).version;assert.equal((await f.call('owner','/api/admin/role',{userId:staffId,role:'member'})).status,200);assert.equal(f.sqlite.prepare('SELECT version FROM password_credentials WHERE user_id=?').get(staffId).version,beforeDemotion+1);assert.equal((await f.call('staff','/api/session')).body.user,null);f.sqlite.prepare('DELETE FROM rate_limits').run();assert.equal((await f.call(null,'/api/auth/login',{username:'legacy_staff',password:'replacement staff password 2026'})).status,403);
 }finally{f.sqlite.close();}
});

test('staff promotion and activation roll back on later write failure and reject stale races',async()=>{
 const f=fixture();try{
  await f.call(null,'/api/auth/activate',{code:f.code,password:pass});await f.call('owner','/api/auth/login',{username:'master7_owner',password:pass});await f.call('owner','/api/session');const staffId=await registeredMember(f,'rollback_staff','123456','010-801 8877');
  const beforeCredential=f.sqlite.prepare('SELECT * FROM password_credentials WHERE user_id=?').get(staffId);f.sqlite.exec("CREATE TRIGGER fail_staff_role BEFORE INSERT ON audit WHEN NEW.event='role_staff' BEGIN SELECT RAISE(ABORT,'test role write failure'); END;");assert.equal((await f.call('owner','/api/admin/role',{userId:staffId,role:'staff'})).status,503);assert.equal(f.sqlite.prepare('SELECT role FROM users WHERE id=?').get(staffId).role,'member');assert.deepEqual(f.sqlite.prepare('SELECT * FROM password_credentials WHERE user_id=?').get(staffId),beforeCredential);assert.equal(f.sqlite.prepare("SELECT COUNT(*) n FROM settings WHERE id LIKE 'staff_password_setup:%'").get().n,0);f.sqlite.exec('DROP TRIGGER fail_staff_role');
  const promoted=staffSetupFrom(await f.call('owner','/api/admin/role',{userId:staffId,role:'staff'})),beforeSetup=f.sqlite.prepare('SELECT * FROM password_credentials WHERE user_id=?').get(staffId);f.sqlite.exec("CREATE TRIGGER fail_staff_activate BEFORE INSERT ON audit WHEN NEW.event='staff_password_activated' BEGIN SELECT RAISE(ABORT,'test setup write failure'); END;");assert.equal((await f.call(null,'/api/auth/setup-staff',{...promoted,password:'rollback staff password 2026',username:'rollback_staff'})).status,503);assert.deepEqual(f.sqlite.prepare('SELECT * FROM password_credentials WHERE user_id=?').get(staffId),beforeSetup);assert.equal(f.sqlite.prepare("SELECT COUNT(*) n FROM settings WHERE id LIKE 'staff_password_setup:%'").get().n,1);f.sqlite.exec('DROP TRIGGER fail_staff_activate');assert.equal((await f.call(null,'/api/auth/setup-staff',{...promoted,password:'rollback staff password 2026',username:'rollback_staff'})).status,200);
  assert.equal(f.sqlite.prepare("SELECT COUNT(*) n FROM audit WHERE event='role_staff'").get().n,1);assert.equal(f.sqlite.prepare("SELECT COUNT(*) n FROM audit WHERE event='staff_password_activated'").get().n,1);
 }finally{f.sqlite.close();}
});

test('staff promotion and activation reject concurrent credential changes',async()=>{
 const promotion=fixture();try{
  await promotion.call(null,'/api/auth/activate',{code:promotion.code,password:pass});await promotion.call('owner','/api/auth/login',{username:'master7_owner',password:pass});await promotion.call('owner','/api/session');const staffId=await registeredMember(promotion,'race_staff','123456','010-801 8878'),before=promotion.sqlite.prepare('SELECT password_hash FROM password_credentials WHERE user_id=?').get(staffId).password_hash,batch=promotion.config.db.batch;let injected=false;
  promotion.config.db.batch=async statements=>{if(!injected){injected=true;promotion.sqlite.prepare('UPDATE password_credentials SET version=version+1 WHERE user_id=?').run(staffId);}return batch(statements);};
  assert.equal((await promotion.call('owner','/api/admin/role',{userId:staffId,role:'staff'})).status,409);assert.equal(promotion.sqlite.prepare('SELECT role FROM users WHERE id=?').get(staffId).role,'member');assert.equal(promotion.sqlite.prepare('SELECT password_hash FROM password_credentials WHERE user_id=?').get(staffId).password_hash,before);assert.equal(promotion.sqlite.prepare("SELECT COUNT(*) n FROM settings WHERE id LIKE 'staff_password_setup:%'").get().n,0);
 }finally{promotion.sqlite.close();}
 const activation=fixture();try{
  await activation.call(null,'/api/auth/activate',{code:activation.code,password:pass});await activation.call('owner','/api/auth/login',{username:'master7_owner',password:pass});await activation.call('owner','/api/session');const staffId=await registeredMember(activation,'race_setup','123456','010-801 8879'),setup=staffSetupFrom(await activation.call('owner','/api/admin/role',{userId:staffId,role:'staff'})),before=activation.sqlite.prepare('SELECT password_hash,version FROM password_credentials WHERE user_id=?').get(staffId),batch=activation.config.db.batch;let injected=false;
  activation.config.db.batch=async statements=>{if(!injected){injected=true;activation.sqlite.prepare('UPDATE password_credentials SET version=version+1 WHERE user_id=?').run(staffId);}return batch(statements);};
  assert.equal((await activation.call(null,'/api/auth/setup-staff',{...setup,password:'concurrent staff password 2026',username:'race_setup'})).status,409);const after=activation.sqlite.prepare('SELECT password_hash,version FROM password_credentials WHERE user_id=?').get(staffId);assert.equal(after.password_hash,before.password_hash);assert.equal(after.version,before.version+1);assert.equal(activation.sqlite.prepare("SELECT COUNT(*) n FROM audit WHERE event='staff_password_activated'").get().n,0);assert.equal(activation.sqlite.prepare("SELECT COUNT(*) n FROM settings WHERE id LIKE 'staff_password_setup:%'").get().n,1);
 }finally{activation.sqlite.close();}
});

test('credential-less staff reissue never exposes or accepts an internal placeholder',async()=>{
 const f=fixture();try{
  await f.call(null,'/api/auth/activate',{code:f.code,password:pass});await f.call('owner','/api/auth/login',{username:'master7_owner',password:pass});await f.call('owner','/api/session');
  f.sqlite.prepare("INSERT INTO users(id,username,role,approved,csrf,created_at) VALUES('hosted-new','hosted@example.test','member',1,'hosted',1),('system-support-assistant','Stephanie AI','staff',1,'system-managed',1)").run();
  assert.equal((await f.call('owner','/api/admin/role',{userId:'system-support-assistant',role:'member'})).status,403);assert.equal(f.sqlite.prepare("SELECT COUNT(*) n FROM password_credentials WHERE user_id='system-support-assistant'").get().n,0);
  const first=await f.call('owner','/api/admin/role',{userId:'hosted-new',role:'staff'});assert.equal(first.body.staffSetup.username,null);const placeholder=f.sqlite.prepare("SELECT username FROM password_credentials WHERE user_id='hosted-new'").get().username;assert.match(placeholder,/^staff_setup_[a-f0-9]{16}$/);
  const second=await f.call('owner','/api/admin/role',{userId:'hosted-new',role:'staff'});assert.equal(second.body.staffSetup.username,null);const setup=staffSetupFrom(second);assert.equal((await f.call(null,'/api/auth/setup-staff',{...setup,username:placeholder,password:'hosted staff password 2026'})).status,400);assert.equal((await f.call(null,'/api/auth/setup-staff',{...setup,username:'hosted_staff',password:'hosted staff password 2026'})).status,200);
 }finally{f.sqlite.close();}
});

test('a newly registered member gets an isolated zero MYR wallet and can request independent manual review',async()=>{
 const f=fixture();try{
  assert.equal((await f.call(null,'/api/auth/activate',{code:f.code,password:pass})).status,201);
  assert.equal((await f.call('owner','/api/auth/login',{username:'master7_owner',password:pass})).status,200);await f.call('owner','/api/session');
  f.enableSms();const issued=await f.call(null,'/api/auth/otp/send',{username:'walletmember',password:pass,phone:'010-801 8800'});
  assert.equal((await f.call(null,'/api/auth/register',{username:'walletmember',password:pass,phone:'010-801 8800',challengeId:issued.body.challengeId,otp:f.config.lastOtp})).status,201);
  f.sqlite.prepare('DELETE FROM rate_limits').run();assert.equal((await memberOtpLogin(f,'member','walletmember',pass)).status,200);
  const session=await f.call('member','/api/session'),wallet=await f.call('member','/api/wallet');assert.equal(wallet.body.currency,'MYR');assert.equal(wallet.body.balanceMinor,'0');
  assert.equal((await f.call('member','/api/compliance')).body.identityStatus,'not_started');
  const requested=await f.call('member','/api/compliance',{});assert.equal(requested.status,200);assert.equal(requested.body.reviewComplete,false);
  const reviewed=await f.call('owner','/api/admin/compliance',{memberId:session.body.user.id,reviewType:'identity',decision:'passed',expectedVersion:1,confirmed:true});
  assert.equal(reviewed.status,200);assert.equal(reviewed.body.identityStatus,'passed');assert.equal(reviewed.body.amlStatus,'pending');
 }finally{f.sqlite.close();}
});

test('member registration requires a one-use Anchor SMS challenge and never exposes its code',async()=>{
 const f=fixture();try{
  assert.equal((await f.call(null,'/api/auth/otp/send',{phone:'010-801 8800'})).status,503);
  assert.equal((await f.call(null,'/api/auth/register',{username:'sms_member',password:'12345678',phone:'010-801 8800'})).status,400);
  f.enableSms();const issued=await f.call(null,'/api/auth/otp/send',{username:'sms_member',password:'12345678',phone:'010-801 8800'});
  assert.equal(issued.status,200);assert.equal(issued.body.status,'accepted');assert.equal(issued.body.expiresInSeconds,300);assert.equal(typeof issued.body.challengeId,'string');assert.equal(issued.body.challengeId.length,32);
  assert.deepEqual(f.config.lastSms,{pathname:'/mt/sendMtSmsNoToken',method:'GET',to:'60108018800',sender:'66886',dataCoding:'0'});
  const stored=f.sqlite.prepare('SELECT * FROM otp_challenges WHERE id=?').get(issued.body.challengeId);assert.ok(stored);assert.notEqual(stored.code_hash,f.config.lastOtp);assert.equal(JSON.stringify(issued.body).includes(f.config.lastOtp),false);
  assert.equal((await f.call(null,'/api/auth/register',{username:'sms_member',password:'12345678',phone:'010-801 8800',challengeId:issued.body.challengeId,otp:String((Number(f.config.lastOtp)+1)%1000000).padStart(6,'0')})).status,400);
  assert.equal(f.sqlite.prepare('SELECT attempts FROM otp_challenges WHERE id=?').get(issued.body.challengeId).attempts,1);
  assert.equal((await f.call(null,'/api/auth/register',{username:'sms_member',password:'12345678',phone:'010-801 8800',challengeId:issued.body.challengeId,otp:f.config.lastOtp})).status,201);
  assert.equal((await f.call(null,'/api/auth/register',{username:'replay_member',password:'12345678',phone:'010-801 8800',challengeId:issued.body.challengeId,otp:f.config.lastOtp})).status,409);
  assert.equal(f.sqlite.prepare('SELECT consumed_at FROM otp_challenges WHERE id=?').get(issued.body.challengeId).consumed_at>0,true);
  const second=await f.call(null,'/api/auth/otp/send',{username:'expired_member',password:'12345678',phone:'010-801 8801'});assert.equal(second.status,200);
  f.sqlite.prepare('UPDATE otp_challenges SET expires_at=1 WHERE id=?').run(second.body.challengeId);
  assert.equal((await f.call(null,'/api/auth/register',{username:'expired_member',password:'12345678',phone:'010-801 8801',challengeId:second.body.challengeId,otp:f.config.lastOtp})).status,400);
 }finally{f.sqlite.close();}
});

test('registration and customer sign-in use one-use SMS OTP while owner sign-in stays password-only',async()=>{
 const f=fixture();try{f.enableSms();const pass='member-pass-123';const registration=await f.call(null,'/api/auth/otp/send',{username:'otp_member',password:pass,phone:'010-801 8899',purpose:'register'});assert.equal(registration.status,200);
 assert.equal((await f.call(null,'/api/auth/register',{username:'otp_member',password:pass,phone:'010-801 8899',challengeId:registration.body.challengeId,otp:f.config.lastOtp})).status,201);
 f.sqlite.prepare('DELETE FROM rate_limits').run();assert.equal((await f.call('member','/api/auth/login',{username:'otp_member',password:pass})).status,403);
 const issued=await f.call(null,'/api/auth/otp/send',{username:'otp_member',password:pass,purpose:'login'});assert.equal(issued.status,200);assert.equal(issued.body.destination,'••••8899');
 const badOtp=String((Number(f.config.lastOtp)+1)%1000000).padStart(6,'0');assert.equal((await f.call('member','/api/auth/otp/login',{username:'otp_member',password:pass,challengeId:issued.body.challengeId,otp:badOtp})).status,400);
 const login=await f.call('member','/api/auth/otp/login',{username:'otp_member',password:pass,challengeId:issued.body.challengeId,otp:f.config.lastOtp});assert.equal(login.status,200);assert.match(login.setCookie,/HttpOnly/);assert.equal((await f.call('member','/api/session')).body.user.username,'otp_member');
 assert.equal((await f.call('replay','/api/auth/otp/login',{username:'otp_member',password:pass,challengeId:issued.body.challengeId,otp:f.config.lastOtp})).status,400);
 assert.equal((await f.call(null,'/api/auth/otp/send',{username:'otp_member',password:'wrong-password',purpose:'login'})).status,401);
 }finally{f.sqlite.close();}
});

test('registration referral code assigns the new member and rejects unknown codes',async()=>{
 const f=fixture();try{f.enableSms();
  let otp=await f.call(null,'/api/auth/otp/send',{username:'referrer_one',password:pass,phone:'010-801 8871'});let made=await f.call(null,'/api/auth/register',{username:'referrer_one',password:pass,phone:'010-801 8871',challengeId:otp.body.challengeId,otp:f.config.lastOtp});assert.equal(made.status,201);
  const referrer=f.sqlite.prepare("SELECT user_id FROM password_credentials WHERE username='referrer_one'").get(),code=f.sqlite.prepare('SELECT code FROM referral_codes WHERE user_id=?').get(referrer.user_id).code;
  otp=await f.call(null,'/api/auth/otp/send',{username:'referred_two',password:pass,phone:'010-801 8872'});made=await f.call(null,'/api/auth/register',{username:'referred_two',password:pass,phone:'010-801 8872',challengeId:otp.body.challengeId,otp:f.config.lastOtp,referralCode:code});assert.equal(made.status,201);assert.equal(made.body.referred,true);assert.equal(f.sqlite.prepare('SELECT referrer_id FROM referral_relationships').get().referrer_id,referrer.user_id);
  otp=await f.call(null,'/api/auth/otp/send',{username:'unknown_ref',password:pass,phone:'010-801 8873'});made=await f.call(null,'/api/auth/register',{username:'unknown_ref',password:pass,phone:'010-801 8873',challengeId:otp.body.challengeId,otp:f.config.lastOtp,referralCode:'UNKNOWN001'});assert.equal(made.status,400);
 }finally{f.sqlite.close();}
});
test('Anchor provider failures fail closed without creating OTP challenges',async()=>{
 const f=fixture();try{
  f.enableSms();f.config.smsFetch=async()=>Response.json({error:'temporary'}, {status:503});
  assert.equal((await f.call(null,'/api/auth/otp/send',{username:'sms_member',password:'12345678',phone:'010-801 8800'})).status,503);
  assert.equal(f.sqlite.prepare('SELECT COUNT(*) n FROM otp_challenges').get().n,0);
  assert.equal(f.sqlite.prepare('SELECT COUNT(*) n FROM users').get().n,0);
 }finally{f.sqlite.close();}
});

