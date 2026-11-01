/* Identidade compartilhada em TODOS os cartões da Academia CFOP.
   Avaliação técnica e respostas pessoais nunca entram na imagem. */
import {identityState,loadIdentity} from '../cloud/identity.mjs';
import {journeyIdentity,loadJourney} from './journey.mjs?v=20261031-rpg-3';
import {progressSummary} from './progress.mjs?v=20261031-rpg-3';

export async function prepareShareIdentity(){
 await Promise.allSettled([loadIdentity(),loadJourney()]);
 const xp=progressSummary().xp;
 return {identity:identityState(),rank:journeyIdentity(xp),xp};
}
const colors={classic:'#a6d0e9',crystal:'#78d7ff',fire:'#ff9d61',gold:'#f5d27a',
 prismatic:'#d5a1ff',creator:'#ffe3a3'};
const nameColors={classic:'#f5faff',ocean:'#8de0ff',emerald:'#8cf0b1',gold:'#ffe1a0',creator:'#ffe1a0'};
function line(ctx,str,x,y,size,color,weight=700,max=680){
 ctx.fillStyle=color;ctx.font=weight+' '+size+'px system-ui,Arial,sans-serif';
 ctx.fillText(String(str),x,y,max);
}
async function drawAvatar(ctx,data,x,y,r){
 let avatar=null;
 if(typeof data==='string'&&data.startsWith('data:image/webp;base64,')&&data.length<=80000){
  avatar=new Image();
  try{await new Promise((resolve,reject)=>{avatar.onload=resolve;avatar.onerror=reject;avatar.src=data})}catch{avatar=null}
 }
 ctx.save();
 ctx.beginPath();ctx.arc(x,y,r,0,Math.PI*2);
 ctx.clip();ctx.fillStyle='#18547c';ctx.fillRect(x-r,y-r,r*2,r*2);
 if(avatar)ctx.drawImage(avatar,x-r,y-r,r*2,r*2);
 else line(ctx,'C',x-r*.42,y+r*.36,r*1.15,'#e4f9ff',850,r*1.7);
 ctx.restore();
}
export async function addShareProfile(canvas,{top=0,height=185,prepared=null}={}){
 if(!canvas?.getContext)throw Error('Cartão de compartilhamento inválido');
 const {identity,rank,xp}=prepared||await prepareShareIdentity();
 const ctx=canvas.getContext('2d');
 const left=66,width=canvas.width-132,mid=top+height/2;
 const avatarRadius=Math.min(60,height*.31);
 const name=(identity.nickname||'Cubista Anônimo').slice(0,36);
 const stroke=colors[rank.frame]||colors.classic;
 ctx.save();
 ctx.fillStyle='rgba(15,44,75,.97)';
 ctx.beginPath();ctx.roundRect(left,top,width,height,26);ctx.fill();
 ctx.strokeStyle=stroke;ctx.lineWidth=3;ctx.stroke();
 // Borda do avatar acompanha o item equipado e a patente de Criador.
 const centerX=left+avatarRadius+25;
 await drawAvatar(ctx,identity.avatar,centerX,mid,avatarRadius);
 ctx.strokeStyle=stroke;ctx.lineWidth=7;
 if(rank.creator){ctx.shadowBlur=17;ctx.shadowColor='#e9bf68'}
 ctx.beginPath();ctx.arc(centerX,mid,avatarRadius+5,0,Math.PI*2);ctx.stroke();
 ctx.shadowBlur=0;
 const x=centerX+avatarRadius+29;
 line(ctx,name,x,top+height*.33,39,nameColors[rank.name]||nameColors.classic,850,width-(x-left)-25);
 const title=rank.creator?'✦ DEUS CRIADOR DOS CUBOS':String(rank.title||'Cubista').toUpperCase();
 line(ctx,title,x,top+height*.60,25,rank.creator?'#f9d68c':'#9de5fb',800,width-(x-left)-20);
 line(ctx,'NÍVEL '+rank.level+'  ·  '+Math.max(0,Math.trunc(xp)).toLocaleString('pt-BR')+' XP',
  x,top+height*.85,25,'#c2d9e9',700,width-(x-left)-20);
 ctx.restore();
 return canvas;
}
