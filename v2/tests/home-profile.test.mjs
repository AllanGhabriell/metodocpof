import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const app=readFileSync(new URL('../app.js',import.meta.url),'utf8');
const cloud=readFileSync(new URL('../cloud/cloud.mjs',import.meta.url),'utf8');
test('página inicial abre seleção de etapas CFOP',()=>{assert.match(app,/if\(page==='home'\)return trainingLanding\(\)/);assert.match(app,/Domine cada etapa do/);assert.match(app,/119 casos/);});
test('perfil acessível pelo cabeçalho e barra inferior',()=>{assert.match(app,/function accountHeader\(\)/);assert.match(app,/\+accountHeader\(\)/);assert.match(app,/\['profile','Meu espaço'\]/);});
test('usuário comum não vê SQL, IDs nem instruções de backend na conta',()=>{const panel=cloud.slice(cloud.indexOf('export function cloudPanel()'));assert.doesNotMatch(panel,/migração SQL|service_role|secret nesta página|Estado:|Projeto: /);assert.match(panel,/admin\?'<details class="account-advanced"/);assert.match(panel,/Continuar com Google/);});
