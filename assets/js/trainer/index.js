import { C_ARM_MS, MAX_UNDO, PAGE_SIZE, createDefaults, getPageConfig } from './config.js';
import { applyDynamicBackground, classifyPerformance, clearPerformanceClass, setBodyPerformanceClass } from './competitive.js';
import { cloneState, normalizeState, saveState } from './state.js';
import { createCaseTimerController, createSessionTimerController, fmt } from './timer.js';
import { applyScale, applyTimerBarVisibility, createToast, renderLastCaseInfo, showToast } from './ui.js';

document.addEventListener('DOMContentLoaded', () => {
  const C = window.CPOF || {
    setCookie: () => {},
    getCookie: () => null,
    preloadImage: (src) => Promise.resolve(src),
    pickRandom: (arr) => (arr && arr.length ? arr[Math.floor(Math.random() * arr.length)] : null)
  };
  const { pageSet, totalCases: TOTAL, stateKey: STATE_KEY } = getPageConfig();
  const defaults = createDefaults();

  const refs = {
    imgEl: document.getElementById('case-image'),
    prevBtn: document.getElementById('prev-case-btn'),
    nextBtn: document.getElementById('next-case-btn'),
    menuBtn: document.getElementById('menu-btn'),
    menuPanel: document.getElementById('menu-panel'),
    panelClose: document.getElementById('panel-close'),
    removeToggle: document.getElementById('remove-when-solved-toggle'),
    timerToggle: document.getElementById('timer-toggle'),
    timerAutoToggle: document.getElementById('timer-autostart-toggle'),
    timerFloating: document.getElementById('timer-floating'),
    timerDisplay: document.getElementById('timer-display'),
    timerStart: document.getElementById('timer-start'),
    timerPause: document.getElementById('timer-pause'),
    timerReset: document.getElementById('timer-reset'),
    sessionTimerBar: document.getElementById('session-timer-bar'),
    sessionTimerDisplay: document.getElementById('session-timer-display'),
    timerVisibilityBtn: document.getElementById('timer-visibility-btn'),
    showTimerBtn: document.getElementById('show-timer-btn'),
    hideTimerBtn: document.getElementById('hide-timer-btn'),
    caseTimerBar: document.getElementById('case-timer-bar'),
    caseTimerDisplay: document.getElementById('case-timer-display'),
    casesRemainingEl: document.getElementById('cases-remaining'),
    remainingCount: document.getElementById('remaining-count'),
    competitiveBreakdown: document.getElementById('competitive-breakdown'),
    remainingBadEl: document.getElementById('remaining-bad'),
    remainingGoodEl: document.getElementById('remaining-good'),
    clearSolved: document.getElementById('clear-solved'),
    keyboardToggle: document.getElementById('keyboard-actions-toggle'),
    galleryWrap: document.getElementById('exclusion-gallery-wrap'),
    galleryEl: document.getElementById('exclusion-gallery'),
    galleryToggleBtn: document.getElementById('toggle-exclusion-gallery'),
    galleryLoading: document.getElementById('exclusion-loading'),
    excludeReset: document.getElementById('exclude-reset'),
    imageSizeRange: document.getElementById('image-size-range'),
    buttonSizeRange: document.getElementById('button-size-range'),
    resetSizeBtn: document.getElementById('reset-size-btn'),
    competitiveToggle: document.getElementById('competitive-toggle'),
    competitiveLimitInput: document.getElementById('competitive-limit-input'),
    competitiveRepeatInput: document.getElementById('competitive-repeat-input'),
    dynamicBgToggle: document.getElementById('dynamic-bg-toggle'),
    resetCompetitiveBtn: document.getElementById('reset-competitive-btn'),
    resetAllBtn: document.getElementById('reset-all-btn'),
    caseMask: document.getElementById('case-mask'),
    lastCaseInfo: document.getElementById('last-case-info'),
    finalScreen: document.getElementById('final-screen'),
    finalTimeLine: document.getElementById('final-time-line'),
    restartSessionBtn: document.getElementById('restart-session-btn'),
    toast: document.getElementById('toast') || createToast()
  };

  let state = normalizeState(C.getCookie(STATE_KEY) || {}, defaults, TOTAL);
  let history = [];
  let historyIndex = -1;
  let lastShown = null;
  let currentCase = null;
  let caseVisible = true;
  let completed = false;
  let completionTotalMs = null;
  let undoStack = [];
  let cArmedUntil = 0;
  let sessionActive = false;
  let sessionTargetCount = 0;
  let sessionResolved = new Set();
  let galleryCaseOrder = [];
  let galleryRendered = 0;
  let galleryBusy = false;

  const save = () => saveState(C, STATE_KEY, state);
  const sessionTimer = createSessionTimerController(state, refs, save);
  const caseTimer = createCaseTimerController(state, refs, (msElapsed) => {
    applyDynamicBackground(state.competitive.enabled && state.competitive.dynamicBg, state.competitive.limitSec, msElapsed);
  });

  function notify(msg, t) {
    showToast(refs.toast, msg, t);
  }

  function pushUndo(action) {
    undoStack.push({
      action,
      state: cloneState(state),
      history: JSON.parse(JSON.stringify(history)),
      historyIndex,
      lastShown,
      currentCase,
      caseVisible,
      completed,
      completionTotalMs
    });
    if (undoStack.length > MAX_UNDO) undoStack.shift();
  }

  function undoLastAction() {
    const snapshot = undoStack.pop();
    if (!snapshot) {
      notify('Nada para desfazer');
      return;
    }
    state = normalizeState(snapshot.state, defaults, TOTAL);
    history = snapshot.history || [];
    historyIndex = Number(snapshot.historyIndex) || -1;
    lastShown = snapshot.lastShown || null;
    currentCase = snapshot.currentCase || null;
    caseVisible = snapshot.caseVisible !== false;
    completed = !!snapshot.completed;
    completionTotalMs = snapshot.completionTotalMs || null;
    caseTimer.hide();
    syncUiFromState();
    renderCaseScene();
    refreshGalleryIfOpen();
    notify('Ultima acao desfeita');
  }

  function getCaseStat(caseId) {
    const key = String(caseId);
    const existing = state.competitive.caseStats[key] || {};
    const stat = {
      solves: Number(existing.solves) || 0,
      within: Number(existing.within) || 0,
      need: Math.max(1, Number(existing.need) || 1),
      boost: Math.max(0, Number(existing.boost) || 0),
      lastGrade: existing.lastGrade || 'none',
      lastMs: Number(existing.lastMs) || 0
    };
    state.competitive.caseStats[key] = stat;
    return stat;
  }

  function isCaseMastered(caseId) {
    const stat = getCaseStat(caseId);
    return stat.within >= stat.need;
  }

  function availableNormalCases() {
    const all = Array.from({ length: TOTAL }, (_, i) => i + 1);
    const blocked = new Set(state.excluded);
    if (state.removeWhenSolved) sessionResolved.forEach((id) => blocked.add(id));
    return all.filter((id) => !blocked.has(id));
  }

  function availableCompetitiveCases() {
    const out = [];
    for (let id = 1; id <= TOTAL; id += 1) {
      if (state.excluded.includes(id)) continue;
      if (!isCaseMastered(id)) out.push(id);
    }
    return out;
  }

  function availableCases() {
    return state.competitive.enabled ? availableCompetitiveCases() : availableNormalCases();
  }

  function unexcludedCases() {
    const list = [];
    for (let id = 1; id <= TOTAL; id += 1) {
      if (!state.excluded.includes(id)) list.push(id);
    }
    return list;
  }

  function competitiveWeight(caseId) {
    const stat = getCaseStat(caseId);
    const needLeft = Math.max(0, stat.need - stat.within);
    let w = 1 + needLeft * Math.max(1, Number(state.competitive.repeatBase) || 1);
    w += Math.min(8, stat.boost);
    if (stat.lastGrade === 'bad') w += 2;
    if (stat.lastGrade === 'medium') w += 1;
    if (stat.solves === 0) w += 1;
    return Math.max(1, Math.floor(w));
  }

  function pickWeighted(ids) {
    const withWeights = ids.map((id) => ({ id, w: competitiveWeight(id) }));
    const total = withWeights.reduce((acc, it) => acc + it.w, 0);
    if (total <= 0) return ids[0] || null;
    let r = Math.random() * total;
    for (const item of withWeights) {
      r -= item.w;
      if (r <= 0) return item.id;
    }
    return withWeights[withWeights.length - 1].id;
  }

  function pickNextCase() {
    const list = availableCases();
    if (!list.length) {
      if (state.competitive.enabled) {
        const fallback = unexcludedCases().filter((id) => id !== lastShown);
        if (!fallback.length) return null;
        return C.pickRandom(fallback, lastShown);
      }
      return null;
    }
    const pool = list.filter((id) => id !== lastShown);
    const effectivePool = pool.length ? pool : list;
    let pick = null;
    if (state.competitive.enabled) {
      pick = pickWeighted(effectivePool);
      const stat = getCaseStat(pick);
      stat.boost = Math.max(0, stat.boost - 1);
    } else {
      pick = C.pickRandom(effectivePool, lastShown);
    }
    return pick;
  }

  function appendHistory(caseId, visible) {
    if (!caseId) return;
    if (historyIndex < history.length - 1) history = history.slice(0, historyIndex + 1);
    history.push({ caseId, visible: !!visible });
    historyIndex = history.length - 1;
  }

  function setCurrentCase(caseId, visible) {
    currentCase = caseId;
    lastShown = caseId;
    caseVisible = !!visible;
    appendHistory(caseId, visible);
  }

  function updateHistoryVisibility() {
    if (historyIndex < 0 || !history[historyIndex]) return;
    history[historyIndex].visible = caseVisible;
  }

  function preloadAnother() {
    const list = availableCases();
    const next = list.find((id) => id !== currentCase);
    if (next) C.preloadImage(`${pageSet}/${next}.png`).catch(() => {});
  }

  function maybeAutoStartTimer() {
    if (!state.timerState.enabled || !state.timerState.autoStart) return;
    if (!state.timerState.running) sessionTimer.start(false);
  }

  function openMenu() {
    refs.menuPanel.setAttribute('aria-hidden', 'false');
  }

  function closeMenu() {
    refs.menuPanel.setAttribute('aria-hidden', 'true');
  }

  async function renderCaseScene() {
    if (completed && (!sessionActive || sessionTargetCount <= 0 || sessionResolved.size < sessionTargetCount)) {
      completed = false;
    }

    renderLastCaseInfo(state, refs);
    sessionTimer.updateDisplays();
    updateRemaining();
    updateControlsState();
    applyScale(state, refs);

    refs.finalScreen.hidden = !completed;
    refs.prevBtn.hidden = completed || state.competitive.enabled;
    refs.nextBtn.hidden = completed;

    if (completed) {
      refs.imgEl.hidden = true;
      refs.caseMask.hidden = true;
      const totalMs = completionTotalMs !== null ? completionTotalMs : (state.timerState.elapsed || 0);
      refs.finalTimeLine.textContent = state.timerState.enabled ? `Tempo total: ${fmt(totalMs)}` : '';
      return;
    }

    refs.finalScreen.hidden = true;
    if (!currentCase) return;

    if (state.competitive.enabled && !caseVisible) {
      refs.imgEl.hidden = true;
      refs.caseMask.hidden = false;
      refs.nextBtn.textContent = 'Resolver caso';
      refs.caseTimerBar.hidden = true;
      return;
    }

    refs.nextBtn.textContent = 'Proximo caso';
    refs.caseMask.hidden = true;
    refs.imgEl.hidden = false;
    const src = `${pageSet}/${currentCase}.png`;
    try {
      await C.preloadImage(src);
      refs.imgEl.src = src;
    } catch (e) {
      refs.imgEl.src = src;
    }
  }

  function updateControlsState() {
    refs.prevBtn.hidden = completed || state.competitive.enabled;
    refs.prevBtn.disabled = historyIndex <= 0 || completed || state.competitive.enabled;

    const shouldShowRemaining = state.removeWhenSolved || state.competitive.enabled;
    refs.casesRemainingEl.hidden = !shouldShowRemaining;

    if (state.competitive.enabled) {
      const pending = availableCompetitiveCases();
      let bad = 0;
      let good = 0;
      pending.forEach((id) => {
        const stat = getCaseStat(id);
        if (stat.lastGrade === 'bad' || stat.lastGrade === 'medium') bad += 1;
        else good += 1;
      });
      refs.remainingCount.textContent = String(pending.length);
      refs.competitiveBreakdown.hidden = false;
      refs.remainingBadEl.textContent = String(bad);
      refs.remainingGoodEl.textContent = String(good);
    } else {
      const blocked = new Set(state.excluded);
      if (state.removeWhenSolved) sessionResolved.forEach((id) => blocked.add(id));
      refs.remainingCount.textContent = String(Math.max(0, TOTAL - blocked.size));
      refs.competitiveBreakdown.hidden = true;
    }

    refs.timerFloating.hidden = !state.timerState.enabled;
    applyTimerBarVisibility(state, refs);
  }

  function updateRemaining() {
    updateControlsState();
  }

  function rankByMostRecentSolved() {
    const ranked = [];
    const seen = new Set();
    for (let i = state.solvedHistory.length - 1; i >= 0; i -= 1) {
      const entry = state.solvedHistory[i];
      const id = Number(entry.caseId);
      if (id >= 1 && id <= TOTAL && !seen.has(id)) {
        seen.add(id);
        ranked.push(id);
      }
    }
    for (let i = 1; i <= TOTAL; i += 1) {
      if (!seen.has(i)) ranked.push(i);
    }
    return ranked;
  }

  function createGalleryCard(caseId) {
    const btn = document.createElement('button');
    btn.className = 'exclude-card';
    btn.dataset.case = String(caseId);
    if (state.excluded.includes(caseId)) btn.classList.add('is-excluded');
    btn.innerHTML = [
      `<img src="${pageSet}/${caseId}.png" alt="Caso ${caseId}" loading="lazy">`,
      `<span class="exclude-case-id">Caso ${caseId}</span>`,
      `<span class="exclude-case-action">${state.excluded.includes(caseId) ? 'Reincluir' : 'Excluir'}</span>`
    ].join('');
    btn.addEventListener('click', () => toggleCaseExcluded(caseId, btn));
    return btn;
  }

  function toggleCaseExcluded(caseId, cardEl) {
    const idx = state.excluded.indexOf(caseId);
    const excludedNow = idx === -1;
    if (excludedNow) {
      state.excluded.push(caseId);
      state.excluded.sort((a, b) => a - b);
    } else {
      state.excluded.splice(idx, 1);
    }
    save();
    updateRemaining();

    const card = cardEl || refs.galleryEl.querySelector(`.exclude-card[data-case="${caseId}"]`);
    if (card) {
      card.classList.toggle('is-excluded', excludedNow);
      const label = card.querySelector('.exclude-case-action');
      if (label) label.textContent = excludedNow ? 'Reincluir' : 'Excluir';
    }

    if (currentCase === caseId && excludedNow && !completed) {
      moveToNextCaseAfterSolve(0, 'good', false);
    } else {
      renderCaseScene();
    }
  }

  function renderNextGalleryPage() {
    if (galleryBusy || galleryRendered >= galleryCaseOrder.length) return;
    galleryBusy = true;
    refs.galleryLoading.hidden = false;
    const slice = galleryCaseOrder.slice(galleryRendered, galleryRendered + PAGE_SIZE);
    slice.forEach((id) => refs.galleryEl.appendChild(createGalleryCard(id)));
    galleryRendered += slice.length;
    galleryBusy = false;
    refs.galleryLoading.hidden = true;
  }

  function refreshGallery() {
    galleryCaseOrder = rankByMostRecentSolved();
    galleryRendered = 0;
    refs.galleryEl.innerHTML = '';
    renderNextGalleryPage();
    while (galleryRendered < galleryCaseOrder.length && refs.galleryEl.scrollHeight <= refs.galleryEl.clientHeight) {
      renderNextGalleryPage();
    }
  }

  function refreshGalleryIfOpen() {
    if (!refs.galleryWrap.hidden) refreshGallery();
  }

  function resetRun() {
    history = [];
    historyIndex = -1;
    currentCase = null;
    lastShown = null;
    caseVisible = true;
    completed = false;
    completionTotalMs = null;
    caseTimer.hide();
    clearPerformanceClass();
    sessionActive = false;
    sessionTargetCount = 0;
    sessionResolved = new Set();
  }

  function restartSession(clearCompetitiveStats, hardReset) {
    if (hardReset || !state.competitive.enabled) state.solved = [];
    if (hardReset) {
      state.excluded = [];
      state.solvedHistory = [];
      state.lastCaseReport = null;
      state.competitive.caseStats = {};
    } else if (clearCompetitiveStats) {
      state.competitive.caseStats = {};
    }
    sessionTimer.reset();
    resetRun();
    sessionTargetCount = unexcludedCases().length;
    sessionResolved = new Set();
    sessionActive = true;
    const first = pickNextCase();
    if (!first) {
      const fallback = unexcludedCases()[0] || 1;
      setCurrentCase(fallback, !state.competitive.enabled);
      save();
      renderCaseScene();
      return;
    }
    setCurrentCase(first, !state.competitive.enabled);
    save();
    renderCaseScene();
    preloadAnother();
  }

  function handleCompetitiveResult(caseId, elapsedMs) {
    const stat = getCaseStat(caseId);
    const grade = classifyPerformance(state.competitive.limitSec, elapsedMs);
    stat.solves += 1;
    stat.lastMs = elapsedMs;
    stat.lastGrade = grade;

    const repeatBase = Math.max(1, Number(state.competitive.repeatBase) || 1);
    if (grade === 'good') {
      stat.within += 1;
      stat.boost = Math.max(0, stat.boost - 1);
    } else if (grade === 'medium') {
      stat.need = Math.max(stat.need, 1);
      stat.boost += repeatBase;
    } else {
      stat.need = Math.max(stat.need, 2);
      stat.boost += repeatBase * 2;
    }

    state.lastCaseReport = {
      caseId,
      grade,
      timeMs: elapsedMs,
      solveCount: stat.solves
    };
    state.solvedHistory.push({ caseId, ts: Date.now(), grade, timeMs: elapsedMs });
    sessionResolved.add(caseId);
    setBodyPerformanceClass(state.competitive.limitSec, state.competitive.dynamicBg, grade);
    return grade;
  }

  function handleNormalResult(caseId) {
    if (state.removeWhenSolved && !state.solved.includes(caseId)) state.solved.push(caseId);
    state.solvedHistory.push({ caseId, ts: Date.now(), grade: 'good', timeMs: 0 });
    state.lastCaseReport = {
      caseId,
      grade: 'good',
      timeMs: 0,
      solveCount: (state.lastCaseReport && state.lastCaseReport.caseId === caseId)
        ? (state.lastCaseReport.solveCount + 1)
        : 1
    };
    sessionResolved.add(caseId);
    return 'good';
  }

  function shouldCompleteSession() {
    if (!sessionActive) return false;
    if (sessionTargetCount <= 0) return false;
    return sessionResolved.size >= sessionTargetCount;
  }

  function completeSession() {
    completed = true;
    const elapsed = state.timerState.running
      ? (Date.now() - (state.timerState.startedAt || Date.now()))
      : (state.timerState.elapsed || 0);
    completionTotalMs = elapsed;
    if (state.timerState.enabled) {
      sessionTimer.stop();
      state.timerState.elapsed = elapsed;
    }
    save();
    renderCaseScene();
  }

  function moveToNextCaseAfterSolve(elapsedMs, grade, markResult) {
    if (markResult) {
      if (state.competitive.enabled) {
        handleCompetitiveResult(currentCase, elapsedMs);
      } else {
        handleNormalResult(currentCase);
      }
    } else {
      setBodyPerformanceClass(state.competitive.limitSec, state.competitive.dynamicBg, grade);
    }

    if (shouldCompleteSession()) {
      completeSession();
      return;
    }

    const next = pickNextCase();
    if (!next) {
      notify('Sem proximo caso no momento');
      return;
    }

    setCurrentCase(next, !state.competitive.enabled);
    save();
    refreshGalleryIfOpen();
    renderCaseScene();
    preloadAnother();
  }

  function onResolveAdvance() {
    if (completed) return;
    maybeAutoStartTimer();

    if (state.competitive.enabled && !caseVisible) {
      caseVisible = true;
      updateHistoryVisibility();
      caseTimer.start();
      save();
      renderCaseScene();
      return;
    }

    pushUndo('next');
    const elapsed = state.competitive.enabled ? caseTimer.stop() : 0;
    moveToNextCaseAfterSolve(elapsed, classifyPerformance(state.competitive.limitSec, elapsed), true);
  }

  function onPreviousCase() {
    if (state.competitive.enabled) return;
    if (completed || historyIndex <= 0) {
      notify('Nao ha caso anterior');
      return;
    }
    pushUndo('prev');
    caseTimer.hide();
    historyIndex -= 1;
    const entry = history[historyIndex];
    currentCase = entry.caseId;
    caseVisible = entry.visible !== false;
    lastShown = currentCase;
    save();
    renderCaseScene();
  }

  function toggleCurrentCaseExcluded() {
    if (!currentCase || completed) return;
    pushUndo('exclude-current');
    const idx = state.excluded.indexOf(currentCase);
    if (idx === -1) {
      state.excluded.push(currentCase);
      state.excluded.sort((a, b) => a - b);
      notify(`Caso ${currentCase} excluido`);
    } else {
      state.excluded.splice(idx, 1);
      notify(`Caso ${currentCase} reincluido`);
    }
    save();
    refreshGalleryIfOpen();
    renderCaseScene();
    if (state.excluded.includes(currentCase)) onResolveAdvance();
  }

  function resetCompetitiveSettings() {
    state.competitive = { ...defaults.competitive, caseStats: {} };
    refs.competitiveToggle.checked = false;
    refs.competitiveLimitInput.value = String(defaults.competitive.limitSec);
    refs.competitiveRepeatInput.value = String(defaults.competitive.repeatBase);
    refs.dynamicBgToggle.checked = defaults.competitive.dynamicBg;
    clearPerformanceClass();
    save();
    restartSession(true, false);
  }

  function resetAllSettings() {
    state = normalizeState(defaults, defaults, TOTAL);
    save();
    syncUiFromState();
    restartSession(true, true);
    notify('Configuracoes restauradas para o padrao');
  }

  function toggleCompetitiveMode(nextValue) {
    const enable = typeof nextValue === 'boolean' ? nextValue : !state.competitive.enabled;
    state.competitive.enabled = enable;
    refs.competitiveToggle.checked = enable;
    if (state.competitive.enabled) state.timerState.enabled = true;
    save();
    restartSession(false, false);
    notify(`Modo competitivo ${state.competitive.enabled ? 'ativado' : 'desativado'}`);
  }

  function syncUiFromState() {
    refs.removeToggle.checked = !!state.removeWhenSolved;
    refs.keyboardToggle.checked = !!state.keyboardActions;
    refs.timerToggle.checked = !!state.timerState.enabled;
    refs.timerAutoToggle.checked = !!state.timerState.autoStart;
    refs.competitiveToggle.checked = !!state.competitive.enabled;
    refs.dynamicBgToggle.checked = !!state.competitive.dynamicBg;
    refs.competitiveLimitInput.value = String(state.competitive.limitSec || 12);
    refs.competitiveRepeatInput.value = String(state.competitive.repeatBase || 2);
    applyTimerBarVisibility(state, refs);
    refs.timerFloating.hidden = !state.timerState.enabled;
    applyScale(state, refs);
    sessionTimer.updateDisplays();
    renderLastCaseInfo(state, refs);
    updateRemaining();
  }

  function isInteractiveInput(target) {
    if (!target || !target.tagName) return false;
    const tag = target.tagName.toLowerCase();
    return tag === 'input' || tag === 'textarea' || tag === 'select';
  }

  function handleShortcuts(e) {
    if (e.key === 'Escape') {
      if (!refs.galleryWrap.hidden) {
        refs.galleryWrap.hidden = true;
        refs.galleryToggleBtn.textContent = 'Abrir galeria';
      } else {
        closeMenu();
      }
      return;
    }
    if (isInteractiveInput(e.target)) return;

    if (!e.ctrlKey && !e.altKey && !e.metaKey && e.key === '1') {
      e.preventDefault();
      toggleCompetitiveMode();
      return;
    }
    if (!state.keyboardActions) return;

    if (e.key.toLowerCase() === 'm') {
      e.preventDefault();
      if (refs.menuPanel.getAttribute('aria-hidden') === 'true') openMenu();
      else closeMenu();
      return;
    }

    if (e.ctrlKey && e.key.toLowerCase() === 'z') {
      e.preventDefault();
      undoLastAction();
      return;
    }

    if (!e.ctrlKey && !e.altKey && !e.metaKey && e.key.toLowerCase() === 'c') {
      e.preventDefault();
      cArmedUntil = Date.now() + C_ARM_MS;
      state.timerState.enabled = true;
      if (state.timerState.running) sessionTimer.stop();
      else sessionTimer.start(true);
      syncUiFromState();
      notify(state.timerState.running ? 'Cronometro iniciado' : 'Cronometro pausado');
      save();
      return;
    }

    if (e.ctrlKey && (e.key === 'Backspace' || e.key === 'Delete')) {
      e.preventDefault();
      toggleCurrentCaseExcluded();
      return;
    }

    if (!e.ctrlKey && !e.altKey && !e.metaKey && e.key === 'Backspace') {
      if (Date.now() <= cArmedUntil) {
        e.preventDefault();
        cArmedUntil = 0;
        sessionTimer.reset();
        syncUiFromState();
        notify('Cronometro resetado');
      }
      return;
    }

    if (e.code === 'Space' || e.key === 'ArrowRight') {
      e.preventDefault();
      onResolveAdvance();
      return;
    }

    if (e.key === 'ArrowLeft') {
      e.preventDefault();
      onPreviousCase();
    }
  }

  refs.nextBtn.addEventListener('click', onResolveAdvance);
  refs.prevBtn.addEventListener('click', onPreviousCase);
  refs.menuBtn.addEventListener('click', () => {
    if (refs.menuPanel.getAttribute('aria-hidden') === 'true') openMenu();
    else closeMenu();
  });
  refs.panelClose.addEventListener('click', closeMenu);
  refs.galleryEl.addEventListener('scroll', () => {
    const threshold = 60;
    const nearBottom = refs.galleryEl.scrollTop + refs.galleryEl.clientHeight >= refs.galleryEl.scrollHeight - threshold;
    if (nearBottom) renderNextGalleryPage();
  });
  refs.restartSessionBtn.addEventListener('click', () => restartSession(true, true));

  refs.caseMask.addEventListener('mousemove', (e) => {
    const rect = refs.caseMask.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / Math.max(1, rect.width)) * 100;
    const y = ((e.clientY - rect.top) / Math.max(1, rect.height)) * 100;
    refs.caseMask.style.setProperty('--mx', `${x}%`);
    refs.caseMask.style.setProperty('--my', `${y}%`);
  });

  refs.galleryToggleBtn.addEventListener('click', () => {
    const opening = refs.galleryWrap.hidden;
    refs.galleryWrap.hidden = !refs.galleryWrap.hidden;
    refs.galleryToggleBtn.textContent = opening ? 'Fechar galeria' : 'Abrir galeria';
    if (opening) refreshGallery();
  });

  refs.excludeReset.addEventListener('click', () => {
    pushUndo('exclude-reset');
    state.excluded = [];
    save();
    refreshGalleryIfOpen();
    renderCaseScene();
    notify('Exclusoes limpas');
  });

  refs.clearSolved.addEventListener('click', () => {
    pushUndo('clear-solved');
    state.solved = [];
    state.solvedHistory = [];
    state.lastCaseReport = null;
    sessionResolved = new Set();
    sessionActive = true;
    sessionTargetCount = unexcludedCases().length;
    save();
    refreshGalleryIfOpen();
    renderCaseScene();
    notify('Resolvidos limpos');
  });

  refs.removeToggle.addEventListener('change', (e) => {
    pushUndo('toggle-remove');
    state.removeWhenSolved = !!e.target.checked;
    save();
    renderCaseScene();
  });

  refs.keyboardToggle.addEventListener('change', (e) => {
    state.keyboardActions = !!e.target.checked;
    save();
    notify(`Atalhos ${state.keyboardActions ? 'ativados' : 'desativados'}`);
  });

  refs.timerToggle.addEventListener('change', (e) => {
    pushUndo('timer-enable');
    state.timerState.enabled = !!e.target.checked;
    if (!state.timerState.enabled) sessionTimer.stop();
    save();
    syncUiFromState();
  });

  refs.timerAutoToggle.addEventListener('change', (e) => {
    state.timerState.autoStart = !!e.target.checked;
    save();
    notify(`Inicio automatico ${state.timerState.autoStart ? 'ativado' : 'desativado'}`);
  });

  refs.timerStart.addEventListener('click', () => sessionTimer.start(true));
  refs.timerPause.addEventListener('click', () => sessionTimer.stop());
  refs.timerReset.addEventListener('click', () => {
    sessionTimer.reset();
    completionTotalMs = null;
  });

  refs.timerVisibilityBtn.addEventListener('click', () => {
    state.timerState.visible = !state.timerState.visible;
    applyTimerBarVisibility(state, refs);
    save();
  });
  refs.showTimerBtn.addEventListener('click', () => {
    state.timerState.visible = true;
    applyTimerBarVisibility(state, refs);
    save();
  });
  refs.hideTimerBtn.addEventListener('click', () => {
    state.timerState.visible = false;
    applyTimerBarVisibility(state, refs);
    save();
  });

  refs.imageSizeRange.addEventListener('input', (e) => {
    state.uiScale.image = Number(e.target.value);
    applyScale(state, refs);
    save();
  });
  refs.buttonSizeRange.addEventListener('input', (e) => {
    state.uiScale.button = Number(e.target.value);
    applyScale(state, refs);
    save();
  });
  refs.resetSizeBtn.addEventListener('click', () => {
    state.uiScale = { ...defaults.uiScale };
    applyScale(state, refs);
    save();
    notify('Tamanho restaurado');
  });

  refs.competitiveToggle.addEventListener('change', (e) => {
    toggleCompetitiveMode(!!e.target.checked);
  });

  refs.competitiveLimitInput.addEventListener('change', (e) => {
    const sec = Math.max(3, Math.min(180, Number(e.target.value) || 12));
    state.competitive.limitSec = sec;
    e.target.value = String(sec);
    save();
  });

  refs.competitiveRepeatInput.addEventListener('change', (e) => {
    const n = Math.max(1, Math.min(10, Number(e.target.value) || 2));
    state.competitive.repeatBase = n;
    e.target.value = String(n);
    save();
  });

  refs.dynamicBgToggle.addEventListener('change', (e) => {
    state.competitive.dynamicBg = !!e.target.checked;
    if (!state.competitive.dynamicBg) clearPerformanceClass();
    save();
  });

  refs.resetCompetitiveBtn.addEventListener('click', () => {
    resetCompetitiveSettings();
    notify('Modo competitivo resetado');
  });

  refs.resetAllBtn.addEventListener('click', resetAllSettings);
  document.addEventListener('keydown', handleShortcuts);

  (async function init() {
    syncUiFromState();
    sessionTimer.updateDisplays();
    sessionTargetCount = unexcludedCases().length;
    sessionResolved = new Set();
    sessionActive = true;
    completed = false;
    refs.finalScreen.hidden = true;

    const first = pickNextCase();
    if (!first) {
      const fallback = unexcludedCases()[0] || 1;
      setCurrentCase(fallback, !state.competitive.enabled);
      save();
      refs.imgEl.hidden = false;
      refs.caseMask.hidden = true;
      await renderCaseScene();
      return;
    }

    setCurrentCase(first, !state.competitive.enabled);
    save();
    await renderCaseScene();
    preloadAnother();
  })();
});
