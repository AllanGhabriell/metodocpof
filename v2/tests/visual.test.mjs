import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {cube3D} from '../cube/visual.mjs';
import {solved,apply} from '../cube/engine.mjs';
test('cubo 3D representa exatamente 54 adesivos',()=>{
 const html=cube3D(solved());
 assert.equal((html.match(/class="cube3d-tile"/g)||[]).length,54);
 for(const face of ['U','D','F','B','L','R'])assert.ok(html.includes('cube3d-'+face));
});
test('a visualização 3D acompanha movimentos reais',()=>{
 assert.notEqual(cube3D(solved()),cube3D(apply(solved(),'R U')));
});
test('academia e cronômetro usam visualização dinâmica',()=>{
 const js=readFileSync(new URL('../app.js',import.meta.url),'utf8');
 assert.match(js,/lessonCube\(\)/);
 assert.match(js,/cube3D\(demoState\)/);
 assert.match(js,/cube3D\(apply\(solved\(\),scramble\)/);
});
