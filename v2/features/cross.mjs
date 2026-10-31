import {solved,apply,facelets,inverse} from '../cube/engine.mjs';
import {cube3D} from '../cube/visual.mjs?v=20261030-20';
const KEY='academy-cross-settings-v1';
const targets=[{face:'F',d:7,name:'Frente'},{face:'R',d:5,name:'Direita'},{face:'B',d:1,name:'Trás'},{face:'L',d:3,name:'Esquerda'}];
const colors={U:'#f8d649',D:'#fafafa',F:'#20ad75',B:'#4377e8',R:'#db5354',L:'#e89637'};
const read=()=>{try{return JSON.parse(localStorage.getItem(KEY)||'{}')}catch{return {}}};
const saved=read();
let count=Math.max(1,Math.min(4,Number(saved.count)||4)),mode=saved.mode==='free'?'free':'guided',view=saved.view==='net'?'net':'cube';
let selected=[],state=solved(),scramble='',history=[],moves=[],message='',awarded=false,yaw=-35,pitch=28,attempts=0,guideStep=0,hintStep=0;
const esc=x=>String(x).replace(/[&<>"]/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[ch]));
const save=()=>localStorage.setItem(KEY,JSON.stringify({count,mode,view}));
const complete=t=>{const f=facelets(state);return f.D[t.d]==='D'&&f[t.face][7]===t.face};
function shuffled(items){const a=items.slice();for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]]}return a}
export function newCross(){
 selected=shuffled(targets).slice(0,count);
 // Half-turns disturb selected edge positions;
 // optional U turns randomize the top without disturbing other bottom edges.
 const seq=[];for(const t of shuffled(selected)){seq.push(t.face+'2');if(Math.random()<.55)seq.push(['U',"U'",'U2'][Math.floor(Math.random()*3)])}
 if(!seq.some(x=>x.startsWith('U')))seq.push(['U',"U'",'U2'][Math.floor(Math.random()*3)]);
 scramble=seq.join(' ');state=apply(solved(),scramble);history=[];moves=[];message='';awarded=false;attempts=0;guideStep=0;hintStep=0;
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
function lesson(){
 const steps=['Observar','Planejar','Executar','Analisar'];
 const reference=inverse(scramble+' '+moves.join(' '));
 const suggestion=reference.split(' ').filter(Boolean);
 const correct=selected.filter(complete).length;
 const messages=[
  'Localize as peças de meio da cruz e confira a cor lateral de cada uma com o centro correspondente.',
  'Antes de mover o cubo, visualize onde cada peça precisa chegar. Procure evitar mexer em peças já posicionadas.',
  'Execute os movimentos abaixo. A opção Dica mostra um movimento de uma solução de referência.',
  'Confira quantas peças estão alinhadas aos centros, revise as tentativas e tente encontrar outra sequência.'
 ];
 const hint=hintStep===0?'':hintStep===1?
  'Lembre-se: não basta a cor estar na face da cruz. A cor lateral deve coincidir com o centro.':
  hintStep===2?
  'Próximo movimento de uma solução de referência: '+(suggestion[0]||'O cubo já está resolvido.')+'.':
  'Sequência reversa de referência: '+(reference||'Cubo resolvido')+'. Ela é válida, mas não necessariamente a mais curta.';
 return '<section class="cross-lab-lesson"><div class="cross-lab-lesson-top"><div><span class="cross-kicker">APRENDIZADO PASSO A PASSO</span><h2>Entenda a cruz</h2></div><span class="cross-progress">'+correct+' / '+count+' peças corretas</span></div>'+
  '<nav aria-label="Etapas do aprendizado" class="cross-lab-lesson-steps">'+steps.map((s,i)=>'<button type="button" data-cross="guide-'+i+'" aria-current="'+(guideStep===i?'step':'false')+'"><b>'+(i+1)+'</b><span>'+s+'</span></button>').join('')+'</nav>'+
  '<div class="cross-lab-lesson-text"><strong>'+steps[guideStep]+'</strong><p>'+messages[guideStep]+'</p>'+
  '<p><small>Meta: '+count+' '+(count===1?'peça de meio':'peças de meio')+' · A cruz fica na face inferior, alinhada aos centros laterais.</small></p></div>'+
  (hint?'<p class="cross-lab-hint" role="status">'+esc(hint)+'</p>':'')+
  '<div class="cross-lab-lesson-actions"><button type="button" data-cross="hint">Dica gradual</button><button type="button" data-cross="guide-next">'+(guideStep===3?'Rever do início':'Próxima etapa →')+'</button></div></section>';
}
function options(){return '<div class="cross-settings"><label for="cross-count">Dificuldade</label><select id="cross-count" aria-label="Número de peça de meios para resolver">'+[1,2,3,4].map(n=>'<option value="'+n+'" '+(n===count?'selected':'')+'>'+n+' '+(n===1?'peça de meio':'peça de meios')+'</option>').join('')+'</select><label for="cross-mode">Modo de treino</label><select id="cross-mode"><option value="guided" '+(mode==='guided'?'selected':'')+'>Guiado</option><option value="free" '+(mode==='free'?'selected':'')+'>Livre</option></select></div>'}
export function crossPage(){
 if(!scramble)newCross();
 const correct=selected.filter(complete).length;
 const done=correct===selected.length;
 return '<div class="cross-intro"><span class="eyebrow">ACADEMIA CFOP · TREINAMENTO</span><h1>Treino de cruz</h1><p class="muted">Monte a cruz branca na face inferior, alinhando cada peça de meio com a cor do centro lateral.</p></div>'+
 lesson()+'<div class="cross-workspace"><section class="cross-training-panel"><div class="cross-panel-heading"><div><span class="cross-kicker">DESAFIO ATUAL</span><h2>'+(count===4?'Cruz completa':count+' '+(count===1?'peça de meio':'peça de meios'))+'</h2></div><span class="cross-progress '+(done?'is-complete':'')+'">'+correct+' de '+count+' corretas</span></div>'+
 '<div class="cross-view-tabs" role="group" aria-label="Visualização do cubo"><button data-cross="view-cube" aria-pressed="'+(view==='cube')+'" class="'+(view==='cube'?'selected':'')+'">Cubo 3D</button><button data-cross="view-net" aria-pressed="'+(view==='net')+'" class="'+(view==='net'?'selected':'')+'">Cubo aberto</button></div>'+
 '<div class="cross-cube-area">'+(view==='cube'?cube3D(state,{yaw,pitch,size:168,colors}):net())+'</div>'+
 (view==='cube'?'<div class="cross-camera"><button data-cross="left" aria-label="Girar visualização para esquerda">←</button><button data-cross="up" aria-label="Inclinar visualização para cima">↑</button><button data-cross="down" aria-label="Inclinar visualização para baixo">↓</button><button data-cross="right" aria-label="Girar visualização para direita">→</button></div>':'')+
 '<div class="cross-scramble"><span>EMBARALHAMENTO</span><strong>'+esc(scramble)+'</strong></div>'+
 '<div class="cross-main-actions"><button class="cross-primary" data-cross="new">Novo desafio</button><button data-cross="undo" '+(history.length?'':'disabled')+'>Desfazer</button><button data-cross="check">Conferir</button></div><p class="cross-feedback" role="status" aria-live="polite">'+esc(message)+'</p></section>'+
 '<aside class="cross-side-panel"><details class="cross-options" open><summary>Configurações do treino</summary>'+options()+'</details>'+
 '<div class="cross-instructions"><h2>'+(mode==='guided'?'Como treinar':'Treino livre')+'</h2>'+(mode==='guided'?'<p>1. Observe o embaralhamento e as peça de meios que precisam ser resolvidas.</p><p>2. Use os movimentos abaixo para posicionar as peças.</p><p>3. Confira quando a cruz estiver alinhada.</p>':'<p>Resolva as peça de meios escolhidas sem instruções de sequência. Você pode conferir o resultado quando quiser.</p>')+
 '<p class="cross-targets">Peças de meio-alvo: '+selected.map(t=>'<span>'+t.name+'</span>').join(' ')+'</p></div>'+
 '<div class="cross-move-panel"><h2>Movimentar o cubo</h2><p>Toque nas notações para executar os movimentos.</p><div class="cross-moves">'+['U','D','R','L','F','B'].map(m=>'<div class="cross-move-row">'+[m,m+"'",m+'2'].map(turn=>'<button type="button" data-crossmove="'+turn+'">'+turn+'</button>').join('')+'</div>').join('')+'</div></div></aside></div>';
}
export function crossClick(button,earn=()=>{}){
 if(button.dataset.crossmove){history.push(state.slice());moves.push(button.dataset.crossmove);state=apply(state,button.dataset.crossmove);attempts++;guideStep=2;hintStep=0;message='';return true}
 const cmd=button.dataset.cross;if(!cmd)return false;
 if(cmd==='new')newCross();
 else if(cmd==='undo'&&history.length){state=history.pop();moves.pop();attempts=Math.max(0,attempts-1);hintStep=0;message='Movimento desfeito.'}
 else if(cmd==='guide-next'){guideStep=(guideStep+1)%4}
 else if(cmd.startsWith('guide-')){guideStep=Math.max(0,Math.min(3,Number(cmd.slice(6))||0))}
 else if(cmd==='hint'){hintStep=Math.min(3,hintStep+1)}
 else if(cmd==='check'){guideStep=3;
  const correct=selected.filter(complete).length;
  if(correct===selected.length){message='Cruz correta! Todas as peça de meios estão alinhadas.';if(!awarded){earn('Cross',30);awarded=true}}
  else message=correct+' de '+selected.length+' peça de meios corretas. Confira também o alinhamento com os centros laterais.';
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
