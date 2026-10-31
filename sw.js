/* GitHub Pages app shell — network-first, version-aware resource fallback.
   Never reuse an old JS module under a different ?v= version. */
const CACHE='cfop-studio-offline-20261031-v31';
const CORE=[
 './index.html','./studio.html','./f2l.html','./oll.html','./pll.html','./importer.html',
 './cross.html','./scramble.html',
 './v2/app.js?v=20261031-10',
 './v2/app.css?v=20261031-5',
 './assets/css/studio-original.css?v=1',
 './assets/css/academy.css?v=20261030-1',
 './assets/css/home-layout.css?v=20261031-mobile-1',
 './assets/js/home-mobile-menu.js?v=20261031-1',
 './assets/css/academy-tools.css?v=20261030-22',
 './assets/css/studio-shell-fix.css?v=20261030-31',
 './assets/css/cursor-glow.css?v=1',
 './assets/css/trainer-unified.css?v=20261031-4',
 './assets/css/importer.css?v=20261031-4',
 './assets/js/library-trainer.js?v=20261031-7',
 './assets/js/importer.js?v=20261031-7',
 './v2/data/case-catalog.mjs','./v2/data/algorithm-match.mjs','./v2/data/image-match.mjs','./v2/data/pdf-layout.mjs','./v2/cloud/libraries.mjs?v=20261031-4',
 './v2/cursor-glow.js?v=20261030-31'
];
const OPTIONAL=[
 './v2/cube/engine.mjs','./v2/cube/visual.mjs',
 './v2/cube/visual.mjs?v=20261030-8',
 './v2/cube/visual.mjs?v=20261030-20',
 './v2/cube/case-visual.mjs','./v2/cube/recognition.mjs',
 './v2/cube/f2l-recognition.mjs','./v2/cube/validation.mjs',
 './v2/timer/stats.mjs','./v2/features/cross.mjs',
 './v2/features/progress.mjs','./v2/features/academy-insights.mjs',
 './v2/features/practice.mjs','./v2/features/editor.mjs',
 './v2/features/sticker-editor.mjs',
 './v2/cloud/cloud.mjs?v=20261031-56','./v2/cloud/coach-merge.mjs',
 './v2/cloud/project-config.mjs',
 './v2/cloud/identity.mjs','./v2/features/avatar-crop.mjs',
 './v2/features/achievements.mjs','./v2/features/share-cards.mjs',
 './v2/cloud/admin.mjs?v=20261031-2','./v2/cloud/online.mjs?v=20261030-55',
 './v2/data/pdf-import.mjs',
 './assets/js/trainer-coach.js?v=20261030-43',
 './assets/js/secao.js?v=20261031-7',
 './assets/css/trainer-unified.css?v=20261030-43',
 './assets/js/scramble.js?v=20261031-24',
 './assets/css/scramble.css?v=20261031-9'
];
self.addEventListener('install',event=>{
 event.waitUntil(caches.open(CACHE).then(async cache=>{
  // Offline installation should survive a temporary missing optional resource.
  await Promise.allSettled([...CORE,...OPTIONAL].map(path=>cache.add(path)));
 }).then(()=>self.skipWaiting()));
});
self.addEventListener('activate',event=>{
 event.waitUntil(
  caches.keys()
   .then(keys=>Promise.all(keys.filter(key=>key.startsWith('cfop-studio-offline-')&&key!==CACHE).map(key=>caches.delete(key))))
   .then(()=>self.clients.claim())
 );
});
self.addEventListener('fetch',event=>{
 const req=event.request,url=new URL(req.url);
 if(req.method!=='GET'||url.origin!==self.location.origin)return;
 event.respondWith((async()=>{
  const cache=await caches.open(CACHE);
  try{
   const response=await fetch(req);
   if(response.ok&&response.type==='basic')cache.put(req,response.clone()).catch(()=>{});
   return response;
  }catch{
   const exact=await cache.match(req);
   if(exact)return exact;
   if(req.mode==='navigate'){
    // Preserve the requested page. Do not show the homepage for Studio when offline.
    const name=url.pathname.split('/').pop()||'index.html';
    const page=await cache.match('./'+name);
    if(page)return page;
    return new Response(
     '<!doctype html><html lang="pt-BR"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Academia CPOF — Sem conexão</title><body style="margin:0;background:#071427;color:#e8f7ff;font:16px system-ui;padding:48px 22px"><h1>Sem conexão</h1><p>Não foi possível carregar esta página offline. Seus treinos salvos continuam no dispositivo.</p><button onclick="location.reload()" style="padding:12px 18px;border-radius:10px;background:#1d5c98;color:white;border:0">Tentar novamente</button></body></html>',
     {status:503,headers:{'Content-Type':'text/html; charset=utf-8'}}
    );
   }
   // A versão antiga de um módulo não pode substituir a versão atual.
   return Response.error();
  }
 })());
});
