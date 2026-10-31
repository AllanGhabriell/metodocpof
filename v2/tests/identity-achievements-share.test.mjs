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
const has=(source,spans)=>{for(const span of spans)assert.ok(source.includes(span),'Trecho ausente: '+span)};

test('visitante recebe Cubista Anônimo e nunca grava um nome genérico na base',()=>{
 has(identity,["nickname:'Cubista Anônimo'","isAuthenticated()","Cubista Anônimo é reservado para visitantes"]);
 assert.ok(!cloud.includes("await rest('cfop_profiles',{method:'POST'"));
 has(progress,["id.userId?"]);
});
test('SQL garante nome exclusivo sem distinção de maiúsculas e trata cadastros antigos',()=>{
 has(sql,['CREATE UNIQUE INDEX IF NOT EXISTS cfop_profiles_unique_nickname','lower(btrim(nickname))','row_number() OVER',
 'length(btrim(nickname))>36','cfop_set_identity','EXCEPTION WHEN unique_violation',
 'REVOKE INSERT,UPDATE,DELETE ON public.cfop_profiles FROM anon,authenticated',
 'cfop_profiles_avatar_valid','octet_length(avatar_data)<=80000',
 'GRANT EXECUTE ON FUNCTION public.cfop_set_identity(text,boolean,text) TO authenticated']);
});
test('editor permite arrastar e aproximar foto quadrada, exportando só WebP',()=>{
 has(crop,['const PREVIEW=288','pointerdown','pointermove','current.zoom','output.width=size;output.height=size',
 "toDataURL('image/webp',quality)",'final.length<79000']);
 has(identity,['id="cfop-avatar-file"']);has(app,['openAvatarCrop(e.target.files?.[0])','exportAvatarCrop()']);
});
test('fundador pode visualizar, excluir e bloquear foto e alterações de nome',()=>{
 has(sql,['cfop_admin_identity_list','cfop_admin_identity_action','p_target=v_actor OR public.cfop_is_admin(p_target)',
 'name_locked','avatar_blocked',"p_action='block_photo'"]);
 has(admin,['admin-avatar-preview','data-admin="remove_photo"','block_photo','lock_name']);
});
test('modo Sequencial é inicial e mudanças de modo persistem',()=>{
 has(trainer,["trainingMode: 'sequential'","modeChosen: false","!existingPreference.modeChosen&&!practicedBefore",
 'state.modeChosen=true','C.setCookie(STATE_KEY, state, 365)']);
});
test('conquistas cobrem CFOP, Cross, sequências e recordes',()=>{
 assert.ok(achievementCatalog.length>=18);
 const ids=new Set(achievementCatalog.map(a=>a.id));
 for(const id of ['f2l','oll','pll','all','allcross','cross','streak3','streak7','streak30','firstsolve','sub60','sub30'])assert.ok(ids.has(id),id);
 assert.ok(earnedAchievements([]).every(a=>!a.earned));
 assert.equal(achievementBonus([]),0);
 has(progress,['achievementBonus(data.records)']);
});
test('imagem compartilhável contém nome, cinco melhores tempos e arquivo PNG',()=>{
 has(share,['const W=1080,H=1920','identityState().nickname','.sort((a,b)=>a-b).slice(0,5)',
 'Média dos','canvas.toBlob','new File([blob]','navigator.canShare','navigator.share','a.download=file.name']);
 has(app,['shareSection()']);
});
