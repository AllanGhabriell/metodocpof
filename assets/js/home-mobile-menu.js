/* Menu inicial: fecha ao tocar fora ou pressionar Escape, sem bloquear links. */
(()=>{
 const details=document.querySelector('.academy-home-sidebar .academy-utility details');
 if(!details)return;
 document.addEventListener('pointerdown',event=>{
  if(details.open&&!details.contains(event.target))details.open=false;
 },{passive:true});
 document.addEventListener('keydown',event=>{
  if(event.key==='Escape'&&details.open){
   details.open=false;
   details.querySelector('summary')?.focus();
  }
 });
})();
