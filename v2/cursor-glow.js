// Decorative pointer glow. No tracking, storage, or network requests.
if(window.matchMedia('(hover: hover) and (pointer: fine)').matches&&!window.matchMedia('(prefers-reduced-motion: reduce)').matches){
 const glow=document.createElement('div');
 glow.className='cfop-cursor-glow';
 glow.setAttribute('aria-hidden','true');
 document.body.append(glow);
 let targetX=-300,targetY=-300,x=-300,y=-300,frame=0;
 const animate=()=>{
  x+=(targetX-x)*0.65;
  y+=(targetY-y)*0.65;
  glow.style.transform='translate3d('+(x-77.5)+'px,'+(y-77.5)+'px,0)';
  if(Math.abs(x-targetX)>0.25||Math.abs(y-targetY)>0.25)frame=requestAnimationFrame(animate);
  else frame=0;
 };
 window.addEventListener('pointermove',e=>{
  if(e.pointerType!=='mouse'&&e.pointerType!=='pen')return;
  targetX=e.clientX;targetY=e.clientY;
  glow.classList.add('is-active');
  if(!frame)frame=requestAnimationFrame(animate);
 },{passive:true});
 document.addEventListener('pointerleave',()=>glow.classList.remove('is-active'));
 window.addEventListener('blur',()=>glow.classList.remove('is-active'));
}
