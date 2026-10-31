import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=path=>readFileSync(new URL(path,import.meta.url),'utf8');
const css=read('../../assets/css/home-layout.css');
const home=read('../../index.html');

test('mobile navigation is a full-width row, never a fixed sidebar',()=>{
 const start=css.indexOf('@media (max-width:760px)');
 assert.ok(start>=0);
 const mobile=css.slice(start);
 assert.match(mobile,/\.academy-home-sidebar\s*\{[\s\S]*?position:relative;/);
 assert.match(mobile,/\.academy-home-rail\s*\{[\s\S]*?grid-template-columns:repeat\(4,minmax\(0,1fr\)\)/);
 assert.match(mobile,/\.academy-home-main\s*\{[\s\S]*?margin:0 auto;/);
 assert.match(mobile,/overflow-y:auto/);
});
test('training cards are 2x2 with a normal-width CROSS card on mobile',()=>{
 const mobile=css.slice(css.indexOf('@media (max-width:760px)'));
 assert.match(mobile,/body\.academy-home \.home-actions\s*\{[\s\S]*?grid-template-columns:repeat\(2,minmax\(0,1fr\)\)/);
 assert.match(mobile,/body\.academy-home \.home-actions \.academy-stage-cross\s*\{[\s\S]*?grid-column:auto;/);
 assert.match(mobile,/min-height:137px/);
});
test('menu remains keyboard-accessible and touchable in mobile format',()=>{
 assert.match(home,/<summary class="academy-rail-link" aria-label="Abrir menu de ferramentas">/);
 assert.match(home,/class="academy-home-rail"/);
 assert.match(home,/href="studio.html\?page=learn"/);
 assert.match(home,/href="studio.html\?page=dashboard"/);
 assert.match(home,/href="studio.html\?page=profile"/);
 assert.match(css,/max-height:min\(65dvh,430px\);overflow-y:auto/);
 assert.match(css,/min-height:44px;display:flex;align-items:center/);
});
