import html from './portal.html?raw';
import { env } from 'cloudflare:workers';
import { readLocalSession } from '../lib/password-auth';
import { portalHostRedirect } from '../lib/portal-host-routing';
import { RENDER_SECURITY_HEADERS } from '../lib/http-security';

export const dynamic='force-dynamic';

async function page(req:Request,head=false){
 const url=new URL(req.url);
 const admin=url.pathname==='/admin'||url.pathname.startsWith('/admin/');
 const authEntry=['/signin','/register'].includes(url.pathname),staffSetupEntry=url.pathname==='/staff-setup';
 const hostRedirect=portalHostRedirect(req);
 if(hostRedirect)return new Response(null,{status:hostRedirect.status,headers:{Location:hostRedirect.location,'Cache-Control':'no-store'}});
 const local=env.DB?await readLocalSession(req,env.DB):null;
 if(url.pathname==='/'&&!local)return new Response(null,{status:303,headers:{Location:'/signin','Cache-Control':'no-store'}});
 if(authEntry&&local)return new Response(null,{status:303,headers:{Location:local.user.role==='owner'||local.user.role==='staff'?'/admin':'/','Cache-Control':'no-store'}});
 const page=admin?html.replace('<title>MASTER7 · Premium Game Lobby</title>','<title>MASTER7 · Management Console</title>').replace('id="lobby" class="section active"','id="lobby" class="section"').replace('id="admin" class="section"','id="admin" class="section active"'):html;
 const bodyClasses=[admin?'admin-mode':'',authEntry||staffSetupEntry||admin&&!local?'auth-entry':''].filter(Boolean).join(' ');
 const body=bodyClasses?page.replace('<body>',`<body class="${bodyClasses}">`):page;
 return new Response(head?null:body,{headers:{...RENDER_SECURITY_HEADERS,'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-store','Content-Security-Policy':"default-src 'self'; script-src 'self' https://connect.facebook.net https://www.googletagmanager.com; style-src 'self' 'unsafe-inline'; img-src 'self' data: https://www.facebook.com https://www.google-analytics.com https://www.google.com https://googleads.g.doubleclick.net; media-src 'self'; connect-src 'self' https://www.facebook.com https://connect.facebook.net https://www.google-analytics.com https://region1.google-analytics.com https://www.googleadservices.com; object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'self'"}});
}

export function GET(req:Request){return page(req);}
export function HEAD(req:Request){return page(req,true);}

