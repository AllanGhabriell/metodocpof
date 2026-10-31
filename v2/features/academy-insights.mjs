/* Dados locais verificáveis: resoluções do cronômetro e casos registrados no treinador. */
const DAY=86400000;
function safeArray(name){try{const x=JSON.parse(localStorage.getItem(name)||'[]');return Array.isArray(x)?x:[]}catch{return []}}
const localDate=value=>{const d=new Date(value);if(!Number.isFinite(d.getTime()))return '';return [d.getFullYear(),String(d.getMonth()+1).padStart(2,'0'),String(d.getDate()).padStart(2,'0')].join('-')};
const recentDays=count=>Array.from({length:count},(_,i)=>{const d=new Date();d.setHours(12,0,0,0);d.setDate(d.getDate()-(count-1-i));return {key:localDate(d),day:d}});
const average=arr=>arr.length?arr.reduce((a,b)=>a+b,0)/arr.length:null;
const formatSeconds=ms=>Number.isFinite(ms)?(ms/1000).toFixed(2)+'s':'—';
export function academyActivityData(extraRecords=[]){
 const cases=safeArray('cpof-academy-activity-v1').filter(r=>['f2l','oll','pll'].includes(r?.stage)&&r?.caseId!=null&&Number.isFinite(Number(r.at)));
 const times=safeArray('cpof-scramble-times-v1').filter(r=>Number.isFinite(r?.ms)&&r.ms>=1000&&r.ms<=3600000&&typeof r.date==='string');
 const byDate=new Map();
 const add=(key,type)=>{if(!key)return;const r=byDate.get(key)||{date:key,cases:0,solves:0,other:0};r[type]++;byDate.set(key,r)};
 for(const x of cases)add(localDate(x.at),'cases');
 for(const t of times)add(localDate(t.date),'solves');
 // XP activities from the current and older Learning/Cross pages count as activity, not as cube solves.
 for(const x of extraRecords){if(x?.date&&/\d{4}-\d{2}-\d{2}/.test(x.date))add(x.date,'other')}
 const days=recentDays(42),today=days.at(-1)?.key,yesterday=days.at(-2)?.key;
 let streak=0;const active=new Set([...byDate.keys()].filter(k=>{const x=byDate.get(k);return x.cases+x.solves+x.other>0}));
 const cursor=new Date();cursor.setHours(12,0,0,0);if(!active.has(today))cursor.setDate(cursor.getDate()-1);
 while(active.has(localDate(cursor))){streak++;cursor.setDate(cursor.getDate()-1)}
 const speed=times.slice(-45).map(t=>t.ms),best=speed.length?Math.min(...speed):null,mean=average(speed);
 const deviation=mean&&speed.length>1?Math.sqrt(speed.reduce((s,x)=>s+(x-mean)**2,0)/speed.length):null;
 return {cases,times,byDate,days,today,yesterday,streak,speed,best,mean,deviation};
}
function linePlot(data){
 const values=data.speed;if(values.length<2)return '<div class="academy-empty-chart">Registre pelo menos dois tempos no cronômetro para visualizar sua evolução de velocidade.</div>';
 const w=640,h=210,pad=28,lo=Math.min(...values),hi=Math.max(...values),delta=Math.max(1000,hi-lo);
 const points=values.map((n,i)=>({x:pad+i*(w-pad*2)/(values.length-1),y:h-pad-((n-lo)/delta)*(h-pad*2)}));
 const path=points.map((v,i)=>(i?'L':'M')+v.x.toFixed(1)+' '+v.y.toFixed(1)).join(' ');
 const mid=((hi+lo)/2/1000).toFixed(1)+'s';
 return '<svg class="academy-speed-chart" viewBox="0 0 640 210" role="img" aria-label="Últimas '+values.length+' resoluções, da mais antiga à mais recente, em segundos"><line x1="28" y1="28" x2="612" y2="28"/><line x1="28" y1="105" x2="612" y2="105"/><line x1="28" y1="182" x2="612" y2="182"/><text x="29" y="20">'+(hi/1000).toFixed(1)+'s</text><text x="29" y="99">'+mid+'</text><text x="29" y="200">'+(lo/1000).toFixed(1)+'s</text><path class="academy-speed-line" d="'+path+'"/>'+points.map((p,i)=>i===values.length-1?'<circle cx="'+p.x+'" cy="'+p.y+'" r="4"/>':'').join('')+'</svg>';
}
function dailyBars(summary){const days=summary.days.slice(-7),values=days.map(d=>{const v=summary.byDate.get(d.key);return v?v.cases+v.solves+v.other:0});const max=Math.max(1,...values);
 return '<div class="academy-daily-bars">'+days.map((d,i)=>'<div class="academy-day-col" title="'+d.key+': '+values[i]+' atividades"><strong>'+values[i]+'</strong><div class="academy-day-track"><span style="height:'+Math.round(values[i]/max*100)+'%"></span></div><small>'+['D','S','T','Q','Q','S','S'][d.day.getDay()]+'</small></div>').join('')+'</div>';
}

