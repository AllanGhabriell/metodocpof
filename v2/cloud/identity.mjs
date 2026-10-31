import {cloudTable,isAuthenticated,cloudUser} from './cloud.mjs?v=20261030-55';

const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let profile={userId:null,nickname:'Cubista Anônimo',avatar:null,ready:false,nameLocked:false,avatarBlocked:false,error:''};
let lastMessage='';
export const identityState=()=>isAuthenticated()?{...profile}:{userId:null,nickname:'Cubista Anônimo',avatar:null,ready:true,nameLocked:true,avatarBlocked:true,error:''};
export const identityMessage=()=>lastMessage;
function announce(){if(typeof document!=='undefined')document.dispatchEvent(new Event('cpof:identity-changed'))}
export async function loadIdentity(){
 if(!isAuthenticated()){profile=identityState();announce();return profile}
 const user=cloudUser();if(!user?.id)return profile;
 const id=user.id;
 try{
  const [profiles,restrictions]=await Promise.all([
   cloudTable('cfop_profiles',{query:'select=user_id,nickname,avatar_data&user_id=eq.'+encodeURIComponent(id)+'&limit=1'}),
   cloudTable('cfop_user_admin_state',{query:'select=name_locked,avatar_blocked&user_id=eq.'+encodeURIComponent(id)+'&limit=1'}).catch(()=>[])
  ]);
  const item=profiles?.[0]||{},flags=restrictions?.[0]||{};
  profile={
   userId:id,
   nickname:item.nickname||'',
   avatar:typeof item.avatar_data==='string'&&item.avatar_data.startsWith('data:image/webp;base64,')?item.avatar_data:null,
   ready:true,nameLocked:!!flags.name_locked,avatarBlocked:!!flags.avatar_blocked,error:''
  };
  lastMessage='';
 }catch(e){
  profile={userId:id,nickname:'',avatar:null,ready:false,nameLocked:false,avatarBlocked:false,error:e.message};
  lastMessage='Não consegui verificar seu perfil: '+e.message;
 }
 announce();return profile;
}
export async function saveIdentity({name=null,avatar=undefined}={}){
 if(!isAuthenticated())throw Error('Entre na sua conta para salvar seu perfil.');
 const requested=name===null?null:String(name).trim().replace(/\s+/g,' ');
 if(requested!==null&&!/^[\p{L}\p{N}][\p{L}\p{N} ._-]{2,35}$/u.test(requested))
  throw Error('Escolha um nome com 3 a 36 caracteres, letras, números, espaço, ponto, hífen ou _.');
 if(requested!==null&&['cubista anônimo','cubista anonimo'].includes(requested.toLocaleLowerCase('pt-BR')))
  throw Error('Cubista Anônimo é reservado para visitantes sem conta.');
 if(avatar!==undefined&&avatar!==null&&(!avatar.startsWith('data:image/webp;base64,')||avatar.length>80000))
  throw Error('A imagem precisa ser compactada em WebP e ter até 60 KB.');
 const results=await cloudTable('rpc/cfop_set_identity',{method:'POST',body:{
  p_new_name:requested,p_set_avatar:avatar!==undefined,p_avatar_data:avatar??null
 }});
 if(!Array.isArray(results)||!results[0]?.nickname)throw Error('O banco não confirmou o perfil.');
 await loadIdentity();
 lastMessage='Perfil atualizado e confirmado na sua conta.';
 announce();return profile;
}
export function identityPanel(){
 const id=identityState(),authenticated=isAuthenticated();
 const av=id.avatar?'<img class="identity-current-photo" src="'+id.avatar+'" alt="Sua foto atual">':
  '<span class="identity-avatar-initial">'+esc((id.nickname||'C')[0].toUpperCase())+'</span>';
 const first=!id.nickname||/^Cubista-[0-9a-f]{12}$/i.test(id.nickname);
 return '<section class="card identity-editor"><div class="identity-editor-heading"><div class="identity-photo-frame">'+av+'</div><div><h2>'+
  (authenticated?'Seu nome e foto':'Cubista Anônimo')+'</h2><p class="muted">'+
  (authenticated?'O apelido é exclusivo. Sua foto é quadrada e compactada antes de ser enviada ao banco.':
   'Você pode treinar sem login. Seus registros ficam somente neste navegador e podem desaparecer ao limpar os dados ou trocar de aparelho.')+
  '</p></div></div>'+
  (authenticated?
   (id.error?'<p role="alert" class="notice">'+esc(id.error)+'</p>':'')+
   (first?'<p class="notice">Escolha um nome para personalizar sua conta. Nenhuma outra conta poderá usar o mesmo apelido.</p>':'')+
   '<form id="cfop-identity-form" class="studio-form identity-form">'+
    '<label>Nome exclusivo<input class="field" name="nickname" autocomplete="nickname" maxlength="36" minlength="3" required value="'+esc(id.nickname||'')+'" '+(id.nameLocked?'disabled':'')+' placeholder="Escolha seu apelido"></label>'+
    (id.nameLocked?'<p class="muted">A administração bloqueou mudanças no nome.</p>':'')+
    '<div class="identity-actions"><button type="submit" '+(id.nameLocked?'disabled':'')+'>Salvar nome</button>'+
    '<label class="identity-upload-link '+(id.avatarBlocked?'disabled':'')+'">Escolher foto<input type="file" id="cfop-avatar-file" accept="image/*" '+(id.avatarBlocked?'disabled':'')+' hidden></label>'+
    (id.avatar?'<button class="secondary" type="button" data-identity="remove-avatar">Remover foto</button>':'')+'</div>'+
    (id.avatarBlocked?'<p class="notice">O envio de fotos foi bloqueado pela administração.</p>':'')+
   '</form>'+
   '<div id="cfop-avatar-crop-host"></div>'+
   '<p id="cfop-identity-status" role="status" class="muted">'+esc(lastMessage)+'</p>'
  :'<a class="identity-signin-hint" href="#account-login">Entre ou crie uma conta para proteger seu histórico e escolher nome e foto.</a>')+
  '</section>';
}
