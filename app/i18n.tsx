'use client';
import {createContext,useContext,useEffect,useState,useCallback,type ReactNode} from 'react';
import {cookieLocale,languages,localeCookie,normalizeLocale,translate,validLocale} from '../shared/i18n.mjs';
export type Locale='zh-CN'|'en'|'ms';
type LocaleContextValue={locale:Locale;t:(value:any)=>any;setLocale:(value:Locale)=>void;setDefaultLocale:(value?:string)=>void};
const Context=createContext<LocaleContextValue|null>(null);
export function LocaleProvider({children}:{children:ReactNode}){
 const [choice,setChoice]=useState<Locale|null>(()=>typeof document==='undefined'?null:cookieLocale(document.cookie));
 const [fallback,setFallback]=useState<Locale>(()=>typeof document==='undefined'?'zh-CN':normalizeLocale(document.documentElement.lang));
 const locale=choice||fallback;
 useEffect(()=>{document.documentElement.lang=locale;},[locale]);
 function setLocale(value:Locale){if(!validLocale(value))return;setChoice(value);document.cookie=localeCookie+'='+value+'; Path=/; Max-Age=31536000; SameSite=Lax'+(location.protocol==='https:'?'; Secure':'');}
 const setDefaultLocale=useCallback((value?:string)=>{setFallback(normalizeLocale(value));},[]);
 return <Context.Provider value={{locale,t:value=>translate(value,locale),setLocale,setDefaultLocale}}>{children}</Context.Provider>;
}
export function useI18n(){const context=useContext(Context);if(!context)throw Error('LocaleProvider required');return context;}
export function LanguageSwitcher(){const {locale,setLocale}=useI18n();return <label className="language-picker"><span aria-hidden="true">🌐</span><select aria-label="Language / Bahasa / 语言" value={locale} onChange={event=>setLocale(event.target.value as Locale)}>{Object.entries(languages).map(([value,label])=><option key={value} value={value} lang={value}>{label}</option>)}</select></label>;}
