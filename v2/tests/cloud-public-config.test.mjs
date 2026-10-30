import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';

const root=resolve(import.meta.dirname,'../..');
const read=p=>readFileSync(resolve(root,p),'utf8');
const CONF='cfop-cloud-config-v1';
const AUTH='cfop-cloud-session-v1';
function storage(initial={}){
 const data=new Map(Object.entries(initial));
 return {
  getItem:key=>data.has(key)?data.get(key):null,
  setItem:(key,value)=>data.set(key,String(value)),
  removeItem:key=>data.delete(key)
 };
}

test('public config loads automatically in a new browser without asking for keys',async()=>{
 globalThis.localStorage=storage();
 const cloud=await import('../cloud/cloud.mjs?setup=new-device');
 const {PUBLIC_SUPABASE_CONFIG}=await import('../cloud/project-config.mjs');
 assert.equal(cloud.isConfigured(),true);
 assert.equal(cloud.cloudStatus().authenticated,false);
 assert.equal(cloud.isAdmin(),false);
 assert.deepEqual(JSON.parse(localStorage.getItem(CONF)),{
  url:PUBLIC_SUPABASE_CONFIG.url,
  key:PUBLIC_SUPABASE_CONFIG.publishableKey
 });
 assert.match(cloud.cloudPanel(),/Continuar com Google/);
 assert.match(cloud.cloudPanel(),/Entrar com e-mail e senha/);
 assert.doesNotMatch(cloud.cloudPanel(),/Conectar minha conta/);
 assert.doesNotMatch(cloud.cloudPanel(),/cloud-configuration/);
});

test('old project sessions are disconnected without deleting local training history',async()=>{
 const oldSession={access_token:'old-token',refresh_token:'old-refresh',user:{id:'unrelated-project-account'}};
 const progress={name:'Cubista',records:[{xp:8,date:'2026-10-30'}]};
 globalThis.localStorage=storage({
  [CONF]:JSON.stringify({url:'https://other-project.supabase.co',key:'old-anon-key'}),
  [AUTH]:JSON.stringify(oldSession),
  'cfop-studio-progress-v1':JSON.stringify(progress)
 });
 const cloud=await import('../cloud/cloud.mjs?setup=old-project');
 assert.equal(cloud.isConfigured(),true);
 assert.equal(cloud.isAuthenticated(),false);
 assert.equal(localStorage.getItem(AUTH),'null');
 assert.deepEqual(JSON.parse(localStorage.getItem('cfop-studio-progress-v1')),progress);
});

test('configured project cannot be silently overwritten by browser settings',async()=>{
 globalThis.localStorage=storage();
 const cloud=await import('../cloud/cloud.mjs?setup=locked');
 assert.throws(()=>cloud.configureCloud('https://foreign.supabase.co','sb_publishable_other_public_key_123'),/já tem um projeto Supabase público configurado/);
 assert.equal(cloud.cloudStatus().configured,true);
 cloud.disconnectCloud();
 assert.equal(cloud.cloudStatus().configured,true);
 assert.equal(cloud.isAuthenticated(),false);
});

test('public GitHub Pages config has only a publishable key, never service role',async()=>{
 const {PUBLIC_SUPABASE_CONFIG}=await import('../cloud/project-config.mjs');
 assert.match(PUBLIC_SUPABASE_CONFIG.url,/^https:\/\/[a-z0-9-]+\.supabase\.co$/);
 assert.match(PUBLIC_SUPABASE_CONFIG.publishableKey,/^sb_publishable_/);
 assert.ok(!PUBLIC_SUPABASE_CONFIG.publishableKey.startsWith('sb_secret_'));
 assert.ok(!PUBLIC_SUPABASE_CONFIG.publishableKey.includes('service_role'));
 const src=read('v2/app.js');
 assert.ok(!src.includes("id==='cloud-configuration'"));
 assert.ok(!src.includes("cmd==='disconnect'"));
 const file=read('v2/cloud/cloud.mjs');
 assert.ok(file.includes("from './project-config.mjs'"));
 assert.ok(file.includes('const hasSameProject='));
});

test('existing Supabase database migration has user-scoped state and RLS',()=>{
 const sql=read('supabase/migrations/20261030_000001_cfop_backend.sql');
 assert.match(sql,/create table if not exists public.cfop_user_state/);
 assert.match(sql,/payload jsonb not null/);
 assert.match(sql,/alter table public.cfop_user_state enable row level security/);
 assert.match(sql,/create policy cfop_state_read[\s\S]*?user_id = \(select auth.uid\(\)\)/);
});
