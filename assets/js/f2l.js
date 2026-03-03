document.addEventListener('DOMContentLoaded', () => {
  const C = window.CPOF;
  const TOTAL = 41;
  const PAGE_SIZE = 6;
  const MAX_UNDO = 160;
  const C_ARM_MS = 1500;

  const imgEl = document.getElementById('case-image');
  const imgWrap = document.getElementById('img-wrap');
  const prevBtn = document.getElementById('prev-case-btn');
  const nextBtn = document.getElementById('next-case-btn');
  const menuBtn = document.getElementById('menu-btn');
  const menuPanel = document.getElementById('menu-panel');
  const panelClose = document.getElementById('panel-close');
  const removeToggle = document.getElementById('remove-when-solved-toggle');
  const timerToggle = document.getElementById('timer-toggle');
  const timerAutoToggle = document.getElementById('timer-autostart-toggle');
  const timerFloating = document.getElementById('timer-floating');
  const timerDisplay = document.getElementById('timer-display');
  const timerStart = document.getElementById('timer-start');
  const timerPause = document.getElementById('timer-pause');
  const timerReset = document.getElementById('timer-reset');
  const sessionTimerBar = document.getElementById('session-timer-bar');
  const sessionTimerDisplay = document.getElementById('session-timer-display');
  const timerVisibilityBtn = document.getElementById('timer-visibility-btn');
  const showTimerBtn = document.getElementById('show-timer-btn');
  const hideTimerBtn = document.getElementById('hide-timer-btn');
  const caseTimerBar = document.getElementById('case-timer-bar');
  const caseTimerDisplay = document.getElementById('case-timer-display');
  const casesRemainingEl = document.getElementById('cases-remaining');
  const remainingCount = document.getElementById('remaining-count');
  const competitiveBreakdown = document.getElementById('competitive-breakdown');
  const remainingBadEl = document.getElementById('remaining-bad');
  const remainingGoodEl = document.getElementById('remaining-good');
  const clearSolved = document.getElementById('clear-solved');
  const keyboardToggle = document.getElementById('keyboard-actions-toggle');
  const galleryWrap = document.getElementById('exclusion-gallery-wrap');
  const galleryEl = document.getElementById('exclusion-gallery');
  const galleryToggleBtn = document.getElementById('toggle-exclusion-gallery');
  const galleryLoading = document.getElementById('exclusion-loading');
  const excludeReset = document.getElementById('exclude-reset');
  const imageSizeRange = document.getElementById('image-size-range');
  const buttonSizeRange = document.getElementById('button-size-range');
  const resetSizeBtn = document.getElementById('reset-size-btn');
  const competitiveToggle = document.getElementById('competitive-toggle');
  const competitiveLimitInput = document.getElementById('competitive-limit-input');
  const competitiveRepeatInput = document.getElementById('competitive-repeat-input');
  const dynamicBgToggle = document.getElementById('dynamic-bg-toggle');
  const resetCompetitiveBtn = document.getElementById('reset-competitive-btn');
  const resetAllBtn = document.getElementById('reset-all-btn');
  const caseMask = document.getElementById('case-mask');
  const lastCaseInfo = document.getElementById('last-case-info');
  const finalScreen = document.getElementById('final-screen');
  const finalTimeLine = document.getElementById('final-time-line');
  const restartSessionBtn = document.getElementById('restart-session-btn');
  const toast = document.getElementById('toast') || createToast();

  const defaults = {
    excluded: [],
    removeWhenSolved: false,
    solved: [],
    solvedHistory: [],
    keyboardActions: true,
    uiScale: { image: 1, button: 1 },
    timerState: {
      elapsed: 0,
      running: false,
      enabled: false,
      autoStart: false,
      visible: true
    },
    competitive: {
      enabled: false,
      limitSec: 12,
      repeatBase: 2,
      dynamicBg: true,
      caseStats: {}
    },
    lastCaseReport: null
  };

  let state = normalizeState(C.getCookie('cpof_prefs') || {});
  let history = [];
  let historyIndex = -1;
  let lastShown = null;
  let currentCase = null;
  let caseVisible = true;
  let completed = false;
  let completionTotalMs = null;
  let undoStack = [];

  let sessionTimerInterval = null;
  let caseTimerInterval = null;
  let caseStartAt = null;
  let caseElapsed = 0;
  let smoothedCaseElapsed = 0;
  let cArmedUntil = 0;
  let sessionActive = false;
  let sessionTargetCount = 0;
  let sessionResolved = new Set();

  let galleryCaseOrder = [];
  let galleryRendered = 0;
  let galleryBusy = false;

  function normalizeState(raw) {
    const merged = {
      ...defaults,
      ...raw,
      timerState: { ...defaults.timerState, ...(raw.timerState || {}) },
      uiScale: { ...defaults.uiScale, ...(raw.uiScale || {}) },
      competitive: { ...defaults.competitive, ...(raw.competitive || {}) }
    };
    merged.excluded = uniqueIntList(merged.excluded);
    merged.solved = uniqueIntList(merged.solved);
    merged.solvedHistory = Array.isArray(merged.solvedHistory) ? merged.solvedHistory : [];
    merged.competitive.caseStats = merged.competitive.caseStats || {};
    return merged;
  }

  function uniqueIntList(input) {
    if (!Array.isArray(input)) return [];
    const out = new Set();
    input.forEach((v) => {
      const n = Number(v);
      if (Number.isFinite(n) && n >= 1 && n <= TOTAL) out.add(n);
    });
    return Array.from(out).sort((a, b) => a - b);
  }

  function save() {
    state.updatedAt = new Date().toISOString();
    C.setCookie('cpof_prefs', state, 365);
  }

  function createToast() {
    const d = document.createElement('div');
    d.id = 'toast';
    d.className = 'toast';
    d.hidden = true;
    document.body.appendChild(d);
    return d;
  }

  function showToast(msg, t = 1400) {
    toast.textContent = msg;
    toast.hidden = false;
    setTimeout(() => {
      toast.hidden = true;
    }, t);
  }

  function cloneState() {
    return JSON.parse(JSON.stringify(state));
  }

  function pushUndo(action) {
    undoStack.push({
      action,
      state: cloneState(),
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
      showToast('Nada para desfazer');
      return;
    }
    state = normalizeState(snapshot.state);
    history = snapshot.history || [];
    historyIndex = Number(snapshot.historyIndex) || -1;
    lastShown = snapshot.lastShown || null;
    currentCase = snapshot.currentCase || null;
    caseVisible = snapshot.caseVisible !== false;
    completed = !!snapshot.completed;
    completionTotalMs = snapshot.completionTotalMs || null;
    stopCaseTimer();
    syncUiFromState();
    renderCaseScene();
    refreshGalleryIfOpen();
    showToast('Ultima acao desfeita');
  }

  function fmt(ms) {
    const value = Math.max(0, Number(ms) || 0);
    const cent = Math.floor((value % 1000) / 10);
    const s = Math.floor(value / 1000) % 60;
    const m = Math.floor(value / 60000);
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}.${String(cent).padStart(2, '0')}`;
  }

  function clamp01(v) {
    return Math.max(0, Math.min(1, v));
  }

  function smoothstep01(v) {
    const x = clamp01(v);
    return x * x * (3 - 2 * x);
  }

  function mixColor(a, b, t) {
    const f = clamp01(t);
    const out = [
      Math.round(a[0] + (b[0] - a[0]) * f),
      Math.round(a[1] + (b[1] - a[1]) * f),
      Math.round(a[2] + (b[2] - a[2]) * f)
    ];
    return `rgb(${out[0]}, ${out[1]}, ${out[2]})`;
  }

  function mixColorArr(a, b, t) {
    const f = clamp01(t);
    return [
      Math.round(a[0] + (b[0] - a[0]) * f),
      Math.round(a[1] + (b[1] - a[1]) * f),
      Math.round(a[2] + (b[2] - a[2]) * f)
    ];
  }

  function applyDynamicBackground(msElapsed) {
    if (!state.competitive.enabled || !state.competitive.dynamicBg) {
      clearPerformanceClass();
      return;
    }
    const limitMs = Math.max(3000, Number(state.competitive.limitSec || 12) * 1000);
    const preWarmStart = limitMs * 0.65;
    const orangeFull = limitMs * 1.2;
    const badStart = limitMs * 1.45;
    const redFull = limitMs * 2.5;

    const pOrange = smoothstep01((msElapsed - preWarmStart) / Math.max(1, orangeFull - preWarmStart));
    const pRed = smoothstep01((msElapsed - badStart) / Math.max(1, redFull - badStart));

    const baseA = [24, 52, 106];
    const baseB = [44, 15, 75];
    const baseL1 = [5, 7, 15];
    const baseL2 = [15, 24, 48];

    const orangeA = [91, 46, 9];
    const orangeB = [165, 81, 22];
    const orangeL1 = [38, 18, 10];
    const orangeL2 = [70, 33, 15];

    const redA = [90, 15, 25];
    const redB = [135, 15, 32];
    const redL1 = [37, 6, 11];
    const redL2 = [61, 12, 18];

    const mixA = mixColorArr(baseA, orangeA, pOrange);
    const mixB = mixColorArr(baseB, orangeB, pOrange);
    const mixL1 = mixColorArr(baseL1, orangeL1, pOrange);
    const mixL2 = mixColorArr(baseL2, orangeL2, pOrange);

    const finalA = mixColor(mixA, redA, pRed);
    const finalB = mixColor(mixB, redB, pRed);
    const finalL1 = mixColor(mixL1, redL1, pRed);
    const finalL2 = mixColor(mixL2, redL2, pRed);

    const root = document.documentElement;
    root.style.setProperty('--bg-radial-a', finalA);
    root.style.setProperty('--bg-radial-b', finalB);
    root.style.setProperty('--bg-linear-a', finalL1);
    root.style.setProperty('--bg-linear-b', finalL2);
  }

  function setBodyPerformanceClass(grade) {
    if (grade === 'good') applyDynamicBackground(0);
    else if (grade === 'medium') applyDynamicBackground(Math.max(3000, Number(state.competitive.limitSec || 12) * 1120));
    else applyDynamicBackground(Math.max(3000, Number(state.competitive.limitSec || 12) * 1700));
  }

  function clearPerformanceClass() {
    const root = document.documentElement;
    root.style.setProperty('--bg-radial-a', '#18346a');
    root.style.setProperty('--bg-radial-b', '#2c0f4b');
    root.style.setProperty('--bg-linear-a', '#05070f');
    root.style.setProperty('--bg-linear-b', '#0f1830');
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

  function classifyPerformance(ms) {
    const limitMs = Math.max(3000, Number(state.competitive.limitSec || 12) * 1000);
    if (ms <= limitMs) return 'good';
    if (ms <= limitMs * 1.35) return 'medium';
    return 'bad';
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
    if (next) C.preloadImage(`f2l/${next}.png`).catch(() => {});
  }

  function startSessionTimer(manualRequest) {
    if (manualRequest && !state.timerState.enabled) {
      state.timerState.enabled = true;
      timerToggle.checked = true;
    }
    if (!state.timerState.enabled || state.timerState.running) return;
    state.timerState.running = true;
    state.timerState.startedAt = Date.now() - (state.timerState.elapsed || 0);
    timerStart.hidden = true;
    timerPause.hidden = false;
    if (sessionTimerInterval) clearInterval(sessionTimerInterval);
    sessionTimerInterval = setInterval(() => {
      state.timerState.elapsed = Date.now() - state.timerState.startedAt;
      updateTimerDisplays();
    }, 30);
    updateTimerDisplays();
    save();
  }

  function stopSessionTimer() {
    if (sessionTimerInterval) clearInterval(sessionTimerInterval);
    sessionTimerInterval = null;
    if (state.timerState.running) {
      state.timerState.elapsed = Date.now() - (state.timerState.startedAt || Date.now());
    }
    state.timerState.running = false;
    timerStart.hidden = false;
    timerPause.hidden = true;
    updateTimerDisplays();
    save();
  }

  function resetSessionTimer() {
    stopSessionTimer();
    state.timerState.elapsed = 0;
    state.timerState.startedAt = Date.now();
    completionTotalMs = null;
    updateTimerDisplays();
    save();
  }

  function maybeAutoStartTimer() {
    if (!state.timerState.enabled || !state.timerState.autoStart) return;
    if (!state.timerState.running) startSessionTimer(false);
  }

  function updateTimerDisplays() {
    const elapsed = state.timerState.running
      ? (Date.now() - (state.timerState.startedAt || Date.now()))
      : (state.timerState.elapsed || 0);
    timerDisplay.textContent = fmt(elapsed);
    sessionTimerDisplay.textContent = fmt(elapsed);
  }

  function applyTimerBarVisibility() {
    sessionTimerBar.hidden = !state.timerState.enabled;
    sessionTimerBar.classList.toggle('timer-content-hidden', !state.timerState.visible);
  }

  function startCaseTimer() {
    caseStartAt = Date.now();
    caseElapsed = 0;
    smoothedCaseElapsed = 0;
    caseTimerDisplay.textContent = fmt(0);
    caseTimerBar.hidden = false;
    applyDynamicBackground(0);
    if (caseTimerInterval) clearInterval(caseTimerInterval);
    caseTimerInterval = setInterval(() => {
      caseElapsed = Date.now() - caseStartAt;
      smoothedCaseElapsed += (caseElapsed - smoothedCaseElapsed) * 0.08;
      caseTimerDisplay.textContent = fmt(caseElapsed);
      applyDynamicBackground(smoothedCaseElapsed);
    }, 30);
  }

  function stopCaseTimer() {
    if (caseTimerInterval) clearInterval(caseTimerInterval);
    caseTimerInterval = null;
    if (caseStartAt) caseElapsed = Date.now() - caseStartAt;
    smoothedCaseElapsed = caseElapsed;
    caseStartAt = null;
    caseTimerBar.hidden = true;
    return caseElapsed || 0;
  }

  function openMenu() {
    menuPanel.setAttribute('aria-hidden', 'false');
  }

  function closeMenu() {
    menuPanel.setAttribute('aria-hidden', 'true');
  }

  function renderLastCaseInfo() {
    const report = state.lastCaseReport;
    if (!report) {
      lastCaseInfo.textContent = 'Nenhum caso resolvido ainda.';
      return;
    }
    const labels = { good: 'bom', medium: 'medio', bad: 'ruim' };
    lastCaseInfo.textContent = [
      `Ultimo caso: ${report.caseId}`,
      `Tempo: ${fmt(report.timeMs)}`,
      `Desempenho: ${labels[report.grade] || '-'}`,
      `Resolvido ${report.solveCount} vez(es)`
    ].join(' | ');
  }

  async function renderCaseScene() {
    if (completed && (!sessionActive || sessionTargetCount <= 0 || sessionResolved.size < sessionTargetCount)) {
      completed = false;
    }

    renderLastCaseInfo();
    updateTimerDisplays();
    updateRemaining();
    updateControlsState();
    applyScale();

    finalScreen.hidden = !completed;
    prevBtn.hidden = completed;
    nextBtn.hidden = completed;

    if (completed) {
      imgEl.hidden = true;
      caseMask.hidden = true;
      const totalMs = completionTotalMs !== null ? completionTotalMs : (state.timerState.elapsed || 0);
      finalTimeLine.textContent = state.timerState.enabled
        ? `Tempo total: ${fmt(totalMs)}`
        : '';
      return;
    }

    finalScreen.hidden = true;
    if (!currentCase) return;

    if (state.competitive.enabled && !caseVisible) {
      imgEl.hidden = true;
      caseMask.hidden = false;
      nextBtn.textContent = 'Resolver caso';
      caseTimerBar.hidden = true;
      return;
    }

    nextBtn.textContent = 'Proximo caso';
    caseMask.hidden = true;
    imgEl.hidden = false;
    const src = `f2l/${currentCase}.png`;
    try {
      await C.preloadImage(src);
      imgEl.src = src;
    } catch (e) {
      imgEl.src = src;
    }
  }

  function updateControlsState() {
    prevBtn.hidden = completed || state.competitive.enabled;
    prevBtn.disabled = historyIndex <= 0 || completed || state.competitive.enabled;
    const shouldShowRemaining = state.removeWhenSolved || state.competitive.enabled;
    casesRemainingEl.hidden = !shouldShowRemaining;

    if (state.competitive.enabled) {
      const pending = availableCompetitiveCases();
      const left = pending.length;
      let bad = 0;
      let good = 0;
      pending.forEach((id) => {
        const stat = getCaseStat(id);
        if (stat.lastGrade === 'bad' || stat.lastGrade === 'medium') bad += 1;
        else good += 1;
      });
      remainingCount.textContent = String(left);
      competitiveBreakdown.hidden = false;
      remainingBadEl.textContent = String(bad);
      remainingGoodEl.textContent = String(good);
    } else {
      const blocked = new Set(state.excluded);
      if (state.removeWhenSolved) sessionResolved.forEach((id) => blocked.add(id));
      remainingCount.textContent = String(Math.max(0, TOTAL - blocked.size));
      competitiveBreakdown.hidden = true;
    }

    timerFloating.hidden = !state.timerState.enabled;
    applyTimerBarVisibility();
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
      `<img src="f2l/${caseId}.png" alt="Caso ${caseId}" loading="lazy">`,
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

    const card = cardEl || galleryEl.querySelector(`.exclude-card[data-case="${caseId}"]`);
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
    galleryLoading.hidden = false;
    const slice = galleryCaseOrder.slice(galleryRendered, galleryRendered + PAGE_SIZE);
    slice.forEach((id) => galleryEl.appendChild(createGalleryCard(id)));
    galleryRendered += slice.length;
    galleryBusy = false;
    galleryLoading.hidden = true;
  }

  function refreshGallery() {
    galleryCaseOrder = rankByMostRecentSolved();
    galleryRendered = 0;
    galleryEl.innerHTML = '';
    renderNextGalleryPage();
    while (galleryRendered < galleryCaseOrder.length && galleryEl.scrollHeight <= galleryEl.clientHeight) {
      renderNextGalleryPage();
    }
  }

  function refreshGalleryIfOpen() {
    if (!galleryWrap.hidden) refreshGallery();
  }

  function onGalleryScroll() {
    const threshold = 60;
    const nearBottom = galleryEl.scrollTop + galleryEl.clientHeight >= galleryEl.scrollHeight - threshold;
    if (nearBottom) renderNextGalleryPage();
  }

  function applyScale() {
    const root = document.documentElement;
    root.style.setProperty('--case-scale', String(state.uiScale.image || 1));
    root.style.setProperty('--btn-scale', String(state.uiScale.button || 1));
    imageSizeRange.value = String(state.uiScale.image || 1);
    buttonSizeRange.value = String(state.uiScale.button || 1);
  }

  function resetRun() {
    history = [];
    historyIndex = -1;
    currentCase = null;
    lastShown = null;
    caseVisible = true;
    completed = false;
    completionTotalMs = null;
    stopCaseTimer();
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
    resetSessionTimer();
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
    const grade = classifyPerformance(elapsedMs);
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
    setBodyPerformanceClass(grade);
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
      stopSessionTimer();
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
      setBodyPerformanceClass(grade);
    }

    if (shouldCompleteSession()) {
      completeSession();
      return;
    }

    const next = pickNextCase();
    if (!next) {
      showToast('Sem proximo caso no momento');
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
      startCaseTimer();
      save();
      renderCaseScene();
      return;
    }

    pushUndo('next');
    const elapsed = state.competitive.enabled ? stopCaseTimer() : 0;
    moveToNextCaseAfterSolve(elapsed, classifyPerformance(elapsed), true);
  }

  function onPreviousCase() {
    if (state.competitive.enabled) return;
    if (completed || historyIndex <= 0) {
      showToast('Nao ha caso anterior');
      return;
    }
    pushUndo('prev');
    stopCaseTimer();
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
      showToast(`Caso ${currentCase} excluido`);
    } else {
      state.excluded.splice(idx, 1);
      showToast(`Caso ${currentCase} reincluido`);
    }
    save();
    refreshGalleryIfOpen();
    renderCaseScene();
    if (state.excluded.includes(currentCase)) onResolveAdvance();
  }

  function resetCompetitiveSettings() {
    state.competitive = { ...defaults.competitive, caseStats: {} };
    competitiveToggle.checked = false;
    competitiveLimitInput.value = String(defaults.competitive.limitSec);
    competitiveRepeatInput.value = String(defaults.competitive.repeatBase);
    dynamicBgToggle.checked = defaults.competitive.dynamicBg;
    clearPerformanceClass();
    save();
    restartSession(true, false);
  }

  function resetAllSettings() {
    state = normalizeState(defaults);
    save();
    syncUiFromState();
    restartSession(true, true);
    showToast('Configuracoes restauradas para o padrao');
  }

  function toggleCompetitiveMode(nextValue) {
    const enable = typeof nextValue === 'boolean' ? nextValue : !state.competitive.enabled;
    state.competitive.enabled = enable;
    competitiveToggle.checked = enable;
    if (state.competitive.enabled) state.timerState.enabled = true;
    save();
    restartSession(false, false);
    showToast(`Modo competitivo ${state.competitive.enabled ? 'ativado' : 'desativado'}`);
  }

  function syncUiFromState() {
    removeToggle.checked = !!state.removeWhenSolved;
    keyboardToggle.checked = !!state.keyboardActions;
    timerToggle.checked = !!state.timerState.enabled;
    timerAutoToggle.checked = !!state.timerState.autoStart;
    competitiveToggle.checked = !!state.competitive.enabled;
    dynamicBgToggle.checked = !!state.competitive.dynamicBg;
    competitiveLimitInput.value = String(state.competitive.limitSec || 12);
    competitiveRepeatInput.value = String(state.competitive.repeatBase || 2);
    applyTimerBarVisibility();
    timerFloating.hidden = !state.timerState.enabled;
    applyScale();
    updateTimerDisplays();
    renderLastCaseInfo();
    updateRemaining();
  }

  function isInteractiveInput(target) {
    if (!target || !target.tagName) return false;
    const tag = target.tagName.toLowerCase();
    return tag === 'input' || tag === 'textarea' || tag === 'select';
  }

  function handleShortcuts(e) {
    if (e.key === 'Escape') {
      if (!galleryWrap.hidden) {
        galleryWrap.hidden = true;
        galleryToggleBtn.textContent = 'Abrir galeria';
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
      if (menuPanel.getAttribute('aria-hidden') === 'true') openMenu();
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
      if (state.timerState.running) stopSessionTimer();
      else startSessionTimer(true);
      syncUiFromState();
      showToast(state.timerState.running ? 'Cronometro iniciado' : 'Cronometro pausado');
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
        resetSessionTimer();
        syncUiFromState();
        showToast('Cronometro resetado');
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

  nextBtn.addEventListener('click', onResolveAdvance);
  prevBtn.addEventListener('click', onPreviousCase);
  menuBtn.addEventListener('click', () => {
    if (menuPanel.getAttribute('aria-hidden') === 'true') openMenu();
    else closeMenu();
  });
  panelClose.addEventListener('click', closeMenu);
  galleryEl.addEventListener('scroll', onGalleryScroll);
  restartSessionBtn.addEventListener('click', () => restartSession(true, true));

  caseMask.addEventListener('mousemove', (e) => {
    const rect = caseMask.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / Math.max(1, rect.width)) * 100;
    const y = ((e.clientY - rect.top) / Math.max(1, rect.height)) * 100;
    caseMask.style.setProperty('--mx', `${x}%`);
    caseMask.style.setProperty('--my', `${y}%`);
  });

  galleryToggleBtn.addEventListener('click', () => {
    const opening = galleryWrap.hidden;
    galleryWrap.hidden = !galleryWrap.hidden;
    galleryToggleBtn.textContent = opening ? 'Fechar galeria' : 'Abrir galeria';
    if (opening) refreshGallery();
  });

  excludeReset.addEventListener('click', () => {
    pushUndo('exclude-reset');
    state.excluded = [];
    save();
    refreshGalleryIfOpen();
    renderCaseScene();
    showToast('Exclusoes limpas');
  });

  clearSolved.addEventListener('click', () => {
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
    showToast('Resolvidos limpos');
  });

  removeToggle.addEventListener('change', (e) => {
    pushUndo('toggle-remove');
    state.removeWhenSolved = !!e.target.checked;
    save();
    renderCaseScene();
  });

  keyboardToggle.addEventListener('change', (e) => {
    state.keyboardActions = !!e.target.checked;
    save();
    showToast(`Atalhos ${state.keyboardActions ? 'ativados' : 'desativados'}`);
  });

  timerToggle.addEventListener('change', (e) => {
    pushUndo('timer-enable');
    state.timerState.enabled = !!e.target.checked;
    if (!state.timerState.enabled) stopSessionTimer();
    save();
    syncUiFromState();
  });

  timerAutoToggle.addEventListener('change', (e) => {
    state.timerState.autoStart = !!e.target.checked;
    save();
    showToast(`Inicio automatico ${state.timerState.autoStart ? 'ativado' : 'desativado'}`);
  });

  timerStart.addEventListener('click', () => startSessionTimer(true));
  timerPause.addEventListener('click', stopSessionTimer);
  timerReset.addEventListener('click', resetSessionTimer);

  timerVisibilityBtn.addEventListener('click', () => {
    state.timerState.visible = !state.timerState.visible;
    applyTimerBarVisibility();
    save();
  });
  showTimerBtn.addEventListener('click', () => {
    state.timerState.visible = true;
    applyTimerBarVisibility();
    save();
  });
  hideTimerBtn.addEventListener('click', () => {
    state.timerState.visible = false;
    applyTimerBarVisibility();
    save();
  });

  imageSizeRange.addEventListener('input', (e) => {
    state.uiScale.image = Number(e.target.value);
    applyScale();
    save();
  });
  buttonSizeRange.addEventListener('input', (e) => {
    state.uiScale.button = Number(e.target.value);
    applyScale();
    save();
  });
  resetSizeBtn.addEventListener('click', () => {
    state.uiScale = { ...defaults.uiScale };
    applyScale();
    save();
    showToast('Tamanho restaurado');
  });

  competitiveToggle.addEventListener('change', (e) => {
    toggleCompetitiveMode(!!e.target.checked);
  });

  competitiveLimitInput.addEventListener('change', (e) => {
    const sec = Math.max(3, Math.min(180, Number(e.target.value) || 12));
    state.competitive.limitSec = sec;
    e.target.value = String(sec);
    save();
  });

  competitiveRepeatInput.addEventListener('change', (e) => {
    const n = Math.max(1, Math.min(10, Number(e.target.value) || 2));
    state.competitive.repeatBase = n;
    e.target.value = String(n);
    save();
  });

  dynamicBgToggle.addEventListener('change', (e) => {
    state.competitive.dynamicBg = !!e.target.checked;
    if (!state.competitive.dynamicBg) clearPerformanceClass();
    save();
  });

  resetCompetitiveBtn.addEventListener('click', () => {
    resetCompetitiveSettings();
    showToast('Modo competitivo resetado');
  });

  resetAllBtn.addEventListener('click', resetAllSettings);

  document.addEventListener('keydown', handleShortcuts);

  (async function init() {
    syncUiFromState();
    updateTimerDisplays();
    sessionTargetCount = unexcludedCases().length;
    sessionResolved = new Set();
    sessionActive = true;
    completed = false;
    finalScreen.hidden = true;

    const first = pickNextCase();
    if (!first) {
      const fallback = unexcludedCases()[0] || 1;
      setCurrentCase(fallback, !state.competitive.enabled);
      save();
      imgEl.hidden = false;
      caseMask.hidden = true;
      await renderCaseScene();
      return;
    }

    setCurrentCase(first, !state.competitive.enabled);
    save();
    await renderCaseScene();
    preloadAnother();
  })();
});
