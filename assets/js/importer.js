import {isAdmin,isConfigured,cloudUser,initializeCloud,acceptAuthRedirect,cloudTable} from '../../v2/cloud/cloud.mjs?v=20261031-58';
import {FIXED_CASES,CASE_BY_ID,LIMITS} from '../../v2/data/case-catalog.mjs';
import {assignFixedCases,cropDiagram} from '../../v2/data/pdf-layout.mjs';
import {algorithmIndex,identifyByAlgorithm} from '../../v2/data/algorithm-match.mjs';
import {matchDiagrams} from '../../v2/data/image-match.mjs';
import {openImageEditor,bulkAdjustImages,standardizeImages} from './importer-editor.js?v=20261031-2';
import {loadLibraries,libraryList,createLibrary,saveLibraryCasesBatch,publishApprovedLibrary,renameLibrary,loadOriginalBase,originalCases,setDefaultLibrary,stageDefaultInfo,stageDefaultStatus,publicCasesInStage,publicLibraryStatus,originalBaseInfo} from '../../v2/cloud/libraries.mjs?v=20261031-5';
const PDF='https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.10.38/pdf.min.mjs';
const LAST_LIBRARY='cpof-admin-last-library-v1';
const context=new URLSearchParams(location.search);
const $=id=>document.getElementById(id);
let records=[],stage='f2l',busy=false,doc=null,pdfFile=null,pageImageCache=new Map(),existingRecords=[];
let loadedLibraryId='',defaultSaving=new Set();
const defaultMessages=Object.create(null);
const unsavedStages=new Map();
const editedCaseIds=new Set();
function rememberStage(){unsavedStages.set(stage,records.map(r=>({...r})));}
function clearLocalEdits(){unsavedStages.clear();}
function markEdited(record){if(record?.case_id)editedCaseIds.add(record.case_id);}
function notYetApproved(){const byId=new Map(stagedRecords().map(r=>[r.case_id,r]));return [...editedCaseIds].filter(id=>byId.has(id)&&byId.get(id).status!=='approved');}
function stagedRecords(){
 const stages=new Map(unsavedStages);
 stages.set(stage,records);
 const combined=new Map();
 for(const [name,items] of stages){
  if(!['f2l','oll','pll'].includes(name))continue;
  for(const item of items){
   if(!item?.case_id)continue;
   if(CASE_BY_ID.get(item.case_id)?.stage!==name)throw Error('O caso '+item.case_id+' não pertence à etapa '+name.toUpperCase()+'.');
   if(combined.has(item.case_id))throw Error('Caso duplicado: '+item.case_id);
   combined.set(item.case_id,item);
  }
 }
 return [...combined.values()];
}
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const status=s=>{$('import-status').textContent=s;const near=$('import-action-status');if(near)near.textContent=s};
const owner=()=>isAdmin()&&cloudUser()?.email?.toLowerCase()==='coelhodatoca124@gmail.com';
function libraryOptions(){
 const previous=$('import-library').value;
 $('import-library').innerHTML='<option value="">Selecione a biblioteca</option>'+libraryList().map(l=>'<option value="'+esc(l.id)+'">'+esc(l.title)+(l.is_public?' · pública':' · rascunho')+'</option>').join('');
 const options=libraryList(),requested=previous||context.get('library')||localStorage.getItem(LAST_LIBRARY);
 const picked=options.some(l=>l.id===requested)?requested:options.length===1?options[0].id:'';
 if(picked)$('import-library').value=picked;
 renderLibraryCards();
}

