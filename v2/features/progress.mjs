const KEY='cfop-studio-progress-v1',DAY=86400000;
const esc=x=>String(x??'').replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const dateOf=d=>[d.getFullYear(),String(d.getMonth()+1).padStart(2,'0'),String(d.getDate()).padStart(2,'0')].join('-');
const today=()=>dateOf(new Date());
const load=()=>{try{const r=JSON.parse(localStorage.getItem(KEY)||'{}');return {name:typeof r.name==='string'?r.name:'Cubista',records:Array.isArray(r.records)?r.records:[],goal:Number(r.goal)||20,plan:Array.isArray(r.plan)?r.plan:[],reminder:r.reminder||'',notified:r.notified||'',cards:Array.isArray(r.cards)?r.cards:[],challenges:Array.isArray(r.challenges)?r.challenges:[]}}catch{return {name:'Cubista',records:[],goal:20,plan:[],reminder:'',notified:'',cards:[],challenges:[]}}};
let data=load(),message='';
const save=()=>{localStorage.setItem(KEY,JSON.stringify(data));if(typeof document!=='undefined'&&typeof document.dispatchEvent==='function')document.dispatchEvent(new Event('cfop:local-change'))};
export function awardActivity(type,xp=10){data.records=[...data.records.slice(-1499),{type:String(type).slice(0,24),xp:Math.min(100,Math.max(0,xp)),date:today(),time:Date.now()}];save()}
export function progressData(){return data}
export function progressSummary(){
 const xp=data.records.reduce((s,r)=>s+(Number(r.xp)||0),0);
 const activity=new Set(data.records.map(r=>r.date));
 let streak=0,d=new Date();d.setHours(12,0,0,0);if(!activity.has(dateOf(d)))d.setDate(d.getDate()-1);
 while(activity.has(dateOf(d))){streak++;d.setDate(d.getDate()-1)}
 const kinds={};data.records.forEach(r=>{kinds[r.type]=(kinds[r.type]||0)+1});
 return {xp,level:Math.floor(xp/200)+1,streak,today:data.records.filter(r=>r.date===today()).length,kinds};
}
export function progressDashboard(){
 const s=progressSummary(),achievements=[
 ['Primeiro treino',s.xp>=10,'10 XP'],
 ['Consistência',s.streak>=3,'3 dias consecutivos'],
 ['Uma semana',s.streak>=7,'7 dias consecutivos'],
 ['100 XP',s.xp>=100,'Alcance 100 XP'],
 ['500 XP',s.xp>=500,'Alcance 500 XP'],
 ['Cruz', (s.kinds.Cross||0)>=5,'5 exercícios de Cross'],
 ['Memorização',(s.kinds.Revisão||0)>=10,'10 revisões concluídas'],
 ['Velocidade',(s.kinds.Cronômetro||0)>=10,'10 tempos registrados']
 ];
 const recent=Array.from({length:7},(_,i)=>{const day=new Date();day.setHours(12,0,0,0);day.setDate(day.getDate()-6+i);return {date:dateOf(day),label:['D','S','T','Q','Q','S','S'][day.getDay()]}}).map(x=>({...x,value:data.records.filter(r=>r.date===x.date).reduce((s,r)=>s+(r.xp||0),0)}));
 const max=Math.max(30,...recent.map(x=>x.value));
 const due=data.cards.filter(c=>!c.due||c.due<=today()).length;
 const todayPlan=data.plan.filter(x=>x.day===new Date().getDay());
 const recommended=due>0?{title:'Revisar '+due+' cartões',text:'Há cartões de memorização esperando por você.',page:'srs',action:'Começar revisão'}:
 todayPlan.length?{title:todayPlan[0].stage+' por '+todayPlan[0].minutes+' minutos',text:'Esta atividade está no seu planejamento para hoje.',page:todayPlan[0].stage==='Cross'?'cross':'train',action:'Abrir treino'}:
 {title:'Faça uma atividade curta',text:'Um exercício de Cross ou observação já ajuda a manter a constância.',page:'cross',action:'Treinar agora'};
 const tile=(t,n)=>'<div class="studio-metric"><span>'+t+'</span><strong>'+n+'</strong></div>';
 return '<div class="eyebrow">Meu progresso</div><h1>Seu painel CFOP</h1><p class="muted">Evolução registrada neste navegador, sem sincronização entre dispositivos.</p>'+
 '<div class="studio-metrics">'+tile('Nível',s.level)+tile('XP acumulado',s.xp)+tile('Sequência',s.streak+' dias')+tile('Atividades hoje',s.today)+'</div>'+
 '<section class="card studio-recommendation"><div><span class="panel-overline">Próxima atividade sugerida</span><h2>'+esc(recommended.title)+'</h2><p class="muted">'+esc(recommended.text)+'</p></div><button data-page="'+recommended.page+'">'+recommended.action+'</button></section>'+
 '<div class="studio-two"><section class="card"><h2>Últimos 7 dias</h2><div class="studio-bars">'+recent.map(x=>'<div class="studio-bar-col"><span>'+x.value+'</span><div class="studio-bar-track"><div class="studio-bar" style="height:'+Math.round(x.value/max*100)+'%"></div></div><small>'+x.label+'</small></div>').join('')+'</div></section>'+
 '<section class="card"><h2>Conquistas</h2><div class="studio-achievements">'+achievements.map(([title,yes,desc])=>'<div class="studio-achievement '+(yes?'achieved':'')+'"><b>'+ (yes?'★':'☆')+'</b><div><strong>'+title+'</strong><small>'+desc+'</small></div></div>').join('')+'</div></section></div>'+
 '<div class="studio-actions"><button data-page="cross">Treinar Cross</button><button class="secondary" data-page="srs">Revisão espaçada</button><button class="secondary" data-page="plan">Planejar treinos</button></div>';
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
 return '<div class="eyebrow">Perfil e dados</div><h1>Seu perfil local</h1><p class="muted">Você pode usar o aplicativo sem conta. A conta online e a sincronização só ficam ativas depois que você conecta um projeto Supabase. Seu progresso local continua disponível sem conexão.</p>'+
 '<div class="studio-two"><section class="card"><h2>Personalização</h2><form class="studio-form" id="studio-profile-form"><label>Apelido<input name="name" class="field" value="'+esc(data.name)+'" maxlength="36" required></label><button>Salvar</button></form>'+
 '<p class="notice">Perfil local · Não é uma conta online.</p><div class="studio-actions"><button data-progress="backup">Exportar progresso</button><button class="secondary" data-progress="restore">Importar progresso</button></div><input type="file" id="studio-file" accept=".json,application/json" hidden>'+
 '<p class="muted" role="status">'+esc(message)+'</p></section><section class="card"><h2>Seus dados</h2><p class="muted">O backup inclui progresso, cartões, planejamento, tempos e rascunhos de revisão, inclusive imagens locais. Para trocar de dispositivo, exporte e importe o arquivo. Não o compartilhe publicamente.</p></section></div>';
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
  const due=data.cards.filter(c=>!c.due||c.due<=today()).length;
  const body=due?'Você tem '+due+' cartões para revisar.':planned.length?'Hoje: '+planned[0].stage+' por '+planned[0].minutes+' minutos.':'Sua meta de hoje é '+data.goal+' minutos.';
  data.notified=today();save();new Notification('Treino CFOP',{body});
 }
}
export function saveFeatureData(){save()}
