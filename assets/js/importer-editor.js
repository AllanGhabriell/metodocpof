/* Academia CPOF — editor visual administrativo. Imagens 1:1 WebP; sem alterar algoritmos. */
const SIZE=512,QUALITY=.84,LIMIT=650000;
const $=id=>document.getElementById(id);
const load=data=>new Promise((resolve,reject)=>{if(!/^data:image\/(png|webp|jpeg);base64,/.test(data||''))return reject(Error('Imagem não cadastrada.'));const img=new Image();img.onload=()=>resolve(img);img.onerror=()=>reject(Error('Não foi possível abrir a imagem.'));img.src=data});
const canvas=()=>{const c=document.createElement('canvas');c.width=SIZE;c.height=SIZE;return c};
const exportImage=c=>{const v=c.toDataURL('image/webp',QUALITY);if(v.length>LIMIT)throw Error('Imagem excedeu o limite de armazenamento. Reduza a área editada.');return v};
function paintBase(c,img,{x=0,y=0,zoom=1,rotation=0}={}){
 const ctx=c.getContext('2d',{willReadFrequently:true});ctx.clearRect(0,0,SIZE,SIZE);ctx.fillStyle='#ffffff';ctx.fillRect(0,0,SIZE,SIZE);
 const fit=Math.min(SIZE/img.width,SIZE/img.height)*zoom;
 ctx.save();ctx.translate(SIZE/2+x*SIZE/100,SIZE/2+y*SIZE/100);ctx.rotate(rotation*Math.PI/180);ctx.scale(fit,fit);ctx.drawImage(img,-img.width/2,-img.height/2);ctx.restore();
}
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
export async function bulkAdjustImages(records,settings,onProgress=()=>{}){
 const changed=[];for(let i=0;i<records.length;i++){
  const r=records[i];if(!r.imageData)continue;
  const img=await load(r.imageData),c=canvas();paintBase(c,img,settings);
  const updated=exportImage(c);changed.push({r,updated});onProgress(i+1,records.length);
 }
 // Atomic local commit: invalid images do not leave a half-adjusted library.
 for(const {r,updated} of changed){r.imageOriginal ||= r.imageData;r.imageData=updated;r.status='draft';r.imageUpdatedAt=Date.now()}
 return changed.length
}
export async function standardizeImages(records){
 let normalized=0;
 for(const record of records){
  if(!record.imageData)continue;
  const img=await load(record.imageData);
  if(img.naturalWidth===SIZE&&img.naturalHeight===SIZE&&record.imageData.startsWith('data:image/webp;'))continue;
  const target=canvas();paintBase(target,img);
  record.imageOriginal ||= record.imageData;
  record.imageData=exportImage(target);normalized++;
 }
 return normalized
}

