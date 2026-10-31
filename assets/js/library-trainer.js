import {loadLibraries,libraryList,selectedLibrary,chooseLibrary,libraryCase,selectedLibraryName,libraryError,selectedVariants,isOriginalOwner,originalBaseInfo,loadOriginalBase,defaultForStage} from '../../v2/cloud/libraries.mjs';
import {CASE_BY_ID,LIMITS,trainerCaseToCatalog} from '../../v2/data/case-catalog.mjs';
import {checkAdmin,isAdmin,cloudUser} from '../../v2/cloud/cloud.mjs?v=20261030-55';

// Os IDs dos casos não são editáveis; OLL 01–57 usa a ordem da biblioteca,
// que pode diferir da numeração das imagens legadas do treinador.
export {trainerCaseToCatalog};
window.CPOFLibrary={
 allowed(stage,ids){
  if(selectedLibrary(stage)==='original'&&(isOriginalOwner()&&originalBaseInfo().state==='active'||defaultForStage(stage)==='original'))return ids;
  return ids.filter(id=>{
   const key=trainerCaseToCatalog(stage,id);
   return key&&selectedVariants(stage).some(r=>r.case_id===key&&r.status==='approved');
  });
 },
 get(stage,legacy){
  if(selectedLibrary(stage)==='original'&&(isOriginalOwner()&&originalBaseInfo().state==='active'||defaultForStage(stage)==='original'))return null;
  const id=trainerCaseToCatalog(stage,legacy);
  if(!id)return {missing:true,algorithm:'',setup:'',imageData:null,name:'Caso não publicado'};
  const variant=libraryCase(stage,id);
  return variant||{
   id,stage,name:CASE_BY_ID.get(id)?.name||id,
   missing:true,algorithm:'',setup:'',imageData:null
  };
 },
 get name(){return selectedLibraryName('f2l')}
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
  const id=selectedLibrary(stage);
  select.replaceChildren();
  if((isOriginalOwner()&&originalBaseInfo().state==='active'||defaultForStage(stage)==='original')&&stage!=='oll'){
   const basic=document.createElement('option');basic.value='original';basic.textContent='Base original (privada)';select.append(basic);
  }
  for(const library of libraryList().filter(l=>l.is_public)){
   const option=document.createElement('option');
   option.value=library.id;option.textContent=library.title;select.append(option)
  }
  const valid=libraryList().some(l=>l.id===id&&l.is_public)||(id==='original'&&(isOriginalOwner()||defaultForStage(stage)==='original')&&stage!=='oll');
  if(!valid){
   const unavailable=document.createElement('option');unavailable.value='none';unavailable.textContent='Nenhuma biblioteca publicada';select.append(unavailable);
  }
  select.value=valid?id:'none';
  if(id==='original'&&valid){notice.textContent='Somente administrador';return}
  if(!valid){notice.textContent='Aguarde a publicação de uma biblioteca';return}
  const amount=selectedVariants(stage).filter(r=>r.status==='approved'&&CASE_BY_ID.get(r.case_id)?.stage===stage).length;
  notice.textContent=libraryError()?'Usando versão offline':amount?amount+'/'+LIMITS[stage]+' casos disponíveis':'Nenhum caso '+stage.toUpperCase()+' aprovado nesta biblioteca';
 }
 select.addEventListener('change',async()=>{
  select.disabled=true;
  try{await chooseLibrary(select.value,stage)}
  catch(e){notice.textContent=e.message}
  finally{select.disabled=false;update()}
 });
 document.addEventListener('cpof:libraries-changed',update);
 update();
}
function mountAdminPublishShortcut(){
 if(!isAdmin()||cloudUser()?.email?.toLowerCase()!=='coelhodatoca124@gmail.com')return;
 if(document.getElementById('trainer-admin-publish'))return;
 const bar=document.querySelector('.header-right')||document.querySelector('.topbar');
 if(!bar)return;
 const link=document.createElement('a');
 link.id='trainer-admin-publish';
 link.className='trainer-admin-publish';
 link.textContent='+ Publicar casos';
 link.setAttribute('aria-label','Importar PDF e publicar casos nesta etapa');
 const stage=document.body.dataset.set||'f2l';
 const update=()=>{
  const params=new URLSearchParams({stage});
  if(selectedLibrary(stage)!=='original')params.set('library',selectedLibrary(stage));
  link.href='importer.html?'+params.toString();
 };
 update();
 document.addEventListener('cpof:libraries-changed',update);
 bar.prepend(link);
}
document.addEventListener('DOMContentLoaded',()=>{
 mount();
 loadLibraries().catch(err=>console.warn('Biblioteca indisponível:',err));
 checkAdmin().then(async()=>{if(isOriginalOwner())await loadOriginalBase();mountAdminPublishShortcut()}).catch(()=>{});
});
