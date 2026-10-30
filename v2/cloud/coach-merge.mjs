/* Mesclagem determinística do treinador entre dispositivos autenticados.
   Estes dados são enviados SOMENTE para cfop_user_state, sujeito à RLS por usuário. */
const STAGES=['f2l','oll','pll'];
const validObj=x=>x&&typeof x==='object'&&!Array.isArray(x);
const validNum=x=>Number.isFinite(Number(x))?Number(x):0;
const stamp=x=>Math.max(validNum(x?.lastAt),validNum(x?.ratedAt));
function mergeSettings(local,remote){
 const a=validObj(local)?local:{},b=validObj(remote)?remote:{};
 const updated=validNum(a.updatedAt)>=validNum(b.updatedAt)?a:b;
 return {
  dailyGoal:Math.max(1,Math.min(119,validNum(updated.dailyGoal)||12)),
  weeklyGoal:Math.max(1,Math.min(999,validNum(updated.weeklyGoal)||80)),
  goalPeriod:['daily','weekly','free'].includes(updated.goalPeriod)?updated.goalPeriod:'daily',
  reviewEnabled:updated.reviewEnabled!==false,
  updatedAt:Math.max(validNum(a.updatedAt),validNum(b.updatedAt))
 };
}
export function mergeCoachState(local={},remote={}){
 const a=validObj(local)?local:{},b=validObj(remote)?remote:{},stages={};
 for(const stage of STAGES){
  const first=validObj(a.stages?.[stage]?.cases)?a.stages[stage].cases:{};
  const second=validObj(b.stages?.[stage]?.cases)?b.stages[stage].cases:{};
  const cases=Object.create(null);
  const ids=new Set([...Object.keys(first),...Object.keys(second)]);
  for(const id of ids){
   if(!id||id.length>16||id==='__proto__'||id==='constructor')continue;
   const x=validObj(first[id])?first[id]:null,y=validObj(second[id])?second[id]:null;
   const chosen=x&&y?(stamp(x)>=stamp(y)?x:y):(x||y);
   if(chosen)cases[id]=chosen;
  }
  stages[stage]={cases};
 }
 return {version:1,settings:mergeSettings(a.settings,b.settings),stages};
}
function uniqueList(a,b,getKey,max,valid){
 const map=new Map();
 for(const item of [...(Array.isArray(a)?a:[]),...(Array.isArray(b)?b:[])]){
  if(!validObj(item)||!valid(item))continue;
  const key=getKey(item);
  if(key&&!map.has(key))map.set(key,item);
 }
 return [...map.values()].sort((x,y)=>validNum(x.at||Date.parse(x.date))-validNum(y.at||Date.parse(y.date))).slice(-max);
}
export function mergeCoachActivity(local=[],remote=[]){
 return uniqueList(local,remote,e=>String(e.uid||[e.stage,e.caseId,e.at,e.mode,e.ms,e.grade].join('|')),12000,
  e=>STAGES.includes(e.stage)&&e.caseId!=null&&Number.isFinite(Number(e.at)));
}
export function mergeCubeTimes(local=[],remote=[]){
 return uniqueList(local,remote,t=>String(t.uid||[t.date,t.scramble,t.ms].join('|')),3500,
  t=>typeof t.date==='string'&&typeof t.scramble==='string'&&Number.isFinite(t.ms)&&t.ms>=0);
}
