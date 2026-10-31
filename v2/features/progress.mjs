import {academyActivityData,academyDashboard} from './academy-insights.mjs';
import {adminXpAdjustment,serverXpBalance} from '../cloud/cloud.mjs?v=20261031-58';
import {identityState,identityPanel} from '../cloud/identity.mjs';
import {achievementBonus,earnedAchievements} from './achievements.mjs?v=20261031-1';
const KEY='cfop-studio-progress-v1',DAY=86400000;
const esc=x=>String(x??'').replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const dateOf=d=>[d.getFullYear(),String(d.getMonth()+1).padStart(2,'0'),String(d.getDate()).padStart(2,'0')].join('-');
const today=()=>dateOf(new Date());
const load=()=>{try{const r=JSON.parse(localStorage.getItem(KEY)||'{}');return {...r,name:typeof r.name==='string'?r.name:'Cubista',records:Array.isArray(r.records)?r.records:[],goal:Number(r.goal)||20,plan:Array.isArray(r.plan)?r.plan:[],reminder:r.reminder||'',notified:r.notified||'',cards:Array.isArray(r.cards)?r.cards:[],challenges:Array.isArray(r.challenges)?r.challenges:[],completedLessons:Array.isArray(r.completedLessons)?r.completedLessons:[]}}catch{return {name:'Cubista',records:[],goal:20,plan:[],reminder:'',notified:'',cards:[],challenges:[]}}};
let data=load(),message='';
const save=()=>{localStorage.setItem(KEY,JSON.stringify(data));if(typeof document!=='undefined'&&typeof document.dispatchEvent==='function')document.dispatchEvent(new Event('cfop:local-change'))};
export function awardActivity(type,xp=10){
 const kind=String(type).slice(0,24),day=today();
 // Uma atividade idêntica no mesmo dia não cria XP nem progresso artificial.
 if(data.records.some(r=>r.type===kind&&r.date===day))return false;
 const signedIn=!!cloudUserId();
 const daily=data.records.filter(r=>r.date===day).reduce((s,r)=>s+Math.max(0,Number(r.xp)||0),0);
 const earned=signedIn?0:Math.max(0,Math.min(10,Number(xp)||0,20-daily));
 data.records=[...data.records.slice(-1499),{type:kind,xp:earned,date:day,time:Date.now()}];save();return true
}
function cloudUserId(){try{return JSON.parse(localStorage.getItem('cfop-cloud-session-v1')||'null')?.user?.id||null}catch{return null}}
export function reloadProgress(){data=load();return data}
export function progressData(){return data}
export function progressSummary(){
 const coachEvents=academyActivityData(data.records).cases;
 const earnedXp=data.records.reduce((s,r)=>s+(Number(r.xp)||0),0)+coachEvents.reduce((sum,e)=>sum+Math.max(0,Math.min(20,Number(e.xp)||0)),0)+achievementBonus(data.records);
 const xp=Math.max(0,earnedXp+serverXpBalance()+adminXpAdjustment());
 const activity=new Set(data.records.map(r=>r.date));
 let streak=0,d=new Date();d.setHours(12,0,0,0);if(!activity.has(dateOf(d)))d.setDate(d.getDate()-1);
 while(activity.has(dateOf(d))){streak++;d.setDate(d.getDate()-1)}
 const kinds={};data.records.forEach(r=>{kinds[r.type]=(kinds[r.type]||0)+1});
 streak=academyActivityData(data.records).streak;
 return {xp,level:Math.floor(xp/200)+1,streak,today:data.records.filter(r=>r.date===today()).length+coachEvents.filter(e=>dateOf(new Date(e.at))===today()).length,kinds};
}
export function progressDashboard(){
 const summary=progressSummary(),badges=earnedAchievements(data.records);
 return academyDashboard(data.records,summary.xp,summary.level)+
 '<section class="academy-insight-card academy-achievements"><div><span class="academy-overline">CONQUISTAS</span>'+
 '<h2>'+badges.filter(b=>b.earned).length+' de '+badges.length+' desbloqueadas</h2>'+
 '<p>XP '+summary.xp+' · Nível '+summary.level+'. Conquistas são calculadas a partir de treinos e tempos realmente registrados.</p></div>'+
 '<div class="academy-achievement-chips">'+badges.slice(0,8).map(b=>'<span class="'+(b.earned?'earned':'')+'">'+(b.earned?'★ ':'☆ ')+esc(b.title)+'</span>').join('')+'</div></section>';
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
 const activity=academyActivityData(data.records),id=identityState();
 const n=id.nickname||'Cubista',initial=(n[0]||'C').toUpperCase();
 const photo=id.avatar?'<img src="'+id.avatar+'" alt="Foto de perfil" class="academy-profile-photo">':esc(initial);
 return '<section class="academy-profile-hero"><span class="academy-overline">SEU ESPAÇO · ACADEMIA CFOP</span>'+
 '<div class="academy-profile-main"><div class="academy-profile-big-avatar" aria-hidden="true">'+photo+'</div>'+
 '<div class="academy-profile-person"><h1>'+esc(n)+'</h1><p>'+
 (id.userId?'Seu cubo, seus resultados e seu ritmo de aprendizagem.':
 'Visitante: seus treinos ficam neste aparelho e não estão protegidos por uma conta.')+
 '</p></div><button type="button" data-page="dashboard">Ver minha evolução →</button></div>'+
 '<div class="academy-profile-numbers"><span><strong>'+activity.streak+'</strong> dias de sequência</span>'+
 '<span><strong>'+activity.cases.length+'</strong> casos registrados</span>'+
 '<span><strong>'+activity.times.length+'</strong> tempos salvos</span></div></section>'+
 identityPanel()+
 '<section class="card academy-profile-settings"><div class="academy-settings-head"><span class="academy-overline">DADOS E BACKUP</span>'+
 '<h2>Seu progresso</h2><p>Exporte seus treinos para manter uma cópia independente.</p></div>'+
 '<details class="profile-fold"><summary><span><strong>Backup e dados</strong><small>Exportar ou recuperar seu progresso local</small></span>'+
 '<span aria-hidden="true">⌄</span></summary><div class="profile-fold-content">'+
 '<p class="muted">Visitantes dependem deste navegador; contas conectadas podem sincronizar seus dados. Um backup JSON é recomendado antes de trocar de aparelho.</p>'+
 '<div class="studio-actions"><button data-progress="backup">Exportar dados</button>'+
 '<button class="secondary" data-progress="restore">Importar dados</button></div>'+
 '<input type="file" id="studio-file" accept=".json,application/json" hidden></div></details></section>';
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
  let coach=null,academyActivity=[],scrambleTimes=[];
  try{coach=JSON.parse(localStorage.getItem('cpof-academy-coach-v1')||'null')}catch{}
  try{academyActivity=JSON.parse(localStorage.getItem('cpof-academy-activity-v1')||'[]')}catch{}
  try{scrambleTimes=JSON.parse(localStorage.getItem('cpof-scramble-times-v1')||'[]')}catch{}
  downloadJSON('academia-cfop-backup-completo.json',{
    format:KEY,data,
    extras:{drafts,times,coach,academyActivity,scrambleTimes}
  });
 }
 if(cmd==='restore'){document.getElementById('studio-file')?.click();return false}
 return true;
}
export function progressSubmit(form){
 if(!['studio-plan-form','studio-reminder-form'].includes(form.id))return false;
 const f=new FormData(form);
 if(form.id==='studio-plan-form'){
  const day=Number(f.get('day')),minutes=Number(f.get('minutes')),kind=String(f.get('stage'));
  if(day>=0&&day<=6&&minutes>=5&&minutes<=180&&stage.includes(kind))data.plan.push({day,minutes,stage:kind});
 }
 if(form.id==='studio-reminder-form'){const time=String(f.get('time'));if(/^\d{2}:\d{2}$/.test(time))data.reminder=time;data.goal=Math.max(5,Math.min(240,Number(f.get('goal'))||20))}
 // O apelido cadastrado é validado exclusivamente pelo Supabase.
 save();return true;
}
export async function progressImport(file){
 if(!file||file.size>18000000){message='Arquivo muito grande ou inválido.';return false}
 try{
  const incoming=JSON.parse(await file.text());
  if(incoming.format!==KEY||!incoming.data||!Array.isArray(incoming.data.records)||!Array.isArray(incoming.data.cards))throw Error('Formato de backup inválido');
  if(!confirm('Substituir seus dados locais pelo backup?'))return false;
  const extra=incoming.extras||{};
  const drafts=Array.isArray(extra.drafts)?extra.drafts:null,times=Array.isArray(extra.times)?extra.times:null;
  const coach=extra.coach&&typeof extra.coach==='object'&&!Array.isArray(extra.coach)?extra.coach:null;
  const academyActivity=Array.isArray(extra.academyActivity)?extra.academyActivity:null;
  const scrambleTimes=Array.isArray(extra.scrambleTimes)?extra.scrambleTimes:null;
  if((drafts&&drafts.length>300)||(times&&times.length>30000)||
     (academyActivity&&academyActivity.length>12000)||(scrambleTimes&&scrambleTimes.length>3500))throw Error('Backup com registros em excesso');
  if(coach&&(!coach.settings||!coach.stages||!['f2l','oll','pll'].every(k=>typeof coach.stages[k]?.cases==='object')))throw Error('Dados de treino inválidos');
  localStorage.setItem(KEY,JSON.stringify(incoming.data));
  if(drafts)localStorage.setItem('cfop-case-drafts',JSON.stringify(drafts));
  if(times)localStorage.setItem('cfop-v2-times',JSON.stringify(times));
  if(coach)localStorage.setItem('cpof-academy-coach-v1',JSON.stringify(coach));
  if(academyActivity)localStorage.setItem('cpof-academy-activity-v1',JSON.stringify(academyActivity));
  if(scrambleTimes)localStorage.setItem('cpof-scramble-times-v1',JSON.stringify(scrambleTimes));
  data=load();message='Backup importado: perfil, registros de treino e cronômetro foram recuperados quando presentes.';return true;
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
