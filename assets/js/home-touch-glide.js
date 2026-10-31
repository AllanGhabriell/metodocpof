/* Visualização de hover por arrasto no touch. Não converte gestos em cliques nem interfere na rolagem. */
(()=>{
 'use strict';
 if(!document.body.classList.contains('academy-home'))return;
 const selector='.academy-home-profile, .academy-home-brand, .academy-home-rail > .academy-rail-link, .academy-home-rail .academy-utility summary, .academy-home-streak, .academy-side-menu a, .home-actions .academy-stage';
 let touchId=null,active=null,clearTimer=0;
 function highlight(element){
  if(active===element)return;
  if(active)active.classList.remove('is-touch-gliding');
  active=element;
  if(active)active.classList.add('is-touch-gliding');
 }
 function hoverAt(x,y){
  const element=document.elementFromPoint(x,y);
  const button=element?.closest(selector);
  highlight(button&&document.body.contains(button)?button:null);
 }
 function release(){
  touchId=null;
  window.clearTimeout(clearTimer);
  clearTimer=window.setTimeout(()=>highlight(null),150);
 }
 document.addEventListener('pointerdown',e=>{
  if(e.pointerType!=='touch'||touchId!==null)return;
  window.clearTimeout(clearTimer);
  touchId=e.pointerId;
  hoverAt(e.clientX,e.clientY);
 },{passive:true});
 document.addEventListener('pointermove',e=>{
  if(e.pointerType==='touch'&&e.pointerId===touchId)hoverAt(e.clientX,e.clientY);
 },{passive:true});
 document.addEventListener('pointerup',e=>{if(e.pointerId===touchId)release()},{passive:true});
 document.addEventListener('pointercancel',e=>{if(e.pointerId===touchId)release()},{passive:true});
 window.addEventListener('blur',()=>{touchId=null;highlight(null)});
})();