import {loadLibraries,libraryList,selectedLibrary,chooseLibrary,libraryCase,selectedLibraryName,libraryError,selectedVariants} from '../../v2/cloud/libraries.mjs';
import {CASE_BY_ID,LIMITS,trainerCaseToCatalog} from '../../v2/data/case-catalog.mjs';

// Os IDs dos casos não são editáveis; OLL 01–57 usa a ordem da biblioteca,
// que pode diferir da numeração das imagens legadas do treinador.
export {trainerCaseToCatalog};
window.CPOFLibrary={
 get(stage,legacy){
  if(selectedLibrary()==='original')return null;
  const id=trainerCaseToCatalog(stage,legacy);
  if(!id)return null;
  const variant=libraryCase(stage,id);
  return variant||{
   id,stage,name:CASE_BY_ID.get(id)?.name||id,
   missing:true,algorithm:'',setup:'',imageData:null
  };
 },
 get name(){return selectedLibraryName()}
};
function mount(){
 const stage=document.body.dataset.set||'f2l';
 const bar=document.querySelector('.topbar');
 if(!bar||document.getElementById('trainer-library-choice'))return;
 const label=document.createElement('label');
 label.className='trainer-library-choice';
 label.htmlFor='trainer-library-choice';
 const span=document.createElement('span');
 span.textContent='Biblioteca';
 label.append(span);
 const select=document.createElement('select');
 select.id='trainer-library-choice';
 select.setAttribute('aria-label','Biblioteca de algoritmos');
 label.append(select);
 const notice=document.createElement('small');
 notice.className='trainer-library-note';
 notice.setAttribute('role','status');
 label.append(notice);
 bar.insertBefore(label,bar.lastElementChild);
 function update(){
  const id=selectedLibrary();
  select.replaceChildren();
  const basic=document.createElement('option');
  basic.value='original';basic.textContent='Original';select.append(basic);
  for(const library of libraryList().filter(l=>l.is_public)){
   const option=document.createElement('option');
   option.value=library.id;option.textContent=library.title;select.append(option)
  }
  const valid=libraryList().some(l=>l.id===id&&l.is_public);
  select.value=valid?id:'original';
  if(id==='original'||!valid){notice.textContent='';return}
  const amount=selectedVariants().filter(r=>r.status==='approved'&&CASE_BY_ID.get(r.case_id)?.stage===stage).length;
  notice.textContent=libraryError()?'Usando versão offline':amount?amount+'/'+LIMITS[stage]+' casos disponíveis':'Nenhum caso '+stage.toUpperCase()+' aprovado nesta biblioteca';
 }
 select.addEventListener('change',async()=>{
  select.disabled=true;
  try{await chooseLibrary(select.value)}
  catch(e){notice.textContent=e.message}
  finally{select.disabled=false;update()}
 });
 document.addEventListener('cpof:libraries-changed',update);
 update();
}
document.addEventListener('DOMContentLoaded',()=>{
 mount();
 loadLibraries().catch(err=>console.warn('Biblioteca indisponível:',err));
});
