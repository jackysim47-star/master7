import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const html=readFileSync(new URL('../app/portal.html',import.meta.url),'utf8');
const css=readFileSync(new URL('../public/assets/style.css',import.meta.url),'utf8');
const rewardsCss=readFileSync(new URL('../public/assets/rewards.css',import.meta.url),'utf8');
const suiteCss=readFileSync(new URL('../public/assets/suite-theme.css',import.meta.url),'utf8');
const app=readFileSync(new URL('../public/assets/app.js',import.meta.url),'utf8');
const route=readFileSync(new URL('../app/route.ts',import.meta.url),'utf8');
const auth=html.slice(html.indexOf('<dialog id="authDialog"'),html.indexOf('<dialog id="marketingUnsubscribeDialog"'));

test('signed-out member entry is a complete MASTER7 branded destination',()=>{
 assert.match(route,/authEntry=\['\/signin','\/register'\]/);
 assert.match(route,/bodyClasses=\[admin\?'admin-mode':'',authEntry\|\|staffSetupEntry\|\|admin&&!local\?'auth-entry':''\]/);
 assert.match(auth,/alt="MASTER7 company logo"/);
 assert.match(auth,/<strong>MASTER7<\/strong>/);
 assert.match(auth,/data-auth-lang="en"[\s\S]*data-auth-lang="zh"[\s\S]*data-auth-lang="ms"/);
 assert.doesNotMatch(auth,/MASTER7-Android-v17\.0\.52\.apk|ANDROID APK/);
 assert.match(auth,/auth-quick-actions auth-quick-actions-single/);
 assert.match(auth,/data-i18n="aboutMaster7"/);
 assert.doesNotMatch(auth,/captcha/i);
});

test('signed-out management entry is isolated from member and Rewards content',()=>{
 assert.match(route,/MASTER7 · Management Console/);
 assert.match(route,/replace\('id="lobby" class="section active"','id="lobby" class="section"'\)/);
 assert.match(app,/!state\.user&&startupPath\.startsWith\("\/admin"\)\)\{renderAdmin\(\);showAuth\("login"\);return;\}/);
 assert.match(app,/document\.body\.classList\.remove\("auth-entry"\)/);
 assert.match(rewardsCss,/\.rewards-center\{gap:1\.2rem\}\.rewards-center\.active\{display:grid\}/);
 assert.doesNotMatch(rewardsCss,/\.rewards-center\{display:grid/);
 assert.match(suiteCss,/body\.admin-mode \.portal-sidebar,[\s\S]*body\.admin-mode \.topnav\{display:none!important\}/);
 assert.match(app,/customerEntry\?"MASTER7 · Premium Game Lobby":"MASTER7 · Management Console"/);
 assert.match(app,/\$\("authBrandSub"\)\.textContent=customerEntry\?t\("memberBrand"\):"SERVICE PORTAL"/);
 assert.match(suiteCss,/#authDialog\.admin-auth \.member-auth-hero\{display:flex/);
 assert.match(suiteCss,/#authDialog\.admin-auth \.member-auth-tagline\{display:none\}/);
});

test('member login has a compact real OTP control while management login remains separate',()=>{
 assert.match(auth,/id="memberOtp"[^>]+pattern="\[0-9\]\{6\}"/);
 assert.match(css,/#otpFields\{[\s\S]*?grid-template-columns:minmax\(116px,145px\)/);
 assert.match(app,/customerEntry\?"\/api\/auth\/otp\/login":"\/api\/auth\/login"/);
 assert.match(app,/purpose=state\.authMode==="login"\?"login":"register"/);
 assert.match(app,/\$\("phoneField"\)\.hidden=!registerOtp/);
 assert.equal((app.match(/customerEntry=!location\.pathname\.startsWith\("\/admin"\)/g)||[]).length,2);
 assert.match(app,/customerEntry\?"signInTitle":"managementSignIn"/);
 assert.match(app,/customerEntry\?"loginNotice":"managementLoginNotice"/);
 assert.match(app,/managementLoginNotice:"Enter your administrator or staff ID and password\."/);
});

test('logout revokes the server session before returning members and management to their own sign-in',()=>{
 const revoke=app.indexOf('await api("/api/auth/logout","POST",{})');
 const destination=app.indexOf('const destination=state.user?.role==="member"?"/signin":"/admin"');
 const replace=app.indexOf('location.replace(destination)');
 assert.ok(revoke>0);
 assert.ok(destination>=0&&destination<revoke);
 assert.ok(replace>revoke);
 assert.doesNotMatch(app.slice(revoke,replace),/location\.(?:assign|replace)/);
});

test('password visibility control is labelled and keyboard operable',()=>{
 assert.match(auth,/id="authPasswordToggle"[^>]+type="button"[^>]+aria-pressed="false"/);
 assert.match(app,/authPasswordToggle"\)\.onclick/);
 assert.match(app,/data-i18n-aria-label/);
});
