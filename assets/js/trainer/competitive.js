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

export function classifyPerformance(limitSec, ms) {
  const limitMs = Math.max(3000, Number(limitSec || 12) * 1000);
  if (ms <= limitMs) return 'good';
  if (ms <= limitMs * 1.35) return 'medium';
  return 'bad';
}

export function applyDynamicBackground(isEnabled, limitSec, msElapsed) {
  if (!isEnabled) {
    clearPerformanceClass();
    return;
  }
  const limitMs = Math.max(3000, Number(limitSec || 12) * 1000);
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

export function clearPerformanceClass() {
  const root = document.documentElement;
  root.style.setProperty('--bg-radial-a', '#18346a');
  root.style.setProperty('--bg-radial-b', '#2c0f4b');
  root.style.setProperty('--bg-linear-a', '#05070f');
  root.style.setProperty('--bg-linear-b', '#0f1830');
}

export function setBodyPerformanceClass(limitSec, dynamicBgEnabled, grade) {
  if (grade === 'good') {
    applyDynamicBackground(dynamicBgEnabled, limitSec, 0);
    return;
  }
  if (grade === 'medium') {
    applyDynamicBackground(dynamicBgEnabled, limitSec, Math.max(3000, Number(limitSec || 12) * 1120));
    return;
  }
  applyDynamicBackground(dynamicBgEnabled, limitSec, Math.max(3000, Number(limitSec || 12) * 1700));
}
