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
export function academyDashboard(records=[],xp=0,level=1){
 const s=academyActivityData(records),week=s.days.slice(-7).reduce((n,d)=>{const v=s.byDate.get(d.key);return n+(v?v.cases+v.solves+v.other:0)},0),total=s.cases.length+s.times.length;
 const metrics=[['🔥','Sequência',s.streak+' dias'],['◈','Atividades (7 dias)',String(week)],['◷','Melhor tempo',formatSeconds(s.best)],['↗','Média recente',formatSeconds(s.mean)]];
 return '<section class="academy-dashboard-intro"><div class="academy-overline">SEU RITMO · ACADEMIA CPOF</div><h1>Seu progresso, no seu tempo.</h1><p>Treine quando quiser. Sua sequência valoriza a constância, mas não cria casos pendentes obrigatórios.</p></section>'+
 '<div class="academy-dashboard-kpis">'+metrics.map(([icon,label,value])=>'<article class="academy-dashboard-kpi"><span aria-hidden="true">'+icon+'</span><small>'+label+'</small><strong>'+value+'</strong></article>').join('')+'</div>'+
 '<div class="academy-insight-grid"><section class="academy-insight-card academy-calendar-card"><header><div><span class="academy-overline">HÁBITO</span><h2>Calendário de treinos</h2></div><span class="academy-stat-mark">'+s.days.filter(d=>s.byDate.has(d.key)).length+' dias ativos</span></header>'+
 '<p>Atividade registrada nos últimos 42 dias.</p><div class="academy-activity-calendar" role="img" aria-label="Calendário com os dias em que houve treinos">'+s.days.map(d=>{const v=s.byDate.get(d.key),n=v?v.cases+v.solves+v.other:0;return '<span class="academy-calendar-cell intensity-'+(n?Math.min(4,n<3?1:n<8?2:n<20?3:4):0)+'" title="'+d.key+': '+n+' atividades" aria-label="'+d.key+': '+n+' atividades"></span>'}).join('')+'</div><div class="academy-calendar-legend"><span>Menos</span>'+[0,1,2,3,4].map(n=>'<i class="intensity-'+n+'"></i>').join('')+'<span>Mais</span></div></section>'+
 '<section class="academy-insight-card"><header><div><span class="academy-overline">CONSISTÊNCIA</span><h2>Últimos 7 dias</h2></div></header><p>Casos registrados, tempos e outras atividades.</p>'+dailyBars(s)+'</section></div>'+
 '<section class="academy-insight-card academy-speed-card"><header><div><span class="academy-overline">DESEMPENHO</span><h2>Velocidade no 3×3</h2></div><a href="scramble.html?view=stats">Ver todos os tempos →</a></header><p>Curva das últimas '+s.speed.length+' resoluções cronometradas, sem valores simulados.</p>'+linePlot(s)+'<div class="academy-speed-stats"><span>Resoluções: <strong>'+s.times.length+'</strong></span><span>Variação (desvio-padrão): <strong>'+formatSeconds(s.deviation)+'</strong></span><span>Casos praticados: <strong>'+s.cases.length+'</strong></span></div></section>'+
 '<section class="academy-insight-card academy-goals-card"><div><span class="academy-overline">CONTINUE EVOLUINDO</span><h2>Seu próximo treino</h2><p>Escolha uma etapa sem perder sua liberdade de treino. Você não tem revisões acumuladas obrigatórias.</p></div><div class="academy-goal-actions"><a href="f2l.html">F2L</a><a href="oll.html">OLL</a><a href="pll.html">PLL</a><a href="cross.html">CROSS</a></div></section>'+
 '<p class="academy-privacy-note">Dados deste painel: '+total+' registros de casos ou tempos salvos neste dispositivo. Treinos por avanço de caso não comprovam a execução física. Dados de XP e conta permanecem separados e podem exigir sincronização.</p>';
}
