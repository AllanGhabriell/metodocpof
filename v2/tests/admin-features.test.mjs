import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=path=>readFileSync(new URL(path,import.meta.url),'utf8');
const admin=read('../cloud/admin.mjs');
const app=read('../app.js');
const cloud=read('../cloud/cloud.mjs');
const online=read('../cloud/online.mjs');
const progress=read('../features/progress.mjs');
const sql=read('../../supabase/migrations/20261030_000006_admin_security_audit.sql');

test('administrative changes are performed only through authenticated RPC calls',()=>{
 assert.match(admin,/rpc\('cfop_manage_admin'/);
 assert.match(admin,/rpc\('cfop_manage_ban'/);
 assert.match(admin,/rpc\('cfop_admin_action'/);
 assert.match(admin,/is_owner/);
 assert.match(admin,/adminFilter/);
 assert.match(admin,/isOwner\?/);
});
test('published cases can be reopened for validation and removed from public library',()=>{
 assert.match(app,/case'publishededit'/);
 assert.match(app,/case'publishedremove'/);
 assert.match(app,/review:\{approved:false\}/);
 assert.match(app,/publishedCases\(\)/);
 assert.match(app,/unpublishCase\(id\)/);
});
test('adjustments from the server affect XP and level, not only an info label',()=>{
 assert.match(cloud,/export const adminXpAdjustment=/);
 assert.match(progress,/earnedXp\+adminXpAdjustment\(\)/);
 assert.match(progress,/level:Math\.floor\(xp\/200\)\+1/);
});
test('admin and online modules share the same authenticated cloud instance',()=>{
 for(const src of [admin,online,app,progress])
  assert.match(src,/cloud\.mjs\?v=20261030-54/);
});
test('database bans cover deletes, case publication and admin promotion',()=>{
 assert.match(sql,/drop policy if exists cfop_challenges_delete/);
 assert.match(sql,/drop policy if exists cfop_results_delete/);
 assert.match(sql,/cfop_cases_admin_insert/);
 assert.match(sql,/p_grant and not public\.cfop_user_allowed\(p_target\)/);
 assert.match(sql,/create trigger cfop_published_case_audit/);
});
