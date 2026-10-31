import {adminTimerInsights} from '../timer/telemetry.mjs?v=20261031-1';
let rows=[],days=30,ready=false,error='';
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;','"':'&#39;'}[c]));
const modes={['3x3']:'3×3 normal',cross1:'Cross · 1 meio',cross2:'Cross · 2 meios',cross3:'Cross · 3 meios',cross4:'Cross · 4 meios'};
export async function loadAdminTimerInsights(n=days){
 days=[7,30,90].includes(Number(n))?Number(n):30;
 try{const result=await adminTimerInsights(days);rows=Array.isArray(result)?result:[];ready=true;error=''}
 catch(e){rows=[];ready=false;error='Métricas indisponíveis. Execute a migração 000012 no Supabase.'}
}
const fmt=ms=>ms==null||!Number.isFinite(Number(ms))?'—':(Number(ms)/1000).toFixed(2)+'s';
function summary(data){
 const attempts=data.reduce((n,r)=>n+Number(r.attempts||0),0),correct=data.reduce((n,r)=>n+Number(r.correct||0),0);
 const best=Math.min(Infinity,...data.map(r=>r.best_ms).filter(v=>v!=null).map(Number));
 const avg=correct?data.reduce((s,r)=>s+Number(r.mean_ms||0)*Number(r.correct||0),0)/correct:null;
 const last=data.length?data.map(r=>String(r.day)).sort().at(-1):null;
 return {attempts,correct,best:Number.isFinite(best)?best:null,avg,last};
}
function graph(data){
 const map=new Map();
 data.forEach(r=>map.set(r.day,(map.get(r.day)||0)+Number(r.attempts||0)));
 const entries=[...map.entries()].sort((a,b)=>a[0].localeCompare(b[0])).slice(-30);
 if(!entries.length)return '<p class="muted">Nenhum registro de cronômetro neste período.</p>';
 const max=Math.max(1,...entries.map(e=>e[1]));
 return '<div class="admin-timer-bars" role="img" aria-label="Tentativas registradas por dia">'+entries.map(([day,value])=>
 '<div title="'+esc(day)+': '+value+' tentativa(s)" style="height:'+Math.max(5,Math.round(value/max*100))+'%"><span>'+value+'</span></div>').join('')+'</div>';
}
export function adminTimerPanel(users=[],selected=null){
 const u=new Map(users.map(x=>[x.user_id,x]));
 const total=summary(rows),byUser=new Map();
 rows.forEach(x=>{if(!byUser.has(x.user_id))byUser.set(x.user_id,[]);byUser.get(x.user_id).push(x)});
 const ranking=[...byUser].map(([id,rs])=>({id,summary:summary(rs),name:u.get(id)?.nickname||u.get(id)?.email||'Usuário'})).sort((a,b)=>b.summary.attempts-a.summary.attempts);
 const selectedData=selected?rows.filter(r=>r.user_id===selected):[],single=summary(selectedData);
 const byMode=new Map();selectedData.forEach(r=>{if(!byMode.has(r.mode))byMode.set(r.mode,[]);byMode.get(r.mode).push(r)});
 return '<section class="card admin-timer-overview"><div class="row between"><div><h2>Atividade de treino · 3×3 e Cross</h2><p class="muted">Tentativas agregadas por dia e modalidade. Dados somente de contas conectadas após a ativação da migração; não mostra comentários ou embaralhamentos.</p></div>'+
 '<div class="admin-timer-period" role="group" aria-label="Período de acompanhamento">'+[7,30,90].map(n=>'<button type="button" data-admin-timer-days="'+n+'" aria-pressed="'+(days===n)+'">'+n+' dias</button>').join('')+'</div></div>'+
 (ready?'<div class="admin-timer-kpis">'+[['Tentativas registradas',total.attempts],['Acertos',total.correct],['Usuários com treino',byUser.size],['Melhor tempo reportado',fmt(total.best)]].map(([k,v])=>'<div><span>'+k+'</span><strong>'+v+'</strong></div>').join('')+'</div>'+
 '<div class="admin-timer-layout"><div><h3>Treinos por dia</h3>'+graph(rows)+'</div><div><h3>Mais ativos no período</h3>'+
 (ranking.length?ranking.slice(0,8).map((r,i)=>'<div class="admin-timer-row"><span>'+(i+1)+'. '+esc(r.name)+'</span><strong>'+r.summary.attempts+' tentativas</strong></div>').join(''):'<p class="muted">Sem atividade registrada.</p>')+'</div></div>':
 '<p class="notice">'+esc(error||'Carregando métricas…')+'</p>')+
 (selected?'<div class="admin-timer-user"><h3>Treinos do usuário selecionado</h3>'+
 (selectedData.length?'<div class="admin-timer-kpis">'+[['Tentativas',single.attempts],['Acertos',single.correct],['Média reportada',fmt(single.avg)],['Último treino',single.last||'—']].map(([k,v])=>'<div><span>'+k+'</span><strong>'+v+'</strong></div>').join('')+'</div>'+graph(selectedData)+
 '<div class="admin-timer-modes">'+[...byMode].map(([mode,list])=>{const s=summary(list);return '<div><strong>'+esc(modes[mode]||mode)+'</strong><span>'+s.attempts+' tentativas · '+s.correct+' corretas · melhor '+fmt(s.best)+'</span></div>'}).join('')+'</div>':'<p class="muted">Não há dados de timer para esta conta no período selecionado.</p>')+
 '</div>':'')+'</section>';
}
