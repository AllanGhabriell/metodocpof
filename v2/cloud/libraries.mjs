import {cloudTable,isAuthenticated,isConfigured,isAdmin,cloudUser} from './cloud.mjs?v=20261030-55';
import {CASE_BY_ID,canonicalCase} from '../data/case-catalog.mjs';
const META='cpof-library-index-v1',DB_NAME='cpof-library-offline-v1';
const STAGES=['f2l','oll','pll'],DEFAULT='none',ORIGINAL='original',SETTING='cpof-stage-defaults-v1',PERSONAL='cpof-stage-session-v1';
let libraries=read(META,[]),rows=[],lastError='',lastSync=null;
let stageDefaults=read(SETTING,{}),stageChoices=readSession(PERSONAL,{}),rowsByLibrary=new Map(),publicOriginalRows=new Map();
function readSession(k,f){try{return JSON.parse(sessionStorage.getItem(k)||'null')??f}catch{return f}}
function updatePersonal(stage,id){stageChoices={...stageChoices,[stage]:id};try{sessionStorage.setItem(PERSONAL,JSON.stringify(stageChoices))}catch{}}
function baseForStage(stage){const entry=stageDefaults[stage];if(!entry)return DEFAULT;
 if(entry.source===ORIGINAL)return stage==='oll'?DEFAULT:ORIGINAL;
 if(entry.source==='library'&&entry.library_id&&libraries.some(l=>l.id===entry.library_id&&l.is_public))return entry.library_id;
 return DEFAULT;
}
let originalRows=[],originalState='unknown',originalError='',originalLoading=null;
export const isOriginalOwner=()=>isAuthenticated()&&isAdmin()&&cloudUser()?.email?.toLowerCase()==='coelhodatoca124@gmail.com';
export const originalBaseInfo=()=>({state:originalState,count:originalRows.length,error:originalError});
export const originalCases=stage=>isOriginalOwner()&&originalState==='active'?originalRows
 .filter(c=>c.stage===stage).map(c=>({...c,reviewed:false,reviewStatus:'unreviewed',source:'Base original privada'})):[];
export async function loadOriginalBase(){
 if(!isOriginalOwner()){originalRows=[];return []}
 if(originalLoading)return originalLoading;
 originalLoading=(async()=>{
 try{
  const control=await cloudTable('cfop_original_base_control',{query:'select=deleted_at&singleton=eq.true'});
  if(control?.[0]?.deleted_at){
   originalState='deleted';originalRows=[];originalError='';
   for(const stage of STAGES)if(stageChoices[stage]===ORIGINAL)delete stageChoices[stage];notify();return [];
  }
  let list=await cloudTable('cfop_original_base_cases',{query:'select=case_id,details&order=case_id.asc&limit=150'});
  if(!Array.isArray(list))throw Error('Resposta inválida do banco');
  // A primeira importação é feita pelo fundador, nunca pelo navegador de um aluno.
  if(!list.length){
   const response=await fetch('./v2/data/pdf-cases.json',{cache:'no-store'});
   if(!response.ok)throw Error('Arquivo de referência original indisponível. Nada foi publicado.');
   const original=await response.json();
   const cases=(original.cases||[]).filter(c=>c.stage!=='oll'&&CASE_BY_ID.get(c.id)?.stage===c.stage);
   for(let i=0;i<cases.length;i+=20){
    await cloudTable('cfop_original_base_cases',{method:'POST',
     query:'on_conflict=case_id',prefer:'resolution=ignore-duplicates,return=minimal',
     body:cases.slice(i,i+20).map(c=>({case_id:c.id,details:c}))});
   }
   list=await cloudTable('cfop_original_base_cases',{query:'select=case_id,details&order=case_id.asc&limit=150'});
  }
  originalRows=(list||[]).map(r=>r.details).filter(c=>c.stage!=='oll'&&CASE_BY_ID.get(c.id)?.stage===c.stage);
  originalState='active';originalError='';notify();return originalRows;
 }catch(e){originalState='error';originalError=e.message;originalRows=[];notify();return []}
 })().finally(()=>{originalLoading=null});
 return originalLoading;
}
export async function deleteOriginalBase(){
 requireOwner();
 const result=await cloudTable('rpc/cfop_delete_original_base',{method:'POST',body:{}});
 originalState='deleted';originalRows=[];originalError='';publicOriginalRows.clear();rows=[];
 for(const stage of STAGES)if(stageChoices[stage]===ORIGINAL)delete stageChoices[stage];
 await loadLibraries();notify();
 return result;
}
function read(k,f){try{return JSON.parse(localStorage.getItem(k)||'null')??f}catch{return f}}
function notify(){if(typeof document!=='undefined')document.dispatchEvent(new Event('cpof:libraries-changed'))}
function db(){return new Promise((resolve,reject)=>{if(typeof indexedDB==='undefined'){reject(Error('IndexedDB indisponível'));return}
 const r=indexedDB.open(DB_NAME,1);r.onupgradeneeded=()=>r.result.createObjectStore('snapshots');
 r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error)})}
