import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';
const root=resolve(import.meta.dirname,'../..');
const read=p=>readFileSync(resolve(root,p),'utf8');
const html=read('scramble.html'),timer=read('assets/js/scramble.js'),style=read('assets/css/timer-upgrade.css');
const record=read('v2/timer/records.mjs'),profile=read('v2/features/share-profile.mjs');
const share=read('v2/features/share-cards.mjs');

test('every timer PNG is personalized with the verified nickname, avatar frame, RPG rank, XP and level',()=>{
 assert.match(record,/import \{addShareProfile\} from/);
 assert.match(record,/cfopShareProfile='pending'/);
 assert.match(record,/await addShareProfile\(canvas/);
 assert.match(profile,/identityState\(\)/);
 assert.match(profile,/journeyIdentity\(xp\)/);
 assert.match(profile,/progressSummary\(\)\.xp/);
 assert.match(profile,/rank\.frame/);
 for(const field of ['identity.avatar','identity.nickname','rank.title','rank.level','XP'])
  assert.ok(profile.includes(field),field);
 assert.match(share,/await addShareProfile\(canvas,\{top:1530,height:240\}\)/);
});
test('mouse and finger rotate 3D without arrow controls; a tap triggers the timer',()=>{
 assert.match(timer,/addEventListener\('pointerdown'/);
 assert.match(timer,/addEventListener\('pointermove'/);
 assert.match(timer,/addEventListener\('pointerup'/);
 assert.match(timer,/setPointerCapture/);
 assert.match(timer,/rotateCube\(\)/);
 assert.match(timer,/if\(!p\.moved\)/);
 assert.match(timer,/else if\(view==='timer'/);
 assert.match(style,/touch-action:none/);
 assert.doesNotMatch(html,/id="cube-left"|id="cube-right"|id="cube-up"|id="cube-down"/);
 assert.match(html,/id="cube-size-toggle"/);
});
test('mini cube expands on touch, regular cube remains below timer without scroll',()=>{
 assert.match(timer,/cubeMiniKey='academy-scramble-cube-mini-v1'/);
 assert.match(timer,/if\(cubeMini\)toggleCubeSize\(\)/);
 assert.match(style,/\.scramble-cube-section\.cube-mini/);
 assert.match(style,/height:82px!important/);
 assert.match(style,/html\.scramble-scroll-locked\{height:100%;overflow:hidden!important/);
});
test('desktop Space works on hold-release and intercepts focused buttons before native activation',()=>{
 assert.match(timer,/let spaceHeld=false,spaceArmed=false/);
 assert.match(timer,/setTimeout\(\(\)=>\{/);
 assert.match(timer,/},350\)/);
 assert.match(timer,/addEventListener\('keydown'/);
 assert.match(timer,/addEventListener\('keyup'/);
 assert.match(timer,/},true\)/);
 assert.match(timer,/e\.preventDefault\(\)/);
 assert.match(timer,/if\(spaceArmed\)\{spaceArmed=false;action\(\)\}/);
 assert.match(style,/body\.timer-space-ready/);
});
test('faster-than-2.51s personal times show a small joke without a punitive flag',()=>{
 assert.match(timer,/WORLD_RECORD_3X3_MS=2510/);
 assert.match(timer,/if\(ms>=WORLD_RECORD_3X3_MS\)return/);
 assert.match(timer,/recordJoke\(elapsed\)/);
 assert.match(html,/id="scramble-world-joke"/);
 assert.match(style,/\.scramble-world-joke:not\(\[hidden\]\)/);
 assert.doesNotMatch(timer,/cheater_flag|banUser|suspendAccount/);
});
