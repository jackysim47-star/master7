import translations from './translations.json' with {type:'json'};
export const languages=Object.freeze({'zh-CN':'简体中文',en:'English',ms:'Bahasa Melayu'});
export const localeCookie='master7_locale';
export const validLocale=value=>typeof value==='string'&&Object.hasOwn(languages,value);
export const normalizeLocale=value=>validLocale(value)?value:'zh-CN';
export function cookieLocale(cookie=''){
 const value=String(cookie).split(';').map(part=>part.trim()).find(part=>part.startsWith(localeCookie+'='))?.slice(localeCookie.length+1);
 return validLocale(value)?value:null;
}
// Only call for application-owned interface text. Customer content is not translated.
export function translate(value,locale='zh-CN'){
 if(typeof value!=='string'||normalizeLocale(locale)==='zh-CN')return value;
 if(Object.hasOwn(translations,value))return translations[value][locale]||value;
 const trimmed=value.trim();return trimmed!==value&&Object.hasOwn(translations,trimmed)?value.replace(trimmed,translations[trimmed][locale]||trimmed):value;
}
const keys=Object.keys(translations).filter(key=>!/[<>]/.test(key)).sort((a,b)=>b.length-a.length);
const pattern=new RegExp(keys.map(key=>key.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')).join('|'),'gu');
export function translateStatic(value,locale){return normalizeLocale(locale)==='zh-CN'?value:value.replace(pattern,key=>translate(key,locale));}
// Dynamic HTML data is escaped into numeric entities by the server before this
// pass. Translate only visible text and display attributes, never form values,
// URLs, scripts or styles. React uses explicit t() calls instead of DOM mutation.
export function localizeMarkup(markup,locale){
 let skip=false;
 return markup.split(/(<(?:[^>"']|"[^"]*"|'[^']*')*>)/g).map(part=>{
  if(part.startsWith('<')){
   if(/^<(script|style)\b/i.test(part))skip=true;
   if(/^<\/(script|style)\s*>/i.test(part))skip=false;
   return part.replace(/\b(aria-label|title|placeholder|alt)=("[^"]*"|'[^']*')/g,(original,name,value)=>{
    const before=value.slice(1,-1),after=translateStatic(before,locale);if(before===after)return original;
    const escaped=after.replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));return name+'='+value[0]+escaped+value[0];
   });
  }
  return skip?part:translateStatic(part,locale);
 }).join('');
}
