import {solved,apply,facelets} from '../cube/engine.mjs';
// Editor de adesivos para comparar o diagrama com o PDF antes de aprovar um caso.
const faces=['U','F','R','D','L','B'],colors={U:'#f3f4f6',D:'#f6d54a',F:'#2ba66f',B:'#427ae5',R:'#ef4c50',L:'#f3a142',X:'#24252d'};
let selectedColor='X';
const esc=x=>String(x??'').replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
function fromState(setup){
 const state=apply(solved(),setup);
 return {state,diagram:facelets(state)};
}
const safePattern=pattern=>{
 if(!pattern||typeof pattern!=='object')return false;
 return faces.every(face=>Array.isArray(pattern[face])&&pattern[face].length===9&&pattern[face].every(v=>Object.hasOwn(colors,v)));
};
function show(pattern){
 return faces.map(face=>
  '<div class="sticker-face-panel"><strong>Face '+face+'</strong><div class="sticker-face-grid">'+
  pattern[face].map((c,i)=>'<button type="button" data-sticker-face="'+face+'" data-sticker-index="'+i+'" class="sticker-tile" style="background:'+colors[c]+'" aria-label="Face '+face+' adesivo '+(i+1)+' cor '+c+'" title="'+face+' '+(i+1)+' · '+c+'"></button>').join('')+
  '</div></div>').join('');
}
export function stickerPanel(record){
 let pattern=null;
 try{pattern=safePattern(record.diagram)?record.diagram:fromState(record.setup||'').diagram}catch{pattern=facelets(solved())}
 return '<section class="sticker-editor"><h3>Diagrama de adesivos</h3><p class="muted">Selecione uma cor e toque nos adesivos para criar a referência exata do PDF. A cor escura X oculta informações irrelevantes e não exige correspondência na validação.</p>'+
 '<div class="sticker-toolbar" aria-label="Paleta">'+Object.entries(colors).map(([key,value])=>'<button type="button" class="sticker-palette '+(selectedColor===key?'active':'')+'" data-sticker-color="'+key+'" style="--sticker-color:'+value+'" title="'+key+'" aria-label="Escolher cor '+key+'" aria-pressed="'+(selectedColor===key)+'"><span></span><small>'+key+'</small></button>').join('')+'</div>'+
 '<div class="sticker-faces">'+show(pattern)+'</div>'+
 '<div class="row sticker-actions"><button type="button" class="secondary" data-sticker-tool="fromsetup">Gerar do setup</button><button type="button" class="secondary" data-sticker-tool="maskall">Ocultar todos</button><button type="button" class="secondary" data-sticker-tool="expected">Gerar estado de referência</button></div>'+
 '<p class="muted sticker-help" role="status">As alterações aparecem no campo Diagrama e são salvas pelo botão “Salvar e verificar”.</p></section>';
}
function pickPanel(){
 const text=document.querySelector('#draftform textarea[name="diagram"]');
 if(!text)throw Error('Abra o formulário do caso para editar.');
 return text;
}
function setupValue(){return document.querySelector('#draftform [name="setup"]')?.value||''}
function getPattern(){
 const text=pickPanel();
 if(text.value.trim()){
  const d=JSON.parse(text.value);if(!safePattern(d))throw Error('O diagrama precisa conter seis faces com nove adesivos cada.');
  return d;
 }
 return fromState(setupValue()).diagram;
}
function setPattern(d){
 pickPanel().value=JSON.stringify(d);
 const frame=document.querySelector('.sticker-faces');
 if(frame)frame.innerHTML=show(d);
}
function status(msg){const el=document.querySelector('.sticker-help');if(el)el.textContent=msg}
export function stickerClick(btn){
 const color=btn.dataset.stickerColor,face=btn.dataset.stickerFace,index=btn.dataset.stickerIndex,tool=btn.dataset.stickerTool;
 if(!color&&!face&&!tool)return false;
 try{
  if(color){
   selectedColor=color;
   document.querySelectorAll('.sticker-palette').forEach(e=>{const active=e.dataset.stickerColor===color;e.classList.toggle('active',active);e.setAttribute('aria-pressed',String(active))});
   status('Cor selecionada: '+color+'. Toque nos adesivos para pintar.');
  }
  if(face){
   const d=getPattern(),i=Number(index);if(!faces.includes(face)||!Number.isInteger(i)||i<0||i>8)throw Error('Adesivo inválido.');
   d[face][i]=selectedColor;setPattern(d);status('Adesivo '+face+'-'+(i+1)+' atualizado. Salve o caso para confirmar.');
  }
  if(tool==='fromsetup'){const d=fromState(setupValue());setPattern(d.diagram);status('Diagrama gerado do setup. Oculte os adesivos irrelevantes conforme o PDF.')}
  if(tool==='maskall'){const d=Object.fromEntries(faces.map(face=>[face,Array(9).fill('X')]));setPattern(d);status('Adesivos ocultados. Pinte apenas as cores relevantes.')}
  if(tool==='expected'){const {state}=fromState(setupValue());const field=document.querySelector('#draftform textarea[name="expectedState"]');if(field)field.value=JSON.stringify(state);status('Estado de referência gerado matematicamente a partir do setup; confira-o com o PDF.')}
 }catch(error){status(error.message)}
 return true;
}