const STAGE_LABELS={f2l:'F2L',oll:'OLL',pll:'PLL'};
function renderLibraryCards(){
 const host=$('import-library-cards');if(!host)return;
 const list=libraryList(),selected=$('import-library').value,publicInfo=publicLibraryStatus();
 host.innerHTML=list.length?list.map(l=>{
  const verified=l.is_public&&!publicInfo.error;
  const counts=verified?['f2l','oll','pll'].map(s=>s.toUpperCase()+': '+publicCasesInStage(l.id,s)).join(' · '):'';
  return '<article class="hub-library-card '+(selected===l.id?'is-active':'')+'">'+
   '<span class="hub-library-status"><strong>'+(l.is_public?'Publicada':'Rascunho')+'</strong></span>'+
   '<h3>'+esc(l.title)+'</h3>'+
   '<p class="hub-library-counts">'+(counts||'Abra para consultar e editar os casos salvos.')+'</p>'+
   '<button type="button" class="importer-secondary" data-open-library="'+esc(l.id)+'">Editar biblioteca</button>'+
   '</article>';
 }).join(''):'<div class="hub-library-empty">Nenhuma biblioteca cadastrada. Use <strong>+ Criar</strong> para começar.</div>';
}
function renderDefaults(){
 const host=$('import-default-cards'),notice=$('import-default-notice');if(!host||!notice)return;
 const data=stageDefaultInfo(),sync=stageDefaultStatus(),publicData=publicLibraryStatus(),list=libraryList();
 notice.innerHTML=(!sync.loaded?'<p class="hub-default-warning" role="alert">Não foi possível confirmar os padrões no Supabase: '+esc(sync.error||'configuração ainda não carregada')+'</p>':'')+
 (publicData.error?'<p class="hub-default-warning" role="alert">Não foi possível verificar todas as bibliotecas públicas: '+esc(publicData.error)+'</p>':'');
 host.innerHTML=['f2l','oll','pll'].map(s=>{
  const entry=data[s]||{},saved=entry.source==='library'?(entry.library_id||'none'):(entry.source||'none');
  const options=[{id:'none',name:'Sem biblioteca principal'}];
  if(s!=='oll'&&originalBaseInfo().state!=='deleted')options.push({id:'original',name:'Original · '+s.toUpperCase()});
  for(const l of list){
   const n=publicCasesInStage(l.id,s);
   options.push({id:l.id,name:l.title+(l.is_public?(n?' · '+n+' casos':' · sem casos publicados'):' · rascunho'),disabled:!l.is_public||(!publicData.error&&n===0)});
  }
  if(!options.some(o=>o.id===saved))options.push({id:saved,name:'Base atual indisponível',disabled:true});
  const current=options.find(o=>o.id===saved)?.name||'Indisponível',saving=defaultSaving.has(s);
  return '<article class="hub-default-card"><h3>'+s.toUpperCase()+'</h3>'+
   '<label for="hub-default-'+s+'">Biblioteca principal para todos'+
   '<select id="hub-default-'+s+'" '+(!sync.loaded||saving?'disabled':'')+'>'+
   options.map(o=>'<option value="'+esc(o.id)+'"'+(o.id===saved?' selected':'')+(o.disabled?' disabled':'')+'>'+esc(o.name)+'</option>').join('')+'</select></label>'+
   '<p class="hub-default-current">Atual: '+esc(current)+'</p>'+
   '<button type="button" data-save-default="'+s+'" '+(!sync.loaded||saving?'disabled':'')+'>'+(saving?'Salvando…':'Salvar padrão de '+s.toUpperCase())+'</button>'+
   '<p class="hub-default-feedback" role="status">'+esc(defaultMessages[s]||'')+'</p>'+
   '</article>';
 }).join('');
}

