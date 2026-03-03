export function fmt(ms) {
  const value = Math.max(0, Number(ms) || 0);
  const cent = Math.floor((value % 1000) / 10);
  const s = Math.floor(value / 1000) % 60;
  const m = Math.floor(value / 60000);
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}.${String(cent).padStart(2, '0')}`;
}

export function createSessionTimerController(state, refs, onSave) {
  let intervalId = null;

  const updateDisplays = () => {
    const elapsed = state.timerState.running
      ? (Date.now() - (state.timerState.startedAt || Date.now()))
      : (state.timerState.elapsed || 0);
    refs.timerDisplay.textContent = fmt(elapsed);
    refs.sessionTimerDisplay.textContent = fmt(elapsed);
  };

  const start = (manualRequest) => {
    if (manualRequest && !state.timerState.enabled) {
      state.timerState.enabled = true;
      refs.timerToggle.checked = true;
    }
    if (!state.timerState.enabled || state.timerState.running) return;
    state.timerState.running = true;
    state.timerState.startedAt = Date.now() - (state.timerState.elapsed || 0);
    refs.timerStart.hidden = true;
    refs.timerPause.hidden = false;
    if (intervalId) clearInterval(intervalId);
    intervalId = setInterval(() => {
      state.timerState.elapsed = Date.now() - state.timerState.startedAt;
      updateDisplays();
    }, 30);
    updateDisplays();
    onSave();
  };

  const stop = () => {
    if (intervalId) clearInterval(intervalId);
    intervalId = null;
    if (state.timerState.running) {
      state.timerState.elapsed = Date.now() - (state.timerState.startedAt || Date.now());
    }
    state.timerState.running = false;
    refs.timerStart.hidden = false;
    refs.timerPause.hidden = true;
    updateDisplays();
    onSave();
  };

  const reset = () => {
    stop();
    state.timerState.elapsed = 0;
    state.timerState.startedAt = Date.now();
    updateDisplays();
    onSave();
  };

  return { start, stop, reset, updateDisplays };
}

export function createCaseTimerController(state, refs, applyDynamicBackground) {
  let caseTimerInterval = null;
  let caseStartAt = null;
  let caseElapsed = 0;
  let smoothedCaseElapsed = 0;

  const start = () => {
    caseStartAt = Date.now();
    caseElapsed = 0;
    smoothedCaseElapsed = 0;
    refs.caseTimerDisplay.textContent = fmt(0);
    refs.caseTimerBar.hidden = false;
    applyDynamicBackground(0);
    if (caseTimerInterval) clearInterval(caseTimerInterval);
    caseTimerInterval = setInterval(() => {
      caseElapsed = Date.now() - caseStartAt;
      smoothedCaseElapsed += (caseElapsed - smoothedCaseElapsed) * 0.08;
      refs.caseTimerDisplay.textContent = fmt(caseElapsed);
      applyDynamicBackground(smoothedCaseElapsed);
    }, 30);
  };

  const stop = () => {
    if (caseTimerInterval) clearInterval(caseTimerInterval);
    caseTimerInterval = null;
    if (caseStartAt) caseElapsed = Date.now() - caseStartAt;
    smoothedCaseElapsed = caseElapsed;
    caseStartAt = null;
    refs.caseTimerBar.hidden = true;
    return caseElapsed || 0;
  };

  const hide = () => {
    if (caseTimerInterval) clearInterval(caseTimerInterval);
    caseTimerInterval = null;
    caseStartAt = null;
    refs.caseTimerBar.hidden = true;
  };

  return { start, stop, hide };
}
