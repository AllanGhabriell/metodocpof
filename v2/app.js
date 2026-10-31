import {loadLibraries,libraryList,selectedLibrary,selectedLibraryName,libraryCases,chooseLibrary,libraryError,originalBaseInfo,originalCases,loadOriginalBase,deleteOriginalBase,isOriginalOwner,defaultForStage,stageDefaultInfo,setDefaultLibrary} from './cloud/libraries.mjs';
import {adminPanel,adminLoad,adminClick,adminSubmit} from './cloud/admin.mjs?v=20261030-55';
import {cloudStatus,loadAccountExtras,startActivityTracking,recordActivity,isConfigured,isAuthenticated,isAdmin,cloudUser,cloudPanel,signInWithGoogle,signIn,signUp,recoverPassword,updatePassword,signOut,syncCloud,initializeCloud,acceptAuthRedirect,markLocalChange,markDraftDeleted,cloudProfileRefresh,publishedCases,publishCase,unpublishCase,loadPublishedCases} from './cloud/cloud.mjs?v=20261030-55';
import {onlinePage,onlineInit,onlineLoad,onlineClick,onlineSubmit} from './cloud/online.mjs?v=20261030-55';
import {crossPage,crossClick,crossChange} from './features/cross.mjs';
import {awardActivity,progressDashboard,progressData,reloadProgress,saveFeatureData,planPage,profilePage,progressClick,progressSubmit,progressImport,checkReminder} from './features/progress.mjs';
import {saveAcademyGoals} from './features/academy-insights.mjs';
import {drillsPage,challengesPage,practiceClick,practiceSubmit} from './features/practice.mjs';
import {imageEditorPanel,mountEditor,imageChosen,imageChanged,imageEditorClick} from './features/editor.mjs';
import {stickerPanel,stickerClick} from './features/sticker-editor.mjs';
import {recognitionDiagram} from './cube/recognition.mjs';
import {maskCaseState,resolutionOrientation} from './cube/case-visual.mjs';
import {readPdfCases} from './data/pdf-import.mjs';
import {stats as calculateStats,formatMs,effectiveMs,removeSolve,updatePenalty} from './timer/stats.mjs';
import {reviewCase} from './cube/validation.mjs';
import {cube3D} from './cube/visual.mjs?v=20261030-8';
import {solved,apply,facelets,inverse} from './cube/engine.mjs';
const learningView=state=>apply(state,resolutionOrientation);const root=document.getElementById('root');let pdfCases=[],showSetups=false,caseFilter='f2l',activeCase=0;const sections=[['train','Treinar'],['learn','Aprender'],['profile','Meu espaço']];
const sectionItems={
train:[['train','Etapas CFOP'],['cross','Cross 2D'],['timer','Cronômetro'],['drills','Habilidades'],['challenges','Desafios']],
 learn:[['learn','Fundamentos'],['library','Biblioteca'],['sim','Simulador']],
 profile:[['profile','Conta e perfil'],['dashboard','Evolução e estatísticas'],['stats','Tempos e resultados'],['plan','Planejador']]
};
const adminItems=[['admin-users','Admin · Usuários'],['review','Admin · Casos'],['admin-libraries','Admin · Bibliotecas'],['admin-defaults','Admin · Bases principais'],['admin-base','Admin · Base original']];
const sectionFor=p=>p==='home'?'train':Object.entries(sectionItems).find(([,items])=>items.some(([id])=>id===p))?.[0]||(['review','admin-users','admin-libraries','admin-defaults','admin-base'].includes(p)?'profile':'train');
const sectionNavigation=()=>{const group=sectionFor(page),items=sectionItems[group].concat(group==='profile'&&isAdmin()?adminItems:[]);
 if((page==='train'&&!f2lMode)||page==='home'||page==='learn'||page==='profile')return '';
 const visible=group==='profile'?items.filter(([id])=>id!=='profile'):items.filter(([id])=>id!=='train');
 return '<nav class="section-navigation" aria-label="Ferramentas"><div class="section-navigation-links">'+visible.map(([id,label])=>'<button type="button" data-page="'+id+'" class="'+(page===id?'active':'')+'">'+label+'</button>').join('')+'</div></nav>'};
