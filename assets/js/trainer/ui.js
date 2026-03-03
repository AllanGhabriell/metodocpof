import { fmt } from './timer.js';

export function createToast() {
  const d = document.createElement('div');
  d.id = 'toast';
  d.className = 'toast';
  d.hidden = true;
  document.body.appendChild(d);
  return d;
}

export function showToast(toastEl, msg, t = 1400) {
  toastEl.textContent = msg;
  toastEl.hidden = false;
  setTimeout(() => {
    toastEl.hidden = true;
  }, t);
}

export function applyScale(state, refs) {
  const root = document.documentElement;
  root.style.setProperty('--case-scale', String(state.uiScale.image || 1));
  root.style.setProperty('--btn-scale', String(state.uiScale.button || 1));
  refs.imageSizeRange.value = String(state.uiScale.image || 1);
  refs.buttonSizeRange.value = String(state.uiScale.button || 1);
}

export function applyTimerBarVisibility(state, refs) {
  refs.sessionTimerBar.hidden = !state.timerState.enabled;
  refs.sessionTimerBar.classList.toggle('timer-content-hidden', !state.timerState.visible);
}

export function renderLastCaseInfo(state, refs) {
  const report = state.lastCaseReport;
  if (!report) {
    refs.lastCaseInfo.textContent = 'Nenhum caso resolvido ainda.';
    return;
  }
  const labels = { good: 'bom', medium: 'medio', bad: 'ruim' };
  refs.lastCaseInfo.textContent = [
    `Ultimo caso: ${report.caseId}`,
    `Tempo: ${fmt(report.timeMs)}`,
    `Desempenho: ${labels[report.grade] || '-'}`,
    `Resolvido ${report.solveCount} vez(es)`
  ].join(' | ');
}
