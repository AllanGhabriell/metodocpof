import {cloudTable,isAuthenticated,cloudUser,isAdmin} from '../cloud/cloud.mjs?v=20261031-58';
import {levelFromXp,normalizedRewards,availableTitles,rewardKinds} from './progression.mjs?v=20261031-rpg-2';
import {academyActivityData} from './academy-insights.mjs';
const esc=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;','"':'&#39;'}[c]));
const allowedFocus=['free','cross','f2l','oll','pll','all'];
const kinds=Object.keys(rewardKinds);
let catalog=[],creator=false,loadedFor=null,message='';
const defaults=()=>({answers:{},focus:'free',equipped:{},updated_at:''});
function key(){return 'cfop-journey-v1-'+(isAuthenticated()?(cloudUser()?.id||'unknown'):'guest')}
function clean(raw){
 const answers={},valid=['experience','solves','method','cross','f2l','oll','pll','goal'];
 for(const k of valid)if(typeof raw?.answers?.[k]==='string')answers[k]=raw.answers[k].slice(0,70);
 const equipped={};for(const kind of ['title',...kinds])if(typeof raw?.equipped?.[kind]==='string')equipped[kind]=raw.equipped[kind].slice(0,50);
 return {answers,focus:allowedFocus.includes(raw?.focus)?raw.focus:'free',equipped,updated_at:raw?.updated_at||''};
}
function local(){try{return clean(JSON.parse(localStorage.getItem(key())||'null'))}catch{return defaults()}}
let journey=defaults(),lastKey='';
function ensure(){const k=key();if(k!==lastKey){lastKey=k;journey=local();loadedFor=null;creator=false;catalog=[]}return journey}
function store(){try{localStorage.setItem(key(),JSON.stringify(journey))}catch{}}
export function isCreator(){ensure();return isAuthenticated()&&creator}
export function journeyState(){return {...ensure(),creator}}
export function journeyCatalog(){ensure();return normalizedRewards(catalog)}
export function journeyIdentity(xp){
 ensure();const p=levelFromXp(xp),special=isCreator(),items=journeyCatalog();
 const choice=kind=>{
  const q=kind==='title'?availableTitles(p.level,items):items.filter(r=>r.kind===kind);
  const selected=q.find(x=>x.id===journey.equipped[kind]&&(special||x.min_level<=p.level));
  return selected||(kind==='title'?{title:p.title,style_key:'classic'}:q.find(x=>x.style_key==='classic')||{title:'',style_key:'classic'});
 };
 return {level:p.level,xp:p.xp,percent:p.percent,needed:p.needed,earned:p.earned,
  title:special?'Deus Criador dos Cubos':choice('title').title,creator:special,
  frame:special&&!journey.equipped.frame?'creator':choice('frame').style_key,
  name:special&&!journey.equipped.name?'creator':choice('name').style_key,
  background:special&&!journey.equipped.background?'creator':choice('background').style_key,
  aura:special&&!journey.equipped.aura?'creator':choice('aura').style_key,
  badge:special&&!journey.equipped.badge?'creator':choice('badge').style_key,
  card:special&&!journey.equipped.card?'creator':choice('card').style_key};
}
export async function loadJourney(){
 ensure();const uid=cloudUser()?.id;if(!isAuthenticated()||!uid)return;
 if(loadedFor===uid)return;loadedFor=uid;
 try{
  const [list,rows,isFounder]=await Promise.all([
   cloudTable('cfop_reward_catalog',{query:'select=id,kind,title,style_key,min_level,active&active=eq.true&limit=150'}).catch(()=>[]),
   cloudTable('cfop_user_journey',{query:'select=answers,focus,equipped,updated_at&user_id=eq.'+encodeURIComponent(uid)+'&limit=1'}).catch(()=>[]),
   cloudTable('rpc/cfop_my_creator_status',{method:'POST',body:{}}).catch(()=>false)
  ]);
  if(key()!=='cfop-journey-v1-'+uid)return;
  catalog=Array.isArray(list)?list:[];creator=isFounder===true;
  const remote=rows?.[0];if(remote){
   const cached=local();
   journey=clean(Date.parse(remote.updated_at||0)>=Date.parse(cached.updated_at||0)?remote:cached);store();
  }
 }catch(e){message='Personalizações offline; serão salvas neste dispositivo.'}
 document.dispatchEvent(new Event('cfop:journey-changed'));
}
export async function persistJourney(){
 ensure();journey.updated_at=new Date().toISOString();store();
 if(!isAuthenticated())return;
 const uid=cloudUser()?.id;if(!uid)return;
 try{
  await cloudTable('cfop_user_journey',{method:'POST',prefer:'resolution=merge-duplicates,return=minimal',
   body:{user_id:uid,answers:journey.answers,focus:journey.focus,equipped:journey.equipped,updated_at:journey.updated_at}});
  message='Preferências salvas na sua conta.';
 }catch(e){message='Salvo neste aparelho. Sincronização disponível após a migração 000013.'}
}
function select(name,options,value){
 return '<label>'+name+'<select class="field" name="'+esc(value)+'"><option value="">Prefiro não responder</option>'+
 options.map(([v,l])=>'<option value="'+v+'" '+(journey.answers[value]===v?'selected':'')+'>'+l+'</option>').join('')+'</select></label>';
}
function report(records=[]){
 const a=ensure().answers,activity=academyActivityData(records),counts={cross:0,f2l:0,oll:0,pll:0};
 for(const item of activity.cases||[])if(Object.hasOwn(counts,item.stage))counts[item.stage]++;
 const focus=journey.focus;
 const names={cross:'Cross',f2l:'F2L',oll:'OLL',pll:'PLL',free:'Treino livre',all:'Todas as etapas'};
 const suggestions=[];
 if(a.solves==='learning')suggestions.push('Comece por fundamentos e pela primeira cruz antes de acelerar.');
 if(focus==='cross'||a.cross==='needs')suggestions.push('Pratique a inspeção do Cross com uma ou duas peças de meio e aumente gradualmente.');
 if(focus==='f2l'||a.f2l==='needs')suggestions.push('Priorize reconhecimento e montagem intuitiva de pares F2L; revise os casos que mais erra.');
 if(focus==='oll'||a.oll==='needs')suggestions.push('Revise OLL em grupos pequenos e distribua revisões ao longo da semana.');
 if(focus==='pll'||a.pll==='needs')suggestions.push('Treine reconhecimento e execução de PLL separadamente antes de medir velocidade.');
 if(!suggestions.length)suggestions.push('Mantenha treinos curtos e consistentes; selecione uma etapa quando desejar um plano mais específico.');
 const assessed=Object.keys(a).length;
 return '<div class="journey-report"><h3>Seu relatório de treino</h3><p>Foco atual: <strong>'+esc(names[focus]||'Treino livre')+'</strong>. '+(assessed?'Análise complementar baseada nas suas respostas e nos registros disponíveis.':'Acompanhamento automático ativo. Responder perguntas melhora a precisão das recomendações.')+'</p>'+
 '<div class="journey-stages">'+['cross','f2l','oll','pll'].map(s=>'<div><strong>'+s.toUpperCase()+'</strong><span>'+counts[s]+' práticas de casos registradas</span></div>').join('')+'</div>'+
 '<ul>'+suggestions.map(t=>'<li>'+esc(t)+'</li>').join('')+'</ul><small>Essas recomendações são estimativas; não são avaliação certificada nem exigem estudar todas as etapas.</small></div>';
}
export function journeyPanel(xp,records=[]){
 ensure();const p=journeyIdentity(xp),items=journeyCatalog(),current=journey.equipped;
 const availableTitlesList=availableTitles(p.level,items);
 const group=kind=>{
  const options=kind==='title'?availableTitlesList:items.filter(r=>r.kind===kind);
  return '<label>'+esc(kind==='title'?'Título exibido':rewardKinds[kind]||kind)+'<select class="field" data-journey-equip="'+kind+'">'+
   '<option value="">'+(kind==='title'?'Título da patente atual':'Visual clássico')+'</option>'+
   options.map(r=>'<option value="'+esc(r.id)+'" '+(current[kind]===r.id?'selected':'')+' '+(!p.creator&&r.min_level>p.level?'disabled':'')+'>'+esc(r.title)+' · Nv. '+r.min_level+(!p.creator&&r.min_level>p.level?' 🔒':'')+'</option>').join('')+'</select></label>';
 };
 return '<section class="card journey-profile"><div class="journey-identity journey-bg-'+esc(p.background)+' journey-aura-'+esc(p.aura)+'"><span class="journey-eyebrow">JORNADA NA ACADEMIA CFOP</span><div class="journey-title-row"><strong>'+esc(p.title)+'</strong>'+(p.creator?'<span class="journey-creator-mark">✦ CRIADOR</span>':'')+'</div>'+
 '<p>'+(p.creator?'Patente Divina · ':('Nível '+p.level+' · '))+p.xp.toLocaleString('pt-BR')+' XP</p><div class="journey-meter"><span style="width:'+p.percent+'%"></span></div><small>'+(p.needed?p.earned+' / '+p.needed+' XP para o próximo nível':'Nível máximo')+'</small></div>'+
 '<details class="profile-fold"><summary><strong>Minha coleção e aparência</strong><span aria-hidden="true">⌄</span></summary><div class="profile-fold-content">'+
 '<p class="muted">Desbloqueie molduras, cores, auras, brasões, cartões e títulos. Você escolhe o que equipar.</p>'+
 '<div class="journey-cosmetics">'+['title',...kinds].map(group).join('')+'</div><p id="journey-status" class="muted">'+esc(message)+'</p></div></details>'+
 '<details class="profile-fold"><summary><strong>Meu aprendizado e objetivos</strong><span aria-hidden="true">⌄</span></summary><div class="profile-fold-content">'+
 '<p class="muted">Tudo aqui é opcional. O aplicativo acompanha seus treinos normalmente, mesmo que você não responda nada.</p>'+
 '<form id="journey-answers-form" class="studio-form">'+
 '<label>Meu foco atual<select name="focus" class="field">'+
 [['free','Treino livre'],['cross','Cross'],['f2l','F2L'],['oll','OLL'],['pll','PLL'],['all','Todas as etapas']].map(([v,t])=>'<option value="'+v+'" '+(journey.focus===v?'selected':'')+'>'+t+'</option>').join('')+'</select></label>'+
 select('Há quanto tempo resolve cubo?',[['new','Começando agora'],['months','Alguns meses'],['year','1 a 2 anos'],['years','Mais de 2 anos']],'experience')+
 select('Consegue resolver sozinho?',[['learning','Ainda estou aprendendo'],['help','Com consulta'],['yes','Sim, sem ajuda']],'solves')+
 select('Qual método usa?',[['beginner','Iniciante'],['cfop','CFOP'],['other','Outro método']],'method')+
 select('Como está seu Cross?',[['needs','Tenho dificuldade'],['learning','Estou aprendendo'],['comfortable','Consigo montar'],['advanced','Planejo toda a cruz']],'cross')+
 select('Como está seu F2L?',[['needs','Tenho dificuldade'],['learning','Estou aprendendo'],['comfortable','Já pratico bem'],['advanced','Uso técnicas avançadas']],'f2l')+
 select('Como está seu OLL?',[['needs','Tenho dificuldade'],['learning','Método iniciante / 2-Look'],['comfortable','Alguns casos avançados'],['advanced','Full OLL']],'oll')+
 select('Como está seu PLL?',[['needs','Tenho dificuldade'],['learning','2-Look PLL'],['comfortable','Alguns PLLs'],['advanced','Conheço os 21 PLLs']],'pll')+
 select('Objetivo principal',[['learn','Aprender a resolver'],['accuracy','Melhorar consistência'],['speed','Diminuir tempos'],['competition','Competir']],'goal')+
 '<button type="submit">Salvar preferências e atualizar relatório</button></form>'+
 report(records)+'</div></details></section>';
}
export function journeyEquip(kind,id,level){
 ensure();if(!['title',...kinds].includes(kind))return false;
 const p=levelFromXp(level),list=kind==='title'?availableTitles(p.level,journeyCatalog()):journeyCatalog().filter(r=>r.kind===kind);
 if(id&&!list.some(x=>x.id===id&&(isCreator()||x.min_level<=p.level)))return false;
 if(id)journey.equipped[kind]=id;else delete journey.equipped[kind];
 persistJourney();return true;
}
export function journeyAnswers(form){
 ensure();if(form.id!=='journey-answers-form')return false;
 const f=new FormData(form),values={};
 for(const k of ['experience','solves','method','cross','f2l','oll','pll','goal'])if(f.get(k))values[k]=String(f.get(k)).slice(0,70);
 journey.answers=values;journey.focus=allowedFocus.includes(String(f.get('focus')))?String(f.get('focus')):'free';
 persistJourney();message='Relatório atualizado.';return true;
}
export function creatorForAdmin(){return isCreator()}
