import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const app=readFileSync(new URL('../app.js',import.meta.url),'utf8');
test('three primary navigation sections, no duplicate start tab',()=>{
 assert.match(app,/const sections=\[\['train','Treinar'\],\['learn','Aprender'\],\['profile','Meu espaço'\]\]/);
 assert.doesNotMatch(app,/\['home','Início'\]/);
 assert.match(app,/let cloudMessage='',page=\(new URLSearchParams\(location.search\)/);
});
test('original-style landing presents four stages and hides advanced options',()=>{
 for(const stage of ['CROSS','F2L','OLL','PLL'])assert.match(app,new RegExp("'"+stage+"'"));
 assert.match(app,/Personalizar meu treino/);
 assert.match(app,/training-quiet-tools/);
});
test('admin section is only displayed for authenticated admins',()=>{
 assert.match(app,/\(isAdmin\(\)\?'<section class="card profile-admin-hub"/);
 assert.match(app,/if\(page==='admin-users'\)return isAdmin\(\)\?adminPanel\(\)/);
});
