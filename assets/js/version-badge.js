/* Academia CFOP — versão central do produto.
 * A cada atualização publicada, incremente APP_VERSION (5.01, 5.02...).
 * Não confundir com versões de cache dos arquivos CSS/JS.
 */
(() => {
  const APP_VERSION = '5.03';
  window.CFOP_APP_VERSION = APP_VERSION;
  function mountVersion() {
    if (!document.body || document.getElementById('cfop-app-version')) return;
    const badge = document.createElement('span');
    badge.id = 'cfop-app-version';
    badge.textContent = 'V ' + APP_VERSION;
    badge.title = 'Versão da Academia CFOP';
    badge.setAttribute('aria-label', 'Versão ' + APP_VERSION);
    Object.assign(badge.style, {
      position: 'fixed',
      left: 'max(7px, env(safe-area-inset-left))',
      bottom: 'max(5px, env(safe-area-inset-bottom))',
      zIndex: '30',
      font: '500 10px/1.2 system-ui, sans-serif',
      letterSpacing: '.02em',
      color: 'rgba(185, 204, 231, .48)',
      background: 'transparent',
      pointerEvents: 'none',
      userSelect: 'none'
    });
    document.body.appendChild(badge);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mountVersion, { once: true });
  else mountVersion();
})();
