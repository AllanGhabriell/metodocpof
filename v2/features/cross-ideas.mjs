// Dicas progressivas para cross. O conteúdo é local e pode ser aberto sem conta.
const LEVELS=[
 {id:'basic',title:'Básico',description:'Reconheça os centros e posicione as primeiras peças de meio.',ideas:[
 {id:'recognize',title:'Encontre as quatro peças',target:1,time:'5–10 min',goal:'Reconhecer as peças da cruz rapidamente.',steps:['Escolha uma cor para a cruz, como branco.','Ache as quatro peças de meio que contêm branco.','Observe a outra cor de cada peça e localize o centro correspondente.','Repita em outros embaralhamentos até reconhecer sem hesitar.'],tip:'Uma peça de meio só está correta quando a cor da cruz e a cor lateral coincidem com os centros.'},
 {id:'first',title:'Uma peça por vez',target:1,time:'5 min',goal:'Posicionar uma peça sem desfazer as outras.',steps:['Faça um embaralhamento e encontre uma peça de meio.','Planeje como levá-la até a face inferior.','Execute com cuidado e confira o alinhamento lateral.','Tente novamente com outra peça e compare movimentos.'],tip:'Antes de girar uma face, veja se ela vai tirar uma peça já resolvida do lugar.'},
 {id:'pairs',title:'Duas peças relacionadas',target:2,time:'8 min',goal:'Planejar duas peças na mesma inspeção.',steps:['Escolha duas peças de meio como meta.','Pense em como o primeiro movimento afeta as duas.','Monte ambas sem separar completamente seu planejamento.','Compare trabalhar com peças vizinhas ou opostas.'],tip:'Não é preciso finalizar uma peça antes de começar a planejar a seguinte.'},
 {id:'unlimited',title:'Inspeção sem pressa',target:2,time:'5–10 min',goal:'Planejar antes de executar.',steps:['Desative o tempo de inspeção no timer.','Estude onde estão as peças de meio.','Mentalize uma sequência para posicioná-las.','Execute e verifique se seu plano funcionou.'],tip:'Neste exercício, a correção vale mais que a velocidade.'}
 ]},
 {id:'intermediate',title:'Intermediário',description:'Memorize mais peças, diminua pausas e melhore os movimentos.',ideas:[
 {id:'blind',title:'Execução de olhos fechados',target:2,time:'10 min',goal:'Transformar inspeção em execução por memória.',steps:['Escolha uma meta de uma ou duas peças, aumentando depois.','Embaralhe o cubo e observe a posição das peças.','Visualize mentalmente os movimentos, depois feche os olhos.','Execute sem olhar, confira o alinhamento e registre os acertos.'],tip:'Aumente para três e quatro peças apenas quando sua memória estiver consistente.'},
 {id:'bottom',title:'Cruz na face inferior',target:4,time:'8 min',goal:'Evitar virar o cubo para resolver e conferir a cruz.',steps:['Deixe a cor da cruz voltada para baixo desde o começo.','Localize as peças de meio sem virar a face da cruz para cima.','Execute seu plano mantendo a orientação.','Ao concluir, confira as cores laterais com os centros.'],tip:'Essa orientação prepara uma transição mais fluida para o F2L.'},
 {id:'inspection',title:'Inspeção progressiva',target:3,time:'10 min',goal:'Planejar mais rapidamente sem perder precisão.',steps:['Comece com 30 segundos para encontrar as peças e planejar.','Repita com 15 segundos, priorizando movimentos claros.','Teste 8 segundos quando conseguir manter a precisão.','Se cometer muitos erros, volte um passo e estabilize.'],tip:'As competições oficiais usam inspeção de menos de 15 segundos; pratique a regra separadamente.'},
 {id:'efficient',title:'Economia de movimentos',target:4,time:'10 min',goal:'Reduzir movimentos desnecessários.',steps:['Escolha um único embaralhamento e não o altere.','Resolva a cruz anotando sua sequência de movimentos.','Recomece e procure uma sequência mais curta.','Compare as soluções sem deixar de conferir o alinhamento.'],tip:'Uma cruz 3×3 pode ser resolvida em até oito movimentos em uma solução ótima, mas nem sempre essa será a mais rápida para suas mãos.'}
 ]},
 {id:'advanced',title:'Avançado',description:'Antecipe movimentos, explore cores e prepare o primeiro par de F2L.',ideas:[
 {id:'blind4',title:'Quatro peças de memória',target:4,time:'10 min',goal:'Executar toda a cruz sem precisar olhar novamente.',steps:['Embaralhe e selecione o timer de quatro peças de meio.','Inspecione por até 15 segundos.','Feche os olhos e execute o plano completo.','Registre quantas peças ficaram corretas e repita até obter consistência.'],tip:'A meta é consistência antes de acelerar.'},
 {id:'cross1',title:'Cross + previsão do primeiro F2L',target:4,time:'12 min',goal:'Saber onde ficará o primeiro par de F2L após a cruz.',steps:['Durante a inspeção, planeje a cruz inteira.','Escolha um par de F2L para acompanhar enquanto planeja.','Execute a cruz e localize imediatamente o par.','Reduza o tempo entre cruz e primeira inserção.'],tip:'Não sacrifique uma cruz confiável por tentar antecipar demais.'},
 {id:'colors',title:'Cruz em diferentes cores',target:4,time:'10 min',goal:'Treinar reconhecimento em cores alternativas.',steps:['Comece pelas duas cores opostas que você conhece melhor.','Embaralhe e escolha uma cor diferente para a cruz.','Localize as quatro peças de meio daquela cor.','Compare a facilidade das soluções; avance aos poucos para todas as cores.'],tip:'Neutralidade de cores é opcional e deve ser treinada gradualmente.'},
 {id:'lookahead',title:'Inspeção e execução sem pausas',target:4,time:'12 min',goal:'Preparar movimentos fluidos com eficiência.',steps:['Inspecione e visualize toda a sequência antes de começar.','Execute sem interrupções, mesmo que inicialmente mais devagar.','Tente reduzir rotações e mudanças de pegada.','Compare tempo e taxa de acerto, não só velocidade.'],tip:'O plano mais rápido de executar nem sempre é o que usa menos movimentos.'}
 ]}
];
let category='basic',opened=null;
function esc(v){return String(v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
function readDone(){try{return JSON.parse(localStorage.getItem('academy-cross-ideas-completed-v1')||'{}')}catch{return {}}}
let done=readDone();
function save(){try{localStorage.setItem('academy-cross-ideas-completed-v1',JSON.stringify(done))}catch{}}
export function crossIdeasPage(){
 const group=LEVELS.find(x=>x.id===category)||LEVELS[0];
 return '<section class="cross-lab-ideas" aria-label="Ideias de treino de cruz"><div class="cross-lab-ideas-intro"><span class="cross-kicker">GUIA DE TREINAMENTO</span><h2>Ideias de treino</h2><p>Exercícios progressivos para desenvolver reconhecimento, inspeção, memória e eficiência. Você pode praticar em qualquer nível.</p></div>'+
 '<div class="cross-lab-idea-tabs" role="tablist" aria-label="Dificuldade">'+LEVELS.map(x=>'<button type="button" role="tab" aria-selected="'+(category===x.id)+'" data-cross-ideas="category-'+x.id+'">'+x.title+'</button>').join('')+'</div>'+
 '<p class="cross-lab-idea-intro-text">'+group.description+'</p>'+
 '<div class="cross-lab-idea-grid">'+group.ideas.map((idea,i)=>{
 const expanded=opened===idea.id,completed=!!done[idea.id];
 return '<article class="cross-lab-idea-card"><button type="button" class="cross-lab-idea-head" data-cross-ideas="open-'+idea.id+'" aria-expanded="'+expanded+'"><div class="cross-lab-idea-num">'+String(i+1).padStart(2,'0')+'</div><div class="cross-lab-idea-title"><strong>'+esc(idea.title)+'</strong><span>'+esc(idea.goal)+'</span></div><span class="cross-lab-idea-check">'+(completed?'✓ Feito':idea.time)+'</span><span aria-hidden="true">'+(expanded?'−':'+')+'</span></button>'+
 (expanded?'<div class="cross-lab-idea-detail"><ol>'+idea.steps.map(step=>'<li>'+esc(step)+'</li>').join('')+'</ol><p class="cross-lab-idea-tip"><strong>Dica:</strong> '+esc(idea.tip)+'</p>'+
 '<div class="cross-lab-idea-actions"><button type="button" data-cross-ideas="start-'+idea.id+'">Praticar · Timer '+idea.target+'</button><button type="button" data-cross-ideas="done-'+idea.id+'">'+(completed?'Desmarcar conclusão':'Marcar como praticado')+'</button></div></div>':'')+'</article>';
 }).join('')+'</div><p class="cross-lab-help">O treino com cubo físico não é verificado automaticamente. Use o simulador para estudar movimentos ou o timer para registrar suas tentativas.</p></section>';
}
export function crossIdeasAction(button,onStart=()=>{}){
 const cmd=button?.dataset?.crossIdeas;if(!cmd)return false;
 if(cmd.startsWith('category-')){category=cmd.slice(9);opened=null;return true}
 if(cmd.startsWith('open-')){const id=cmd.slice(5);opened=opened===id?null:id;return true}
 if(cmd.startsWith('done-')){const id=cmd.slice(5);done[id]=!done[id];save();return true}
 if(cmd.startsWith('start-')){
  const id=cmd.slice(6),idea=LEVELS.flatMap(x=>x.ideas).find(x=>x.id===id);
  if(idea){onStart(idea.target);return true}
 }
 return false;
}
export function crossIdeasCount(){return LEVELS.reduce((n,g)=>n+g.ideas.length,0)}
