import {identityState} from '../cloud/identity.mjs';
import {progressData,progressSummary} from './progress.mjs';
import {achievementStats,earnedAchievements} from './achievements.mjs?v=20261031-rpg-2';
import {journeyIdentity} from './journey.mjs?v=20261031-rpg-2';

const W=1080,H=1920;
const fmt=ms=>Number.isFinite(ms)?(ms/1000).toFixed(2)+'s':'—';
function rounded(ctx,x,y,w,h,r,fill){
 ctx.beginPath();ctx.roundRect(x,y,w,h,r);ctx.fillStyle=fill;ctx.fill();
}
function text(ctx,value,x,y,size,color='#e8f5ff',weight=700,max=890){
 ctx.font=weight+' '+size+'px system-ui,Arial,sans-serif';
 ctx.fillStyle=color;ctx.fillText(String(value),x,y,max);
}
function wrap(ctx,value,x,y,maxWidth,lineHeight,maxLines=3){
 const words=String(value).split(/\s+/);
 let line='',count=0;
 for(const word of words){
  const test=line?line+' '+word:word;
  if(ctx.measureText(test).width>maxWidth&&line){
   ctx.fillText(line,x,y+count*lineHeight);count++;line=word;if(count>=maxLines)return;
  }else line=test;
 }
 ctx.fillText(line,x,y+count*lineHeight);
}
function cube(ctx,x,y,size){
 const s=size,colors=['#60d8ff','#43e2c3','#3072db'];
 ctx.save();ctx.translate(x,y);ctx.lineJoin='round';ctx.strokeStyle='#0a203e';ctx.lineWidth=8;
 const shapes=[[[0,-s*.5],[s*.55,-s*.25],[0,0],[-s*.55,-s*.25]],
  [[-s*.55,-s*.25],[0,0],[0,s*.66],[-s*.55,s*.38]],
  [[0,0],[s*.55,-s*.25],[s*.55,s*.38],[0,s*.66]]];
 shapes.forEach((points,i)=>{ctx.beginPath();points.forEach(([a,b],n)=>n?ctx.lineTo(a,b):ctx.moveTo(a,b));ctx.closePath();ctx.fillStyle=colors[i];ctx.fill();ctx.stroke()});
 ctx.restore();
}
async function drawAvatar(ctx,data,x,y,size){
 if(!data?.startsWith('data:image/webp;base64,'))return;
 const img=new Image();
 try{
  await new Promise((resolve,reject)=>{img.onload=resolve;img.onerror=reject;img.src=data});
  ctx.save();ctx.beginPath();ctx.arc(x,y,size/2,0,Math.PI*2);ctx.clip();
  ctx.drawImage(img,x-size/2,y-size/2,size,size);ctx.restore();
 }catch{}
}
async function drawSolvePhoto(ctx,file,x,y,w,h){
 if(!file)return false;
 if(!/^image\//.test(file.type)||file.size>10*1024*1024)
  throw Error('Escolha uma foto de até 10 MB.');
 const url=URL.createObjectURL(file),img=new Image();
 try{
  await new Promise((resolve,reject)=>{img.onload=resolve;img.onerror=()=>reject(Error('Foto não suportada.'));img.src=url});
  const scale=Math.max(w/img.naturalWidth,h/img.naturalHeight);
  const sw=w/scale,sh=h/scale,sx=(img.naturalWidth-sw)/2,sy=(img.naturalHeight-sh)/2;
  ctx.save();
  ctx.beginPath();ctx.roundRect(x,y,w,h,27);ctx.clip();
  ctx.drawImage(img,sx,sy,sw,sh,x,y,w,h);
  ctx.restore();
  return true;
 }finally{URL.revokeObjectURL(url)}
}

export async function buildShareCard(kind='streak',achievementId='',attachedPhoto=null){
 const records=progressData().records||[],summary=progressSummary(),metrics=achievementStats(records);
 const nickname=identityState().nickname||'Cubista Anônimo';
 const rank=journeyIdentity(summary.xp);
 const earned=earnedAchievements(records);
 const badge=earned.find(x=>x.id===achievementId&&x.earned);
 if(kind==='achievement'&&!badge)throw Error('Esta conquista ainda não foi desbloqueada.');
 if(kind==='record'&&metrics.best===null)throw Error('Registre pelo menos um tempo válido para compartilhar um recorde.');
 const canvas=document.createElement('canvas');canvas.width=W;canvas.height=H;
 const ctx=canvas.getContext('2d',{alpha:false});
 const bg=ctx.createLinearGradient(0,0,W,H);
 bg.addColorStop(0,'#071e3b');bg.addColorStop(.55,'#0b2849');bg.addColorStop(1,'#160f38');
 ctx.fillStyle=bg;ctx.fillRect(0,0,W,H);
 for(let i=0;i<25;i++){ctx.strokeStyle='rgba(91,181,235,.075)';ctx.beginPath();ctx.moveTo(40+i*46,0);ctx.lineTo(i*46-180,H);ctx.stroke()}
 rounded(ctx,58,74,964,100,34,'rgba(92,185,238,.10)');
 text(ctx,'ACADEMIA',96,140,45,'#b3d9f1',800);
 text(ctx,'CFOP',375,140,45,'#65e9ff',900);
 text(ctx,'3 × 3',868,138,36,'#9cc0da',700);
 ctx.fillStyle='#8de6f9';ctx.fillRect(70,255,122,9);
 const title=kind==='record'?'NOVO RECORDE':kind==='achievement'?'CONQUISTA DESBLOQUEADA':'MINHA SEQUÊNCIA';
 text(ctx,title,70,339,52,'#70dcf5',900);
 const primary=kind==='record'?fmt(metrics.best):kind==='achievement'?badge.icon+' '+badge.title:metrics.streak+' DIAS';
 const mainSize=kind==='achievement'?82:kind==='record'?145:130;
 text(ctx,primary,70,530,mainSize,'#ffffff',900,930);
 let subtitle=kind==='record'?'Meu melhor tempo registrado no cronômetro':
  kind==='achievement'?badge.subtitle:'Dias consecutivos com treino registrado';
 ctx.font='500 36px system-ui,Arial,sans-serif';ctx.fillStyle='#bfdbed';
 wrap(ctx,subtitle,72,620,880,47,2);
 rounded(ctx,66,755,948,700,42,'#112f53');
 if(!(kind==='record'&&attachedPhoto&&await drawSolvePhoto(ctx,attachedPhoto,325,795,430,300)))
  cube(ctx,540,950,245);
 if(kind==='record'){
  const top=metrics.times.slice().sort((a,b)=>a-b).slice(0,5);
  text(ctx,'MEUS 5 MELHORES TEMPOS',110,1155,36,'#8de6f9',800);
  top.forEach((ms,i)=>text(ctx,(i+1)+'.  '+fmt(ms),118,1224+i*47,34,i===0?'#a6ffe0':'#e1eff8',750));
  const avg=top.length?top.reduce((a,b)=>a+b,0)/top.length:null;
  text(ctx,'Média dos '+top.length+' melhores: '+fmt(avg),118,1420,31,'#ffffff',650);
 }else if(kind==='achievement'){
  text(ctx,'+'+badge.xp+' XP DE CONQUISTA',110,1188,50,'#94f6c7',800);
  text(ctx,'Seu esforço virou uma nova conquista!',110,1272,33,'#e0eefb',600);
 }else{
  text(ctx,'F2L  '+metrics.counts.f2l+' CASOS',110,1196,43,'#d3f2ff',800);
  text(ctx,'OLL  '+metrics.counts.oll+' CASOS',110,1260,43,'#d3f2ff',800);
  text(ctx,'PLL  '+metrics.counts.pll+' CASOS',110,1324,43,'#d3f2ff',800);
 }
 rounded(ctx,69,1530,940,240,28,'rgba(139,208,248,.11)');
 await drawAvatar(ctx,identityState().avatar,154,1650,110);
 const label=nickname.length>28?nickname.slice(0,27)+'…':nickname;
 // O cartão compartilhado mostra apenas título, XP e aparência.
 if(['gold','creator','prismatic'].includes(rank.frame)){
  ctx.strokeStyle=rank.frame==='creator'?'#ffe3a3':rank.frame==='gold'?'#f0cb68':'#d9a2ff';
  ctx.lineWidth=7;ctx.beginPath();ctx.arc(154,1650,59,0,Math.PI*2);ctx.stroke();
 }
 text(ctx,label,identityState().avatar?238:111,1657,50,['gold','creator'].includes(rank.name)?'#f7d87d':rank.name==='emerald'?'#85f1bd':rank.name==='ocean'?'#7ddfff':'#fff',850,750);
 text(ctx,rank.creator?'✦ DEUS CRIADOR DOS CUBOS':rank.title.toUpperCase(),identityState().avatar?238:111,1703,24,rank.creator?'#ffe2a0':'#a0e7df',800,740);
 text(ctx,(rank.creator?'PATENTE DIVINA':'NÍVEL '+summary.level)+'  •  '+summary.xp+' XP',identityState().avatar?238:111,1741,24,'#b5d4e9',700,740);
 text(ctx,new Date().toLocaleDateString('pt-BR')+'  •  Feito para compartilhar',74,1842,28,'#9ebfd7',500);
 return {canvas,title,caption:kind==='record'?
  nickname+' fez '+fmt(metrics.best)+' na Academia CFOP!':
  kind==='achievement'?nickname+' desbloqueou '+badge.title+' na Academia CFOP!':
  nickname+' chegou a '+metrics.streak+' dias de treino na Academia CFOP!'};
}
export async function deliverShareCard(kind,achievementId,share,attachedPhoto=null){
 const {canvas,title,caption}=await buildShareCard(kind,achievementId,attachedPhoto);
 const blob=await new Promise((resolve,reject)=>canvas.toBlob(x=>x?resolve(x):reject(Error('Falha ao gerar PNG')),'image/png'));
 const safe=(kind==='achievement'?achievementId:kind).replace(/[^a-z0-9-]/gi,'-');
 const file=new File([blob],'academia-cfop-'+safe+'.png',{type:'image/png'});
 if(share&&navigator.canShare?.({files:[file]})&&navigator.share){
  try{await navigator.share({title:'Academia CFOP',text:caption,files:[file]});return 'Cartão enviado para compartilhamento.'}
  catch(e){if(e.name==='AbortError')return 'Compartilhamento cancelado.'}
 }
 const url=URL.createObjectURL(blob);
 const a=document.createElement('a');a.href=url;a.download=file.name;
 document.body.append(a);a.click();a.remove();
 setTimeout(()=>URL.revokeObjectURL(url),3000);
 return share?'Imagem salva. Você pode enviá-la pelo WhatsApp, Instagram ou Facebook.':'Imagem PNG baixada.';
}
export function shareSection(){
 const records=progressData().records||[],s=achievementStats(records),badges=earnedAchievements(records);
 return '<section class="card academy-share-panel"><span class="academy-overline">CONQUISTAS & COMPARTILHAMENTO</span>'+
 '<h2>Compartilhe sua evolução</h2><p>Crie um cartão vertical com seus resultados para baixar ou compartilhar no WhatsApp, Instagram, Facebook ou outros aplicativos disponíveis no celular.</p>'+
 '<div class="academy-share-actions">'+
 '<button type="button" data-share="streak" data-share-action="native">Compartilhar sequência · '+s.streak+' dias</button>'+
 '<button type="button" class="secondary" data-share="streak" data-share-action="download">Baixar sequência</button>'+
 '<button type="button" data-share="record" data-share-action="native" '+(s.best===null?'disabled':'')+'>Compartilhar recorde · '+fmt(s.best)+'</button>'+
 '<button type="button" class="secondary" data-share="record" data-share-action="download" '+(s.best===null?'disabled':'')+'>Baixar recorde</button>'+
 '</div><p id="cfop-share-status" role="status"></p>'+
 '<div class="academy-achievement-collection">'+badges.map(b=>'<article class="'+(b.earned?'earned':'locked')+'">'+
 '<span>'+b.icon+'</span><div><strong>'+b.title+'</strong><small>'+b.subtitle+' · '+b.xp+' XP</small></div>'+
 (b.earned?'<button type="button" data-share="achievement" data-achievement="'+b.id+'" data-share-action="native">Compartilhar</button>':'<small>Bloqueada</small>')+
 '</article>').join('')+'</div></section>';
}
