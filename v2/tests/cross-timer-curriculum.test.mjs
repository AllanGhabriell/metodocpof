import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';

const storage=new Map();
globalThis.localStorage={
 getItem:key=>storage.get(key)??null,
 setItem:(key,value)=>storage.set(key,String(value)),
 removeItem:key=>storage.delete(key)
};
globalThis.cancelAnimationFrame=()=>{};
globalThis.requestAnimationFrame=()=>0;

const {crossTimerPage,crossTimerAction,crossTimerSetLevel,crossTimerBusy,crossTimerChange}=await import('../features/cross-timer.mjs');
const {crossIdeasPage,crossIdeasAction,crossIdeasCount}=await import('../features/cross-ideas.mjs');
const {crossPage,crossClick}=await import('../features/cross.mjs');

const root=resolve(import.meta.dirname,'../..');
const html=readFileSync(resolve(root,'cross.html'),'utf8');
const css=readFileSync(resolve(root,'assets/css/cross-lab.css'),'utf8');

test('Cross opens with independent timer and an unobtrusive simulator entry',()=>{
 assert.match(html,/let section='timer'/);
 assert.match(html,/crossTimerPage\(\)/);
 assert.match(html,/Simulador guiado/);
 assert.match(html,/crossIdeasPage\(\)/);
 assert.match(css,/\.cross-lab-clock/);
});

test('Four timer levels refer to pieces of middle and not generic edges',()=>{
 const page=crossTimerPage();
 for(const n of [1,2,3,4])assert.match(page,new RegExp('TIMER '+n));
 assert.match(page,/peças de meio/);
 assert.doesNotMatch(page,/arestas?/i);
});

test('Inspection, stop, self-reported correct result and independent histories',()=>{
 assert.equal(crossTimerBusy(),false);
 assert.equal(crossTimerAction({dataset:{crossTimer:'clock'}}),true);
 assert.equal(crossTimerBusy(),true);
 assert.match(crossTimerPage(),/INSPEÇÃO/);
 crossTimerAction({dataset:{crossTimer:'clock'}}); // encerrar inspeção antecipadamente
 crossTimerAction({dataset:{crossTimer:'clock'}}); // parar execução
 assert.match(crossTimerPage(),/save-1/);
 crossTimerAction({dataset:{crossTimer:'save-1'}});
 const results=JSON.parse(storage.get('academy-cross-physical-records-v1')||'[]');
 assert.equal(results.length,1);
 assert.equal(results[0].level,1);
 assert.equal(results[0].achieved,1);
 assert.equal(crossTimerSetLevel(2),true);
 assert.match(crossTimerPage(),/TIMER 2/);
 crossTimerAction({dataset:{crossTimer:'tab-history'}});
 assert.match(crossTimerPage(),/ainda não fez tentativas neste nível/);
 crossTimerSetLevel(1);
 crossTimerAction({dataset:{crossTimer:'tab-history'}});
 assert.match(crossTimerPage(),/1\/1 peças/);
});

test('The timer has averages, accuracy, penalty options and export controls',()=>{
 crossTimerAction({dataset:{crossTimer:'tab-stats'}});
 const page=crossTimerPage();
 for(const label of ['Ao5','Ao12','Ao50','Ao100','Taxa de acerto','CSV','cartão PNG'])assert.ok(page.includes(label),label);
 assert.ok(readFileSync(resolve(root,'v2/features/cross-timer.mjs'),'utf8').includes('plus2'));
 assert.equal(crossTimerChange({id:'cross-lab-length',value:'25'}),true);
 const setting=JSON.parse(storage.get('academy-cross-physical-settings-v1'));
 assert.equal(setting.length,25);
});

test('Ideas of training have beginner intermediate advanced and timer shortcuts',()=>{
 assert.equal(crossIdeasCount(),12);
 for(const label of ['Básico','Intermediário','Avançado'])assert.ok(crossIdeasPage().includes(label));
 crossIdeasAction({dataset:{crossIdeas:'category-advanced'}});
 assert.match(crossIdeasPage(),/Cross \+ previsão do primeiro F2L/);
 let chosen=0;
 crossIdeasAction({dataset:{crossIdeas:'start-cross1'}},n=>chosen=n);
 assert.equal(chosen,4);
});

test('Simulation guides observation planning execution and analysis',()=>{
 const page=crossPage();
 for(const label of ['Observar','Planejar','Executar','Analisar','Dica gradual'])assert.ok(page.includes(label),label);
 assert.doesNotMatch(page,/arestas?/i);
 crossClick({dataset:{cross:'hint'}});
 assert.match(crossPage(),/Lembre-se:/);
 crossClick({dataset:{cross:'hint'}});
 assert.match(crossPage(),/Próximo movimento/);
});
