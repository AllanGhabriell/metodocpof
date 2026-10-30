import {academyActivityData,academyDashboard} from './academy-insights.mjs';
const KEY='cfop-studio-progress-v1',DAY=86400000;
const esc=x=>String(x??'').replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const dateOf=d=>[d.getFullYear(),String(d.getMonth()+1).padStart(2,'0'),String(d.getDate()).padStart(2,'0')].join('-');
const today=()=>dateOf(new Date());
const load=()=>{try{const r=JSON.parse(localStorage.getItem(KEY)||'{}');return {...r,name:typeof r.name==='string'?r.name:'Cubista',records:Array.isArray(r.records)?r.records:[],goal:Number(r.goal)||20,plan:Array.isArray(r.plan)?r.plan:[],reminder:r.reminder||'',notified:r.notified||'',cards:Array.isArray(r.cards)?r.cards:[],challenges:Array.isArray(r.challenges)?r.challenges:[],completedLessons:Array.isArray(r.completedLessons)?r.completedLessons:[]}}catch{return {name:'Cubista',records:[],goal:20,plan:[],reminder:'',notified:'',cards:[],challenges:[]}}};
let data=load(),message='';
const save=()=>{localStorage.setItem(KEY,JSON.stringify(data));if(typeof document!=='undefined'&&typeof document.dispatchEvent==='function')document.dispatchEvent(new Event('cfop:local-change'))};
export function awardActivity(type,xp=10){data.records=[...data.records.slice(-1499),{type:String(type).slice(0,24),xp:Math.min(100,Math.max(0,xp)),date:today(),time:Date.now()}];save()}
export function reloadProgress(){data=load();return data}
export function progressData(){return data}
export function progressSummary(){
 const xp=data.records.reduce((s,r)=>s+(Number(r.xp)||0),0);
 const activity=new Set(data.records.map(r=>r.date));
 let streak=0,d=new Date();d.setHours(12,0,0,0);if(!activity.has(dateOf(d)))d.setDate(d.getDate()-1);
 while(activity.has(dateOf(d))){streak++;d.setDate(d.getDate()-1)}
 const kinds={};data.records.forEach(r=>{kinds[r.type]=(kinds[r.type]||0)+1});
 streak=academyActivityData(data.records).streak;
 return {xp,level:Math.floor(xp/200)+1,streak,today:data.records.filter(r=>r.date===today()).length,kinds};
}
export function progressDashboard(){
 const summary=progressSummary();
 return academyDashboard(data.records,summary.xp,summary.level)+
 '<section class="academy-insight-card academy-achievements"><div><span class="academy-overline">CONQUISTAS</span><h2>Seu desenvolvimento</h2><p>XP '+summary.xp+' · Nível '+summary.level+'. Continue praticando no seu ritmo.</p></div><div class="academy-achievement-chips">'+[
 ['Primeiros passos',summary.xp>=10],
 ['3 dias seguidos',summary.streak>=3],
 ['Uma semana de treino',summary.streak>=7],
 ['100 XP',summary.xp>=100],
 ['10 tempos', (academyActivityData().times.length)>=10]
 ].map(([title,earned])=>'<span class="'+(earned?'earned':'')+'">'+(earned?'★ ':'☆ ')+title+'</span>').join('')+'</div></section>';
}

const week=['Domingo','Segunda','Terça','Quarta','Quinta','Sexta','Sábado'],stage=['Cross','F2L','OLL','PLL','Livre'];
export function planPage(){
 return '<div class="eyebrow">Rotina de estudos</div><h1>Planejador semanal</h1><p class="muted">Monte um plano e configure um lembrete local quando o aplicativo estiver aberto.</p>'+
 '<div class="studio-two"><section class="card"><h2>Minha semana</h2><div class="studio-week">'+week.map((label,i)=>'<div class="studio-weekday"><strong>'+label+'</strong><span>'+ (data.plan.filter(x=>x.day===i).map(x=>esc(x.stage)+' · '+x.minutes+' min').join(' / ')||'Livre')+'</span></div>').join('')+'</div><button class="secondary" data-progress="clearplan">Limpar semana</button></section>'+
 '<section class="card"><h2>Adicionar treino</h2><form id="studio-plan-form" class="studio-form"><label>Dia<select name="day" class="field">'+week.map((label,i)=>'<option value="'+i+'">'+label+'</option>').join('')+'</select></label><label>Etapa<select name="stage" class="field">'+stage.map(x=>'<option value="'+x+'">'+x+'</option>').join('')+'</select></label><label>Minutos<input name="minutes" type="number" class="field" min="5" max="180" value="20" required></label><button type="submit">Adicionar</button></form>'+
 '<h2 class="studio-h2">Meta e lembrete</h2><form class="studio-form" id="studio-reminder-form"><label>Meta diária (minutos)<input name="goal" type="number" min="5" max="240" value="'+data.goal+'" class="field" required></label><label>Horário<input type="time" name="time" class="field" value="'+esc(data.reminder||'19:00')+'" required></label><button type="submit">Salvar lembrete</button></form><button type="button" class="secondary" data-progress="notifications">Permitir notificações</button>'+
 '<p class="muted">Sem push em segundo plano: as notificações só são verificadas enquanto o site estiver aberto e autorizado.</p></section></div>';
}
export function profilePage(){
 const activity=academyActivityData(data.records);
 const n=(data.name||'Cubista').trim(),initial=(n[0]||'C').toUpperCase();
 return '<section class="academy-profile-hero"><span class="academy-overline">SEU ESPAÇO · ACADEMIA CPOF</span><div class="academy-profile-main"><div class="academy-profile-big-avatar" aria-hidden="true">'+esc(initial)+'</div><div class="academy-profile-person"><h1>'+esc(n)+'</h1><p>Seu cubo, seus resultados e seu ritmo de aprendizagem.</p></div><button type="button" data-page="dashboard">Ver minha evolução →</button></div><div class="academy-profile-numbers"><span><strong>'+activity.streak+'</strong> dias de sequência</span><span><strong>'+activity.cases.length+'</strong> casos registrados</span><span><strong>'+activity.times.length+'</strong> tempos salvos</span></div></section>'+
 '<section class="card academy-profile-settings"><div class="academy-settings-head"><span class="academy-overline">PREFERÊNCIAS</span><h2>Suas informações</h2><p>Organize seus dados sem perder o foco nos treinos.</p></div>'+
 '<details class="profile-fold"><summary><span><strong>Editar perfil</strong><small>Como você aparece no aplicativo</small></span><span aria-hidden="true">⌄</span></summary><div class="profile-fold-content"><form class="studio-form" id="studio-profile-form"><label>Apelido<input name="name" class="field" value="'+esc(data.name)+'" maxlength="36" required></label><button>Salvar alterações</button></form><p class="muted" role="status">'+esc(message)+'</p></div></details>'+
 '<details class="profile-fold"><summary><span><strong>Backup e dados</strong><small>Exportar ou recuperar seu progresso local</small></span><span aria-hidden="true">⌄</span></summary><div class="profile-fold-content"><p class="muted">Faça um backup dos dados para evitar perder seu histórico ao trocar de aparelho ou limpar o navegador.</p><div class="studio-actions"><button data-progress="backup">Exportar dados</button><button class="secondary" data-progress="restore">Importar dados</button></div><input type="file" id="studio-file" accept=".json,application/json" hidden></div></details></section>';
}

