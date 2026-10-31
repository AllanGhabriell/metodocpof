import {cloudTable,isAuthenticated,isConfigured,isAdmin,cloudUser} from './cloud.mjs?v=20261030-55';
import {CASE_BY_ID,canonicalCase} from '../data/case-catalog.mjs';
const CHOICE='cpof-selected-library-v1',META='cpof-library-index-v1',DB_NAME='cpof-library-offline-v1';
const DEFAULT='original';
let libraries=read(META,[]),choice=localStorage.getItem(CHOICE)||DEFAULT,rows=[],lastError='',lastSync=null;
function read(k,f){try{return JSON.parse(localStorage.getItem(k)||'null')??f}catch{return f}}
function notify(){if(typeof document!=='undefined')document.dispatchEvent(new Event('cpof:libraries-changed'))}
function db(){return new Promise((resolve,reject)=>{if(typeof indexedDB==='undefined'){reject(Error('IndexedDB indisponível'));return}
 const r=indexedDB.open(DB_NAME,1);r.onupgradeneeded=()=>r.result.createObjectStore('snapshots');
 r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error)})}
async function cached(id,value){try{const base=await db();return await new Promise((resolve,reject)=>{const tx=base.transaction('snapshots',value?'readwrite':'readonly'),store=tx.objectStore('snapshots'),req=value?store.put(value,id):store.get(id);req.onsuccess=()=>resolve(req.result);req.onerror=()=>reject(req.error);tx.oncomplete=()=>base.close()})}catch{return null}}
export const libraryList=()=>libraries.filter(x=>x.is_public||isAdmin());
export const selectedLibrary=()=>choice;
export const selectedLibraryName=()=>choice===DEFAULT?'Original':libraries.find(x=>x.id===choice)?.title||'Original';
export const libraryError=()=>lastError;
export const librarySyncedAt=()=>lastSync;
export const selectedVariants=()=>rows.slice();
export function libraryCase(stage,id){const c=CASE_BY_ID.get(id);if(!c||c.stage!==stage||choice===DEFAULT)return null;
 const row=rows.find(r=>r.case_id===id&&r.status==='approved');if(!row)return null;
 return {id,stage,name:c.name,algorithm:row.algorithm,setup:row.setup,orientation:row.orientation||'',imageData:row.image_data||null,source:'Biblioteca '+selectedLibraryName(),libraryApproved:true,reviewStatus:'editor-approved',reviewed:false}
}
export const libraryCases=stage=>rows.filter(r=>r.status==='approved'&&CASE_BY_ID.get(r.case_id)?.stage===stage).map(r=>libraryCase(stage,r.case_id)).filter(Boolean);
export async function loadLibraries(){
 if(!isConfigured()){lastError='Sem serviço de bibliotecas';notify();return libraries}
 try{
  const options={query:'select=id,title,description,is_public,created_at,updated_at&order=updated_at.desc&limit=100',anon:!isAuthenticated()};
  const latest=await cloudTable('cfop_libraries',options);
  libraries=Array.isArray(latest)?latest:[];localStorage.setItem(META,JSON.stringify(libraries));lastError='';
  if(choice!==DEFAULT&&!libraries.some(l=>l.id===choice&&l.is_public)){choice=DEFAULT;localStorage.setItem(CHOICE,choice);rows=[]}
  if(choice!==DEFAULT)await loadLibraryCases(choice);
  else notify();
 }catch(e){lastError='Bibliotecas offline: '+e.message;if(choice!==DEFAULT)await loadLibraryCases(choice,true);notify()}
 return libraries
}
export async function loadLibraryCases(id,offlineOnly=false){
 if(id===DEFAULT){rows=[];notify();return []}
 const stored=await cached(id);
 if(stored){rows=stored;notify()}
 if(offlineOnly||!isConfigured())return rows;
 try{
  const latest=await cloudTable('cfop_library_cases',{query:'select=library_id,case_id,algorithm,setup,orientation,image_data,status,source_page,updated_at&library_id=eq.'+encodeURIComponent(id)+'&limit=150',anon:!isAuthenticated()});
  if(!Array.isArray(latest))throw Error('Resposta inválida');
  rows=latest;await cached(id,latest);lastError='';lastSync=new Date().toISOString();notify();
 }catch(e){lastError='Usando versão offline: '+e.message;notify()}
 return rows
}
export async function chooseLibrary(id){
 if(id!==DEFAULT&&!libraries.some(l=>l.id===id&&l.is_public))throw Error('Esta biblioteca não está publicada.');
 choice=id;localStorage.setItem(CHOICE,choice);rows=[];notify();return loadLibraryCases(id)
}
function requireOwner(){
 if(!isAuthenticated()||!isAdmin()||cloudUser()?.email?.toLowerCase()!=='coelhodatoca124@gmail.com')throw Error('Somente o administrador fundador pode modificar bibliotecas.');
}
export async function createLibrary(title,description=''){
 requireOwner();const r=await cloudTable('cfop_libraries',{method:'POST',body:{title:String(title).trim(),description:String(description).trim(),created_by:cloudUser().id,is_public:false},prefer:'return=representation'});
 await loadLibraries();return Array.isArray(r)?r[0]:r
}
export async function saveLibraryCase(libraryId,record){
 requireOwner();const c=CASE_BY_ID.get(record.case_id);if(!c)throw Error('O caso não pertence ao catálogo fixo.');
 const row={library_id:libraryId,case_id:c.id,algorithm:String(record.algorithm||'').trim(),setup:String(record.setup||'').trim(),orientation:String(record.orientation||'').slice(0,160),image_data:record.imageData||record.image_data||null,status:['draft','approved','rejected'].includes(record.status)?record.status:'draft',source_page:record.sourcePage||record.source_page||null};
 await cloudTable('cfop_library_case_drafts',{method:'POST',query:'on_conflict=library_id,case_id',body:row,prefer:'resolution=merge-duplicates,return=representation'});
 if(choice===libraryId)await loadLibraryCases(libraryId);
 return row
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
