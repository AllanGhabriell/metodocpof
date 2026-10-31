import {solved,apply,facelets} from '../../v2/cube/engine.mjs';
import {cube3D} from '../../v2/cube/visual.mjs?v=20261030-8';
import {deliverShareCard} from '../../v2/features/share-cards.mjs';
import {loadIdentity} from '../../v2/cloud/identity.mjs';
import {normalizeAll,newId,statistics,effective,format,celebrate,shareImage,downloadOrShare} from '../../v2/timer/records.mjs';
import {createTimerHistory} from './timer-history-ui.mjs?v=20261031-1';
import {recordTimerSolve} from '../../v2/timer/telemetry.mjs?v=20261031-1';
const key='cpof-scramble-times-v1';
let sharePhotoFile=null;
let times=[];try{times=normalizeAll(JSON.parse(localStorage.getItem(key)||'[]'))}catch{}
let historyManager=null,lastResult=null;
let sequence='',state=solved(),running=false,started=0,raf=0,elapsed=0,view='timer',yaw=-35,pitch=-27,inspection=false,inspectionStarted=0,inspectionRaf=0,inspectionEnabled=localStorage.getItem('academy-inspection')==='true',scrambleLength=[15,20,25].includes(Number(localStorage.getItem('academy-scramble-length')))?Number(localStorage.getItem('academy-scramble-length')):20,cubeView=localStorage.getItem('academy-cube-view')==='2d'?'2d':'3d';
const $=id=>document.getElementById(id);
const esc=s=>String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const fmt=ms=>((ms/1000).toFixed(2));
function scramble(){
 const faces=['U','D','R','L','F','B'],suffix=['',"'",'2'];let prev='',axis='',moves=[];
 const axisOf=f=>f==='U'||f==='D'?'y':f==='R'||f==='L'?'x':'z';
 for(let i=0;i<scrambleLength;i++){let options=faces.filter(f=>f!==prev&&!(axisOf(f)===axis&&axisOf(prev)===axis));if(!options.length)options=faces.filter(f=>f!==prev);const f=options[Math.floor(Math.random()*options.length)];moves.push(f+suffix[Math.floor(Math.random()*3)]);axis=axisOf(f);prev=f}
 sequence=moves.join(' ');state=apply(solved(),sequence);$('scramble-text').textContent=sequence;drawCube();
}
const cubePalette={U:'#f1f4f7',D:'#f4d448',F:'#239e63',B:'#3779d6',L:'#ef8e37',R:'#d44b47'};
function cube2D(current){
 const faces=facelets(current),slots=[['U',1,0],['L',0,1],['F',1,1],['R',2,1],['B',3,1],['D',1,2]];
 return '<div class="scramble-cube-net" role="img" aria-label="Planificação do cubo 3 por 3">'+slots.map(([name,x,y])=>'<div class="scramble-net-face" style="grid-column:'+(x+1)+';grid-row:'+(y+1)+'" aria-label="Face '+name+'">'+faces[name].map(c=>'<span style="background:'+cubePalette[c]+'"></span>').join('')+'</div>').join('')+'</div>';
}
function drawCube(){const target=$('scramble-cube');if(!target)return;target.innerHTML=cubeView==='2d'?cube2D(state):cube3D(state,{yaw,pitch,size:174});target.setAttribute('aria-label','Cubo '+(cubeView==='2d'?'2D':'3D')+' embaralhado: '+sequence);document.querySelector('.scramble-cube-controls').hidden=cubeView==='2d';}
function tick(){if(!running)return;elapsed=performance.now()-started;$('timer-display').textContent=fmt(elapsed);raf=requestAnimationFrame(tick)}
function start(){if(running)return;if(inspection){inspection=false;cancelAnimationFrame(inspectionRaf)}running=true;started=performance.now();$('timer-display').textContent='0.00';$('timer-status').textContent='Toque ou pressione espaço para parar';document.body.classList.add('is-timing');tick()}
function stop(){if(!running)return;running=false;cancelAnimationFrame(raf);elapsed=performance.now()-started;document.body.classList.remove('is-timing');
 // Resoluções muito curtas não viram recordes por acidente.
 if(elapsed<2000&&!confirm('Tempo de '+fmt(elapsed)+'s. Registrar mesmo assim? Toque em Cancelar se foi um clique acidental.')){
  $('timer-status').textContent='Tempo acidental descartado';$('timer-display').textContent='0.00';return;
 }
 const previousBest=Math.min(Infinity,...times.map(effective).filter(Number.isFinite));
 const isNewRecord=elapsed>=2000&&elapsed<previousBest;
 const solve={id:newId(),ms:Math.round(elapsed),scramble:sequence,date:new Date().toISOString(),penalty:'OK',comment:'',session:String($('scramble-session-name')?.value||'Geral').trim().slice(0,45)||'Geral',archived:false};
 times.push(solve);lastResult=solve;
 if(isNewRecord){celebrate(document.body);
  const panel=$('scramble-record-share');
  if(panel)panel.hidden=false;
  const label=$('scramble-record-label');
  if(label)label.textContent='Seu novo melhor tempo: '+fmt(elapsed)+' segundos';
 }localStorage.setItem(key,JSON.stringify(times.slice(-3500)));$('timer-display').textContent=fmt(elapsed);$('timer-status').textContent='Tempo salvo · toque para começar outra resolução';scramble();renderStats();
 recordTimerSolve('3x3',solve.ms,true).catch(()=>{});
 if(isNewRecord){const actions=$('scramble-record-share');if(actions)actions.scrollIntoView({behavior:'smooth',block:'nearest'});}
}
function inspectionTick(){if(!inspection)return;const left=15-(performance.now()-inspectionStarted)/1000;if(left<=0){inspection=false;cancelAnimationFrame(inspectionRaf);start();$('timer-status').textContent='Inspeção encerrada · cronômetro iniciado';return}$('timer-display').textContent=left.toFixed(1);inspectionRaf=requestAnimationFrame(inspectionTick)}
function action(){if(running){stop();return}if(inspectionEnabled&&!inspection){inspection=true;inspectionStarted=performance.now();$('timer-status').textContent='Inspeção de 15 segundos · toque para iniciar';inspectionTick();return}start()}
function mean(values){return values.length?values.reduce((a,b)=>a+b,0)/values.length:null}
function ao(values,n){if(values.length<n)return null;const sample=values.slice(-n).sort((a,b)=>a-b);const trim=n===5?1:Math.ceil(n*.05);return mean(sample.slice(trim,n-trim))}
function stat(ms){return format(ms)}
function renderStats(){
 const s=statistics(times.filter(t=>!t.archived)),nums=times.filter(t=>!t.archived).map(effective).filter(Number.isFinite);
 $('stats-summary').innerHTML=[['Total',s.total],['DNF',s.dnf],['Melhor',stat(s.best)],['Pior',stat(s.worst)],['Média',stat(s.average)],['Mediana',stat(s.median)],['Desvio',stat(s.deviation)],['Ao5',stat(s.ao5)],['Ao12',stat(s.ao12)],['Ao50',stat(s.ao50)],['Ao100',stat(s.ao100)],['Ao1000',stat(s.ao1000)]].map(([k,v])=>'<div><span>'+k+'</span><strong>'+v+'</strong></div>').join('');
 historyManager?.render();
 const canvas=$('time-chart');const ctx=canvas.getContext('2d');const ratio=Math.min(window.devicePixelRatio||1,3);
 const w=canvas.width=Math.max(1,canvas.clientWidth)*ratio,h=canvas.height=240*ratio;ctx.clearRect(0,0,w,h);
 if(nums.length<2)return;
 const series=nums.slice(-100),lo=Math.min(...series),hi=Math.max(...series),span=Math.max(1000,hi-lo);
 ctx.lineWidth=2*ratio;ctx.strokeStyle='#82c8ff';ctx.beginPath();
 series.forEach((n,i)=>{const x=18*ratio+i*(w-36*ratio)/(series.length-1),y=(h-20*ratio)-(n-lo)/span*(h-40*ratio);if(i)ctx.lineTo(x,y);else ctx.moveTo(x,y)});ctx.stroke()
}
function setView(next){view=next;document.querySelectorAll('[data-view]').forEach(b=>{b.classList.toggle('active',b.dataset.view===next);b.setAttribute('aria-pressed',String(b.dataset.view===next))});document.querySelectorAll('[data-panel]').forEach(p=>p.hidden=p.dataset.panel!==next);if(next==='stats')requestAnimationFrame(renderStats)}
$('new-scramble').addEventListener('click',()=>{if(!running&&!inspection)scramble()});
$('golden-record-toggle').checked=localStorage.getItem('cfop-timer-gold-effect-v1')!=='false';
$('golden-record-toggle').addEventListener('change',e=>localStorage.setItem('cfop-timer-gold-effect-v1',String(e.target.checked)));
$('scramble-session-name').value=localStorage.getItem('cfop-timer-session-v1')||'Geral';
$('scramble-session-name').addEventListener('change',e=>localStorage.setItem('cfop-timer-session-v1',String(e.target.value||'Geral').slice(0,45)));
$('inspection-toggle').checked=inspectionEnabled;
$('scramble-length').value=String(scrambleLength);
$('scramble-length').addEventListener('change',e=>{scrambleLength=Number(e.target.value);localStorage.setItem('academy-scramble-length',String(scrambleLength));if(!running&&!inspection)scramble()});
$('cube-view').value=cubeView;
$('cube-view').addEventListener('change',e=>{cubeView=e.target.value==='2d'?'2d':'3d';localStorage.setItem('academy-cube-view',cubeView);$('scramble-cube-heading').textContent=cubeView==='2d'?'Cubo 2D':'Cubo 3D';drawCube()});
$('inspection-toggle').addEventListener('change',e=>{inspectionEnabled=e.target.checked;localStorage.setItem('academy-inspection',String(inspectionEnabled));if(inspection){inspection=false;cancelAnimationFrame(inspectionRaf);$('timer-display').textContent='0.00';$('timer-status').textContent='Toque no tempo ou pressione espaço para começar'}});
$('cube-left').addEventListener('click',()=>{yaw-=35;drawCube()});
$('cube-right').addEventListener('click',()=>{yaw+=35;drawCube()});
$('cube-up').addEventListener('click',()=>{pitch=Math.max(-75,pitch-20);drawCube()});
$('cube-down').addEventListener('click',()=>{pitch=Math.min(75,pitch+20);drawCube()});
// Grande região central de toque: permite parar o timer sem procurar os dígitos.
$('timer-display').addEventListener('click',action);
document.querySelector('.scramble-clock').addEventListener('click',event=>{
 if(event.target.closest('button,a,input,select,textarea'))return;action()
});
historyManager=createTimerHistory({root:$('solve-list'),getRecords:()=>times,setRecords:next=>{
 times=normalizeAll(next);localStorage.setItem(key,JSON.stringify(times));},
 onUpdate:()=>{renderStats();const panel=$('scramble-record-share');if(panel)panel.hidden=true;},kind:'3x3'});
