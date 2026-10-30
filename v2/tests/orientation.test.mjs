import test from 'node:test';
import assert from 'node:assert/strict';
import {solved,apply,facelets} from '../cube/engine.mjs';
test('orientação do embaralhamento: branco no topo e verde na frente',()=>{const f=facelets(solved());assert.equal(f.U[4],'U');assert.equal(f.F[4],'F')});
test('orientação de aprendizado: amarelo no topo, vermelho na frente, branco embaixo',()=>{const f=facelets(apply(solved(),'x2 y'));assert.equal(f.U[4],'D');assert.equal(f.F[4],'R');assert.equal(f.D[4],'U')});