async function cached(id,value){try{const base=await db();return await new Promise((resolve,reject)=>{const tx=base.transaction('snapshots',value?'readwrite':'readonly'),store=tx.objectStore('snapshots'),req=value?store.put(value,id):store.get(id);req.onsuccess=()=>resolve(req.result);req.onerror=()=>reject(req.error);tx.oncomplete=()=>base.close()})}catch{return null}}
export const libraryList=()=>libraries.filter(x=>x.is_public||isOriginalOwner());
export const defaultForStage=stage=>baseForStage(stage);
export const stageDefaultInfo=()=>({...stageDefaults});
export const selectedLibrary=stage=>{
 stage=STAGES.includes(stage)?stage:'f2l';
 const requested=stageChoices[stage]||baseForStage(stage);
 if(requested===ORIGINAL)return stage==='oll'||!(isOriginalOwner()||baseForStage(stage)===ORIGINAL)?DEFAULT:ORIGINAL;
 if(requested===DEFAULT)return DEFAULT;
 return libraries.some(l=>l.id===requested&&l.is_public)?requested:baseForStage(stage);
};
export const selectedLibraryName=stage=>{
 const id=selectedLibrary(stage);
 return id===ORIGINAL?'Original · '+stage.toUpperCase():id===DEFAULT?'Nenhuma biblioteca publicada':libraries.find(l=>l.id===id)?.title||'Biblioteca indisponível';
};
export const libraryError=()=>lastError;
export const librarySyncedAt=()=>lastSync;
export const selectedVariants=stage=>rowsByLibrary.get(selectedLibrary(stage))?.slice()||[];
export async function setDefaultLibrary(stage,id){
 requireOwner();if(!STAGES.includes(stage))throw Error('Etapa inválida');
 const source=id===ORIGINAL?'original':id===DEFAULT?'none':'library';
 if(source===ORIGINAL&&stage==='oll')throw Error('OLL não possui base original.');
 if(source==='library'&&!libraries.some(l=>l.id===id&&l.is_public))throw Error('Publique a biblioteca antes de torná-la principal.');
 await cloudTable('rpc/cfop_set_stage_default',{method:'POST',body:{
  p_stage:stage,p_source:source,p_library:source==='library'?id:null
 }});
 await loadStageDefaults();
 notify();return stageDefaults[stage];
}
export async function loadStageDefaults(){
 if(!isConfigured())return stageDefaults;
 try{
  const rows=await cloudTable('cfop_stage_defaults',{query:'select=stage,source,library_id,updated_at&order=stage.asc',anon:!isAuthenticated()});
  if(!Array.isArray(rows))throw Error('Configuração inválida');
  stageDefaults=Object.fromEntries(rows.filter(r=>STAGES.includes(r.stage)).map(r=>[r.stage,r]));
  localStorage.setItem(SETTING,JSON.stringify(stageDefaults));
 }catch(e){lastError='Padrões offline: '+e.message}
 return stageDefaults
}
async function loadPublicOriginal(stage){
 if(stage==='oll'||baseForStage(stage)!==ORIGINAL)return [];
 try{
  const prefix=stage.toUpperCase()+'-';
  const results=await cloudTable('cfop_original_base_cases',{query:'select=case_id,details&case_id=like.'+prefix+'*&limit=65',anon:!isAuthenticated()});
  if(Array.isArray(results)){publicOriginalRows.set(stage,results.map(r=>r.details));notify()}
 }catch(e){lastError='Base original offline: '+e.message}
 return publicOriginalRows.get(stage)||[];
}
export function libraryCase(stage,id){
 const c=CASE_BY_ID.get(id);if(!c||c.stage!==stage)return null;
 const selected=selectedLibrary(stage);
 if(selected===ORIGINAL){
  const available=isOriginalOwner()?originalRows:publicOriginalRows.get(stage)||[];
  const item=available.find(x=>x.id===id);
  return item?{...item,name:item.name||c.name,source:'Original · '+stage.toUpperCase(),reviewed:false,reviewStatus:'unreviewed'}:null;
 }
 if(selected===DEFAULT)return null;
 const row=(rowsByLibrary.get(selected)||[]).find(r=>r.case_id===id&&r.status==='approved');
 if(!row)return null;
 return {id,stage,name:c.name,algorithm:row.algorithm,setup:row.setup,orientation:row.orientation||'',imageData:row.image_data||null,source:'Biblioteca '+selectedLibraryName(stage),libraryApproved:true,reviewStatus:'editor-approved',reviewed:false}
}
export const libraryCases=stage=>{
 const id=selectedLibrary(stage);
 if(id===ORIGINAL)return (isOriginalOwner()?originalRows:(publicOriginalRows.get(stage)||[])).filter(c=>c.stage===stage);
 if(id===DEFAULT)return [];
 return (rowsByLibrary.get(id)||[]).filter(r=>r.status==='approved'&&CASE_BY_ID.get(r.case_id)?.stage===stage)
  .map(r=>libraryCase(stage,r.case_id)).filter(Boolean);
};
export async function loadLibraries(){
 if(!isConfigured()){lastError='Bibliotecas offline';notify();return libraries}
 try{
  const [latest]=await Promise.all([
   cloudTable('cfop_libraries',{query:'select=id,title,description,is_public,created_at,updated_at&order=updated_at.desc&limit=100',anon:!isAuthenticated()}),
   loadStageDefaults()
  ]);
  libraries=Array.isArray(latest)?latest:[];localStorage.setItem(META,JSON.stringify(libraries));
  const requests=new Set();
  for(const stage of STAGES){
   const id=selectedLibrary(stage);
   if(id!==DEFAULT&&id!==ORIGINAL)requests.add(id);
  }
  const tasks=[...requests].map(id=>loadLibraryCases(id));
  for(const stage of STAGES){
   if(selectedLibrary(stage)===ORIGINAL){
    tasks.push(isOriginalOwner()?loadOriginalBase():loadPublicOriginal(stage));
   }
  }
  await Promise.all(tasks);
  notify();
 }catch(e){
  lastError='Bibliotecas offline: '+e.message;
  for(const stage of STAGES){const id=selectedLibrary(stage);
   if(id!==DEFAULT&&id!==ORIGINAL)await loadLibraryCases(id,true)}
  notify();
 }
 return libraries;
}
export async function loadLibraryCases(id,offlineOnly=false){
 if(id===DEFAULT||id===ORIGINAL){notify();return []}
 const stored=await cached(id);
 if(stored){rowsByLibrary.set(id,stored);notify()}
 if(offlineOnly||!isConfigured())return rowsByLibrary.get(id)||[];
 try{
  const latest=await cloudTable('cfop_library_cases',{query:'select=library_id,case_id,algorithm,setup,orientation,image_data,status,source_page,updated_at&library_id=eq.'+encodeURIComponent(id)+'&limit=150',anon:!isAuthenticated()});
  if(!Array.isArray(latest))throw Error('Resposta inválida');
  rows=latest;rowsByLibrary.set(id,latest);await cached(id,latest);
  lastError='';lastSync=new Date().toISOString();notify();
 }catch(e){lastError='Usando versão offline: '+e.message;notify()}
 return rowsByLibrary.get(id)||[];
}
export async function chooseLibrary(id,stage='f2l'){
 if(!STAGES.includes(stage))throw Error('Etapa inválida');
 if(id===ORIGINAL){
  if(stage==='oll')throw Error('Não há base original OLL.');
  if(!isOriginalOwner()&&baseForStage(stage)!==ORIGINAL)throw Error('A base original não foi disponibilizada nesta etapa.');
  if(isOriginalOwner()){
   await loadOriginalBase();if(originalState!=='active')throw Error('Base original não está disponível.');
  }else await loadPublicOriginal(stage);
  updatePersonal(stage,id);notify();return originalRows;
 }
 if(id!==DEFAULT&&!libraries.some(l=>l.id===id&&l.is_public))throw Error('Biblioteca não publicada.');
 if(id===DEFAULT&&libraryList().some(l=>l.is_public))throw Error('Escolha uma biblioteca publicada.');
 updatePersonal(stage,id);notify();return loadLibraryCases(id);
}
function requireOwner(){
 if(!isAuthenticated()||!isAdmin()||cloudUser()?.email?.toLowerCase()!=='coelhodatoca124@gmail.com')throw Error('Somente o administrador fundador pode modificar bibliotecas.');
}
export async function createLibrary(title,description=''){
 requireOwner();const r=await cloudTable('cfop_libraries',{method:'POST',body:{title:String(title).trim(),description:String(description).trim(),created_by:cloudUser().id,is_public:false},prefer:'return=representation'});
 await loadLibraries();return Array.isArray(r)?r[0]:r
}
function validatedDraft(libraryId,record){
 const c=CASE_BY_ID.get(record.case_id);
 if(!c)throw Error('O caso não pertence ao catálogo fixo.');
 return {library_id:libraryId,case_id:c.id,algorithm:String(record.algorithm||'').trim(),
  setup:String(record.setup||'').trim(),orientation:String(record.orientation||'').slice(0,160),
  image_data:record.imageData||record.image_data||null,
  status:['draft','approved','rejected'].includes(record.status)?record.status:'draft',
  source_page:record.sourcePage||record.source_page||null};
}
export async function saveLibraryCasesBatch(libraryId,records,onProgress=()=>{}){
 requireOwner();
 if(!libraryId||!Array.isArray(records)||!records.length)throw Error('Selecione uma biblioteca e pelo menos um caso.');
 const rows=records.map(record=>validatedDraft(libraryId,record));
 if(new Set(rows.map(r=>r.case_id)).size!==rows.length)throw Error('Há casos duplicados na revisão.');
 for(let start=0;start<rows.length;start+=8){
  const chunk=rows.slice(start,start+8);
  await cloudTable('cfop_library_case_drafts',{
   method:'POST',query:'on_conflict=library_id,case_id',body:chunk,
   prefer:'resolution=merge-duplicates,return=minimal'
  });
  onProgress(Math.min(start+8,rows.length),rows.length);
 }
 return rows.length;
}
export async function saveLibraryCase(libraryId,record){
 await saveLibraryCasesBatch(libraryId,[record]);
 return validatedDraft(libraryId,record);
}
export async function publishApprovedLibrary(libraryId){
 requireOwner();const count=await cloudTable('rpc/cfop_publish_library',{method:'POST',body:{p_library:libraryId}});
 await loadLibraries();if(choice===libraryId)await loadLibraryCases(libraryId);
 return count
}
export async function setLibraryPublished(libraryId,enabled){
 requireOwner();await cloudTable('cfop_libraries',{method:'PATCH',query:'id=eq.'+encodeURIComponent(libraryId),body:{is_public:!!enabled,updated_at:new Date().toISOString()},prefer:'return=representation'});
 await loadLibraries();return true
}
export async function renameLibrary(libraryId,title,description){
 requireOwner();await cloudTable('cfop_libraries',{method:'PATCH',query:'id=eq.'+encodeURIComponent(libraryId),body:{title:String(title).trim(),description:String(description||'').trim(),updated_at:new Date().toISOString()}});
 await loadLibraries();return true
}