$('share-evolution').addEventListener('click',async()=>{
 try{await downloadOrShare(shareImage({title:'Minha evolução no 3×3',subtitle:'Academia CFOP · últimos tempos',solves:times.filter(t=>!t.archived)}),'academia-cfop-evolucao-3x3.png')}
 catch(e){alert('Não foi possível compartilhar: '+e.message)}
});
document.addEventListener('keydown',e=>{if(e.code==='Space'&&!e.repeat&&!['BUTTON','INPUT','TEXTAREA','SELECT'].includes(document.activeElement.tagName)){e.preventDefault();action()}});
document.querySelectorAll('[data-view]').forEach(b=>b.addEventListener('click',()=>setView(b.dataset.view)));
document.querySelectorAll('[data-share-photo-pick]').forEach(button=>
 button.addEventListener('click',()=>$('scramble-share-photo')?.click()));
$('scramble-share-photo')?.addEventListener('change',e=>{
 const file=e.target.files?.[0];
 if(!file)return;
 const label=document.querySelectorAll('[data-share-photo-pick]');
 if(!/^image\//.test(file.type)||file.size>10*1024*1024){
  sharePhotoFile=null;
  label.forEach(x=>x.textContent='Adicionar foto');
  alert('Selecione uma imagem de até 10 MB.');
 }else{
  sharePhotoFile=file;
  label.forEach(x=>x.textContent='✓ Foto selecionada');
 }
});
document.querySelectorAll('[data-share-record]').forEach(button=>button.addEventListener('click',async()=>{
 const area=button.closest('section');
 const node=area?.querySelector('[role="status"]')||$('scramble-share-status');
 button.disabled=true;if(node)node.textContent='Montando sua imagem PNG…';
 try{
  await loadIdentity().catch(()=>{});
  const message=await deliverShareCard('record','',button.dataset.shareRecord==='native',sharePhotoFile);
  if(node)node.textContent=message;
 }catch(err){if(node)node.textContent='Não foi possível gerar a imagem: '+err.message}
 finally{button.disabled=false}
}));
$('clear-times').addEventListener('click',()=>{if(times.length&&confirm('Excluir TODOS os tempos locais, incluindo sessões arquivadas? Esta ação não pode ser desfeita.')){times=[];localStorage.removeItem(key);renderStats()}});
window.addEventListener('resize',()=>{if(view==='stats')renderStats()});
scramble();renderStats();setView(new URLSearchParams(location.search).get('view')==='stats'?'stats':new URLSearchParams(location.search).get('view')==='history'?'history':'timer');
