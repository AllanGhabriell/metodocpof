document.addEventListener('DOMContentLoaded',()=>{
  const C = window.CPOF;
  const TOTAL = 41;
  const imgEl = document.getElementById('case-image');
  const nextBtn = document.getElementById('next-case-btn');
  const markSolvedBtn = document.getElementById('mark-solved-btn');
  const menuBtn = document.getElementById('menu-btn');
  const menuPanel = document.getElementById('menu-panel');
  const panelClose = document.getElementById('panel-close');
  const excludedInput = document.getElementById('excluded-input');
  const excludeConfirm = document.getElementById('exclude-confirm');
  const excludeReset = document.getElementById('exclude-reset');
  const removeToggle = document.getElementById('remove-when-solved-toggle');
  const timerToggle = document.getElementById('timer-toggle');
  const timerFloating = document.getElementById('timer-floating');
  const timerDisplay = document.getElementById('timer-display');
  const timerStart = document.getElementById('timer-start');
  const timerPause = document.getElementById('timer-pause');
  const timerReset = document.getElementById('timer-reset');
  const casesRemainingEl = document.getElementById('cases-remaining');
  const remainingCount = document.getElementById('remaining-count');
  const clearSolved = document.getElementById('clear-solved');
  const toast = document.getElementById('toast') || createToast();

  // session var to avoid immediate repeat
  let lastShown = null;

  // load state
  let state = C.getCookie('cpof_prefs') || { excluded:[], removeWhenSolved:false, solved:[], timerState:{elapsed:0,running:false,enabled:false} };
  state.excluded = state.excluded || [];
  state.solved = state.solved || [];
  state.removeWhenSolved = !!state.removeWhenSolved;

  function save(){ state.updatedAt = new Date().toISOString(); C.setCookie('cpof_prefs', state, 365); }

  function createToast(){
    const d = document.createElement('div'); d.id='toast'; d.className='toast'; d.hidden=true;
    document.body.appendChild(d); return d;
  }

  function showToast(msg, t=1300){
    toast.textContent = msg; toast.hidden = false;
    setTimeout(()=> toast.hidden = true, t);
  }

  function availableList(){
    const all = Array.from({length:TOTAL},(_,i)=>i+1);
    const blocked = new Set(state.excluded || []);
    if(state.removeWhenSolved) (state.solved||[]).forEach(s=>blocked.add(s));
    return all.filter(n=>!blocked.has(n));
  }

  function updateRemaining(){
    if(state.removeWhenSolved){
      casesRemainingEl.hidden = false;
      remainingCount.textContent = Math.max(0, TOTAL - state.solved.length - state.excluded.length);
    } else {
      casesRemainingEl.hidden = true;
    }
  }

  // show random ensuring not equal to lastShown when possible
  async function showRandom(){
    const list = availableList();
    if(list.length === 0){ showToast('Nenhum caso disponível'); return; }
    const pick = C.pickRandom(list, lastShown);
    lastShown = pick;
    // preload then show
    const src = `f2l/${pick}.png`;
    try{ await C.preloadImage(src); imgEl.src = src; } catch(e){ imgEl.src = src; }
    // show/hide solved button
    markSolvedBtn.hidden = !state.removeWhenSolved;
  }

  // events
  nextBtn.addEventListener('click', ()=> showRandom());

  markSolvedBtn.addEventListener('click', ()=>{
    if(!lastShown) return;
    if(!state.solved.includes(lastShown)) state.solved.push(lastShown);
    save(); showToast('Marcado como resolvido');
    updateRemaining();
    // show next after marking
    setTimeout(()=> showRandom(), 220);
  });

  // menu panel
  menuBtn.addEventListener('click', ()=> { menuPanel.setAttribute('aria-hidden','false'); excludedInput.value = (state.excluded||[]).join(','); });
  panelClose.addEventListener('click', ()=> menuPanel.setAttribute('aria-hidden','true'));

  // exclude save/reset
  excludeConfirm.addEventListener('click', ()=>{
    const parsed = C.parseRangeInput(excludedInput.value);
    state.excluded = parsed;
    save(); showToast('Exclusões salvas');
    updateRemaining();
  });
  excludeReset.addEventListener('click', ()=>{
    state.excluded = [];
    excludedInput.value = '';
    save(); showToast('Lista de exclusão limpa');
    updateRemaining();
  });

  // remove when solved toggle
  removeToggle.checked = !!state.removeWhenSolved;
  removeToggle.addEventListener('change', (e)=>{
    state.removeWhenSolved = !!e.target.checked; save(); updateRemaining();
    showToast('Modo removido quando resolvido: ' + (state.removeWhenSolved ? 'Ativado' : 'Desativado'));
  });

  clearSolved.addEventListener('click', ()=>{
    state.solved = [];
    save(); updateRemaining(); showToast('Histórico de resolvidos limpo');
  });

  // timer
  timerToggle.checked = !!state.timerState?.enabled;
  timerToggle.addEventListener('change', (e)=>{
    state.timerState = state.timerState || {elapsed:0,running:false,enabled:false};
    state.timerState.enabled = !!e.target.checked;
    save();
    timerFloating.hidden = !state.timerState.enabled;
    showToast('Cronômetro ' + (state.timerState.enabled ? 'ativado' : 'desativado'));
  });

  let timerInterval = null;
  function fmt(ms){
    const cent = Math.floor((ms%1000)/10);
    const s = Math.floor(ms/1000)%60; const m = Math.floor(ms/60000);
    return `${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}.${String(cent).padStart(2,'0')}`;
  }
  function startTimer(){
    if(timerInterval) return;
    state.timerState.running = true; save();
    timerStart.hidden = true; timerPause.hidden = false;
    const start = Date.now() - (state.timerState.elapsed||0);
    timerInterval = setInterval(()=>{ state.timerState.elapsed = Date.now() - start; timerDisplay.textContent = fmt(state.timerState.elapsed); }, 30);
  }
  function pauseTimer(){
    if(timerInterval) clearInterval(timerInterval);
    timerInterval = null; state.timerState.running = false; save();
    timerStart.hidden = false; timerPause.hidden = true;
  }
  function resetTimer(){
    state.timerState.elapsed = 0; timerDisplay.textContent = fmt(0); save();
  }
  timerStart.addEventListener('click', startTimer);
  timerPause.addEventListener('click', pauseTimer);
  timerReset.addEventListener('click', ()=>{ resetTimer(); pauseTimer(); });

  // init - preload and show one
  (async function init(){
    updateRemaining();
    // restore timer UI
    if(state.timerState && state.timerState.enabled){
      timerFloating.hidden = false;
      timerDisplay.textContent = fmt(state.timerState.elapsed||0);
      if(state.timerState.running) startTimer();
    } else {
      timerFloating.hidden = true;
    }
    // show random initial case
    await showRandom();
    // preload another
    const list = availableList();
    const next = list.find(n=>n!==lastShown);
    if(next) C.preloadImage(`f2l/${next}.png`).catch(()=>{});
  })();

  // keyboard support: space -> next
  document.addEventListener('keydown',(e)=>{ if(e.code==='Space'){ e.preventDefault(); showRandom(); } });

});