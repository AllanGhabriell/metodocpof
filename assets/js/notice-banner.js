/* Mensagens administrativas fora do Studio: página inicial, treinos e cronômetro. */
import {isAuthenticated,loadAccountExtras,markNoticeRead,pendingNotices} from '../../v2/cloud/cloud.mjs?v=20261031-56';
if(!document.querySelector('link[data-cpof-notice-css]')){
 const link=document.createElement('link');
 link.rel='stylesheet';link.href='assets/css/notice-banner.css?v=20261031-1';
 link.dataset.cpofNoticeCss='1';document.head.append(link);
}
const escapeText=text=>String(text??'').replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
function update(){
 const current=document.getElementById('cpof-global-notice');
 const next=isAuthenticated()?pendingNotices()[0]:null;
 if(!next){current?.remove();return}
 if(current?.dataset.id===next.id)return;
 current?.remove();
 const layer=document.createElement('div');layer.id='cpof-global-notice';
 layer.className='cfop-notice-backdrop';layer.dataset.id=next.id;
 const count=pendingNotices().length;
 layer.innerHTML='<section class="cfop-notice-dialog" role="dialog" aria-modal="true" aria-labelledby="cpof-global-notice-title">'+
  '<span class="cfop-notice-eyebrow">RECADO DA ADMINISTRAÇÃO</span>'+
  '<h2 id="cpof-global-notice-title">'+(next.priority==='important'?'Aviso importante':'Você recebeu uma mensagem')+'</h2>'+
  '<p class="cfop-notice-text">'+escapeText(next.body)+'</p>'+
  '<p class="cfop-notice-meta">Enviada em '+new Date(next.created_at).toLocaleString('pt-BR')+
  (count>1?' · '+count+' mensagens pendentes':'')+'</p>'+
  '<button type="button">Marcar como lida</button><p class="cfop-notice-error" role="status"></p></section>';
 const button=layer.querySelector('button');
 button.addEventListener('click',async()=>{
  button.disabled=true;button.textContent='Confirmando leitura…';
  try{await markNoticeRead(next.id)}
  catch(e){layer.querySelector('[role="status"]').textContent='Falha ao marcar como lida: '+e.message;
   button.disabled=false;button.textContent='Marcar como lida'}
 });
 document.body.append(layer);
 button.focus({preventScroll:true});
}
document.addEventListener('cpof:notices-changed',update);
async function refresh(){
 if(!isAuthenticated()){update();return}
 await loadAccountExtras().catch(()=>{});
 update();
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',refresh,{once:true});
else refresh();
setInterval(()=>{if(document.visibilityState==='visible')refresh()},20000);
document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible')refresh()});
