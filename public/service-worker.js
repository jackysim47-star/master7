const CACHE='master7-shell-17.0.0-selfbuilt.173-staff-setup-route';
const SHELL=['/offline.html','/manifest.webmanifest','/assets/favicon-64.png','/assets/style.css','/assets/suite-theme.css','/assets/acceptance-blockers.css','/assets/member-shell.css','/assets/member-refresh.css','/assets/app.js','/assets/acceptance-blockers.js','/assets/production-acceptance-console.js','/assets/seven-emblem.png','/assets/master7-casino-lobby-premium.webp','/assets/master7-casino-backoffice-premium.webp','/assets/master7-sponsored-mascots.webp','/assets/sponsor-jili-master7.webp','/assets/sponsor-megah5-master7.webp','/assets/sponsor-918kiss-master7.webp','/assets/master7-live-hosts.webp','/assets/master7-cartoon-providers.webp','/assets/master7-vip-commission.webp','/assets/pwa-icon-180.png','/assets/pwa-icon-192.png','/assets/pwa-icon-512.png'];

self.addEventListener('install',event=>{
 event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(SHELL)).then(()=>self.skipWaiting()));
});

self.addEventListener('activate',event=>{
 event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(key=>key.startsWith('master7-shell-')&&key!==CACHE).map(key=>caches.delete(key)))).then(()=>self.clients.claim()));
});

self.addEventListener('fetch',event=>{
 const request=event.request;if(request.method!=='GET')return;
 const url=new URL(request.url);if(url.origin!==self.location.origin)return;
 if(request.mode==='navigate'){
  event.respondWith(fetch(request).catch(()=>caches.match('/offline.html')));return;
 }
 if(url.pathname.startsWith('/api/')||url.pathname.startsWith('/downloads/'))return;
 if(!SHELL.includes(url.pathname))return;
 event.respondWith(caches.match(request).then(cached=>cached||fetch(request).then(response=>{if(response.ok)caches.open(CACHE).then(cache=>cache.put(request,response.clone()));return response;})));
});
