import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';

const root=resolve(import.meta.dirname,'../..');
const read=file=>readFileSync(resolve(root,file),'utf8');
const pages=['index.html','studio.html','scramble.html','cross.html','f2l.html','oll.html','pll.html','importer.html','v2/index.html'];

test('favicon matches the nine original cube stickers of the Android app icon',()=>{
 const svg=read('assets/icons/academia-cfop.svg');
 const android=read('android-app/app/src/main/res/drawable/ic_launcher.xml');
 assert.match(svg,/<svg[\s\S]+viewBox="0 0 108 108"/);
 assert.match(svg,/<circle[^>]+fill="#07142E"/);
 for(const hex of ['#49C6EC','#F0CE68','#7681EF','#4FCDA7','#E5F5FF','#EF6C79','#69AAF2','#ECA560','#8ADADA']){
  assert.ok(svg.includes(hex),hex+' missing in favicon');
  assert.ok(android.includes(hex),hex+' missing in Android icon');
 }
});

test('all browser tabs use the same versioned Academia CFOP favicon and manifest',()=>{
 for(const path of pages){
  const html=read(path);
  const rootPrefix=path.startsWith('v2/')?'../':'';
  assert.ok(html.includes('rel="icon" type="image/svg+xml"'),path);
  assert.ok(html.includes('href="'+rootPrefix+'assets/icons/academia-cfop.svg?v=20261031-1"'),path);
  assert.ok(html.includes('href="'+rootPrefix+'manifest.webmanifest"'),path);
 }
});

test('PWA declares and precaches the favicon to avoid stale browser icons',()=>{
 const manifest=JSON.parse(read('manifest.webmanifest'));
 assert.ok(manifest.icons.some(icon=>icon.src.includes('academia-cfop.svg')&&icon.sizes==='any'&&icon.type==='image/svg+xml'));
 const worker=read('sw.js');
 assert.match(worker,/\.\/assets\/icons\/academia-cfop\.svg\?v=20261031-1/);
 assert.match(worker,/cfop-studio-offline-20261031-v48/);
});
