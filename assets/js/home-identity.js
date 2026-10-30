/* Academia CPOF — Rubik palette flows left-to-right, with linear pointer-aware speed. */
(()=>{
 const letters=[...document.querySelectorAll('.academy-brand-cpof span')];
 if(letters.length!==4)return;
 const colors=[
  [249,252,255], // white
  [234,75,75],   // red
  [250,145,53],  // orange
  [246,210,65],  // yellow
  [62,209,121],  // green
  [74,143,242]   // blue
 ];
 const reduced=window.matchMedia('(prefers-reduced-motion: reduce)');
 const set=(i,rgb)=>{
  const [r,g,b]=rgb.map(Math.round);
  letters[i].style.color='rgb('+r+','+g+','+b+')';
  letters[i].style.textShadow='0 0 9px rgba('+r+','+g+','+b+',.66),0 0 22px rgba('+r+','+g+','+b+',.33)';
 };
 const paint=phase=>{
  // Positive phase and negative offsets let C change before P, O and F.
  letters.forEach((_,i)=>{
   const x=((phase-i*.23)%colors.length+colors.length)%colors.length;
   const a=Math.floor(x),b=(a+1)%colors.length,t=x-a;
   set(i,colors[a].map((v,c)=>v+(colors[b][c]-v)*t));
  });
 };
 if(reduced.matches){colors.slice(0,4).forEach((c,i)=>set(i,c));return}
 const speedNormal=1/470; // one palette transition per 470 ms
 const speedMoving=speedNormal*.26;
 let phase=0,speed=speedNormal,rampFrom=speed,rampTo=speed;
 let rampStart=0,rampLength=1,lastFrame=0,lastMouse=-Infinity,lastGoal='normal';
 document.addEventListener('pointermove',e=>{
  if(e.pointerType==='mouse')lastMouse=performance.now();
 },{passive:true});
 const tick=now=>{
  if(!lastFrame)lastFrame=now;
  const delta=Math.min(50,Math.max(0,now-lastFrame));
  lastFrame=now;
  const goal=now-lastMouse<650?'moving':'normal';
  if(goal!==lastGoal){
   lastGoal=goal;
   rampFrom=speed;
   rampTo=goal==='moving'?speedMoving:speedNormal;
   rampStart=now;
   rampLength=goal==='moving'?460:620;
  }
  const t=Math.max(0,Math.min(1,(now-rampStart)/rampLength));
  // Linear interpolation: no jumps when the pointer changes speed.
  speed=rampFrom+(rampTo-rampFrom)*t;
  phase=(phase+delta*speed)%colors.length;
  paint(phase);
  requestAnimationFrame(tick);
 };
 paint(0);
 requestAnimationFrame(tick);
})();
