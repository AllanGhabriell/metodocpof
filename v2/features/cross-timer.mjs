import {solved,apply,facelets} from '../cube/engine.mjs';
import {cube3D} from '../cube/visual.mjs?v=20261030-20';
import {createTimerHistory} from '../../assets/js/timer-history-ui.mjs?v=20261031-1';
import {normalizeAll,statistics,celebrate,shareImage,downloadOrShare} from '../timer/records.mjs';
import {recordTimerSolve} from '../timer/telemetry.mjs?v=20261031-1';
const PREF='academy-cross-physical-settings-v1';
const DB='academy-cross-physical-records-v1';
const palette={U:'#f8d649',D:'#fafafa',F:'#20ad75',B:'#4377e8',R:'#db5354',L:'#e89637'};
const esc=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function read(k,f){try{return JSON.parse(localStorage.getItem(k)||'null')??f}catch{return f}}
const previous=read(PREF,{});
let level=[1,2,3,4].includes(Number(previous.level))?Number(previous.level):1;
let length=[15,20,25].includes(Number(previous.length))?Number(previous.length):20;
let inspection=[0,8,15,30].includes(Number(previous.inspection))?Number(previous.inspection):15;
let cubeView=previous.view==='2d'?'2d':'3d';
let tab='timer',phase='ready',sequence='',cube=solved(),yaw=-35,pitch=-27;
let started=0,elapsed=0,frame=0,notice='',pendingPenalty='none',newPB=false;
const normalizeRecord=r=>{
 if(!r||![1,2,3,4].includes(Number(r.level))||!Number.isFinite(Number(r.ms))||Number(r.ms)<0)return null;
 const lvl=Number(r.level),achieved=Math.max(0,Math.min(lvl,Number(r.achieved)||0));
 const penalty=['none','plus2','dnf','OK','+2','DNF'].includes(r.penalty)?({'OK':'none','+2':'plus2','DNF':'dnf'}[r.penalty]||r.penalty):'none';
 return {id:String(r.id||r.date||Math.random()).slice(0,70),level:lvl,achieved,ms:Math.round(Number(r.ms)),penalty,
  date:String(r.date||new Date().toISOString()).slice(0,35),scramble:String(r.scramble||'').slice(0,200),inspection:Number(r.inspection)||0,
  comment:String(r.comment||'').slice(0,600),session:String(r.session||'Geral').slice(0,45),archived:Boolean(r.archived)};
};
let records=read(DB,[]);
records=(Array.isArray(records)?records:[]).map(normalizeRecord).filter(Boolean).slice(-3500);
const savePrefs=()=>{try{localStorage.setItem(PREF,JSON.stringify({level,length,inspection,view:cubeView}))}catch{}};
const saveRecords=()=>{try{localStorage.setItem(DB,JSON.stringify(records.slice(-3500)))}catch{notice='Armazenamento indisponível neste navegador.'}};
const fmt=ms=>(Math.max(0,ms)/1000).toFixed(2);
const valid=r=>r.achieved===r.level&&r.penalty!=='dnf';
const duration=r=>valid(r)?r.ms+(r.penalty==='plus2'?2000:0):Infinity;
const label=r=>valid(r)?fmt(duration(r))+(r.penalty==='plus2'?' +2':''):'DNF';
const statsOf=list=>{
 const numbers=list.map(duration),validTimes=numbers.filter(Number.isFinite);
 const best=validTimes.length?Math.min(...validTimes):null;
 const average=validTimes.length?validTimes.reduce((a,b)=>a+b,0)/validTimes.length:null;
 const ao=n=>{
  if(numbers.length<n)return null;
  const values=numbers.slice(-n).sort((a,b)=>a-b);
  const trim=Math.max(1,Math.ceil(n*.05));
  const kept=values.slice(trim,n-trim);
  return kept.every(Number.isFinite)?kept.reduce((a,b)=>a+b,0)/kept.length:Infinity;
 };
 return {total:list.length,wins:validTimes.length,rate:list.length?Math.round(validTimes.length*100/list.length):0,best,average,ao5:ao(5),ao12:ao(12),ao50:ao(50),ao100:ao(100)};
};
const show=ms=>ms===null?'—':Number.isFinite(ms)?fmt(ms)+'s':'DNF';
const current=()=>records.filter(r=>r.level===level&&!r.archived);
const active=()=>phase==='inspection'||phase==='running';
const selectLevel=n=>{level=n;tab='timer';savePrefs();nextScramble()};
function generate(){
 const faces=['U','D','R','L','F','B'],mods=['',"'","2"],axes={U:1,D:1,R:0,L:0,F:2,B:2};
 let prev='',result=[];
 for(let i=0;i<length;i++){
  const options=faces.filter(x=>!prev||axes[x]!==axes[prev]);
  const face=options[Math.floor(Math.random()*options.length)];
  result.push(face+mods[Math.floor(Math.random()*3)]);prev=face;
 }
 return result.join(' ');
}
function nextScramble(){
 cancelAnimationFrame(frame);frame=0;newPB=false;
 sequence=generate();cube=apply(solved(),sequence);
 phase='ready';elapsed=0;started=0;pendingPenalty='none';
}
nextScramble();
function net(){
 const f=facelets(cube),layout=[['U',2,1],['L',1,2],['F',2,2],['R',3,2],['B',4,2],['D',2,3]];
 return '<div class="cross-lab-net" role="img" aria-label="Cubo embaralhado em duas dimensões">'+layout.map(([face,x,y])=>
  '<div class="cross-lab-net-face" style="grid-column:'+x+';grid-row:'+y+'" aria-label="Face '+face+'">'+
  f[face].map(c=>'<span style="background:'+palette[c]+'"></span>').join('')+'</div>').join('')+'</div>';
}
function chart(history){
 const last=history.filter(valid).slice(-20);
 if(!last.length)return '<p class="cross-lab-empty">Registre uma tentativa correta para visualizar a evolução.</p>';
 const maximum=Math.max(...last.map(duration),1000);
 return '<div class="cross-lab-chart" role="img" aria-label="Últimos '+last.length+' tempos válidos">'+
 last.map((r,i)=>'<div title="'+fmt(duration(r))+' segundos" style="height:'+Math.max(9,duration(r)/maximum*100)+'%"><span>'+esc(i+1)+'</span></div>').join('')+'</div>';
}
const clock=()=>phase==='inspection'?(Math.max(0,inspection*1000-(performance.now()-started))/1000).toFixed(1):
 phase==='running'?fmt(Math.max(0,performance.now()-started)):fmt(elapsed);
