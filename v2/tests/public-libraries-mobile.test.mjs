import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=p=>readFileSync(new URL(p,import.meta.url),'utf8');
const libraries=read('../cloud/libraries.mjs');
const bridge=read('../../assets/js/library-trainer.js');
const trainer=read('../../assets/js/secao.js');
const css=read('../../assets/css/trainer-unified.css');
const app=read('../app.js');
const sql=read('../../supabase/CFOP_LIBERAR_BIBLIOTECAS_PUBLICADAS.sql');

test('public libraries query is anonymous even when the visitor has a non-admin account',()=>{
 assert.match(libraries,/async function refreshPublicDirectory\(\)/);
 assert.match(libraries,/is_public=eq\.true&order=updated_at\.desc&limit=100',anon:true/);
 assert.match(libraries,/select=library_id,case_id,status&status=eq\.approved&limit=5000',anon:true/);
 assert.match(libraries,/publicCounts=counts/);
 assert.match(libraries,/publicCatalogError='Falha ao consultar bibliotecas/);
 assert.match(libraries,/export const publicCasesInStage=/);
 assert.match(libraries,/status=eq\.approved&limit=150',anon:true/);
 assert.match(libraries,/const requested=local&&typeof local==='object'&&local\.version===stamp/);
 assert.match(libraries,/if\(!loaded\.some\(r=>r\.status==='approved'/);
});
test('the trainer waits for published libraries, shows all publicly listed options with case counts',()=>{
 assert.match(bridge,/window\.CPOFLibrary\.ready=loadLibraries\(\)/);
 assert.match(bridge,/publicCasesInStage\(library\.id,stage\)/);
 assert.match(bridge,/option\.textContent=library\.title/);
 assert.match(bridge,/sem casos /);
 assert.match(trainer,/await window\.CPOFLibrary\.ready/);
 assert.doesNotMatch(trainer,/unexcludedCases\(\)\[0\] \|\| CASE_IDS\[0\]/);
 for(const stage of ['f2l','oll','pll']){
  const html=read('../../'+stage+'.html');
  assert.match(html,/id="case-image" src="data:image\/gif;base64,/);
  assert.doesNotMatch(html,new RegExp('id="case-image" src="'+stage+'\/'));
 }
});
test('mobile topbar puts the library below the heading and shows accessible 2 by 2 actions',()=>{
 const mobile=css.slice(css.lastIndexOf('/* Mobile V4:'));
 assert.ok(mobile.length>900);
 assert.match(mobile,/display:grid!important/);
 assert.match(mobile,/grid-template-columns:44px minmax\(0,1fr\) auto/);
 assert.match(mobile,/\.trainer-library-choice\{[\s\S]*?grid-column:1\/-1;/);
 assert.match(mobile,/grid-row:2;/);
 assert.match(mobile,/\.controls-row:not\(\.is-competitive\) #trainer-easy-btn\{/);
 assert.match(mobile,/\.controls-row:not\(\.is-competitive\) #skip-case-btn\{/);
 assert.match(mobile,/min-height:51px/);
});
test('public RLS grants reading of approved cases only, but not drafts',()=>{
 assert.match(sql,/CREATE POLICY cfop_libraries_public_select/);
 assert.match(sql,/USING \(is_public = true\)/);
 assert.match(sql,/CREATE POLICY cfop_library_cases_public_select/);
 assert.match(sql,/status='approved'/);
 assert.match(sql,/l\.is_public=true/);
 assert.doesNotMatch(sql,/GRANT (?:INSERT|UPDATE|DELETE) ON public\.cfop_library_cases TO anon/);
 assert.match(app,/Casos visíveis ao público:/);
 assert.match(app,/Rascunho · não aparece para outras pessoas/);
});
