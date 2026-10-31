import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=path=>readFileSync(new URL(path,import.meta.url),'utf8');
const app=read('../app.js'),libraries=read('../cloud/libraries.mjs'),trainer=read('../../assets/js/library-trainer.js');
const secao=read('../../assets/js/secao.js'),importer=read('../../assets/js/importer.js'),sw=read('../../sw.js');
const sql=read('../../supabase/migrations/20261031_000008_private_original.sql');

test('student library no longer combines builtin PDF records with published ones',()=>{
 assert.match(app,/function availableCases\(stage\)\{return libraryCases\(stage\)\}/);
 assert.doesNotMatch(app,/fetch\('\.\/v2\/data\/pdf-cases\.json'\)/);
 assert.match(app,/admin-base/);
 assert.match(app,/originalCases\('f2l'\)/);
 assert.match(app,/original-delete/);
});
test('private base is owner only, deleted on server and never allowed after removal',()=>{
 assert.match(libraries,/const DEFAULT='none',ORIGINAL='original'/);
 assert.match(libraries,/isOriginalOwner=/);
 assert.match(libraries,/loadOriginalBase/);
 assert.match(libraries,/deleted_at/);
 assert.match(libraries,/rpc\/cfop_delete_original_base/);
 assert.match(libraries,/if\(id===ORIGINAL\)/);
 assert.match(sql,/cfop_original_base_control/);
 assert.match(sql,/cfop_original_base_cases/);
 assert.match(sql,/cfop_cases_owner_read/);
 assert.doesNotMatch(sql,/CREATE POLICY cfop_cases_public_read/);
 assert.match(sql,/DELETE FROM public\.cfop_original_base_cases/);
 assert.match(sql,/cfop_is_owner\(auth\.uid\(\)\)/);
});
test('trainees do not expose initial image, algorithm or gallery outside approved library',()=>{
 assert.match(trainer,/allowed\(stage,ids\)/);
 assert.match(trainer,/selectedVariants\(\)/);
 assert.match(trainer,/Base original \(privada\)/);
 assert.doesNotMatch(trainer,/basic\.textContent='Original'/);
 assert.match(secao,/publicAllowedIds\(\)/);
 assert.match(secao,/if\(!window\.CPOFLibrary\)/);
 assert.match(secao,/unavailableImage\(/);
 assert.doesNotMatch(secao,/\`<img src="\$\{pageSet\}\/\$\{caseId\}\.png"/);
 assert.doesNotMatch(sw,/['"]\.\/v2\/data\/pdf-cases\.json['"]/);
});
test('importer recognition uses private reference and not the original public JSON',()=>{
 assert.match(importer,/await loadOriginalBase\(\)/);
 assert.match(importer,/flatMap\(originalCases\)/);
 assert.doesNotMatch(importer,/fetch\('\.\/v2\/data\/pdf-cases\.json'\)/);
});
test('delete RPC is protected and the migration has correctly paired delimiters',()=>{
 const delim=String.fromCharCode(36,36);
 assert.equal((sql.match(/AS \$\$/g)||[]).length,(sql.match(/\$\$;/g)||[]).length);
 assert.match(sql,/REVOKE ALL ON FUNCTION public\.cfop_delete_original_base\(\) FROM PUBLIC,anon/);
 assert.match(sql,/GRANT EXECUTE ON FUNCTION public\.cfop_delete_original_base\(\) TO authenticated/);
});