// Preferências compartilhadas com o treinador. Não dependem de login ou de flashcards.
const COACH_KEY='cpof-academy-coach-v1';
export function academyCoachSettings(){
 let data={};
 try{data=JSON.parse(localStorage.getItem(COACH_KEY)||'{}')||{}}catch{}
 const settings=data.settings||{};
 return {
  dailyGoal:Math.max(1,Math.min(119,Number(settings.dailyGoal)||12)),
  weeklyGoal:Math.max(1,Math.min(999,Number(settings.weeklyGoal)||80)),
  goalPeriod:['daily','weekly','free'].includes(settings.goalPeriod)?settings.goalPeriod:'daily',
  stages:data.stages||{}
 };
}
export function saveAcademyGoals(patch){
 try{
  const stored=JSON.parse(localStorage.getItem(COACH_KEY)||'{}')||{};
  const current=academyCoachSettings();
  stored.version=1;
  stored.settings={...(stored.settings||{}),
   dailyGoal:Math.max(1,Math.min(119,Math.round(Number(patch.dailyGoal)||current.dailyGoal))),
   weeklyGoal:Math.max(1,Math.min(999,Math.round(Number(patch.weeklyGoal)||current.weeklyGoal))),
   goalPeriod:['daily','weekly','free'].includes(patch.goalPeriod)?patch.goalPeriod:current.goalPeriod,
   updatedAt:Date.now()};
  stored.stages=stored.stages||{f2l:{cases:{}},oll:{cases:{}},pll:{cases:{}}};
  localStorage.setItem(COACH_KEY,JSON.stringify(stored));
  return true;
 }catch{return false}
}
const TRAINING_STAGES=[['f2l','F2L',41],['oll','OLL',57],['pll','PLL',21]];
function coachXp(records){return records.reduce((n,r)=>n+Math.max(0,Math.min(20,Number(r.xp)||0)),0)}
function coachNumbers(records,stage,caseStates,now){
 const attempts=records.filter(r=>r.stage===stage);
 const measured=attempts.filter(r=>Number.isFinite(r.ms)&&r.ms>=100&&r.ms<600000);
 const recognized=attempts.filter(r=>Number.isFinite(r.recognitionMs)&&r.recognitionMs>=100);
 const memory=Object.values(caseStates||{});
 const unique=new Set(attempts.map(r=>String(r.caseId))).size;
 return {attempts:attempts.length,unique,measured:measured.length,
  avg:average(measured.slice(-30).map(r=>r.ms)),
  best:measured.length?Math.min(...measured.map(r=>r.ms)):null,
  hard:memory.filter(x=>x.rating==='hard').length,
  due:memory.filter(x=>x.attempts>0&&x.dueAt>0&&x.dueAt<=now).length,
  recognition:average(recognized.slice(-30).map(r=>r.recognitionMs))};
}
function stageTimingChart(records){
 const collections=TRAINING_STAGES.map(([key,label])=>({key,label,values:records.filter(r=>r.stage===key&&Number.isFinite(r.ms)&&r.ms>=100).slice(-30).map(r=>r.ms)}));
 const hasEnough=collections.some(r=>r.values.length>=2);
 if(!hasEnough)return '<div class="academy-empty-chart">Registre pelo menos dois tempos em algum treinador para comparar sua velocidade nos casos.</div>';
 const all=collections.flatMap(r=>r.values);const lo=Math.min(...all),hi=Math.max(...all),span=Math.max(1000,hi-lo);
 const w=680,h=225,p=34;
 const lines=collections.map(({key,label,values})=>{
  if(values.length<2)return '';
  const d=values.map((ms,i)=>(i?'L':'M')+(p+i*(w-2*p)/(values.length-1)).toFixed(1)+' '+(h-p-(ms-lo)/span*(h-2*p)).toFixed(1)).join(' ');
  return '<path class="academy-training-line '+key+'" d="'+d+'"><title>'+label+' · '+values.length+' tempos registrados</title></path>';
 }).join('');
 return '<svg class="academy-training-chart" viewBox="0 0 '+w+' '+h+'" role="img" aria-label="Comparação das últimas 30 medições de tempo por modalidade, em segundos">'+
 [0,1,2].map(i=>'<line x1="'+p+'" x2="'+(w-p)+'" y1="'+(p+i*(h-2*p)/2)+'" y2="'+(p+i*(h-2*p)/2)+'"/>').join('')+
 '<text x="'+p+'" y="18">'+(hi/1000).toFixed(1)+'s</text><text x="'+p+'" y="'+(h-10)+'">'+(lo/1000).toFixed(1)+'s</text>'+lines+'</svg>';
}
function practiceDaysChart(records){
 const days=recentDays(14),max=Math.max(1,...days.map(d=>records.filter(r=>localDate(r.at)===d.key).length));
 return '<div class="academy-training-calendar" role="img" aria-label="Histórico de casos treinados por modalidade nos últimos 14 dias">'+
 days.map(d=>{
  const counts=TRAINING_STAGES.map(([stage])=>records.filter(r=>r.stage===stage&&localDate(r.at)===d.key).length);
  const total=counts.reduce((a,b)=>a+b,0);
  return '<div class="academy-training-day" title="'+d.key+': '+total+' práticas"><span class="academy-training-day-value">'+total+'</span><div class="academy-training-day-track">'+counts.map((count,i)=>'<span class="academy-training-slice stage-'+TRAINING_STAGES[i][0]+'" style="height:'+(100*count/max)+'%"></span>').join('')+'</div><small>'+d.day.getDate()+'</small></div>';
 }).join('')+'</div>';
}
export function academyTrainingPanel(records){
 const settings=academyCoachSettings(),now=Date.now();
 const today=localDate(now),weekStart=now-7*DAY;
 const countToday=records.filter(r=>localDate(r.at)===today).length;
 const countWeek=records.filter(r=>r.at>=weekStart).length;
 const target=settings.goalPeriod==='daily'?settings.dailyGoal:settings.weeklyGoal;
 const current=settings.goalPeriod==='daily'?countToday:countWeek;
 const completion=settings.goalPeriod==='free'?0:Math.min(100,Math.round(current/target*100));
 const modes=[['random','Aleatório'],['sequential','Sequencial'],['competitive','Competitivo'],['adaptive','Adaptativo'],['review','Revisão'],['focus','Foco']];
 const modesCount=Object.fromEntries(modes.map(([id])=>[id,records.filter(r=>r.mode===id).length]));
 const maxMode=Math.max(1,...Object.values(modesCount));
 const xp=coachXp(records);
 const lastWeek=records.filter(r=>r.at>=now-7*DAY);
 const measured=lastWeek.filter(r=>Number.isFinite(r.ms)&&r.ms>=100);
 const difficult=lastWeek.filter(r=>r.grade==='bad'||r.grade==='medium'||settings.stages?.[r.stage]?.cases?.[r.caseId]?.rating==='hard');
 const touched=new Set(lastWeek.map(r=>r.stage));
 const missions=[
  {label:'Praticar 12 casos',progress:lastWeek.length,target:12,detail:'Qualquer modo'},
  {label:'Reforçar 3 casos difíceis',progress:difficult.length,target:3,detail:'Casos desafiadores'},
  {label:'Registrar 3 tempos',progress:measured.length,target:3,detail:'Cronometragem real'},
  {label:'Passar pelas 3 etapas',progress:touched.size,target:3,detail:'F2L, OLL e PLL'}
 ];
 const missionsHtml='<section class="academy-insight-card academy-missions"><header><div><span class="academy-overline">MISSÕES DA SEMANA</span><h2>Pequenos desafios, sem obrigação</h2></div><span class="academy-stat-mark">'+missions.filter(m=>m.progress>=m.target).length+' / '+missions.length+' concluídos</span></header>'+
 '<p>Propostas de prática da última semana, sem tarefas atrasadas ou perda de progresso.</p><div class="academy-missions-grid">'+missions.map(m=>'<article class="academy-mission '+(m.progress>=m.target?'complete':'')+'"><div><strong>'+m.label+'</strong><small>'+m.detail+'</small></div><span>'+Math.min(m.progress,m.target)+'/'+m.target+'</span><div class="academy-mission-track"><i style="width:'+Math.min(100,Math.round(m.progress/m.target*100))+'%"></i></div></article>').join('')+'</div></section>';
 const stageRows=TRAINING_STAGES.map(([id,label,total])=>{
  const n=coachNumbers(records,id,settings.stages?.[id]?.cases,now);
  const pct=Math.round(n.unique/total*100);
  return '<article class="academy-training-stage"><header><div><h3>'+label+'</h3><p>'+n.unique+' dos '+total+' casos já praticados</p></div><a href="'+id+'.html">Treinar →</a></header><div class="academy-skill-progress"><span style="width:'+pct+'%"></span></div><div class="academy-stage-metrics"><span><strong>'+n.attempts+'</strong> práticas</span><span><strong>'+formatSeconds(n.avg)+'</strong> média do caso</span><span><strong>'+n.hard+'</strong> difíceis</span><span><strong>'+n.due+'</strong> revisões sugeridas</span><span><strong>'+formatSeconds(n.recognition)+'</strong> reconhecimento marcado</span></div></article>';
 }).join('');
 return '<section class="academy-insight-card academy-goal-config"><header><div><span class="academy-overline">SUA ROTINA</span><h2>Metas flexíveis</h2></div><span class="academy-stat-mark">'+xp+' XP de treinos</span></header>'+
 '<p>Você decide quando praticar. A sequência conta dias ativos, mas nenhuma revisão vira obrigação.</p>'+
 '<div class="academy-goal-settings"><label>Ritmo<select id="academy-goal-period"><option value="daily"'+(settings.goalPeriod==='daily'?' selected':'')+'>Diário</option><option value="weekly"'+(settings.goalPeriod==='weekly'?' selected':'')+'>Semanal</option><option value="free"'+(settings.goalPeriod==='free'?' selected':'')+'>Livre</option></select></label>'+
 '<label>Casos por dia<input type="number" id="academy-daily-goal" min="1" max="119" value="'+settings.dailyGoal+'"></label>'+
 '<label>Casos por semana<input type="number" id="academy-weekly-goal" min="1" max="999" value="'+settings.weeklyGoal+'"></label>'+
 '<button type="button" data-action="academy-save-goals">Salvar metas</button></div>'+
 (settings.goalPeriod!=='free'?'<div class="academy-goal-visual"><div class="academy-goal-progress"><span style="width:'+completion+'%"></span></div><strong>'+current+' / '+target+'</strong><small>'+completion+'% da meta '+(settings.goalPeriod==='daily'?'diária':'semanal')+'</small></div>':'<p class="academy-no-goal">Modo livre: você pratica sem metas numéricas.</p>')+'</section>'+
 missionsHtml+
 '<div class="academy-training-stage-grid">'+stageRows+'</div>'+
 '<div class="academy-insight-grid"><section class="academy-insight-card"><header><div><span class="academy-overline">FREQUÊNCIA</span><h2>Práticas por modalidade</h2></div></header><p>Últimos 14 dias · F2L, OLL e PLL.</p>'+practiceDaysChart(records)+
 '<div class="academy-training-legend"><span><i class="stage-f2l"></i>F2L</span><span><i class="stage-oll"></i>OLL</span><span><i class="stage-pll"></i>PLL</span></div></section>'+
 '<section class="academy-insight-card"><header><div><span class="academy-overline">METODOLOGIA</span><h2>Modos utilizados</h2></div></header>'+
 '<p>Como você distribuiu suas práticas registradas.</p><div class="academy-mode-stats">'+modes.map(([id,label])=>'<div><span>'+label+'</span><div><i style="width:'+(100*modesCount[id]/maxMode).toFixed(0)+'%"></i></div><strong>'+modesCount[id]+'</strong></div>').join('')+'</div></section></div>'+
 '<section class="academy-insight-card academy-stage-speed"><header><div><span class="academy-overline">PROGRESSO TÉCNICO</span><h2>Velocidade por etapa</h2></div><span class="academy-stat-mark">Tempos medidos</span></header>'+
 '<p>Últimas 30 medições por etapa, em ordem de execução. Tempos não registrados são omitidos.</p>'+
 stageTimingChart(records)+'<div class="academy-training-legend"><span><i class="stage-f2l"></i>F2L</span><span><i class="stage-oll"></i>OLL</span><span><i class="stage-pll"></i>PLL</span></div></section>';
}

