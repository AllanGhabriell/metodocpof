// Shared 3×3 and Cross result model. No network access, deterministic statistics.
export function normalizeSolve(raw,index=0){
 if(!raw||!Number.isFinite(Number(raw.ms))||Number(raw.ms)<0)return null;
 const penalty=['+2','DNF','none','plus2','dnf'].includes(raw.penalty)?({plus2:'+2',dnf:'DNF',none:'OK'}[raw.penalty]||raw.penalty):'OK';
 return {
  ...raw,
  id:String(raw.id||'legacy-'+index+'-'+String(raw.date||'unknown')).slice(0,100),
  ms:Math.round(Number(raw.ms)),
  scramble:String(raw.scramble||'').slice(0,250),
  date:typeof raw.date==='string'&&!Number.isNaN(Date.parse(raw.date))?raw.date:new Date().toISOString(),
  penalty,comment:String(raw.comment||'').slice(0,600),
  session:String(raw.session||'Geral').slice(0,45),
  archived:Boolean(raw.archived)
 };
}
export function normalizeAll(raw){return (Array.isArray(raw)?raw:[]).map(normalizeSolve).filter(Boolean).slice(-3500)}
export function effective(solve){
 if(!solve||solve.penalty==='DNF'||(solve.level&&Number(solve.achieved)<Number(solve.level)))return Infinity;
 return Math.max(0,Number(solve.ms)||0)+(solve.penalty==='+2'||solve.penalty==='plus2'?2000:0);
}
export function format(ms){return ms==null?'—':Number.isFinite(ms)?(ms/1000).toFixed(2):'DNF'}
export function solveLabel(r){return format(effective(r))+(r.penalty==='+2'||r.penalty==='plus2'?' (+2)':'')}
export function mean(nums){return nums.length&&nums.every(Number.isFinite)?nums.reduce((a,b)=>a+b,0)/nums.length:null}
export function averageOf(list,n){
 if(list.length<n)return null;
 const ordered=list.slice(-n).map(effective).sort((a,b)=>a-b);
 const trim=Math.max(1,Math.ceil(n*.05));
 const inner=ordered.slice(trim,n-trim);
 return inner.every(Number.isFinite)?mean(inner):Infinity;
}
export function statistics(list){
 const times=list.map(effective),finite=times.filter(Number.isFinite);
 const avg=mean(finite),sdev=avg===null?null:Math.sqrt(finite.reduce((a,v)=>a+(v-avg)**2,0)/finite.length);
 return {total:list.length,correct:finite.length,dnf:list.length-finite.length,average:avg,median:finite.length?finite.slice().sort((a,b)=>a-b)[Math.floor(finite.length/2)]:null,
 best:finite.length?Math.min(...finite):null,worst:finite.length?Math.max(...finite):null,
 deviation:sdev,totalMs:finite.reduce((a,b)=>a+b,0),ao5:averageOf(list,5),ao12:averageOf(list,12),ao50:averageOf(list,50),
 ao100:averageOf(list,100),ao1000:averageOf(list,1000)};
}
export function csv(list){
 const esc=x=>'"'+String(x??'').replace(/"/g,'""')+'"';
 return '\ufeff'+['data','tempo_ms','penalidade','sessao','arquivado','comentario','embaralhamento','nivel','pecas_corretas'].join(',')+'\r\n'+
 list.map(r=>[r.date,r.ms,r.penalty,r.session||'Geral',r.archived?'sim':'nao',r.comment||'',r.scramble,r.level??'',r.achieved??''].map(esc).join(',')).join('\r\n');
}
export function newId(){return Date.now()+'-'+Math.random().toString(36).slice(2,10)}
export function shareImage({title='Meu treino 3×3',subtitle='',record=null,solves=[]}={}){
 const s=statistics(solves),c=document.createElement('canvas');c.width=1080;c.height=1350;
 const ctx=c.getContext('2d');const bg=ctx.createLinearGradient(0,0,1080,1350);bg.addColorStop(0,'#06162c');bg.addColorStop(.5,'#0d3864');bg.addColorStop(1,'#1b1150');ctx.fillStyle=bg;ctx.fillRect(0,0,1080,1350);
 const line=(t,x,y,size=44,color='#f3faff',bold=false)=>{ctx.fillStyle=color;ctx.font=(bold?'800 ':'500 ')+size+'px system-ui, sans-serif';ctx.fillText(String(t),x,y,950)};
 line('ACADEMIA CFOP',74,120,37,'#9eddf8',true);line(title,74,243,61,'#fff',true);
 line(subtitle,74,312,30,'#b5d3ec');
 if(record){line(solveLabel(record)+'s',74,525,155,'#f6dd9a',true);line(new Date(record.date).toLocaleDateString('pt-BR'),74,586,27);
  const moves=(record.scramble||'').split(' ');let y=730;for(let i=0;i<moves.length;i+=9){line(moves.slice(i,i+9).join(' '),74,y,28);y+=49;if(y>920)break;}
 }else{
  const rows=[['Melhor',format(s.best)+'s'],['Ao5',format(s.ao5)+'s'],['Ao12',format(s.ao12)+'s'],['Total',s.total]];
  rows.forEach(([k,v],i)=>{const y=450+i*172;line(k,74,y,32,'#a7c8e8');line(v,74,y+80,67,'#f6faff',true)});
 }
 line('Compartilhado voluntariamente pelo cubista',74,1265,23,'#b6c6dd');return c;
}
export async function downloadOrShare(canvas,name,share=true){
 const blob=await new Promise(resolve=>canvas.toBlob(resolve,'image/png'));if(!blob)throw Error('PNG indisponível');
 const file=new File([blob],name,{type:'image/png'});
 if(share&&navigator.share&&navigator.canShare?.({files:[file]})){
  try{await navigator.share({files:[file],title:'Academia CFOP'});return}catch(e){if(e?.name==='AbortError')return}
 }
 const uri=URL.createObjectURL(blob);const a=document.createElement('a');a.href=uri;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(uri),1000);
}
export function celebrate(container=document.body){
 if(matchMedia('(prefers-reduced-motion: reduce)').matches)return;
 container.classList.remove('cfop-record-glow');void container.offsetWidth;container.classList.add('cfop-record-glow');
 setTimeout(()=>container.classList.remove('cfop-record-glow'),2200);
}
