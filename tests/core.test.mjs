import test from 'node:test';
import assert from 'node:assert/strict';
import {solved,apply,inverse,isSolved,verifyDiagram} from '../v2/cube/engine.mjs';
import {checkStage,verifyStageCase,reviewCase} from '../v2/cube/validation.mjs';
import {stats} from '../v2/timer/stats.mjs';

test('motor: algoritmo e inverso retornam ao estado original',()=>{
 const alg="R U R' U' F2 L D2";
 assert.ok(isSolved(apply(apply(solved(),alg),inverse(alg))));
});
test('F2L permite topo com AUF enquanto os dois primeiros andares permanecem resolvidos',()=>{
 const u=apply(solved(),'U');
 assert.equal(checkStage(u,'f2l'),true);
 assert.equal(checkStage(u,'pll'),false);
 assert.equal(checkStage(u,'oll'),true);
});
test('PLL considera o ajuste final de U',()=>{
 const r=verifyStageCase('U','',"pll");
 assert.equal(r.valid,true);
 assert.equal(r.matchingAuf,"U'");
});
test('cada etapa exige seu próprio objetivo',()=>{
 const state=apply(solved(),'R');
 assert.equal(checkStage(state,'f2l'),false);
 assert.equal(checkStage(state,'oll'),false);
 assert.equal(checkStage(state,'pll'),false);
});
test('adesivos ocultos X são ignorados como referência',()=>{
 const result=verifyDiagram(apply(solved(),'R'),{U:Array(9).fill('X')});
 assert.equal(result.valid,true);
});
test('revisão exige conferência humana e matemática',()=>{
 const setup='R',algorithm="R'",initial=apply(solved(),setup);
 const input={id:'F2L-TEST',stage:'f2l',setup,algorithm,expectedState:initial,diagram:{U:Array(9).fill('X')},review:{approved:false}};
 const preliminary=reviewCase(input,{requireDiagram:true,requireExpectedState:true});
 assert.equal(preliminary.automaticPassed,true);
 assert.equal(preliminary.publicationReady,false);
 input.review={approved:true,reviewer:'Editor autorizado'};
 assert.equal(reviewCase(input,{requireDiagram:true,requireExpectedState:true}).publicationReady,true);
});
test('estatísticas do cronômetro',()=>{
 const result=stats([{ms:30000},{ms:20000},{ms:25000},{ms:19000},{ms:28000}]);
 assert.equal(result.total,5);
 assert.equal(result.best,19000);
 assert.equal(result.ao5,73000/3);
});
