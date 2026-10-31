import {isAdmin,isConfigured,cloudUser,initializeCloud,acceptAuthRedirect,cloudTable} from '../../v2/cloud/cloud.mjs?v=20261031-57';
import {FIXED_CASES,CASE_BY_ID,LIMITS} from '../../v2/data/case-catalog.mjs';
import {assignFixedCases,cropDiagram} from '../../v2/data/pdf-layout.mjs';
import {algorithmIndex,identifyByAlgorithm} from '../../v2/data/algorithm-match.mjs';
import {matchDiagrams} from '../../v2/data/image-match.mjs';
import {openImageEditor,bulkAdjustImages} from './importer-editor.js?v=20261031-1';
import {loadLibraries,libraryList,createLibrary,saveLibraryCasesBatch,publishApprovedLibrary,renameLibrary,loadOriginalBase,originalCases} from '../../v2/cloud/libraries.mjs?v=20261031-4';
const PDF='https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.10.38/pdf.min.mjs';
const LAST_LIBRARY='cpof-admin-last-library-v1';
const context=new URLSearchParams(location.search);
const $=id=>document.getElementById(id);
let records=[],stage='f2l',busy=false,doc=null,pdfFile=null,pageImageCache=new Map(),existingRecords=[];
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const status=s=>{$('import-status').textContent=s;const near=$('import-action-status');if(near)near.textContent=s};
const owner=()=>isAdmin()&&cloudUser()?.email?.toLowerCase()==='coelhodatoca124@gmail.com';
function libraryOptions(){
 const previous=$('import-library').value;
 $('import-library').innerHTML='<option value="">Selecione a biblioteca</option>'+libraryList().map(l=>'<option value="'+esc(l.id)+'">'+esc(l.title)+(l.is_public?' · pública':' · rascunho')+'</option>').join('');
 const options=libraryList(),requested=context.get('library')||previous||localStorage.getItem(LAST_LIBRARY);
 const picked=options.some(l=>l.id===requested)?requested:options.length===1?options[0].id:'';
 if(picked)$('import-library').value=picked;
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
 const checked=records.filter(r=>r.status==='approved').length,unknown=records.filter(r=>!['nome','algoritmo','visual'].includes(r.confidence)).length;
 $('import-count').textContent=records.length+' de '+LIMITS[stage]+' casos · '+checked+' aprovados · '+unknown+' exigem conferência da identidade';
 $('import-publish-summary').textContent=checked+' caso'+(checked===1?'':'s')+' aprovado'+(checked===1?'':'s')+' nesta etapa';
 $('import-publish').disabled=busy||checked===0||(!$('import-library').value&&$('import-new-library').value.trim().length<2);
 $('import-publish').textContent=checked?'Publicar '+checked+' aprovado'+(checked===1?'':'s'):'Publicar casos aprovados';
 $('import-results').hidden=!records.length;
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
 '<div class="importer-card-actions"><button type="button" data-edit-image="'+i+'" class="importer-edit-image" '+(!r.imageData?'disabled':'')+'>✎ Editar imagem / retoque</button><button type="button" data-approve="'+i+'" '+(r.status==='approved'?'disabled':'')+'>'+(r.status==='approved'?'✓ Aprovado':'✓ Aprovar caso')+'</button><button type="button" data-rotate="'+i+'">Girar imagem 90°</button><button type="button" data-download="'+i+'">Baixar imagem</button></div>'+
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
 if(field==='case_id'&&records.some(o=>o!==r&&o.case_id===next)){status('Esse caso já está associado a outro recorte. Escolha um caso disponível.');e.target.value=r.case_id;return}
 r[field]=next;if(field==='case_id')r.confidence='manual';
 if(field==='status'&&next==='approved'&&!r.algorithm.trim()){r.status='draft';e.target.value='draft';return status('Informe um algoritmo antes de aprovar o caso.')}
 if(['algorithm','setup','orientation','case_id'].includes(field)&&r.status==='approved'){
   r.status='draft';update();status('Edição salva somente como rascunho. Aprove novamente para publicar.');
 }else if(field==='case_id'||field==='status')update()
});
$('import-cards').addEventListener('click',async e=>{
 const a=e.target.closest('[data-rotate]'),b=e.target.closest('[data-download]'),approve=e.target.closest('[data-approve]');
 const crop=e.target.closest('button[data-crop]');
 const editImage=e.target.closest('button[data-edit-image]');
 if(editImage){const r=records[Number(editImage.dataset.editImage)];if(!r?.imageData)return status('Imagem indisponível. Importe o PDF primeiro.');
  await openImageEditor(r,(result,original)=>{r.imageOriginal ||= original;r.imageData=result;r.status='draft';r.imageUpdatedAt=Date.now();update();status('Imagem de '+r.case_id+' corrigida. Reaprove e salve para atualizar a biblioteca.');});return}
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
  r.rect=rect;r.imageData=cropDiagram(page,rect);r.status='draft';
  page.canvas.width=0;page.canvas.height=0;pageImageCache.clear();
  update();status('Recorte de '+r.case_id+' ajustado. Confira a imagem e aprove novamente.');
  return;
 }
 if(approve){const r=records[Number(approve.dataset.approve)];if(!r)return;
  if(!r.algorithm?.trim())return status('Informe o algoritmo desse caso antes de aprová-lo.');
  r.status='approved';update();status('Caso '+r.case_id+' aprovado para publicação.');return
 }
 if(a){const r=records[Number(a.dataset.rotate)];if(r?.imageData){r.rotation=(r.rotation+1)%4;r.imageData=await cropRotated(r.imageData,1);if(r.status==='approved')r.status='draft';update();status('Imagem girada. Confira e aprove novamente antes de publicar.')}}
 if(b){const r=records[Number(b.dataset.download)];if(r?.imageData){const link=document.createElement('a');link.href=r.imageData;link.download=r.case_id+'.webp';link.click()}}
});
$('import-create-library').addEventListener('click',async()=>{
 try{guard();const title=$('import-new-library').value.trim();if(title.length<2)throw Error('Informe o nome da biblioteca.');
 const l=await createLibrary(title);libraryOptions();$('import-library').value=l.id;localStorage.setItem(LAST_LIBRARY,l.id);update();status('Biblioteca '+title+' criada. Revise e aprove os casos antes de publicar.')}catch(e){status(e.message)}
});
async function loadExistingLibrary(){
 const id=$('import-library').value;existingRecords=[];if(!id){records=[];update();return}
 try{
  const query='select=case_id,algorithm,setup,orientation,image_data,status,source_page&library_id=eq.'+encodeURIComponent(id)+'&limit=150';
  const [drafts,published]=await Promise.all([
   cloudTable('cfop_library_case_drafts',{query}),
   cloudTable('cfop_library_cases',{query})
  ]);
  const byId=new Map((published||[]).map(r=>[r.case_id,r]));
  for(const d of drafts||[])byId.set(d.case_id,d);
  existingRecords=[...byId.values()];
  showExistingStage();
  status(existingRecords.length?'Biblioteca carregada. Você pode editar e revisar qualquer etapa.':'Biblioteca vazia. Envie um PDF.');
 }catch(e){status('Erro ao carregar: '+e.message)}
}
function showExistingStage(){
 records=existingRecords.filter(r=>CASE_BY_ID.get(r.case_id)?.stage===stage).map(r=>({
 case_id:r.case_id,algorithm:r.algorithm,setup:r.setup,orientation:r.orientation,imageData:r.image_data,imageOriginal:r.image_original||null,
 status:r.status,sourcePage:r.source_page,page:r.source_page,confidence:'manual',alternatives:[]}));
 update();
}
$('import-library').addEventListener('change',()=>{
 const id=$('import-library').value;
 if(id)localStorage.setItem(LAST_LIBRARY,id);
 const library=libraryList().find(x=>x.id===id);
 if(library)$('import-new-library').value=library.title;
 update();loadExistingLibrary();
});
$('import-rename-library').addEventListener('click',async()=>{try{guard();const id=$('import-library').value;if(!id)throw Error('Selecione uma biblioteca.');await renameLibrary(id,$('import-new-library').value.trim(),'');libraryOptions();$('import-library').value=id;status('Nome da biblioteca atualizado para os usuários online.')}catch(e){status(e.message)}});
$('import-stage').addEventListener('change',()=>{stage=$('import-stage').value;showExistingStage();status('Etapa alterada. Escolha um caso ou importe um PDF.')});
$('import-new-library').addEventListener('input',()=>{
 const count=records.filter(r=>r.status==='approved').length;
 $('import-publish').disabled=busy||count===0||(!$('import-library').value&&$('import-new-library').value.trim().length<2);
});
$('import-global-apply').addEventListener('click',async()=>{
 try{guard();if(busy)return;const x=Number($('import-global-x').value),y=Number($('import-global-y').value),zoom=Number($('import-global-zoom').value)/100;
  if(!Number.isFinite(x)||!Number.isFinite(y)||!Number.isFinite(zoom)||Math.abs(x)>45||Math.abs(y)>45||zoom<.5||zoom>2.5)throw Error('Valores de alinhamento inválidos.');
  const targets=records.filter(r=>r.imageData);if(!targets.length)throw Error('Não há imagens nesta etapa.');
  if(!confirm('Aplicar o ajuste geral a '+targets.length+' imagens de '+stage.toUpperCase()+'? Os casos ficarão pendentes de nova aprovação.'))return;
  busy=true;$('import-global-apply').disabled=true;
  const changed=await bulkAdjustImages(targets,{x,y,zoom},(done,total)=>status('Ajustando imagens: '+done+'/'+total));
  update();status(changed+' imagens ajustadas em 512 × 512 WebP. Revise, aprove e publique para atualizar a biblioteca.');
 }catch(err){status('Ajuste geral não aplicado: '+err.message)}finally{busy=false;$('import-global-apply').disabled=false}
});
$('import-approve-all').addEventListener('click',()=>{
 records.forEach(r=>{if(r.algorithm.trim())r.status='approved'});update();
 status('Casos com algoritmo marcados como aprovados. Confira individualmente a identidade e o recorte antes de salvar.');
});
async function saveAll(){
 guard();if(!records.length)throw Error('Nenhum caso para salvar.');
 if(new Set(records.map(r=>r.case_id)).size!==records.length)throw Error('Corrija os casos duplicados.');
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
 try{await saveLibraryCasesBatch(libraryId,records,(done,total)=>status('Salvando '+done+'/'+total+' casos…'))}
 finally{busy=false;$('import-save').disabled=false;update()}
 return libraryId;
}
$('import-save').addEventListener('click',async()=>{try{await saveAll();status('Revisão salva. A biblioteca só fica pública quando você clicar em Publicar biblioteca.')}catch(e){status('Erro ao salvar: '+e.message)}});
$('import-publish').addEventListener('click',async()=>{
 try{
  guard();if(!records.some(r=>r.status==='approved'))throw Error('Aprove ao menos um caso.');
  const target=libraryList().find(l=>l.id===$('import-library').value)?.title||$('import-new-library').value.trim();
  if(!confirm('Publicar os casos aprovados em "'+target+'"? Os alunos poderão escolher esta biblioteca após sincronizar.'))return;
  const id=await saveAll();const count=await publishApprovedLibrary(id);libraryOptions();$('import-library').value=id;update();
  status('Publicado! '+count+' caso'+(count===1?'':'s')+' disponibilizado'+(count===1?'':'s')+' aos alunos após sincronização.');
 }catch(e){status('Erro ao publicar: '+e.message)}
});
$('import-download').addEventListener('click',()=>{if(!records.length)return status('Nenhum caso.');saveBlob('biblioteca-'+stage+'-revisao.json',JSON.stringify({format:'cfop-library-review-v2',stage,items:records},null,2))});
$('import-clear').addEventListener('click',()=>{records=[];update();status('Revisão local limpa; dados já salvos no Supabase permanecem.')});
(async()=>{try{
 await acceptAuthRedirect();await initializeCloud();
 if(!isConfigured()||!owner()){$('importer-access').textContent='Acesso exclusivo do administrador fundador. Entre na conta autorizada no Studio.';return}
 await loadLibraries();libraryOptions();$('importer-access').hidden=true;$('importer-workspace').hidden=false;
 if(['f2l','oll','pll'].includes(context.get('stage'))){stage=context.get('stage');$('import-stage').value=stage}
 if($('import-library').value){
  localStorage.setItem(LAST_LIBRARY,$('import-library').value);
  const library=libraryList().find(l=>l.id===$('import-library').value);
  if(library)$('import-new-library').value=library.title;
  await loadExistingLibrary();
 }
 update();status('Selecione um PDF; a análise começa automaticamente.');
 }catch(e){$('importer-access').textContent='Não foi possível confirmar seu acesso: '+e.message}
})();
