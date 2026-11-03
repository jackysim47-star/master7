const countryCode=value=>{
 const code=String(value??'').trim().toUpperCase();
 // Cloudflare uses XX when it cannot identify a country and T1 for Tor.
 return /^[A-Z]{2}$/.test(code)&&!['XX','T1','A1'].includes(code)?code:null;
};

/**
 * Build presentation-only visitor and platform location data.
 * The request IP is never inspected or returned. `CF-IPCountry` is supplied
 * by Cloudflare when proxied; because the origin may also be reached directly,
 * this value must never be used for authorization, payments, or compliance.
 */
export function visitorLocationFromHeaders(headers={},hostingRegion='singapore'){
 const raw=typeof headers?.get==='function'?headers.get('cf-ipcountry'):headers?.['cf-ipcountry'];
 const visitorCountryCode=countryCode(raw);
 const region=String(hostingRegion||'').trim().toLowerCase();
 return Object.freeze({
  visitorCountryCode,
  visitorCountryDetected:visitorCountryCode!==null,
  visitorCountrySource:visitorCountryCode?'cf-ipcountry':null,
  platformCountryCode:'MY',
  currency:'MYR',
  timeZone:'Asia/Kuching',
  hostingRegion:/^[a-z0-9-]{2,32}$/.test(region)?region:'unspecified',
  purpose:'presentation-only',
 });
}