function downloadJSON(name,obj){const blob=new Blob([JSON.stringify(obj,null,2)],{type:'application/json'});const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000)}
export function progressClick(button){
 const cmd=button.dataset.progress;if(!cmd)return false;
 if(cmd==='clearplan'&&confirm('Limpar todos os treinos planejados?')){data.plan=[];save()}
 if(cmd==='notifications'&&'Notification'in window){Notification.requestPermission().then(x=>{message=x==='granted'?'Notificações permitidas.':'Notificações não autorizadas.'})}
 if(cmd==='backup'){
  let drafts=[],times=[];
  try{drafts=JSON.parse(localStorage.getItem('cfop-case-drafts')||'[]')}catch{}
  try{times=JSON.parse(localStorage.getItem('cfop-v2-times')||'[]')}catch{}
  downloadJSON('cfop-studio-backup-completo.json',{format:KEY,data,extras:{drafts,times}});
 }
 if(cmd==='restore'){document.getElementById('studio-file')?.click();return false}
 return true;
}
export function progressSubmit(form){
 if(!['studio-plan-form','studio-reminder-form','studio-profile-form'].includes(form.id))return false;
 const f=new FormData(form);
 if(form.id==='studio-plan-form'){
  const day=Number(f.get('day')),minutes=Number(f.get('minutes')),kind=String(f.get('stage'));
  if(day>=0&&day<=6&&minutes>=5&&minutes<=180&&stage.includes(kind))data.plan.push({day,minutes,stage:kind});
 }
 if(form.id==='studio-reminder-form'){const time=String(f.get('time'));if(/^\d{2}:\d{2}$/.test(time))data.reminder=time;data.goal=Math.max(5,Math.min(240,Number(f.get('goal'))||20))}
 if(form.id==='studio-profile-form')data.name=String(f.get('name')||'Cubista').trim().slice(0,36)||'Cubista';
 save();return true;
}
export async function progressImport(file){
 if(!file||file.size>10000000){message='Arquivo muito grande ou inválido.';return false}
 try{
  const incoming=JSON.parse(await file.text());
  if(incoming.format!==KEY||!incoming.data||!Array.isArray(incoming.data.records)||!Array.isArray(incoming.data.cards))throw Error('Formato de backup inválido');
  if(!confirm('Substituir seus dados locais pelo backup?'))return false;
  const extra=incoming.extras||{};
  const drafts=Array.isArray(extra.drafts)?extra.drafts:null,times=Array.isArray(extra.times)?extra.times:null;
  if((drafts&&drafts.length>300)||(times&&times.length>30000))throw Error('Backup com registros em excesso');
  localStorage.setItem(KEY,JSON.stringify(incoming.data));
  if(drafts)localStorage.setItem('cfop-case-drafts',JSON.stringify(drafts));
  if(times)localStorage.setItem('cfop-v2-times',JSON.stringify(times));
  data=load();message='Backup importado. Os dados do cronômetro e editor também foram recuperados.';return true;
 }catch(e){message='Não foi possível importar: '+e.message;return false}
}
export function checkReminder(){
 if(!data.reminder||typeof Notification==='undefined'||Notification.permission!=='granted')return;
 const now=new Date(),clock=[String(now.getHours()).padStart(2,'0'),String(now.getMinutes()).padStart(2,'0')].join(':');
 if(clock===data.reminder&&data.notified!==today()&&progressSummary().today===0){
  const planned=data.plan.filter(x=>x.day===now.getDay());
  const body=planned.length?'Hoje: '+planned[0].stage+' por '+planned[0].minutes+' minutos.':'Sua meta de hoje é '+data.goal+' minutos. Treine no seu ritmo.';
  data.notified=today();save();new Notification('Treino CFOP',{body});
 }
}
export function saveFeatureData(){save()}
