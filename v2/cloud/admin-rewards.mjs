import {cloudTable,isAdmin} from './cloud.mjs?v=20261031-58';
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;','"':'&#39;'}[c]));
const types=[['title','Título de RPG'],['frame','Moldura'],['name','Cor do nome'],['background','Fundo do perfil'],['aura','Aura'],['badge','Brasão'],['card','Cartão de compartilhamento']];
const styles=['classic','crystal','fire','gold','prismatic','ocean','emerald','space','arcane','prism','energy','knight','crown','royal','celestial','standard'];
let catalog=[],loaded=false,notice='';
export async function loadAdminRewards(){
 if(!isAdmin())return;try{
  const rows=await cloudTable('cfop_reward_catalog',{query:'select=id,kind,title,style_key,min_level&active=eq.true&order=min_level.asc&limit=150'});
  catalog=Array.isArray(rows)?rows:[];loaded=true;notice='';
 }catch{loaded=false;notice='Catálogo online indisponível. Execute a migração 000013.'}
}
export function adminRewardsPanel(){
 if(!isAdmin())return '';
 return '<section class="card admin-reward-panel"><h2>Gerenciador de progressão e recompensas</h2>'+
 '<p class="muted">Crie novos títulos, molduras, auras e outras recompensas. O nível mínimo define quando um item fica disponível. O XP administrativo continua sendo concedido na ficha do usuário e auditado separadamente.</p>'+
 '<form id="admin-reward-form" class="studio-form"><div class="admin-reward-grid">'+
 '<label>Identificador único<input class="field" name="id" pattern="[a-z0-9][a-z0-9_-]{2,47}" placeholder="ex.: aura-dragon" minlength="3" maxlength="48" required></label>'+
 '<label>Nome exibido<input class="field" name="title" placeholder="Ex.: Aura do Dragão" minlength="3" maxlength="65" required></label>'+
 '<label>Tipo<select class="field" name="kind">'+types.map(([a,b])=>'<option value="'+a+'">'+b+'</option>').join('')+'</select></label>'+
 '<label>Visual<select class="field" name="style">'+styles.map(x=>'<option value="'+x+'">'+x+'</option>').join('')+'</select></label>'+
 '<label>Desbloqueio no nível<input class="field" type="number" min="1" max="500" value="20" name="level" required></label>'+
 '</div><button type="submit">Salvar novo item ou atualizar pelo ID</button></form>'+
 '<p role="status" class="muted">'+esc(notice)+'</p>'+
 (loaded?'<div class="admin-reward-list">'+catalog.slice(-60).map(r=>
 '<div><span>'+esc(r.title)+'<small>'+esc(r.kind)+' · '+esc(r.id)+' · '+esc(r.style_key)+'</small></span><strong>Nível '+Number(r.min_level)+'</strong></div>').join('')+'</div>':
 '<p class="muted">O catálogo adicional ficará disponível após a configuração do banco.</p>')+
 '<p class="muted">Para desativar um item, utilize a operação administrativa autorizada com o mesmo ID. Itens exclusivos da conta criadora não podem ser concedidos por este painel.</p></section>';
}
export async function adminRewardsSubmit(form){
 if(form.id!=='admin-reward-form')return false;
 if(!isAdmin())throw Error('Somente administradores podem editar o catálogo.');
 const f=new FormData(form),id=String(f.get('id')||'').trim(),title=String(f.get('title')||'').trim(),
 kind=String(f.get('kind')),style=String(f.get('style')),level=Number(f.get('level'));
 if(!/^[a-z0-9][a-z0-9_-]{2,47}$/.test(id)||title.length<3||title.length>65||!types.some(x=>x[0]===kind)||
 !styles.includes(style)||!Number.isInteger(level)||level<1||level>500)throw Error('Revise os campos de recompensa.');
 await cloudTable('rpc/cfop_admin_reward_save',{method:'POST',body:{
  p_id:id,p_kind:kind,p_title:title,p_style:style,p_level:level,p_active:true
 }});
 await loadAdminRewards();notice='Recompensa salva no Supabase.';return true;
}
