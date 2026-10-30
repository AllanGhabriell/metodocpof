import {solved,apply,facelets} from '../../v2/cube/engine.mjs';
import {cube3D} from '../../v2/cube/visual.mjs';
const key='cpof-scramble-times-v1';
let times=[];try{const t=JSON.parse(localStorage.getItem(key)||'[]');if(Array.isArray(t))times=t.filter(x=>Number.isFinite(x.ms)&&x.ms>=0&&typeof x.scramble==='string').slice(-2000)}catch{}
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
function stop(){if(!running)return;running=false;cancelAnimationFrame(raf);elapsed=performance.now()-started;times.push({ms:Math.round(elapsed),scramble:sequence,date:new Date().toISOString()});localStorage.setItem(key,JSON.stringify(times.slice(-2000)));$('timer-display').textContent=fmt(elapsed);$('timer-status').textContent='Tempo salvo · toque para começar outra resolução';document.body.classList.remove('is-timing');scramble();renderStats()}
function inspectionTick(){if(!inspection)return;const left=15-(performance.now()-inspectionStarted)/1000;if(left<=0){inspection=false;cancelAnimationFrame(inspectionRaf);start();$('timer-status').textContent='Inspeção encerrada · cronômetro iniciado';return}$('timer-display').textContent=left.toFixed(1);inspectionRaf=requestAnimationFrame(inspectionTick)}
function action(){if(running){stop();return}if(inspectionEnabled&&!inspection){inspection=true;inspectionStarted=performance.now();$('timer-status').textContent='Inspeção de 15 segundos · toque para iniciar';inspectionTick();return}start()}
function mean(values){return values.length?values.reduce((a,b)=>a+b,0)/values.length:null}
function ao(values,n){if(values.length<n)return null;const sample=values.slice(-n).sort((a,b)=>a-b);const trim=n===5?1:Math.ceil(n*.05);return mean(sample.slice(trim,n-trim))}
function stat(ms){return ms===null?'—':fmt(ms)}
function renderStats(){const nums=times.map(t=>t.ms);const last=n=>nums.length>=n?mean(nums.slice(-n)):null;const best=nums.length?Math.min(...nums):null;const all=mean(nums);$('stats-summary').innerHTML=[['Total',nums.length],['Melhor',stat(best)],['Média',stat(all)],['Ao5',stat(ao(nums,5))],['Ao12',stat(ao(nums,12))],['Ao50',stat(ao(nums,50))],['Ao100',stat(ao(nums,100))]].map(([k,v])=>'<div><span>'+k+'</span><strong>'+v+'</strong></div>').join('');
 $('solve-list').innerHTML=times.slice().reverse().map((t,i)=>'<div class="solve-entry"><span>'+esc(new Date(t.date).toLocaleDateString('pt-BR'))+'</span><strong>'+fmt(t.ms)+'</strong><small>'+esc(t.scramble)+'</small></div>').join('')||'<p class="empty">Nenhum tempo registrado ainda.</p>';
 const canvas=$('time-chart');const ctx=canvas.getContext('2d');const ratio=Math.min(window.devicePixelRatio||1,3);const w=canvas.width=Math.max(1,canvas.clientWidth)*ratio,h=canvas.height=240*ratio;ctx.clearRect(0,0,w,h);if(nums.length<2)return;const series=nums.slice(-100),lo=Math.min(...series),hi=Math.max(...series),span=Math.max(1000,hi-lo);ctx.lineWidth=2*ratio;ctx.strokeStyle='#82c8ff';ctx.beginPath();series.forEach((n,i)=>{const x=18*ratio+i*(w-36*ratio)/(series.length-1),y=(h-20*ratio)-(n-lo)/span*(h-40*ratio);if(i)ctx.lineTo(x,y);else ctx.moveTo(x,y)});ctx.stroke()}
function setView(next){view=next;document.querySelectorAll('[data-view]').forEach(b=>{b.classList.toggle('active',b.dataset.view===next);b.setAttribute('aria-pressed',String(b.dataset.view===next))});document.querySelectorAll('[data-panel]').forEach(p=>p.hidden=p.dataset.panel!==next);if(next==='stats')requestAnimationFrame(renderStats)}
$('new-scramble').addEventListener('click',()=>{if(!running&&!inspection)scramble()});
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
$('timer-display').addEventListener('click',action);
document.addEventListener('keydown',e=>{if(e.code==='Space'&&!e.repeat&&!['BUTTON','INPUT','TEXTAREA','SELECT'].includes(document.activeElement.tagName)){e.preventDefault();action()}});
document.querySelectorAll('[data-view]').forEach(b=>b.addEventListener('click',()=>setView(b.dataset.view)));
$('clear-times').addEventListener('click',()=>{if(times.length&&confirm('Excluir todos os tempos salvos neste dispositivo?')){times=[];localStorage.removeItem(key);renderStats()}});
window.addEventListener('resize',()=>{if(view==='stats')renderStats()});
scramble();renderStats();setView(new URLSearchParams(location.search).get('view')==='stats'?'stats':new URLSearchParams(location.search).get('view')==='history'?'history':'timer');
