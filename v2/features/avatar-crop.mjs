// Recorte manual com arrasto e zoom. O arquivo original nunca é enviado.
const PREVIEW=288;
let current=null;
function clamp(v,a,b){return Math.min(b,Math.max(a,v))}
function offsets(){
 const im=current.image,ratio=Math.max(PREVIEW/im.naturalWidth,PREVIEW/im.naturalHeight)*current.zoom;
 const w=im.naturalWidth*ratio,h=im.naturalHeight*ratio;
 const maxX=Math.max(0,(w-PREVIEW)/2),maxY=Math.max(0,(h-PREVIEW)/2);
 current.ox=clamp(current.ox,-maxX,maxX);current.oy=clamp(current.oy,-maxY,maxY);
 return {w,h,x:(PREVIEW-w)/2+current.ox,y:(PREVIEW-h)/2+current.oy};
}
function draw(){
 if(!current)return;
 const canvas=document.getElementById('cfop-avatar-crop'),ctx=canvas?.getContext('2d');
 if(!ctx)return;
 canvas.width=PREVIEW;canvas.height=PREVIEW;
 const rect=offsets();
 ctx.clearRect(0,0,PREVIEW,PREVIEW);
 ctx.drawImage(current.image,rect.x,rect.y,rect.w,rect.h);
}
export async function openAvatarCrop(file){
 if(!file)throw Error('Escolha uma imagem.');
 if(file.size>15*1024*1024)throw Error('Escolha uma imagem com menos de 15 MB.');
 if(!/^image\//.test(file.type))throw Error('Escolha uma foto PNG, JPEG, WebP ou outro formato de imagem aceito pelo navegador.');
 const url=URL.createObjectURL(file),img=new Image();
 try{await new Promise((resolve,reject)=>{img.onload=resolve;img.onerror=()=>reject(Error('Imagem inválida ou não suportada.'));img.src=url})}
 finally{URL.revokeObjectURL(url)}
 if(!img.naturalWidth||!img.naturalHeight)throw Error('Não foi possível ler a imagem.');
 current={image:img,zoom:1,ox:0,oy:0,active:null};
 const host=document.getElementById('cfop-avatar-crop-host');
 if(!host)throw Error('Editor de foto indisponível.');
 host.innerHTML='<div class="identity-crop-editor"><h3>Enquadrar foto</h3>'+
 '<p>Arraste a imagem para escolher o centro. Ajuste o zoom e confirme.</p>'+
 '<canvas id="cfop-avatar-crop" width="288" height="288" aria-label="Prévia quadrada da foto"></canvas>'+
 '<label>Zoom <input id="cfop-avatar-zoom" type="range" min="1" max="3.5" step=".05" value="1"></label>'+
 '<div class="identity-actions"><button type="button" data-identity="save-crop">Usar esta foto</button>'+
 '<button type="button" class="secondary" data-identity="cancel-crop">Cancelar</button></div></div>';
 const canvas=document.getElementById('cfop-avatar-crop');
 canvas.style.touchAction='none';
 canvas.addEventListener('pointerdown',e=>{
  canvas.setPointerCapture(e.pointerId);
  current.active={id:e.pointerId,x:e.clientX,y:e.clientY,ox:current.ox,oy:current.oy};
 });
 canvas.addEventListener('pointermove',e=>{
  if(current?.active?.id!==e.pointerId)return;
  const size=canvas.getBoundingClientRect().width||PREVIEW;
  current.ox=current.active.ox+(e.clientX-current.active.x)*PREVIEW/size;
  current.oy=current.active.oy+(e.clientY-current.active.y)*PREVIEW/size;
  draw();
 });
 const release=e=>{if(current?.active?.id===e.pointerId)current.active=null};
 canvas.addEventListener('pointerup',release);
 canvas.addEventListener('pointercancel',release);
 document.getElementById('cfop-avatar-zoom').addEventListener('input',e=>{
  current.zoom=Number(e.target.value);draw();
 });
 draw();
}
export function cancelAvatarCrop(){
 current=null;
 const host=document.getElementById('cfop-avatar-crop-host');if(host)host.replaceChildren();
}
export function exportAvatarCrop(){
 if(!current)throw Error('Selecione a imagem e o enquadramento.');
 const img=current.image;
 const rect=offsets(),output=document.createElement('canvas');
 let final='';
 for(const size of [192,160,128]){
  output.width=size;output.height=size;
  const ctx=output.getContext('2d',{alpha:false});
  ctx.fillStyle='#112b49';ctx.fillRect(0,0,size,size);
  ctx.drawImage(img,rect.x*size/PREVIEW,rect.y*size/PREVIEW,rect.w*size/PREVIEW,rect.h*size/PREVIEW);
  for(const quality of [.76,.63,.5,.37]){
   final=output.toDataURL('image/webp',quality);
   if(final.startsWith('data:image/webp;base64,')&&final.length<79000)return final;
  }
 }
 throw Error('Não foi possível compactar a foto. Escolha outra imagem.');
}
