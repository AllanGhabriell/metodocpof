import {cloudStatus,cloudTable,cloudUser} from './cloud.mjs?v=20261030-53';
const esc=x=>String(x??'').replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const match=/^[a-f0-9]{8}-[a-f0-9]{4}-[1-8][a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i;
let latest=[],selected=null,results=[],names={},loading=false,error='',message='',onUpdated=()=>{},lastLoad=0;
function time(ms){return (Number(ms)/1000).toFixed(2)+' s'}
function scramble(){
 const faces=['R','L','U','D','F','B'],axis={R:0,L:0,U:1,D:1,F:2,B:2},suffix=['',"'",'2'];
 let previous='',moves=[];
 for(let i=0;i<20;i++){const pool=faces.filter(m=>axis[m]!==axis[previous]);const m=pool[Math.floor(Math.random()*pool.length)];moves.push(m+suffix[Math.floor(Math.random()*suffix.length)]);previous=m}
 return moves.join(' ');
}
function shares(id){return location.origin+location.pathname+'?challenge='+id}
function safeId(id){if(!match.test(id))throw Error('Identificador de desafio inválido.');return id}
async function loadNames(ids){
 const all=[...new Set(ids)].filter(Boolean);
 if(!all.length)return;
 const pairs=all.filter(id=>!names[id]);
 if(!pairs.length)return;
 const rows=await cloudTable('cfop_profiles',{query:'select=user_id,nickname&user_id=in.('+pairs.map(encodeURIComponent).join(',')+')'});
 for(const r of rows||[])names[r.user_id]=r.nickname;
}
const active=()=>selected&&new Date(selected.expires_at)>new Date();
async function loadOne(id){
 const rows=await cloudTable('cfop_challenges',{query:'select=id,owner_id,title,scramble,target_ms,created_at,expires_at&id=eq.'+safeId(id)});
 if(!rows?.length)throw Error('Desafio não encontrado ou indisponível.');
 selected=rows[0];
 results=await cloudTable('cfop_challenge_results',{query:'select=challenge_id,user_id,elapsed_ms,penalty,updated_at&challenge_id=eq.'+id+'&limit=100'});
 await loadNames([selected.owner_id,...results.map(x=>x.user_id)]);
}
export async function onlineLoad({id=null,quiet=false}={}){
 if(!cloudStatus().authenticated)return;
 if(loading)return;
 loading=true;
 if(!quiet){message='';error='';onUpdated()}
 try{
  latest=await cloudTable('cfop_challenges',{query:'select=id,owner_id,title,scramble,target_ms,created_at,expires_at&order=created_at.desc&limit=24'});
  if(id)await loadOne(id);
  else if(selected)await loadOne(selected.id);
  await loadNames(latest.map(x=>x.owner_id));
  lastLoad=Date.now();
 }catch(err){error=err.message}
 finally{loading=false;onUpdated()}
}
export function onlineInit({updated=()=>{}}={}){
 onUpdated=updated;
 const fromUrl=new URLSearchParams(location.search).get('challenge');
 if(fromUrl&&match.test(fromUrl)){onlineLoad({id:fromUrl}).catch(()=>{})}
 setInterval(()=>{if(cloudStatus().authenticated&&selected&&Date.now()-lastLoad>24000)onlineLoad({quiet:true}).catch(()=>{})},27000);
}
function leaderboard(){
 if(!selected)return '';
 const ordered=results.slice().sort((a,b)=>{
  const score=r=>r.penalty==='DNF'?Infinity:r.elapsed_ms+(r.penalty==='+2'?2000:0);
  return score(a)-score(b);
 });
 const creator=names[selected.owner_id]||'Cubista',mine=results.find(r=>r.user_id===cloudUser()?.id);
 return '<section class="card online-selected"><div class="row between"><div><span class="panel-overline">Desafio aberto</span><h2>'+esc(selected.title)+'</h2></div><span class="tag">'+(active()?'Aceitando resultados':'Encerrado')+'</span></div>'+
 '<p class="muted">Criado por '+esc(creator)+' · Meta: '+time(selected.target_ms)+' · Válido até '+new Date(selected.expires_at).toLocaleDateString('pt-BR')+'</p>'+
 '<p class="alg">'+esc(selected.scramble)+'</p><div class="row"><button type="button" class="secondary" data-online="copy">Copiar convite</button><button type="button" class="secondary" data-online="reload">Atualizar placar</button><button type="button" class="secondary" data-online="close">Fechar</button></div>'+
 (active()?'<form id="online-result" class="studio-form online-result-form"><label>Meu tempo (segundos)<input type="number" class="field" name="seconds" min=".01" max="3600" step=".01" required value="'+(mine?(mine.elapsed_ms/1000).toFixed(2):'')+'"></label><label>Penalidade<select name="penalty" class="field"><option value="OK">Sem penalidade</option><option value="+2">+2 segundos</option><option value="DNF">DNF</option></select></label><button type="submit">Registrar meu resultado</button></form>':'')+
 '<h3>Classificação compartilhada</h3>'+
 '<p class="muted">Tempos autodeclarados pelos participantes, sem verificação de cubo físico.</p>'+
 (ordered.length?'<div class="online-leaderboard">'+ordered.map((r,i)=>'<div class="leaderboard-entry"><span>#'+(i+1)+'</span><strong>'+esc(names[r.user_id]||'Cubista')+(r.user_id===cloudUser()?.id?' (você)':'')+'</strong><span>'+esc(r.penalty==='DNF'?'DNF':time(r.elapsed_ms+(r.penalty==='+2'?2000:0)))+'</span></div>').join('')+'</div>':'<p class="muted">Nenhum resultado enviado ainda.</p>')+'</section>';
}
export function onlinePage(){
 const status=cloudStatus();
 if(!status.authenticated)return '<div class="eyebrow">Comunidade CFOP</div><h1>Desafios online</h1><section class="card"><p>Entre na sua conta para criar desafios, compartilhar convites e registrar resultados na classificação.</p><button data-page="profile">Abrir login e sincronização</button></section>';
 return '<div class="eyebrow">Comunidade CFOP</div><h1>Desafios online</h1><p class="muted">Crie e compartilhe desafios. Os resultados aparecem entre participantes autenticados. O placar atualiza automaticamente enquanto a página estiver aberta.</p>'+
 (error?'<p role="alert" class="notice">'+esc(error)+'</p>':'')+
 (selected?leaderboard():'')+
 '<div class="studio-two online-grid"><section class="card"><h2>Novo desafio</h2>'+
 '<form class="studio-form" id="online-create"><label>Nome do desafio<input class="field" name="title" maxlength="80" required placeholder="Desafio de 30 segundos"></label>'+
 '<label>Tempo-alvo (segundos)<input class="field" type="number" name="seconds" min="1" max="3600" step=".01" value="60" required></label>'+
 '<button type="submit">Criar desafio público</button></form>'+
 '<h3>Entrar por convite</h3><form id="online-join" class="studio-form"><label>ID ou link do convite<input name="invite" class="field" required placeholder="Cole o convite"></label><button type="submit" class="secondary">Abrir desafio</button></form></section>'+
 '<section class="card"><div class="row between"><h2>Desafios recentes</h2><button type="button" data-online="reload" class="secondary">Atualizar</button></div>'+
 (latest.length?'<div class="online-list">'+latest.map(c=>'<button type="button" class="online-list-item" data-online-id="'+c.id+'"><span><strong>'+esc(c.title)+'</strong><small>'+esc(names[c.owner_id]||'Cubista')+' · Meta '+time(c.target_ms)+'</small></span><span aria-hidden="true">→</span></button>').join('')+'</div>':'<p class="muted">Nenhum desafio encontrado. Crie o primeiro.</p>')+
 '</section></div><p class="muted" role="status">'+esc(message)+(loading?' · Carregando...':'')+'</p>';
}
export async function onlineSubmit(form){
 const id=form.id;if(!['online-create','online-join','online-result'].includes(id))return false;
 const input=new FormData(form);error='';message='';
 try{
  if(id==='online-create'){
   const title=String(input.get('title')||'').trim().slice(0,80),target=Number(input.get('seconds'))*1000;
   if(title.length<1||target<1000||target>3600000)throw Error('Preencha um título e tempo válidos.');
   const rows=await cloudTable('cfop_challenges',{method:'POST',body:{owner_id:cloudUser().id,title,scramble:scramble(),target_ms:Math.round(target)},prefer:'return=representation'});
   if(!rows?.[0]?.id)throw Error('Não foi possível criar o desafio.');
   await onlineLoad({id:rows[0].id});message='Desafio criado. Compartilhe o convite para outras pessoas participarem.';
  }else if(id==='online-join'){
   let invite=String(input.get('invite')||'').trim();
   if(invite.includes('?challenge=')){try{invite=new URL(invite).searchParams.get('challenge')||invite}catch{}}
   await onlineLoad({id:safeId(invite)});
   message='Convite aberto.';
  }else if(id==='online-result'){
   if(!selected||!active())throw Error('O desafio foi encerrado.');
   const ms=Math.round(Number(input.get('seconds'))*1000),penalty=String(input.get('penalty')||'OK');
   if(ms<1||ms>3600000||!['OK','+2','DNF'].includes(penalty))throw Error('Resultado inválido.');
   await cloudTable('cfop_challenge_results',{method:'POST',query:'on_conflict=challenge_id,user_id',body:{challenge_id:selected.id,user_id:cloudUser().id,elapsed_ms:ms,penalty,updated_at:new Date().toISOString()},prefer:'resolution=merge-duplicates'});
   await onlineLoad({id:selected.id});message='Seu resultado foi registrado.';
  }
 }catch(err){error=err.message}
 onUpdated();return true;
}
export async function onlineClick(button){
 const cmd=button.dataset.online,id=button.dataset.onlineId;
 if(!cmd&&!id)return false;
 error='';message='';
 try{
  if(id){await onlineLoad({id:safeId(id)});message='Desafio carregado.'}
  if(cmd==='reload')await onlineLoad({quiet:true});
  if(cmd==='close'){selected=null;results=[];message='Desafio fechado.'}
  if(cmd==='copy'){
   if(!selected)throw Error('Nenhum desafio aberto.');
   await navigator.clipboard.writeText(shares(selected.id));message='Link de convite copiado.';
  }
 }catch(err){error=err.message}
 onUpdated();return true;
}
