const customerHosts=new Set(['master7.best','www.master7.best']);
const adminHosts=new Set(['www.master7.site']);
const legacyAdminHosts=new Set(['master7.site','admin.master7.best','admin.master7.site']);
const canonicalCustomerOrigin='https://www.master7.best';
const canonicalAdminOrigin='https://www.master7.site';

function requestHostname(req:Request,url:URL){
 const authority=(req.headers.get('x-forwarded-host')??url.host).split(',')[0].trim().toLowerCase();
 if(authority.includes(':'))return '';
 try{
  const parsed=new URL(`https://${authority}`);
  return !parsed.username&&!parsed.password&&!parsed.port&&parsed.pathname==='/'&&!parsed.search&&!parsed.hash?parsed.hostname:'';
 }catch{return '';}
}

/**
 * Return only fixed, page-level redirects. API paths and state-changing
 * methods must always reach their normal handlers without host routing.
 */
export function portalHostRedirect(req:Request){
 if(req.method!=='GET'&&req.method!=='HEAD')return null;
 const url=new URL(req.url),host=requestHostname(req,url);
 const adminPage=url.pathname==='/admin'||url.pathname.startsWith('/admin/');
 const apiPath=url.pathname==='/api'||url.pathname.startsWith('/api/');
 if(adminPage&&customerHosts.has(host)){
  return {status:308,location:new URL(url.pathname+url.search,canonicalAdminOrigin).href};
 }
 if(host==='master7.best'&&!apiPath)return {status:308,location:new URL(url.pathname+url.search,canonicalCustomerOrigin).href};
 if((url.pathname==='/'||adminPage)&&legacyAdminHosts.has(host))return {status:308,location:new URL((url.pathname==='/'?'/admin':url.pathname)+url.search,canonicalAdminOrigin).href};
 if(url.pathname==='/'&&adminHosts.has(host))return {status:308,location:'/admin'};
 return null;
}

export const portalHostGroups={customerHosts,adminHosts};
