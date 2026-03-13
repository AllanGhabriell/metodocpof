document.addEventListener('DOMContentLoaded', () => {
  const C = window.CPOF;
  const pageSet = (document.body.dataset.set || 'f2l').toLowerCase();
  const BODY_TOTAL = Math.max(1, Number(document.body.dataset.total) || 41);
  const CASE_IDS = parseCaseIds(document.body.dataset.cases, BODY_TOTAL);
  const CASE_ID_SET = new Set(CASE_IDS);
  const CASE_INDEX = new Map(CASE_IDS.map((id, idx) => [id, idx]));
  const TOTAL = CASE_IDS.length;
  const STATE_KEY = `cpof_prefs_${pageSet}`;
  const UI_SCALE_KEY = 'cpof_ui_scale';
  const PAGE_SIZE = 6;
  const MAX_UNDO = 160;
  const C_ARM_MS = 1500;
  const IS_TOUCH_DEVICE = window.matchMedia('(hover: none), (pointer: coarse)').matches;
  const ORDERED_CASES_BY_SET = {
    f2l: (() => {
      const out = ['38', '39', '40', '41'];
      for (let i = 1; i <= 37; i += 1) out.push(String(i));
      return out;
    })(),
    pll: ['Ua', 'Ub', 'H', 'Z', 'Aa', 'Ab', 'E', 'Ra', 'Rb', 'Ja', 'Jb', 'T', 'F', 'V', 'Y', 'Na', 'Nb', 'Ga', 'Gb', 'Gc', 'Gd']
  };
  const MOVES_BY_SET = {
    f2l: {
      1: "U' (R U R' U) (R U R')",
      2: "U' (R U' R' U) y' (R' U' R)",
      3: "U' (R U2' R' U) y' (R' U' R)",
      4: "(R U' R') U (R U R' U) U2 (R U' R')",
      5: "y' U (R' U R U') (R' U' R)",
      6: "U' (R U' R' U) (R U R')",
      7: "(U' R U R') U2 (R U' R')",
      8: "U' Rw U' R' U R U Rw'",
      9: "y' U (R' U2' R) U2 (R' U R)",
      10: "U' (R U2' R') U2 (R U' R')",
      11: "U (R U2' R') U (R U' R')",
      12: "U2 (R U R' U) (R U' R')",
      13: "Rw U' Rw' U2 Rw U Rw'",
      14: "y' U' (R' U2 R) U' (R' U R)",
      15: "M U (L F' L') U' M'",
      16: "(R U' R' U2) y' (R' U' R)",
      17: "(R U2 R') U' (R U R')",
      18: "y' (R' U2' R) U (R' U' R)",
      19: "U (R U' R') U' (R U' R' U R U' R')",
      20: "F (U R U' R') F' (R U' R')",
      21: "U' F' (R U R' U') R' F R",
      22: "U (R U' R' U') y (L' U L)",
      23: "(R U' R' U) (R U' R')",
      24: "y' (R' U R U') (R' U R)",
      25: "y' (R' U' R U) (R' U' R)",
      26: "(R U R' U') (R U R')",
      27: "U' (R' F R F') (R U' R')",
      28: "(U R U' R')3",
      29: "(U' R U' R') U2 (R U' R')",
      30: "U (R U R') U2' (R U R')",
      31: "(U' R U R') U y' (R' U' R)",
      32: "U (F' U' F) U' (R U R')",
      33: "R' F R F' R U' R' U R U' R' U2 R U' R'",
      34: "(R U' R') U' (R U R') U2 (R U' R')",
      35: "(R U' R') U (R U2' R') U (R U' R')",
      36: "(Rw U' Rw') U2 (Rw U Rw')",
      37: "R U' R' (Rw U' Rw') U2 (Rw U Rw')",
      38: "U (R U' R')",
      39: "y U' (L' U L)",
      40: "R U R'",
      41: "y L' U' L"
    },
    oll: {},
    pll: {
      Ua: "(M2' U M) U2 (M' U M2')",
      Ub: "(M2' U' M) U2 (M' U' M2')",
      H: "(M2' U M2') U2 (M2' U M2') (M2' U M2' U) (M' U2) (M2' U2 M')",
      Z: "(M2' U M2') U2 (M2' U M2') (M2' U M2' U) (M' U2) (M2' U2 M')",
      Aa: "x (R' U R') D2 (R U' R') D2 R2 x'",
      Ab: "x R2' D2 (R U R') D2 (R U' R) x'",
      E: "x' (R U' R' D) (R U R' D') (R U R' D) (R U' R' D') x",
      Ra: "(R U R' F') (R U2' R' U2') (R' F R U) (R U2' R')",
      Rb: "(R' U2 R U2') R' F (R U R' U') R' F' R2",
      Ja: "x R2' (F R F' R) U2' (Rw' U Rw U2')",
      Jb: "(R U R' F') (R U R' U') R' F R2 U' R' U'",
      T: "(R U R' U') (R' F R2 U') R' U' (R U R' F')",
      F: "(R' U' F') (R U R' U') (R' F R2 U') (R' U' R) (U R' U R)",
      V: "(R' U R' U') y (R' F' R2 U') (R' U R' F) R F",
      Y: "(R U R' U) (R U R' F') (R U R' U') (R' F R2 U') R' U2 (R U' R')",
      Na: "Rw' D' F Rw U' Rw' F' D Rw2 U Rw' U' Rw' F Rw F'",
      Nb: "Rw' D' F Rw U' Rw' F' D Rw2 U Rw' U' Rw' F Rw F'",
      Ga: "R2 U (R' U R' U') (R U' R2) {D U'} (R' U R D')",
      Gb: "R2' U' (R U' R U) (R' U R2) {D' U} (R U' R' D)",
      Gc: "(R U R') {U' D} (R2 U' R U') (R' U R' U) R2 D'",
      Gd: "(R' U' R) {U D'} (R2 U R' U) (R U' R U') R2' D"
    }
  };
  const SETUPS_BY_SET = {
    f2l: {
      1: "R U' R' U' R U' R' U",
      2: "F' U F U' R U R' U",
      3: "F' U F U' R U2' R' U",
      4: "R' U' R2' U' R2 U2' R",
      5: "R' U R U R' U' R U' y",
      6: "R U' R' U R U' R' U R U' R'",
      7: "R U R' U2 R U' R' U",
      8: "R' U' R U2 R' U R U' y",
      9: "R' U' R U2 R' U2 R U' y",
      10: "R U R' U2 R U2 R' U",
      11: "R U R' U' R U2' R' U'",
      12: "R U R' U' R U' R' U2",
      13: "R' U' R U R' U R U2 y",
      14: "R' U' R U R' U2 R U y",
      15: "M U L F L' U' M'",
      16: "F' U F U2' R U R'",
      17: "R U' R' U R U2 R'",
      18: "R' U R U R' U2 R y",
      19: "R U R' U R U R' U' R U R'",
      20: "R U R' F R U R' U' F'",
      21: "U' F' R U R' U' R' F R",
      22: "F' U' F U R U R' U'",
      23: "R U R' U' R U R'",
      24: "R' U R U R' U R' y",
      25: "R' U R U R' U R y",
      26: "R U R' U R U R'",
      27: "R U R' F R' F' R U",
      28: "(R U R' U')3",
      29: "R U R' U2 R U R' U",
      30: "R U' R' U2 R U' R' U'",
      31: "F' U F U' R U R' U",
      32: "R U' R' U F' U F U'",
      33: "R U2 R' U2 F' U' F",
      34: "R U R' U2 R U' R' U R U R'",
      35: "R U R' U R U2 R' U R U R'",
      36: "R' U' Rw U' Rw' U2 Rw U Rw'",
      37: "Rw U' Rw' U2 Rw U Rw' R U R'",
      38: "R U R' U'",
      39: "F' U' F U",
      40: "R U' R'",
      41: "F' U F"
    },
    oll: {},
    pll: {
      Ua: "(M2' U' M) U2 (M' U' M2')",
      Ub: "(M2' U M) U2 (M' U M2')",
      H: "(M2' U M2') U2 (M2' U M2')",
      Z: "(M2' U M2') (U' M' U2) (M2' U2 M')",
      Aa: "x R2' D2 (R U R') D2 (R U' R) x'",
      Ab: "x (R' U R') D2 (R U' R') D2 R2 x'",
      E: "x' (R U' R' D) (R U R' D') (R U R' D) (R U' R' D') x",
      Ra: "(R U R' F') (R U2' R' U2') (R' F R U) (R U2' R') U'",
      Rb: "(R' U2 R U2') R' F (R U R' U') R' F' R2 U'",
      Ja: "x R2' (F R F' R) U2' (Rw' U Rw U2')",
      Jb: "(R U R' F') (R U R' U') R' F R2 U' R' U'",
      T: "(R U R' U') (R' F R2 U') R' U' (R U R' F')",
      F: "(R' U' F') (R U R' U') (R' F R2 U') (R' U' R) (U R' U R)",
      V: "(R' U R' U') y (R' F' R2 U') (R' U R' F) R F",
      Y: "F (R U' R' U') (R U R' F') (R U R' U') (R' F R F')",
      Na: "(R U R' F') (R U R' U') (R' F R2 U') (R' U' R)",
      Nb: "Rw' D' F Rw U' Rw' F' D Rw2 U Rw' U' Rw' F Rw F'",
      Ga: "(R U R') {U' D} (R2 U' R U') (R' U R' U) R2 D'",
      Gb: "(R' U' R) {U D'} (R2 U R' U) (R U' R U') R2' D",
      Gc: "R2 U (R' U R' U') (R U' R2) {D U'} (R' U R D')",
      Gd: "R2' U' (R U' R U) (R' U R2) {D' U} (R U' R' D)"
    }
  };

  const imgEl = document.getElementById('case-image');
  const imgWrap = document.getElementById('img-wrap');
  const controlsRow = document.querySelector('.controls-row');
  const prevBtn = document.getElementById('prev-case-btn');
  const nextBtn = document.getElementById('next-case-btn');
  const menuBtn = document.getElementById('menu-btn');
  const menuPanel = document.getElementById('menu-panel');
  const panelClose = document.getElementById('panel-close');
  const skipBtn = document.getElementById('skip-case-btn');
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
  const caseMoves = document.getElementById('case-moves');
  const caseMovesToggle = document.getElementById('case-moves-toggle');
  const caseMovesBody = document.getElementById('case-moves-body');
  const caseMovesCaseId = document.getElementById('case-moves-caseid');
  const caseMovesText = document.getElementById('case-moves-text');
  const caseMovesSetupWrap = document.getElementById('case-moves-setup-wrap');
  const caseMovesSetupText = document.getElementById('case-moves-setup-text');
  const casesRemainingEl = document.getElementById('cases-remaining');
  const remainingLabel = document.getElementById('remaining-label');
  const remainingCount = document.getElementById('remaining-count');
  const competitiveBreakdown = document.getElementById('competitive-breakdown');
  const remainingBadEl = document.getElementById('remaining-bad');
  const remainingGoodEl = document.getElementById('remaining-good');
  const clearSolved = document.getElementById('clear-solved');
  const keyboardToggle = document.getElementById('keyboard-actions-toggle');
  const keyboardShortcutsExpand = document.getElementById('keyboard-shortcuts-expand');
  const keyboardShortcutsPanel = document.getElementById('keyboard-shortcuts-panel');
  const keyboardShortcutsList = document.getElementById('keyboard-shortcuts-list');
  const keyboardShortcutsReset = document.getElementById('keyboard-shortcuts-reset');
  const kbdSummary = document.getElementById('kbd-summary');
  const galleryWrap = document.getElementById('exclusion-gallery-wrap');
  const galleryEl = document.getElementById('exclusion-gallery');
  const galleryToggleBtn = document.getElementById('toggle-exclusion-gallery');
  const galleryLoading = document.getElementById('exclusion-loading');
  const excludeReset = document.getElementById('exclude-reset');
  const imageSizeRange = document.getElementById('image-size-range');
  const buttonSizeRange = document.getElementById('button-size-range');
  const resetSizeBtn = document.getElementById('reset-size-btn');
  const orderedToggle = document.getElementById('ordered-toggle');
  const competitiveToggle = document.getElementById('competitive-toggle');
  const competitiveLimitInput = document.getElementById('competitive-limit-input');
  const competitiveRepeatInput = document.getElementById('competitive-repeat-input');
  const dynamicBgToggle = document.getElementById('dynamic-bg-toggle');
  const resetCompetitiveBtn = document.getElementById('reset-competitive-btn');
  const resetAllBtn = document.getElementById('reset-all-btn');
  const caseMask = document.getElementById('case-mask');
  const caseSetup = document.getElementById('case-setup');
  const caseSetupCaseId = document.getElementById('case-setup-caseid');
  const caseSetupText = document.getElementById('case-setup-text');
  const lastCaseInfo = document.getElementById('last-case-info');
  const finalScreen = document.getElementById('final-screen');
  const finalTimeLine = document.getElementById('final-time-line');
  const restartSessionBtn = document.getElementById('restart-session-btn');
  const toast = document.getElementById('toast') || createToast();

  const defaults = {
    excluded: [],
    removeWhenSolved: true,
    solved: [],
    solvedHistory: [],
    keyboardActions: true,
    orderedTraining: {
      enabled: false,
      index: 0,
      queue: []
    },
    keybinds: {
      next: ['Space', 'ArrowRight'],
      prev: ['ArrowLeft'],
      menu: ['KeyM'],
      timer: ['KeyC'],
      competitiveToggle: ['Digit1']
    },
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
      limitSec: 6,
      repeatBase: 2,
      dynamicBg: true,
      caseStats: {}
    },
    lastCaseReport: null
  };

  let state = normalizeState(C.getCookie(STATE_KEY) || {});
  state.uiScale = loadSharedScale();
  let history = [];
  let historyIndex = -1;
  let lastShown = null;
  let currentCase = null;
  let caseVisible = true;
  let completed = false;
  let completionTotalMs = null;
  let undoStack = [];
  let movesOpen = false;
  let shortcutsPanelOpen = false;
  let capturingKeybind = null;
  let captureConflictEls = [];

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

  function normalizeKeybinds(raw) {
    const base = defaults.keybinds || {};
    const input = raw && typeof raw === 'object' ? raw : {};

    const maxByAction = {
      next: 2,
      prev: 1,
      menu: 1,
      timer: 1,
      competitiveToggle: 1
    };
    const order = ['next', 'prev', 'menu', 'timer', 'competitiveToggle'];

    const cleaned = {};
    order.forEach((action) => {
      const max = maxByAction[action] || 1;
      const candidate = Array.isArray(input[action]) ? input[action] : (Array.isArray(base[action]) ? base[action] : []);
      const out = [];
      const seenLocal = new Set();
      candidate.forEach((v) => {
        const code = String(v || '').trim();
        if (!code || seenLocal.has(code)) return;
        seenLocal.add(code);
        out.push(code);
      });
      cleaned[action] = out.slice(0, max);
    });

    const used = new Set();
    const normalized = {};
    order.forEach((action) => {
      const max = maxByAction[action] || 1;
      const out = [];
      (cleaned[action] || []).forEach((code) => {
        if (out.length >= max) return;
        if (used.has(code)) return;
        used.add(code);
        out.push(code);
      });

      const fallback = Array.isArray(base[action]) ? base[action] : [];
      fallback.forEach((code) => {
        if (out.length >= max) return;
        if (used.has(code)) return;
        used.add(code);
        out.push(code);
      });

      normalized[action] = out;
    });

    return normalized;
  }

  function normalizeState(raw) {
    const merged = {
      ...defaults,
      ...raw,
      timerState: { ...defaults.timerState, ...(raw.timerState || {}) },
      uiScale: { ...defaults.uiScale, ...(raw.uiScale || {}) },
      competitive: { ...defaults.competitive, ...(raw.competitive || {}) },
      orderedTraining: { ...defaults.orderedTraining, ...(raw.orderedTraining || {}) }
    };
    merged.excluded = uniqueCaseIdList(merged.excluded);
    merged.solved = uniqueCaseIdList(merged.solved);
    merged.solvedHistory = Array.isArray(merged.solvedHistory) ? merged.solvedHistory : [];
    merged.competitive.caseStats = merged.competitive.caseStats || {};
    merged.keybinds = normalizeKeybinds(merged.keybinds);
    merged.orderedTraining.enabled = !!merged.orderedTraining.enabled;
    merged.orderedTraining.index = Math.max(0, Number(merged.orderedTraining.index) || 0);
    merged.orderedTraining.queue = Array.isArray(merged.orderedTraining.queue) ? merged.orderedTraining.queue.map((v) => String(v).trim()).filter(Boolean) : [];
    return merged;
  }

  function parseCaseIds(raw, fallbackTotal) {
    const fallback = Array.from({ length: Math.max(1, Number(fallbackTotal) || 1) }, (_, i) => String(i + 1));
    if (!raw) return fallback;
    const txt = String(raw).trim();
    if (!txt) return fallback;

    let list = null;
    if (txt.startsWith('[')) {
      try {
        const parsed = JSON.parse(txt);
        if (Array.isArray(parsed)) list = parsed;
      } catch (e) {
        list = null;
      }
    }
    if (!list) list = txt.split(',');

    const out = [];
    const seen = new Set();
    list.forEach((v) => {
      const id = String(v).trim();
      if (!id || seen.has(id)) return;
      seen.add(id);
      out.push(id);
    });
    return out.length ? out : fallback;
  }

  function sortCaseIds(ids) {
    return [...ids].sort((a, b) => (CASE_INDEX.get(a) ?? 1e9) - (CASE_INDEX.get(b) ?? 1e9));
  }

  function uniqueCaseIdList(input) {
    if (!Array.isArray(input)) return [];
    const out = new Set();
    input.forEach((v) => {
      const id = String(v).trim();
      if (CASE_ID_SET.has(id)) out.add(id);
    });
    return sortCaseIds(Array.from(out));
  }

  function save() {
    state.updatedAt = new Date().toISOString();
    C.setCookie(STATE_KEY, state, 365);
  }

  function sanitizeScale(raw) {
    const image = Math.max(0.8, Math.min(1.25, Number(raw && raw.image) || 1));
    const button = Math.max(0.85, Math.min(1.25, Number(raw && raw.button) || 1));
    return { image, button };
  }

  function loadSharedScale() {
    const cookieScale = C.getCookie(UI_SCALE_KEY) || defaults.uiScale;
    return sanitizeScale(cookieScale);
  }

  function saveSharedScale() {
    state.uiScale = sanitizeScale(state.uiScale);
    C.setCookie(UI_SCALE_KEY, state.uiScale, 365);
  }

  function isMobileCompetitiveTimerLocked() {
    return IS_TOUCH_DEVICE && state.competitive.enabled;
  }

  function isOrderedTrainingMode() {
    return !!(state.orderedTraining && state.orderedTraining.enabled);
  }

  function baseOrderedList() {
    const desired = ORDERED_CASES_BY_SET[pageSet];
    const base = Array.isArray(desired) && desired.length ? desired : CASE_IDS;
    return base.map((v) => String(v).trim()).filter(Boolean);
  }

  function orderedQueue() {
    const excluded = new Set(state.excluded);
    const base = baseOrderedList().filter((id) => CASE_ID_SET.has(id) && !excluded.has(id));
    const stored = (state.orderedTraining && Array.isArray(state.orderedTraining.queue))
      ? state.orderedTraining.queue.map((v) => String(v).trim()).filter(Boolean)
      : [];

    const seen = new Set();
    const out = [];

    stored.forEach((id) => {
      if (!CASE_ID_SET.has(id) || excluded.has(id) || seen.has(id)) return;
      seen.add(id);
      out.push(id);
    });
    base.forEach((id) => {
      if (seen.has(id)) return;
      seen.add(id);
      out.push(id);
    });
    CASE_IDS.forEach((id) => {
      if (excluded.has(id) || seen.has(id)) return;
      seen.add(id);
      out.push(id);
    });

    return out.length ? out : CASE_IDS.filter((id) => !excluded.has(id));
  }

  function orderedTotal() {
    return orderedQueue().length;
  }

  function clampOrderedIndex() {
    const total = orderedTotal();
    const idx = Math.max(0, Number(state.orderedTraining.index) || 0);
    state.orderedTraining.index = total ? Math.min(idx, total - 1) : 0;
  }

  function enforceMobileCompetitiveTimerRule() {
    const locked = isMobileCompetitiveTimerLocked();
    if (locked) {
      if (state.timerState.running) stopSessionTimer();
      state.timerState.enabled = false;
      state.timerState.autoStart = false;
      state.timerState.visible = false;
    }
    timerToggle.disabled = locked;
    timerAutoToggle.disabled = locked;
    timerStart.disabled = locked;
    timerPause.disabled = locked;
    timerReset.disabled = locked;
    timerToggle.checked = !!state.timerState.enabled;
    timerAutoToggle.checked = !!state.timerState.autoStart;
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

  function codeToLabel(code) {
    const c = String(code || '').trim();
    if (!c) return '-';
    if (c === 'Space') return 'Espaço';
    if (c === 'ArrowRight') return 'Seta direita';
    if (c === 'ArrowLeft') return 'Seta esquerda';
    if (c === 'ArrowUp') return 'Seta cima';
    if (c === 'ArrowDown') return 'Seta baixo';
    if (c.startsWith('Key') && c.length === 4) return c.slice(3);
    if (c.startsWith('Digit') && c.length === 6) return c.slice(5);
    if (c.startsWith('Numpad')) return c.replace('Numpad', 'Num ');
    return c;
  }

  function isPlainKeydown(e) {
    return !e.ctrlKey && !e.altKey && !e.metaKey;
  }

  function keyMatches(action, e) {
    const binds = state.keybinds && state.keybinds[action];
    if (!Array.isArray(binds) || !binds.length) return false;
    const code = String(e.code || '').trim();
    const key = String(e.key || '').trim();
    return binds.includes(code) || (key && binds.includes(key));
  }

  function updateShortcutTooltips() {
    const nextKeys = (state.keybinds.next || []).map(codeToLabel).join(' / ');
    const prevKeys = (state.keybinds.prev || []).map(codeToLabel).join(' / ');
    const menuKeys = (state.keybinds.menu || []).map(codeToLabel).join(' / ');
    const timerKeys = (state.keybinds.timer || []).map(codeToLabel).join(' / ');

    if (nextBtn) nextBtn.dataset.tooltip = `Atalhos: ${nextKeys || '-'}`;
    if (prevBtn) prevBtn.dataset.tooltip = `Atalho: ${prevKeys || '-'}`;
    if (menuBtn) menuBtn.dataset.tooltip = `Atalho: ${menuKeys || '-'}`;
    if (timerStart) timerStart.dataset.tooltip = `Atalho: ${timerKeys || '-'}`;
  }

  function updateKbdSummary() {
    if (!kbdSummary) return;
    const nextKeys = (state.keybinds.next || []).map(codeToLabel).join(' / ') || '-';
    const prevKeys = (state.keybinds.prev || []).map(codeToLabel).join(' / ') || '-';
    const menuKeys = (state.keybinds.menu || []).map(codeToLabel).join(' / ') || '-';
    kbdSummary.textContent = `${nextKeys}: próximo, ${prevKeys}: anterior, Ctrl+Z: desfazer, Esc: fechar, ${menuKeys}: abrir menu.`;
  }

  function clearCaptureConflicts() {
    captureConflictEls.forEach((el) => el.classList.remove('is-conflict'));
    captureConflictEls = [];
  }

  function cancelKeyCapture() {
    if (!capturingKeybind) return;
    capturingKeybind = null;
    clearCaptureConflicts();
    renderKeyboardShortcutsPanel();
  }

  function captureKeyForBinding(action, index, el) {
    cancelKeyCapture();
    capturingKeybind = { action, index, el };
    clearCaptureConflicts();
    el.classList.add('is-capturing');
    el.textContent = 'Pressione uma tecla...';
    showToast('Pressione a tecla desejada (Esc cancela)', 1600);
  }

  function renderKeyboardShortcutsPanel() {
    if (!keyboardShortcutsList || !keyboardShortcutsPanel) return;
    if (keyboardShortcutsPanel.hidden) return;

    const editable = [
      { action: 'next', label: 'Próximo caso' },
      { action: 'prev', label: 'Caso anterior' },
      { action: 'menu', label: 'Abrir/fechar menu' },
      { action: 'timer', label: 'Cronômetro (start/pausar)' },
      { action: 'competitiveToggle', label: 'Alternar competitivo' }
    ];

    keyboardShortcutsList.innerHTML = '';

    function row(label, keysEl) {
      const wrap = document.createElement('div');
      wrap.className = 'kbd-row';
      const l = document.createElement('div');
      l.className = 'kbd-row-label';
      l.textContent = label;
      wrap.appendChild(l);
      wrap.appendChild(keysEl);
      keyboardShortcutsList.appendChild(wrap);
    }

    function keyChip(text, isButton) {
      const el = document.createElement(isButton ? 'button' : 'span');
      el.className = isButton ? 'key-chip keybind-field' : 'key-chip';
      if (isButton) el.type = 'button';
      el.textContent = text;
      return el;
    }

    function keyButton(action, index, code) {
      const el = keyChip(codeToLabel(code), true);
      el.dataset.action = action;
      el.dataset.index = String(index);
      el.dataset.kbdCode = String(code || '');
      el.addEventListener('click', () => captureKeyForBinding(action, index, el));
      return el;
    }

    editable.forEach(({ action, label }) => {
      const keys = Array.isArray(state.keybinds[action]) ? state.keybinds[action] : [];
      const keysWrap = document.createElement('div');
      keysWrap.className = 'kbd-row-keys';
      keys.forEach((code, idx) => keysWrap.appendChild(keyButton(action, idx, code)));
      row(label, keysWrap);
    });

    const timerLabel = (state.keybinds.timer || []).map(codeToLabel)[0] || '-';
    const readonly = [
      { label: 'Desfazer', keys: ['Ctrl + Z'] },
      { label: 'Fechar', keys: ['Esc'] },
      { label: 'Excluir caso atual', keys: ['Ctrl + Backspace', 'Ctrl + Delete'] },
      { label: 'Resetar cronômetro', keys: [`${timerLabel} + Backspace`] }
    ];

    readonly.forEach(({ label, keys }) => {
      const keysWrap = document.createElement('div');
      keysWrap.className = 'kbd-row-keys';
      keys.forEach((t) => keysWrap.appendChild(keyChip(t, false)));
      row(label, keysWrap);
    });
  }

  function resetKeybindsToDefault() {
    cancelKeyCapture();
    state.keybinds = normalizeKeybinds(JSON.parse(JSON.stringify(defaults.keybinds || {})));
    save();
    if (shortcutsPanelOpen) renderKeyboardShortcutsPanel();
    updateShortcutTooltips();
    updateKbdSummary();
    showToast('Atalhos resetados');
  }

  function cloneState() {
    return JSON.parse(JSON.stringify(state));
  }

  function resetSolvedProgress() {
    state.solved = [];
    state.solvedHistory = [];
    state.lastCaseReport = null;
    sessionResolved = new Set();
    sessionActive = true;
    sessionTargetCount = unexcludedCases().length;
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
    showToast('Última ação desfeita');
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
    const limitMs = Math.max(3000, Number(state.competitive.limitSec || 6) * 1000);
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
    const limitMs = Math.max(3000, Number(state.competitive.limitSec || 6) * 1000);
    if (grade === 'good') applyDynamicBackground(0);
    else if (grade === 'medium') applyDynamicBackground(limitMs * 1.2);
    else applyDynamicBackground(limitMs * 2.6);
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
    const limitMs = Math.max(3000, Number(state.competitive.limitSec || 6) * 1000);
    if (ms <= limitMs) return 'good';
    if (ms <= limitMs * 1.35) return 'medium';
    return 'bad';
  }

  function availableNormalCases() {
    const blocked = new Set(state.excluded);
    if (state.removeWhenSolved) sessionResolved.forEach((id) => blocked.add(id));
    return CASE_IDS.filter((id) => !blocked.has(id));
  }

  function availableCompetitiveCases() {
    const out = [];
    const excluded = new Set(state.excluded);
    CASE_IDS.forEach((id) => {
      if (excluded.has(id)) return;
      if (!isCaseMastered(id)) out.push(id);
    });
    return out;
  }

  function availableCases() {
    return state.competitive.enabled ? availableCompetitiveCases() : availableNormalCases();
  }

  function unexcludedCases() {
    const excluded = new Set(state.excluded);
    return CASE_IDS.filter((id) => !excluded.has(id));
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
    closeMovesPanel();
  }

  function updateHistoryVisibility() {
    if (historyIndex < 0 || !history[historyIndex]) return;
    history[historyIndex].visible = caseVisible;
  }

  function preloadAnother() {
    let next = null;
    if (isOrderedTrainingMode()) {
      const list = orderedQueue();
      const idx = Math.max(0, Number(state.orderedTraining.index) || 0);
      next = list[idx + 1] || null;
    } else {
      const list = availableCases();
      next = list.find((id) => id !== currentCase) || null;
    }
    if (next) C.preloadImage(`${pageSet}/${next}.png`).catch(() => {});
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
    if (isMobileCompetitiveTimerLocked()) {
      sessionTimerBar.hidden = true;
      timerFloating.hidden = true;
      return;
    }
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
    const labels = { good: 'bom', medium: 'médio', bad: 'ruim' };
    lastCaseInfo.textContent = [
      `Último caso: ${report.caseId}`,
      `Tempo: ${fmt(report.timeMs)}`,
      `Desempenho: ${labels[report.grade] || '-'}`,
      `Resolvido ${report.solveCount} vez(es)`
    ].join(' | ');
  }

  function renderCompetitiveSetup() {
    if (!caseSetup || !caseSetupCaseId || !caseSetupText) return;
    const shouldShow = state.competitive.enabled && !completed && !!currentCase && !caseVisible;
    caseSetup.hidden = !shouldShow;
    if (!shouldShow) return;

    caseSetupCaseId.textContent = String(currentCase);
    const setSetups = SETUPS_BY_SET[pageSet] || {};
    const setup = setSetups[currentCase] || '';
    caseSetupText.textContent = setup || `Setup ainda não cadastrado para ${String(pageSet || '').toUpperCase()}.`;
  }

  function closeMovesPanel() {
    movesOpen = false;
    if (caseMovesBody) caseMovesBody.hidden = true;
    if (caseMovesToggle) {
      caseMovesToggle.setAttribute('aria-expanded', 'false');
      caseMovesToggle.classList.remove('case-moves-toggle-on');
    }
  }

  function renderMovesPanel() {
    if (!caseMoves || !caseMovesToggle || !caseMovesBody || !caseMovesCaseId || !caseMovesText) return;

    const shouldHide = completed || !currentCase || (state.competitive.enabled && !caseVisible);
    if (shouldHide) {
      caseMoves.hidden = true;
      closeMovesPanel();
      return;
    }

    caseMoves.hidden = false;
    caseMovesCaseId.textContent = String(currentCase);

    const setMoves = MOVES_BY_SET[pageSet] || {};
    const alg = setMoves[currentCase] || '';

    caseMovesToggle.disabled = false;
    caseMovesText.textContent = alg || `Movimentos ainda não cadastrados para ${String(pageSet || '').toUpperCase()}.`;
    const orderedMode = isOrderedTrainingMode();
    if (orderedMode) movesOpen = true;
    caseMovesBody.hidden = !movesOpen;
    caseMovesToggle.hidden = orderedMode;
    caseMovesToggle.setAttribute('aria-expanded', String(movesOpen));
    caseMovesToggle.classList.toggle('case-moves-toggle-on', movesOpen);

    if (caseMovesSetupWrap && caseMovesSetupText) {
      if (orderedMode && movesOpen) {
        const setSetups = SETUPS_BY_SET[pageSet] || {};
        const setup = setSetups[currentCase] || '';
        caseMovesSetupWrap.hidden = false;
        caseMovesSetupText.textContent = setup || `Setup ainda não cadastrado para ${String(pageSet || '').toUpperCase()}.`;
      } else {
        caseMovesSetupWrap.hidden = true;
        caseMovesSetupText.textContent = '';
      }
    }
  }

  async function renderCaseScene() {
    if (completed && (!sessionActive || sessionTargetCount <= 0 || sessionResolved.size < sessionTargetCount)) {
      completed = false;
    }

    renderLastCaseInfo();
    renderCompetitiveSetup();
    updateTimerDisplays();
    updateRemaining();
    updateControlsState();
    applyScale();
    renderMovesPanel();

    const showMask = !completed && state.competitive.enabled && !caseVisible;
    if (imgWrap) imgWrap.classList.toggle('show-mask', showMask);

    finalScreen.hidden = !completed;
    prevBtn.hidden = completed || state.competitive.enabled;
    nextBtn.hidden = completed;
    if (skipBtn) skipBtn.hidden = completed || isOrderedTrainingMode() || state.competitive.enabled;

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

    nextBtn.textContent = 'Próximo caso';
    caseMask.hidden = true;
    imgEl.hidden = false;
    const src = `${pageSet}/${currentCase}.png`;
    try {
      await C.preloadImage(src);
      imgEl.src = src;
    } catch (e) {
      imgEl.src = src;
    }
  }

  function updateControlsState() {
    const orderedMode = isOrderedTrainingMode();
    if (controlsRow) controlsRow.classList.toggle('single-next', state.competitive.enabled && !completed);
    prevBtn.hidden = completed || state.competitive.enabled;
    if (skipBtn) skipBtn.hidden = completed || orderedMode || state.competitive.enabled;
    if (orderedMode) {
      clampOrderedIndex();
      const curIdx = Math.max(0, Number(state.orderedTraining.index) || 0);
      prevBtn.disabled = completed || state.competitive.enabled || curIdx <= 0;
    } else {
      prevBtn.disabled = historyIndex <= 0 || completed || state.competitive.enabled;
    }
    const shouldShowRemaining = state.removeWhenSolved || state.competitive.enabled || orderedMode;
    casesRemainingEl.hidden = !shouldShowRemaining;

    if (state.competitive.enabled) {
      if (remainingLabel) remainingLabel.textContent = 'Casos restantes';
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
    } else if (orderedMode) {
      clampOrderedIndex();
      const total = orderedTotal();
      const current = total ? Math.min(total, (Number(state.orderedTraining.index) || 0) + 1) : 0;
      if (remainingLabel) remainingLabel.textContent = 'Casos';
      remainingCount.textContent = `${current}/${total}`;
      competitiveBreakdown.hidden = true;
    } else {
      if (remainingLabel) remainingLabel.textContent = 'Casos restantes';
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
      const id = String(entry.caseId).trim();
      if (CASE_ID_SET.has(id) && !seen.has(id)) {
        seen.add(id);
        ranked.push(id);
      }
    }
    CASE_IDS.forEach((id) => {
      if (!seen.has(id)) ranked.push(id);
    });
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
      state.excluded = sortCaseIds(state.excluded);
    } else {
      state.excluded.splice(idx, 1);
    }
    save();
    if (isOrderedTrainingMode()) {
      clampOrderedIndex();
      state.orderedTraining.queue = orderedQueue();
      sessionTargetCount = orderedTotal();
    }
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
    state.uiScale = sanitizeScale(state.uiScale);
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
      state.orderedTraining.index = 0;
    } else if (clearCompetitiveStats) {
      state.competitive.caseStats = {};
    }
    resetSessionTimer();
    resetRun();
    clampOrderedIndex();
    sessionTargetCount = isOrderedTrainingMode() ? orderedTotal() : unexcludedCases().length;
    sessionResolved = new Set();
    sessionActive = true;
    let first = null;
    if (isOrderedTrainingMode()) {
      state.orderedTraining.index = 0;
      const q = orderedQueue();
      state.orderedTraining.queue = q;
      first = q[0] || null;
    } else {
      first = pickNextCase();
    }
    if (!first) first = unexcludedCases()[0] || CASE_IDS[0];
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

    let next = null;
    if (isOrderedTrainingMode()) {
      const list = orderedQueue();
      state.orderedTraining.queue = list;
      clampOrderedIndex();

      const curIdxInList = list.indexOf(currentCase);
      const curIdx = curIdxInList >= 0 ? curIdxInList : Math.max(0, Number(state.orderedTraining.index) || 0);
      const nextIdx = curIdx + 1;
      state.orderedTraining.index = nextIdx;

      if (nextIdx >= list.length) {
        completeSession();
        return;
      }
      next = list[nextIdx];
    } else {
      next = pickNextCase();
    }
    if (!next) {
      showToast('Sem próximo caso no momento');
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
    if (isOrderedTrainingMode()) {
      moveToNextCaseAfterSolve(0, 'good', true);
      return;
    }
    const elapsed = state.competitive.enabled ? stopCaseTimer() : 0;
    moveToNextCaseAfterSolve(elapsed, classifyPerformance(elapsed), true);
  }

  function onSkipCase() {
    if (completed || !currentCase) return;
    if (state.competitive.enabled && !caseVisible) return;

    pushUndo('skip');
    stopCaseTimer();

    if (isOrderedTrainingMode()) {
      const list = orderedQueue();
      const idx = list.indexOf(currentCase);
      const curIdx = idx >= 0 ? idx : Math.max(0, Number(state.orderedTraining.index) || 0);
      const removed = list.splice(curIdx, 1)[0];
      if (removed) list.push(removed);
      state.orderedTraining.queue = list;
      clampOrderedIndex();
      const next = list[Math.min(curIdx, list.length - 1)] || list[0] || null;
      if (!next) return;
      setCurrentCase(next, true);
      save();
      renderCaseScene();
      preloadAnother();
      showToast('Caso pulado');
      return;
    }

    if (state.competitive.enabled) {
      const stat = getCaseStat(currentCase);
      stat.boost = Math.min(12, (Number(stat.boost) || 0) + 2);
    }

    const next = pickNextCase();
    if (!next) {
      showToast('Sem próximo caso no momento');
      return;
    }
    setCurrentCase(next, !state.competitive.enabled);
    save();
    renderCaseScene();
    preloadAnother();
    showToast('Caso pulado');
  }

  function onPreviousCase() {
    if (state.competitive.enabled) return;
    if (isOrderedTrainingMode()) {
      if (completed) return;
      const list = orderedQueue();
      const idx = list.indexOf(currentCase);
      const curIdx = idx >= 0 ? idx : Math.max(0, Number(state.orderedTraining.index) || 0);
      const prevIdx = curIdx - 1;
      if (prevIdx < 0 || !list[prevIdx]) {
        showToast('Não há caso anterior');
        return;
      }
      pushUndo('prev-ordered');
      stopCaseTimer();
      state.orderedTraining.index = prevIdx;
      state.orderedTraining.queue = list;
      setCurrentCase(list[prevIdx], true);
      save();
      renderCaseScene();
      preloadAnother();
      return;
    }
    if (completed || historyIndex <= 0) {
      showToast('Não há caso anterior');
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
      state.excluded = sortCaseIds(state.excluded);
      showToast(`Caso ${currentCase} excluído`);
    } else {
      state.excluded.splice(idx, 1);
      showToast(`Caso ${currentCase} reincluído`);
    }
    save();
    if (isOrderedTrainingMode()) {
      state.orderedTraining.queue = orderedQueue();
      clampOrderedIndex();
      sessionTargetCount = orderedTotal();
    }
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
    saveSharedScale();
    save();
    syncUiFromState();
    restartSession(true, true);
    showToast('Configurações restauradas para o padrão');
  }

  function toggleCompetitiveMode(nextValue) {
    const enable = typeof nextValue === 'boolean' ? nextValue : !state.competitive.enabled;
    state.competitive.enabled = enable;
    competitiveToggle.checked = enable;
    if (enable && state.orderedTraining.enabled) {
      state.orderedTraining.enabled = false;
      if (orderedToggle) orderedToggle.checked = false;
      state.orderedTraining.index = 0;
    }
    if (state.competitive.enabled && !IS_TOUCH_DEVICE) state.timerState.enabled = true;
    if (isMobileCompetitiveTimerLocked()) {
      state.timerState.enabled = false;
      state.timerState.autoStart = false;
    }
    save();
    restartSession(false, false);
    showToast(`Modo competitivo ${state.competitive.enabled ? 'ativado' : 'desativado'}`);
  }

  function toggleOrderedTrainingMode(nextValue) {
    const enable = typeof nextValue === 'boolean' ? nextValue : !state.orderedTraining.enabled;
    state.orderedTraining.enabled = enable;
    if (orderedToggle) orderedToggle.checked = enable;

    if (enable && state.competitive.enabled) {
      state.competitive.enabled = false;
      competitiveToggle.checked = false;
    }

    state.orderedTraining.index = 0;
    state.orderedTraining.queue = orderedQueue();
    closeMovesPanel();
    save();
    restartSession(false, false);
    showToast(`Modo treino ${state.orderedTraining.enabled ? 'ativado' : 'desativado'}`);
  }

  function syncUiFromState() {
    state.uiScale = loadSharedScale();
    enforceMobileCompetitiveTimerRule();
    removeToggle.checked = !!state.removeWhenSolved;
    keyboardToggle.checked = !!state.keyboardActions;
    timerToggle.checked = !!state.timerState.enabled;
    timerAutoToggle.checked = !!state.timerState.autoStart;
    if (orderedToggle) orderedToggle.checked = !!state.orderedTraining.enabled;
    competitiveToggle.checked = !!state.competitive.enabled;
    dynamicBgToggle.checked = !!state.competitive.dynamicBg;
    competitiveLimitInput.value = String(state.competitive.limitSec || 6);
    competitiveRepeatInput.value = String(state.competitive.repeatBase || 2);
    applyTimerBarVisibility();
    timerFloating.hidden = !state.timerState.enabled;
    applyScale();
    updateTimerDisplays();
    renderLastCaseInfo();
    updateRemaining();
    updateShortcutTooltips();
    updateKbdSummary();
    if (shortcutsPanelOpen) renderKeyboardShortcutsPanel();
  }

  function isInteractiveInput(target) {
    if (!target || !target.tagName) return false;
    const tag = target.tagName.toLowerCase();
    return tag === 'input' || tag === 'textarea' || tag === 'select';
  }

  function handleShortcuts(e) {
    if (capturingKeybind) {
      e.preventDefault();
      e.stopPropagation();

      if (e.key === 'Escape') {
        cancelKeyCapture();
        return;
      }

      if (e.ctrlKey || e.altKey || e.metaKey) {
        showToast('Use uma tecla sem Ctrl/Alt/Win', 1600);
        return;
      }

      const code = String(e.code || '').trim();
      if (!code) return;

      const blocked = new Set(['Escape', 'Backspace', 'Delete', 'Tab']);
      if (blocked.has(code)) {
        showToast('Tecla não permitida', 1600);
        return;
      }

      const { action, index, el } = capturingKeybind;
      const conflicts = [];
      const bindsObj = state.keybinds || {};
      Object.keys(bindsObj).forEach((a) => {
        const arr = Array.isArray(bindsObj[a]) ? bindsObj[a] : [];
        arr.forEach((c, i) => {
          if (a === action && i === index) return;
          if (String(c) === code) conflicts.push({ action: a, index: i });
        });
      });

      clearCaptureConflicts();
      if (conflicts.length) {
        if (el) {
          el.classList.add('is-conflict');
          captureConflictEls.push(el);
        }
        conflicts.forEach(({ action: a, index: i }) => {
          const other = keyboardShortcutsList
            ? keyboardShortcutsList.querySelector(`.keybind-field[data-action="${a}"][data-index="${i}"]`)
            : null;
          if (other) {
            other.classList.add('is-conflict');
            captureConflictEls.push(other);
          }
        });
        showToast('Essa tecla já tem atalho. Escolha outra.', 1900);
        return;
      }

      if (!Array.isArray(state.keybinds[action])) state.keybinds[action] = [];
      state.keybinds[action][index] = code;
      state.keybinds = normalizeKeybinds(state.keybinds);
      save();
      capturingKeybind = null;
      clearCaptureConflicts();
      renderKeyboardShortcutsPanel();
      updateShortcutTooltips();
      updateKbdSummary();
      showToast('Atalho atualizado');
      return;
    }

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
    if (isPlainKeydown(e) && keyMatches('competitiveToggle', e)) {
      e.preventDefault();
      toggleCompetitiveMode();
      return;
    }
    if (!state.keyboardActions) return;

    if (isPlainKeydown(e) && keyMatches('menu', e)) {
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

    if (isPlainKeydown(e) && keyMatches('timer', e)) {
      e.preventDefault();
      if (isMobileCompetitiveTimerLocked()) {
        showToast('Cronômetro total indisponível no competitivo mobile');
        return;
      }
      cArmedUntil = Date.now() + C_ARM_MS;
      state.timerState.enabled = true;
      if (state.timerState.running) stopSessionTimer();
      else startSessionTimer(true);
      syncUiFromState();
      showToast(state.timerState.running ? 'Cronômetro iniciado' : 'Cronômetro pausado');
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
        showToast('Cronômetro resetado');
      }
      return;
    }

    if (isPlainKeydown(e) && keyMatches('next', e)) {
      e.preventDefault();
      onResolveAdvance();
      return;
    }

    if (isPlainKeydown(e) && keyMatches('prev', e)) {
      e.preventDefault();
      onPreviousCase();
    }
  }

  nextBtn.addEventListener('click', onResolveAdvance);
  prevBtn.addEventListener('click', onPreviousCase);
  if (skipBtn) skipBtn.addEventListener('click', onSkipCase);
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
    showToast('Exclusões limpas');
  });

  clearSolved.addEventListener('click', () => {
    pushUndo('clear-solved');
    resetSolvedProgress();
    save();
    refreshGalleryIfOpen();
    renderCaseScene();
    showToast('Resolvidos limpos');
  });

  removeToggle.addEventListener('change', (e) => {
    pushUndo('toggle-remove');
    const next = !!e.target.checked;
    const prev = !!state.removeWhenSolved;
    state.removeWhenSolved = next;
    if (next !== prev) {
      resetSolvedProgress();
      showToast(next ? 'Fluxo ativado: reiniciando casos' : 'Fluxo desativado: resolvidos resetados');
    }
    save();
    refreshGalleryIfOpen();
    renderCaseScene();
  });

  if (keyboardShortcutsExpand && keyboardShortcutsPanel) {
    keyboardShortcutsExpand.addEventListener('click', () => {
      shortcutsPanelOpen = !shortcutsPanelOpen;
      keyboardShortcutsPanel.hidden = !shortcutsPanelOpen;
      keyboardShortcutsExpand.setAttribute('aria-expanded', String(shortcutsPanelOpen));
      if (shortcutsPanelOpen) {
        renderKeyboardShortcutsPanel();
        updateKbdSummary();
      } else {
        cancelKeyCapture();
      }
    });
  }

  if (keyboardShortcutsReset) {
    keyboardShortcutsReset.addEventListener('click', () => {
      if (!keyboardShortcutsPanel || keyboardShortcutsPanel.hidden) return;
      resetKeybindsToDefault();
    });
  }

  keyboardToggle.addEventListener('change', (e) => {
    state.keyboardActions = !!e.target.checked;
    save();
    showToast(`Atalhos ${state.keyboardActions ? 'ativados' : 'desativados'}`);
  });

  timerToggle.addEventListener('change', (e) => {
    if (isMobileCompetitiveTimerLocked()) {
      e.target.checked = false;
      state.timerState.enabled = false;
      showToast('Cronômetro total indisponível no competitivo mobile');
      save();
      syncUiFromState();
      return;
    }
    pushUndo('timer-enable');
    state.timerState.enabled = !!e.target.checked;
    if (!state.timerState.enabled) stopSessionTimer();
    save();
    syncUiFromState();
  });

  timerAutoToggle.addEventListener('change', (e) => {
    state.timerState.autoStart = !!e.target.checked;
    save();
    showToast(`Início automático ${state.timerState.autoStart ? 'ativado' : 'desativado'}`);
  });

  timerStart.addEventListener('click', () => {
    if (isMobileCompetitiveTimerLocked()) return;
    startSessionTimer(true);
  });
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

  if (caseMovesToggle) {
    caseMovesToggle.addEventListener('click', () => {
      if (caseMovesToggle.disabled) return;
      if (state.competitive.enabled && !caseVisible) return;
      movesOpen = !movesOpen;
      renderMovesPanel();
    });
  }

  imageSizeRange.addEventListener('input', (e) => {
    state.uiScale.image = Number(e.target.value);
    saveSharedScale();
    applyScale();
    save();
  });
  buttonSizeRange.addEventListener('input', (e) => {
    state.uiScale.button = Number(e.target.value);
    saveSharedScale();
    applyScale();
    save();
  });
  resetSizeBtn.addEventListener('click', () => {
    state.uiScale = { ...defaults.uiScale };
    saveSharedScale();
    applyScale();
    save();
    showToast('Tamanho restaurado');
  });

  if (orderedToggle) {
    orderedToggle.addEventListener('change', (e) => {
      toggleOrderedTrainingMode(!!e.target.checked);
    });
  }

  competitiveToggle.addEventListener('change', (e) => {
    toggleCompetitiveMode(!!e.target.checked);
  });

  competitiveLimitInput.addEventListener('change', (e) => {
    const sec = Math.max(3, Math.min(180, Number(e.target.value) || 6));
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
    clampOrderedIndex();
    sessionTargetCount = isOrderedTrainingMode() ? orderedTotal() : unexcludedCases().length;
    sessionResolved = new Set();
    sessionActive = true;
    completed = false;
    finalScreen.hidden = true;

    let first = null;
    if (isOrderedTrainingMode()) {
      state.orderedTraining.index = 0;
      state.orderedTraining.queue = orderedQueue();
      first = (state.orderedTraining.queue && state.orderedTraining.queue[0]) ? state.orderedTraining.queue[0] : null;
    } else {
      first = pickNextCase();
    }
    if (!first) {
      const fallback = unexcludedCases()[0] || CASE_IDS[0];
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