export function academyDashboard(records=[],xp=0,level=1){
 const s=academyActivityData(records),week=s.days.slice(-7).reduce((n,d)=>{const v=s.byDate.get(d.key);return n+(v?v.cases+v.solves+v.other:0)},0),total=s.cases.length+s.times.length;
 const metrics=[['🔥','Sequência',s.streak+' dias'],['◈','Atividades (7 dias)',String(week)],['◷','Melhor tempo',formatSeconds(s.best)],['↗','Média recente',formatSeconds(s.mean)]];
 return '<section class="academy-dashboard-intro"><div class="academy-overline">SEU RITMO · ACADEMIA CFOP</div><h1>Seu progresso, no seu tempo.</h1><p>Treine quando quiser. Sua sequência valoriza a constância, mas não cria casos pendentes obrigatórios.</p></section>'+
 '<div class="academy-dashboard-kpis">'+metrics.map(([icon,label,value])=>'<article class="academy-dashboard-kpi"><span aria-hidden="true">'+icon+'</span><small>'+label+'</small><strong>'+value+'</strong></article>').join('')+'</div>'+
 '<div class="academy-insight-grid"><section class="academy-insight-card academy-calendar-card"><header><div><span class="academy-overline">HÁBITO</span><h2>Calendário de treinos</h2></div><span class="academy-stat-mark">'+s.days.filter(d=>s.byDate.has(d.key)).length+' dias ativos</span></header>'+
 '<p>Atividade registrada nos últimos 42 dias.</p><div class="academy-activity-calendar" role="img" aria-label="Calendário com os dias em que houve treinos">'+s.days.map(d=>{const v=s.byDate.get(d.key),n=v?v.cases+v.solves+v.other:0;return '<span class="academy-calendar-cell intensity-'+(n?Math.min(4,n<3?1:n<8?2:n<20?3:4):0)+'" title="'+d.key+': '+n+' atividades" aria-label="'+d.key+': '+n+' atividades"></span>'}).join('')+'</div><div class="academy-calendar-legend"><span>Menos</span>'+[0,1,2,3,4].map(n=>'<i class="intensity-'+n+'"></i>').join('')+'<span>Mais</span></div></section>'+
 '<section class="academy-insight-card"><header><div><span class="academy-overline">CONSISTÊNCIA</span><h2>Últimos 7 dias</h2></div></header><p>Casos registrados, tempos e outras atividades.</p>'+dailyBars(s)+'</section></div>'+
 '<section class="academy-insight-card academy-speed-card"><header><div><span class="academy-overline">DESEMPENHO</span><h2>Velocidade no 3×3</h2></div><a href="scramble.html?view=stats">Ver todos os tempos →</a></header><p>Curva das últimas '+s.speed.length+' resoluções cronometradas, sem valores simulados.</p>'+linePlot(s)+'<div class="academy-speed-stats"><span>Resoluções: <strong>'+s.times.length+'</strong></span><span>Variação (desvio-padrão): <strong>'+formatSeconds(s.deviation)+'</strong></span><span>Casos praticados: <strong>'+s.cases.length+'</strong></span></div></section>'+
 academyTrainingPanel(s.cases)+
 '<section class="academy-insight-card academy-goals-card"><div><span class="academy-overline">CONTINUE EVOLUINDO</span><h2>Seu próximo treino</h2><p>Escolha uma etapa sem perder sua liberdade de treino. Você não tem revisões acumuladas obrigatórias.</p></div><div class="academy-goal-actions"><a href="f2l.html">F2L</a><a href="oll.html">OLL</a><a href="pll.html">PLL</a><a href="cross.html">CROSS</a></div></section>'+
 '<p class="academy-privacy-note">Dados deste painel: '+total+' registros de casos ou tempos salvos neste dispositivo. Treinos por avanço de caso não comprovam a execução física. Dados da conta e deste navegador podem exigir sincronização para aparecer em outros dispositivos.</p>';
}
