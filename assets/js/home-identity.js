/* Academia CPOF — ciclo cromático suave, velocidade controlada pela velocidade real do mouse e pulso ao clicar. */
(()=>{
 'use strict';
 const brand=document.querySelector('.academy-home-brand');
 const letters=[...document.querySelectorAll('.academy-brand-cpof span')];
 if(!brand||letters.length!==4)return;
 const colors=[
  [249,252,255], // branco
  [234,75,75],   // vermelho
  [250,145,53],  // laranja
  [246,210,65],  // amarelo
  [62,209,121],  // verde
  [74,143,242]   // azul
 ];
 const reduce=window.matchMedia('(prefers-reduced-motion: reduce)');
 const draw=(phase)=>{
  letters.forEach((letter,i)=>{
   const p=((phase-i*.24)%colors.length+colors.length)%colors.length;
   const a=Math.floor(p),b=(a+1)%colors.length,t=p-a;
   const rgb=colors[a].map((v,j)=>Math.round(v+(colors[b][j]-v)*t));
   const [r,g,bl]=rgb;
   letter.style.color='rgb('+r+','+g+','+bl+')';
   letter.style.textShadow='0 0 9px rgba('+r+','+g+','+bl+',.66), 0 0 23px rgba('+r+','+g+','+bl+',.35)';
  });
 };
 let phase=0,velocity=0,lastPointer=null,lastMovement=-Infinity,lastFrame=0,speed=0.00052;
 let pulseIndex=0,pulseEnd=0,pulseTimeout=null;
 brand.addEventListener('click',()=>{
  pulseIndex=(pulseIndex+1)%colors.length;
  const color=colors[pulseIndex];
  brand.style.setProperty('--brand-pulse-rgb',color.join(','));
  phase=(phase+1.37+pulseIndex*.27)%colors.length;
  if(!reduce.matches){
   pulseEnd=performance.now()+750;
   brand.classList.remove('is-pulsing');
   void brand.offsetWidth; // reinicia a animação em cliques consecutivos
   brand.classList.add('is-pulsing');
   if(pulseTimeout)clearTimeout(pulseTimeout);
   pulseTimeout=setTimeout(()=>brand.classList.remove('is-pulsing'),800);
  }
  draw(phase);
 });
 if(reduce.matches){draw(0);return}
 window.addEventListener('pointermove',event=>{
  if(event.pointerType!=='mouse'&&event.pointerType!=='pen')return;
  const now=performance.now();
  if(lastPointer){
   const dt=now-lastPointer.at;
   if(dt>3&&dt<180){
    const delta=Math.hypot(event.clientX-lastPointer.x,event.clientY-lastPointer.y);
    const instantaneous=Math.min(6,delta/dt);
    // Retém uma parte do impulso: movimentos rápidos aceleram a paleta.
    velocity=Math.max(velocity*.42,instantaneous);
   }
  }
  lastPointer={x:event.clientX,y:event.clientY,at:now};
  lastMovement=now;
 },{passive:true});
 function tick(now){
  if(!lastFrame)lastFrame=now;
  const dt=Math.min(50,Math.max(0,now-lastFrame));lastFrame=now;
  if(now-lastMovement>70)velocity*=Math.exp(-dt/160);
  if(velocity<.005)velocity=0;
  const normalized=Math.min(1,velocity/3.3);
  const target=.00052+.0084*Math.pow(normalized,.9); // parado: lento, movimento rápido: até ~17x
  const easing=1-Math.exp(-dt/(target>speed?90:390));
  speed+=(target-speed)*easing;
  const clickBoost=now<pulseEnd?.0028:0;
  phase=(phase+dt*(speed+clickBoost))%colors.length;
  draw(phase);
  requestAnimationFrame(tick);
 }
 draw(phase);
 requestAnimationFrame(tick);
})();
