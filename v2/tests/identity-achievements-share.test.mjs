import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {achievementCatalog,earnedAchievements,achievementBonus} from '../features/achievements.mjs';
const read=p=>readFileSync(new URL(p,import.meta.url),'utf8');
const sql=read('../../supabase/CFOP_PERFIS_UNICOS_AVATAR_MODERACAO.sql');
const cloud=read('../cloud/cloud.mjs');
const identity=read('../cloud/identity.mjs');
const crop=read('../features/avatar-crop.mjs');
const share=read('../features/share-cards.mjs');
const progress=read('../features/progress.mjs');
const app=read('../app.js');
const admin=read('../cloud/admin.mjs');
const trainer=read('../../assets/js/secao.js');
test('anonymous identity is always Cubista Anônimo and not registered on the database',()=>{
 assert.match(identity,/nickname:'Cubista Anônimo'/);
 assert.match(identity,/isAuthenticated\(\)/);
 assert.match(identity,/Entre na sua conta para salvar/);
 assert.match(identity,/Cubista Anônimo é reservado para visitantes/);
 assert.doesNotMatch(cloud,/await rest\('cfop_profiles',\{method:'POST'/);
 assert.match(progress,/id\\.userId\\?/);
});
test('SQL enforces nickname uniqueness case insensitive and handles existing duplicates',()=>{
 assert.match(sql,/CREATE UNIQUE INDEX IF NOT EXISTS cfop_profiles_unique_nickname/);
 assert.match(sql,/lower\(btrim\(nickname\)\)/);
 assert.match(sql,/row_number\(\) OVER/);
 assert.match(sql,/length\(btrim\(nickname\)\)>36/);
 assert.match(sql,/cfop_set_identity/);
 assert.match(sql,/EXCEPTION WHEN unique_violation/);
 assert.match(sql,/REVOKE INSERT,UPDATE,DELETE ON public\\.cfop_profiles FROM anon,authenticated/);
 assert.match(sql,/cfop_profiles_avatar_valid/);
 assert.match(sql,/octet_length\(avatar_data\)<=80000/);
 assert.match(sql,/GRANT EXECUTE ON FUNCTION public\\.cfop_set_identity\(text,boolean,text\) TO authenticated/);
});
test('avatar editor requires square crop and WebP compression, never uploads raw file',()=>{
 assert.match(crop,/const PREVIEW=288/);
 assert.match(crop,/pointerdown/);assert.match(crop,/pointermove/);
 assert.match(crop,/current\\.zoom/);
 assert.match(crop,/output\\.width=size;output\\.height=size/);
 assert.ok(crop.includes("toDataURL('image/webp',quality)"));
 assert.match(crop,/final\\.length<79000/);
 assert.match(identity,/id="cfop-avatar-file"/);
 assert.match(app,/openAvatarCrop\(e\\.target\\.files\\?\\.\\[0\\]\\)/);
 assert.match(app,/exportAvatarCrop\\(\\)/);
});
test('admin can see and delete photo and restrict name or avatar, actions are checked server-side',()=>{
 assert.match(sql,/cfop_admin_identity_list/);
 assert.match(sql,/cfop_admin_identity_action/);
 assert.match(sql,/p_target=v_actor OR public\\.cfop_is_admin\(p_target\)/);
 assert.match(sql,/name_locked/);
 assert.match(sql,/avatar_blocked/);
 assert.match(sql,/p_action='block_photo'/);
 assert.match(admin,/admin-avatar-preview/);
 assert.match(admin,/data-admin="remove_photo"/);
 assert.match(admin,/data-admin="block_photo"/);
 assert.match(admin,/data-admin="lock_name"/);
});
test('first training mode is sequential, subsequent mode switches are saved',()=>{
 assert.match(trainer,/trainingMode: 'sequential'/);
 assert.match(trainer,/modeChosen: false/);
 assert.match(trainer,/if\(!existingPreference\\.modeChosen&&!practicedBefore/);
 assert.match(trainer,/state\\.modeChosen=true/);
 assert.match(trainer,/C\\.setCookie\(STATE_KEY, state, 365\)/);
});
test('achievements cover every CFOP stage, Cross, days, solves and record thresholds',()=>{
 assert.ok(achievementCatalog.length>=18);
 const ids=new Set(achievementCatalog.map(a=>a.id));
 for(const id of ['f2l','oll','pll','all','allcross','cross','streak3','streak7','streak30','firstsolve','sub60','sub30'])
  assert.ok(ids.has(id),id);
 assert.ok(earnedAchievements([]).every(a=>!a.earned));
 assert.equal(achievementBonus([]),0);
 assert.match(progress,/achievementBonus\(data\\.records\)/);
});
test('social card is vertical PNG with username, best 5 times, and native file share',()=>{
 assert.match(share,/const W=1080,H=1920/);
 assert.match(share,/identityState\(\)\\.nickname/);
 assert.match(share,/\\.sort\(\(a,b\)=>a-b\)\\.slice\(0,5\)/);
 assert.match(share,/Média dos/);
 assert.match(share,/canvas\\.toBlob/);
 assert.match(share,/new File\\(\\[blob\\]/);
 assert.match(share,/navigator\\.canShare/);
 assert.match(share,/navigator\\.share/);
 assert.match(share,/a\\.download=file\\.name/);
 assert.match(app,/shareSection\(\)/);
});
