const CACHE='cfop-studio-offline-20261030-v3';
const SHELL=['./','./index.html','./v2/app.css','./v2/app.js','./v2/cube/engine.mjs','./v2/cube/visual.mjs','./v2/cube/case-visual.mjs','./v2/cube/recognition.mjs','./v2/cube/f2l-recognition.mjs','./v2/cube/validation.mjs','./v2/timer/stats.mjs','./v2/features/cross.mjs','./v2/features/progress.mjs','./v2/features/practice.mjs','./v2/features/editor.mjs','./v2/features/sticker-editor.mjs','./v2/cloud/cloud.mjs','./v2/cloud/online.mjs','./v2/data/pdf-import.mjs','./v2/data/pdf-cases.json'];
self.addEventListener('install',event=>{
 event.waitUntil(caches.open(CACHE).then(async cache=>{
  await cache.addAll(['./index.html','./v2/app.js','./v2/app.css']);
  // Falha em um recurso opcional não impede a instalação do app.
  await Promise.allSettled(SHELL.map(path=>cache.add(path)));
 }).then(()=>self.skipWaiting()));
});
self.addEventListener('activate',event=>{
 event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k.startsWith('cfop-studio-offline-')&&k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim()));
});
self.addEventListener('fetch',event=>{
 const req=event.request;
 if(req.method!=='GET'||new URL(req.url).origin!==self.location.origin)return;
 event.respondWith((async()=>{
  const cache=await caches.open(CACHE);
  try{
   const response=await fetch(req);
   if(response.ok&&response.type==='basic')cache.put(req,response.clone()).catch(()=>{});
   return response;
  }catch{
   const fallback=await cache.match(req,{ignoreSearch:true});
   if(fallback)return fallback;
   if(req.mode==='navigate')return (await cache.match('./index.html',{ignoreSearch:true}))||Response.error();
   return Response.error();
  }
 })());
});
