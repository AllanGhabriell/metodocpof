import test from 'node:test';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
const root=fileURLToPath(new URL('../../',import.meta.url));
test('novos módulos e páginas de conta/treino têm sintaxe JavaScript válida',()=>{
 for(const file of [
  'v2/app.js','v2/cloud/cloud.mjs','v2/cloud/admin.mjs',
  'v2/cloud/identity.mjs','v2/features/avatar-crop.mjs',
  'v2/features/achievements.mjs','v2/features/share-cards.mjs',
  'v2/features/progress.mjs','assets/js/secao.js','assets/js/scramble.js'
 ]){
  const run=spawnSync(process.execPath,['--check',file],{cwd:root,encoding:'utf8',timeout:6000});
  assert.equal(run.status,0,file+': '+(run.stderr||run.stdout));
 }
});
