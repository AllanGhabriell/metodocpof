// Editor gráfico local. Não altera a validação matemática nem libera aprovação.
const validData=x=>typeof x==='string'&&/^data:image\/(png|jpeg|webp);base64,/.test(x);
let image=null,rotation=0,zoom=1,offsetX=0,offsetY=0,drag=null,selectedId='';
const esc=x=>String(x??'').replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
export function imageEditorPanel(record){
 return '<section class="review-editor"><h3>Editor visual do caso</h3>'+
 '<p class="muted">Importe uma imagem do caso, ajuste o enquadramento e salve uma versão WebP otimizada. O editor não valida o algoritmo nem substitui o PDF.</p>'+
 '<label class="review-file-label" for="review-image-input">Escolher imagem JPG, PNG ou WebP</label>'+
 '<input type="file" id="review-image-input" accept="image/png,image/jpeg,image/webp" hidden>'+
 '<div class="review-canvas-frame"><canvas id="review-canvas" width="384" height="384" role="img" aria-label="Área de corte da imagem: arraste para posicionar"></canvas></div>'+
 '<div class="review-editor-controls"><button type="button" class="secondary" data-editor="rotateLeft">↶ Girar 90°</button><button type="button" class="secondary" data-editor="rotateRight">↷ Girar 90°</button><label for="review-zoom">Zoom <input type="range" id="review-zoom" min="1" max="3" step=".05" value="1"></label></div>'+
 '<div class="row"><button type="button" data-editor="save">Salvar recorte</button><button type="button" class="secondary" data-editor="reset">Reiniciar enquadramento</button><button type="button" class="secondary" data-editor="clear">Remover imagem</button></div>'+
 '<p class="muted" id="review-image-message">'+(validData(record.imageData)?'Imagem salva.':'Nenhuma imagem salva para este caso.')+'</p>'+
 (validData(record.imageData)?'<p class="panel-overline">Imagem atual</p><img class="review-saved-image" src="'+record.imageData+'" alt="Imagem recortada do caso '+esc(record.id)+'">':'')+'</section>';
}
function canvas(){return document.getElementById('review-canvas')}
function status(msg){const el=document.getElementById('review-image-message');if(el)el.textContent=msg}
function draw(){
 const c=canvas();if(!c)return;
 const ctx=c.getContext('2d');if(!ctx)return;
 ctx.clearRect(0,0,c.width,c.height);ctx.fillStyle='#100d1c';ctx.fillRect(0,0,c.width,c.height);
 if(!image){ctx.fillStyle='#9686b1';ctx.textAlign='center';ctx.font='15px system-ui';ctx.fillText('Escolha uma imagem para editar',192,190);return}
 const angle=rotation*Math.PI/180,rotated=rotation%180!==0;
 const w=rotated?image.height:image.width,h=rotated?image.width:image.height;
 const fit=Math.max(320/w,320/h)*zoom;
 ctx.save();ctx.beginPath();ctx.rect(32,32,320,320);ctx.clip();
 ctx.translate(192+offsetX,192+offsetY);ctx.rotate(angle);ctx.scale(fit,fit);
 ctx.drawImage(image,-image.width/2,-image.height/2);ctx.restore();
 ctx.strokeStyle='#b99af9';ctx.lineWidth=2;ctx.strokeRect(32,32,320,320);
 const shade='rgba(0,0,0,.37)';ctx.fillStyle=shade;ctx.fillRect(0,0,384,31);ctx.fillRect(0,353,384,31);ctx.fillRect(0,32,31,321);ctx.fillRect(353,32,31,321);
}
export function mountEditor(record){
 selectedId=record?.id||'';image=null;rotation=0;zoom=1;offsetX=0;offsetY=0;drag=null;
 const c=canvas();if(!c)return;
 c.onpointerdown=e=>{if(!image)return;drag={x:e.clientX,y:e.clientY};c.setPointerCapture(e.pointerId)};
 c.onpointermove=e=>{if(!drag)return;const k=c.width/c.getBoundingClientRect().width;offsetX+=(e.clientX-drag.x)*k;offsetY+=(e.clientY-drag.y)*k;drag={x:e.clientX,y:e.clientY};draw()};
 c.onpointerup=()=>{drag=null};c.onpointercancel=()=>{drag=null};
 if(validData(record?.imageData)){
  const img=new Image();img.onload=()=>{if(selectedId===record.id){image=img;draw()}};img.src=record.imageData;
 }else draw();
}
export async function imageChosen(file){
 if(!file)return false;
 if(!/^image\/(png|jpeg|webp)$/.test(file.type)||file.size>10e6){status('Arquivo inválido. Use imagem PNG, JPG ou WebP até 10 MB.');return true}
 try{
  const url=URL.createObjectURL(file);
  const img=new Image();
  img.onload=()=>{URL.revokeObjectURL(url);image=img;rotation=0;zoom=1;offsetX=0;offsetY=0;const input=document.getElementById('review-zoom');if(input)input.value='1';draw();status('Arraste para enquadrar e salve o recorte.')};
  img.onerror=()=>{URL.revokeObjectURL(url);status('Não foi possível abrir a imagem.')};
  img.src=url;
 }catch{status('Não foi possível abrir a imagem.')}
 return true;
}
export function imageChanged(target){
 if(target.id!=='review-zoom')return false;
 zoom=Math.max(1,Math.min(3,Number(target.value)||1));draw();return true;
}
export function imageEditorClick(button,record,saveRecord){
 const cmd=button.dataset.editor;if(!cmd)return false;
 if(cmd==='rotateLeft')rotation=(rotation+270)%360;
 if(cmd==='rotateRight')rotation=(rotation+90)%360;
 if(cmd==='reset'){rotation=0;zoom=1;offsetX=0;offsetY=0;const input=document.getElementById('review-zoom');if(input)input.value='1'}
 if(cmd==='clear'){record.imageData=null;image=null;saveRecord();status('Imagem removida.');draw();return true}
 if(cmd==='save'){
  if(!image){status('Escolha uma imagem antes de salvar.');return true}
  // Exportação em 360x360, sem moldura e com compressão WebP.
  const c=document.createElement('canvas');c.width=360;c.height=360;
  const ctx=c.getContext('2d');ctx.fillStyle='#fff';ctx.fillRect(0,0,360,360);
  const rotated=rotation%180!==0,w=rotated?image.height:image.width,h=rotated?image.width:image.height;
  const fit=Math.max(320/w,320/h)*zoom*360/320;
  ctx.translate(180+offsetX*360/320,180+offsetY*360/320);ctx.rotate(rotation*Math.PI/180);ctx.scale(fit,fit);ctx.drawImage(image,-image.width/2,-image.height/2);
  const content=c.toDataURL('image/webp',.8);
  if(content.length>650000){status('Imagem muito grande para armazenamento local; tente um recorte menor.');return true}
  record.imageData=content;saveRecord();status('Recorte salvo em WebP otimizado.');return true;
 }
 draw();return true;
}
