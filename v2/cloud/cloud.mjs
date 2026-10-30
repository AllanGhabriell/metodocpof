import {mergeCoachState,mergeCoachActivity,mergeCubeTimes} from './coach-merge.mjs';
// Cloud backend: Supabase Auth + PostgREST. Somente chave pública no navegador.
// TODA autorização administrativa é revalidada por RLS no banco; UI não é uma barreira de segurança.
const CONF='cfop-cloud-config-v1',AUTH='cfop-cloud-session-v1',TOMBS='cfop-case-tombstones-v1';
const KEYS={progress:'cfop-studio-progress-v1',times:'cfop-v2-times',drafts:'cfop-case-drafts',tombstones:TOMBS,coach:'cpof-academy-coach-v1',academyActivity:'cpof-academy-activity-v1',scrambleTimes:'cpof-scramble-times-v1'};
let accountMessages=[],accountXp=0;let conf=read(CONF,null),session=read(AUTH,null),admin=false, published=[],lastError='',phase='local',onUpdate=()=>{},onHydrate=()=>{},busy=false,queue=false,muted=false,refreshing=null,lastSynced=0;
const esc=x=>String(x??'').replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
function read(k,otherwise){try{const v=JSON.parse(localStorage.getItem(k)||'null');return v??otherwise}catch{return otherwise}}
function save(k,v){localStorage.setItem(k,JSON.stringify(v))}
function emit(){onUpdate({configured:isConfigured(),authenticated:isAuthenticated(),admin,phase,error:lastError,lastSynced})}
function setStatus(next,error=''){phase=next;lastError=error;emit()}
export const isConfigured=()=>Boolean(conf?.url&&conf?.key);
export const isAuthenticated=()=>Boolean(session?.access_token&&session?.user?.id);
export const isAdmin=()=>isAuthenticated()&&admin;
export const cloudUser=()=>session?.user||null;
export const cloudStatus=()=>({configured:isConfigured(),authenticated:isAuthenticated(),admin,user:cloudUser(),phase,error:lastError,lastSynced});
export const publishedCases=()=>published.slice();
function validateConfig(url,key){
 const u=new URL(url.trim());
 if(u.protocol!=='https:'||!u.hostname||u.username||u.password||u.search||u.hash)throw Error('Use a URL HTTPS do projeto Supabase.');
 key=String(key||'').trim();
 if(key.length<20||key.length>3000||key.startsWith('sb_secret_')||/service_role/i.test(key))throw Error('Insira somente a chave pública (publishable/anon), nunca a chave secreta.');
 if(key.startsWith('eyJ')){
  try{const body=JSON.parse(atob(key.split('.')[1].replace(/-/g,'+').replace(/_/g,'/')));if(body.role==='service_role')throw Error('Chaves service_role são proibidas no navegador.')}catch(e){if(/proibidas/.test(String(e)))throw e}
 }
 return {url:u.origin,key};
}
export function configureCloud(url,key){
 const next=validateConfig(url,key);
 if(conf?.url!==next.url||conf.key!==next.key){session=null;admin=false;save(AUTH,null)}
 conf=next;save(CONF,conf);setStatus('configurado');return true;
}
export function disconnectCloud(){session=null;admin=false;conf=null;published=[];save(CONF,null);save(AUTH,null);setStatus('local')}
function endpoint(path){if(!isConfigured())throw Error('Conecte um projeto Supabase antes de continuar.');return conf.url+path}
function headers(auth=true,more={}){
 const h={apikey:conf.key,...more};
 if(auth&&session?.access_token)h.Authorization='Bearer '+session.access_token;
 else if(conf.key.startsWith('eyJ'))h.Authorization='Bearer '+conf.key;
 return h;
}
async function response(res){
 let data=null;try{data=await res.json()}catch{}
 if(!res.ok)throw Error(data?.msg||data?.error_description||data?.message||data?.error||('Falha de conexão: '+res.status));
 return data;
}
async function authFetch(path,method='POST',payload=null,token=null){
 const opts={method,headers:{...headers(false), 'Content-Type':'application/json'}};
 if(token)opts.headers.Authorization='Bearer '+token;
 if(payload!==null)opts.body=JSON.stringify(payload);
 return response(await fetch(endpoint('/auth/v1/'+path),opts));
}
function acceptSession(result){
 if(!result?.access_token||!result?.refresh_token||!result?.user?.id)throw Error('A sessão retornada está incompleta.');
 session={access_token:result.access_token,refresh_token:result.refresh_token,expires_at:Date.now()+Math.max(60,Number(result.expires_in)||3600)*1000,user:result.user};
 save(AUTH,session);setStatus('autenticado');
}
async function refreshSession(){
 if(!session?.refresh_token)throw Error('Sua sessão expirou. Entre novamente.');
 if(refreshing)return refreshing;
 refreshing=(async()=>{
  try{const fresh=await authFetch('token?grant_type=refresh_token','POST',{refresh_token:session.refresh_token});acceptSession(fresh)}
  catch(err){session=null;admin=false;save(AUTH,null);setStatus('sessao-expirada',String(err.message));throw err}
  finally{refreshing=null}
 })();
 return refreshing;
}
async function token(){if(!isAuthenticated())throw Error('Entre na sua conta para usar este recurso.');if(Date.now()>session.expires_at-60000)await refreshSession();return session.access_token}
export function signInWithGoogle(){
 if(!isConfigured())throw Error('Configure a URL e a chave pública do Supabase antes de entrar com Google.');
 const redirectTo=location.origin+location.pathname;
 const url=new URL(endpoint('/auth/v1/authorize'));
 url.searchParams.set('provider','google');
 url.searchParams.set('redirect_to',redirectTo);
 location.assign(url.toString());
}
export async function signIn(email,password){
 const r=await authFetch('token?grant_type=password','POST',{email:String(email).trim(),password:String(password)});
 acceptSession(r);await postLogin();return true;
}
export async function signUp(email,password){
 const redirect_to=location.origin+location.pathname;
 const r=await authFetch('signup?redirect_to='+encodeURIComponent(redirect_to),'POST',{email:String(email).trim(),password:String(password)});
 if(r.access_token){acceptSession(r);await postLogin();return 'Conta criada e conectada.'}
 setStatus('confirmar-email');return 'Cadastro solicitado. Confira seu e-mail para confirmar a conta.';
}
export async function recoverPassword(email){
 const redirect_to=location.origin+location.pathname;
 await authFetch('recover?redirect_to='+encodeURIComponent(redirect_to),'POST',{email:String(email).trim()});
 setStatus('recuperacao-enviada');return 'Se o endereço estiver cadastrado, chegará um e-mail de recuperação.';
}
export async function updatePassword(password){
 const access=await token();
 await authFetch('user','PUT',{password:String(password)},access);
 return 'Senha atualizada.';
}
export async function signOut(){
 const old=session?.access_token;
 try{if(old)await authFetch('logout','POST',{},old)}catch{}
 session=null;admin=false;save(AUTH,null);setStatus('desconectado');return true;
}
async function rest(table,{method='GET',query='',body=null,anon=false,prefer=''}={}){
 if(!anon)await token();
 const opts={method,headers:headers(!anon,{Accept:'application/json'})};
 if(body!==null){opts.headers['Content-Type']='application/json';opts.body=JSON.stringify(body)}
 if(prefer)opts.headers.Prefer=prefer;
 return response(await fetch(endpoint('/rest/v1/'+table+(query?'?'+query:'')),opts));
}
export async function cloudTable(table,options={}){return rest(table,options)}
// Telemetria mínima: só tempo de atividade em primeiro plano, sessões e resoluções.
let activityStarted=false,lastInteraction=Date.now(),activityUser=null;
export async function recordActivity(seconds=0,newSession=false,solves=0){
 if(!isAuthenticated())return;
 try{await rest('rpc/cfop_record_activity',{method:'POST',body:{p_seconds:seconds,p_session:newSession,p_solves:solves}})}catch{}
}
export function startActivityTracking(){
 if(activityStarted)return;activityStarted=true;
 for(const name of ['pointerdown','keydown','touchstart'])document.addEventListener(name,()=>{lastInteraction=Date.now()},{passive:true});
 setInterval(()=>{
  if(!isAuthenticated()||document.visibilityState!=='visible')return;
  const id=cloudUser()?.id;
  if(id!==activityUser){activityUser=id;recordActivity(0,true,0);return}
  if(Date.now()-lastInteraction<=60000)recordActivity(30,false,0);
 },30000);
}
export async function loadAccountExtras(){
 if(!isAuthenticated())return;
 try{
  const [notes,state]=await Promise.all([
   rest('cfop_user_notifications',{query:'select=id,body,created_at&order=created_at.desc&limit=20'}),
   rest('cfop_user_admin_state',{query:'select=xp_adjustment,suspended_until,suspension_reason&user_id=eq.'+encodeURIComponent(session.user.id)})
  ]);
  accountMessages=Array.isArray(notes)?notes:[];
  accountXp=Array.isArray(state)&&state.length?Number(state[0].xp_adjustment)||0:0;
 }catch{}
}
export async function cloudProfileRefresh(){return updateProfile()}
export async function checkAdmin(){
 if(!isAuthenticated()){admin=false;emit();return false}
 const rows=await rest('cfop_admins',{query:'select=user_id&user_id=eq.'+encodeURIComponent(session.user.id)});
 admin=Array.isArray(rows)&&rows.some(r=>r.user_id===session.user.id);emit();return admin;
}
export async function loadPublishedCases(){
 if(!isConfigured()){published=[];emit();return []}
 const rows=await rest('cfop_published_cases',{anon:true,query:'select=id,stage,name,algorithm,setup,diagram,expected_state,image_data,source,review_status,updated_at&order=stage.asc,id.asc&limit=250'});
 published=(rows||[]).map(r=>({id:r.id,stage:r.stage,name:r.name,algorithm:r.algorithm,setup:r.setup,diagram:r.diagram,expectedState:r.expected_state,imageData:r.image_data,source:r.source,reviewStatus:'verified',reviewed:true}));
 emit();return published.slice();
}
export async function publishCase(draft,valid){
 if(!isAdmin())throw Error('Somente administradores autorizados podem publicar.');
 if(!valid?.automaticPassed||!valid?.humanApproved||!valid?.publicationReady)throw Error('É necessário validar setup, diagrama e estado e aprovar a revisão.');
 const row={id:draft.id,stage:draft.stage,name:draft.name||'',algorithm:draft.algorithm,setup:draft.setup,diagram:draft.diagram,expected_state:draft.expectedState,image_data:draft.imageData||null,source:draft.source||'Validação manual',review_status:'verified',approved_by:session.user.id,updated_at:new Date().toISOString()};
 await rest('cfop_published_cases',{method:'POST',body:row,query:'on_conflict=id',prefer:'resolution=merge-duplicates,return=representation'});
 await loadPublishedCases();return true;
}
export async function unpublishCase(id){
 if(!isAdmin())throw Error('Somente administradores podem retirar casos publicados.');
 await rest('cfop_published_cases',{method:'DELETE',query:'id=eq.'+encodeURIComponent(id)});
 await loadPublishedCases();return true;
}
function localData(){
 return {progress:read(KEYS.progress,{}),times:read(KEYS.times,[]),
  drafts:read(KEYS.drafts,[]),tombstones:read(KEYS.tombstones,[]),
  coach:read(KEYS.coach,{}),
  academyActivity:read(KEYS.academyActivity,[]),
  scrambleTimes:read(KEYS.scrambleTimes,[])};

}
function mergeList(a=[],b=[],id,max=4000,choose=null){
 const map=new Map();
 for(const entry of [...(Array.isArray(a)?a:[]),...(Array.isArray(b)?b:[])]){
  if(!entry||typeof entry!=='object')continue;
  const k=id(entry);if(!k)continue;
  const previous=map.get(k);
  map.set(k,previous?(choose?choose(previous,entry):entry):entry);
 }
 return Array.from(map.values()).slice(-max);
}
function mergeProgress(a={},b={}){
 const x=a&&typeof a==='object'?a:{},y=b&&typeof b==='object'?b:{};
 const records=mergeList(x.records,y.records,r=>[r.time,r.date,r.type,r.xp].join('|'),2500);
 const cards=mergeList(x.cards,y.cards,c=>c.id,500,(v,w)=>{
  const va=Number(v.updatedAt)||0,wa=Number(w.updatedAt)||0;
  return wa>va?w:va>wa?v:((Number(w.interval)||0)>(Number(v.interval)||0)?w:v);
 });
 const plan=mergeList(x.plan,y.plan,p=>[p.day,p.stage,p.minutes].join('|'),120);
 const completedLessons=Array.from(new Set([...(x.completedLessons||[]),...(y.completedLessons||[])]));
 return {...y,...x,name:x.name&&x.name!=='Cubista'?x.name:(y.name||x.name||'Cubista'),records,cards,plan,completedLessons,
  goal:(Number(x.goal)!==20&&x.goal)?x.goal:(y.goal||x.goal||20),
  notified:x.notified===new Date().toISOString().slice(0,10)?x.notified:(y.notified||x.notified||'')};
}
function mergeDraft(a,b){
 const ax=Number(a.updatedAt)||0,bx=Number(b.updatedAt)||0;
 if(ax!==bx)return ax>bx?a:b;
 const score=o=>(o.imageData?2:0)+(o.diagram?3:0)+(o.expectedState?3:0)+(o.review?.approved?4:0)+(o.algorithm?1:0);
 return score(b)>score(a)?b:a;
}
function mergeData(a={},b={}){
 const ta=mergeList(a.tombstones,b.tombstones,t=>t.key,500,(x,y)=>x.at>=y.at?x:y);
 const removed=new Map(ta.map(t=>[t.key,Number(t.at)||0]));
 const drafts=mergeList(a.drafts,b.drafts,d=>d.stage+':'+d.id,400,mergeDraft)
  .filter(d=>Number(d.updatedAt||0)>=Number(removed.get(d.stage+':'+d.id)||0));
 return {
  progress:mergeProgress(a.progress,b.progress),
  times:mergeList(a.times,b.times,t=>[t.date,t.ms,t.scramble,t.penalty].join('|'),30000),
  drafts,tombstones:ta,
  coach:mergeCoachState(a.coach,b.coach),
  academyActivity:mergeCoachActivity(a.academyActivity,b.academyActivity),
  scrambleTimes:mergeCubeTimes(a.scrambleTimes,b.scrambleTimes)
 };
}
function hydrate(data){
 muted=true;
 try{
  save(KEYS.progress,data.progress);
  save(KEYS.times,data.times);
  save(KEYS.drafts,data.drafts);
  save(KEYS.tombstones,data.tombstones);
  save(KEYS.coach,data.coach);
  save(KEYS.academyActivity,data.academyActivity);
  save(KEYS.scrambleTimes,data.scrambleTimes);
  onHydrate(data);
 }finally{muted=false}
}
async function remoteState(){
 const rows=await rest('cfop_user_state',{query:'select=payload,revision&user_id=eq.'+encodeURIComponent(session.user.id)});
 return rows?.[0]||null;
}
async function syncIteration(){
 for(let tries=0;tries<4;tries++){
  const remote=await remoteState(),local=localData(),merged=mergeData(local,remote?.payload||{});
  const sameLocal=JSON.stringify(local)===JSON.stringify(merged);
  if(remote&&JSON.stringify(remote.payload)===JSON.stringify(merged)){
   if(!sameLocal)hydrate(merged);
   lastSynced=Date.now();setStatus('sincronizado');return true;
  }
  const user=session.user.id,body={user_id:user,payload:merged,revision:remote?remote.revision+1:0,updated_at:new Date().toISOString()};
  let saved;
  if(remote){
   saved=await rest('cfop_user_state',{method:'PATCH',query:'user_id=eq.'+encodeURIComponent(user)+'&revision=eq.'+remote.revision,body,prefer:'return=representation'});
  }else{
   saved=await rest('cfop_user_state',{method:'POST',body,prefer:'resolution=ignore-duplicates,return=representation'});
  }
  if(Array.isArray(saved)&&saved.length){if(!sameLocal)hydrate(merged);lastSynced=Date.now();setStatus('sincronizado');return true}
 }
 throw Error('Conflito de sincronização. Tente novamente para preservar as alterações de ambos os dispositivos.');
}
export async function syncCloud(){
 if(!isAuthenticated()||muted){return false}
 if(busy){queue=true;return false}
 busy=true;setStatus('sincronizando');
 try{await syncIteration();return true}
 catch(err){setStatus('erro-sincronizacao',err.message);throw err}
 finally{busy=false;if(queue){queue=false;setTimeout(()=>syncCloud().catch(()=>{}),500)}}
}
let debounce=null;
export function markLocalChange(){
 if(!isAuthenticated()||muted)return;
 clearTimeout(debounce);debounce=setTimeout(()=>syncCloud().catch(()=>{}),1200);
}
export function markDraftDeleted(draft){
 const key=draft.stage+':'+draft.id,existing=read(TOMBS,[]);
 save(TOMBS,mergeList(existing,[{key,at:Date.now()}],500,(a,b)=>a.at>b.at?a:b));markLocalChange();
}
async function updateProfile(){
 if(!isAuthenticated())return;
 const p=read(KEYS.progress,{}),name=String(p?.name||'Cubista').slice(0,40);
 try{
  await rest('cfop_profiles',{method:'POST',query:'on_conflict=user_id',body:{user_id:session.user.id,nickname:name,updated_at:new Date().toISOString()},prefer:'resolution=merge-duplicates'});
 }catch{}
}
export async function postLogin(){
 await checkAdmin();await syncCloud();await updateProfile();await loadPublishedCases();
}
export async function initializeCloud({changed=()=>{},hydrated=()=>{}}={}){
 onUpdate=changed;onHydrate=hydrated;
 if(!isConfigured()){setStatus('local');return}
 try{
  if(session?.refresh_token){
   if(Date.now()>Number(session.expires_at||0)-60000)await refreshSession();
   await postLogin();
  }else{setStatus('configurado');await loadPublishedCases()}
 }catch(e){setStatus('erro-conexao',e.message)}
 // Treinos feitos em outra aba são sincronizados após uma alteração local.
 if(typeof window!=='undefined')window.addEventListener('storage',event=>{
  if([KEYS.coach,KEYS.academyActivity,KEYS.scrambleTimes].includes(event.key))markLocalChange();
 });
 // Cloud data is periodically reconciled when signed in; local saving also triggers an upload.
 setInterval(()=>{if(isAuthenticated())syncCloud().catch(()=>{})},45000);
}
export async function acceptAuthRedirect(){
 if(!isConfigured())return false;
 const params=new URLSearchParams(location.hash.replace(/^#/,''));
 const access_token=params.get('access_token'),refresh_token=params.get('refresh_token');
 if(!access_token||!refresh_token)return false;
 const expires_in=Number(params.get('expires_in'))||3600;
 const user=await authFetch('user','GET',null,access_token);
 acceptSession({access_token,refresh_token,expires_in,user});
 history.replaceState(null,'',location.pathname+location.search);
 await postLogin();return true;
}
export function cloudPanel(){
 const status=cloudStatus();
 const technical=admin?'<details class="account-advanced"><summary>Configurações avançadas</summary><p class="muted">Projeto conectado: '+esc(conf?.url||'Não configurado')+'</p><p class="muted">Identificador da conta: <code>'+esc(status.user?.id||'')+'</code> <button type="button" class="secondary" data-cloud="copyid">Copiar</button></p><p class="muted">Sincronização: '+esc(phase)+(lastError?' · '+esc(lastError):'')+'</p><button type="button" class="secondary" data-cloud="disconnect">Desconectar serviço</button></details>':'';
 return '<section class="card cloud-panel account-card"><div class="account-heading"><div class="account-heading-icon" aria-hidden="true">◉</div><div><h2>Minha conta</h2><p class="muted">Acesse seus treinos e mantenha seu progresso salvo.</p></div></div>'+
 (!status.configured?
 '<p class="muted">O acesso à conta está temporariamente indisponível neste dispositivo.</p>'+
 '<details class="account-advanced"><summary>Conectar minha conta</summary><form id="cloud-configuration" class="studio-form"><label>Endereço do serviço<input name="url" type="url" class="field" placeholder="https://..." required></label><label>Chave pública<input name="key" class="field" autocomplete="off" required></label><button type="submit">Conectar</button></form></details>':
 !status.authenticated?
 '<div class="account-signin"><p>Entre para sincronizar seus tempos, progresso e preferências.</p><button type="button" class="google-signin" data-cloud="google"><span class="google-mark" aria-hidden="true">G</span> Continuar com Google</button><details class="account-email"><summary>Entrar com e-mail e senha</summary><form id="cloud-auth" class="studio-form"><label>E-mail<input class="field" name="email" type="email" autocomplete="email" required></label><label>Senha<input class="field" name="password" type="password" minlength="8" autocomplete="current-password" required></label><div class="row"><button name="mode" value="login" type="submit">Entrar</button><button name="mode" value="signup" type="submit" class="secondary">Criar conta</button><button name="mode" value="recover" type="submit" class="secondary" formnovalidate>Recuperar senha</button></div></form></details></div>':
 '<div class="account-signed-in"><div class="account-identity"><span class="account-identity-avatar" aria-hidden="true">'+esc((status.user?.email||'?')[0].toUpperCase())+'</span><div><strong>'+esc(status.user?.email||'Conta conectada')+'</strong><p class="muted">'+(status.admin?'Administrador':'Conta conectada')+'</p></div></div><div class="row"><button type="button" data-cloud="sync">Sincronizar</button></div><details class="account-email profile-fold"><summary>Segurança e acesso</summary><div class="profile-fold-content"><button type="button" class="secondary" data-cloud="logout">Sair da conta</button><p class="muted">Sua atividade é estimada apenas enquanto o aplicativo está em primeiro plano e há interação recente. Não coletamos localização ou conteúdo digitado.</p></div></details><details class="account-email profile-fold"><summary>Alterar senha</summary><form id="cloud-password" class="studio-form"><label>Nova senha<input class="field" name="password" type="password" required minlength="8"></label><button>Atualizar senha</button></form></details></div>')+
 (status.authenticated?'<details class="account-notices profile-fold"><summary><strong>Mensagens da equipe ('+accountMessages.length+')</strong></summary><div class="profile-fold-content"><p class="muted">Ajuste administrativo de XP: '+accountXp+'</p>'+(accountMessages.length?accountMessages.map(n=>'<article class="account-notice"><p>'+esc(n.body)+'</p><small>'+new Date(n.created_at).toLocaleString('pt-BR')+'</small></article>').join(''):'<p class="muted">Nenhuma mensagem recebida.</p>')+'</div></details>':'')+(status.configured?technical:'')+'</section>';
}
