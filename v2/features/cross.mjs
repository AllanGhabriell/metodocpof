import {solved,apply,facelets} from '../cube/engine.mjs';
const KEY='cfop-cross-v2';
const targetsAll=[{face:'F',d:1,name:'Frente'},{face:'R',d:5,name:'Direita'},{face:'B',d:7,name:'Trás'},{face:'L',d:3,name:'Esquerda'}];
const colors={U:'#fafafa',D:'#f8d649',F:'#20ad75',B:'#4377e8',R:'#db5354',L:'#e89637'};
let count=Math.max(1,Math.min(4,Number(localStorage.getItem(KEY))||4)),selected=[],state=solved(),scramble='',history=[],message='',awarded=false;
const escape=x=>String(x).replace(/[&<>"]/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[ch]));
function choose(n){return Math.floor(Math.random()*n)}
function complete(t){const f=facelets(state);return f.D[t.d]==='D'&&f[t.face][7]===t.face}
export function newCross(){
 const shuffled=targetsAll.slice().sort(()=>Math.random()-.5);selected=shuffled.slice(0,count);
 const moves=['U','D','L','R','F','B'],axis={U:0,D:0,L:1,R:1,F:2,B:2},endings=['',"'",'2'];
 let last='',sequence=[];
 for(let i=0;i<20;i++){const pool=moves.filter(m=>axis[m]!==axis[last]);const m=pool[choose(pool.length)];sequence.push(m+endings[choose(3)]);last=m}
 scramble=sequence.join(' ');state=apply(solved(),scramble);history=[];message='';awarded=false;
}
function net(){
 const f=facelets(state),highlight=new Set();
 for(const t of selected){highlight.add('D'+t.d);highlight.add(t.face+'7')}
 const cell=24,gap=3;let out='';
 for(let row=0;row<9;row++)for(let col=0;col<12;col++){
  const face=row<3?(col>=3&&col<6?'U':''):row<6?(col<3?'L':col<6?'F':col<9?'R':'B'):(col>=3&&col<6?'D':'');
  if(!face)continue;
  const index=(row%3)*3+(col%3),selectedTile=highlight.has(face+index);
  out+='<rect x="'+(col*(cell+gap)+2)+'" y="'+(row*(cell+gap)+2)+'" width="'+cell+'" height="'+cell+'" rx="3" fill="'+colors[f[face][index]]+'" stroke="'+(selectedTile?'#f5f0ff':'#100e17')+'" stroke-width="'+(selectedTile?'3':'1')+'"/>';
 }
 return '<svg viewBox="0 0 329 248" class="cross-net" role="img" aria-label="Planificação 2D do cubo com as arestas-alvo destacadas">'+out+'</svg>';
}
export function crossPage(){
 if(!scramble)newCross();
 const correct=selected.filter(complete).length;
 return '<div class="eyebrow">Treinar / Cross</div><h1>Cruz 2D</h1><p class="muted">Branco embaixo. Selecione de uma a quatro arestas e resolva-as alinhadas aos centros.</p>'+
 '<div class="cross-layout"><section class="card"><div class="row between"><h2>Estado do cubo</h2><span class="tag">'+correct+' / '+selected.length+' arestas</span></div><div class="cross-visual">'+net()+'</div>'+
 '<p class="panel-overline">Embaralhamento</p><p class="alg">'+escape(scramble)+'</p><div class="row"><button data-cross="new">Novo desafio</button><button class="secondary" data-cross="undo" '+(history.length?'':'disabled')+'>Desfazer</button><button class="secondary" data-cross="check">Conferir cruz</button></div><p class="muted" role="status">'+escape(message)+'</p></section>'+
 '<section class="card"><h2>Personalizar</h2><label class="cross-label" for="cross-count">Arestas a resolver</label><select class="field cross-select" id="cross-count">'+[1,2,3,4].map(n=>'<option value="'+n+'" '+(n===count?'selected':'')+'>'+n+'</option>').join('')+'</select>'+
 '<p class="muted">Arestas selecionadas: '+selected.map(t=>'<strong class="cross-edge">D'+t.face+'</strong>').join(' ')+'</p><p class="muted">Pratique os movimentos para atualizar a visualização e conferir as posições corretas.</p>'+
 '<div class="cross-moves">'+['U','D','R','L','F','B'].map(m=>'<div class="cross-move-row">'+[m,m+"'",m+'2'].map(turn=>'<button class="move-button" type="button" data-crossmove="'+turn+'">'+turn+'</button>').join('')+'</div>').join('')+'</div></section></div>';
}
export function crossClick(button,earn){
 if(button.dataset.crossmove){history.push(state.slice());state=apply(state,button.dataset.crossmove);message='';return true}
 const cmd=button.dataset.cross;if(!cmd)return false;
 if(cmd==='new')newCross();
 else if(cmd==='undo'){if(history.length){state=history.pop();message='Último movimento desfeito.'}}
 else if(cmd==='check'){
  const correct=selected.filter(complete).length;
  if(correct===selected.length){message='Todas as arestas escolhidas estão corretas!';if(!awarded){earn('Cross',30);awarded=true}}
  else message='Ainda faltam '+(selected.length-correct)+' arestas escolhidas.';
 }
 return true;
}
export function crossChange(t){
 if(t.id!=='cross-count')return false;
 count=Math.max(1,Math.min(4,Number(t.value)||4));localStorage.setItem(KEY,String(count));newCross();return true;
}
