import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {solved,apply,facelets} from '../cube/engine.mjs';
import {cube3D} from '../cube/visual.mjs';
const root=resolve(import.meta.dirname,'../..');
const read=p=>readFileSync(resolve(root,p),'utf8');
test('scramble page includes 3D cube, inspection and three tabs',()=>{
 const html=read('scramble.html');
 for(const id of ['scramble-cube','inspection-toggle','timer-display','time-chart','solve-list','stats-summary'])assert.ok(html.includes(id),id);
 for(const view of ['timer','history','stats'])assert.ok(html.includes('data-view="'+view+'"'));
});
test('3D cube uses engine state after real scramble',()=>{
 const solved3d=cube3D(solved());
 const mixed=cube3D(apply(solved(),"R U R' U'"));
 assert.match(solved3d,/cube3d-stage/);
 assert.match(mixed,/cube3d-face/);
 assert.notEqual(solved3d,mixed);
});
test('timer uses 5/12/50/100 trimmed averages and draws graph after showing stats',()=>{
 const js=read('assets/js/scramble.js');
 for(const n of ['Ao5','Ao12','Ao50','Ao100','requestAnimationFrame(renderStats)','inspectionTick'])assert.ok(js.includes(n),n);
});
