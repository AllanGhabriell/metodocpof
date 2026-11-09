/* Editor contextual do caso em treino. Exige autorização no servidor para gravar. */
import {checkAdmin,isAdmin,cloudUser,cloudTable} from '../../v2/cloud/cloud.mjs?v=20261031-58';
import {selectedLibrary,selectedLibraryName,loadLibraryCases,loadOriginalBase,originalEditorCases,originalBaseInfo,saveLibraryCase,publishApprovedLibrary,saveOriginalDraftsBatch,publishOriginalOverrides,verifyOriginalCases,isOriginalOwner} from '../../v2/cloud/libraries.mjs?v=20261103-originaledit-1';
import {trainerCaseToCatalog} from '../../v2/data/case-catalog.mjs';
import {openImageEditor} from './importer-editor.js?v=20261031-2';

const stage=(document.body.dataset.set||'').toLowerCase();
const authorized=()=>isAdmin()&&isOriginalOwner()&&cloudUser()?.email?.toLowerCase()==='coelhodatoca124@gmail.com';
let currentCase=null,finished=false,working=false,dialog=null;
const pencil=document.createElement('button');
pencil.type='button';
pencil.id='trainer-quick-edit';
pencil.className='trainer-quick-edit';
pencil.textContent='✎';
pencil.title='Editar este caso (administrador)';
pencil.setAttribute('aria-label','Editar caso atual');
pencil.hidden=true;
const locationInTrainer=document.querySelector('.trainer-toolbar-title')||document.querySelector('.trainer-toolbar');
locationInTrainer?.append(pencil);
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const announce=s=>{const el=dialog?.querySelector('[data-edit-status]');if(el)el.textContent=s};
const isSelectedCase=()=>currentCase&&!finished&&selectedLibrary(stage)!=='none';
function updatePencil(){pencil.hidden=!(authorized()&&isSelectedCase())}
document.addEventListener('cpof:trainer-current-case',e=>{
 if(e.detail?.stage!==stage)return;
 currentCase=e.detail.caseId||null;finished=Boolean(e.detail.completed);updatePencil();
});
document.addEventListener('cpof:libraries-changed',updatePencil);
checkAdmin().then(updatePencil).catch(()=>{pencil.hidden=true});

