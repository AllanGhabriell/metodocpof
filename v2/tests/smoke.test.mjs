import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync, existsSync} from 'node:fs';
import {resolve} from 'node:path';
const root=resolve(import.meta.dirname,'../..');
const read=p=>readFileSync(resolve(root,p),'utf8');
test('página original mantém quatro etapas e CFOP Studio secundário',()=>{
 const home=read('index.html');
 for(const page of ['cross.html','f2l.html','oll.html','pll.html','scramble.html'])assert.ok(home.includes(page),page);
 const html=read('studio.html');
 assert.match(html,/v2\/app\.css/);
 assert.match(html,/v2\/app\.js/);
 assert.match(html,/id="root"/);
});
test('arquivos essenciais existem',()=>{
 for(const p of ['v2/app.css','v2/app.js','v2/data/schema.json'])assert.ok(existsSync(resolve(root,p)),p);
});
test('interface tem navegação e crédito de autoria',()=>{
 const js=read('v2/app.js');
 for(const label of ['Aprender','Treinar','Cronômetro','Biblioteca','Estatísticas','Desenvolvido por Allan Ghabriell'])assert.ok(js.includes(label),label);
});
test('interface pública não expõe observações internas',()=>{
 const js=read('v2/app.js');
 for(const term of ['Biblioteca em validação','algoritmos ou diagramas inventados','Reconstrução em andamento','Importação e validação pendentes'])assert.ok(!js.includes(term),term);
});
test('animações respeitam preferência por movimento reduzido',()=>{
 assert.match(read('v2/app.css'),/prefers-reduced-motion:\s*reduce/);
});
test('contrato de dados contém as coleções necessárias',()=>{
 const schema=JSON.parse(read('v2/data/schema.json'));
 for(const key of ['cases','solves','progress','settings'])assert.ok(schema.collections[key],key);
});
