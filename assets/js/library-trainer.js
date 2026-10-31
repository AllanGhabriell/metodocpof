import {loadLibraries,libraryList,selectedLibrary,chooseLibrary,libraryCase,selectedLibraryName,libraryError} from '../../v2/cloud/libraries.mjs';
import {PLL_NAMES} from '../../v2/data/case-catalog.mjs';
// A numeração do treinador F2L original começa pelos quatro casos básicos 38–41.
// PLL usa siglas Ua/Gd; OLL tem ordenações diferentes e exige mapeamento visual validado.
function mapped(stage,legacy){
 if(stage==='f2l'){const n=Number(legacy);if(!(n>=1&&n<=41))return null;return 'F2L-'+String(n>=38?n-37:n+4).padStart(2,'0')}
 if(stage==='pll'){const i=PLL_NAMES.indexOf(String(legacy));return i<0?null:'PLL-'+String(i+1).padStart(2,'0')}
 return null;
}
window.CPOFLibrary={
 get(stage,legacy){const id=mapped(stage,legacy);return id?libraryCase(stage,id):null},
 get name(){return selectedLibraryName()}
};
function mount(){
 const stage=document.body.dataset.set||'f2l';
 const bar=document.querySelector('.topbar');if(!bar||document.getElementById('trainer-library-choice'))return;
 const label=document.createElement('label');label.className='trainer-library-choice';label.htmlFor='trainer-library-choice';
 const span=document.createElement('span');span.textContent='Biblioteca';label.append(span);
 const select=document.createElement('select');select.id='trainer-library-choice';select.setAttribute('aria-label','Biblioteca de algoritmos');
 label.append(select);
 const alert=document.createElement('small');alert.className='trainer-library-note';alert.setAttribute('role','status');label.append(alert);
 bar.insertBefore(label,bar.lastElementChild);
 function update(){
  const id=selectedLibrary();select.replaceChildren();
  const basic=document.createElement('option');basic.value='original';basic.textContent='Original';select.append(basic);
  for(const l of libraryList().filter(l=>l.is_public)){const o=document.createElement('option');o.value=l.id;o.textContent=l.title;select.append(o)}
  select.value=libraryList().some(l=>l.id===id&&l.is_public)?id:'original';
  alert.textContent=stage==='oll'&&id!=='original'?'OLL: confira os casos no Studio; treino original não remapeado':libraryError()?'Offline: biblioteca em cache':'';
 }
 select.addEventListener('change',async()=>{select.disabled=true;try{await chooseLibrary(select.value)}catch(e){alert.textContent=e.message}finally{select.disabled=false;update()}});
 document.addEventListener('cpof:libraries-changed',update);
 update();
}
document.addEventListener('DOMContentLoaded',()=>{mount();loadLibraries().catch(()=>{})});
