/* Indicador discreto de constância: usa apenas atividades realmente armazenadas no navegador. */
(()=>{
 const number=document.getElementById('academy-home-streak-number'),help=document.getElementById('academy-home-streak-help');
 if(!number||!help)return;
 const read=key=>{try{const x=JSON.parse(localStorage.getItem(key)||'null');return x}catch{return null}};
 const day=value=>{const d=new Date(value);return Number.isFinite(d.getTime())?[d.getFullYear(),String(d.getMonth()+1).padStart(2,'0'),String(d.getDate()).padStart(2,'0')].join('-'):''};
 const active=new Set();
 const progress=read('cfop-studio-progress-v1');
 if(Array.isArray(progress?.records))for(const r of progress.records)if(typeof r?.date==='string')active.add(r.date);
 const cases=read('cpof-academy-activity-v1');
 if(Array.isArray(cases))for(const r of cases){const key=day(r?.at);if(key)active.add(key)}
 const solves=read('cpof-scramble-times-v1');
 if(Array.isArray(solves))for(const r of solves){if(!Number.isFinite(r?.ms)||r.ms<1000)continue;const key=day(r.date);if(key)active.add(key)}
 let streak=0,now=new Date();now.setHours(12,0,0,0);
 if(!active.has(day(now)))now.setDate(now.getDate()-1);
 for(let guard=0;guard<3650&&active.has(day(now));guard++){streak++;now.setDate(now.getDate()-1)}
 number.textContent=streak+' '+(streak===1?'dia':'dias');
 help.textContent=active.has(day(new Date()))?'Você treinou hoje':'Seu ritmo, sua escolha';
})();
