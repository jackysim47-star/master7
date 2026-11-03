import test from 'node:test';
import assert from 'node:assert/strict';
import translations from '../shared/translations.json' with {type:'json'};
import {cookieLocale,translate,localizeMarkup} from '../shared/i18n.mjs';
test('locale preference is allowlisted and UI translations preserve unsupported text',()=>{
 assert.equal(cookieLocale('portal_session=secret; master7_locale=ms'),'ms');
 for(const value of ['../en','en<script>','%65n','zh-Hans',''])assert.equal(cookieLocale('master7_locale='+value),null);
 assert.equal(translate('会员管理','en'),'Members');assert.equal(translate('会员管理','ms'),'Ahli');assert.equal(translate('会员管理','zh-CN'),'会员管理');
 assert.equal(translate('Custom text','ms'),'Custom text');
 for(const [key,value]of Object.entries(translations))for(const locale of ['en','ms'])assert(typeof value[locale]==='string'&&value[locale].length>0&&!/[\u3400-\u9fff]/u.test(value[locale]),key+' missing '+locale);
});
test('server translation leaves dynamic entities, form values, URLs and styles intact',()=>{
 const html='<style>.x{content:"会员管理"}</style><label title="账号安全">账号<input value="会员管理" placeholder="搜索内容…"></label><p>&#20250;&#21592;&#31649;&#29702;</p><a href="/会员管理">登录</a>';
 const out=localizeMarkup(html,'en');assert(out.includes('title="Account security"'));assert(out.includes('placeholder="Search content…"'));assert(out.includes('value="会员管理"'));assert(out.includes('href="/会员管理"'));assert(out.includes('content:"会员管理"'));assert(out.includes('&#20250;&#21592;&#31649;&#29702;'));assert(out.includes('>Sign in</a>'));
});

test('every explicit React interface literal has English and Malay translations',async()=>{
 const {readFile}=await import('node:fs/promises');
 for(const file of ['portal.tsx','vpay-checkout.tsx','wallet-records.tsx','withdrawals.tsx']){
  const source=await readFile(new URL('../app/'+file,import.meta.url),'utf8');
  for(const match of source.matchAll(/ui\(("(?:[^"\\]|\\.)*")\)/g)){
   const label=JSON.parse(match[1]);if(!/[\u3400-\u9fff]/u.test(label))continue;
   for(const locale of ['en','ms'])assert(!/[\u3400-\u9fff]/u.test(translate(label,locale)),file+': '+label+' missing '+locale);
  }
 }
});
