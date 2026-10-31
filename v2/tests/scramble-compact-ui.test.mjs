import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';
const root=resolve(import.meta.dirname,'../..');
const html=readFileSync(resolve(root,'scramble.html'),'utf8');
const js=readFileSync(resolve(root,'assets/js/scramble.js'),'utf8');
const css=readFileSync(resolve(root,'assets/css/timer-upgrade.css'),'utf8');
const records=readFileSync(resolve(root,'v2/timer/records.mjs'),'utf8');

test('3x3 timer opens compactly and settings live inside hamburger dialog',()=>{
 assert.match(html,/<button id="scramble-menu-toggle"[^>]+aria-haspopup="dialog"/);
 assert.match(html,/<dialog id="scramble-menu"/);
 assert.doesNotMatch(html,/class="scramble-options"/);
 assert.match(html,/<section class="scramble-cube-section" aria-label=/);
 assert.match(js,/configMenu\.showModal\(\)/);
 assert.match(js,/configMenu\.close\(\)/);
});
test('Timer retains scramble, inspection, cube view and correctly sized session settings',()=>{
 const menu=html.slice(html.indexOf('<dialog id="scramble-menu"'),html.indexOf('</dialog>')+9);
 for(const id of ['scramble-length','cube-view','inspection-toggle','show-cube-preview','scramble-session-name'])
   assert.match(menu,new RegExp('id="'+id+'"'));
 assert.match(css,/#scramble-session-name\{/);
 assert.match(css,/width:100%;box-sizing:border-box/);
 assert.match(js,/show-cube-preview/);
 assert.match(js,/localStorage\.setItem\('cfop-timer-session-v1'/);
});
test('Record gold is automatic, not an unwanted toggle in visible menu',()=>{
 assert.doesNotMatch(html,/golden-record-toggle/);
 assert.doesNotMatch(js,/golden-record-toggle/);
 assert.match(js,/celebrate\(document\.body,true\)/);
 assert.match(records,/export function celebrate\(container=document\.body,force=false\)/);
});
test('Big timer target is enabled without starting the timer while menu is open',()=>{
 assert.match(css,/\.scramble-body \.scramble-clock\{/);
 assert.match(css,/min-height:max\(280px,calc\(100dvh - 258px\)\)!important/);
 assert.match(js,/document\.querySelector\('\.scramble-clock'\)\.addEventListener\('click'/);
 assert.match(js,/document\.querySelector\('dialog\[open\]'\)/);
});

test('Timer remains within viewport and does not vertically scroll on mobile',()=>{
 assert.match(js,/classList\.toggle\('scramble-scroll-locked',next==='timer'\)/);
 assert.match(js,/classList\.toggle\('scramble-timer-active',next==='timer'\)/);
 assert.match(css,/html\.scramble-scroll-locked\{height:100%;overflow:hidden!important/);
 assert.match(css,/body\.scramble-body\.scramble-timer-active\{/);
 assert.match(css,/height:100dvh;min-height:0!important/);
 assert.match(css,/touch-action:none;overscroll-behavior:none/);
 assert.match(css,/\.scramble-body\.scramble-timer-active \.scramble-clock\{/);
 assert.doesNotMatch(js,/scrollIntoView\(/);
});
test('Cube preview and PB popup never extend normal timer page height',()=>{
 const dStart=html.indexOf('<dialog id="scramble-menu"'),dEnd=html.indexOf('</dialog>')+9;
 assert.ok(dStart>=0&&dEnd>dStart);
 const menu=html.slice(dStart,dEnd);
 assert.doesNotMatch(menu,/<section class="scramble-cube-section"/);
 const timer=html.slice(html.indexOf('<section data-panel="timer"'),html.indexOf('<section data-panel="history"'));
 assert.match(timer,/<section class="scramble-cube-section" aria-label=/);
 assert.ok(timer.indexOf('scramble-clock')<timer.indexOf('scramble-cube-section'));
 assert.match(css,/\.scramble-body\.scramble-timer-active \.scramble-cube-section:not\(\[hidden\]\)/);
 assert.match(js,/preview\.checked=localStorage\.getItem\(previewKey\)!=='false'/);
 assert.match(html,/id="scramble-record-close"/);
 assert.match(js,/scramble-record-close/);
 assert.match(css,/position:fixed;z-index:9/);
});