const summary=()=>{
 const s=statsOf(current());
 return [['Tentativas',s.total],['Corretas',s.wins],['Melhor',show(s.best)],['Ao5',show(s.ao5)]].map(([k,v])=>
 '<div><span>'+k+'</span><strong>'+v+'</strong></div>').join('');
};
function historyPage(){
 const list=records.filter(r=>r.level===level),s=statsOf(current());
 return '<section class="cross-lab-data"><div class="cross-panel-heading"><h2>Histórico · '+level+' '+(level===1?'meio':'meios')+'</h2><span class="cross-progress">'+s.total+' tentativas</span></div>'+
 '<p class="cross-lab-help">Cada modalidade conserva seu histórico próprio. Erros contam como DNF para as médias.</p>'+
 '<div class="cross-lab-history timer-history-root" id="cross-timer-history-panel"></div>'+
 '<p class="cross-lab-help">Toque em um tempo para alterar penalidade, comentário, sessão ou excluir. Também há seleção múltipla, exportação e backup.</p></section>';
}
function statsPage(){
 const s=statsOf(current()),rows=[['Total',s.total],['Corretas',s.wins],['Taxa de acerto',s.rate+'%'],['Melhor',show(s.best)],
 ['Média dos acertos',show(s.average)],['Ao5',show(s.ao5)],['Ao12',show(s.ao12)],['Ao50',show(s.ao50)],['Ao100',show(s.ao100)]];
 return '<section class="cross-lab-data"><div class="cross-panel-heading"><h2>Evolução · '+level+' '+(level===1?'meio':'meios')+'</h2><span class="cross-progress">Por modalidade</span></div>'+
 '<div class="cross-lab-all-stats">'+rows.map(([a,b])=>'<div><span>'+a+'</span><strong>'+b+'</strong></div>').join('')+'</div>'+
 '<h3>Últimos tempos válidos</h3>'+chart(current())+
 '<p class="cross-lab-help">Ao5, Ao12, Ao50 e Ao100 descartam os melhores e piores resultados (5%, arredondado para cima). Tentativas incompletas entram como DNF. A velocidade não substitui a precisão.</p>'+
 '<div class="cross-lab-data-actions"><button type="button" data-cross-timer="export">Exportar CSV</button><button type="button" data-cross-timer="share">Compartilhar resultado</button><button type="button" data-cross-timer="png">Baixar cartão PNG</button></div></section>';
}
export function crossTimerPage(){
 const s=statsOf(current()),hide=phase==='running',working=active();
 const prompt=phase==='ready'?'Toque para iniciar '+(inspection?'a inspeção':'o cronômetro'):
  phase==='inspection'?'Inspecionando · toque para antecipar o início':
  phase==='running'?'Toque quando concluir as '+level+' peças de meio':'Tempo parado · registre o resultado';
 return '<section class="cross-lab-timer">'+
 '<div class="cross-lab-hero"><span class="cross-kicker">TREINO COM CUBO FÍSICO · CROSS</span><h1>Timer da cruz</h1>'+
 '<p>Treine uma, duas, três ou as quatro peças de meio. Cada nível tem seu próprio cronômetro e histórico.</p></div>'+
 '<div class="cross-lab-levels" role="group" aria-label="Escolher cronômetro de cruz">'+
 [1,2,3,4].map(n=>'<button type="button" data-cross-timer="level-'+n+'" '+(working||phase==='review'?'disabled':'')+' aria-pressed="'+(level===n)+'" class="'+(level===n?'selected':'')+'"><small>TIMER '+n+'</small><strong>'+n+'</strong><span>'+(n===1?'peça de meio':'peças de meio')+'</span></button>').join('')+'</div>'+
 '<div class="cross-lab-tabs" role="tablist" aria-label="Áreas do timer">'+
 [['timer','Cronômetro'],['history','Histórico'],['stats','Evolução']].map(([id,name])=>'<button role="tab" aria-selected="'+(tab===id)+'" type="button" data-cross-timer="tab-'+id+'" '+(working?'disabled':'')+'>'+name+'</button>').join('')+'</div>'+
 (tab==='history'?historyPage():tab==='stats'?statsPage():
 '<div class="cross-lab-timer-content">'+
 '<section class="cross-lab-clock-section"><div class="cross-lab-clock-status">'+(phase==='inspection'?'INSPEÇÃO':phase==='running'?'EXECUÇÃO':phase==='review'?'FINALIZADO':'PRONTO PARA INICIAR')+'</div>'+
 '<button type="button" class="cross-lab-clock" data-cross-timer="clock" '+(phase==='review'?'disabled':'')+' aria-label="'+esc(prompt)+'"><strong id="cross-lab-digits">'+clock()+'</strong><span>'+esc(prompt)+'</span></button>'+
 '<p class="cross-lab-clock-hint">'+(phase==='running'?'Monte as peças de memória e pare no final.':'Toque no relógio ou pressione a barra de espaço.')+'</p>'+
 (phase==='review'?'<div class="cross-lab-review"><h3>Quantas peças de meio você posicionou corretamente?</h3>'+
 '<div class="cross-lab-scores">'+Array.from({length:level+1},(_,n)=>'<button type="button" data-cross-timer="save-'+n+'" class="'+(n===level?'success':'')+'">'+n+' / '+level+'</button>').join('')+'</div>'+
 '<label>Penalidade<select id="cross-lab-penalty"><option value="none" '+(pendingPenalty==='none'?'selected':'')+'>Nenhuma</option><option value="plus2" '+(pendingPenalty==='plus2'?'selected':'')+'>+2 segundos</option><option value="dnf" '+(pendingPenalty==='dnf'?'selected':'')+'>DNF</option></select></label>'+
 '<p class="cross-lab-help">Os resultados de cubo físico são informados pelo usuário, não verificados automaticamente.</p></div>':'')+
 '<p class="cross-lab-notice" role="status">'+esc(notice)+'</p>'+(newPB?'<div class="cross-lab-pb-notice"><strong>✦ Novo recorde pessoal!</strong><button type="button" data-cross-timer="share-pb">Compartilhar recorde</button></div>':'')+'</section>'+
 '<div class="cross-lab-snapshot" aria-label="Resumo do nível">'+summary()+'</div>'+
 '<div class="cross-lab-scramble"><div><strong>Embaralhamento 3×3</strong><button type="button" data-cross-timer="new" '+(working||phase==='review'?'disabled':'')+' aria-label="Gerar novo embaralhamento">⟳ Novo</button></div>'+
 '<p>'+(!hide?esc(sequence):'Oculto durante a execução')+'</p></div>'+
 '<div class="cross-lab-settings"><label>Movimentos<select id="cross-lab-length" '+(working?'disabled':'')+'>'+[15,20,25].map(n=>'<option value="'+n+'" '+(length===n?'selected':'')+'>'+n+'</option>').join('')+'</select></label>'+
 '<label>Inspeção<select id="cross-lab-inspection" '+(working?'disabled':'')+'>'+[0,8,15,30].map(n=>'<option value="'+n+'" '+(inspection===n?'selected':'')+'>'+(n===0?'Desligada':n+' segundos')+'</option>').join('')+'</select></label>'+
 '<label>Visualização<select id="cross-lab-view" '+(working?'disabled':'')+'><option value="3d" '+(cubeView==='3d'?'selected':'')+'>Cubo 3D</option><option value="2d" '+(cubeView==='2d'?'selected':'')+'>Cubo 2D</option></select></label></div>'+
 '<details class="cross-lab-cube-details"><summary>Visualizar cubo embaralhado <span>'+cubeView.toUpperCase()+'</span></summary>'+
 (hide?'<p>Visualização oculta durante a execução.</p>':
 '<div class="cross-cube-area cross-lab-cube">'+(cubeView==='3d'?cube3D(cube,{yaw,pitch,size:168,colors:palette}):net())+'</div>'+
 (cubeView==='3d'?'<div class="cross-camera">'+[['left','←'],['up','↑'],['down','↓'],['right','→']].map(([k,arrow])=>'<button type="button" data-cross-timer="cam-'+k+'">'+arrow+'</button>').join('')+'</div>':''))+'</details>'+
 '<div class="cross-lab-data-actions"><button type="button" data-cross-timer="new" '+(working||phase==='review'?'disabled':'')+'>Novo desafio</button><button type="button" data-cross-timer="cancel" '+(!working&&phase!=='review'?'disabled':'')+'>Cancelar tentativa</button></div>'+
 '</div>')+'</section>';
}
export function crossTimerBusy(){return active()}
export function crossTimerSuspend(){cancelAnimationFrame(frame);frame=0;if(active()){phase='ready';elapsed=0}}
export function crossTimerSetLevel(n){if(![1,2,3,4].includes(Number(n))||active()||phase==='review'){if(phase==='review')notice='Registre o resultado ou cancele a tentativa antes de trocar de nível.';return false;}selectLevel(Number(n));notice='Treino preparado. Embaralhe o cubo físico e inicie.';return true}
function download(name,blob){const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000)}
function shareCard(exportFile=false){
 const eligible=current().map(r=>({...r,
  penalty:r.penalty==='plus2'?'+2':r.penalty==='dnf'?'DNF':'OK'
 }));
 const canvas=shareImage({title:'Minha evolução no Cross',subtitle:level+' '+(level===1?'peça de meio':'peças de meio'),solves:eligible});
 downloadOrShare(canvas,'academia-cfop-cross-'+level+'.png',!exportFile).catch(err=>alert('Não foi possível compartilhar: '+err.message));
}
export function crossTimerAction(button){
 const cmd=button?.dataset?.crossTimer;if(!cmd)return false;
 if(cmd==='clock'){
  if(phase==='ready'){phase=inspection?'inspection':'running';started=performance.now();elapsed=0;notice=''}
  else if(phase==='inspection'){phase='running';started=performance.now()}
  else if(phase==='running'){elapsed=Math.max(0,performance.now()-started);phase='review';cancelAnimationFrame(frame)}
  return true
 }
 if(cmd.startsWith('save-')&&phase==='review'){
  const achieved=Number(cmd.slice(5));if(!Number.isInteger(achieved)||achieved<0||achieved>level)return false;
  if(elapsed<2000&&!confirm('Tempo muito curto ('+fmt(elapsed)+'s). Registrar mesmo assim?'))return false;
  const previousBest=statsOf(current()).best;
  const correct=achieved===level&&pendingPenalty!=='dnf';
  const actual=elapsed+(pendingPenalty==='plus2'?2000:0);
  const best=correct&&elapsed>=2000&&(previousBest===null||actual<previousBest);
  records.push({id:Date.now()+'-'+Math.random().toString(36).slice(2,7),level,achieved,ms:Math.round(elapsed),
   penalty:pendingPenalty,date:new Date().toISOString(),scramble:sequence,inspection,comment:'',session:'Geral',archived:false});
  records=records.slice(-3500);saveRecords();
  nextScramble();newPB=best;
  notice=best?'Novo recorde pessoal no Cross '+level+' peças: '+fmt(actual)+'s!':
   correct?'Resultado correto registrado: '+fmt(actual)+'s.':
   'Tentativa registrada: '+achieved+' de '+level+' peças de meio.';
  if(best)celebrate(document.body);
  recordTimerSolve('cross'+level,Math.round(elapsed),correct).catch(()=>{});
  return true;
 }
 if(cmd.startsWith('level-'))return crossTimerSetLevel(Number(cmd.slice(6)));
 if(cmd.startsWith('tab-')&&!active()){tab=cmd.slice(4);notice='';return true}
 if(cmd==='new'&&!active()&&phase!=='review'){nextScramble();notice='Novo embaralhamento gerado.';return true}
 if(cmd==='cancel'&&(active()||phase==='review')){nextScramble();notice='Tentativa cancelada, sem registro.';return true}
 if(cmd.startsWith('cam-')&&!active()){
  if(cmd==='cam-left')yaw-=30;if(cmd==='cam-right')yaw+=30;
  if(cmd==='cam-up')pitch=Math.min(75,pitch+15);if(cmd==='cam-down')pitch=Math.max(-75,pitch-15);
  return true;
 }
 if(cmd.startsWith('delete-')&&!active()){
  const id=cmd.slice(7);if(!confirm('Excluir esta tentativa?'))return false;
  records=records.filter(r=>r.id!==id);saveRecords();return true;
 }
 if(cmd==='clear'&&!active()){
  if(!confirm('Apagar somente o histórico do timer de '+level+' peças de meio?'))return false;
  records=records.filter(r=>r.level!==level);saveRecords();return true;
 }
 if(cmd==='export'){
  const lines=['data,nivel,pecas_corretas,tempo_ms,penalidade,embaralhamento'];
  for(const r of current())lines.push([r.date,r.level,r.achieved,r.ms,r.penalty,'"'+r.scramble.replace(/"/g,'""')+'"'].join(','));
  download('academia-cfop-cross-'+level+'.csv',new Blob(['\ufeff'+lines.join('\r\n')],{type:'text/csv;charset=utf-8'}));return false;
 }
 if(cmd==='share-pb'){const r=current().at(-1);if(r){downloadOrShare(shareImage({title:'Recorde no Cross',subtitle:level+' peças de meio',record:{...r,penalty:r.penalty==='plus2'?'+2':r.penalty==='dnf'?'DNF':'OK'}}),'academia-cfop-cross-pb.png').catch(()=>{});}return false}
 if(cmd==='png'||cmd==='share'){shareCard(cmd==='png');return false}
 return false;
}
export function crossTimerChange(node){
 if(node.id==='cross-lab-penalty'){pendingPenalty=['plus2','dnf'].includes(node.value)?node.value:'none';return false}
 if(active())return false;
 if(node.id==='cross-lab-length'&&[15,20,25].includes(Number(node.value))){length=Number(node.value);savePrefs();nextScramble();return true}
 if(node.id==='cross-lab-inspection'&&[0,8,15,30].includes(Number(node.value))){inspection=Number(node.value);savePrefs();return true}
 if(node.id==='cross-lab-view'&&['2d','3d'].includes(node.value)){cubeView=node.value;savePrefs();return true}
 return false;
}
export function crossTimerBind(render){
 cancelAnimationFrame(frame);frame=0;
 const root=document.getElementById('cross-timer-history-panel');
 if(root){
  const manager=createTimerHistory({
   root,kind:'cross'+level,
   getRecords:()=>normalizeAll(records.filter(r=>r.level===level)),
   setRecords:next=>{records=[...records.filter(r=>r.level!==level),...next.map(normalizeRecord).filter(Boolean)].slice(-3500);saveRecords()},
   onUpdate:()=>render()
  });manager.render()
 }
 if(!active())return;
 const tick=()=>{
  const label=document.getElementById('cross-lab-digits');if(!label||!active()){frame=0;return}
  const dt=performance.now()-started;
  if(phase==='inspection'&&dt>=inspection*1000){
   phase='running';started=performance.now();elapsed=0;
   if(navigator.vibrate)navigator.vibrate(60);
   render();return;
  }
  label.textContent=phase==='inspection'?(Math.max(0,inspection*1000-dt)/1000).toFixed(1):fmt(dt);
  frame=requestAnimationFrame(tick);
 };
 frame=requestAnimationFrame(tick);
}
