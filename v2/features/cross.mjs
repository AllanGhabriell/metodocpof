import {solved,apply,facelets} from '../cube/engine.mjs';
import {cube3D} from '../cube/visual.mjs';
const KEY='academy-cross-settings-v1';
const targets=[{face:'F',d:7,name:'Frente'},{face:'R',d:5,name:'Direita'},{face:'B',d:1,name:'Trás'},{face:'L',d:3,name:'Esquerda'}];
const colors={U:'#fafafa',D:'#f8d649',F:'#20ad75',B:'#4377e8',R:'#db5354',L:'#e89637'};
const read=()=>{try{return JSON.parse(localStorage.getItem(KEY)||'{}')}catch{return {}}};
const saved=read();
let count=Math.max(1,Math.min(4,Number(saved.count)||4)),mode=saved.mode==='free'?'free':'guided',view=saved.view==='net'?'net':'cube';
let selected=[],state=solved(),scramble='',history=[],message='',awarded=false,yaw=-35,pitch=28,attempts=0;
const esc=x=>String(x).replace(/[&<>"]/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[ch]));
const save=()=>localStorage.setItem(KEY,JSON.stringify({count,mode,view}));
const complete=t=>{const f=facelets(state);return f.D[t.d]==='D'&&f[t.face][7]===t.face};
function shuffled(items){const a=items.slice();for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]]}return a}
export function newCross(){
 selected=shuffled(targets).slice(0,count);
 // Half-turns move only the requested bottom edges out of position;
 // optional U turns randomize the top without disturbing other bottom edges.
 const seq=[];for(const t of shuffled(selected)){seq.push(t.face+'2');if(Math.random()<.55)seq.push(['U',"U'",'U2'][Math.floor(Math.random()*3)])}
 if(!seq.some(x=>x.startsWith('U')))seq.push(['U',"U'",'U2'][Math.floor(Math.random()*3)]);
 scramble=seq.join(' ');state=apply(solved(),scramble);history=[];message='';awarded=false;attempts=0;
}
function net(){
 const f=facelets(state),highlight=new Set();
 for(const t of selected){highlight.add('D'+t.d);highlight.add(t.face+'7')}
 const cell=24,gap=3;let out='';
 for(let row=0;row<9;row++)for(let col=0;col<12;col++){
  const face=row<3?(col>=3&&col<6?'U':''):row<6?(col<3?'L':col<6?'F':col<9?'R':'B'):(col>=3&&col<6?'D':'');
  if(!face)continue;
  const idx=(row%3)*3+(col%3),mark=highlight.has(face+idx);
  out+='<rect x="'+(col*(cell+gap)+2)+'" y="'+(row*(cell+gap)+2)+'" width="'+cell+'" height="'+cell+'" rx="3" fill="'+colors[f[face][idx]]+'" stroke="'+(mark?'#fff':'#111322')+'" stroke-width="'+(mark?'3':'1')+'"/>';
 }
 return '<svg viewBox="0 0 329 248" class="cross-net" role="img" aria-label="Cubo aberto em duas dimensões">'+out+'</svg>';
}
function options(){return '<div class="cross-settings"><label for="cross-count">Dificuldade</label><select id="cross-count" aria-label="Número de arestas para resolver">'+[1,2,3,4].map(n=>'<option value="'+n+'" '+(n===count?'selected':'')+'>'+n+' '+(n===1?'aresta':'arestas')+'</option>').join('')+'</select><label for="cross-mode">Modo de treino</label><select id="cross-mode"><option value="guided" '+(mode==='guided'?'selected':'')+'>Guiado</option><option value="free" '+(mode==='free'?'selected':'')+'>Livre</option></select></div>'}
export function crossPage(){
 if(!scramble)newCross();
 const correct=selected.filter(complete).length;
 const done=correct===selected.length;
 return '<div class="cross-intro"><span class="eyebrow">ACADEMIA CPOF · TREINAMENTO</span><h1>Treino de cruz</h1><p class="muted">Monte a cruz branca na face inferior, alinhando cada aresta com a cor do centro lateral.</p></div>'+
 '<div class="cross-workspace"><section class="cross-training-panel"><div class="cross-panel-heading"><div><span class="cross-kicker">DESAFIO ATUAL</span><h2>'+(count===4?'Cruz completa':count+' '+(count===1?'aresta':'arestas'))+'</h2></div><span class="cross-progress '+(done?'is-complete':'')+'">'+correct+' de '+count+' corretas</span></div>'+
 '<div class="cross-view-tabs" role="group" aria-label="Visualização do cubo"><button data-cross="view-cube" aria-pressed="'+(view==='cube')+'" class="'+(view==='cube'?'selected':'')+'">Cubo 3D</button><button data-cross="view-net" aria-pressed="'+(view==='net')+'" class="'+(view==='net'?'selected':'')+'">Cubo aberto</button></div>'+
 '<div class="cross-cube-area">'+(view==='cube'?cube3D(state,{yaw,pitch,size:168}):net())+'</div>'+
 (view==='cube'?'<div class="cross-camera"><button data-cross="left" aria-label="Girar visualização para esquerda">←</button><button data-cross="up" aria-label="Inclinar visualização para cima">↑</button><button data-cross="down" aria-label="Inclinar visualização para baixo">↓</button><button data-cross="right" aria-label="Girar visualização para direita">→</button></div>':'')+
 '<div class="cross-scramble"><span>EMBARALHAMENTO</span><strong>'+esc(scramble)+'</strong></div>'+
 '<div class="cross-main-actions"><button class="cross-primary" data-cross="new">Novo desafio</button><button data-cross="undo" '+(history.length?'':'disabled')+'>Desfazer</button><button data-cross="check">Conferir</button></div><p class="cross-feedback" role="status" aria-live="polite">'+esc(message)+'</p></section>'+
 '<aside class="cross-side-panel"><details class="cross-options" open><summary>Configurações do treino</summary>'+options()+'</details>'+
 '<div class="cross-instructions"><h2>'+(mode==='guided'?'Como treinar':'Treino livre')+'</h2>'+(mode==='guided'?'<p>1. Observe o embaralhamento e as arestas que precisam ser resolvidas.</p><p>2. Use os movimentos abaixo para posicionar as peças.</p><p>3. Confira quando a cruz estiver alinhada.</p>':'<p>Resolva as arestas escolhidas sem instruções de sequência. Você pode conferir o resultado quando quiser.</p>')+
 '<p class="cross-targets">Arestas-alvo: '+selected.map(t=>'<span>'+t.name+'</span>').join(' ')+'</p></div>'+
 '<div class="cross-move-panel"><h2>Movimentar o cubo</h2><p>Toque nas notações para executar os movimentos.</p><div class="cross-moves">'+['U','D','R','L','F','B'].map(m=>'<div class="cross-move-row">'+[m,m+"'",m+'2'].map(turn=>'<button type="button" data-crossmove="'+turn+'">'+turn+'</button>').join('')+'</div>').join('')+'</div></div></aside></div>';
}
export function crossClick(button,earn=()=>{}){
 if(button.dataset.crossmove){history.push(state.slice());state=apply(state,button.dataset.crossmove);attempts++;message='';return true}
 const cmd=button.dataset.cross;if(!cmd)return false;
 if(cmd==='new')newCross();
 else if(cmd==='undo'&&history.length){state=history.pop();attempts=Math.max(0,attempts-1);message='Movimento desfeito.'}
 else if(cmd==='check'){
  const correct=selected.filter(complete).length;
  if(correct===selected.length){message='Cruz correta! Todas as arestas estão alinhadas.';if(!awarded){earn('Cross',30);awarded=true}}
  else message=correct+' de '+selected.length+' arestas corretas. Confira também o alinhamento com os centros laterais.';
 }else if(cmd==='view-cube'||cmd==='view-net'){view=cmd==='view-cube'?'cube':'net';save()}
 else if(cmd==='left')yaw-=30;else if(cmd==='right')yaw+=30;
 else if(cmd==='up')pitch=Math.min(75,pitch+15);else if(cmd==='down')pitch=Math.max(-75,pitch-15);
 return true;
}
export function crossChange(target){
 if(target.id==='cross-count'){count=Math.max(1,Math.min(4,Number(target.value)||4));save();newCross();return true}
 if(target.id==='cross-mode'){mode=target.value==='free'?'free':'guided';save();return true}
 return false;
}
