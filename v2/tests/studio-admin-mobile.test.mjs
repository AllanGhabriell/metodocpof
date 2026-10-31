import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';

const root=resolve(import.meta.dirname,'../..');
const read=path=>readFileSync(resolve(root,path),'utf8');
const app=read('v2/app.js');
const style=read('assets/css/studio-admin-mobile.css');
const html=read('studio.html');

test('mobile admin controls are separate from top header and only shown to admins',()=>{
 const header=app.indexOf('<header class="original-studio-header">');
 const nav=app.indexOf('<nav class="original-studio-nav"');
 const panel=app.indexOf('<details class="studio-mobile-admin-menu"');
 const main=app.indexOf('<main class="original-studio-content"');
 assert.ok(header>=0&&nav>header&&panel>nav&&main>panel);
 assert.match(app,/\(isAdmin\(\)\?'<details class="studio-mobile-admin-menu"/);
 assert.match(app,/<a href=\\"importer\.html\\" class=\\"studio-mobile-admin-publish\\"/);
 assert.match(app,/data-page=\\"admin-users\\" class=\\"studio-mobile-admin-manage\\"/);
});
test('header has three responsive columns and ADM buttons are hidden only at mobile sizes',()=>{
 assert.match(style,/@media \(max-width:860px\)/);
 assert.match(style,/grid-template-columns:46px minmax\(0,1fr\) 46px/);
 assert.match(style,/\.studio-header-actions > \.studio-admin-publish/);
 assert.match(style,/\.studio-header-actions > \.original-admin-button/);
 assert.match(style,/display:none!important/);
 assert.match(style,/\.studio-mobile-admin-menu-actions/);
 assert.match(style,/grid-template-columns:repeat\(2,minmax\(0,1fr\)\)/);
});
test('updated assets are in the Studio and the service worker cache',()=>{
 const worker=read('sw.js');
 assert.match(html,/studio-admin-mobile\.css\?v=20261031-1/);
 assert.match(html,/app\.js\?v=20261031-admin-mobile-1/);
 assert.match(worker,/studio-admin-mobile\.css\?v=20261031-1/);
 assert.match(worker,/app\.js\?v=20261031-admin-mobile-1/);
});
