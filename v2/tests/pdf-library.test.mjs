import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {detectStage,extractPairs} from '../data/pdf-import.mjs';
const data=JSON.parse(readFileSync(new URL('../data/pdf-cases.json',import.meta.url),'utf8'));
test('biblioteca contém 41 F2L, 57 OLL e 21 PLL',()=>{for(const [stage,n] of [['f2l',41],['oll',57],['pll',21]])assert.equal(data.cases.filter(c=>c.stage===stage).length,n);assert.equal(data.cases.length,119)});
test('casos contêm algoritmos, setups e referência da página',()=>{for(const c of data.cases){assert.ok(c.id);assert.ok(c.algorithm);assert.equal(typeof c.setup,'string');assert.ok(c.sourcePage>0);assert.equal(c.reviewStatus,'unreviewed')}});
test('importador identifica etapa e separa linhas de algoritmo e setup',()=>{assert.equal(detectStage('OLL - teste.pdf',''), 'oll');const rows=[[{text:'41 casos de F2L',x:20,y:100},{text:"R U R'",x:20,y:80},{text:"R' U' R",x:20,y:65}]];const extracted=extractPairs(rows,'f2l');assert.equal(extracted.length,1);assert.equal(extracted[0].algorithm,"R U R'");assert.equal(extracted[0].setup,"R' U' R")});
test('interface exibe algoritmos e opção de setups',()=>{const js=readFileSync(new URL('../app.js',import.meta.url),'utf8');assert.ok(js.includes('function algorithmsPage'));assert.ok(js.includes('showSetups'));assert.ok(js.includes('readPdfCases(file)'))});
