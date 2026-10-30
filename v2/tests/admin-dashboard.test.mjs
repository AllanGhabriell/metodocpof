import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const app=readFileSync(new URL('../app.js',import.meta.url),'utf8');
const admin=readFileSync(new URL('../cloud/admin.mjs',import.meta.url),'utf8');
const cloud=readFileSync(new URL('../cloud/cloud.mjs',import.meta.url),'utf8');
test('admin dashboard only accessible to authorized users',()=>{assert.match(app,/if\(page==='admin-users'\)return isAdmin\(\)\?adminPanel\(\)/);assert.match(app,/group==='profile'&&isAdmin\(\)\?adminItems/);assert.match(admin,/if\(!isAdmin\(\)\)/);});
test('admin actions and audit are server-side RPC calls',()=>{assert.match(admin,/rpc\('cfop_admin_users'\)/);assert.match(admin,/rpc\('cfop_admin_action'/);assert.match(admin,/rpc\('cfop_admin_audit_recent'\)/);});
test('activity tracking is only for authenticated foreground sessions',()=>{assert.match(cloud,/document\.visibilityState!=='visible'/);assert.match(cloud,/if\(!isAuthenticated\(\)\)return/);assert.match(app,/recordActivity\(0,false,1\)/);});
