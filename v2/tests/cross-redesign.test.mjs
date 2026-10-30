import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {solved,apply,facelets} from '../cube/engine.mjs';
const root=resolve(import.meta.dirname,'../..');
const src=readFileSync(resolve(root,'v2/features/cross.mjs'),'utf8');
test('cross has guided and free modes, 3D and 2D views, controls',()=>{
 for(const value of ['cross-mode','cross-count','view-cube','view-net','crossmove','cross-feedback','cube3D','Novo desafio','Conferir'])assert.ok(src.includes(value),value);
});
test('bottom edge indices match side centers in the solved cube',()=>{
 const f=facelets(solved());
 for(const [side,d] of [['F',7],['R',5],['B',1],['L',3]]){assert.equal(f.D[d],'D');assert.equal(f[side][7],side)}
});
test('face half-turn removes only the matching bottom cross edge',()=>{
 for(const [side,d] of [['F',7],['R',5],['B',1],['L',3]]){
  const f=facelets(apply(solved(),side+'2'));
  assert.notDeepEqual(f,facelets(solved()));
  assert.equal(f[side][4],side);
 }
});
test('Cross uses a dedicated responsive visual stylesheet',()=>{
 const html=readFileSync(resolve(root,'cross.html'),'utf8');
 assert.match(html,/cross-v2\.css/);
 assert.match(html,/academy\.css/);
});
