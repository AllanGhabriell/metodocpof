import {solved,apply,facelets} from '../cube/engine.mjs';
import {cube3D} from '../cube/visual.mjs?v=20261030-20';

// Treino com cubo físico: o site não tem sensores, portanto o resultado é informado pelo aluno.
const SETTINGS='academy-cross-physical-settings-v1';
const RECORDS='academy-cross-physical-records-v1';
const palette={U:'#f8d649',D:'#fafafa',F:'#20ad75',B:'#4377e8',R:'#db5354',L:'#e89637'};
const safe=x=>String(x).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
function read(key,fallback){try{const value=JSON.parse(localStorage.getItem(key)||'null');return value===null?fallback:value}catch{return fallback}}
const persisted=read(SETTINGS,{});
let level=[1,2,3,4].includes(Number(persisted.level))?Number(persisted.level):1;
let length=[15,20,25].includes(Number(persisted.length))?Number(persisted.length):20;
let inspection=[0,8,15,30].includes(Number(persisted.inspection))?Number(persisted.inspection):15;
let view=persisted.view==='2d'?'2d':'3d';
let attempts=read(RECORDS,[]);
if(!Array.isArray(attempts))attempts=[];
attempts=attempts.filter(x=>x&&[1,2,3,4].includes(Number(x.level))&&Number.isFinite(x.ms)&&Number.isFinite(x.achieved)).slice(-500);
let stage='ready',sequence='',cube=solved(),yaw=-35,pitch=28,started=0,elapsed=0,frame=0,notice='';
const fmt=ms=>(Math.max(0,ms)/1000).toFixed(2);
const settingsSave=()=>{try{localStorage.setItem(SETTINGS,JSON.stringify({level,length,inspection,view}))}catch{}};
function randomSequence(){
 const faces=['U','D','L','R','F','B'],suffix=['',String.fromCharCode(39),'2'];
 const axis=f=>('UD'.includes(f)?'y':'LR'.includes(f)?'x':'z');
 let prior='',moves=[];
 for(let i=0;i<length;i++){
  const allowed=faces.filter(f=>f!==prior&&(!prior||axis(f)!==axis(prior)));
  const pool=allowed.length?allowed:faces.filter(f=>f!==prior);
  const f=pool[Math.floor(Math.random()*pool.length)];
  moves.push(f+suffix[Math.floor(Math.random()*suffix.length)]);prior=f;
 }
 return moves.join(' ');
}
function nextScramble(keepNotice=false){
 cancelAnimationFrame(frame);frame=0;sequence=randomSequence();cube=apply(solved(),sequence);
 stage='ready';elapsed=0;started=0;if(!keepNotice)notice='';
}
nextScramble();
function net(){
 const f=facelets(cube),slots=[['U',1,0],['L',0,1],['F',1,1],['R',2,1],['B',3,1],['D',1,2]];
 return '<div class="cross-phys-net" role="img" aria-label="Estado do embaralhamento em duas dimensões">'+slots.map(([face,x,y])=>'<div class="cross-phys-face" style="grid-column:'+(x+1)+';grid-row:'+(y+1)+'" aria-label="Face '+face+'">'+f[face].map(c=>'<span style="background:'+palette[c]+'"></span>').join('')+'</div>').join('')+'</div>';
}
function successStats(){
 const matches=attempts.filter(r=>r.level===level);
 const wins=matches.filter(r=>r.achieved===level);
 const recent=matches.slice(-5),recentWins=recent.filter(r=>r.achieved===level).length;
 const best=wins.length?Math.min(...wins.map(r=>r.ms)):null;
 return {total:matches.length,wins:wins.length,rate:matches.length?Math.round(100*wins.length/matches.length):0,recentWins,recentCount:recent.length,best};
}
const active=()=>stage==='inspection'||stage==='running';
export function physicalCrossBusy(){return active()}
export function physicalCrossSuspend(){cancelAnimationFrame(frame);frame=0;if(active()){stage='ready';elapsed=0}}
export function physicalCrossPage(){
 const stats=successStats(),hidden=stage==='running';
 const timer=stage==='inspection'?Math.max(0,inspection*1000-(performance.now()-started)):stage==='running'?Math.max(0,performance.now()-started):elapsed;
 const clock=stage==='inspection'?(timer/1000).toFixed(1):fmt(timer);
 const title=stage==='inspection'?'Inspecionando':stage==='running'?'Parar cronômetro':stage==='review'?'Tentativa concluída':'Iniciar treino';
 const message=stage==='ready'?'Aplique o embaralhamento no cubo físico. Depois, inicie a inspeção.':stage==='inspection'?'Olhos abertos: planeje e memorize as arestas. O cronômetro iniciará ao final.':stage==='running'?'Feche os olhos e execute de memória. Toque no tempo assim que terminar.':'Informe quantas arestas da meta ficaram corretas e alinhadas aos centros.';
 const nextLevel=level<4&&stats.recentWins>=3?'Você já acertou pelo menos 3 das últimas 5 tentativas. Experimente o nível '+(level+1)+'.':'Progrida no seu ritmo. Meta sugerida: 3 acertos nas últimas 5 tentativas.';
 const history=attempts.slice(-6).reverse().map(r=>'<div class="cross-phys-history-row"><span>'+new Date(r.date).toLocaleDateString('pt-BR')+' · '+r.level+' '+(r.level===1?'aresta':'arestas')+'</span><strong class="'+(r.achieved===r.level?'cross-phys-win':'cross-phys-miss')+'">'+r.achieved+'/'+r.level+'</strong><span>'+fmt(r.ms)+'s</span></div>').join('');
 return '<div class="cross-intro"><span class="eyebrow">ACADEMIA CFOP · CROSS</span><h1>Memória de cruz</h1><p class="muted">Treine sua inspeção com o cubo físico: memorize uma, duas, três ou quatro arestas e monte sem olhar.</p></div>'+
 '<div class="cross-phys-levels" role="group" aria-label="Meta de arestas">'+[1,2,3,4].map(n=>'<button type="button" data-cross-physical="level-'+n+'" class="'+(level===n?'is-selected':'')+'" aria-pressed="'+(level===n)+'" '+(active()?'disabled':'')+'><small>NÍVEL '+n+'</small><strong>'+n+'</strong><span>'+(n===1?'aresta':'arestas')+'</span></button>').join('')+'</div>'+
 '<div class="cross-workspace"><section class="cross-training-panel cross-phys-panel"><div class="cross-panel-heading"><div><span class="cross-kicker">EXERCÍCIO COM CUBO FÍSICO</span><h2>'+level+' '+(level===1?'aresta':'arestas')+' de memória</h2></div><span class="cross-progress">'+(stage==='review'?'Resultado pendente':stage==='running'?'Em execução':stage==='inspection'?'Inspeção':'Preparação')+'</span></div>'+
 '<div class="cross-scramble cross-phys-scramble"><div class="cross-phys-scramble-head"><span>EMBARALHAMENTO · 3×3</span><button type="button" data-cross-physical="new" aria-label="Gerar novo embaralhamento" title="Novo embaralhamento" '+(active()?'disabled':'')+'>⟳ Novo</button></div><strong '+(hidden?'class="cross-phys-obscured"':'')+'>'+(hidden?'Embaralhamento oculto durante a execução':safe(sequence))+'</strong></div>'+
 '<div class="cross-view-tabs" role="group" aria-label="Visualização do embaralhamento"><button type="button" data-cross-physical="view-3d" aria-pressed="'+(view==='3d')+'" class="'+(view==='3d'?'selected':'')+'" '+(active()?'disabled':'')+'>Cubo 3D</button><button type="button" data-cross-physical="view-2d" aria-pressed="'+(view==='2d')+'" class="'+(view==='2d'?'selected':'')+'" '+(active()?'disabled':'')+'>Cubo 2D</button></div>'+
 '<div class="cross-cube-area cross-phys-cube">'+(hidden?'<div class="cross-phys-hidden-cube"><strong>Execução sem olhar</strong><span>O desenho fica oculto enquanto o tempo corre.</span></div>':view==='3d'?cube3D(cube,{yaw,pitch,size:168,colors:palette}):net())+'</div>'+
 (view==='3d'&&!hidden?'<div class="cross-camera"><button type="button" data-cross-physical="left" aria-label="Girar cubo para esquerda">←</button><button type="button" data-cross-physical="up" aria-label="Inclinar cubo para cima">↑</button><button type="button" data-cross-physical="down" aria-label="Inclinar cubo para baixo">↓</button><button type="button" data-cross-physical="right" aria-label="Girar cubo para direita">→</button></div>':'')+
 '<div class="cross-phys-timer"><button type="button" id="cross-physical-clock" data-cross-physical="clock" '+(stage==='review'?'disabled':'')+' aria-label="'+title+'"><strong id="cross-physical-digits">'+clock+'</strong><span>'+title+'</span></button><p id="cross-physical-stage" aria-live="polite">'+message+'</p></div>'+
 (stage==='review'?'<div class="cross-phys-review"><strong>Quantas arestas você conseguiu?</strong><p>Conte apenas as peças posicionadas e alinhadas corretamente, sem olhar durante a execução.</p><div class="cross-phys-result-buttons">'+Array.from({length:level+1},(_,n)=>'<button type="button" data-cross-physical="result-'+n+'" class="'+(n===level?'is-success':'')+'">'+n+' de '+level+'</button>').join('')+'</div></div>':'')+
 '<div class="cross-main-actions"><button type="button" class="cross-primary" data-cross-physical="new" '+(active()?'disabled':'')+'>Novo desafio</button><button type="button" data-cross-physical="reset" '+(stage==='review'||stage==='inspection'||stage==='running'?'':'disabled')+'>Cancelar tentativa</button></div><p class="cross-feedback" role="status" aria-live="polite">'+safe(notice)+'</p></section>'+
 '<aside class="cross-side-panel"><div class="cross-options cross-phys-settings"><h2>Opções do treino</h2><div class="cross-settings"><label for="cross-physical-length">Movimentos do embaralhamento</label><select id="cross-physical-length" '+(active()?'disabled':'')+'>'+[15,20,25].map(n=>'<option value="'+n+'" '+(length===n?'selected':'')+'>'+n+(n===20?' · padrão':'')+'</option>').join('')+'</select><label for="cross-physical-inspection">Tempo de inspeção</label><select id="cross-physical-inspection" '+(active()?'disabled':'')+'>'+[0,8,15,30].map(n=>'<option value="'+n+'" '+(inspection===n?'selected':'')+'>'+(n===0?'Sem contagem':n+' segundos')+'</option>').join('')+'</select></div></div>'+
 '<div class="cross-instructions cross-phys-guide"><h2>Como praticar</h2><p><b>1.</b> Embaralhe seu cubo usando a sequência exibida.</p><p><b>2.</b> Inspecione com os olhos abertos. Planeje a montagem das '+level+' '+(level===1?'aresta':'arestas')+'.</p><p><b>3.</b> Feche os olhos e execute sem consultar o cubo.</p><p><b>4.</b> Pare o cronômetro e registre quantas arestas ficaram corretas.</p><small>O site não verifica seu cubo físico automaticamente. Os resultados são informados por você.</small></div>'+
 '<div class="cross-instructions cross-phys-stat-panel"><h2>Seu desempenho · nível '+level+'</h2><div class="cross-phys-stats"><div><span>Tentativas</span><strong>'+stats.total+'</strong></div><div><span>Acertos</span><strong>'+stats.wins+'</strong></div><div><span>Precisão</span><strong>'+stats.rate+'%</strong></div><div><span>Melhor tempo</span><strong>'+(stats.best===null?'—':fmt(stats.best)+'s')+'</strong></div></div><p class="cross-phys-recommendation">'+nextLevel+'</p></div>'+
 '</aside></div><section class="cross-phys-log"><div class="cross-panel-heading"><h2>Últimas tentativas</h2><span>Salvas neste navegador</span></div><div class="cross-phys-history">'+(history||'<p class="muted">Nenhum resultado registrado ainda.</p>')+'</div></section>';
}
export function physicalCrossAction(button){
 const cmd=button?.dataset?.crossPhysical;if(!cmd)return false;
 if(cmd==='clock'){
  if(stage==='ready'){stage=inspection?'inspection':'running';started=performance.now();elapsed=0;notice=''}
  else if(stage==='inspection'){stage='running';started=performance.now();elapsed=0}
  else if(stage==='running'){elapsed=Math.max(0,performance.now()-started);stage='review';cancelAnimationFrame(frame)}
  return true;
 }
 if(cmd.startsWith('result-')&&stage==='review'){
  const achieved=Number(cmd.slice(7));
  if(!Number.isInteger(achieved)||achieved<0||achieved>level)return false;
  attempts.push({level,achieved,ms:Math.round(elapsed),date:new Date().toISOString(),scramble:sequence,inspection});
  attempts=attempts.slice(-500);
  try{localStorage.setItem(RECORDS,JSON.stringify(attempts))}catch{}
  const msg=achieved===level?'Meta alcançada! '+achieved+'/'+level+' arestas em '+fmt(elapsed)+'s.':'Tentativa registrada: '+achieved+'/'+level+' arestas em '+fmt(elapsed)+'s.';
  nextScramble();notice=msg;return true;
 }
 if(cmd.startsWith('level-')&&!active()){
  const next=Number(cmd.slice(6));if(![1,2,3,4].includes(next))return false;
  level=next;settingsSave();nextScramble();return true;
 }
 if(cmd==='new'&&!active()){nextScramble();return true}
 if(cmd==='reset'){if(active()||stage==='review'){nextScramble();notice='Tentativa cancelada. Nenhum resultado foi registrado.';return true}return false}
 if(cmd==='view-2d'||cmd==='view-3d'){if(active())return false;view=cmd.slice(5);settingsSave();return true}
 if(['left','right','up','down'].includes(cmd)){
  if(cmd==='left')yaw-=30;if(cmd==='right')yaw+=30;
  if(cmd==='up')pitch=Math.min(75,pitch+15);if(cmd==='down')pitch=Math.max(-75,pitch-15);return true;
 }
 return false;
}
export function physicalCrossChange(target){
 if(active())return false;
 if(target.id==='cross-physical-length'){
  const next=Number(target.value);if(![15,20,25].includes(next))return false;
  length=next;settingsSave();nextScramble();return true;
 }
 if(target.id==='cross-physical-inspection'){
  const next=Number(target.value);if(![0,8,15,30].includes(next))return false;
  inspection=next;settingsSave();return true;
 }
 return false;
}
export function physicalCrossBind(render){
 cancelAnimationFrame(frame);frame=0;
 if(!active())return;
 const tick=()=>{
  const digits=document.getElementById('cross-physical-digits');
  if(!digits||!active()){frame=0;return}
  const ms=performance.now()-started;
  if(stage==='inspection'&&ms>=inspection*1000){
   stage='running';started=performance.now();elapsed=0;
   if(navigator.vibrate)navigator.vibrate(70);
   render();return;
  }
  digits.textContent=stage==='inspection'?((Math.max(0,inspection*1000-ms))/1000).toFixed(1):fmt(ms);
  frame=requestAnimationFrame(tick);
 };
 frame=requestAnimationFrame(tick);
}
