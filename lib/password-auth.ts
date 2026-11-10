import { randomBytes, createHash, createHmac, scryptSync, timingSafeEqual } from 'node:crypto';
import { Buffer } from 'node:buffer';
import { requestOriginAllowed } from './request-origin.ts';

export type PortalUser = {id:string;username:string;role:string;approved:number;csrf:string;created_at:number};
export type AuthConfig = {db:D1Database;ownerEmail:string;ownerLoginId?:string;allowedOrigins?:string[];ownerSetupHash?:string;ownerSetupExpires?:number;ownerResetHash?:string;ownerResetExpires?:number;ownerResetIssuedAt?:number;anchorApiBaseUrl?:string;anchorUsername?:string;anchorPassword?:string;anchorSenderId?:string;otpHashSecret?:string;smsFetch?:typeof fetch};
type Credential = {username:string;user_id:string;salt:string;password_hash:string;version:number;changed_at:number};
type StaffSetupRecord = {userId:string;tokenHash:string;credentialVersion:number;issuedAt:number;expiresAt:number};
export type LocalSession = {user:PortalUser;tokenHash:string;version:number};
export type LocalRoleTransition = {changed:boolean;staffSetup?:{userId:string;code:string;username:string|null;expiresAt:number}};
export class AuthError extends Error {status:number;constructor(status:number,message:string){super(message);this.status=status;}}
const now=()=>Math.floor(Date.now()/1000);
const random=()=>randomBytes(32).toString('base64url');
const digest=(value:string)=>createHash('sha256').update(value).digest('hex');
const cookieName='__Host-master7_session';
const duration=8*60*60;
const headers={'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff','Vary':'Cookie, oai-authenticated-user-id'};
const json=(value:unknown,status=200,cookie?:string)=>new Response(JSON.stringify(value),{status,headers:{...headers,...(cookie?{'Set-Cookie':cookie}:{})}});
const cookie=(token:string,age=duration)=>`${cookieName}=${token}; Path=/; Secure; HttpOnly; SameSite=Strict; Max-Age=${age}`;
const deny=()=>new AuthError(401,'账号或密码不正确 / Incorrect ID or password');
function loginId(value:unknown){if(typeof value!=='string'||! /^[a-zA-Z0-9_]{4,32}$/.test(value))throw new AuthError(400,'ID 需为 4–32 位英文字母、数字或下划线');return value.toLowerCase();}
function password(value:unknown){if(typeof value!=='string'||[...value].length<6||[...value].length>128||new TextEncoder().encode(value).length>512)throw new AuthError(400,'密码需为 6–128 个字符 / Use 6–128 characters');return value;}
function privilegedPassword(value:unknown){const pass=password(value);if([...pass].length<12)throw new AuthError(400,'管理员和员工密码需为 12–128 个字符 / Admin and staff passwords require 12–128 characters');return pass;}
function malaysiaMobile(value:unknown){if(typeof value!=='string'||value.length>32)throw new AuthError(400,'请输入马来西亚手机号码 / Enter a Malaysian mobile number');let digits=value.replace(/[^0-9]/g,'');if(digits.startsWith('0'))digits='60'+digits.slice(1);else if(!digits.startsWith('60'))digits='60'+digits;if(!/^601\d{8,9}$/.test(digits))throw new AuthError(400,'请输入有效的马来西亚手机号码 / Enter a valid Malaysian mobile number');return '+'+digits;}
function smsConfigured(c:AuthConfig){return !!(c.anchorApiBaseUrl&&c.anchorUsername&&c.anchorPassword&&c.anchorSenderId&&c.otpHashSecret&&c.otpHashSecret.length>=32);}
function otpDigest(challengeId:string,code:string,secret:string){return createHmac('sha256',secret).update(`${challengeId}:${code}`).digest('hex');}
async function anchorSend(c:AuthConfig,phone:string,code:string){
 if(!smsConfigured(c))throw new AuthError(503,'短信服务尚未配置 / SMS service is not configured');
 let base:URL;try{base=new URL(c.anchorApiBaseUrl!);}catch{throw new AuthError(503,'短信服务地址无效 / Invalid SMS endpoint');}
 if(base.protocol!=='https:'||base.username||base.password||base.search||base.hash||(!c.smsFetch&&base.origin!=='https://api.anchor-sms.com:8443'))throw new AuthError(503,'短信服务地址无效 / Invalid SMS endpoint');
 const url=new URL('/mt/sendMtSmsNoToken',base);
 url.search=new URLSearchParams({to:phone.replace(/^\+/,''),text:`Your MASTER7 verification code is ${code}. It expires in 5 minutes.`,user:c.anchorUsername!,pass:c.anchorPassword!,from:c.anchorSenderId!,dataCoding:'0'}).toString();
 const response=await (c.smsFetch??fetch)(url,{method:'GET',headers:{Accept:'application/json'},redirect:'error',signal:AbortSignal.timeout(10000)});
 if(response.status!==201)throw new AuthError(503,'短信服务未接受验证码 / SMS provider did not accept the message');
 const raw=await response.text();if(raw.length>32768)throw new AuthError(503,'短信回执无效 / Invalid SMS receipt');
 let result:{status?:number;data?:{statusCode?:string;umgTxId?:string}[]};try{result=JSON.parse(raw);}catch{throw new AuthError(503,'短信回执无效 / Invalid SMS receipt');}
 if(result.status!==201||result.data?.length!==1||result.data[0].statusCode!=='001'||typeof result.data[0].umgTxId!=='string'||!result.data[0].umgTxId)throw new AuthError(503,'短信服务未确认提交 / SMS provider did not confirm submission');
}
// Native scrypt: OWASP's 32 MiB configuration (N=2^15, r=8, p=3).
// Fixed parameters and bounded input prevent database-controlled work factors.
function hash(value:string,salt:string){return scryptSync(value,salt,32,{N:32768,r:8,p:3,maxmem:64*1024*1024}).toString('hex');}
function equal(a:string,b:string){return a.length===b.length&&timingSafeEqual(Buffer.from(a),Buffer.from(b));}
function verify(value:unknown,c:Credential|null){const input=typeof value==='string'&&value.length<=512?value:'';const actual=hash(input,c?.salt??'master7-dummy-comparison-salt');return !!c&&equal(actual,c.password_hash);}
async function payload(req:Request){if(!req.headers.get('content-type')?.startsWith('application/json'))throw new AuthError(415,'JSON required');const reader=req.body?.getReader();if(!reader)throw new AuthError(400,'Body required');let length=0;const parts:Uint8Array[]=[];for(;;){const part=await reader.read();if(part.done)break;length+=part.value.length;if(length>4096){await reader.cancel();throw new AuthError(413,'Request too large');}parts.push(part.value);}const out=new Uint8Array(length);let offset=0;for(const p of parts){out.set(p,offset);offset+=p.length;}try{const p=JSON.parse(new TextDecoder().decode(out));if(p&&typeof p==='object'&&!Array.isArray(p))return p;}catch{}throw new AuthError(400,'Invalid JSON');}
async function rate(db:D1Database,key:string,max:number,window=600){const timestamp=now();const id=`auth:${digest(key)}:${Math.floor(timestamp/window)}`;const r=await db.prepare('INSERT INTO rate_limits(id,count,expires_at) VALUES(?,1,?) ON CONFLICT(id) DO UPDATE SET count=rate_limits.count+1 RETURNING count').bind(id,timestamp+window*2).first<{count:number}>();if((r?.count??max+1)>max)throw new AuthError(429,'尝试过多，请 10 分钟后再试 / Try again in 10 minutes');await db.prepare('DELETE FROM rate_limits WHERE expires_at < ?').bind(timestamp).run();}
function audit(db:D1Database,id:string,event:string,target='account'){return db.prepare('INSERT INTO audit(id,user_id,event,target,created_at) VALUES(?,?,?,?,?)').bind(crypto.randomUUID(),id,event,target,now());}
async function credential(db:D1Database,id:string){return db.prepare('SELECT * FROM password_credentials WHERE username=?').bind(id).first<Credential>();}
const staffSetupKey=(userId:string)=>`staff_password_setup:${userId}`;
const staffReadyKey=(userId:string)=>`staff_password_ready:${userId}`;
const changedRows=(result:unknown)=>Number((result as any)?.meta?.changes??(result as any)?.changes??0);
export async function staffPasswordSetupPending(db:D1Database,userId:string){return !!await db.prepare('SELECT id FROM settings WHERE id=?').bind(staffSetupKey(userId)).first();}
async function staffPasswordReady(db:D1Database,userId:string,credentialVersion:number){const row=await db.prepare('SELECT value FROM settings WHERE id=?').bind(staffReadyKey(userId)).first<{value:string}>();return row?.value===String(credentialVersion);}
export async function changeLocalUserRole(db:D1Database,actorId:string,userId:string,newRole:'member'|'staff'):Promise<LocalRoleTransition>{
 const target=await db.prepare('SELECT role FROM users WHERE id=?').bind(userId).first<{role:string}>();
 if(!target)throw new AuthError(404,'User not found');
 if(target.role==='owner')throw new AuthError(403,'Administrator account protected');
 if(!['member','staff'].includes(target.role))throw new AuthError(409,'Account role cannot be changed');
 // Repeating the staff action deliberately rotates the unusable verifier and
 // issues a fresh one-time setup link. This is the recovery path when the
 // original response was lost or its one-hour link expired.
 if(target.role===newRole&&newRole==='member')return {changed:false};
 const found=await db.prepare('SELECT * FROM password_credentials WHERE user_id=?').bind(userId).first<Credential>(),timestamp=now(),setupKey=staffSetupKey(userId),auditId=crypto.randomUUID();
 if(newRole==='staff'){
  const code=random(),setupSalt=random(),unusableHash=hash(random(),setupSalt),expiresAt=timestamp+3600,placeholder=`staff_setup_${randomBytes(8).toString('hex')}`,event=target.role==='staff'?'staff_password_setup_reissued':'role_staff';
  const nextVersion=(found?.version??0)+1,setup:StaffSetupRecord={userId,tokenHash:digest(code),credentialVersion:nextVersion,issuedAt:timestamp,expiresAt},setupValue=JSON.stringify(setup);
  const credentialWrite=found
   ?db.prepare("UPDATE password_credentials SET salt=?,password_hash=?,version=version+1,changed_at=? WHERE user_id=? AND version=? AND EXISTS (SELECT 1 FROM users WHERE id=? AND role=? AND role<>'owner')").bind(setupSalt,unusableHash,timestamp,userId,found.version,userId,target.role)
   :db.prepare("INSERT INTO password_credentials(username,user_id,salt,password_hash,version,changed_at) SELECT ?,?,?,?,?,? WHERE EXISTS (SELECT 1 FROM users WHERE id=? AND role=? AND role<>'owner') AND NOT EXISTS (SELECT 1 FROM password_credentials WHERE user_id=?)").bind(placeholder,userId,setupSalt,unusableHash,nextVersion,timestamp,userId,target.role,userId);
  let results:unknown[];
  try{results=await db.batch([
   credentialWrite,
   db.prepare('INSERT INTO settings(id,value) SELECT ?,? WHERE EXISTS (SELECT 1 FROM password_credentials WHERE user_id=? AND version=? AND salt=? AND password_hash=?) ON CONFLICT(id) DO UPDATE SET value=excluded.value').bind(setupKey,setupValue,userId,nextVersion,setupSalt,unusableHash),
   db.prepare("UPDATE users SET role='staff',approved=1 WHERE id=? AND role=? AND role<>'owner' AND EXISTS (SELECT 1 FROM password_credentials WHERE user_id=? AND version=? AND salt=? AND password_hash=?) AND EXISTS (SELECT 1 FROM settings WHERE id=? AND value=?)").bind(userId,target.role,userId,nextVersion,setupSalt,unusableHash,setupKey,setupValue),
   db.prepare("DELETE FROM settings WHERE id=? AND EXISTS (SELECT 1 FROM users WHERE id=? AND role='staff') AND EXISTS (SELECT 1 FROM settings pending WHERE pending.id=? AND pending.value=?)").bind(staffReadyKey(userId),userId,setupKey,setupValue),
   db.prepare("DELETE FROM password_sessions WHERE user_id=? AND EXISTS (SELECT 1 FROM users WHERE id=? AND role='staff') AND EXISTS (SELECT 1 FROM settings WHERE id=? AND value=?)").bind(userId,userId,setupKey,setupValue),
   db.prepare("INSERT INTO audit(id,user_id,event,target,created_at) SELECT ?,?,?,?,? WHERE EXISTS (SELECT 1 FROM users WHERE id=? AND role='staff') AND EXISTS (SELECT 1 FROM settings WHERE id=? AND value=?) AND NOT EXISTS (SELECT 1 FROM settings WHERE id=?)").bind(auditId,actorId,event,userId,timestamp,userId,setupKey,setupValue,staffReadyKey(userId))
  ]);}catch{throw new AuthError(503,'Role was not changed; try again later');}
  if(changedRows(results[2])!==1)throw new AuthError(409,'Account role changed; reload and try again');
  return {changed:true,staffSetup:{userId,code,username:found?.username&&!found.username.startsWith('staff_setup_')?found.username:null,expiresAt}};
 }
 const statements=found?[
  db.prepare("UPDATE password_credentials SET version=version+1,changed_at=? WHERE user_id=? AND version=? AND EXISTS (SELECT 1 FROM users WHERE id=? AND role=? AND role<>'owner')").bind(timestamp,userId,found.version,userId,target.role),
  db.prepare("UPDATE users SET role='member',approved=1 WHERE id=? AND role=? AND role<>'owner' AND EXISTS (SELECT 1 FROM password_credentials WHERE user_id=? AND version=?)").bind(userId,target.role,userId,found.version+1),
  db.prepare("DELETE FROM password_sessions WHERE user_id=? AND EXISTS (SELECT 1 FROM users WHERE id=? AND role='member') AND EXISTS (SELECT 1 FROM password_credentials WHERE user_id=? AND version=?)").bind(userId,userId,userId,found.version+1),
  db.prepare("DELETE FROM settings WHERE id=? AND EXISTS (SELECT 1 FROM users WHERE id=? AND role='member') AND EXISTS (SELECT 1 FROM password_credentials WHERE user_id=? AND version=?)").bind(setupKey,userId,userId,found.version+1),
  db.prepare("DELETE FROM settings WHERE id=? AND EXISTS (SELECT 1 FROM users WHERE id=? AND role='member') AND EXISTS (SELECT 1 FROM password_credentials WHERE user_id=? AND version=?)").bind(staffReadyKey(userId),userId,userId,found.version+1),
  db.prepare("INSERT INTO audit(id,user_id,event,target,created_at) SELECT ?,?,'role_member',?,? WHERE EXISTS (SELECT 1 FROM users WHERE id=? AND role='member') AND EXISTS (SELECT 1 FROM password_credentials WHERE user_id=? AND version=?)").bind(auditId,actorId,userId,timestamp,userId,userId,found.version+1)
 ]:[
  db.prepare("UPDATE users SET role='member',approved=1 WHERE id=? AND role=? AND role<>'owner'").bind(userId,target.role),
  db.prepare("DELETE FROM password_sessions WHERE user_id=? AND EXISTS (SELECT 1 FROM users WHERE id=? AND role='member')").bind(userId,userId),
  db.prepare("DELETE FROM settings WHERE id=? AND EXISTS (SELECT 1 FROM users WHERE id=? AND role='member')").bind(setupKey,userId),
  db.prepare("DELETE FROM settings WHERE id=? AND EXISTS (SELECT 1 FROM users WHERE id=? AND role='member')").bind(staffReadyKey(userId),userId),
  db.prepare("INSERT INTO audit(id,user_id,event,target,created_at) SELECT ?,?,'role_member',?,? WHERE EXISTS (SELECT 1 FROM users WHERE id=? AND role='member')").bind(auditId,actorId,userId,timestamp,userId)
 ];
 let results:unknown[];try{results=await db.batch(statements);}catch{throw new AuthError(503,'Role was not changed; try again later');}
 const roleIndex=found?1:0;if(changedRows(results[roleIndex])!==1)throw new AuthError(409,'Account role changed; reload and try again');
 return {changed:true};
}
function origin(req:Request,allowedOrigins?:string[]){if(!requestOriginAllowed(req,allowedOrigins))throw new AuthError(403,'Origin denied');}
function csrf(req:Request,local:LocalSession|null){if(!local)throw new AuthError(401,'请先使用 MASTER7 ID 登录 / Sign in with your MASTER7 ID');if(req.headers.get('x-csrf-token')!==local.user.csrf)throw new AuthError(403,'CSRF denied');return local;}
export async function readLocalSession(req:Request,db:D1Database):Promise<LocalSession|null>{
 const token=(req.headers.get('cookie')??'').split(';').map(x=>x.trim()).find(x=>x.startsWith(cookieName+'='))?.slice(cookieName.length+1);
 if(!token||! /^[A-Za-z0-9_-]{43}$/.test(token))return null;
 const tokenHash=digest(token);
 const row=await db.prepare("SELECT u.*,c.username login_id,s.csrf session_csrf,s.credential_version FROM password_sessions s JOIN users u ON u.id=s.user_id JOIN password_credentials c ON c.user_id=s.user_id WHERE s.token_hash=? AND s.expires_at>? AND s.credential_version=c.version AND u.approved=1 AND NOT EXISTS (SELECT 1 FROM settings pending WHERE pending.id='staff_password_setup:'||u.id) AND (u.role<>'staff' OR EXISTS (SELECT 1 FROM settings ready WHERE ready.id='staff_password_ready:'||u.id AND ready.value=CAST(c.version AS TEXT)))").bind(tokenHash,now()).first<PortalUser&{login_id:string;session_csrf:string;credential_version:number}>();
 return row?{user:{id:row.id,username:row.login_id,role:row.role,approved:row.approved,csrf:row.session_csrf,created_at:row.created_at},tokenHash,version:row.credential_version}:null;
}
async function session(db:D1Database,c:Credential){
 const token=random(),csrf=random(),timestamp=now();
 await db.batch([
  db.prepare('DELETE FROM password_sessions WHERE expires_at<=? OR (user_id=? AND token_hash NOT IN (SELECT token_hash FROM password_sessions WHERE user_id=? ORDER BY created_at DESC LIMIT 4))').bind(timestamp,c.user_id,c.user_id),
  db.prepare('INSERT INTO password_sessions(token_hash,user_id,csrf,credential_version,expires_at,created_at) VALUES(?,?,?,?,?,?)').bind(digest(token),c.user_id,csrf,c.version,timestamp+duration,timestamp)
 ]);
 return cookie(token);
}
export async function handlePasswordAuth(req:Request,c:AuthConfig,local:LocalSession|null):Promise<Response>{
 const path=new URL(req.url).pathname,db=c.db;
 if(req.method==='GET'&&path==='/api/auth/options'){
  const consumed=await db.prepare("SELECT id FROM settings WHERE id='owner_password_setup'").first();
  const resetUsed=c.ownerResetHash?await db.prepare('SELECT id FROM settings WHERE id=?').bind('owner_password_reset:'+c.ownerResetHash).first():null;
  return json({passwordLogin:true,smsOtpReady:smsConfigured(c),ownerSetupComplete:!!consumed,ownerSetupAvailable:!!c.ownerSetupHash&&!!c.ownerSetupExpires&&c.ownerSetupExpires>now()&&!consumed,ownerResetAvailable:!!consumed&&!!c.ownerResetHash&&!!c.ownerResetIssuedAt&&!!c.ownerResetExpires&&c.ownerResetExpires>now()&&!resetUsed});
 }
 if(req.method!=='POST')throw new AuthError(405,'Method not allowed');
 origin(req,c.allowedOrigins);
 if(path==='/api/auth/logout'){
  const s=csrf(req,local);await db.prepare('DELETE FROM password_sessions WHERE token_hash=?').bind(s.tokenHash).run();return json({status:'ok'},200,cookie('',0));
 }
 const d=await payload(req);
 const ip=req.headers.get('cf-connecting-ip');
 await rate(db,'ip:'+(ip??'unavailable'),ip?30:120);
 if(path==='/api/auth/setup-staff'){
  const userId=typeof d.userId==='string'&&d.userId.length>0&&d.userId.length<=128?d.userId:'',code=typeof d.code==='string'&&/^[A-Za-z0-9_-]{43}$/.test(d.code)?d.code:'';
  await rate(db,'staff-setup:'+(code||'invalid'),5);
  if(!userId||!code)throw new AuthError(403,'员工设定链接无效或已过期 / Invalid or expired staff setup link');
  const setupKey=staffSetupKey(userId),row=await db.prepare('SELECT value FROM settings WHERE id=?').bind(setupKey).first<{value:string}>();
  let setup:StaffSetupRecord|null=null;try{const value=row?JSON.parse(row.value):null;if(value&&value.userId===userId&&typeof value.tokenHash==='string'&&/^[a-f0-9]{64}$/.test(value.tokenHash)&&Number.isSafeInteger(value.credentialVersion)&&value.credentialVersion>0&&Number.isSafeInteger(value.issuedAt)&&Number.isSafeInteger(value.expiresAt)&&value.issuedAt<=now()&&value.expiresAt>value.issuedAt&&value.expiresAt-value.issuedAt===3600)setup=value;}catch{}
  if(!setup||setup.expiresAt<=now()||!equal(digest(code),setup.tokenHash))throw new AuthError(403,'员工设定链接无效或已过期 / Invalid or expired staff setup link');
  const found=await db.prepare('SELECT * FROM password_credentials WHERE user_id=?').bind(userId).first<Credential>();
  if(!found||found.version!==setup.credentialVersion)throw new AuthError(409,'此员工设定链接已经使用或失效 / Staff setup link already used or superseded');
  const pass=privilegedPassword(d.password),username=d.username===undefined?found.username:loginId(d.username);
  if(username.startsWith('staff_setup_'))throw new AuthError(400,'请设置员工登录 ID / Choose a staff login ID');
  if(username===(c.ownerLoginId??'master7_owner').toLowerCase())throw new AuthError(409,'此 ID 不可用 / ID unavailable');
  const existing=await credential(db,username);if(existing&&existing.user_id!==userId)throw new AuthError(409,'此 ID 不可用 / ID unavailable');
  const salt=random(),passwordHash=hash(pass,salt),timestamp=now(),setupValue=row!.value,auditId=crypto.randomUUID(),readyKey=staffReadyKey(userId),readyValue=String(setup.credentialVersion+1);
  let results:unknown[];
  try{results=await db.batch([
   db.prepare("UPDATE password_credentials SET username=?,salt=?,password_hash=?,version=version+1,changed_at=? WHERE user_id=? AND version=? AND EXISTS (SELECT 1 FROM users WHERE id=? AND role='staff') AND EXISTS (SELECT 1 FROM settings WHERE id=? AND value=?)").bind(username,salt,passwordHash,timestamp,userId,setup.credentialVersion,userId,setupKey,setupValue),
   db.prepare("UPDATE users SET username=? WHERE id=? AND role='staff' AND EXISTS (SELECT 1 FROM password_credentials WHERE user_id=? AND version=? AND salt=? AND password_hash=?)").bind(username,userId,userId,setup.credentialVersion+1,salt,passwordHash),
   db.prepare("DELETE FROM password_sessions WHERE user_id=? AND EXISTS (SELECT 1 FROM password_credentials WHERE user_id=? AND version=? AND salt=? AND password_hash=?)").bind(userId,userId,setup.credentialVersion+1,salt,passwordHash),
   db.prepare('INSERT INTO settings(id,value) SELECT ?,? WHERE EXISTS (SELECT 1 FROM password_credentials WHERE user_id=? AND version=? AND salt=? AND password_hash=?) AND EXISTS (SELECT 1 FROM settings WHERE id=? AND value=?) ON CONFLICT(id) DO UPDATE SET value=excluded.value').bind(readyKey,readyValue,userId,setup.credentialVersion+1,salt,passwordHash,setupKey,setupValue),
   db.prepare('DELETE FROM settings WHERE id=? AND value=? AND EXISTS (SELECT 1 FROM settings WHERE id=? AND value=?)').bind(setupKey,setupValue,readyKey,readyValue),
   db.prepare("INSERT INTO audit(id,user_id,event,target,created_at) SELECT ?,?,'staff_password_activated','account',? WHERE EXISTS (SELECT 1 FROM password_credentials WHERE user_id=? AND version=? AND salt=? AND password_hash=?) AND EXISTS (SELECT 1 FROM settings WHERE id=? AND value=?) AND NOT EXISTS (SELECT 1 FROM settings WHERE id=?)").bind(auditId,userId,timestamp,userId,setup.credentialVersion+1,salt,passwordHash,readyKey,readyValue,setupKey)
  ]);}catch{throw new AuthError(503,'员工账号未设定，请稍后再试 / Staff account was not set up; try again later');}
  if(changedRows(results[0])!==1)throw new AuthError(409,'此员工设定链接已经使用或失效 / Staff setup link already used or superseded');
  return json({status:'ok',username,signInAgain:true},200,cookie('',0));
 }
 if(path==='/api/auth/reset-owner'){
  await rate(db,'owner-reset:'+(ip??'unavailable'),5);
  if(!c.ownerResetHash||!c.ownerResetIssuedAt||!c.ownerResetExpires||c.ownerResetExpires<=now()||typeof d.code!=='string'||! /^[A-Za-z0-9_-]{43}$/.test(d.code)||!equal(digest(d.code),c.ownerResetHash))throw new AuthError(403,'重设码无效或已过期 / Invalid or expired reset code');
  const resetKey='owner_password_reset:'+c.ownerResetHash;
  if(await db.prepare('SELECT id FROM settings WHERE id=?').bind(resetKey).first())throw new AuthError(409,'重设码已使用，请使用新密码登录 / Reset code already used; sign in');
  const marker=await db.prepare("SELECT value FROM settings WHERE id='owner_password_setup'").first<{value:string}>();
  let ownerId:unknown;try{ownerId=marker?JSON.parse(marker.value).userId:null;}catch{}
  if(typeof ownerId!=='string'||!ownerId||ownerId.length>128)throw new AuthError(409,'管理员账号尚未激活 / Administrator account not activated');
  // Only the originally activated owner can be recovered. No request-supplied target is accepted.
  const found=await db.prepare("SELECT c.* FROM password_credentials c JOIN users u ON u.id=c.user_id WHERE c.user_id=? AND u.role='owner'").bind(ownerId).first<Credential>();
  if(!found)throw new AuthError(409,'管理员账号不可重设，请联系站点维护人员 / Administrator account unavailable');
  if(found.changed_at>=c.ownerResetIssuedAt)throw new AuthError(409,'密码已更新，请申请新的重设码 / Password changed; request a new reset code');
  const pass=privilegedPassword(d.password),salt=random(),passwordHash=hash(pass,salt),timestamp=now();
  // Marker, credential update and session revocation commit atomically; replay loses the whole transaction.
  try{await db.batch([
   db.prepare('INSERT INTO settings(id,value) VALUES(?,(SELECT ? FROM password_credentials WHERE user_id=? AND version=?))').bind(resetKey,JSON.stringify({userId:ownerId,usedAt:timestamp}),ownerId,found.version),
   db.prepare('UPDATE password_credentials SET salt=?,password_hash=?,version=version+1,changed_at=? WHERE user_id=?').bind(salt,passwordHash,timestamp,ownerId),
   db.prepare('DELETE FROM password_sessions WHERE user_id=?').bind(ownerId),
   db.prepare('DELETE FROM rate_limits WHERE substr(id,1,70)=?').bind('auth:'+digest('login:'+found.username)+':'),
   audit(db,ownerId,'owner_password_reset')
  ]);}catch{if(await db.prepare('SELECT id FROM settings WHERE id=?').bind(resetKey).first())throw new AuthError(409,'重设码已使用，请使用新密码登录 / Reset code already used; sign in');throw new AuthError(503,'密码未重设，请稍后再试 / Password was not reset; try again later');}
  return json({status:'ok',username:found.username,signInAgain:true},200,cookie('',0));
 }
 if(path==='/api/auth/login'){
  let id:string;try{id=loginId(d.username);}catch{throw deny();}
  await rate(db,'login:'+id,10);
  const found=await credential(db,id);
  if(!verify(d.password,found)||!found)throw deny();
  const loginUser=await db.prepare('SELECT id,role FROM users WHERE id=? AND approved=1').bind(found.user_id).first<{id:string;role:string}>();
  if(!loginUser)throw deny();
  if(loginUser.role==='member')throw new AuthError(403,'会员登录需要短信 OTP / Member sign-in requires SMS OTP');
  if(loginUser.role==='staff'&&!await staffPasswordReady(db,loginUser.id,found.version))throw deny();
  return json({status:'ok'},200,await session(db,found));
 }
 if(path==='/api/auth/activate'){
  if(!c.ownerSetupHash||!c.ownerSetupExpires||c.ownerSetupExpires<=now()||typeof d.code!=='string'||d.code.length!==43||!equal(digest(d.code),c.ownerSetupHash))throw new AuthError(403,'激活码无效或已过期 / Invalid or expired activation code');
  if(await db.prepare("SELECT id FROM settings WHERE id='owner_password_setup'").first())throw new AuthError(409,'此激活码已经使用，请直接登录 / Already activated; sign in');
  const username=loginId(c.ownerLoginId??'master7_owner'),pass=privilegedPassword(d.password);
  if(await credential(db,username))throw new AuthError(409,'账号已存在 / Account already exists');
  const existing=await db.prepare("SELECT id FROM users WHERE role='owner' AND lower(username)=lower(?) LIMIT 1").bind(c.ownerEmail).first<{id:string}>();
  const id=existing?.id??'local:'+crypto.randomUUID(),salt=random(),passwordHash=hash(pass,salt),timestamp=now();
  // The unique marker and all writes commit atomically. Two activation requests cannot both win.
  const statements=[db.prepare("INSERT INTO settings(id,value) VALUES('owner_password_setup',?)").bind(JSON.stringify({userId:id,activatedAt:timestamp}))];
  if(!existing)statements.push(db.prepare('INSERT INTO users(id,username,role,approved,csrf,created_at) VALUES(?,?,?,?,?,?)').bind(id,username,'owner',1,random(),timestamp));
  statements.push(
   db.prepare('INSERT INTO password_credentials(username,user_id,salt,password_hash,version,changed_at) VALUES(?,?,?,?,1,?)').bind(username,id,salt,passwordHash,timestamp),
   audit(db,id,'owner_password_activated')
  );
  try{await db.batch(statements);}catch{throw new AuthError(409,'激活已完成或账号已存在，请直接登录 / Activation already completed');}
  return json({status:'ok',username},201);
 }
 if(path==='/api/auth/otp/send'){
  if(!smsConfigured(c))throw new AuthError(503,'短信服务尚未配置 / SMS service is not configured');
  const purpose=d.purpose==='login'?'login':'register';
  await rate(db,`otp-${purpose}-ip:`+(ip??'unavailable'),purpose==='login'?30:3,600);
  let phone:string,otpUserId='system';
  if(purpose==='login'){
   let username:string;try{username=loginId(d.username);}catch{throw deny();}
   await rate(db,'otp-login:'+username,5,600);
   const found=await credential(db,username);
   if(!verify(d.password,found)||!found)throw deny();
   const member=await db.prepare("SELECT id,phone FROM users WHERE id=? AND role='member' AND approved=1").bind(found.user_id).first<{id:string;phone:string|null}>();
   if(!member?.phone)throw deny();
   phone=malaysiaMobile(member.phone);otpUserId=member.id;
  }else phone=malaysiaMobile(d.phone);
  await rate(db,'otp-phone:'+phone,1,60);
  const phoneAccount=await db.prepare('SELECT id,username,role FROM users WHERE phone=?').bind(phone).first<{id:string;username:string;role:string}>();
  if(purpose==='register'){
   const username=loginId(d.username);password(d.password);
   if(username===(c.ownerLoginId??'master7_owner').toLowerCase()||await credential(db,username)||phoneAccount)throw new AuthError(409,'此 ID 或手机号不可用 / ID or phone unavailable');
  }
  const code=String(randomBytes(4).readUInt32BE(0)%1000000).padStart(6,'0'),id=randomBytes(24).toString('base64url'),timestamp=now();
  await anchorSend(c,phone,code);
  try{await db.batch([db.prepare('INSERT INTO otp_challenges(id,phone,code_hash,attempts,expires_at,created_at,consumed_at) VALUES(?,?,?,0,?,?,NULL)').bind(id,phone,otpDigest(id,code,c.otpHashSecret!),timestamp+300,timestamp),db.prepare('INSERT INTO audit(id,user_id,event,target,created_at) VALUES(?,?,?,?,?)').bind(crypto.randomUUID(),otpUserId,purpose==='login'?'member_login_otp_accepted':'member_registration_otp_accepted',digest(phone),timestamp)]);}
  catch{throw new AuthError(503,'验证码已提交但暂时无法登记，请稍后重试 / SMS was submitted but could not be recorded; try again');}
  return json({status:'accepted',challengeId:id,expiresInSeconds:300,destination:`••••${phone.slice(-4)}`});
 }
 if(path==='/api/auth/otp/login'){
  let username:string;try{username=loginId(d.username);}catch{throw deny();}
  await rate(db,'login:'+username,10);
  const found=await credential(db,username);
  if(!verify(d.password,found)||!found)throw deny();
  const member=await db.prepare("SELECT id,phone FROM users WHERE id=? AND role='member' AND approved=1").bind(found.user_id).first<{id:string;phone:string|null}>();
  if(!member?.phone)throw deny();
  const phone=malaysiaMobile(member.phone),challengeId=typeof d.challengeId==='string'&&/^[A-Za-z0-9_-]{32}$/.test(d.challengeId)?d.challengeId:'',code=typeof d.otp==='string'&&/^\d{6}$/.test(d.otp)?d.otp:'';
  const challenge=challengeId?await db.prepare('SELECT id,phone,code_hash,attempts,expires_at,consumed_at FROM otp_challenges WHERE id=?').bind(challengeId).first<{id:string;phone:string;code_hash:string;attempts:number;expires_at:number;consumed_at:number|null}>():null;
  if(!challenge||challenge.phone!==phone||challenge.consumed_at!==null||challenge.expires_at<=now()||challenge.attempts>=5)throw new AuthError(400,'验证码无效或已过期 / Invalid or expired OTP');
  if(!code||!equal(otpDigest(challenge.id,code,c.otpHashSecret??'unconfigured'),challenge.code_hash)){
   await db.prepare('UPDATE otp_challenges SET attempts=attempts+1 WHERE id=? AND consumed_at IS NULL AND attempts<5').bind(challenge.id).run();
   throw new AuthError(400,'验证码不正确 / Incorrect OTP');
  }
  const timestamp=now(),consumeMarker=timestamp*1000000+randomBytes(3).readUIntBE(0,3),token=random(),tokenHash=digest(token),sessionCsrf=random();
  try{await db.batch([
   db.prepare('UPDATE otp_challenges SET consumed_at=? WHERE id=? AND code_hash=? AND phone=? AND consumed_at IS NULL AND expires_at>? AND attempts<5').bind(consumeMarker,challenge.id,challenge.code_hash,phone,timestamp),
   db.prepare('INSERT INTO password_sessions(token_hash,user_id,csrf,credential_version,expires_at,created_at) SELECT ?,?,?,?,?,? WHERE EXISTS (SELECT 1 FROM otp_challenges WHERE id=? AND consumed_at=?)').bind(tokenHash,found.user_id,sessionCsrf,found.version,timestamp+duration,timestamp,challenge.id,consumeMarker),
   db.prepare('INSERT INTO audit(id,user_id,event,target,created_at) SELECT ?,?,?,?,? WHERE EXISTS (SELECT 1 FROM otp_challenges WHERE id=? AND consumed_at=?)').bind(crypto.randomUUID(),found.user_id,'member_login_otp_verified','account',timestamp,challenge.id,consumeMarker)
  ]);}catch{throw new AuthError(503,'登录暂时无法完成 / Sign-in could not be completed');}
  if(!(await db.prepare('SELECT token_hash FROM password_sessions WHERE token_hash=?').bind(tokenHash).first()))throw new AuthError(400,'验证码已使用或已过期 / OTP already used or expired');
  await db.prepare('DELETE FROM password_sessions WHERE expires_at<=? OR (user_id=? AND token_hash NOT IN (SELECT token_hash FROM password_sessions WHERE user_id=? ORDER BY created_at DESC LIMIT 4))').bind(timestamp,found.user_id,found.user_id).run();
  return json({status:'ok'},200,cookie(token));
 }
 if(path==='/api/auth/register'){
  await rate(db,'register:'+(ip??'unavailable'),ip?5:30);
  const username=loginId(d.username),pass=password(d.password),phone=malaysiaMobile(d.phone);
  if(username===(c.ownerLoginId??'master7_owner').toLowerCase()||await credential(db,username)||await db.prepare('SELECT id FROM users WHERE phone=?').bind(phone).first())throw new AuthError(409,'此 ID 或手机号不可用 / ID or phone unavailable');
  const challengeId=typeof d.challengeId==='string'&&/^[A-Za-z0-9_-]{32}$/.test(d.challengeId)?d.challengeId:'',code=typeof d.otp==='string'&&/^\d{6}$/.test(d.otp)?d.otp:'';
  const challenge=challengeId?await db.prepare('SELECT id,phone,code_hash,attempts,expires_at,consumed_at FROM otp_challenges WHERE id=?').bind(challengeId).first<{id:string;phone:string;code_hash:string;attempts:number;expires_at:number;consumed_at:number|null}>():null;
  if(!challenge||challenge.phone!==phone||challenge.consumed_at!==null||challenge.expires_at<=now()||challenge.attempts>=5)throw new AuthError(400,'验证码无效或已过期 / Invalid or expired OTP');
  if(!code||!equal(otpDigest(challenge.id,code,c.otpHashSecret??'unconfigured'),challenge.code_hash)){
   await db.prepare('UPDATE otp_challenges SET attempts=attempts+1 WHERE id=? AND consumed_at IS NULL AND attempts<5').bind(challenge.id).run();
   throw new AuthError(400,'验证码不正确 / Incorrect OTP');
  }
  const suppliedReferral=typeof d.referralCode==='string'?d.referralCode.trim().toUpperCase():'';
  if(suppliedReferral&&!/^[A-Z0-9]{8,12}$/.test(suppliedReferral))throw new AuthError(400,'介绍码无效 / Invalid referral code');
  const referralCode=suppliedReferral,referrer=referralCode?await db.prepare('SELECT user_id FROM referral_codes WHERE code=?').bind(referralCode).first<{user_id:string}>():null;
  if(referralCode&&!referrer)throw new AuthError(400,'介绍码不存在 / Referral code not found');
  const id='local:'+crypto.randomUUID(),ownReferralCode=randomBytes(6).toString('hex').toUpperCase(),salt=random(),passwordHash=hash(pass,salt),timestamp=now();
  try{await db.batch([
   db.prepare('UPDATE otp_challenges SET consumed_at=? WHERE id=? AND code_hash=? AND phone=? AND consumed_at IS NULL AND expires_at>? AND attempts<5').bind(timestamp,challenge.id,challenge.code_hash,phone,timestamp),
   db.prepare('INSERT INTO users(id,username,phone,role,approved,csrf,created_at) SELECT ?,?,?,?,1,?,? WHERE EXISTS (SELECT 1 FROM otp_challenges WHERE id=? AND consumed_at=?)').bind(id,username,phone,'member',random(),timestamp,challenge.id,timestamp),
   db.prepare('INSERT INTO password_credentials(username,user_id,salt,password_hash,version,changed_at) VALUES(?,?,?,?,1,?)').bind(username,id,salt,passwordHash,timestamp),
   db.prepare('INSERT INTO referral_codes(code,user_id,created_at) VALUES(?,?,?)').bind(ownReferralCode,id,timestamp),
   ...(referrer?[db.prepare('INSERT INTO referral_relationships(member_id,referrer_id,code,created_at) VALUES(?,?,?,?)').bind(id,referrer.user_id,referralCode,timestamp)]:[]),
   audit(db,id,referrer?'member_registered_by_referral':'member_registered',referralCode||'account')
  ]);}catch{throw new AuthError(409,'此 ID 不可用 / ID unavailable');}
  return json({status:'ok',approvalRequired:false,referred:!!referrer},201);
 }
 if(path==='/api/auth/change-password'){
  const s=csrf(req,local);await rate(db,'change:'+s.user.id,5);
  const found=await db.prepare('SELECT * FROM password_credentials WHERE user_id=?').bind(s.user.id).first<Credential>();
  if(!verify(d.currentPassword,found))throw deny();
  const pass=['owner','staff'].includes(s.user.role)?privilegedPassword(d.newPassword):password(d.newPassword);if(d.currentPassword===pass)throw new AuthError(400,'新密码不能与原密码相同 / Choose a different password');
  const username=d.newUsername===undefined?found!.username:loginId(d.newUsername);if(s.user.role==='staff'&&username.startsWith('staff_setup_'))throw new AuthError(400,'请设置员工登录 ID / Choose a staff login ID');
  if(username!==found!.username&&(username===(c.ownerLoginId??'master7_owner').toLowerCase()||await credential(db,username)))throw new AuthError(409,'此 ID 不可用 / ID unavailable');
  const salt=random(),passwordHash=hash(pass,salt),timestamp=now(),nextVersion=s.version+1,isStaff=s.user.role==='staff',readyKey=staffReadyKey(s.user.id);
  // Credential, staff readiness, session revocation and audit commit together.
  const credentialWrite=isStaff
   ?db.prepare('UPDATE password_credentials SET username=?,salt=?,password_hash=?,version=version+1,changed_at=? WHERE user_id=? AND version=? AND EXISTS (SELECT 1 FROM settings WHERE id=? AND value=?)').bind(username,salt,passwordHash,timestamp,s.user.id,s.version,readyKey,String(s.version))
   :db.prepare('UPDATE password_credentials SET username=?,salt=?,password_hash=?,version=version+1,changed_at=? WHERE user_id=? AND version=?').bind(username,salt,passwordHash,timestamp,s.user.id,s.version);
  const statements=[
   credentialWrite,
   db.prepare('UPDATE users SET username=? WHERE id=? AND EXISTS (SELECT 1 FROM password_credentials WHERE user_id=? AND version=? AND salt=? AND password_hash=?)').bind(username,s.user.id,s.user.id,nextVersion,salt,passwordHash),
   db.prepare('DELETE FROM password_sessions WHERE user_id=? AND EXISTS (SELECT 1 FROM password_credentials WHERE user_id=? AND version=? AND salt=? AND password_hash=?)').bind(s.user.id,s.user.id,nextVersion,salt,passwordHash)
  ];
  if(isStaff)statements.push(db.prepare('UPDATE settings SET value=? WHERE id=? AND value=? AND EXISTS (SELECT 1 FROM password_credentials WHERE user_id=? AND version=? AND salt=? AND password_hash=?)').bind(String(nextVersion),readyKey,String(s.version),s.user.id,nextVersion,salt,passwordHash));
  statements.push(db.prepare("INSERT INTO audit(id,user_id,event,target,created_at) SELECT ?,?,'password_changed','account',? WHERE EXISTS (SELECT 1 FROM password_credentials WHERE user_id=? AND version=? AND salt=? AND password_hash=?)"+(isStaff?' AND EXISTS (SELECT 1 FROM settings WHERE id=? AND value=?)':'')).bind(crypto.randomUUID(),s.user.id,timestamp,s.user.id,nextVersion,salt,passwordHash,...(isStaff?[readyKey,String(nextVersion)]:[])));
  let results:unknown[];try{results=await db.batch(statements);}catch{throw new AuthError(409,'此 ID 不可用或账号已更新 / ID unavailable or account changed');}
  if(changedRows(results[0])!==1||isStaff&&changedRows(results[3])!==1)throw new AuthError(409,'账号已更新，请重新登录 / Sign in again');
  return json({status:'ok',signInAgain:true,username},200,cookie('',0));
 }
 throw new AuthError(404,'Not found');
}
