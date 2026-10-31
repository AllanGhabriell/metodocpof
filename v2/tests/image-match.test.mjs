import test from 'node:test';
import assert from 'node:assert/strict';
import {bestDiagramDistance,compareSignatures} from '../data/image-match.mjs';
import {algorithmIndex,identifyByAlgorithm} from '../data/algorithm-match.mjs';
const SIZE=16;
test('image matching rotates diagrams but rejects ambiguous patterns',()=>{
 const a=Array.from({length:SIZE*SIZE},(_,i)=>i%SIZE<3&&Math.floor(i/SIZE)<6?'y':'k');
 assert.equal(bestDiagramDistance(a,a),0);
 assert.equal(compareSignatures(a,[]),1);
 const b=Array(SIZE*SIZE).fill('w');
 assert.ok(bestDiagramDistance(a,b)>.23);
});
test('different cases with same algorithm are ambiguous; known unique algorithms are matched',()=>{
 const idx=algorithmIndex([
  {id:'PLL-01',stage:'pll',algorithm:"M2 U M2 U2 M2 U M2"},
  {id:'PLL-02',stage:'pll',algorithm:"R U R' U'"},
  {id:'PLL-03',stage:'pll',algorithm:"R U R' U'"}
 ]);
 assert.equal(identifyByAlgorithm('pll',"M2 U M2 U2 M2 U M2",idx),'PLL-01');
 assert.equal(identifyByAlgorithm('pll',"R U R' U'",idx),null);
 assert.equal(identifyByAlgorithm('oll',"M2 U M2 U2 M2 U M2",idx),null);
});
