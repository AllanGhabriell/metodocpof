import test from 'node:test';
import assert from 'node:assert/strict';
import {solved,inverse,apply,facelets} from '../cube/engine.mjs';
import {reviewCase} from '../cube/validation.mjs';
test('publicação rigorosa exige diagrama, estado e revisão humana',()=>{
 const algorithm="R U R' U'";
 const setup=inverse(algorithm);
 const initial=apply(solved(),setup);
 const base={id:'teste',stage:'f2l',algorithm,setup};
 assert.equal(reviewCase({...base,review:{approved:true,reviewer:'Allan'}},{requireDiagram:true,requireExpectedState:true}).publicationReady,false);
 const valid={...base,expectedState:initial,diagram:{U:facelets(initial).U},review:{approved:true,reviewer:'Allan'}};
 const report=reviewCase(valid,{requireDiagram:true,requireExpectedState:true});
 assert.equal(report.publicationReady,true);
 assert.equal(reviewCase({...valid,diagram:{U:['R',...Array(8).fill('?')]}},{requireDiagram:true,requireExpectedState:true}).publicationReady,false);
});
