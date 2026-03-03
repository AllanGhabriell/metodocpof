document.addEventListener('DOMContentLoaded', () => {
  const colorVars = ['#C41E3A', '#0A6CF1', '#FFFFFF', '#FF6A00', '#008A3B', '#FFD200'];
  const letters = document.querySelectorAll('.cpof-letter');

  if (letters.length) {
    let shift = 0;
    setInterval(() => {
      letters.forEach((el, i) => {
        const color = colorVars[(shift + i) % colorVars.length];
        el.style.color = color;
        el.style.textShadow = '0 0 14px rgba(120,255,245,0.28)';
      });
      shift = (shift + 1) % colorVars.length;
    }, 400);
  }

  const btnF2L = document.getElementById('btn-f2l');
  if (btnF2L) btnF2L.addEventListener('click', () => location.href = 'f2l.html');
  const btnOLL = document.getElementById('btn-oll');
  if (btnOLL) btnOLL.addEventListener('click', () => location.href = 'oll.html');
  const btnPLL = document.getElementById('btn-pll');
  if (btnPLL) btnPLL.addEventListener('click', () => location.href = 'pll.html');

  document.querySelectorAll('.card.disabled').forEach((button) => {
    button.addEventListener('click', () => {
      showToast('Secao em breve - em desenvolvimento');
    });
  });

  function createToast() {
    const d = document.createElement('div');
    d.id = 'toast';
    d.className = 'toast';
    d.hidden = true;
    document.body.appendChild(d);
    return d;
  }

  function showToast(msg, t = 1500) {
    const toastEl = document.getElementById('toast') || createToast();
    toastEl.textContent = msg;
    toastEl.hidden = false;
    setTimeout(() => {
      toastEl.hidden = true;
    }, t);
  }

  const back = document.getElementById('back-btn');
  if (back) back.addEventListener('click', () => location.href = 'index.html');
});
