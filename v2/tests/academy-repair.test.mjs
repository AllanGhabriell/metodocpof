import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import {resolve,dirname} from 'node:path';
import {pathToFileURL} from 'node:url';
const root=resolve(import.meta.dirname,'../..');
const read=p=>readFileSync(resolve(root,p),'utf8');
test('módulo de embaralhamento carrega arquivos existentes do motor e do cubo 3D',()=>{
 const p=resolve(root,'assets/js/scramble.js'),src=read('assets/js/scramble.js');
 for(const [,rel] of src.matchAll(/from\s+['"]([^'"]+)['"]/g)){
  assert.ok(existsSync(resolve(dirname(p),rel.split('?')[0])),'import quebrado: '+rel);
 }
 for(const phrase of ['cube3D(state','cube2D(state','scrambleLength','inspectionTick','start()'])assert.ok(src.includes(phrase),phrase);
});
test('opções de embaralhamento estão de fato na interface, inclusive no celular',()=>{
 const html=read('scramble.html'),css=read('assets/css/scramble.css');
 for(const id of ['scramble-length','cube-view','inspection-toggle','scramble-cube','cube-left','cube-up','cube-down','cube-right'])assert.ok(html.includes('id="'+id+'"'),id);
 assert.ok(css.includes('.scramble-option-fields'));
 assert.ok(css.includes('.scramble-cube-net'));
});
test('ferramentas compartilham estilo, dados reais e identidade visual',()=>{
 const html=read('studio.html'),app=read('v2/app.js'),progress=read('v2/features/progress.mjs');
 assert.match(html,/academy-tools\.css/);
 for(const phrase of ['studio-brand-mark','academy-learning-hero','academy-learning-layout','original-studio-content'])assert.ok(app.includes(phrase),phrase);
 assert.ok(progress.includes('academyDashboard(data.records'));
 assert.ok(read('assets/js/secao.js').includes("cpof-academy-activity-v1"));
});
test('painel de atividades não simula tempos quando falta histórico',async()=>{
 const store=new Map();
 const storage={getItem:key=>store.get(key)||null,setItem:(key,val)=>store.set(key,val)};
 globalThis.localStorage=storage;
 const url=pathToFileURL(resolve(root,'v2/features/academy-insights.mjs')).href;
 const {academyActivityData,academyDashboard}=await import(url);
 let data=academyActivityData();
 assert.equal(data.streak,0);
 assert.equal(data.times.length,0);
 assert.match(academyDashboard([]),/pelo menos dois tempos/);
 store.set('cpof-scramble-times-v1',JSON.stringify([
 {ms:13000,scramble:"R U",date:new Date().toISOString()},
 {ms:11600,scramble:"F U",date:new Date().toISOString()}
 ]));
 store.set('cpof-academy-activity-v1',JSON.stringify([{stage:'f2l',caseId:'1',at:Date.now()}]));
 data=academyActivityData();
 assert.equal(data.streak,1);
 assert.equal(data.cases.length,1);
 assert.equal(data.times.length,2);
 assert.match(academyDashboard([]),/academy-speed-chart/);
});