function imageToWebp(source){
 return new Promise((resolve,reject)=>{
  if(!source)return reject(Error('Nenhuma imagem disponível para edição.'));
  const img=new Image();
  img.onload=()=>{
   const canvas=document.createElement('canvas');canvas.width=512;canvas.height=512;
   const ctx=canvas.getContext('2d');ctx.fillStyle='#fff';ctx.fillRect(0,0,512,512);
   const fit=Math.min(512/img.naturalWidth,512/img.naturalHeight);
   ctx.drawImage(img,(512-img.naturalWidth*fit)/2,(512-img.naturalHeight*fit)/2,img.naturalWidth*fit,img.naturalHeight*fit);
   const data=canvas.toDataURL('image/webp',.84);
   if(data.length>650000)return reject(Error('Imagem muito grande; use outra imagem.'));
   resolve(data);
  };
  img.onerror=()=>reject(Error('A imagem não pôde ser carregada.'));
  img.src=source;
 });
}
async function getRecord(library,id,legacy){
 if(library==='original'){
  await loadOriginalBase();
  if(!originalBaseInfo().editable)throw Error(originalBaseInfo().editError||'Edição da base original indisponível.');
  const record=originalEditorCases(stage).find(r=>r.case_id===id);
  if(!record)throw Error('Caso não encontrado na Base Original.');
  return {case_id:id,algorithm:record.algorithm||'',setup:record.setup||'',orientation:record.orientation||'',
   imageData:record.imageData||null,imageOriginal:record.imageOriginal||null,status:record.status||'approved'};
 }
 const query='library_id=eq.'+encodeURIComponent(library)+'&case_id=eq.'+encodeURIComponent(id)+'&limit=1';
 const fields='select=case_id,algorithm,setup,orientation,image_data,image_original,status,source_page&';
 const fallback='select=case_id,algorithm,setup,orientation,image_data,status,source_page&';
 const read=async table=>{
  try{return await cloudTable(table,{query:fields+query})}
  catch(e){
   if(!/image_original|schema cache|does not exist|PGRST204/i.test(e.message))throw e;
   return cloudTable(table,{query:fallback+query});
  }
 };
 const [drafts,publicRows]=await Promise.all([read('cfop_library_case_drafts'),read('cfop_library_cases')]);
 const d=drafts?.[0],p=publicRows?.[0],row=d||p;
 if(!row)throw Error('Caso não cadastrado nesta biblioteca. Abra o gerenciador para adicioná-lo.');
 return {case_id:id,algorithm:row.algorithm||'',setup:row.setup||'',orientation:row.orientation||'',
  imageData:row.image_data||p?.image_data||null,
  imageOriginal:row.image_original||p?.image_original||row.image_data||p?.image_data||null,
  sourcePage:row.source_page||null,status:row.status||'draft'};
}
function closeDialog(){dialog?.remove();dialog=null;}
async function verifyPublished(library,record){
 if(library==='original'){
  const rows=await verifyOriginalCases([record.case_id]);const r=rows.find(x=>x.id===record.case_id);
  if(!r||String(r.algorithm||'')!==record.algorithm||String(r.setup||'')!==record.setup||
   String(r.orientation||'')!==record.orientation||(r.imageData||null)!==(record.imageData||null))
   throw Error('A publicação da Base Original ainda não foi confirmada.');
 }else{
  const query='select=algorithm,setup,orientation,image_data,status&library_id=eq.'+encodeURIComponent(library)+'&case_id=eq.'+encodeURIComponent(record.case_id)+'&limit=1';
  const rows=await cloudTable('cfop_library_cases',{query});
  const r=rows?.[0];
  if(!r||r.status!=='approved'||String(r.algorithm||'')!==record.algorithm||String(r.setup||'')!==record.setup||
    String(r.orientation||'')!==record.orientation||(r.image_data||null)!==(record.imageData||null))
   throw Error('O banco não confirmou a publicação. O rascunho permanece salvo.');
 }
}
async function openCaseEditor(){
 if(working||dialog)return;
 if(!authorized())return;
 const legacy=currentCase,library=selectedLibrary(stage),id=trainerCaseToCatalog(stage,legacy);
 if(!legacy||!id||library==='none')return;
 working=true;pencil.disabled=true;
 try{
  // Conferir as permissões novamente antes de consultar a versão editável.
  await checkAdmin();
  if(!authorized()||selectedLibrary(stage)!==library||currentCase!==legacy)throw Error('Acesso ou caso alterado; tente novamente.');
  const record=await getRecord(library,id,legacy);
  const win=document.createElement('div');dialog=win;win.className='trainer-quick-backdrop';
  win.innerHTML='<section class="trainer-quick-dialog" role="dialog" aria-modal="true" aria-labelledby="trainer-quick-heading">'+
    '<header class="trainer-quick-header"><div><small>ADMINISTRADOR · '+esc(stage.toUpperCase())+'</small><h2 id="trainer-quick-heading">Editar caso '+esc(String(legacy))+'</h2><p>Biblioteca: '+esc(library==='original'?'Base original':selectedLibraryName(stage))+'</p></div><button type="button" data-close aria-label="Fechar">✕</button></header>'+
    '<div class="trainer-quick-body"><div class="trainer-quick-image"><img data-preview alt="Imagem atual do caso"><button type="button" data-edit-image>✎ Editar imagem / retoque</button>'+
    '<label>Substituir imagem <input data-upload type="file" accept="image/png,image/jpeg,image/webp"></label></div>'+
    '<div class="trainer-quick-fields"><label>Algoritmo <textarea data-algorithm rows="3" spellcheck="false" placeholder="Algoritmo de resolução"></textarea></label>'+
    '<label>Setup <textarea data-setup rows="3" spellcheck="false" placeholder="Sequência para montar o caso"></textarea></label>'+
    '<label>Orientação <input data-orientation type="text" maxlength="160" placeholder="Ex.: branco embaixo, frente vermelha"></label>'+
    '<p>A edição altera somente este caso nesta biblioteca. Salvar rascunho não modifica a versão pública.</p></div></div>'+
    '<p class="trainer-quick-status" data-edit-status role="status" aria-live="polite"></p>'+
    '<footer class="trainer-quick-footer"><button type="button" data-close>Cancelar</button><button type="button" data-save>Salvar rascunho</button><button type="button" data-publish class="trainer-quick-primary">Salvar e publicar</button></footer></section>';
  document.body.append(win);
  const preview=win.querySelector('[data-preview]'),upload=win.querySelector('[data-upload]');
  win.querySelector('[data-algorithm]').value=record.algorithm;
  win.querySelector('[data-setup]').value=record.setup;
  win.querySelector('[data-orientation]').value=record.orientation;
  const fallback=document.getElementById('case-image')?.getAttribute('src')||'';
  let imageData=record.imageData,imageOriginal=record.imageOriginal||record.imageData||null;
  const updatePreview=()=>{preview.src=imageData||fallback;preview.hidden=!(imageData||fallback)};
  updatePreview();
  const setBusy=busy=>{working=busy;win.querySelectorAll('button,input,textarea').forEach(el=>el.disabled=busy);pencil.disabled=busy};
  const imgButton=win.querySelector('[data-edit-image]');
  imgButton.addEventListener('click',async()=>{
   if(working)return;
   try{
    const image=imageData||await imageToWebp(fallback);
    const original=imageOriginal||image;
    await openImageEditor({case_id:id,imageData:image,imageOriginal:original},(result,orig)=>{
     imageData=result;imageOriginal=orig;updatePreview();announce('Imagem alterada na prévia. Salve para registrar.');
    });
   }catch(err){announce(err.message)}
  });
  upload.addEventListener('change',async()=>{
   const file=upload.files?.[0];if(!file)return;
   try{
    if(!/^image\/(png|jpeg|webp)$/.test(file.type)||file.size>10e6)throw Error('Use PNG, JPEG ou WebP com até 10 MB.');
    const url=URL.createObjectURL(file);
    try{const updated=await imageToWebp(url);imageOriginal=imageOriginal||imageData||updated;imageData=updated;updatePreview();announce('Imagem substituída na prévia. Salve para registrar.')}
    finally{URL.revokeObjectURL(url)}
   }catch(err){announce(err.message)}
  });
  win.querySelectorAll('[data-close]').forEach(button=>button.addEventListener('click',()=>{if(!working)closeDialog()}));
  const save=async publish=>{
   if(working)return;
   if(!authorized()||selectedLibrary(stage)!==library||currentCase!==legacy){announce('Caso ou biblioteca alterados. Feche e abra novamente.');return}
   const algorithm=win.querySelector('[data-algorithm]').value.trim();
   if(!algorithm){announce('Informe o algoritmo antes de salvar.');return}
   const updated={...record,case_id:id,algorithm,setup:win.querySelector('[data-setup]').value.trim(),
     orientation:win.querySelector('[data-orientation]').value.trim(),imageData,imageOriginal,
     status:publish?'approved':'draft'};
   if(publish&&!confirm('Publicar a correção do caso '+String(legacy)+' na biblioteca selecionada? Ela ficará visível aos alunos.'))return;
   setBusy(true);
   try{
    await checkAdmin();
    if(!authorized())throw Error('Permissão administrativa não confirmada.');
    if(library==='original'){
     await saveOriginalDraftsBatch([updated]);
     if(publish)await publishOriginalOverrides([id]);
    }else{
     await saveLibraryCase(library,updated);
     if(publish)await publishApprovedLibrary(library);
    }
    if(publish){
     await verifyPublished(library,updated);
     if(library==='original')await loadOriginalBase();
     else await loadLibraryCases(library);
     document.dispatchEvent(new CustomEvent('cpof:case-edited',{detail:{stage,caseId:legacy,library}}));
     closeDialog();
     return;
    }
    announce('Rascunho salvo no Supabase. A versão pública não foi modificada.');
   }catch(err){announce('Não foi possível '+(publish?'publicar':'salvar')+': '+err.message)}
   finally{setBusy(false)}
  };
  win.querySelector('[data-save]').addEventListener('click',()=>save(false));
  win.querySelector('[data-publish]').addEventListener('click',()=>save(true));
 }catch(err){console.warn('Editor rápido indisponível:',err);alert('Não foi possível abrir o editor: '+err.message)}
 finally{working=false;pencil.disabled=false}
}
pencil.addEventListener('click',openCaseEditor);