export function openImageEditor(record,onSave){
 if(!record?.imageData)return Promise.reject(Error('Este caso ainda não tem imagem.'));
 document.getElementById('cpof-image-editor-modal')?.remove();
 const host=document.createElement('div');host.id='cpof-image-editor-modal';host.className='cpof-editor-backdrop';
 host.innerHTML='<div class="cpof-editor-dialog" role="dialog" aria-modal="true" aria-labelledby="cpof-editor-title">'+
 '<div class="cpof-editor-title"><div><h2 id="cpof-editor-title">Corrigir imagem · '+String(record.case_id).replace(/[<>&"]/g,'')+'</h2><p>512 × 512 · WebP · o algoritmo não será alterado</p></div><button type="button" data-edit="close" aria-label="Fechar">✕</button></div>'+
 '<div class="cpof-editor-layout"><div class="cpof-editor-art"><canvas id="cpof-editor-canvas" width="512" height="512" aria-label="Imagem para arrastar ou retocar"></canvas><span>Arraste no modo Mover · pinte para retirar rebarbas</span></div>'+
 '<div class="cpof-editor-sidebar"><label>Ferramenta<select id="cpof-editor-tool"><option value="move">Mover enquadramento</option><option value="paint">Pincel corretivo</option><option value="erase">Borracha (cor de fundo)</option><option value="picker">Conta-gotas</option></select></label>'+
 '<label>Horizontal <output id="cpof-editor-x-value">0%</output><input id="cpof-editor-x" type="range" min="-45" max="45" value="0" step="1"></label>'+
 '<label>Vertical <output id="cpof-editor-y-value">0%</output><input id="cpof-editor-y" type="range" min="-45" max="45" value="0" step="1"></label>'+
 '<label>Zoom <output id="cpof-editor-zoom-value">100%</output><input id="cpof-editor-zoom" type="range" min="50" max="250" value="100" step="5"></label>'+
 '<label>Cor do pincel <input id="cpof-editor-color" type="color" value="#ffffff"></label>'+
 '<label>Espessura <output id="cpof-editor-size-value">6 px</output><input id="cpof-editor-size" type="range" min="1" max="48" value="6"></label>'+
 '<div class="cpof-editor-buttons"><button type="button" data-edit="left">↶ 90°</button><button type="button" data-edit="right">↷ 90°</button><button type="button" data-edit="undo">Desfazer</button><button type="button" data-edit="redo">Refazer</button><button type="button" data-edit="reset">Reiniciar ajuste</button><button type="button" data-edit="original">Restaurar original</button></div></div></div>'+
 '<div class="cpof-editor-footer"><span id="cpof-editor-message" role="status">Alterações permanecem na prévia até salvar.</span><button type="button" data-edit="close">Cancelar</button><button type="button" data-edit="save" class="cpof-editor-confirm">Aplicar ao caso</button></div></div>';
 document.body.appendChild(host);let source=record.imageData,original=record.imageOriginal||source,img=null,preview=$('cpof-editor-canvas'),ctx=preview.getContext('2d',{willReadFrequently:true});
 let overlay=canvas(),overlayCtx=overlay.getContext('2d',{willReadFrequently:true}),state={x:0,y:0,zoom:1,rotation:0},undo=[],redo=[],pointer=null,tool='move',dirty=false;
 const msg=s=>$('cpof-editor-message').textContent=s;
 const getState=()=>({source,state:{...state},overlay:overlayCtx.getImageData(0,0,SIZE,SIZE)});
 const restore=async snapshot=>{source=snapshot.source;img=await load(source);state={...snapshot.state};overlayCtx.putImageData(snapshot.overlay,0,0);sync();draw()};
 const push=()=>{undo.push(getState());if(undo.length>16)undo.shift();redo=[]};
 function sync(){for(const [key,field,display] of [['x','cpof-editor-x','%'],['y','cpof-editor-y','%'],['zoom','cpof-editor-zoom','%']]){let v=key==='zoom'?Math.round(state.zoom*100):state[key];$(field).value=v;$(field+'-value').textContent=v+display}}
 function draw(){if(!img)return;paintBase(preview,img,state);ctx.drawImage(overlay,0,0);dirty=true}
 const pointerAt=e=>{const r=preview.getBoundingClientRect();return {x:clamp((e.clientX-r.left)*SIZE/r.width,0,SIZE),y:clamp((e.clientY-r.top)*SIZE/r.height,0,SIZE)}};
 const brush=(a,b)=>{overlayCtx.save();overlayCtx.lineCap='round';overlayCtx.lineJoin='round';overlayCtx.lineWidth=Number($('cpof-editor-size').value)||6;overlayCtx.strokeStyle=tool==='erase'?'#ffffff':$('cpof-editor-color').value;overlayCtx.beginPath();overlayCtx.moveTo(a.x,a.y);overlayCtx.lineTo(b.x,b.y);overlayCtx.stroke();overlayCtx.restore();draw()};
 preview.addEventListener('pointerdown',e=>{if(!img)return;let at=pointerAt(e);if(tool==='picker'){const pixel=ctx.getImageData(Math.floor(at.x),Math.floor(at.y),1,1).data;$('cpof-editor-color').value='#'+[pixel[0],pixel[1],pixel[2]].map(v=>v.toString(16).padStart(2,'0')).join('');$('cpof-editor-tool').value='paint';tool='paint';return}
 push();pointer=at;preview.setPointerCapture(e.pointerId);if(tool!=='move')brush(at,at)});
 preview.addEventListener('pointermove',e=>{if(!pointer)return;const next=pointerAt(e);if(tool==='move'){state.x=clamp(state.x+(next.x-pointer.x)*100/SIZE,-45,45);state.y=clamp(state.y+(next.y-pointer.y)*100/SIZE,-45,45);sync();draw()}else brush(pointer,next);pointer=next});
 const end=()=>{pointer=null};preview.addEventListener('pointerup',end);preview.addEventListener('pointercancel',end);
 $('cpof-editor-tool').onchange=e=>{tool=e.target.value;preview.style.cursor=tool==='move'?'grab':'crosshair'};
 ['x','y','zoom'].forEach(key=>{$('cpof-editor-'+key).addEventListener('pointerdown',()=>push(),{passive:true});$('cpof-editor-'+key).oninput=e=>{state[key]=key==='zoom'?Number(e.target.value)/100:Number(e.target.value);sync();draw()};$('cpof-editor-'+key).onchange=()=>{dirty=true}});
 $('cpof-editor-size').oninput=e=>$('cpof-editor-size-value').textContent=e.target.value+' px';
 host.addEventListener('click',async e=>{const action=e.target.closest('[data-edit]')?.dataset.edit;if(!action)return;
  try{
   if(action==='close'){host.remove();return}
   if(action==='left'||action==='right'){push();state.rotation=(state.rotation+(action==='left'?270:90))%360;draw()}
   if(action==='reset'){push();state={x:0,y:0,zoom:1,rotation:0};overlayCtx.clearRect(0,0,SIZE,SIZE);sync();draw()}
   if(action==='original'){push();source=original;img=await load(source);state={x:0,y:0,zoom:1,rotation:0};overlayCtx.clearRect(0,0,SIZE,SIZE);sync();draw()}
   if(action==='undo'&&undo.length){redo.push(getState());await restore(undo.pop())}
   if(action==='redo'&&redo.length){undo.push(getState());await restore(redo.pop())}
   if(action==='save'){const result=exportImage(preview);onSave(result,original);host.remove()}
  }catch(err){msg(err.message)}
 });
 load(source).then(v=>{img=v;sync();draw()}).catch(err=>msg(err.message));
 return Promise.resolve()
}
