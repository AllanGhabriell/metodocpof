export function uniqueIntList(input, totalCases) {
  if (!Array.isArray(input)) return [];
  const out = new Set();
  input.forEach((v) => {
    const n = Number(v);
    if (Number.isFinite(n) && n >= 1 && n <= totalCases) out.add(n);
  });
  return Array.from(out).sort((a, b) => a - b);
}

export function normalizeState(raw, defaults, totalCases) {
  const merged = {
    ...defaults,
    ...raw,
    timerState: { ...defaults.timerState, ...(raw.timerState || {}) },
    uiScale: { ...defaults.uiScale, ...(raw.uiScale || {}) },
    competitive: { ...defaults.competitive, ...(raw.competitive || {}) }
  };
  merged.excluded = uniqueIntList(merged.excluded, totalCases);
  merged.solved = uniqueIntList(merged.solved, totalCases);
  merged.solvedHistory = Array.isArray(merged.solvedHistory) ? merged.solvedHistory : [];
  merged.competitive.caseStats = merged.competitive.caseStats || {};
  return merged;
}

export function saveState(C, key, state) {
  state.updatedAt = new Date().toISOString();
  C.setCookie(key, state, 365);
}

export function cloneState(state) {
  return JSON.parse(JSON.stringify(state));
}
