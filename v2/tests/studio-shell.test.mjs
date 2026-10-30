import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {runInNewContext} from 'node:vm';

const root=resolve(import.meta.dirname,'../..');
const read=path=>readFileSync(resolve(root,path),'utf8');
const html=read('studio.html');
const watchdog=html.match(/<script>([\s\S]*?)<\/script>/)?.[1];

function fakePage(rendered){
 const calls=new Map(),handlers=new Map();
 let counter=0;
 let markup=rendered?'<div class="original-studio">Página carregada</div>':
  '<main class="studio-loading-screen">Carregando</main>';
 const rootNode={
  get innerHTML(){return markup},
  set innerHTML(value){markup=value}
 };
 const document={
  getElementById:id=>id==='root'||id==='cfop-retry'?rootNode:null,
  querySelector:selector=>selector.includes('original-studio')&&markup.includes('class="original-studio"')?{}:null
 };
 rootNode.addEventListener=(event,handler)=>{rootNode.onRetry=handler};
 const window={addEventListener:(name,handler)=>handlers.set(name,handler)};
 const setTimeout=(fn,ms)=>{calls.set(++counter,{fn,ms});return counter};
 const clearTimeout=id=>calls.delete(id);
 const location={reload:()=>{}};
 runInNewContext(watchdog,{document,window,setTimeout,clearTimeout,location});
 return {get markup(){return markup},handlers,calls};
}

test('Studio watchdog does not replace the current original-studio interface',()=>{
 assert.ok(watchdog);
 const page=fakePage(true),before=page.markup;
 for(const call of [...page.calls.values()])call.fn();
 assert.equal(page.markup,before);
 page.handlers.get('unhandledrejection')?.({});
 for(const call of [...page.calls.values()])call.fn();
 assert.equal(page.markup,before);
});

test('Studio signals when ready and keeps its normal view after the old timeout',()=>{
 const page=fakePage(false),before=page.markup;
 page.handlers.get('cfop:ready')?.({});
 for(const call of [...page.calls.values()])call.fn();
 assert.equal(page.markup,before);
});

test('Studio displays a scoped recovery view only if it has genuinely not loaded',()=>{
 const page=fakePage(false);
 for(const call of [...page.calls.values()])if(call.ms===9000)call.fn();
 assert.match(page.markup,/Não foi possível iniciar o aplicativo/);
 assert.match(page.markup,/Tentar novamente/);
 assert.match(page.markup,/index.html/);
 assert.doesNotMatch(page.markup,/background:#171e30/);
});

test('Studio render handles individual view failures without losing the navigation',()=>{
 const app=read('v2/app.js');
 assert.ok(app.includes("window.dispatchEvent(new Event('cfop:ready'))"));
 assert.ok(app.includes('try{pageMarkup=content()}'));
 assert.ok(app.includes("data-action=\"reload-view\""));
 assert.ok(app.includes("if(b.dataset.action==='reload-view')"));
 assert.ok(app.includes('readLocalTimes()'));
 assert.ok(app.includes('<nav class="original-studio-nav"'));
});

test('Studio background has exactly one blue source and no old purple pseudo layers',()=>{
 const css=read('assets/css/studio-shell-fix.css');
 assert.match(html,/<html lang="pt-BR" class="studio-page">/);
 assert.match(html,/<body class="studio-page">/);
 assert.match(css,/html\.studio-page\s*\{[^}]*background:#071427/s);
 assert.match(css,/body\.studio-page\s*\{[^}]*background:/s);
 assert.match(css,/body\.studio-page::before,[\s\S]*?body\.studio-page::after\s*\{[^}]*content:none!important/s);
 assert.match(css,/body\.studio-page \.studio-page-identity\s*\{[^}]*border:0!important/s);
 assert.match(css,/border-left:0!important/);
 assert.match(css,/\.academy-load-error/);
 const cssLinks=[...html.matchAll(/<link rel="stylesheet" href="([^"]+)"/g)].map(m=>m[1]);
 assert.ok(cssLinks.at(-1).startsWith('assets/css/studio-shell-fix.css'));
});

test('service worker rotates its cache and never substitutes old module versions',()=>{
 const sw=read('sw.js');
 assert.match(sw,/cfop-studio-offline-20261030-v7/);
 assert.match(sw,/\.\/studio\.html/);
 assert.match(sw,/studio-shell-fix\.css\?v=20261030-31/);
 assert.match(sw,/v2\/app\.js\?v=20261030-32/);
 assert.doesNotMatch(sw,/ignoreSearch\s*:\s*true/);
 assert.match(sw,/const exact=await cache\.match\(req\)/);
 assert.match(sw,/const name=url\.pathname\.split\('\/'\)/);
});
