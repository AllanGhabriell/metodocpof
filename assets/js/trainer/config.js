export const PAGE_SIZE = 6;
export const MAX_UNDO = 160;
export const C_ARM_MS = 1500;

export function getPageConfig() {
  const pageSet = (document.body.dataset.set || 'f2l').toLowerCase();
  const totalCases = Math.max(1, Number(document.body.dataset.total) || 41);
  const stateKey = `cpof_prefs_${pageSet}`;
  return { pageSet, totalCases, stateKey };
}

export function createDefaults() {
  return {
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
}
