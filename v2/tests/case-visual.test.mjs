import test from 'node:test';
import assert from 'node:assert/strict';
import {solved,apply,facelets} from '../cube/engine.mjs';
import {maskCaseState,resolutionOrientation,orientationCenters} from '../cube/case-visual.mjs';
test('CFOP mostra amarelo em cima, vermelho na frente e azul à direita',()=>{
 const c=orientationCenters(apply(solved(),resolutionOrientation));
 assert.deepEqual(c,{top:'D',front:'R',right:'B',bottom:'U'});
});
test('F2L oculta adesivos superiores irrelevantes mas preserva par branco-vermelho-azul',()=>{
 const state=apply(solved(),resolutionOrientation);
 const masked=maskCaseState(state,'f2l');
 assert.ok(masked.includes('X'));
 assert.ok(masked.includes('R'));
 assert.ok(masked.includes('B'));
 assert.ok(masked.includes('U'));
});
test('OLL mostra apenas adesivos amarelos da última camada',()=>{
 const state=apply(solved(),resolutionOrientation);
 const masked=maskCaseState(state,'oll');
 assert.ok(masked.some(c=>c==='D'));
 assert.ok(masked.every(c=>c==='D'||c==='X'));
});
test('PLL mostra somente a camada superior',()=>{
 const state=apply(solved(),resolutionOrientation);
 const masked=maskCaseState(state,'pll');
 assert.equal(masked.filter(c=>c!=='X').length,21);
});
