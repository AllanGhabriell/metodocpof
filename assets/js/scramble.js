import {solved,apply} from '../v2/cube/engine.mjs';
import {cube3D} from '../v2/cube/visual.mjs';
const key='cpof-scramble-times-v1';
let times=[];try{const t=JSON.parse(localStorage.getItem(key)||'[]');if(Array.isArray(t))times=t.filter(x=>Number.isFinite(x.ms)&&x.ms>=0&&typeof x.scramble==='string').slice(-2000)}catch{}
let sequence='',state=solved(),running=false,started=0,raf=0,elapsed=0,view='timer',yaw=-35,pitch=-27,holding=false,holdTimer=0;
const $=id=>document.getElementById(id);
const esc=s=>String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const fmt=ms=>((ms/1000).toFixed(2));
function scramble(){
 const faces=['U','D','R','L','F','B'],suffix=['',"'",'2'];let prev='',axis='',moves=[];
 const axisOf=f=>f==='U'||f==='D'?'y':f==='R'||f==='L'?'x':'z';
 for(let i=0;i<20;i++){let options=faces.filter(f=>f!==prev&&!(axisOf(f)===axis&&axisOf(prev)===axis));if(!options.length)options=faces.filter(f=>f!==prev);const f=options[Math.floor(Math.random()*options.length)];moves.push(f+suffix[Math.floor(Math.random()*3)]);axis=axisOf(f);prev=f}
 sequence=moves.join(' ');state=apply(solved(),sequence);$('scramble-text').textContent=sequence;drawCube();
}
function drawCube(){$('scramble-cube').innerHTML=cube3D(state,{yaw,pitch,size:174})}
function tick(){if(!running)return;elapsed=performance.now()-started;$('timer-display').textContent=fmt(elapsed);raf=requestAnimationFrame(tick)}
function start(){if(running)return;running=true;started=performance.now();$('timer-display').textContent='0.00';$('timer-status').textContent='Toque ou pressione espaço para parar';document.body.classList.add('is-timing');tick()}
function stop(){if(!running)return;running=false;cancelAnimationFrame(raf);elapsed=performance.now()-started;times.push({ms:Math.round(elapsed),scramble:sequence,date:new Date().toISOString()});localStorage.setItem(key,JSON.stringify(times.slice(-2000)));$('timer-display').textContent=fmt(elapsed);$('timer-status').textContent='Tempo salvo · toque para começar outra resolução';document.body.classList.remove('is-timing');scramble();renderStats()}
function action(){if(running)stop();else start()}
function mean(values){return values.length?values.reduce((a,b)=>a+b,0)/values.length:null}
function stat(ms){return ms===null?'—':fmt(ms)}
function renderStats(){const nums=times.map(t=>t.ms);const last=n=>nums.length>=n?mean(nums.slice(-n)):null;const best=nums.length?Math.min(...nums):null;const all=mean(nums);$('stats-summary').innerHTML=[['Total',nums.length],['Melhor',stat(best)],['Média',stat(all)],['Md5',stat(last(5))],['Md12',stat(last(12))],['Md50',stat(last(50))],['Md100',stat(last(100))]].map(([k,v])=>'<div><span>'+k+'</span><strong>'+v+'</strong></div>').join('');
 $('solve-list').innerHTML=times.slice().reverse().map((t,i)=>'<div class="solve-entry"><span>'+esc(new Date(t.date).toLocaleDateString('pt-BR'))+'</span><strong>'+fmt(t.ms)+'</strong><small>'+esc(t.scramble)+'</small></div>').join('')||'<p class="empty">Nenhum tempo registrado ainda.</p>';
 const canvas=$('time-chart');const ctx=canvas.getContext('2d');const w=canvas.width=canvas.clientWidth*devicePixelRatio,h=canvas.height=240*devicePixelRatio;ctx.clearRect(0,0,w,h);if(nums.length<2)return;const series=nums.slice(-100),lo=Math.min(...series),hi=Math.max(...series),span=Math.max(1000,hi-lo);ctx.lineWidth=2*devicePixelRatio;ctx.strokeStyle='#82c8ff';ctx.beginPath();series.forEach((n,i)=>{const x=18*devicePixelRatio+i*(w-36*devicePixelRatio)/(series.length-1),y=(h-20*devicePixelRatio)-(n-lo)/span*(h-40*devicePixelRatio);if(i)ctx.lineTo(x,y);else ctx.moveTo(x,y)});ctx.stroke()}
function setView(next){view=next;document.querySelectorAll('[data-view]').forEach(b=>{b.classList.toggle('active',b.dataset.view===next);b.setAttribute('aria-pressed',String(b.dataset.view===next))});document.querySelectorAll('[data-panel]').forEach(p=>p.hidden=p.dataset.panel!==next);if(next==='stats')renderStats()}
$('new-scramble').addEventListener('click',()=>{if(!running)scramble()});
$('cube-left').addEventListener('click',()=>{yaw-=35;drawCube()});
$('cube-right').addEventListener('click',()=>{yaw+=35;drawCube()});
$('cube-up').addEventListener('click',()=>{pitch=Math.max(-75,pitch-20);drawCube()});
$('cube-down').addEventListener('click',()=>{pitch=Math.min(75,pitch+20);drawCube()});
$('timer-display').addEventListener('click',action);
document.addEventListener('keydown',e=>{if(e.code==='Space'&&!e.repeat&&!['BUTTON','INPUT','TEXTAREA','SELECT'].includes(document.activeElement.tagName)){e.preventDefault();action()}});
document.querySelectorAll('[data-view]').forEach(b=>b.addEventListener('click',()=>setView(b.dataset.view)));
$('clear-times').addEventListener('click',()=>{if(times.length&&confirm('Excluir todos os tempos salvos neste dispositivo?')){times=[];localStorage.removeItem(key);renderStats()}});
window.addEventListener('resize',()=>{if(view==='stats')renderStats()});
scramble();renderStats();setView('timer');
