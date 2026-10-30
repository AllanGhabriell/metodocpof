import test from 'node:test';
import assert from 'node:assert/strict';
import {mergeCoachState,mergeCoachActivity,mergeCubeTimes} from '../cloud/coach-merge.mjs';
import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';
const root=resolve(import.meta.dirname,'../..');
const read=p=>readFileSync(resolve(root,p),'utf8');

test('sync merges F2L OLL PLL case histories without replacing newer manual reviews',()=>{
 const local={settings:{dailyGoal:12,weeklyGoal:80,goalPeriod:'daily',updatedAt:500},stages:{
  f2l:{cases:{'1':{attempts:2,lastAt:400,avgMs:3000},'2':{rating:'hard',ratedAt:900}}},
  oll:{cases:{'7':{attempts:1,lastAt:400}}},pll:{cases:{Ua:{attempts:3,lastAt:300}}}
 }};
 const remote={settings:{dailyGoal:15,weeklyGoal:90,goalPeriod:'weekly',updatedAt:700},stages:{
  f2l:{cases:{'1':{attempts:4,lastAt:600,avgMs:2800},'3':{rating:'easy',ratedAt:120}}},
  oll:{cases:{}},pll:{cases:{Ua:{attempts:1,lastAt:100}}}
 }};
 const result=mergeCoachState(local,remote);
 assert.equal(result.settings.goalPeriod,'weekly');
 assert.equal(result.settings.dailyGoal,15);
 assert.equal(result.stages.f2l.cases['1'].attempts,4);
 assert.equal(result.stages.f2l.cases['2'].rating,'hard');
 assert.equal(result.stages.f2l.cases['3'].rating,'easy');
 assert.equal(result.stages.oll.cases['7'].attempts,1);
 assert.equal(result.stages.pll.cases.Ua.attempts,3);
 assert.equal(result.stages.f2l.cases.__proto__,undefined);
});

test('sync merges practice events and scramble times without duplicating existing records',()=>{
 const a={uid:'one',stage:'f2l',caseId:'1',at:100,mode:'random',xp:8};
 const b={uid:'two',stage:'oll',caseId:'7',at:300,mode:'adaptive',xp:10};
 const c={uid:'three',stage:'pll',caseId:'Ua',at:200,mode:'competitive',xp:2};
 const items=mergeCoachActivity([a,b],[a,c]);
 assert.equal(items.length,3);
 assert.deepEqual(items.map(x=>x.uid),['one','three','two']);
 const t={date:'2026-10-30T10:00:00.000Z',ms:15000,scramble:'R U F'};
 const out=mergeCubeTimes([t],[t,{date:'2026-10-31T10:00:00.000Z',ms:13333,scramble:'L U F'}]);
 assert.equal(out.length,2);
});

test('browser sync references owner-scoped user state and preserves original backup data',()=>{
 const cloud=read('v2/cloud/cloud.mjs');
 for(const term of ['cfop_user_state','mergeCoachState','mergeCoachActivity','mergeCubeTimes','KEYS.coach','KEYS.academyActivity','KEYS.scrambleTimes'])assert.ok(cloud.includes(term),term);
 const sql=read('supabase/migrations/20261030_000001_cfop_backend.sql');
 assert.match(sql,/cfop_user_state/);
 assert.match(sql,/payload jsonb/);
 assert.match(sql,/alter table public.cfop_user_state enable row level security/i);
 const prog=read('v2/features/progress.mjs');
 assert.match(prog,/cpof-academy-coach-v1/);
 assert.match(prog,/cpof-scramble-times-v1/);
});
