import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';
const root=resolve(import.meta.dirname,'../..');
const file=p=>readFileSync(resolve(root,p),'utf8');
const db=file('supabase/migrations/20261031_000014_identity_admin_notifications.sql');
const cloud=file('v2/cloud/cloud.mjs');
const identity=file('v2/cloud/identity.mjs');
const timerHtml=file('scramble.html');
const timerCss=file('assets/css/timer-upgrade.css');
const timerJs=file('assets/js/scramble.js');

test('3D cube stays under timer and is enabled by default without vertical page scrolling',()=>{
 const timer=timerHtml.slice(timerHtml.indexOf('<section data-panel="timer"'),timerHtml.indexOf('<section data-panel="history"'));
 assert.ok(timer.indexOf('scramble-clock')<timer.indexOf('scramble-cube-section'));
 assert.match(timer,/<section class="scramble-cube-section" aria-label=/);
 assert.match(timerJs,/preview.checked=localStorage.getItem\(previewKey\)!=='false'/);
 assert.match(timerCss,/height:clamp\(152px,27dvh,215px\)/);
 assert.match(timerCss,/html\.scramble-scroll-locked\{height:100%;overflow:hidden!important/);
});
test('administrator does not have own profile name and photo quota or cooldown',()=>{
 assert.match(db,/v_admin:=public\.cfop_is_admin\(v_user\)/);
 assert.match(db,/v_name_changed AND NOT v_admin/);
 assert.match(db,/v_avatar_changed AND NOT v_admin/);
 assert.match(db,/v_locked AND NOT v_admin/);
 assert.match(db,/v_blocked AND p_avatar_data IS NOT NULL AND NOT v_admin/);
 assert.match(db,/CASE WHEN v_admin THEN 999999/);
 assert.match(identity,/const privileged=isAdmin\(\)/);
 assert.match(identity,/Alterações ilimitadas para administradores/);
});
test('regular profiles get six photo changes daily, with increasing secure server wait',()=>{
 assert.match(db,/v_avatar_count>=6/);
 assert.match(db,/WHEN 1 THEN 5 WHEN 2 THEN 15/);
 assert.match(db,/WHEN 3 THEN 30 WHEN 4 THEN 60 ELSE 120/);
 assert.match(db,/photo_remaining:=CASE WHEN v_admin THEN 999999 ELSE greatest\(0,6-photo_used\)/);
 assert.match(identity,/Até 6 mudanças por dia/);
});
test('account changes are audited and trigger signed, persistent account notices',()=>{
 assert.match(db,/CREATE TRIGGER cfop_notify_admin_account_action_trg AFTER INSERT ON public\.cfop_admin_audit/);
 for(const change of ['xp','profile_rename','profile_remove_photo','profile_block_photo','grant_admin','ban','adjust_solves'])
  assert.ok(db.includes("'"+change+"'"),change+' must notify');
 assert.match(db,/INSERT INTO public\.cfop_user_notifications\(user_id,sent_by,body,priority\)/);
 assert.match(db,/CREATE TRIGGER cfop_notice_stamp_sender_trg BEFORE INSERT/);
 assert.match(db,/public\.cfop_is_owner\(NEW\.sent_by\)/);
});
test('sender name/avatar and founder frame displayed without exposing sensitive fields',()=>{
 assert.match(cloud,/noticeSenderMarkup/);
 assert.match(cloud,/cfop-notice-sender-creator/);
 assert.match(cloud,/actor_name,actor_avatar,actor_is_creator/);
 assert.match(file('assets/js/notice-banner.js'),/noticeSenderMarkup\(next\)/);
 assert.match(file('assets/css/notice-banner.css'),/cfop-notice-sender-creator/);
 assert.doesNotMatch(db,/cfop_user_journey/);
});
