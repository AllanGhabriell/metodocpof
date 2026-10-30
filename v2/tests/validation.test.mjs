import test from 'node:test';
import assert from 'node:assert/strict';
import {inverse} from '../cube/engine.mjs';
import {reviewCase} from '../cube/validation.mjs';
test('aprovação humana é necessária mesmo após validação automática',()=>{
 const algorithm="R U R' U'";
 const record={id:'test-1',stage:'f2l',algorithm,setup:inverse(algorithm)};
 const result=reviewCase(record);
 assert.equal(result.automaticPassed,true);
 assert.equal(result.publicationReady,false);
 const approved=reviewCase({...record,review:{approved:true,reviewer:'Proprietário'}});
 assert.equal(approved.publicationReady,true);
});
test('erro matemático bloqueia publicação apesar da aprovação',()=>{
 const result=reviewCase({id:'test-2',stage:'f2l',algorithm:'R',setup:'U',review:{approved:true,reviewer:'Proprietário'}});
 assert.equal(result.publicationReady,false);
});
