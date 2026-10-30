import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';
const root=resolve(import.meta.dirname,'../..');
const read=p=>readFileSync(resolve(root,p),'utf8');

test('home keeps F2L, OLL and PLL centered with CROSS underneath',()=>{
 const html=read('index.html');
 for(const page of ['f2l.html','oll.html','pll.html','cross.html'])assert.ok(html.includes('href="'+page+'"'),page);
 assert.ok(html.indexOf('academy-stage-f2l')<html.indexOf('academy-stage-oll'));
 assert.ok(html.indexOf('academy-stage-oll')<html.indexOf('academy-stage-pll'));
 assert.ok(html.indexOf('academy-stage-pll')<html.indexOf('academy-stage-cross'));
 const css=read('assets/css/home-layout.css');
 for(const token of ['100dvh','overflow:hidden','repeat(3,minmax(0,1fr))','grid-column:2'])
  assert.ok(css.includes(token),token);
});

test('secondary items are exclusively a vertical rail, not underneath training cards',()=>{
 const html=read('index.html');
 const railStart=html.indexOf('<aside class="academy-home-sidebar"');
 const railEnd=html.indexOf('</aside>',railStart);
 const mainStart=html.indexOf('<main class="academy-home-main">');
 assert.ok(railStart>=0 && railEnd>railStart && railEnd<mainStart);
 const rail=html.slice(railStart,railEnd);
 for(const label of ['Aprender','Evolução','Meu perfil','Menu'])assert.ok(rail.includes(label),label);
 assert.equal((html.match(/href="scramble\.html"/g)||[]).length,1);
 assert.ok(rail.includes('href="scramble.html"'));
 assert.ok(!html.includes('academy-home-followup'));
 const css=read('assets/css/home-layout.css');
 assert.match(css,/\.academy-home-sidebar\s*\{[^}]*position:fixed/s);
 assert.match(css,/\.academy-home-rail\s*\{[^}]*display:grid/s);
 assert.match(css,/\.academy-home-main\s*\{[^}]*margin-left:/s);
 assert.match(css,/@media\(max-width:620px\)/);
});

test('logo is above training area, larger and aligned left',()=>{
 const html=read('index.html');
 assert.ok(html.indexOf('academy-home-brand')<html.indexOf('academy-home-sidebar'));
 assert.ok(html.indexOf('academy-home-brand')<html.indexOf('academy-stage-selection'));
 assert.match(html,/home-layout\.css/);
 const css=read('assets/css/home-layout.css');
 assert.match(css,/\.academy-home-header\s*\{[^}]*justify-content:flex-start/s);
 assert.match(css,/\.academy-brand-name\s*\{[^}]*font-size:clamp\(1\.65rem/s);
});

test('Rubik letter colors progress left-to-right and slow on mouse movement',()=>{
 const html=read('index.html'),js=read('assets/js/home-identity.js');
 assert.match(html,/home-identity\.js/);
 for(const expected of ['pointermove','speedMoving','speedNormal','requestAnimationFrame','prefers-reduced-motion'])
   assert.ok(js.includes(expected),expected);
 assert.ok(js.includes('phase-i*.23'),'left-to-right phase stagger');
 assert.ok(js.includes('rampFrom+(rampTo-rampFrom)*t'),'linear speed change');
});
