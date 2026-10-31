import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {MAX_LEVEL,levelFromXp,totalForLevel,titleFor,defaultRewards,normalizedRewards} from '../features/progression.mjs';
const repo=resolve(import.meta.dirname,'../..');
const read=p=>readFileSync(resolve(repo,p),'utf8');
test('XP curve grows steeply and Legendary cannot be farmed in one day',()=>{
 assert.equal(MAX_LEVEL,500);
 assert.equal(levelFromXp(0).level,1);
 assert.equal(titleFor(150),'Lendário');
 for(let n of [1,5,10,50,100,150,200,300,500])assert.equal(levelFromXp(totalForLevel(n)).level,n);
 for(let n=1;n<500;n++)assert.ok(totalForLevel(n+1)>totalForLevel(n));
 assert.ok(totalForLevel(150)>80*365,'server max daily XP must take over 1 year to reach Legendary');
});
test('Cosmetics catalog has choices, levels and rejects malformed user-provided styles',()=>{
 assert.ok(defaultRewards.length>=20);
 for(const kind of ['frame','name','aura','background','card','badge'])
  assert.ok(defaultRewards.some(x=>x.kind===kind&&x.min_level>1));
 const list=normalizedRewards([{id:'custom-title',title:'Soberano',kind:'title',style_key:'gold',min_level:90},
 {id:'<img>',title:'malicious',kind:'title',style_key:'classic',min_level:1}]);
 assert.ok(list.some(x=>x.id==='custom-title'));
 assert.ok(!list.some(x=>x.id==='<img>'));
});
test('Creator status is server-authenticated and catalogue writes require admin',()=>{
 const migration=read('supabase/migrations/20261031_000013_profile_progression.sql');
 assert.match(migration,/cfop_my_creator_status/);
 assert.match(migration,/public\.cfop_is_owner\(auth\.uid\(\)\)/);
 assert.match(migration,/public\.cfop_is_admin\(v_actor\)/);
 assert.match(migration,/ALTER TABLE public\.cfop_user_journey ENABLE ROW LEVEL SECURITY/);
 assert.match(migration,/USING\(user_id=\(SELECT auth\.uid\(\)\)\)/);
 assert.match(migration,/cfop_reward_catalog/);
});
test('Studio integrates optional learning, creator identity and admin reward panel',()=>{
 const app=read('v2/app.js'),profile=read('v2/features/progress.mjs'),admin=read('v2/cloud/admin.mjs');
 const user=read('v2/features/journey.mjs'),shared=read('v2/features/share-cards.mjs');
 assert.match(app,/journeyAnswers/);assert.match(app,/journeyEquip/);
 assert.match(profile,/journeyPanel/);assert.match(profile,/levelFromXp/);
 assert.match(admin,/adminRewardsPanel/);
 assert.match(user,/Deus Criador dos Cubos/);
 assert.match(user,/Tudo aqui é opcional/);
 assert.doesNotMatch(shared,/nível técnico|nivel tecnico|avaliação técnica|diagnóstico técnico/i);
});
