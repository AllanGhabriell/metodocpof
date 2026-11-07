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
// Stable aliases also cover legacy records, imports and edits made on other devices.
export function cubeSolveAliases(t){
 if(!t||typeof t!=='object')return [];
 const result=[];
 if(t.id)result.push('id:'+String(t.id));
 if(t.uid)result.push('uid:'+String(t.uid));
 result.push('legacy:'+String(t.date||'')+'|'+String(t.scramble||'')+'|'+String(t.ms??0));
 return result;
}
export function cubeSolveKey(t){return cubeSolveAliases(t)[0]||''}
export function mergeCubeDeletionMarks(local=[],remote=[]){
 const marks=new Map();
 for(const m of [...(Array.isArray(local)?local:[]),...(Array.isArray(remote)?remote:[])]){
  if(!m||typeof m.key!=='string'||!m.key||m.key.length>400||!Number.isFinite(Number(m.at)))continue;
  const old=marks.get(m.key);
  if(!old||Number(m.at)>Number(old.at)||(Number(m.at)===Number(old.at)&&m.deleted))
   marks.set(m.key,{key:m.key,at:Number(m.at),deleted:!!m.deleted});
 }
 return [...marks.values()].sort((a,b)=>a.at-b.at).slice(-12000);
}
export function mergeCubeTimes(local=[],remote=[],deletions=[]){
 const forbidden=new Set(deletions.filter(d=>d.deleted).map(d=>d.key));
 const list=[],identities=new Set();
 // Prefer local copy when an identical entry also exists in cloud.
 for(const item of [...(Array.isArray(local)?local:[]),...(Array.isArray(remote)?remote:[])]){
  if(!validObj(item)||typeof item.date!=='string'||typeof item.scramble!=='string'||!Number.isFinite(item.ms)||item.ms<0)continue;
  const aliases=cubeSolveAliases(item);
  if(aliases.some(k=>forbidden.has(k)||identities.has(k)))continue;
  aliases.forEach(k=>identities.add(k));
  list.push(item);
 }
 return list.sort((a,b)=>Date.parse(a.date)-Date.parse(b.date)).slice(-3500);
}
