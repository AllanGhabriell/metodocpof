import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const app=readFileSync(new URL('../app.js',import.meta.url),'utf8');
const cloud=readFileSync(new URL('../cloud/cloud.mjs',import.meta.url),'utf8');
test('tela inicial e treino usam o mesmo seletor CFOP',()=>{assert.match(app,/page='train'/);assert.match(app,/if\(page==='train'&&!f2lMode\)return trainingLanding\(\)/);assert.match(app,/Domine cada etapa do/);assert.match(app,/119 casos/);});
test('perfil acessível pelo cabeçalho e barra inferior',()=>{assert.match(app,/function accountHeader\(\)/);assert.match(app,/\+accountHeader\(\)/);assert.match(app,/\['profile','Meu espaço'\]/);assert.match(app,/\['train','Treinar'\]/);});
test('usuário comum não vê SQL, IDs nem instruções de backend na conta',()=>{const panel=cloud.slice(cloud.indexOf('export function cloudPanel()'));assert.doesNotMatch(panel,/migração SQL|service_role|secret nesta página|Estado:|Projeto: /);assert.match(panel,/admin\?'<details class="account-advanced"/);assert.match(panel,/Continuar com Google/);});
