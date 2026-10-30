import {recognitionDiagram} from '../cube/recognition.mjs';
import {awardActivity,progressData,saveFeatureData} from './progress.mjs';
import {solved,apply,stickerPositions} from '../cube/engine.mjs';
import {cube3D} from '../cube/visual.mjs';
const esc=x=>String(x??'').replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const baseCards=[
 ['base-cross','O que precisa estar correto em uma Cross completa?','Quatro arestas na face de base e as cores laterais alinhadas aos centros.'],
 ['base-f2l','O que forma um par F2L?','Um canto e uma aresta correspondentes a um slot.'],
 ['base-oll','Qual o objetivo do OLL?','Orientar as peças da última camada.'],
 ['base-pll','Qual o objetivo do PLL?','Permutar as peças da última camada.'],
 ['base-notation','O que significa U2?','Uma rotação de 180° na camada superior.']
];
const nowDate=()=>new Date().toLocaleDateString('en-CA');
function today(){const d=new Date();return [d.getFullYear(),String(d.getMonth()+1).padStart(2,'0'),String(d.getDate()).padStart(2,'0')].join('-')}
let currentId='',revealed=false,message='',mode='lookahead',scramble='',shown=false,completed=false,challenge='',challengeMessage='';
function prepareCards(cases=[]){
 const data=progressData(),ids=new Set(data.cards.map(c=>c.id));let changed=false;
 for(const [id,question,answer] of baseCards)if(!ids.has(id)){data.cards.push({id,question,answer,due:'2000-01-01',interval:0});ids.add(id);changed=true}
 for(const item of cases){
  if(!((item.reviewStatus==='verified'||item.reviewed===true)&&['f2l','oll','pll'].includes(item.stage)))continue;
  const id='case-'+item.id;if(ids.has(id))continue;
  data.cards.push({id,question:'Reconheça o caso '+item.id+' e recorde seu algoritmo.',answer:item.algorithm,stage:item.stage,caseId:item.id,setup:item.setup,due:'2000-01-01',interval:0});ids.add(id);changed=true;
 }
 if(changed)saveFeatureData();
}
function dueCards(){return progressData().cards.filter(c=>!c.due||c.due<=today())}
function currentCard(){const due=dueCards();const c=due.find(x=>x.id===currentId)||due[0]||null;currentId=c?.id||'';return c}
export function studyPage(cases=[]){
 prepareCards(cases);const due=dueCards(),card=currentCard();
 return '<div class="eyebrow">Aprendizado / Memória</div><h1>Revisão espaçada</h1><p class="muted">Estude conceitos e crie cartões pessoais. Os casos do PDF só entram no baralho após a validação individual.</p>'+
 '<div class="studio-two"><section class="card"><div class="row between"><h2>Cartão do dia</h2><span class="tag">'+due.length+' pendentes</span></div>'+
 (card?'<div class="study-flashcard"><span class="panel-overline">'+(revealed?'Resposta':'Pergunta')+'</span>'+(card.stage&&!revealed?'<div class="cube-wrap">'+recognitionDiagram(apply(apply(solved(),card.setup),'x2 y'),card.stage)+'</div>':'')+'<p>'+esc(revealed?card.answer:card.question)+'</p></div>'+
 (revealed?'<div class="study-grade">'+[['again','Errei'],['hard','Difícil'],['good','Acertei'],['easy','Fácil']].map(([id,label])=>'<button type="button" data-grade="'+id+'">'+label+'</button>').join('')+'</div>':'<button data-practice="reveal">Mostrar resposta</button>'):
 '<p class="notice">Nenhum cartão pendente. Volte mais tarde!</p>')+
 '<p class="muted">O algoritmo de revisão aumenta o intervalo dos cartões dominados e repete os difíceis.</p></section>'+
 '<section class="card"><h2>Adicionar cartão pessoal</h2><form id="study-new" class="studio-form"><label>Pergunta<input class="field" maxlength="180" name="question" required placeholder="Ex.: O que é lookahead?"></label><label>Resposta<textarea class="field" maxlength="700" name="answer" rows="4" required></textarea></label><button type="submit">Adicionar ao baralho</button></form><p class="muted">Cartões salvos: '+progressData().cards.length+'</p><p class="muted" role="status">'+esc(message)+'</p></section></div>';
}
function generateScramble(){
 const m=['R','U','F','L','B','D'],s=['',"'",'2'];let prev='',seq=[];
 for(let i=0;i<15;i++){let choices=m.filter(x=>x!==prev);prev=choices[Math.floor(Math.random()*choices.length)];seq.push(prev+s[Math.floor(Math.random()*3)])}
 scramble=seq.join(' ');shown=false;completed=false;
}
const stickers=stickerPositions(),groups=new Map();
stickers.forEach(({position},i)=>{const k=position.join(',');if(!groups.has(k))groups.set(k,[]);groups.get(k).push(i)});
function findEdge(st){
 for(const indices of groups.values())if(indices.length===2){
  const colors=indices.map(i=>st[i]).sort().join(',');
  if(colors==='D,R')return indices.map(i=>stickers[i].face).join(' / ');
 }
 return 'não identificada';
}
export function drillsPage(){
 if(!scramble)generateScramble();const finger=mode==='fingertricks';
 const state=apply(solved(),scramble);
 return '<div class="eyebrow">Treinar / Habilidades</div><h1>Reconhecimento, lookahead e fingertricks</h1><p class="muted">Exercícios independentes dos casos de algoritmo ainda não verificados.</p>'+
 '<div class="studio-tabs"><button data-practice="lookahead" class="'+(!finger?'active':'')+'">Lookahead e reconhecimento</button><button data-practice="fingertricks" class="'+(finger?'active':'')+'">Fingertricks</button></div>'+
 '<section class="card practice-drill"><h2>'+(finger?'Fluidez dos movimentos':'Localização da aresta')+'</h2>'+
 (finger?'<p class="muted">Execute o gatilho abaixo cinco vezes, preservando precisão e fluidez de dedos.</p><p class="practice-sequence">R U R’ U’</p>':
 '<p class="muted">Onde está a aresta branca e vermelha? Observe o cubo antes de revelar a resposta.</p><div class="cube-wrap">'+cube3D(state,{size:165})+'</div><details><summary>Ver embaralhamento</summary><p class="alg">'+esc(scramble)+'</p></details>')+
 (shown?'<p class="notice">'+(finger?'Pratique sem movimentos de reposicionamento de mão desnecessários.':'A aresta branca e vermelha está nas faces: '+esc(findEdge(state))+'.')+'</p>':'')+
 '<div class="studio-actions"><button data-practice="show">Mostrar resposta / dica</button><button data-practice="done" '+(completed?'disabled':'')+'>Concluí</button><button class="secondary" data-practice="next">Próximo</button></div>'+
 '<p class="muted">A conclusão é autodeclarada; não há leitura dos movimentos de um cubo físico.</p></section>';
}
function encodeChallenge(obj){return 'CFS1.'+btoa(JSON.stringify(obj))}
export function challengesPage(){
 const active=progressData().challenge;
 return '<div class="eyebrow">Treinos / Compartilhar</div><h1>Desafios entre amigos</h1><p class="muted">Compartilhe um código de scramble com tempo-alvo. Comparação manual; não há partidas online nem placar remoto.</p>'+
 '<div class="studio-two"><section class="card"><h2>Criar desafio</h2><form class="studio-form" id="challenge-new"><label>Tempo-alvo (segundos)<input type="number" class="field" name="target" step=".01" min="5" max="600" value="60" required></label><button type="submit">Gerar desafio</button></form>'+
 (challenge?'<label class="cross-label" for="challenge-code">Código</label><textarea class="field challenge-code" id="challenge-code" rows="4" readonly>'+esc(challenge)+'</textarea><button type="button" data-practice="copy">Copiar código</button>':'')+
 '</section><section class="card"><h2>Receber desafio</h2><form id="challenge-open" class="studio-form"><label>Código recebido<textarea class="field" name="code" rows="4" required placeholder="CFS1..."></textarea></label><button type="submit">Abrir desafio</button></form>'+
 (active?'<div class="notice"><strong>Desafio recebido: '+esc(active.target)+' s</strong><p class="alg">'+esc(active.scramble)+'</p><p>Execute o embaralhamento no cubo físico e compare o resultado com o tempo-alvo.</p></div>':'')+
 '<p class="muted" role="status">'+esc(challengeMessage)+'</p></section></div>';
}
export function practiceClick(b){
 if(b.dataset.grade){
  const c=currentCard();if(!c)return true;const grade=b.dataset.grade;
  const old=Number(c.interval)||1;
  c.interval=grade==='again'?0:grade==='hard'?Math.max(1,old):grade==='good'?Math.max(2,old*2):Math.max(4,old*4);
  const date=new Date();date.setDate(date.getDate()+c.interval);
  c.due=c.interval===0?today():[date.getFullYear(),String(date.getMonth()+1).padStart(2,'0'),String(date.getDate()).padStart(2,'0')].join('-');
  if(grade==='again'){const list=progressData().cards;list.splice(list.indexOf(c),1);list.push(c)}
  else awardActivity('Revisão',grade==='easy'?15:10);
  currentId='';revealed=false;saveFeatureData();return true;
 }
 const cmd=b.dataset.practice;if(!cmd)return false;
 if(cmd==='reveal'){revealed=true;return true}
 if(cmd==='lookahead'||cmd==='fingertricks'){mode=cmd;generateScramble();return true}
 if(cmd==='show'){shown=true;return true}
 if(cmd==='next'){generateScramble();return true}
 if(cmd==='done'){if(!completed){completed=true;shown=true;awardActivity(mode==='fingertricks'?'Fingertricks':'Lookahead',15)}return true}
 if(cmd==='copy'){navigator.clipboard?.writeText(challenge).catch(()=>{});return true}
 return false;
}
export function practiceSubmit(form){
 if(!['study-new','challenge-new','challenge-open'].includes(form.id))return false;
 const f=new FormData(form);
 if(form.id==='study-new'){
  const question=String(f.get('question')||'').trim().slice(0,180),answer=String(f.get('answer')||'').trim().slice(0,700);
  if(question&&answer){progressData().cards.push({id:'own-'+Date.now(),question,answer,interval:0,due:today()});message='Cartão incluído.'}
 }
 if(form.id==='challenge-new'){
  const target=Number(f.get('target'));
  if(target>=5&&target<=600){
   generateScramble();
   challenge=encodeChallenge({target,scramble});
  }
 }
 if(form.id==='challenge-open'){
  try{
   const code=String(f.get('code')||'').trim();
   if(!code.startsWith('CFS1.')||code.length>600)throw Error('Formato inválido');
   const item=JSON.parse(atob(code.slice(5)));
   if(!(typeof item.target==='number'&&item.target>=5&&item.target<=600&&typeof item.scramble==='string'&&item.scramble.length<=180&&/^[URFDLB2' ]+$/.test(item.scramble)))throw Error('Conteúdo inválido');
   progressData().challenge=item;challengeMessage='Desafio carregado neste navegador.';
  }catch(e){challengeMessage='Código inválido: '+e.message}
 }
 saveFeatureData();return true;
}
