import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=p=>readFileSync(new URL(p,import.meta.url),'utf8');
const sql=read('../../supabase/CFOP_CORRIGIR_LEITURA_PUBLICA_SEM_LOGIN.sql');
const css=read('../../assets/css/trainer-unified.css');
const bridge=read('../../assets/js/library-trainer.js');

test('anonymous reading never calls restricted founder function',()=>{
 assert.match(sql,/ALTER TABLE public\.cfop_libraries ENABLE ROW LEVEL SECURITY/);
 assert.match(sql,/ALTER TABLE public\.cfop_library_cases ENABLE ROW LEVEL SECURITY/);
 assert.match(sql,/FOR item IN SELECT policyname FROM pg_policies/);
 assert.match(sql,/cfop_libraries_visible_to_everyone/);
 assert.match(sql,/cfop_library_cases_visible_to_everyone/);
 const publicReading=sql.slice(sql.indexOf('CREATE POLICY cfop_libraries_visible_to_everyone'),sql.indexOf('-- Leitura privada'));
 assert.doesNotMatch(publicReading,/cfop_is_owner|cfop_user_allowed/);
 assert.match(publicReading,/USING \(is_public = true\)/);
 assert.match(publicReading,/status='approved'/);
 assert.match(publicReading,/l\.is_public=true/);
 assert.match(sql,/REVOKE EXECUTE ON FUNCTION public\.cfop_is_owner\(uuid\) FROM PUBLIC,anon/);
 assert.match(sql,/SET LOCAL ROLE anon;/);
 assert.match(sql,/RESET ROLE;/);
 assert.match(sql,/NOTIFY pgrst, 'reload schema'/);
});

test('founder still has separate SELECT and scoped write policies',()=>{
 for(const x of ['cfop_libraries_founder_read','cfop_libraries_founder_insert','cfop_libraries_founder_update',
  'cfop_libraries_founder_delete','cfop_library_cases_founder_read','cfop_library_cases_founder_insert',
  'cfop_library_cases_founder_update','cfop_library_cases_founder_delete'])assert.ok(sql.includes(x),x);
 assert.doesNotMatch(sql,/GRANT (INSERT|UPDATE|DELETE) ON [^;]* TO anon/);
});

test('desktop and mobile header sit in document flow instead of covering the training toolbar',()=>{
 const v5=css.slice(css.lastIndexOf('Trainer layout V5'));
 assert.ok(v5.length>1000);
 assert.match(v5,/position:relative!important/);
 assert.match(v5,/height:auto!important/);
 assert.match(v5,/min-height:0!important/);
 assert.match(v5,/overflow:visible!important/);
 assert.match(v5,/@media\(min-width:761px\)/);
 assert.match(v5,/@media\(max-width:760px\)/);
 assert.match(v5,/grid-template-columns:56px minmax\(0,1fr\) minmax\(185px,250px\) auto/);
 assert.match(v5,/padding:12px 12px calc\(26px/);
});

test('easy and difficult actions are neon and remain distinguishable',()=>{
 const v5=css.slice(css.lastIndexOf('Trainer layout V5'));
 assert.match(v5,/\.trainer-case-action\.action-easy\{/);
 assert.match(v5,/\.trainer-case-action\.action-hard\{/);
 assert.match(v5,/#49e8a6/);
 assert.match(v5,/#ff9b5c/);
 assert.match(v5,/box-shadow:0 0 14px/);
 assert.match(bridge,/Acesso público bloqueado no Supabase/);
});
