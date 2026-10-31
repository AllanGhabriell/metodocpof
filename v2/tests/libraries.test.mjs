import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {FIXED_CASES,CASE_BY_ID,PLL_NAMES,canonicalCase,matchCaseId} from '../data/case-catalog.mjs';
import {assignFixedCases,isAlgorithm,cropDiagram} from '../data/pdf-layout.mjs';
const read=path=>readFileSync(new URL(path,import.meta.url),'utf8');

test('all 119 fixed cases have unique stable IDs and stage labels',()=>{
 assert.equal(FIXED_CASES.length,119);
 assert.equal(new Set(FIXED_CASES.map(x=>x.id)).size,119);
 for(const [stage,count] of Object.entries({f2l:41,oll:57,pll:21})){
  assert.equal(FIXED_CASES.filter(c=>c.stage===stage).length,count);
  for(let n=1;n<=count;n++)assert.equal(canonicalCase(stage,n)?.stage,stage);
 }
 assert.equal(PLL_NAMES.length,21);
 assert.equal(matchCaseId('pll','Ua'),'PLL-01');
 assert.equal(matchCaseId('pll','Gd'),'PLL-21');
 assert.equal(CASE_BY_ID.get('OLL-01').name,'Sune');
});

test('PDF parser extracts two columns and distinct algorithm/setup lines',()=>{
 const page={page:1,width:595,height:842,items:[
  {text:'41 casos de F2L',x:200,y:510},
  {text:"U (R U' R')",x:159,y:625},
  {text:"R U R' U'",x:159,y:645},
  {text:"y U' (L' U L)",x:420,y:625},
  {text:"F' U' F U",x:420,y:645}
 ]};
 const result=assignFixedCases([page],'f2l');
 assert.equal(result.cases.length,2);
 assert.equal(result.cases[0].case_id,'F2L-01');
 assert.equal(result.cases[1].case_id,'F2L-02');
 assert.equal(result.cases[0].algorithm,"U (R U' R')");
 assert.equal(result.cases[1].setup,"F' U' F U");
 assert.equal(result.cases[0].confidence,'ordem');
 assert.equal(result.incomplete,true);
});

test('algorithm detector rejects natural language and accepts CFOP notation',()=>{
 assert.equal(isAlgorithm("R U R' U'"),true);
 assert.equal(isAlgorithm("(M2' U M) U2 (M' U M2')"),true);
 assert.equal(isAlgorithm('Apenas Permutação de Meios'),false);
});

test('only the founder writes libraries, public users read approved entries',()=>{
 const sql=read('../../supabase/migrations/20261030_000007_libraries.sql');
 assert.match(sql,/REFERENCES public\.cfop_case_catalog\(case_id\)/i);
 assert.match(sql,/status='approved' AND EXISTS/i);
 assert.match(sql,/cfop_is_owner\(auth\.uid\(\)\)/i);
 assert.match(sql,/Identidade do caso é imutável/i);
 assert.match(sql,/cfop_library_publication_guard/i);
 const importer=read('../../assets/js/importer.js');
 assert.match(importer,/saveLibraryCase\(libraryId,r\)/);
 assert.match(importer,/assignFixedCases/);
 assert.match(importer,/cropDiagram/);
});

test('trainer library selection has a deliberate fallback for OLL mismatched numbering',()=>{
 const bridge=read('../../assets/js/library-trainer.js');
 assert.match(bridge,/if\(stage==='f2l'\)/);
 assert.match(bridge,/if\(stage==='pll'\)/);
 assert.match(bridge,/return null/);
 const coach=read('../../assets/js/secao.js');
 assert.match(coach,/currentLibraryVariant\(\)\?\.algorithm/);
 assert.match(coach,/currentLibraryVariant\(\)\?\.imageData/);
});

test('SQL das bibliotecas fecha todas as funções PostgreSQL com delimitadores válidos',()=>{
 const migration=read('../../supabase/migrations/20261030_000007_libraries.sql');
 const delim=String.fromCharCode(36,36);
 const lines=migration.split('\n').map(v=>v.trim());
 assert.equal(lines.filter(v=>v==='AS '+delim).length,3);
 assert.equal(lines.filter(v=>v===delim+';').length,3);
 assert.equal(lines.filter(v=>v==='AS '+delim[0]).length,0);
 assert.equal(lines.filter(v=>v===delim[0]+';').length,0);
});
