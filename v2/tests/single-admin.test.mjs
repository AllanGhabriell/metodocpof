import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const load=name=>readFileSync(new URL('../../supabase/migrations/'+name,import.meta.url),'utf8');
const allowlist=load('20261030_000002_admin_allowlist.sql');
const owners=load('20261030_000004_admin_roles_bans.sql');
const update=load('20261030_000005_single_admin.sql');
const email='coelhodatoca124@gmail.com';

test('only the designated account is on the automatic admin and owner lists',()=>{
 for(const sql of [allowlist,owners,update]){
  assert.match(sql,/coelhodatoca124@gmail\.com/);
  assert.doesNotMatch(sql,/allanghabriell8@gmail\.com|allanghabriell572@gmail\.com/);
 }
 assert.match(allowlist,/lower\(new\.email\) = 'coelhodatoca124@gmail\.com'/);
 assert.match(owners,/lower\(u\.email\) = 'coelhodatoca124@gmail\.com'/);
});

test('existing admin grants are reconciled without deleting accounts',()=>{
 assert.match(update,/delete from public\.cfop_admins[\s\S]*?where user_id not in/);
 assert.match(update,/insert into public\.cfop_admins \(user_id\)/);
 assert.match(update,/email_confirmed_at is not null/);
 assert.doesNotMatch(update,/delete from auth\.users|delete from public\.cfop_user_state/);
});
