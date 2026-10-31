import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=p=>readFileSync(new URL(p,import.meta.url),'utf8');
const app=read('../app.js');
const lib=read('../cloud/libraries.mjs');
const sql=read('../../supabase/CFOP_CORRIGIR_SALVAMENTO_DAS_BASES.sql');

test('SQL de correção roda em uma transação e tem delimitadores válidos',()=>{
 assert.equal((sql.match(/^BEGIN;$/gm)||[]).length,1);
 assert.equal((sql.match(/^COMMIT;$/gm)||[]).length,1);
 assert.equal((sql.match(/AS \$\$/g)||[]).length,5);
 assert.equal((sql.match(/\$\$;/g)||[]).length,5);
 assert.doesNotMatch(sql,/AS \$(?!\$)/);
 assert.match(sql,/CREATE TABLE IF NOT EXISTS public\.cfop_stage_defaults/);
 assert.match(sql,/INSERT INTO public\.cfop_stage_defaults/);
 assert.match(sql,/CREATE OR REPLACE FUNCTION public\.cfop_set_stage_default/);
 assert.match(sql,/GRANT EXECUTE ON FUNCTION public\.cfop_set_stage_default\(text,text,uuid\) TO authenticated/);
 assert.match(sql,/NOTIFY pgrst, 'reload schema'/);
});
test('salvar padrão lê confirmação do banco e nunca informa sucesso sem confirmar',()=>{
 assert.match(lib,/await cloudTable\('rpc\/cfop_set_stage_default'/);
 assert.match(lib,/await loadStageDefaults\(\{strict:true\}\)/);
 assert.match(lib,/actual\.source!==source/);
 assert.match(lib,/stageDefaultsLoaded=false/);
 assert.match(lib,/stageDefaultsError=describeDefaultError\(e\)/);
 assert.match(app,/Salvo e confirmado no Supabase/);
 assert.match(app,/Não foi salvo:/);
});
test('seleção pendente sobrevive a renders e rascunhos exigem publicação',()=>{
 assert.match(app,/let stageDefaultPending=Object\.create\(null\)/);
 assert.match(app,/stageDefaultPending\[name\]=e\.target\.value/);
 assert.match(app,/hasOwnProperty\.call\(stageDefaultPending,stage\)/);
 assert.match(app,/publique antes/);
 assert.match(app,/o\.disabled\?' disabled':''/);
 assert.match(app,/data-default-feedback/);
 assert.match(lib,/ainda está em rascunho/);
});
