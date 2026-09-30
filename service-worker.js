const CACHE='under-pressure-v15-network-first';
const ASSETS=[
  './','./index.html','./style.css?v=15','./game.js?v=15','./manifest.webmanifest',
  './icon-192.png','./icon-512.png','./apple-touch-icon.png','./favicon.png'
];

self.addEventListener('install',event=>{
  event.waitUntil(
    caches.open(CACHE)
      .then(c=>c.addAll(ASSETS))
      .then(()=>self.skipWaiting())
  );
});

self.addEventListener('activate',event=>{
  event.waitUntil(
    caches.keys()
      .then(keys=>Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k))))
      .then(()=>self.clients.claim())
  );
});

self.addEventListener('fetch',event=>{
  if(event.request.method!=='GET') return;
  const url=new URL(event.request.url);

  // Always prefer fresh app code/pages when online.
  if(url.origin===self.location.origin && (
      event.request.mode==='navigate' ||
      url.pathname.endsWith('/index.html') ||
      url.pathname.endsWith('/game.js') ||
      url.pathname.endsWith('/style.css')
  )){
    event.respondWith(
      fetch(event.request,{cache:'no-store'})
        .then(res=>{
          const copy=res.clone();
          caches.open(CACHE).then(c=>c.put(event.request,copy)).catch(()=>{});
          return res;
        })
        .catch(()=>caches.match(event.request).then(r=>r||caches.match('./index.html')))
    );
    return;
  }

  event.respondWith(
    caches.match(event.request).then(hit=>hit||fetch(event.request).then(res=>{
      const copy=res.clone();
      caches.open(CACHE).then(c=>c.put(event.request,copy)).catch(()=>{});
      return res;
    }))
  );
});
