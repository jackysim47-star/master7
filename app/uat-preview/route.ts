import {RENDER_SECURITY_HEADERS} from '../../lib/http-security';
import {uatPreviewHtml} from '../../lib/uat-preview';

export const dynamic='force-dynamic';

function page(head=false){return new Response(head?null:uatPreviewHtml(),{headers:{
 ...RENDER_SECURITY_HEADERS,
 'Content-Type':'text/html; charset=utf-8',
 'Cache-Control':'no-store',
 'X-Robots-Tag':'noindex, nofollow, noarchive',
 'Content-Security-Policy':"default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data:; connect-src 'self'; object-src 'none'; base-uri 'none'; form-action 'none'; frame-ancestors 'self'",
}});}

export function GET(){return page();}
export function HEAD(){return page(true);}
