document.addEventListener('DOMContentLoaded',()=>{
  // animate each CPOF letter with cube colors
  const colorVars = ['#C41E3A','#0A6CF1','#FFFFFF','#FF6A00','#008A3B','#FFD200'];
  const letters = document.querySelectorAll('.cpof-letter');
  if(letters.length){
    let shift = 0;
    setInterval(()=>{
      letters.forEach((el,i)=>{
        const color = colorVars[(shift + i) % colorVars.length];
        el.style.color = color;
        el.style.textShadow = '0 4px 16px rgba(11,18,32,0.12)';
      });
      shift = (shift + 1) % colorVars.length;
    }, 400);
  }

  // navigation buttons
  const btnF2L = document.getElementById('btn-f2l');
  if(btnF2L) btnF2L.addEventListener('click', ()=> location.href='f2l.html');

  // disabled buttons show info
  document.querySelectorAll('.card.disabled').forEach(b=>{
    b.addEventListener('click', ()=> {
      // gentle toast instead of alert
      const toast = document.getElementById('toast') || createToast();
      showToast('Seção em breve — em desenvolvimento');
    });
  });

  // helper toast
  function createToast(){
    const d = document.createElement('div'); d.id='toast'; d.className='toast'; d.hidden=true;
    document.body.appendChild(d); return d;
  }
  function showToast(msg, t=1500){
    const toastEl = document.getElementById('toast') || createToast();
    toastEl.textContent = msg; toastEl.hidden = false;
    setTimeout(()=> toastEl.hidden = true, t);
  }

  // back button for f2l.html (if exists)
  const back = document.getElementById('back-btn');
  if(back) back.addEventListener('click', ()=> location.href='index.html');
});