function cropRotated(data,turns){
 if(!turns)return Promise.resolve(data);
 return new Promise((resolve,reject)=>{const image=new Image();image.onload=()=>{
  const canvas=document.createElement('canvas');canvas.width=image.naturalWidth;canvas.height=image.naturalHeight;
  const ctx=canvas.getContext('2d');ctx.translate(canvas.width/2,canvas.height/2);ctx.rotate(turns*Math.PI/2);
  ctx.drawImage(image,-image.width/2,-image.height/2);resolve(canvas.toDataURL('image/webp',.78));
 };image.onerror=()=>reject(Error('Imagem inválida'));image.src=data})
}
function update(){
 const checked=records.filter(r=>r.status==='approved').length,unknown=records.filter(r=>!['nome','algoritmo','visual','manual'].includes(r.confidence)).length;
 const anyApproved=stagedRecords().some(r=>r.status==='approved');
 const pendingApproval=notYetApproved();
 $('import-count').textContent=records.length+' de '+LIMITS[stage]+' casos · '+checked+' aprovados · '+unknown+' exigem conferência da identidade';
 $('import-publish-summary').textContent=pendingApproval.length?pendingApproval.length+' edição(ões) aguardando aprovação.':checked+' caso'+(checked===1?'':'s')+' aprovado'+(checked===1?'':'s')+' nesta etapa';
 $('import-publish').disabled=busy||!anyApproved||pendingApproval.length>0||(!$('import-library').value&&$('import-new-library').value.trim().length<2);
 $('import-publish').textContent=checked?'Publicar '+checked+' aprovado'+(checked===1?'':'s'):'Publicar casos aprovados';
 $('import-results').hidden=!records.length;
 const empty=$('import-empty-state');if(empty){empty.hidden=!!records.length;empty.innerHTML='<h2>Editar casos da biblioteca</h2><p>'+($('import-library').value?'Esta etapa ainda não tem casos cadastrados. Se houver outra etapa, escolha F2L, OLL ou PLL acima. Você também pode importar um PDF.':'Selecione uma biblioteca acima para editar os casos existentes.')+'</p>'; }
 const fixed=FIXED_CASES.filter(c=>c.stage===stage);
 $('import-cards').innerHTML=records.map((r,i)=>'<article class="importer-card" data-index="'+i+'">'+
 '<div class="importer-card-title"><h3>'+esc(CASE_BY_ID.get(r.case_id)?.name||r.case_id)+'</h3><span class="'+(['nome','algoritmo','visual'].includes(r.confidence)?'importer-detected':'importer-warning')+'">'+(r.confidence==='nome'?'Nome reconhecido':r.confidence==='algoritmo'?'Algoritmo reconhecido':r.confidence==='visual'?'Diagrama reconhecido':'Conferir associação')+'</span></div>'+
 '<img src="'+esc(r.imageData||'')+'" alt="Recorte do '+esc(r.case_id)+'" loading="lazy">'+
 '<label>Caso fixo<select data-field="case_id">'+fixed.map(c=>'<option value="'+esc(c.id)+'" '+(c.id===r.case_id?'selected':'')+'>'+esc(c.name)+' ('+c.id+')</option>').join('')+'</select></label>'+
 '<label>Algoritmo<input data-field="algorithm" value="'+esc(r.algorithm||'')+'" placeholder="Sequência para resolver o caso"></label>'+
 '<label>Setup<input data-field="setup" value="'+esc(r.setup||'')+'" placeholder="Sequência para montar o caso"></label>'+
 '<label>Orientação<input data-field="orientation" value="'+esc(r.orientation||'')+'" placeholder="Ex.: branco embaixo, frente vermelha"></label>'+
 '<label>Revisão<select data-field="status"><option value="draft" '+(r.status==='draft'?'selected':'')+'>Pendente</option><option value="approved" '+(r.status==='approved'?'selected':'')+'>Aprovado</option><option value="rejected" '+(r.status==='rejected'?'selected':'')+'>Rejeitado</option></select></label>'+
 (r.page?'<small>Página '+r.page+' · '+(r.alternatives?.length?'Possui algoritmos alternativos':'Uma sequência reconhecida')+'</small>':'<small>Versão já cadastrada</small>')+
 (r.rect?'<div class="importer-crop-controls"><span>Corrigir enquadramento:</span><button type="button" data-crop="up" data-index="'+i+'" title="Subir recorte">↑</button><button type="button" data-crop="left" data-index="'+i+'" title="Mover à esquerda">←</button><button type="button" data-crop="right" data-index="'+i+'" title="Mover à direita">→</button><button type="button" data-crop="down" data-index="'+i+'" title="Descer recorte">↓</button><button type="button" data-crop="zoom-in" data-index="'+i+'" title="Aproximar">+</button><button type="button" data-crop="zoom-out" data-index="'+i+'" title="Afastar">−</button></div>':'')+
 '<div class="importer-card-actions"><button type="button" data-edit-image="'+i+'" class="importer-edit-image" '+(!r.imageData?'disabled':'')+'>✎ Editar imagem / retoque</button><button type="button" data-approve="'+i+'" '+(r.status==='approved'?'disabled':'')+'>'+(r.status==='approved'?'✓ Aprovado':'✓ Aprovar caso')+'</button><button type="button" data-rotate="'+i+'" data-direction="-1" aria-label="Girar 90 graus no sentido anti-horário">↶ 90°</button><button type="button" data-rotate="'+i+'" data-direction="1" aria-label="Girar 90 graus no sentido horário">↷ 90°</button><button type="button" data-download="'+i+'">Baixar imagem</button></div>'+
 '</article>').join('')
}
function saveBlob(name,data){const url=URL.createObjectURL(new Blob([data],{type:'application/json'})),a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000)}
function guard(){if(!owner())throw Error('Somente o administrador fundador pode editar as bibliotecas.')}
async function renderPage(number){
 if(pageImageCache.has(number))return pageImageCache.get(number);
 const page=await doc.getPage(number);const vp=page.getViewport({scale:1.55});
 const canvas=document.createElement('canvas');canvas.width=Math.floor(vp.width);canvas.height=Math.floor(vp.height);
 await page.render({canvasContext:canvas.getContext('2d',{alpha:false}),viewport:vp}).promise;
 const content=await page.getTextContent();
 const items=content.items.filter(i=>i.str?.trim()).map(i=>({text:i.str,x:i.transform[4]*1.55,y:canvas.height-i.transform[5]*1.55}));
 const result={page:number,canvas,items,width:canvas.width,height:canvas.height};
 pageImageCache.set(number,result);return result
}
async function analyzePdf(file){
 const pdfjs=await import(PDF).catch(()=>{throw Error('Leitor de PDF indisponível. Para importar um novo PDF é necessária a primeira conexão com a internet.')});
 pdfjs.GlobalWorkerOptions.workerSrc=PDF.replace('pdf.min.mjs','pdf.worker.min.mjs');
 doc=await pdfjs.getDocument({data:new Uint8Array(await file.arrayBuffer())}).promise;
 if(doc.numPages>30)throw Error('Use um PDF de até 30 páginas.');
 const all=[];let detected=0;
 for(let p=1;p<=doc.numPages;p++){
  status('Reconhecendo página '+p+'/'+doc.numPages+'…');
  const page=await renderPage(p);
  const part=assignFixedCases([page],stage,detected);
  detected+=part.detected;
  for(const c of part.cases)all.push({...c,imageData:cropDiagram(page,c.rect),sourcePage:c.page,rotation:0});
  page.canvas.width=0;page.canvas.height=0;pageImageCache.clear();
 }
 records=all;
 // Tentar identificar os casos pela sequência, sem confiar apenas na posição da página.
 try{
  await loadOriginalBase();
  const reference=['f2l','oll','pll'].flatMap(originalCases);
  const index=algorithmIndex(reference);const used=new Set();
  for(const r of records){const match=identifyByAlgorithm(stage,r.algorithm,index);
   if(match&&!used.has(match)){r.case_id=match;r.name=CASE_BY_ID.get(match)?.name;r.confidence='algoritmo';used.add(match)}
  }
  try{
   status('Comparando os diagramas com bibliotecas já aprovadas…');
   const refs=await cloudTable('cfop_library_cases',{query:'select=case_id,image_data&status=eq.approved&image_data=not.is.null&limit=140'});
   const unique=new Map((refs||[]).filter(v=>CASE_BY_ID.get(v.case_id)?.stage===stage).map(v=>[v.case_id,v]));
   const matches=await matchDiagrams(records.filter(r=>r.confidence==='ordem'),[...unique.values()]);
   for(const [r,id] of matches)if(!used.has(id)){r.case_id=id;r.name=CASE_BY_ID.get(id).name;r.confidence='visual';used.add(id)}
  }catch{}
  for(const r of records){if(!used.has(r.case_id)){used.add(r.case_id);continue}
   if(['algoritmo','visual'].includes(r.confidence))continue;
   const available=FIXED_CASES.find(x=>x.stage===stage&&!used.has(x.id));
   if(available){r.case_id=available.id;r.name=available.name;used.add(r.case_id)}
  }
 }catch{}
 const result={incomplete:records.length!==LIMITS[stage]};
 records.sort((a,b)=>CASE_BY_ID.get(a.case_id).ordinal-CASE_BY_ID.get(b.case_id).ordinal);
 update();
 status(result.incomplete?
 'Reconhecidos '+records.length+' de '+LIMITS[stage]+' casos. Revise as associações e os casos faltantes antes de publicar.':
 'Detectados '+records.length+' casos. Confira os nomes atribuídos por posição, os setups e cada recorte; nada foi publicado.');
}
$('import-file').addEventListener('change',()=>{
 const file=$('import-file').files?.[0];if(!file)return;
 if(!$('import-library').value&&!$('import-new-library').value.trim())$('import-new-library').value=file.name.replace(/\.pdf$/i,'').replace(/[-_]+/g,' ').trim().slice(0,90);
 $('import-run').click();
});
$('import-run').addEventListener('click',async()=>{
 if(busy)return;try{guard();const file=$('import-file').files[0];if(!file)throw Error('Selecione um PDF.');
 if(file.size>20e6)throw Error('PDF maior que 20 MB.');if(!/\.pdf$/i.test(file.name)&&file.type!=='application/pdf')throw Error('Para reconhecimento automático, envie um PDF.');
 stage=$('import-stage').value;busy=true;$('import-run').disabled=true;pdfFile=file;
 await analyzePdf(file);
 }catch(e){status('Não foi possível analisar: '+e.message)}finally{busy=false;$('import-run').disabled=false}
});
$('import-cards').addEventListener('change',e=>{
 const card=e.target.closest('[data-index]');if(!card)return;const r=records[Number(card.dataset.index)],field=e.target.dataset.field;if(!r||!field)return;
 const next=e.target.value;
 if(field==='case_id'){
  if(next===r.case_id)return;
  const other=records.find(o=>o!==r&&o.case_id===next);
  if(other){
   const previous=r.case_id;
   other.case_id=previous;r.case_id=next;
   r.confidence='manual';other.confidence='manual';
   r.status='draft';other.status='draft';
   markEdited(r);markEdited(other);
   update();status('Associações de '+previous+' e '+next+' trocadas. Confira os dois casos e aprove novamente.');
   return;
  }
  if(existingRecords.some(x=>x.case_id===r.case_id)){
   e.target.value=r.case_id;
   return status('Para uma biblioteca já publicada, troque a posição com outro caso existente ou importe o caso ausente. Isso evita deixar uma cópia antiga publicada.');
  }
 }
 const previous=r[field];r[field]=next;if(field==='case_id')r.confidence='manual';
 if(previous!==next&&['algorithm','setup','orientation','case_id'].includes(field))markEdited(r);
 if(field==='status'&&next==='approved'&&!r.algorithm.trim()){r.status='draft';e.target.value='draft';return status('Informe um algoritmo antes de aprovar o caso.')}
 if(['algorithm','setup','orientation','case_id'].includes(field)&&r.status==='approved'){
   r.status='draft';update();status('Edição salva somente como rascunho. Aprove novamente para publicar.');
 }else if(field==='case_id'||field==='status')update()
});
$('import-cards').addEventListener('click',async e=>{
 const a=e.target.closest('[data-rotate]'),b=e.target.closest('[data-download]'),approve=e.target.closest('[data-approve]');
 const crop=e.target.closest('button[data-crop]');
 const editImage=e.target.closest('button[data-edit-image]');
 if(editImage){const r=records[Number(editImage.dataset.editImage)];if(!r?.imageData)return status('Este caso não possui imagem. Importe um PDF ou selecione outro caso.');
  await openImageEditor(r,(result,original)=>{r.imageOriginal ||= original;r.imageData=result;r.status='draft';r.imageUpdatedAt=Date.now();markEdited(r);update();status('Imagem de '+r.case_id+' corrigida. Reaprove e salve para atualizar a biblioteca.');});return}
 if(crop){
  const r=records[Number(crop.dataset.index)];if(!r?.rect||!doc)return status('Reimporte o PDF para ajustar o recorte.');
  const page=await renderPage(r.page);
  const rect={...r.rect},step=Math.max(4,Math.round(rect.w*.065));
  switch(crop.dataset.crop){
   case'up':rect.y-=step;break;case'down':rect.y+=step;break;
   case'left':rect.x-=step;break;case'right':rect.x+=step;break;
   case'zoom-in':rect.x+=step;rect.y+=step;rect.w-=2*step;rect.h-=2*step;break;
   case'zoom-out':rect.x-=step;rect.y-=step;rect.w+=2*step;rect.h+=2*step;break;
  }
  rect.w=Math.max(35,Math.min(page.width,rect.w));
  rect.h=Math.max(35,Math.min(page.height,rect.h));
  rect.x=Math.max(0,Math.min(page.width-rect.w,rect.x));
  rect.y=Math.max(0,Math.min(page.height-rect.h,rect.y));
  r.rect=rect;r.imageData=cropDiagram(page,rect);r.status='draft';markEdited(r);
  page.canvas.width=0;page.canvas.height=0;pageImageCache.clear();
  update();status('Recorte de '+r.case_id+' ajustado. Confira a imagem e aprove novamente.');
  return;
 }
 if(approve){const r=records[Number(approve.dataset.approve)];if(!r)return;
  if(!r.algorithm?.trim())return status('Informe o algoritmo desse caso antes de aprová-lo.');
  r.status='approved';update();status('Caso '+r.case_id+' aprovado para publicação.');return
 }
 if(a){const r=records[Number(a.dataset.rotate)];if(r?.imageData){const direction=Number(a.dataset.direction)===-1?-1:1;r.rotation=((r.rotation||0)+direction+4)%4;r.imageOriginal ||=r.imageData;r.imageData=await cropRotated(r.imageData,direction);markEdited(r);if(r.status==='approved')r.status='draft';update();status('Imagem girada '+(direction===1?'no sentido horário':'no sentido anti-horário')+'. Confira e aprove novamente antes de publicar.')}}
 if(b){const r=records[Number(b.dataset.download)];if(r?.imageData){const link=document.createElement('a');link.href=r.imageData;link.download=r.case_id+'.webp';link.click()}}
});
$('import-create-library').addEventListener('click',async()=>{
 try{guard();const title=$('import-new-library').value.trim();if(title.length<2)throw Error('Informe o nome da biblioteca.');
 const l=await createLibrary(title);libraryOptions();$('import-library').value=l.id;localStorage.setItem(LAST_LIBRARY,l.id);await loadExistingLibrary();renderDefaults();status('Biblioteca '+title+' criada. Adicione casos por PDF ou selecione outra biblioteca existente.')}catch(e){status(e.message)}
});
async function loadExistingLibrary(){
 const id=$('import-library').value;
 if(!id){
  existingRecords=[];records=[];clearLocalEdits();editedCaseIds.clear();loadedLibraryId='';
  renderLibraryCards();update();return;
 }
 try{
  const query='select=case_id,algorithm,setup,orientation,image_data,image_original,status,source_page&library_id=eq.'+encodeURIComponent(id)+'&limit=150';
  const fallback='select=case_id,algorithm,setup,orientation,image_data,status,source_page&library_id=eq.'+encodeURIComponent(id)+'&limit=150';
  const fetchRows=async(table)=>{try{return await cloudTable(table,{query})}catch(e){
   if(!/image_original|schema cache|does not exist|PGRST204/i.test(e.message))throw e;
   return cloudTable(table,{query:fallback});
  }};
  const [drafts,published]=await Promise.all([
   fetchRows('cfop_library_case_drafts').catch(()=>[]),
   fetchRows('cfop_library_cases')
  ]);
  const byId=new Map((published||[]).map(r=>[r.case_id,r]));
  for(const d of drafts||[]){const previous=byId.get(d.case_id);if(!previous||d.status==='approved'||d.status==='draft')byId.set(d.case_id,{...previous,...d,image_data:d.image_data||previous?.image_data,image_original:d.image_original||previous?.image_original});}
  existingRecords=[...byId.values()];
  clearLocalEdits();editedCaseIds.clear();loadedLibraryId=id;
  showExistingStage();
  if(!records.length&&existingRecords.length&&!context.get('stage')){
   const first=existingRecords.map(r=>CASE_BY_ID.get(r.case_id)?.stage).find(Boolean);
   if(first){stage=first;$('import-stage').value=stage;showExistingStage();}
  }
  renderLibraryCards();
  status(existingRecords.length?'Biblioteca carregada: '+existingRecords.length+' casos. Edite e salve aqui mesmo.':'Biblioteca vazia. Você pode importar um PDF para adicionar casos.');
 }catch(e){
  if(loadedLibraryId&&loadedLibraryId!==id)$('import-library').value=loadedLibraryId;
  renderLibraryCards();status('Erro ao carregar casos: '+e.message);
 }
}
function showExistingStage(){
 if(unsavedStages.has(stage)){records=unsavedStages.get(stage).map(r=>({...r}));update();return;}
 records=existingRecords.filter(r=>CASE_BY_ID.get(r.case_id)?.stage===stage).map(r=>({
 case_id:r.case_id,algorithm:r.algorithm,setup:r.setup,orientation:r.orientation,imageData:r.image_data||r.image_original||null,imageOriginal:r.image_original||r.image_data||null,
 status:r.status,sourcePage:r.source_page,page:r.source_page,confidence:'manual',alternatives:[]}));
 update();
}
$('import-reload')?.addEventListener('click',async()=>{
 if(editedCaseIds.size&&!confirm('Descartar alterações locais não publicadas e recarregar o banco?'))return;
 await loadExistingLibrary();
});
async function selectLibrary(id,scroll=false){
 if(loadedLibraryId&&id!==loadedLibraryId&&editedCaseIds.size&&
  !confirm('Você tem alterações em andamento. Trocar de biblioteca descartará alterações locais não salvas. Continuar?')){
  $('import-library').value=loadedLibraryId;return;
 }
 $('import-library').value=id;
 if(id)localStorage.setItem(LAST_LIBRARY,id);
 const library=libraryList().find(l=>l.id===id);
 if(library)$('import-new-library').value=library.title;
 await loadExistingLibrary();
 if(scroll)document.getElementById('hub-cases')?.scrollIntoView({behavior:'smooth',block:'start'});
}
$('import-library').addEventListener('change',async()=>{
 await selectLibrary($('import-library').value);
});
$('import-library-cards').addEventListener('click',async event=>{
 const btn=event.target.closest('button[data-open-library]');if(!btn)return;
 await selectLibrary(btn.dataset.openLibrary,true);
});
$('import-default-cards').addEventListener('click',async event=>{
 const btn=event.target.closest('button[data-save-default]');if(!btn)return;
 const s=btn.dataset.saveDefault;
 if(!['f2l','oll','pll'].includes(s)||defaultSaving.has(s))return;
 const value=$('hub-default-'+s)?.value;if(!value)return;
 defaultSaving.add(s);defaultMessages[s]='';renderDefaults();
 try{
  await setDefaultLibrary(s,value);
  await loadLibraries();
  defaultMessages[s]='Salvo e confirmado no banco.';
  renderLibraryCards();
 }catch(e){defaultMessages[s]='Não foi possível salvar: '+e.message;}
 finally{defaultSaving.delete(s);renderDefaults();}
});
$('import-rename-library').addEventListener('click',async()=>{try{guard();const id=$('import-library').value;if(!id)throw Error('Selecione uma biblioteca.');await renameLibrary(id,$('import-new-library').value.trim(),'');libraryOptions();$('import-library').value=id;renderLibraryCards();renderDefaults();status('Nome da biblioteca atualizado para os usuários online.')}catch(e){status(e.message)}});
$('import-stage').addEventListener('change',()=>{rememberStage();stage=$('import-stage').value;showExistingStage();status('Etapa alterada. As edições de outras etapas serão incluídas ao salvar.')});
$('import-new-library').addEventListener('input',()=>{
 const anyApproved=stagedRecords().some(r=>r.status==='approved');
 $('import-publish').disabled=busy||!anyApproved||notYetApproved().length>0||(!$('import-library').value&&$('import-new-library').value.trim().length<2);
});
$('import-global-apply').addEventListener('click',async()=>{
 try{guard();if(busy)return;const x=Number($('import-global-x').value),y=Number($('import-global-y').value),zoom=Number($('import-global-zoom').value)/100;
  if(!Number.isFinite(x)||!Number.isFinite(y)||!Number.isFinite(zoom)||Math.abs(x)>45||Math.abs(y)>45||zoom<.5||zoom>2.5)throw Error('Valores de alinhamento inválidos.');
  const all=$('import-global-all').checked;
  let targets=records.filter(r=>r.imageData);
  if(all){
   const library=$('import-library').value;
   if(!library)throw Error('Selecione uma biblioteca existente para ajustar todas as etapas.');
   const combined=new Map(existingRecords.map(r=>[r.case_id,{
     case_id:r.case_id,algorithm:r.algorithm,setup:r.setup,orientation:r.orientation,
     imageData:r.image_data,imageOriginal:r.image_original||null,status:r.status,
     sourcePage:r.source_page,confidence:'manual'}]));
   for(const r of stagedRecords())combined.set(r.case_id,r);
   targets=[...combined.values()];
  }
  if(!targets.some(r=>r.imageData))throw Error('Não há imagens disponíveis.');
  if(!confirm('Aplicar o ajuste às imagens de '+(all?'toda a biblioteca':'etapa '+stage.toUpperCase())+'? '+(all?'As mudanças de todas as etapas serão salvas como rascunhos. ':'')+'Os casos alterados precisarão de nova aprovação.'))return;
  busy=true;$('import-global-apply').disabled=true;
  const changed=await bulkAdjustImages(targets,{x,y,zoom},(done,total)=>status('Ajustando imagens: '+done+'/'+total));
  targets.filter(r=>r.imageUpdatedAt).forEach(markEdited);
  if(all){
   await saveLibraryCasesBatch($('import-library').value,targets,(done,total)=>status('Salvando rascunhos: '+done+'/'+total));
   existingRecords=targets.map(r=>({
     case_id:r.case_id,algorithm:r.algorithm,setup:r.setup,orientation:r.orientation,
     image_data:r.imageData,image_original:r.imageOriginal,status:r.status,source_page:r.sourcePage
   }));
   clearLocalEdits();showExistingStage();
  }else update();
  status(changed+' imagens padronizadas em 512 × 512 WebP. Revise, aprove e publique para atualizar os casos.');
 }catch(err){status('Ajuste geral não aplicado: '+err.message)}finally{busy=false;$('import-global-apply').disabled=false}
});
$('import-approve-all').addEventListener('click',()=>{
 records.forEach(r=>{if(r.algorithm.trim())r.status='approved'});update();
 status('Casos com algoritmo marcados como aprovados. Confira individualmente a identidade e o recorte antes de salvar.');
});
async function verifyPublishedEdits(libraryId,approved){
 const changed=approved.filter(r=>editedCaseIds.has(r.case_id));
 const targets=changed.length?changed:approved.slice(0,1);
 for(let start=0;start<targets.length;start+=12){
  const batch=targets.slice(start,start+12);
  const ids=batch.map(r=>r.case_id);
  if(ids.some(id=>!/^[A-Za-z0-9-]+$/.test(id)))throw Error('Identificação de caso inválida na verificação.');
  const query='select=case_id,algorithm,setup,orientation,image_data,status&library_id=eq.'+encodeURIComponent(libraryId)+'&case_id=in.('+ids.join(',')+')&limit=150';
  const visible=await cloudTable('cfop_library_cases',{query});
  const rows=new Map((visible||[]).map(r=>[r.case_id,r]));
  for(const caseRecord of batch){
   const row=rows.get(caseRecord.case_id);
   if(!row||row.status!=='approved'||row.image_data!==(caseRecord.imageData||null)||String(row.algorithm||'')!==String(caseRecord.algorithm||'')||String(row.setup||'')!==String(caseRecord.setup||'')||String(row.orientation||'')!==String(caseRecord.orientation||'')){
    throw Error('O banco não confirmou a versão publicada de '+caseRecord.case_id+'. O rascunho foi salvo, mas a imagem pública não foi atualizada.');
   }
  }
 }
}
async function saveAll(){
 guard();const pending=stagedRecords();if(!pending.length)throw Error('Nenhum caso para salvar.');
 if(pending.some(r=>r.status==='approved'&&!String(r.algorithm||'').trim()))throw Error('Preencha o algoritmo de cada caso aprovado.');
 let libraryId=$('import-library').value;
 if(!libraryId){
  const title=$('import-new-library').value.trim();
  if(title.length<2)throw Error('Escolha uma biblioteca ou informe um nome para criar uma nova.');
  const newLibrary=await createLibrary(title);
  libraryOptions();libraryId=newLibrary.id;$('import-library').value=libraryId;
  localStorage.setItem(LAST_LIBRARY,libraryId);
  status('Biblioteca '+title+' criada. Salvando revisão…');
 }

 busy=true;$('import-save').disabled=true;$('import-publish').disabled=true;
 try{
  await standardizeImages(pending);
  await saveLibraryCasesBatch(libraryId,pending,(done,total)=>status('Salvando '+done+'/'+total+' casos…'));
  const combined=new Map(existingRecords.map(r=>[r.case_id,r]));
  for(const r of pending)combined.set(r.case_id,{
   case_id:r.case_id,algorithm:r.algorithm,setup:r.setup,orientation:r.orientation,
   image_data:r.imageData,image_original:r.imageOriginal||null,status:r.status,source_page:r.sourcePage
  });
  existingRecords=[...combined.values()];clearLocalEdits();
 } finally{busy=false;$('import-save').disabled=false;update()}
 return libraryId;
}
$('import-save').addEventListener('click',async()=>{try{await saveAll();status('Alterações salvas como rascunhos. Para atualizar a biblioteca pública, aprove os casos e publique.')}catch(e){status('Erro ao salvar: '+e.message)}});
$('import-publish').addEventListener('click',async()=>{
 try{
  guard();if(notYetApproved().length)throw Error('Aprove antes os casos editados: '+notYetApproved().join(', '));
  const approved=stagedRecords().filter(r=>r.status==='approved');
  if(!approved.length)throw Error('Aprove ao menos um caso antes de publicar.');
  const target=libraryList().find(l=>l.id===$('import-library').value)?.title||$('import-new-library').value.trim();
  if(!confirm('Publicar os casos aprovados em "'+target+'"? Os alunos poderão escolher esta biblioteca após sincronizar.'))return;
  const id=await saveAll();const count=await publishApprovedLibrary(id);
  await verifyPublishedEdits(id,approved);
  editedCaseIds.clear();libraryOptions();$('import-library').value=id;renderLibraryCards();renderDefaults();update();
  await loadExistingLibrary();
  status('Publicação confirmada para '+count+' caso'+(count===1?'':'s')+' aprovado'+(count===1?'':'s')+'. Dados recarregados do banco.');
 }catch(e){status('Erro ao publicar: '+e.message)}
});
$('import-download').addEventListener('click',()=>{if(!records.length)return status('Nenhum caso.');saveBlob('biblioteca-'+stage+'-revisao.json',JSON.stringify({format:'cfop-library-review-v2',stage,items:records},null,2))});
$('import-clear').addEventListener('click',()=>{records=[];unsavedStages.delete(stage);update();status('Revisão local limpa nesta etapa. Os dados salvos no Supabase permanecem.')});
(async()=>{try{
 await acceptAuthRedirect();await initializeCloud();
 if(!isConfigured()||!owner()){$('importer-access').textContent='Acesso exclusivo do administrador fundador. Entre na conta autorizada no Studio.';return}
 await loadLibraries();libraryOptions();renderDefaults();$('importer-access').hidden=true;$('importer-workspace').hidden=false;
 if(['f2l','oll','pll'].includes(context.get('stage'))){stage=context.get('stage');$('import-stage').value=stage}
 if($('import-library').value){
  localStorage.setItem(LAST_LIBRARY,$('import-library').value);
  const library=libraryList().find(l=>l.id===$('import-library').value);
  if(library)$('import-new-library').value=library.title;
  await loadExistingLibrary();
 }
 update();status(existingRecords.length?'Biblioteca pronta para edição. Escolha a etapa e abra o editor do caso.':'Escolha uma biblioteca existente ou crie uma nova; o PDF só é necessário para adicionar casos.');
 }catch(e){$('importer-access').textContent='Não foi possível confirmar seu acesso: '+e.message}
})();
