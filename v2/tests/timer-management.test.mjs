import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {normalizeAll,effective,statistics,averageOf,csv} from '../timer/records.mjs';
const root=resolve(import.meta.dirname,'../..');
test('Legacy local timers migrate without destroying date, time or scramble',()=>{
 const old=[{ms:24000,scramble:'R U',date:'2026-10-31T12:00:00Z'},{ms:20340,scramble:'F L',date:'2026-10-31T12:01:00Z'}];
 const rows=normalizeAll(old);
 assert.equal(rows.length,2);assert.equal(rows[0].ms,24000);assert.equal(rows[0].scramble,'R U');
 assert.notEqual(rows[0].id,rows[1].id);assert.equal(rows[0].penalty,'OK');
});
test('Penalty +2 and DNF change statistics without deleting an original result',()=>{
 let rows=normalizeAll(Array.from({length:5},(_,i)=>({ms:(10+i)*1000,scramble:'R U',date:'2026-10-31T12:00:00Z',id:'r'+i})));
 assert.equal(statistics(rows).best,10000);assert.equal(statistics(rows).ao5,12000);
 rows[0].penalty='+2';assert.equal(effective(rows[0]),12000);
 rows[1].penalty='DNF';assert.equal(statistics(rows).dnf,1);
 assert.ok(Number.isFinite(averageOf(rows,5))); // One DNF is trimmed.
 rows[2].penalty='DNF';assert.equal(averageOf(rows,5),Infinity);
});
test('Archived solves and comments remain available for backup',()=>{
 const rows=normalizeAll([{id:'1',ms:14000,date:'2026-10-31T12:00:00Z',scramble:'R U',comment:'treino',session:'Cross',archived:true}]);
 assert.equal(rows[0].archived,true);assert.equal(rows[0].comment,'treino');
 assert.match(csv(rows),/treino/);assert.match(csv(rows),/Cross/);
});
test('Both timers load shared history UI and avoid small accidental solves',()=>{
 const main=readFileSync(resolve(root,'assets/js/scramble.js'),'utf8');
 const cross=readFileSync(resolve(root,'v2/features/cross-timer.mjs'),'utf8');
 assert.match(main,/createTimerHistory/);assert.match(cross,/createTimerHistory/);
 assert.match(main,/elapsed<2000/);assert.match(cross,/elapsed<2000/);
 assert.match(main,/recordTimerSolve\('3x3'/);assert.match(cross,/recordTimerSolve\('cross'/);
});
test('Admin RPC is access controlled and no individual comments are uploaded',()=>{
 const migration=readFileSync(resolve(root,'supabase/migrations/20261031_000012_timer_analytics.sql'),'utf8');
 assert.match(migration,/cfop_is_admin\(auth\.uid\(\)\)/);
 assert.doesNotMatch(migration,/comment text/i);assert.doesNotMatch(migration,/scramble text/i);
 const admin=readFileSync(resolve(root,'v2/cloud/admin-timer.mjs'),'utf8');
 assert.match(admin,/adminTimerInsights/);assert.match(admin,/Treinos do usuário selecionado/);
});
