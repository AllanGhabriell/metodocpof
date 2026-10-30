/* Academia CPOF — motor compartilhado F2L / OLL / PLL.
   A revisão espaçada usa execução real do caso (não flashcards).
   Todos os registros são locais e baseados em ações explicitamente indicadas pelo usuário. */
(function(global){
'use strict';
const KEY='cpof-academy-coach-v1',ACTIVITY='cpof-academy-activity-v1',DAY=86400000;
const STAGES=['f2l','oll','pll'],MODES=['random','sequential','competitive','adaptive','review','focus'],RATINGS=['easy','medium','hard'];
const LIMITS={f2l:41,oll:57,pll:21};
function storage(){try{return global.localStorage}catch{return null}}
function readJson(key,fallback){try{const value=JSON.parse(storage()?.getItem(key)||'null');return value&&typeof value==='object'?value:fallback}catch{return fallback}}
function defaults(){return {version:1,settings:{dailyGoal:12,weeklyGoal:80,goalPeriod:'daily',reviewEnabled:true},stages:{f2l:{cases:{}},oll:{cases:{}},pll:{cases:{}}}}}
function read(){const input=readJson(KEY,{}),base=defaults();base.settings={...base.settings,...(input.settings||{})};for(const s of STAGES)base.stages[s]={cases:{...(input.stages?.[s]?.cases||{})}};return base}
function write(value){try{storage()?.setItem(KEY,JSON.stringify(value));return true}catch{return false}}
function validStage(stage){return STAGES.includes(stage)}
function validCase(stage,id){return validStage(stage)&&typeof id==='string'&&id.length>0&&id.length<16}
function getCase(stage,id){if(!validCase(stage,String(id)))return null;const s=read();return {...(s.stages[stage].cases[String(id)]||{})}}
function rate(stage,id,rating){
 id=String(id);
 if(!validCase(stage,id)||!RATINGS.includes(rating))return null;
 const s=read(),old=s.stages[stage].cases[id]||{};
 const next={...old,rating,ratedAt:Date.now()};
 s.stages[stage].cases[id]=next;write(s);return next;
}
function validMs(ms){return Number.isFinite(ms)&&ms>=100&&ms<=600000?Math.round(ms):null}
function schedule(stats,grade,now){
 const old=Math.max(0,Math.min(6,Number(stats.memoryLevel)||0));
 // Intervalos heurísticos ajustáveis; não são uma medição científica individual.
 const level=grade==='good'?Math.min(6,old+1):grade==='medium'?Math.max(0,old-1):0;
 const days=[.25,1,3,7,14,30,60];
 return {memoryLevel:level,dueAt:now+days[level]*DAY};
}
function complete(stage,id,options={}){
 id=String(id);
 if(!validCase(stage,id))return null;
 const now=Number.isFinite(options.at)?options.at:Date.now();
 const mode=MODES.includes(options.mode)?options.mode:'random';
 const ms=validMs(options.ms),recognitionMs=validMs(options.recognitionMs);
 const goalMs=Number.isFinite(options.goalMs)?Math.max(1000,Number(options.goalMs)):6000;
 const data=read(),old=data.stages[stage].cases[id]||{};
 let grade;
 if(mode==='competitive'&&ms!==null)grade=ms<=goalMs?'good':ms<=goalMs*1.35?'medium':'bad';
 else if(options.result==='hard'||options.result==='missed')grade='bad';
 else if(options.result==='easy')grade='good';
 else if(old.rating==='hard')grade='medium'; // compatibility with previous recorded attempts
 else grade='good';
 const update=schedule(old,grade,now);
 const times=[...(Array.isArray(old.times)?old.times:[]),...(ms===null?[]:[ms])].slice(-25);
 const recognitionValid=recognitionMs!==null&&ms!==null&&recognitionMs<=ms;
 const recognitionTimes=[...(Array.isArray(old.recognitionTimes)?old.recognitionTimes:[]),...(recognitionValid?[recognitionMs]:[])].slice(-25);
 const executionTimes=[...(Array.isArray(old.executionTimes)?old.executionTimes:[]),...(recognitionValid?[ms-recognitionMs]:[])].slice(-25);
 const count=(Number(old.attempts)||0)+1;
 const wasHard=options.result==='hard'||options.result==='missed';
 const wasEasy=options.result==='easy';
 const hardClicks=Math.max(0,Number(old.hardClicks)||0)+(wasHard?1:0);
 const easyClicks=Math.max(0,Number(old.easyClicks)||0)+(wasEasy?1:0);
 // Two consecutive easy executions after a hard one remove its reinforcement priority.
 const consecutiveEasy=wasHard?0:wasEasy?(Math.max(0,Number(old.consecutiveEasy)||0)+1):Math.max(0,Number(old.consecutiveEasy)||0);
 const needsPractice=wasHard?true:wasEasy&&hardClicks>0?consecutiveEasy<2:!!old.needsPractice;
 const difficultyScore=Math.max(0,Math.min(30,
    (Number(old.difficultyScore)||0)+(wasHard?3:wasEasy?-2:grade==='bad'?2:grade==='medium'?1:-1)));
 const rating=wasHard?'hard':wasEasy?(needsPractice?'hard':'easy'):(old.rating||null);
 const priorDue=Number(old.dueAt)||0;
 const reviewed=priorDue>0&&now>=priorDue;
 // Recompense treinos declarados, não classificação manual. Erros rendem XP reduzido.
 const priorToday=activity().filter(e=>e.stage===stage&&e.caseId===id&&localDay(e.at)===localDay(now)).length;
 const xp=priorToday>=8?0:grade==='bad'?2:8+(reviewed?4:0)+(mode==='competitive'&&grade==='good'?4:0)+(mode==='adaptive'?2:0);
 const next={...old,...update,attempts:count,lastAt:now,lastMs:ms??(old.lastMs??null),grade,rating,
  hardClicks,easyClicks,consecutiveEasy,needsPractice,difficultyScore,
  successes:(Number(old.successes)||0)+(grade==='good'?1:0),times,recognitionTimes,executionTimes,
  avgMs:times.length?Math.round(times.reduce((a,b)=>a+b,0)/times.length):null,
  avgRecognitionMs:recognitionTimes.length?Math.round(recognitionTimes.reduce((a,b)=>a+b,0)/recognitionTimes.length):null,
  avgExecutionMs:executionTimes.length?Math.round(executionTimes.reduce((a,b)=>a+b,0)/executionTimes.length):null};
 data.stages[stage].cases[id]=next;
 write(data);
 const records=readJson(ACTIVITY,[]);
 const history=Array.isArray(records)?records:[];
 const event={uid:stage+'-'+id+'-'+now+'-'+Math.random().toString(36).slice(2,10),stage,caseId:id,at:now,mode,ms,recognitionMs:recognitionValid?recognitionMs:null,
  grade,result:options.result||'completed',reviewed,xp,verified:false}; // indicação do usuário, não detecção automática do cubo físico
 history.push(event);
 try{storage()?.setItem(ACTIVITY,JSON.stringify(history.slice(-12000)))}catch{}
 return {record:event,stats:next};
}
function dueCases(stage,ids,now=Date.now()){
 if(!validStage(stage))return [];
 const cases=read().stages[stage].cases;
 return ids.map(String).filter(id=>{
  const c=cases[id];return c&&Number(c.attempts)>0&&Number(c.dueAt)>0&&c.dueAt<=now;
 });
}
function weightedPick(stage,ids,mode,options={}){
 const source=ids.map(String);
 if(!source.length)return null;
 const data=read().stages[stage]?.cases||{};
 const recent=new Set((options.recent||[]).slice(-3).map(String));
 const now=Number.isFinite(options.now)?options.now:Date.now();
 const targetMs=Number.isFinite(options.targetMs)?options.targetMs:6000;
 const pool=source.filter(id=>!recent.has(id));
 const choices=pool.length?pool:source;
 const items=choices.map(id=>{
  const c=data[id]||{},manual=c.rating||'none';
  let w=1;
  if(mode==='review'){
   w=manual==='hard'?5:manual==='medium'?3:1;
   if(c.attempts>0&&Number(c.dueAt)>0&&c.dueAt<=now)w+=6;
  }else if(mode==='focus'){
   w=manual==='hard'?9:manual==='medium'?4:1;
  }else if(mode==='adaptive'||mode==='random'||options.prioritizeHard){
   // Aleatório é variado, mas não uniforme: dificuldades identificadas voltam mais vezes.
   w=manual==='hard'?7:manual==='medium'?3:manual==='easy'?1:2;
   if(c.attempts>0&&Number(c.dueAt)>0&&c.dueAt<=now)w+=3;
   if(c.avgMs&&c.avgMs>targetMs)w+=Math.min(5,Math.ceil(c.avgMs/targetMs));
   if(c.avgRecognitionMs&&c.avgRecognitionMs>targetMs*.45)w+=3;
   if(c.grade==='bad')w+=3;
  }
  if(c.needsPractice)w+=Math.min(18,6+(Number(c.hardClicks)||0)*2);
  if(Number(c.difficultyScore)>0)w+=Math.min(7,Number(c.difficultyScore));
  return {id,w};
 });
 const total=items.reduce((sum,item)=>sum+item.w,0);
 let point=Math.random()*total;
 for(const item of items){point-=item.w;if(point<=0)return item.id}
 return items.at(-1).id;
}
function activity(){const x=readJson(ACTIVITY,[]);return Array.isArray(x)?x:[]}
function summaries(stage){
 const records=activity().filter(e=>e.stage===stage),cases=read().stages[stage]?.cases||{};
 const today=new Date();const todayKey=localDay(today);
 const todayAttempts=records.filter(e=>localDay(e.at)===todayKey).length;
 const times=records.filter(e=>e.ms!==null&&Number.isFinite(e.ms)&&e.ms>0).map(e=>e.ms);
 const last=times.slice(-30),mean=last.length?last.reduce((a,b)=>a+b,0)/last.length:null;
 const hard=Object.values(cases).filter(c=>c.rating==='hard').length;
 const due=Object.values(cases).filter(c=>c.attempts>0&&c.dueAt<=Date.now()).length;
 return {total:records.length,today:todayAttempts,hard,due,mean,latest:records.slice(-50),cases};
}
function localDay(at){const d=new Date(at);return Number.isFinite(d.getTime())?[d.getFullYear(),String(d.getMonth()+1).padStart(2,'0'),String(d.getDate()).padStart(2,'0')].join('-'):''}
function preferences(patch){
 const s=read();if(patch){
  if(Number.isInteger(Number(patch.dailyGoal)))s.settings.dailyGoal=Math.max(1,Math.min(119,Number(patch.dailyGoal)));
  if(Number.isInteger(Number(patch.weeklyGoal)))s.settings.weeklyGoal=Math.max(1,Math.min(999,Number(patch.weeklyGoal)));
  if(typeof patch.reviewEnabled==='boolean')s.settings.reviewEnabled=patch.reviewEnabled;
  if(['daily','weekly','free'].includes(patch.goalPeriod))s.settings.goalPeriod=patch.goalPeriod;
  s.settings.updatedAt=Date.now();
  write(s);
 }return s.settings;
}
global.CPOFCoach={KEY,ACTIVITY,STAGES,MODES,LIMITS,read,getCase,rate,complete,dueCases,weightedPick,activity,summaries,preferences,localDay};
})(typeof window!=='undefined'?window:globalThis);