let trainingDifficulty='normal',trainingReveal=false,trainingSettingsOpen=false;let cloudMessage='',page=(new URLSearchParams(location.search).get('page')||'profile'),stage='F2L',f2lMode='',caseIndex=0,lesson=0,inspection=0,timerState='idle',started=0,elapsed=0,inspectionStarted=0,raf=0,scramble='',times=readLocalTimes();
function readLocalTimes(){
 try{const value=JSON.parse(localStorage.getItem('cfop-v2-times')||'[]');return Array.isArray(value)?value:[]}
 catch(err){console.warn('Histórico local indisponível. O Studio continuará funcionando.',err);return []}
}const moves=['R','L','U','D','F','B'];const suffix=['',"'",'2'];const lessons=[['Conhecendo o cubo','Identifique centros, cantos e arestas. Cada canto tem três cores e cada aresta possui duas.'],['Notação básica','U (cima), D (baixo), R (direita), L (esquerda), F (frente) e B (trás). O sentido horário é visto diretamente de frente para a face movimentada.'],['Apóstrofo e meia-volta',"R' é o movimento inverso de R. U2 é uma meia-volta de 180°."],['Rotações completas','x gira o cubo inteiro no sentido de R; y no sentido de U; z no sentido de F.'],['Movimentos largos e internos','Rw move as duas camadas da direita juntas. M, E e S movimentam camadas internas.'],['Leitura de algoritmos','Execute cada movimento em sequência. Parênteses agrupam trechos; a notação (R U R\' U\')3 indica três repetições.']];const intuitive=[['Localize as peças','Encontre o canto e a aresta que compartilham as cores do espaço escolhido.'],['Entenda o espaço','Observe os centros e identifique em qual slot o par deverá ser inserido.'],['Separe quando necessário','Se as peças estiverem conectadas incorretamente, desfaça a conexão preservando as partes resolvidas.'],['Forme o par','Experimente movimentos na camada superior para aproximar as peças com a orientação correta.'],['Insira o par','Abra temporariamente o slot, insira o par e restaure as peças que já estavam resolvidas.'],['Raciocine sozinho','Antes de girar, preveja como um movimento vai alterar o canto e a aresta.'],['Ganhe eficiência','Compare soluções, reduza rotações e pratique a observação do próximo par.']];function escapeHtml(s){return String(s).replace(/[&<>\"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]))}function makeScramble(){let out=[],prev='',axis={R:0,L:0,U:1,D:1,F:2,B:2};for(let i=0;i<20;i++){let options=moves.filter(m=>m!==prev&&axis[m]!==axis[prev]);let m=options[Math.floor(Math.random()*options.length)];out.push(m+suffix[Math.floor(Math.random()*3)]);prev=m}return out.join(' ')}function nav(p){stopDemo();if(['train','home','cross','timer','stats'].includes(p)){location.assign(p==='cross'?'cross.html':p==='timer'||p==='stats'?'scramble.html': 'index.html');return}page=p;timerState='idle';cancelAnimationFrame(raf);render()}function card(title,description,button,action){return '<article class="card"><h3>'+title+'</h3><p>'+description+'</p><button data-action="'+action+'">'+button+'</button></article>'}const cubeColors={U:'#f1f4f7',D:'#f4d448',F:'#239e63',B:'#3779d6',L:'#ef8e37',R:'#d44b47'};let cubeState=solved(),cubeHistory=[],cameraYaw=-35,cameraPitch=-27,use2D=false;
function cubeNet(state=solved()){const faces=facelets(state);let html='';for(let y=0;y<9;y++)for(let x=0;x<12;x++){let face=y<3&&x>=3&&x<6?'U':y>=3&&y<6?x<3?'L':x<6?'F':x<9?'R':'B':y>=6&&x>=3&&x<6?'D':null;let idx=face?((y<3?y:y<6?y-3:y-6)*3+(x%3)):0;const color=face?faces[face][idx]:null;html+='<span class="sticker '+(face?'':'blank')+'" style="background:'+(color?cubeColors[color]:'transparent')+'"></span>'}return '<div class="cube-net" role="img" aria-label="Representação dinâmica das seis faces do cubo">'+html+'</div>'}
const demos=[["U","R","U'","R'"],["R","U","R'","U'"],["F","R","U","R'","U'","F'"],["R","U","R'","U'"],["Rw","U","Rw'"],["R","U","R'","U'"]];
let demoIndex=0,demoRunning=false,demoHandle=null,demoBase=solved(),demoState=solved();
function stopDemo(){demoRunning=false;if(demoHandle!==null){clearTimeout(demoHandle);demoHandle=null}}
function demoMoves(){return page==='learn'?demos[0]:demos[Math.min(lesson,demos.length-1)]}
function resetDemo(){stopDemo();demoIndex=0;demoBase=solved();demoState=demoBase.slice()}
function demoNext(){const moves=demoMoves();if(demoIndex>=moves.length){demoIndex=0;demoState=demoBase.slice()}demoState=apply(demoState,moves[demoIndex++]);render()}
function demoPlay(){stopDemo();demoRunning=true;const advance=()=>{if(!demoRunning)return;const moves=demoMoves();if(demoIndex>=moves.length){stopDemo();return}demoState=apply(demoState,moves[demoIndex++]);render();demoHandle=setTimeout(advance,800)};advance()}
function lessonCube(){const moves=demoMoves();return '<div class="lesson-cube"><p class="muted">Amarelo em cima · vermelho à frente · azul à direita · branco embaixo</p><div class="cube-wrap">'+cube3D(learningView(demoState))+'</div><p class="muted" aria-live="polite">Movimento '+demoIndex+' de '+moves.length+(demoIndex?' · '+escapeHtml(moves[demoIndex-1]):'')+'</p><div class="row lesson-controls"><button data-action="demoplay">'+(demoRunning?'Reiniciar reprodução':'▶ Reproduzir')+'</button><button class="secondary" data-action="demonext">Próximo movimento</button><button class="secondary" data-action="demoreset">Reiniciar</button></div><p class="alg">'+moves.map((m,i)=>'<span class="'+(i===demoIndex-1?'current-move':'')+'">'+escapeHtml(m)+'</span>').join(' ')+'</p><button class="secondary" data-page="sim">Abrir simulador completo</button></div>'}
function simulator(){return '<div class="eyebrow">Laboratório interativo</div><h1>Simulador 3×3</h1><p class="muted">Execute movimentos e acompanhe a posição de cada peça.</p><div class="split"><section class="card"><div class="cube-wrap">'+(use2D?cubeNet(cubeState):cube3D(cubeState,{yaw:cameraYaw,pitch:cameraPitch}))+'</div><div class="row" style="justify-content:center"><button data-action="cubeundo" class="secondary">Desfazer</button><button data-action="cubereset" class="secondary">Reiniciar</button><button data-action="cubescramble">Embaralhar</button></div></section><section class="card"><h2>Movimentos</h2><div class="move-grid">'+['U','D','R','L','F','B','M','E','S','x','y','z'].map(m=>'<div class="move-set">'+[m,m+"'",m+'2'].map(v=>'<button class="move-button" data-move="'+v+'">'+v+'</button>').join('')+'</div>').join('')+'</div><label for="cube-algorithm" class="muted">Sequência de movimentos</label><div class="row"><input id="cube-algorithm" class="field" placeholder="R U R\' U\'" autocomplete="off"><button data-action="cubeapply">Executar</button></div><p id="cube-error" class="muted" role="status"></p></section></div>'}

// Espaço de revisão local: a aprovação aqui não concede privilégios de administrador.
let caseDrafts=(()=>{try{return JSON.parse(localStorage.getItem('cfop-case-drafts')||'[]')}catch{return []}})();
let draftSelection=0,reviewMessage='',showHiddenDrafts=false;
function filteredDraftIndices(){
 return caseDrafts.map((item,i)=>({item,i})).filter(({item})=>Boolean(item.hidden)===showHiddenDrafts).map(({i})=>i);
}
function selectReviewDraft(preferred=draftSelection){
 const choices=filteredDraftIndices();
 draftSelection=choices.includes(preferred)?preferred:(choices[0]??-1);
}
function persistDrafts(){localStorage.setItem('cfop-case-drafts',JSON.stringify(caseDrafts));markLocalChange()}
function draftReport(record){return reviewCase(record,{requireDiagram:true,requireExpectedState:true})}
function availableCases(stage){return libraryCases(stage)}
const stageMeta={
 f2l:{name:'F2L',subtitle:'Formação dos pares',desc:'41 situações de canto + aresta',symbol:'F'},
 oll:{name:'OLL',subtitle:'Orientação da última camada',desc:'57 padrões de orientação',symbol:'O'},
 pll:{name:'PLL',subtitle:'Permutação da última camada',desc:'21 padrões de permutação',symbol:'P'}
};
const pllCaseNames=['Ua','Ub','H','Z','Aa','Ab','E','Ra','Rb','Ja','Jb','T','F','V','Y','Na','Nb','Ga','Gb','Gc','Gd'];
const ollKnownNames=['Sune','Anti-Sune','H','Pi','T','L'];
function caseDisplayName(item){
 if(item.name)return String(item.name);
 const match=String(item.id||'').match(/^(PLL|OLL)-(\d+)$/i);
 if(!match)return '';
 const index=Number(match[2])-1;
 if(match[1].toLowerCase()==='pll')return pllCaseNames[index]||'';
 return ollKnownNames[index]||'';
}
function verifiedCase(item){return item?.reviewStatus==='verified'||item?.reviewed===true}
function trainingLanding(){
 const options=[
 ['cross','CROSS','Cruz inicial','Planeje a cruz e treine a inspeção','01'],
 ['f2l','F2L','Duas primeiras camadas','Bibliotecas publicadas · 41 casos','02'],
 ['oll','OLL','Orientação da última camada','Reconheça e oriente os casos','03'],
 ['pll','PLL','Permutação da última camada','Bibliotecas publicadas · 21 casos','04']
 ];
 return '<section class="home-hero"><div class="eyebrow">Seu espaço de speedcubing</div><h1>Domine cada etapa do <span>CFOP.</span></h1><p>Escolha uma etapa e comece a praticar. Aprenda novas ferramentas conforme evolui.</p><div class="hero-highlights"><span>◈ 4 etapas</span><span>◈ Treino interativo</span><span>◈ Seu ritmo</span></div></section>'+
 '<div class="stage-section-heading"><div><div class="eyebrow">Comece por aqui</div><h2>Escolha uma etapa</h2></div><button type="button" class="secondary" data-page="timer">Cronômetro ↗</button></div>'+
 '<div class="training-stage-grid">'+options.map(([key,title,subtitle,desc,index])=>'<button type="button" class="training-stage stage-'+key+'" data-action="'+key+'" aria-label="Abrir '+title+'"><span class="stage-top"><span class="stage-glyph" aria-hidden="true">'+title.slice(0,1)+'</span><span class="stage-number">'+index+' / 04</span></span><span class="stage-title">'+title+'</span><span class="stage-subtitle">'+subtitle+'</span><span class="stage-description">'+desc+'</span><span class="stage-enter">Explorar etapa <span aria-hidden="true">→</span></span></button>').join('')+'</div>'+
 '<section class="training-quiet-tools"><details '+(trainingSettingsOpen?'open':'')+'><summary><span>Personalizar meu treino</span><span aria-hidden="true">⌄</span></summary><p class="muted">Escolha como os algoritmos serão apresentados durante a prática.</p><div class="training-difficulty" role="group" aria-label="Dificuldade do treino">'+[['easy','Fácil','Algoritmo visível'],['normal','Normal','Revelar quando quiser'],['hard','Difícil','Tente antes de revelar']].map(([id,name,desc])=>'<button type="button" data-difficulty="'+id+'" class="'+(trainingDifficulty===id?'active':'')+'" aria-pressed="'+(trainingDifficulty===id)+'"><strong>'+name+'</strong><small>'+desc+'</small></button>').join('')+'</div></details><div class="training-quiet-links"><button type="button" data-page="drills">Habilidades</button><button type="button" data-page="challenges">Desafios</button></div></section>';
}
function f2lChoices(){
 return '<div class="eyebrow">Treinamento / F2L</div><h1>Como você quer estudar F2L?</h1><p class="muted stage-intro">Escolha entre entender a formação dos pares ou consultar os casos.</p>'+
 '<div class="training-mode-grid">'+
 '<button type="button" class="training-mode" data-action="intuitive"><span class="mode-emblem" aria-hidden="true">◎</span><span class="panel-overline">Aprendizado guiado</span><strong>F2L intuitivo</strong><span>Forme os pares com raciocínio e acompanhe os movimentos passo a passo.</span><span class="mode-cta">Começar aulas →</span></button>'+
 '<button type="button" class="training-mode" data-action="algorithms"><span class="mode-emblem" aria-hidden="true">▦</span><span class="panel-overline">Biblioteca de casos</span><strong>41 casos de F2L</strong><span>Identifique posições, consulte os algoritmos e confira os setups antes de praticar.</span><span class="mode-cta">Abrir biblioteca →</span></button>'+
 '</div><div class="mode-back"><button type="button" class="secondary" data-action="backtrain">← Voltar às etapas</button></div>';
}
function algorithmsPage(){
 const cases=availableCases(caseFilter);
 const selected=cases[Math.min(activeCase,cases.length-1)]||null;
 const stage=stageMeta[caseFilter]||stageMeta.f2l;
 let cube='';
 if(selected){
  try{const initial=learningView(apply(solved(),selected.setup||inverse(selected.algorithm)));cube=recognitionDiagram(initial,caseFilter)}
  catch{cube=recognitionDiagram(learningView(solved()),caseFilter)}
 }
 const verified=verifiedCase(selected);
 const name=selected?caseDisplayName(selected):'';
 const displayName=selected?(selected.id+(name?' — '+name:'')):'';
 const caseButtons=cases.map((c,i)=>{
  const label=caseDisplayName(c);
  return '<button class="case-select '+(i===activeCase?'selected':'')+'" data-caseindex="'+i+'" aria-pressed="'+(i===activeCase)+'"><span class="case-select-id">'+escapeHtml(c.id)+'</span>'+(label?'<span class="case-select-name">'+escapeHtml(label)+'</span>':'')+'</button>';
 }).join('');
 return '<div class="eyebrow">Treinamento / Biblioteca</div><h1>Casos de '+stage.name+'</h1><p class="muted library-intro">'+escapeHtml(stage.subtitle)+' · Escolha um caso para visualizar o diagrama e o algoritmo.</p>'+
 '<section class="card cfop-library-picker"><label for="cfop-library-choice">Biblioteca de algoritmos</label><select id="cfop-library-choice" class="field">'+
 ((caseFilter!=='oll'&&(isOriginalOwner()&&originalBaseInfo().state==='active'||defaultForStage(caseFilter)==='original'))?'<option value="original" '+(selectedLibrary(caseFilter)==='original'?'selected':'')+'>Original · '+caseFilter.toUpperCase()+'</option>':'')+
 (!libraryList().some(l=>l.is_public)?'<option value="none" selected>Nenhuma biblioteca publicada</option>':'')+
 libraryList().filter(l=>l.is_public).map(l=>'<option value="'+escapeHtml(l.id)+'" '+(selectedLibrary(caseFilter)===l.id?'selected':'')+'>'+escapeHtml(l.title)+'</option>').join('')+'</select><p class="muted">'+escapeHtml(selectedLibraryName(caseFilter))+(libraryError()?' · '+escapeHtml(libraryError()):'')+' · Offline: última versão sincronizada.</p></section>'+ 
 '<div class="training-session-bar"><div><strong>Modo '+({easy:'Fácil',normal:'Normal',hard:'Difícil'}[trainingDifficulty])+'</strong><span> · '+(activeCase+1)+' de '+cases.length+' casos</span></div><div class="row"><button type="button" class="secondary" data-action="nextcase">Pular caso →</button><button type="button" class="secondary" data-action="backtrain">Todas as etapas</button></div></div><div class="stage-switcher" role="group" aria-label="Selecionar etapa de treino">'+['f2l','oll','pll'].map(x=>'<button type="button" class="stage-switch '+(caseFilter===x?'active':'')+'" aria-pressed="'+(caseFilter===x)+'" data-casefilter="'+x+'"><span>'+x.toUpperCase()+'</span><span class="stage-switch-count">'+availableCases(x).length+'</span></button>').join('')+'</div>'+
 '<div class="library-layout"><section class="card case-list-panel"><div class="case-list-heading"><div><span class="panel-overline">Biblioteca</span><h2>Selecionar caso</h2></div><span class="case-count">'+cases.length+' casos</span></div><div class="case-grid">'+caseButtons+'</div></section>'+
 '<section class="card case-detail-panel">'+(selected?
 '<div class="case-detail-top"><div><span class="panel-overline">Caso selecionado</span><h2>'+escapeHtml(displayName)+'</h2></div><span class="review-status '+((verified||selected.libraryApproved)?'verified':'pending')+'">'+(verified?'Validado':selected.libraryApproved?'Aprovado pelo editor':'Aguardando conferência')+'</span></div>'+
 '<div class="case-diagram-box">'+((verified||selected.libraryApproved)&&selected.imageData&&/^data:image\/(png|jpeg|webp);base64,/.test(selected.imageData)?'<div class="cube-wrap"><img class="case-reference-image" alt="Referência validada do caso" src="'+selected.imageData+'"></div>':verified?'<div class="cube-wrap">'+cube+'</div>':'<div class="case-unverified"><span aria-hidden="true">◇</span><strong>Diagrama aguardando validação</strong><p>Esse caso será exibido após a conferência com o PDF.</p></div>')+'</div>'+
 '<div class="case-algorithm-block"><div class="case-field-title">Algoritmo de resolução</div>'+(trainingDifficulty==='easy'||trainingReveal?'<p class="case-alg">'+escapeHtml(selected.algorithm)+'</p>':'<div class="training-hidden-alg"><p>'+(trainingDifficulty==='hard'?'Tente resolver antes de consultar o algoritmo.':'Reconheça o caso e revele o algoritmo quando precisar.')+'</p><button type="button" data-action="revealalgorithm">Revelar algoritmo</button></div>')+'</div>'+
 '<div class="setup-panel"><button type="button" class="setup-toggle" data-action="togglesetup" aria-expanded="'+showSetups+'"><span class="setup-toggle-copy"><span class="setup-toggle-label">Configuração inicial</span><strong>'+(showSetups?'Ocultar setup':'Mostrar setup do caso')+'</strong></span><span class="setup-chevron" aria-hidden="true">'+(showSetups?'⌃':'⌄')+'</span></button>'+
 (showSetups?'<div class="setup-panel-content"><p class="case-alg">'+escapeHtml(selected.setup||'Setup não informado')+'</p></div>':'')+'</div>'+
 (!verified?'<p class="case-validation-note">Diagrama, algoritmo e setup são provisórios até a conferência deste caso com o PDF. A prática fica disponível após a validação.</p>':'')+
 '<div class="row case-detail-actions"><button data-action="casepractice" '+(!verified?'disabled title="Valide este caso antes de praticar"':'')+'>Praticar no simulador</button><button class="secondary" data-action="casereview">Revisar este caso</button></div>'
  :'<p>Nenhum caso publicado nesta etapa. Escolha uma biblioteca disponibilizada pelo administrador.</p>')+'</section></div>';
}

function reviewPage(){
 if(!isAdmin())return '<div class="eyebrow">Administração</div><h1>Acesso restrito</h1><section class="card"><p>O editor de casos é reservado aos administradores autorizados no banco de dados. Configure o Supabase e entre com uma conta autorizada.</p><button data-page="profile">Abrir conexão e conta</button></section>';
 selectReviewDraft();
 const indices=filteredDraftIndices();
 const visibleCount=caseDrafts.filter(d=>!d.hidden).length;
 const hiddenCount=caseDrafts.length-visibleCount;
 const d=caseDrafts[draftSelection]||null;
 const result=d?draftReport(d):null;
 return '<div class="eyebrow">Conferência de casos</div><h1>Área de revisão</h1><p class="muted">Área exclusiva de administradores autorizados pelo banco. Casos só podem ser publicados depois da validação matemática e da aprovação manual.</p>'+
 '<div class="split"><section class="card"><div class="row between"><h2>Casos</h2><button data-action="draftnew">Novo caso</button></div>'+
 '<div class="row review-filters" role="group" aria-label="Filtrar casos da revisão"><button class="'+(!showHiddenDrafts?'':'secondary')+'" data-action="draftshowvisible" aria-pressed="'+(!showHiddenDrafts)+'">Visíveis ('+visibleCount+')</button><button class="'+(showHiddenDrafts?'':'secondary')+'" data-action="draftshowhidden" aria-pressed="'+showHiddenDrafts+'">Ocultos ('+hiddenCount+')</button></div>'+
 (indices.length?indices.map(i=>{const item=caseDrafts[i];return '<button class="draft-item '+(i===draftSelection?'selected':'')+'" data-draft="'+i+'">'+escapeHtml(item.id)+' · '+escapeHtml(item.stage.toUpperCase())+'</button>'}).join(''):'<p class="muted">'+(showHiddenDrafts?'Nenhum caso oculto.':'Nenhum caso visível. Crie ou restaure um caso.')+'</p>')+
 '<div class="row"><a class="secondary" href="importer.html">Importador inteligente de imagens e PDFs</a><button class="secondary" data-action="pdfimport">Importar PDF (texto)</button><button class="secondary" data-action="loadpdfcases">Carregar base privada</button><button class="secondary" data-action="draftimport">Importar JSON</button><button class="secondary" data-action="draftexport">Exportar JSON</button></div><input id="draftfile" type="file" accept="application/json,.json" hidden><input id="pdffile" type="file" accept="application/pdf,.pdf" hidden></section>'+
 '<section class="card">'+(d?'<h2>Editar caso</h2><form id="draftform"><label>Identificação<input class="field" name="id" required value="'+escapeHtml(d.id)+'"></label><label>Nome do caso<input class="field" name="name" maxlength="90" value="'+escapeHtml(d.name||'')+'" placeholder="Ex.: Ua, Sune"></label><label>Etapa<select class="field" name="stage">'+['f2l','oll','pll','cross'].map(x=>'<option value="'+x+'" '+(x===d.stage?'selected':'')+'>'+x.toUpperCase()+'</option>').join('')+'</select></label><label>Algoritmo<input class="field" name="algorithm" required value="'+escapeHtml(d.algorithm)+'"></label><label>Setup<input class="field" name="setup" value="'+escapeHtml(d.setup)+'"></label><label>Diagrama (JSON, faces e adesivos)<textarea class="field" name="diagram" rows="3" placeholder=\'{"U":["U","?","?","?","U","?","?","?","U"]}\'>'+escapeHtml(d.diagram?JSON.stringify(d.diagram):'')+'</textarea></label><label>Estado de referência (JSON com 54 adesivos)<textarea class="field" name="expectedState" rows="3">'+escapeHtml(d.expectedState?JSON.stringify(d.expectedState):'')+'</textarea></label><div class="row"><button type="submit">Salvar e verificar</button><button type="button" class="secondary" data-action="drafthide">'+(d.hidden?'Restaurar':'Ocultar')+'</button><button type="button" class="secondary" data-action="draftdelete">Excluir</button></div></form>'+stickerPanel(d)+imageEditorPanel(d)+'<h2>Resultado</h2>'+result.checks.map(c=>'<p class="check-result '+(c.valid?'ok':'fail')+'">'+(c.valid?'✓':'×')+' '+escapeHtml(c.name.replaceAll('_',' '))+(c.valid?'':' · '+escapeHtml(c.details?.message||'Não corresponde'))+'</p>').join('')+'<p class="muted">'+(result.automaticPassed?'Verificações aprovadas.':'Existem verificações pendentes.')+'</p><label class="review-check"><input type="checkbox" id="reviewapprove" '+(d.review?.approved?'checked':'')+' '+(!result.automaticPassed?'disabled':'')+'> Conferi pessoalmente este caso e aprovo o resultado</label><p class="muted">'+(result.publicationReady?'Caso aprovado para publicação.':'Aguardando todas as verificações e sua aprovação.')+'</p><div class="row admin-publish-actions"><button type="button" data-action="publishcase" '+(!result.publicationReady?'disabled':'')+'>Publicar caso validado</button>'+(publishedCases().some(c=>c.id===d.id)?'<button type="button" class="secondary" data-action="unpublishcase">Retirar da biblioteca pública</button>':'')+'</div>':'<p>Selecione ou crie um caso.</p>')+'</section></div>'+
 '<section class="card admin-published-library"><div class="row between"><div><h2>Casos publicados</h2><p class="muted">Biblioteca disponível aos alunos. Para alterar um caso, carregue uma cópia como rascunho, valide e publique novamente.</p></div><span class="admin-library-count">'+publishedCases().length+' publicados</span></div>'+
 (publishedCases().length?'<div class="admin-published-grid">'+publishedCases().map(c=>'<article class="admin-published-case"><div><strong>'+escapeHtml(c.id)+'</strong><small>'+escapeHtml(c.stage.toUpperCase())+' · '+escapeHtml(c.name||'Sem nome')+'</small></div><div class="row"><button type="button" data-action="publishededit" data-published-id="'+escapeHtml(c.id)+'">Editar</button><button type="button" class="secondary" data-action="publishedremove" data-published-id="'+escapeHtml(c.id)+'">Retirar</button></div></article>').join('')+'</div>':'<p class="muted">Nenhum caso publicado no Supabase.</p>')+'</section>'+
 '<p id="review-message" role="status">'+escapeHtml(reviewMessage)+'</p>';
}
function downloadDrafts(){const blob=new Blob([JSON.stringify({format:'cfop-studio-drafts-v1',cases:caseDrafts},null,2)],{type:'application/json'});const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download='cfop-casos-revisao.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000)}

function stageDefaultsPage(){
 if(!isOriginalOwner())return '<section class="card"><h1>Acesso restrito</h1></section>';
 const current=stageDefaultInfo();
 return '<section class="card admin-stage-defaults"><span class="admin-publish-eyebrow">CONFIGURAÇÃO GLOBAL</span>'+
 '<h1>Biblioteca principal de cada etapa</h1>'+
 '<p>É esta biblioteca que todos verão automaticamente ao abrir um treino. Os alunos ainda podem selecionar outras bibliotecas publicadas. F2L e PLL também permitem escolher a Original. OLL não possui base original.</p>'+
 '<div class="admin-default-cards">'+['f2l','oll','pll'].map(stage=>{
   const entry=current[stage],target=entry?.source==='library'?entry.library_id:entry?.source||'none';
   const opts=[{id:'none',name:'Nenhuma biblioteca (ainda não publicada)'}]
    .concat(stage!=='oll'&&originalBaseInfo().state!=='deleted'?[{id:'original',name:'Original · '+stage.toUpperCase()}]:[])
    .concat(libraryList().filter(l=>l.is_public).map(l=>({id:l.id,name:l.title})));
   return '<article><div><strong>'+stage.toUpperCase()+'</strong><small>'+({f2l:'41 casos · duas primeiras camadas',oll:'57 casos · última camada',pll:'21 casos · permutações'}[stage])+'</small></div>'+
     '<label for="admin-default-'+stage+'">Principal para todos</label>'+
     '<select id="admin-default-'+stage+'" data-default-stage="'+stage+'">'+
       opts.map(o=>'<option value="'+escapeHtml(o.id)+'" '+(target===o.id?'selected':'')+'>'+escapeHtml(o.name)+'</option>').join('')+
     '</select><button data-action="admin-save-default" data-stage="'+stage+'">Salvar padrão de '+stage.toUpperCase()+'</button></article>';
  }).join('')+'</div>'+
 '<p class="muted">A escolha é armazenada no Supabase e vale para visitantes novos ou ao iniciar uma nova sessão. Para selecionar uma biblioteca personalizada, publique antes os casos aprovados desta etapa.</p>'+
 (cloudMessage?'<p role="status" class="notice">'+escapeHtml(cloudMessage)+'</p>':'')+'</section>';
}
function privateOriginalPage(){
 if(!isOriginalOwner())return '<section class="card"><h1>Acesso restrito</h1></section>';
 const info=originalBaseInfo();
 if(info.state==='deleted')return '<section class="card"><h1>Base original excluída</h1><p>O sistema não usa mais a referência antiga. Suas bibliotecas publicadas permanecem intactas.</p></section>';
 const ready=info.state==='active';
 return '<section class="card admin-private-original"><span class="admin-publish-eyebrow">SOMENTE O ADMINISTRADOR FUNDADOR</span><h1>Base original privada</h1>'+
 '<p>A referência antiga não é uma biblioteca pública. Apenas você pode consultá-la ou excluí-la.</p>'+
 (ready?'<p class="muted">F2L: '+originalCases('f2l').length+' · OLL: '+originalCases('oll').length+' · PLL: '+originalCases('pll').length+'</p>':
 '<p class="muted">'+escapeHtml(info.error||'Carregando referência original…')+'</p>')+
 '<div class="row"><button data-action="original-open" '+(!ready?'disabled':'')+'>Visualizar base</button>'+
 '<button class="secondary" data-action="original-export" '+(!ready?'disabled':'')+'>Exportar cópia JSON</button>'+
 '<button class="secondary" data-action="original-refresh">Atualizar</button></div>'+
 (ready?'<div class="admin-original-preview">'+['f2l','oll','pll'].map(stage=>'<details><summary>'+stage.toUpperCase()+' · '+originalCases(stage).length+' casos</summary><div class="admin-original-list">'+
 originalCases(stage).map(c=>'<div><strong>'+escapeHtml(c.id)+'</strong><code>'+escapeHtml(c.algorithm||'Sem algoritmo')+'</code></div>').join('')+
 '</div></details>').join('')+'</div>':'')+
 '<hr><h2>Excluir base original</h2><p class="muted">Exclui a referência armazenada no Supabase e impede que o aplicativo volte a usá-la. As bibliotecas públicas não são apagadas. Arquivos históricos ainda podem existir no GitHub.</p>'+
 '<button class="admin-original-delete" data-action="original-delete" '+(!ready?'disabled':'')+'>Excluir base original definitivamente</button></section>';
}
function content(){if(page==='dashboard')return progressDashboard()+'<section class="card original-progress-tools"><h2>Mais ferramentas</h2><div class="profile-destination-grid"><button type="button" data-action="open-scramble-history"><strong>Estatísticas de tempos</strong><span>Histórico, médias e evolução →</span></button><button type="button" data-page="plan"><strong>Plano de treino</strong><span>Metas e lembretes →</span></button><button type="button" data-page="challenges"><strong>Desafios</strong><span>Atividades e conquistas →</span></button></div></section>';if(page==='cross')return crossPage();if(page==='srs')return '<section class="academy-learning-hero"><span class="academy-overline">MEMÓRIA DE EXECUÇÃO</span><h1>Revisão espaçada sem flashcards.</h1><p>Revisite casos por meio da execução real no cubo. O aplicativo sugere os casos no momento certo, sem criar uma lista de tarefas atrasadas.</p><div class="academy-learning-chips"><a href="f2l.html?mode=review">Revisar F2L →</a><a href="oll.html?mode=review">Revisar OLL →</a><a href="pll.html?mode=review">Revisar PLL →</a></div></section>';if(page==='drills')return drillsPage();if(page==='plan')return planPage();if(page==='challenges')return isAuthenticated()?onlinePage():challengesPage()+'<p class="notice">Para desafios compartilhados na nuvem, entre na sua conta em Perfil.</p>';if(page==='profile')return (isAuthenticated()?profilePage()+cloudPanel():cloudPanel()+profilePage())+'<section class="profile-destinations"><h2>Meu desempenho</h2><div class="profile-destination-grid"><button data-page="dashboard"><strong>Evolução</strong><span>XP, níveis, progresso e metas →</span></button><button data-action="open-scramble-history"><strong>Meus tempos</strong><span>Histórico e estatísticas do cronômetro →</span></button><button data-page="plan"><strong>Planejamento</strong><span>Objetivos e lembretes →</span></button><button data-page="challenges"><strong>Desafios</strong><span>Metas e atividades →</span></button><button data-page="drills"><strong>Habilidades</strong><span>Lookahead e fingertricks →</span></button></div></section>'+(isAdmin()?'<section class="card admin-publish-home"><div><span class="admin-publish-eyebrow">PAINEL DO ADMINISTRADOR</span><h2>Publicar casos e bibliotecas</h2><p>Envie um PDF, revise os diagramas e aprove os algoritmos antes de publicar para todos.</p></div><div class="admin-primary-actions"><a class="admin-publish-primary" href="importer.html">+ Importar PDF e publicar</a><button class="secondary" data-page="admin-defaults">Configurar bases principais</button></div></section><section class="card profile-admin-hub"><details open><summary><strong>Outras ferramentas administrativas</strong><span>Gerenciar contas e conteúdo ⌄</span></summary><div class="profile-destination-grid"><button data-page="admin-users"><strong>Usuários</strong><span>Contas e permissões →</span></button><button data-page="review"><strong>Revisão de casos</strong><span>Validação e publicação →</span></button><button data-page="admin-libraries"><strong>Bibliotecas</strong><span>Importar PDFs e publicar versões →</span></button><button data-page="admin-defaults"><strong>Bases principais</strong><span>Escolher o F2L, OLL e PLL que abrem para todos →</span></button><button data-page="admin-base"><strong>Base original (privada)</strong><span>Visualizar, exportar ou excluir a referência →</span></button></div></details></section>':'')+(cloudMessage?'<p class="notice" role="status">'+escapeHtml(cloudMessage)+'</p>':'');if(page==='more')return '<div class="eyebrow">Navegação</div><h1>Mais ferramentas</h1><div class="grid">'+[['learn','Aprender'],['cross','Treinador Cross 2D'],['srs','Revisão espaçada'],['drills','Habilidades'],['plan','Planejador'],['challenges','Desafios'],['library','Biblioteca'],['stats','Estatísticas'],['sim','Simulador'],['profile','Conta e perfil']].concat(isAdmin()?[['review','Admin · Casos'],['admin-users','Admin · Usuários']]:[]).map(([id,name])=>'<button type="button" class="studio-navigation-tile" data-page="'+id+'">'+name+' →</button>').join('')+'</div>';if(page==='admin-users')return isAdmin()?adminPanel():'<h2>Acesso restrito</h2>';if(page==='review')return isAdmin()?reviewPage():'<h2>Acesso restrito</h2>';if(page==='admin-defaults')return stageDefaultsPage();if(page==='admin-base')return privateOriginalPage();if(page==='admin-libraries')return isAdmin()?'<section class="card admin-publish-home"><div><span class="admin-publish-eyebrow">BIBLIOTECAS</span><h1>Publicar casos</h1><p>Escolha a biblioteca, envie um PDF e revise cada caso. Os casos aprovados só entram no treino depois de publicar.</p></div><a class="admin-publish-primary" href="importer.html">+ Adicionar PDF ou editar biblioteca</a></section>':'<h2>Acesso restrito</h2>';if(page==='sim')return simulator();if(page==='home')return trainingLanding();if(page==='learn')return '<section class="academy-learning-hero"><span class="academy-overline">APRENDER · ACADEMIA CPOF</span><h1>Aprenda a entender cada movimento.</h1><p>Construa a base do seu CFOP com explicações objetivas, treino visual e exercícios práticos.</p><div class="academy-learning-chips"><a href="f2l.html">Treinar F2L →</a><a href="oll.html">Treinar OLL →</a><a href="pll.html">Treinar PLL →</a></div></section>'+
'<div class="academy-learning-layout"><section class="academy-insight-card academy-learning-foundations"><header><div><span class="academy-overline">FUNDAMENTOS</span><h2>Comece pelo raciocínio</h2></div></header><div class="academy-learning-steps">'+lessons.map((l,i)=>'<article><span class="academy-learning-step-number">'+String(i+1).padStart(2,'0')+'</span><div><strong>'+escapeHtml(l[0])+'</strong><p>'+escapeHtml(l[1])+'</p></div></article>').join('')+'</div></section>'+
'<section class="academy-insight-card academy-learning-preview"><header><div><span class="academy-overline">LABORATÓRIO INTERATIVO</span><h2>Cubo 3D · movimentos</h2></div></header><p>Veja o movimento acontecer no cubo antes de praticar.</p>'+lessonCube()+'</section></div>';if(page==='train'&&!f2lMode)return trainingLanding();if(page==='train'&&f2lMode==='cross')return crossPage();if(page==='train'&&f2lMode==='choose')return f2lChoices();if(page==='train'&&f2lMode==='intuitive')return '<div class="eyebrow">F2L / Intuitivo</div><h1>Aprenda a raciocinar</h1><div class="split"><section class="card"><div class="row between"><span class="tag">Lição '+(lesson+1)+' de '+intuitive.length+'</span><button class="secondary" data-action="backf2l">Voltar</button></div><div class="academy-progress" aria-label="Lições concluídas">'+intuitive.map((_,i)=>'<span class="'+((progressData().completedLessons||[]).includes(i)?'completed':i===lesson?'current':'')+'" title="Lição '+(i+1)+'"></span>').join('')+'</div><h2 style="margin-top:18px">'+intuitive[lesson][0]+'</h2><p>'+intuitive[lesson][1]+'</p><div class="row"><button data-action="prevlesson">Anterior</button><button data-action="nextlesson">Próxima lição</button><button data-action="lessoncomplete">Concluir lição</button></div></section><section class="card"><h2>Referência visual</h2><div class="cube-wrap">'+lessonCube()+'</div></section></div>';if(page==='train')return algorithmsPage();if(page==='library')return algorithmsPage();if(page==='stats'){const summary=calculateStats(times);return '<div class="eyebrow">Seu desempenho</div><h1>Estatísticas</h1>'+statsCards(summary)+'<section class="card" style="margin-top:16px"><div class="row between"><h2>Histórico completo</h2><button class="secondary" data-action="clearhistory">Limpar histórico</button></div>'+historyTable()+'</section>'}return '<div class="eyebrow">Speedcubing</div><h1>Cronômetro 3×3</h1><div class="split"><section class="card"><div class="row between"><span class="tag">Branco em cima · verde na frente</span><button class="secondary" data-action="newscramble">Novo scramble</button></div><p class="scramble">'+escapeHtml(scramble)+'</p><div class="cube-wrap">'+cube3D(apply(solved(),scramble),{size:144})+'</div><div class="timer" id="clock">0.00</div><p id="timer-help" class="muted" style="text-align:center">Clique em Iniciar ou pressione espaço.</p><div class="row" style="justify-content:center"><button data-action="timerstart" id="timer-button">Iniciar</button><button class="secondary" data-action="inspectionstart">Inspecionar</button><button class="secondary" data-action="dnf">Registrar DNF</button></div><p><label for="inspection">Tempo de inspeção: </label><select class="field" id="inspection"><option value="0" '+(inspection===0?'selected':'')+'>Sem inspeção</option><option value="15" '+(inspection===15?'selected':'')+'>15 segundos</option><option value="30" '+(inspection===30?'selected':'')+'>30 segundos</option><option value="60" '+(inspection===60?'selected':'')+'>60 segundos</option></select></p></section><section class="card"><h2>Resumo</h2>'+statsCards(calculateStats(times))+'<div class="row between" style="margin-top:20px"><h2>Últimos tempos</h2><button class="secondary" data-page="stats">Ver todos</button></div>'+historyTable(6)+'</section></div>'}function statsCards(summary){return '<div class="stat-grid">'+[['Resoluções',String(summary.total)],['Melhor',summary.best===null?'—':formatMs(summary.best)],['Média',summary.mean===null?'—':formatMs(summary.mean)],['ao5',summary.ao5===null?'—':formatMs(summary.ao5)],['ao12',summary.ao12===null?'—':formatMs(summary.ao12)],['DNFs',String(summary.dnf)]].map(([name,value])=>'<div class="stat-tile"><span>'+name+'</span><strong>'+value+'</strong></div>').join('')+'</div>'}
function historyTable(limit=Infinity){if(!times.length)return '<p class="muted">Nenhuma resolução registrada.</p>';return '<div class="history-list">'+times.map((t,index)=>({t,index})).slice(-limit).reverse().map(({t,index})=>'<article class="history-entry"><div><strong>'+(effectiveMs(t)===null?'DNF':formatMs(effectiveMs(t)))+(t.penalty==='+2'?' (+2)':'')+'</strong><div class="muted history-date">'+(t.date?new Date(t.date).toLocaleString('pt-BR'):'Sem data')+'</div><details><summary>Ver embaralhamento</summary><p class="alg">'+escapeHtml(t.scramble||'')+'</p></details></div><div class="row"><select class="field penalty-select" data-penalty="'+index+'" aria-label="Penalidade do tempo '+(index+1)+'"><option value="OK" '+(!t.penalty||t.penalty==='OK'?'selected':'')+'>OK</option><option value="+2" '+(t.penalty==='+2'?'selected':'')+'>+2</option><option value="DNF" '+(t.penalty==='DNF'||t.ms===null?'selected':'')+'>DNF</option></select><button class="secondary" data-deletesolve="'+index+'" aria-label="Excluir tempo '+(index+1)+'">Excluir</button></div></article>').join('')+'</div>'}
function saveTimes(){localStorage.setItem('cfop-v2-times',JSON.stringify(times));markLocalChange()}
function fmt(ms){return (ms/1000).toFixed(2)}function accountHeader(){const user=cloudUser(),email=user?.email||'',initial=email?email.charAt(0).toUpperCase():'?';return '<button type="button" class="header-profile" data-page="profile" aria-label="'+(email?'Abrir perfil de '+escapeHtml(email):'Entrar ou criar conta')+'"><span class="header-avatar" aria-hidden="true">'+(email?escapeHtml(initial):'👤')+'</span><span class="header-profile-text"><strong>'+(email?escapeHtml(email.split('@')[0]):'Entrar / Criar conta')+'</strong><small>'+(email?'Meu perfil':'Sua conta')+'</small></span><span class="header-profile-chevron" aria-hidden="true">›</span></button>'}
function render(){
 const title=page==='drills'?'Habilidades':page==='challenges'?'Desafios':page==='profile'?'Conta e perfil':page==='dashboard'?'Evolução':page==='learn'?'Aprender':page==='library'?'Biblioteca':page==='sim'?'Simulador':page==='admin-users'||page==='review'||page==='admin-base'||page==='admin-defaults'?'Administração':page==='plan'?'Planejamento':page==='stats'?'Estatísticas':'Ferramentas';
 const links=[['learn','Aprender'],['dashboard','Evolução'],['profile','Conta e perfil']];
 const adminLink=isAdmin()?'<a href="importer.html" class="studio-admin-publish" aria-label="Abrir publicação de casos por PDF">+ Publicar casos</a><button type="button" data-page="admin-users" class="original-admin-button" aria-label="Abrir painel de administração">Administração</button>':'';
 const tools=page==='learn'?[['library','Biblioteca'],['sim','Simulador'],['drills','Habilidades']]:page==='profile'?[['dashboard','Evolução'],['plan','Planejamento'],['challenges','Desafios']]:page==='dashboard'?[['plan','Planejamento'],['challenges','Desafios']]:[];
 const sectionsLabel={learn:'Aprendizado',dashboard:'Progresso',profile:'Meu espaço'};
 let pageMarkup='';
 try{pageMarkup=content()}
 catch(err){
  console.error('Não foi possível renderizar a seção '+page,err);
  pageMarkup='<section class="academy-view-error" role="alert"><span class="academy-error-symbol" aria-hidden="true">!</span><h1>Esta seção não abriu corretamente</h1><p>As outras áreas continuam disponíveis. Tente novamente ou retorne ao seu perfil.</p><div class="academy-load-actions"><button type="button" data-action="reload-view">Tentar novamente</button><button type="button" data-page="profile" class="secondary">Ir ao perfil</button></div></section>';
 }
 root.innerHTML='<div class="original-studio"><header class="original-studio-header"><a href="index.html" class="original-back" aria-label="Voltar à página inicial">←</a><a href="index.html" class="studio-brand-mark" aria-label="Academia CPOF, página inicial">Academia <span class="studio-brand-letters"><i>C</i><i>P</i><i>O</i><i>F</i></span></a><div class="studio-page-identity"><small>'+escapeHtml(sectionsLabel[page]||'Ferramentas')+'</small><strong>'+title+'</strong></div><div class="studio-header-actions">'+adminLink+accountHeader()+'</div></header>'+
 '<nav class="original-studio-nav" aria-label="Navegação da Academia CPOF">'+links.map(([id,label])=>'<button type="button" data-page="'+id+'" class="'+(page===id?'active':'')+'" aria-current="'+(page===id?'page':'false')+'">'+label+'</button>').join('')+'</nav>'+
 '<main class="original-studio-content">'+(tools.length?'<nav class="original-studio-subnav" aria-label="Ferramentas relacionadas">'+tools.map(([id,label])=>'<button type="button" data-page="'+id+'">'+label+'</button>').join('')+'</nav>':'')+pageMarkup+'<footer class="original-studio-footer">Academia CPOF · Desenvolvido por Allan Ghabriell</footer></main></div>';
 window.dispatchEvent(new Event('cfop:ready'));
 if(page==='review'&&caseDrafts[draftSelection])mountEditor(caseDrafts[draftSelection]);
}
function tick(){cancelAnimationFrame(raf);let clock=document.getElementById('clock'),help=document.getElementById('timer-help'),button=document.getElementById('timer-button');if(!clock)return;if(timerState==='inspection'){let remaining=inspection-(performance.now()-inspectionStarted)/1000;clock.textContent=Math.max(0,remaining).toFixed(1);help.textContent='Inspeção — clique em Iniciar agora ou pressione espaço';button.textContent='Iniciar agora';if(remaining<=0){timerState='running';started=performance.now()}}else if(timerState==='running'){clock.textContent=fmt(performance.now()-started);help.textContent='Clique em Parar ou pressione espaço';button.textContent='Parar'}if(timerState!=='idle')raf=requestAnimationFrame(tick)}function timerAction(){if(timerState==='idle'){timerState='running';started=performance.now();tick()}else if(timerState==='inspection'){timerState='running';started=performance.now();tick()}else{let ms=performance.now()-started;times.push({ms,scramble,date:new Date().toISOString()});saveTimes();recordActivity(0,false,1);awardActivity('Cronômetro',20);timerState='idle';scramble=makeScramble();render()}}root.addEventListener('click',e=>{let b=e.target.closest('button');if(!b)return;if(b.dataset.page){stopDemo();f2lMode='';nav(b.dataset.page);if(b.dataset.page==='challenges'&&isAuthenticated())onlineLoad().catch(()=>{});if(b.dataset.page==='admin-users'&&isAdmin())adminLoad().then(()=>render());if(b.dataset.page==='admin-base'&&isOriginalOwner())loadOriginalBase().then(()=>render());if(b.dataset.page==='admin-defaults'&&isOriginalOwner())Promise.all([loadOriginalBase(),loadLibraries()]).then(()=>render());if(b.dataset.page==='profile'&&isAuthenticated())loadAccountExtras().then(()=>render());return}
if(b.dataset.action==='reload-view'){render();return}
if(b.dataset.action==='academy-save-goals'){
  const result=saveAcademyGoals({
    goalPeriod:root.querySelector('#academy-goal-period')?.value,
    dailyGoal:Number(root.querySelector('#academy-daily-goal')?.value),
    weeklyGoal:Number(root.querySelector('#academy-weekly-goal')?.value)
  });
  if(!result){alert('Não foi possível guardar as metas neste navegador.');return}
  render();return;
}
if(b.dataset.action==='open-scramble-history'){location.assign('scramble.html?view=stats');return}if(b.dataset.cloud){handleCloudClick(b.dataset.cloud);return}if(b.dataset.admin||b.dataset.adminUser){adminClick(b).then(changed=>{if(changed)render()}).catch(err=>{cloudMessage=err.message;alert(err.message)});return}
if(b.dataset.stickerColor||b.dataset.stickerFace||b.dataset.stickerTool){if(isAdmin())stickerClick(b);return}
if(b.dataset.online||b.dataset.onlineId){onlineClick(b).then(()=>render());return}
if(b.dataset.cross||b.dataset.crossmove){if(crossClick(b,awardActivity))render();return}
if(b.dataset.grade||b.dataset.practice){if(practiceClick(b))render();return}
if(b.dataset.progress){if(progressClick(b))render();return}
if(b.dataset.editor){const draft=caseDrafts[draftSelection];if(isAdmin()&&draft&&imageEditorClick(b,draft,()=>{draft.updatedAt=Date.now();persistDrafts()})&&['save','clear'].includes(b.dataset.editor))render();return}if(b.dataset.casefilter){caseFilter=b.dataset.casefilter;activeCase=0;trainingReveal=false;showSetups=false;render();return}if(b.dataset.caseindex!==undefined){activeCase=Number(b.dataset.caseindex);showSetups=false;trainingReveal=false;render();return}if(b.dataset.difficulty){trainingSettingsOpen=true;trainingDifficulty=['easy','normal','hard'].includes(b.dataset.difficulty)?b.dataset.difficulty:'normal';trainingReveal=false;render();return}if(b.dataset.deletesolve!==undefined){const index=Number(b.dataset.deletesolve);if(confirm('Excluir esta resolução do histórico?')){times=removeSolve(times,index);saveTimes();render()}return}if(b.dataset.draft!==undefined){draftSelection=Number(b.dataset.draft);reviewMessage='';render();return}if(b.dataset.move){cubeHistory.push(cubeState.slice());cubeState=apply(cubeState,b.dataset.move);render();return}switch(b.dataset.action){
case'admin-save-default':{
 if(!isOriginalOwner())break;
 const stage=b.dataset.stage,value=root.querySelector('select[data-default-stage="'+stage+'"]')?.value;
 if(!['f2l','oll','pll'].includes(stage)||!value)break;
 b.disabled=true;cloudMessage='Salvando a biblioteca principal de '+stage.toUpperCase()+'…';
 (async()=>{
  try{
   if(value==='original')await loadOriginalBase();
   await setDefaultLibrary(stage,value);
   cloudMessage='Biblioteca principal de '+stage.toUpperCase()+' atualizada para todos.';
  }catch(e){cloudMessage='Não foi possível salvar: '+e.message}
  render()
 })();
 break;
}
case'original-refresh':loadOriginalBase().then(()=>render());break;
case'original-open':chooseLibrary('original','f2l').then(()=>{page='library';caseFilter='f2l';activeCase=0;render()}).catch(e=>{cloudMessage=e.message;render()});break;
case'original-export':{
 if(!isOriginalOwner()||originalBaseInfo().state!=='active')break;
 const data={format:'cfop-original-private-backup-v1',cases:['f2l','oll','pll'].flatMap(originalCases)};
 const url=URL.createObjectURL(new Blob([JSON.stringify(data,null,2)],{type:'application/json'}));
 const anchor=document.createElement('a');anchor.href=url;anchor.download='base-original-privada.json';anchor.click();
 setTimeout(()=>URL.revokeObjectURL(url),1000);break;
}
case'original-delete':{
 if(!isOriginalOwner()||originalBaseInfo().state!=='active')break;
 if(!confirm('Excluir a base original? As bibliotecas publicadas não serão apagadas.'))break;
 if(prompt('Para confirmar, digite EXCLUIR:')!=='EXCLUIR')break;
 deleteOriginalBase().then(()=>{cloudMessage='Base original excluída do sistema.';render()}).catch(e=>{cloudMessage=e.message;render()});
 break;
}
case'demoplay':if(demoRunning){resetDemo();render()}else demoPlay();break;case'demonext':stopDemo();demoNext();break;case'demoreset':resetDemo();render();break;case'learn':nav('learn');break;case'sim':nav('sim');break;case'pdfimport':document.getElementById('pdffile')?.click();break;case'loadpdfcases':{const have=new Set(caseDrafts.map(c=>c.stage+':'+c.id));const missing=['f2l','oll','pll'].flatMap(originalCases).filter(c=>!have.has(c.stage+':'+c.id)).map(c=>({...c,diagram:null,expectedState:null,review:{approved:false}}));caseDrafts=[...caseDrafts,...missing];showHiddenDrafts=false;selectReviewDraft();persistDrafts();reviewMessage=missing.length+' casos novos carregados. Os casos editados foram preservados.';render();break;}case'casepractice':{const item=availableCases(caseFilter)[activeCase];if(verifiedCase(item)){try{cubeState=apply(solved(),item.setup||inverse(item.algorithm))}catch{cubeState=solved()}page='sim';render()}break}case'casereview':{if(!isAdmin()){page='profile';cloudMessage='O editor de casos é exclusivo de administradores.';render();break}const item=availableCases(caseFilter)[activeCase];if(item){const found=caseDrafts.findIndex(c=>c.id===item.id);if(found<0){caseDrafts.push({...item,diagram:verifiedCase(item)?item.diagram:null,expectedState:verifiedCase(item)?item.expectedState:null,review:{approved:false},updatedAt:Date.now()});persistDrafts();draftSelection=caseDrafts.length-1}else draftSelection=found;showHiddenDrafts=Boolean(caseDrafts[draftSelection]?.hidden);page='review';render()}break}case'draftnew':caseDrafts.push({id:'caso-'+(caseDrafts.length+1),stage:'f2l',algorithm:'',setup:'',diagram:null,expectedState:null,review:{approved:false},hidden:false});showHiddenDrafts=false;draftSelection=caseDrafts.length-1;persistDrafts();render();break;
case'draftshowvisible':showHiddenDrafts=false;selectReviewDraft();reviewMessage='';render();break;
case'draftshowhidden':showHiddenDrafts=true;selectReviewDraft();reviewMessage='';render();break;
case'drafthide':{
 const item=caseDrafts[draftSelection];if(!item||!isAdmin())break;
 item.hidden=!item.hidden;item.updatedAt=Date.now();
 const message=item.hidden?'Caso ocultado. Use a aba Ocultos para restaurá-lo.':'Caso restaurado à lista visível.';
 persistDrafts();selectReviewDraft(-1);reviewMessage=message;render();break;
}
case'draftdelete':{
 const item=caseDrafts[draftSelection];if(!item||!isAdmin())break;
 if(!confirm('Excluir permanentemente o caso '+item.id+'? Esta ação não pode ser desfeita.'))break;
 markDraftDeleted(item);caseDrafts.splice(draftSelection,1);selectReviewDraft(-1);persistDrafts();reviewMessage='Caso excluído.';render();break;
}case'publishededit':{
 if(!isAdmin())break;
 const published=publishedCases().find(c=>c.id===b.dataset.publishedId);
 if(!published)break;
 const current=caseDrafts.findIndex(c=>c.id===published.id&&c.stage===published.stage);
 if(current>=0&&!confirm('Este caso já possui um rascunho local. Substituir pela versão publicada?'))break;
 const draft={...published,hidden:false,review:{approved:false},updatedAt:Date.now()};
 if(current>=0){caseDrafts[current]=draft;draftSelection=current}else{caseDrafts.push(draft);draftSelection=caseDrafts.length-1}
 showHiddenDrafts=false;persistDrafts();reviewMessage='Versão publicada carregada para edição. Valide e aprove antes de republicar.';render();break;
}case'publishedremove':{
 if(!isAdmin())break;
 const id=b.dataset.publishedId;
 if(!publishedCases().some(c=>c.id===id)||!confirm('Retirar '+id+' da biblioteca pública?'))break;
 unpublishCase(id).then(()=>{reviewMessage='Caso retirado da biblioteca pública.';render()}).catch(err=>{reviewMessage=err.message;render()});break;
}case'publishcase':{if(!isAdmin())break;const item=caseDrafts[draftSelection];if(item)publishCase(item,draftReport(item)).then(()=>{reviewMessage='Caso publicado após validação.';render()}).catch(err=>{reviewMessage=err.message;render()});break}
case'unpublishcase':{if(!isAdmin())break;const item=caseDrafts[draftSelection];if(item&&confirm('Retirar '+item.id+' da biblioteca pública?'))unpublishCase(item.id).then(()=>{reviewMessage='Caso retirado da biblioteca pública.';render()}).catch(err=>{reviewMessage=err.message;render()});break}
case'draftexport':downloadDrafts();break;case'draftimport':document.getElementById('draftfile')?.click();break;case'camleft':cameraYaw-=30;render();break;case'camright':cameraYaw+=30;render();break;case'camtoggle':use2D=!use2D;render();break;case'cubeundo':if(cubeHistory.length)cubeState=cubeHistory.pop();render();break;case'cubereset':cubeState=solved();cubeHistory=[];render();break;case'cubescramble':cubeHistory.push(cubeState.slice());cubeState=apply(cubeState,makeScramble());render();break;case'cubeapply':{const field=document.getElementById('cube-algorithm');try{const next=apply(cubeState,field.value);cubeHistory.push(cubeState.slice());cubeState=next;render()}catch(err){document.getElementById('cube-error').textContent='Confira a notação: '+err.message}break;}case'train':nav('train');break;case'timer':window.location.assign('scramble.html');break;case'f2l':window.location.assign('f2l.html');break;case'intuitive':page='train';f2lMode='intuitive';lesson=0;resetDemo();render();break;case'algorithms':page='train';caseFilter='f2l';activeCase=0;f2lMode='algorithms';showSetups=false;render();break;case'togglesetup':showSetups=!showSetups;render();break;case'revealalgorithm':trainingReveal=true;render();break;case'nextcase':{const count=availableCases(caseFilter).length;if(count)activeCase=(activeCase+1)%count;trainingReveal=false;showSetups=false;render();break;}case'cross':window.location.assign('cross.html');break;case'pll':window.location.assign('pll.html');break;case'oll':page='train';caseFilter='oll';activeCase=0;f2lMode='algorithms';showSetups=false;render();break;case'backtrain':stopDemo();page='train';f2lMode='';render();break;case'backf2l':stopDemo();f2lMode='choose';render();break;case'prevlesson':lesson=Math.max(0,lesson-1);resetDemo();render();break;case'nextlesson':lesson=Math.min(intuitive.length-1,lesson+1);resetDemo();render();break;case'lessoncomplete':{const p=progressData();p.completedLessons=Array.isArray(p.completedLessons)?p.completedLessons:[];if(!p.completedLessons.includes(lesson)){p.completedLessons.push(lesson);saveFeatureData();awardActivity('Aula',15)}lesson=Math.min(intuitive.length-1,lesson+1);resetDemo();render();break;}case'newscramble':scramble=makeScramble();timerState='idle';cancelAnimationFrame(raf);render();break;case'timerstart':timerAction();break;case'inspectionstart':if(timerState==='idle'){if(!inspection)inspection=15;timerState='inspection';inspectionStarted=performance.now();tick()}break;case'clearhistory':if(times.length&&confirm('Excluir todo o histórico de tempos e DNFs? Esta ação não pode ser desfeita.')){times=[];saveTimes();render()}break;case'dnf':times.push({ms:null,scramble,date:new Date().toISOString()});saveTimes();timerState='idle';scramble=makeScramble();render();break;}});root.addEventListener('submit',e=>{
 const id=e.target.id;
 if(id.startsWith('admin-')){e.preventDefault();adminSubmit(e.target).then(changed=>{if(changed)render()}).catch(err=>alert(err.message));return}if(id.startsWith('cloud-')||id.startsWith('online-')){e.preventDefault();if(id.startsWith('cloud-'))handleCloudForm(e.target,e.submitter);else onlineSubmit(e.target).then(()=>render());return}
 if(progressSubmit(e.target)||practiceSubmit(e.target)){e.preventDefault();markLocalChange();if(id==='studio-profile-form')cloudProfileRefresh().catch(()=>{});render();return}
 if(id!=='draftform')return;e.preventDefault();if(!isAdmin())return;const form=new FormData(e.target);const d=caseDrafts[draftSelection];try{const parseField=name=>{const value=String(form.get(name)||'').trim();return value?JSON.parse(value):null};const updated={...d,id:String(form.get('id')).trim(),name:String(form.get('name')||'').trim().slice(0,90),stage:String(form.get('stage')),algorithm:String(form.get('algorithm')).trim(),setup:String(form.get('setup')).trim(),diagram:parseField('diagram'),expectedState:parseField('expectedState'),updatedAt:Date.now(),review:{approved:false}};caseDrafts[draftSelection]=updated;persistDrafts();reviewMessage='Caso salvo. Confira os resultados antes de aprovar.';render()}catch(err){reviewMessage='Confira os campos JSON: '+err.message;document.getElementById('review-message').textContent=reviewMessage}});
root.addEventListener('input',e=>{imageChanged(e.target)});
root.addEventListener('change',async e=>{if(e.target.id==='cfop-library-choice'){await chooseLibrary(e.target.value,caseFilter).catch(err=>{cloudMessage=err.message});activeCase=0;render();return}if(crossChange(e.target)){render();return}if(e.target.id==='studio-file'){if(await progressImport(e.target.files?.[0])){try{times=JSON.parse(localStorage.getItem('cfop-v2-times')||'[]')}catch{times=[]}try{caseDrafts=JSON.parse(localStorage.getItem('cfop-case-drafts')||'[]')}catch{caseDrafts=[]}}render();return}if(e.target.id==='review-image-input'){if(isAdmin())await imageChosen(e.target.files?.[0]);return}if(e.target.id==='inspection')inspection=Number(e.target.value);if(e.target.dataset.penalty!==undefined){const index=Number(e.target.dataset.penalty);times=updatePenalty(times,index,e.target.value);saveTimes();render()}if(e.target.id==='reviewapprove'){const d=caseDrafts[draftSelection];if(isAdmin()&&d&&draftReport(d).automaticPassed){d.review={approved:e.target.checked,reviewer:cloudUser()?.email||'Administrador'};d.updatedAt=Date.now();persistDrafts();render()}}if(e.target.id==='pdffile'){try{const file=e.target.files?.[0];if(!file)return;reviewMessage='Lendo o PDF…';document.getElementById('review-message').textContent=reviewMessage;const imported=await readPdfCases(file);const incoming=imported.cases.map(c=>({...c,diagram:null,expectedState:null,review:{approved:false}}));const exists=new Set(caseDrafts.map(c=>c.stage+':'+c.id));const additions=incoming.filter(c=>!exists.has(c.stage+':'+c.id));caseDrafts=[...caseDrafts,...additions];showHiddenDrafts=false;draftSelection=additions.length?caseDrafts.length-additions.length:draftSelection;persistDrafts();reviewMessage=additions.length+' novos casos importados. Casos existentes preservados; confira algoritmo e setup.';render()}catch(err){reviewMessage='Erro ao ler PDF: '+err.message;document.getElementById('review-message').textContent=reviewMessage}}if(e.target.id==='draftfile'){try{const file=e.target.files[0];if(!file)return;if(file.size>18e6)throw Error('Arquivo muito grande (máximo 18 MB)');const parsed=JSON.parse(await file.text());if(parsed.format!=='cfop-studio-drafts-v1'||!Array.isArray(parsed.cases)||parsed.cases.length>300)throw Error('Formato não reconhecido');const limits={f2l:41,oll:57,pll:21};const counts={f2l:0,oll:0,pll:0};const ids=new Set();const incoming=parsed.cases.map(d=>{const stage=String(d.stage||'').toLowerCase(),id=String(d.id||'');if(!Object.hasOwn(limits,stage)||++counts[stage]>limits[stage]||ids.has(stage+':'+id))throw Error('Limite ou identificação duplicada: '+stage+' '+id);ids.add(stage+':'+id);return {id,stage,name:String(d.name||''),algorithm:String(d.algorithm||''),setup:String(d.setup||''),imageData:typeof d.imageData==='string'&&/^data:image\/(?:webp|png|jpeg);base64,/.test(d.imageData)?d.imageData:null,sourcePage:d.sourcePage||null,diagram:d.diagram||null,expectedState:d.expectedState||null,review:{approved:false},hidden:d.hidden===true}});caseDrafts=incoming;showHiddenDrafts=false;draftSelection=0;persistDrafts();reviewMessage='Casos importados para revisão.';render()}catch(err){reviewMessage='Não foi possível importar: '+err.message;document.getElementById('review-message').textContent=reviewMessage}}});document.addEventListener('keydown',e=>{if(e.code==='Space'&&page==='timer'&&!['INPUT','SELECT','TEXTAREA','BUTTON'].includes(document.activeElement.tagName)){e.preventDefault();if(!e.repeat)timerAction()}});async function handleCloudClick(cmd){
 cloudMessage='';
 try{
  if(cmd==='google'){signInWithGoogle();return}
  if(cmd==='sync')await syncCloud();
  if(cmd==='copyid'&&cloudUser()?.id){await navigator.clipboard.writeText(cloudUser().id);cloudMessage='ID da conta copiado.'}
  if(cmd==='logout')await signOut();
 }catch(err){cloudMessage=err.message}
 render();
}
async function handleCloudForm(form,submitter){
 const fields=new FormData(form),id=form.id,mode=submitter?.value||'login';
 cloudMessage='Processando...';
 try{
  if(id==='cloud-auth'){
   const email=String(fields.get('email')||''),password=String(fields.get('password')||'');
   if(mode==='login'){await signIn(email,password);cloudMessage='Conta conectada com sucesso.';const invite=new URLSearchParams(location.search).get('challenge');await onlineLoad(invite?{id:invite}:{}).catch(()=>{})}
   else if(mode==='signup')cloudMessage=await signUp(email,password);
   else if(mode==='recover')cloudMessage=await recoverPassword(email);
  }
  if(id==='cloud-password')cloudMessage=await updatePassword(String(fields.get('password')||''));
 }catch(err){cloudMessage=err.message}
 render();
}
document.addEventListener('cfop:local-change',markLocalChange);
scramble=makeScramble();render();startActivityTracking();document.addEventListener('cpof:libraries-changed',()=>{if(['library','train','profile','admin-base','admin-defaults'].includes(page))render()});loadLibraries().catch(()=>{});
onlineInit({updated:()=>{if(page==='challenges')render()}});
let cloudUIKey='';
initializeCloud({
 changed:state=>{const key=[state.configured,state.authenticated,state.admin].join('|');if(key!==cloudUIKey){cloudUIKey=key;render();loadLibraries().catch(()=>{})}},
 hydrated:()=>{if(isAuthenticated())loadAccountExtras().then(()=>{if(page==='profile')render()});reloadProgress();try{times=JSON.parse(localStorage.getItem('cfop-v2-times')||'[]')}catch{times=[]}
  try{caseDrafts=JSON.parse(localStorage.getItem('cfop-case-drafts')||'[]')}catch{caseDrafts=[]}
  render()}
}).then(()=>acceptAuthRedirect().catch(()=>{}));
setInterval(checkReminder,60000);
if('serviceWorker'in navigator&&(location.protocol==='https:'||location.hostname==='localhost'))navigator.serviceWorker.register('./sw.js').catch(()=>{});
// O material original é carregado exclusivamente pelo fundador via Supabase.
