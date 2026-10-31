import {isAdmin,isConfigured,cloudUser,initializeCloud,acceptAuthRedirect,cloudTable} from '../../v2/cloud/cloud.mjs?v=20261030-55';
import {FIXED_CASES,CASE_BY_ID,LIMITS} from '../../v2/data/case-catalog.mjs';
import {assignFixedCases,cropDiagram} from '../../v2/data/pdf-layout.mjs';
import {loadLibraries,libraryList,createLibrary,saveLibraryCase,publishApprovedLibrary,renameLibrary} from '../../v2/cloud/libraries.mjs';
const PDF='https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.10.38/pdf.min.mjs';
const $=id=>document.getElementById(id);
let records=[],stage='f2l',busy=false,doc=null,pdfFile=null,pageImageCache=new Map(),existingRecords=[];
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const status=s=>{$('import-status').textContent=s};
const owner=()=>isAdmin()&&cloudUser()?.email?.toLowerCase()==='coelhodatoca124@gmail.com';
function libraryOptions(){
 const previous=$('import-library').value;
 $('import-library').innerHTML='<option value="">Selecione a biblioteca</option>'+libraryList().map(l=>'<option value="'+esc(l.id)+'">'+esc(l.title)+(l.is_public?' · pública':' · rascunho')+'</option>').join('');
 if(libraryList().some(x=>x.id===previous))$('import-library').value=previous;
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
 const checked=records.filter(r=>r.status==='approved').length,unknown=records.filter(r=>r.confidence!=='nome').length;
 $('import-count').textContent=records.length+' de '+LIMITS[stage]+' casos · '+checked+' aprovados · '+unknown+' exigem conferência da identidade';
 $('import-results').hidden=!records.length;
 const fixed=FIXED_CASES.filter(c=>c.stage===stage);
 $('import-cards').innerHTML=records.map((r,i)=>'<article class="importer-card" data-index="'+i+'">'+
 '<div class="importer-card-title"><h3>'+esc(CASE_BY_ID.get(r.case_id)?.name||r.case_id)+'</h3><span class="'+(r.confidence==='nome'?'importer-detected':'importer-warning')+'">'+(r.confidence==='nome'?'Nome reconhecido':'Conferir associação')+'</span></div>'+
 '<img src="'+esc(r.imageData||'')+'" alt="Recorte do '+esc(r.case_id)+'" loading="lazy">'+
 '<label>Caso fixo<select data-field="case_id">'+fixed.map(c=>'<option value="'+esc(c.id)+'" '+(c.id===r.case_id?'selected':'')+'>'+esc(c.name)+' ('+c.id+')</option>').join('')+'</select></label>'+
 '<label>Algoritmo<input data-field="algorithm" value="'+esc(r.algorithm||'')+'" placeholder="Sequência para resolver o caso"></label>'+
 '<label>Setup<input data-field="setup" value="'+esc(r.setup||'')+'" placeholder="Sequência para montar o caso"></label>'+
 '<label>Orientação<input data-field="orientation" value="'+esc(r.orientation||'')+'" placeholder="Ex.: branco embaixo, frente vermelha"></label>'+
 '<label>Revisão<select data-field="status"><option value="draft" '+(r.status==='draft'?'selected':'')+'>Pendente</option><option value="approved" '+(r.status==='approved'?'selected':'')+'>Aprovado</option><option value="rejected" '+(r.status==='rejected'?'selected':'')+'>Rejeitado</option></select></label>'+
 (r.page?'<small>Página '+r.page+' · '+(r.alternatives?.length?'Possui algoritmos alternativos':'Uma sequência reconhecida')+'</small>':'<small>Versão já cadastrada</small>')+
 '<div class="importer-card-actions"><button type="button" data-rotate="'+i+'">Girar imagem 90°</button><button type="button" data-download="'+i+'">Baixar imagem</button></div>'+
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
 const result={incomplete:records.length!==LIMITS[stage]};
 records.sort((a,b)=>CASE_BY_ID.get(a.case_id).ordinal-CASE_BY_ID.get(b.case_id).ordinal);
 update();
 status(result.incomplete?
 'Reconhecidos '+records.length+' de '+LIMITS[stage]+' casos. Revise as associações e os casos faltantes antes de publicar.':
 'Detectados '+records.length+' casos. Confira os nomes atribuídos por posição, os setups e cada recorte; nada foi publicado.');
}
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
 const a=e.target.closest('[data-rotate]'),b=e.target.closest('[data-download]');
 if(a){const r=records[Number(a.dataset.rotate)];if(r?.imageData){r.rotation=(r.rotation+1)%4;r.imageData=await cropRotated(r.imageData,1);update()}}
 if(b){const r=records[Number(b.dataset.download)];if(r?.imageData){const link=document.createElement('a');link.href=r.imageData;link.download=r.case_id+'.webp';link.click()}}
});
$('import-create-library').addEventListener('click',async()=>{
 try{guard();const title=$('import-new-library').value.trim();if(title.length<2)throw Error('Informe o nome da biblioteca.');
 const l=await createLibrary(title);libraryOptions();$('import-library').value=l.id;status('Biblioteca '+title+' criada como rascunho.')}catch(e){status(e.message)}
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
 case_id:r.case_id,algorithm:r.algorithm,setup:r.setup,orientation:r.orientation,imageData:r.image_data,
 status:r.status,sourcePage:r.source_page,page:r.source_page,confidence:'manual',alternatives:[]}));
 update();
}
$('import-library').addEventListener('change',()=>{const l=libraryList().find(x=>x.id===$('import-library').value);if(l)$('import-new-library').value=l.title;loadExistingLibrary()});
$('import-rename-library').addEventListener('click',async()=>{try{guard();const id=$('import-library').value;if(!id)throw Error('Selecione uma biblioteca.');await renameLibrary(id,$('import-new-library').value.trim(),'');libraryOptions();$('import-library').value=id;status('Nome da biblioteca atualizado para os usuários online.')}catch(e){status(e.message)}});
$('import-stage').addEventListener('change',()=>{stage=$('import-stage').value;showExistingStage();status('Etapa alterada. Escolha um caso ou importe um PDF.')});
$('import-approve-all').addEventListener('click',()=>{
 records.forEach(r=>{if(r.algorithm.trim())r.status='approved'});update();
 status('Casos com algoritmo marcados como aprovados. Confira individualmente a identidade e o recorte antes de salvar.');
});
async function saveAll(){
 guard();const libraryId=$('import-library').value;if(!libraryId)throw Error('Escolha ou crie a biblioteca antes de salvar.');
 if(!records.length)throw Error('Nenhum caso para salvar.');
 if(new Set(records.map(r=>r.case_id)).size!==records.length)throw Error('Corrija os casos duplicados.');
 busy=true;$('import-save').disabled=true;let done=0;
 try{for(const r of records){
  await saveLibraryCase(libraryId,r);done++;status('Salvando '+done+'/'+records.length+' casos…');
 }}finally{busy=false;$('import-save').disabled=false}
 return libraryId;
}
$('import-save').addEventListener('click',async()=>{try{await saveAll();status('Revisão salva. A biblioteca só fica pública quando você clicar em Publicar biblioteca.')}catch(e){status('Erro ao salvar: '+e.message)}});
$('import-publish').addEventListener('click',async()=>{
 try{
  guard();if(!records.some(r=>r.status==='approved'))throw Error('Aprove ao menos um caso.');
  if(!confirm('Publicar os casos aprovados? Os alunos poderão escolher esta biblioteca, inclusive após sincronização offline.'))return;
  const id=await saveAll();const count=await publishApprovedLibrary(id);libraryOptions();$('import-library').value=id;
  status('Biblioteca publicada com '+count+' casos aprovados. Os alunos verão essas alterações após sincronizar.');
 }catch(e){status('Erro ao publicar: '+e.message)}
});
$('import-download').addEventListener('click',()=>{if(!records.length)return status('Nenhum caso.');saveBlob('biblioteca-'+stage+'-revisao.json',JSON.stringify({format:'cfop-library-review-v2',stage,items:records},null,2))});
$('import-clear').addEventListener('click',()=>{records=[];update();status('Revisão local limpa; dados já salvos no Supabase permanecem.')});
(async()=>{try{
 await acceptAuthRedirect();await initializeCloud();
 if(!isConfigured()||!owner()){$('importer-access').textContent='Acesso exclusivo do administrador fundador. Entre na conta autorizada no Studio.';return}
 await loadLibraries();libraryOptions();$('importer-access').hidden=true;$('importer-workspace').hidden=false;
 status('Selecione ou crie uma biblioteca. Depois envie o PDF e revise os casos.');
 }catch(e){$('importer-access').textContent='Não foi possível confirmar seu acesso: '+e.message}
})();
