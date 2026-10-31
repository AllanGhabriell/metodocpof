import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {diagramRect,cropDiagram,detectColumns} from '../data/pdf-layout.mjs';
const read=x=>readFileSync(new URL(x,import.meta.url),'utf8');
const sql=read('../../supabase/migrations/20261031_000009_stage_defaults.sql');
const library=read('../cloud/libraries.mjs'),bridge=read('../../assets/js/library-trainer.js'),app=read('../app.js'),importer=read('../../assets/js/importer.js');

test('F2L crop excludes adjacent diagram and algorithm; OLL and PLL remain unchanged',()=>{
 const f=diagramRect('f2l',420,350,1.55);
 const o=diagramRect('oll',420,350,1.55);
 const p=diagramRect('pll',420,350,1.55);
 assert.ok(f.w<o.w&&f.h<o.h);
 assert.equal(o.w,p.w);assert.equal(o.h,p.h);
 assert.ok(f.y<o.y);
 assert.equal(f.w,f.h);
 assert.match(importer,/data-crop="zoom-in"/);
 assert.match(importer,/data-crop="down"/);
 assert.match(importer,/r\.imageData=cropDiagram\(page,rect\)/);
});

test('stage defaults are independent, founder only, and OLL does not have Original',()=>{
 assert.match(sql,/PRIMARY KEY CHECK\(stage IN \('f2l','oll','pll'\)\)/);
 assert.match(sql,/source<>'original' OR stage IN \('f2l','pll'\)/);
 assert.match(sql,/IF p_stage='oll' THEN RAISE EXCEPTION 'Não existe base original de OLL'/);
 assert.match(sql,/cfop_is_owner\(actor\)/);
 assert.match(sql,/cfop_original_public_stage\(text\)/);
 assert.match(sql,/GRANT SELECT ON public\.cfop_original_base_cases TO anon/);
 assert.match(library,/export const selectedLibrary=stage=>/);
 assert.match(library,/export const selectedVariants=stage=>/);
 assert.match(library,/export async function chooseLibrary\(id,stage='f2l'\)/);
 assert.match(library,/export async function setDefaultLibrary\(stage,id\)/);
 assert.match(bridge,/selectedLibrary\(stage\)/);
 assert.match(bridge,/selectedVariants\(stage\)/);
 assert.match(bridge,/chooseLibrary\(select\.value,stage\)/);
 assert.match(app,/stageDefaultsPage\(\)/);
 assert.match(app,/setDefaultLibrary\(stage,value\)/);
 assert.match(app,/admin-defaults/);
});

test('new migration has three balanced PL/pgSQL functions and is atomic',()=>{
 assert.equal((sql.match(/AS \$\$/g)||[]).length,(sql.match(/\$\$;/g)||[]).length);
 assert.match(sql,/^BEGIN;/m);assert.match(sql,/^COMMIT;/m);
 assert.match(sql,/NOTIFY pgrst,'reload schema'/);
});
