import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';
import {resolve} from 'node:path';
const root=resolve(import.meta.dirname,'../..');
const read=p=>readFileSync(resolve(root,p),'utf8');
function fixture(){
 let now=Date.UTC(2026,9,30,15,0),data=new Map();
 const store={
  getItem:key=>data.get(key)??null,
  setItem:(key,val)=>data.set(key,String(val)),
  removeItem:key=>data.delete(key)
 };
 class Clock extends Date{
  constructor(...args){super(...args.length?args:[now])}
  static now(){return now}
 }
 const context={localStorage:store,Date:Clock,Math,console};
 context.globalThis=context;
 runInNewContext(read('assets/js/trainer-coach.js'),context,{filename:'trainer-coach.js'});
 return {coach:context.CPOFCoach,store,advance:ms=>{now+=ms},records:()=>JSON.parse(store.getItem('cpof-academy-activity-v1')||'[]')};
}
test('three original trainers have the same modes, feedback and settings, and keep original PNGs',()=>{
 const pages=['f2l.html','oll.html','pll.html'].map(read);
 const ids=pages.map(html=>[...html.matchAll(/\bid="([^"]+)"/g)].map(m=>m[1]));
 assert.deepEqual(ids[0],ids[1]);
 assert.deepEqual(ids[1],ids[2]);
 const options=['random','sequential','competitive','adaptive','review','focus'];
 for(let i=0;i<3;i++){
  const html=pages[i],stage=['f2l','oll','pll'][i];
  for(const mode of options)assert.ok(html.includes('value="'+mode+'"'),mode);
  for(const difficulty of ['easy','medium','hard'])assert.ok(html.includes('data-trainer-rating="'+difficulty+'"'));
  assert.ok(html.includes('src="'+stage+'/'),stage+' PNG');
  assert.ok(html.includes('trainer-coach.js'));
  assert.ok(html.includes('trainer-unified.css'));
  assert.ok(html.includes('trainer-goal-period'));
 }
});
test('a difficulty rating changes scheduling priority without inventing a resolution or XP',()=>{
 const {coach,records,advance}=fixture();
 assert.equal(coach.rate('f2l','12','hard').rating,'hard');
 assert.equal(records().length,0);
 assert.deepEqual([...coach.dueCases('f2l',['12','13'])],[]);
 const result=coach.complete('f2l','12',{mode:'random'});
 assert.equal(result.record.mode,'random');
 assert.equal(result.record.ms,null);
 assert.equal(result.stats.attempts,1);
 assert.equal(result.stats.grade,'medium');
 assert.equal(result.record.verified,false);
 assert.equal(records().length,1);
 advance(7*60*60*1000);
 assert.deepEqual([...coach.dueCases('f2l',['12','13'])],['12']);
 const next=coach.complete('f2l','12',{mode:'review',ms:3200});
 assert.equal(next.record.reviewed,true);
 assert.equal(next.record.ms,3200);
 assert.equal(next.stats.avgMs,3200);
});
test('competitive difficulty uses measured time, not manual difficulty',()=>{
 const {coach}=fixture();
 coach.rate('pll','Ua','easy');
 const bad=coach.complete('pll','Ua',{mode:'competitive',ms:9300,goalMs:5000,recognitionMs:1200});
 assert.equal(bad.record.grade,'bad');
 assert.equal(bad.record.xp,2);
 assert.equal(bad.record.recognitionMs,1200);
 const good=coach.complete('pll','Ua',{mode:'competitive',ms:3300,goalMs:5000});
 assert.equal(good.record.grade,'good');
 assert.ok(good.record.xp>2);
 assert.equal(good.record.recognitionMs,null);
});
test('adaptive choice avoids just-practiced cases, and free weekly goals are saved',()=>{
 const {coach}=fixture();
 coach.rate('oll','1','hard');
 assert.equal(coach.weightedPick('oll',['1','2','3','4'],'adaptive',{recent:['1','2','3']}),'4');
 assert.equal(coach.weightedPick('oll',['1'],'review',{recent:['1']}),'1');
 let p=coach.preferences({goalPeriod:'weekly',weeklyGoal:80,dailyGoal:12});
 assert.equal(p.goalPeriod,'weekly');
 assert.equal(coach.read().settings.goalPeriod,'weekly');
 p=coach.preferences({goalPeriod:'free'});
 assert.equal(p.goalPeriod,'free');
});
test('repeated clicks do not produce unlimited XP',()=>{
 const {coach,records}=fixture();
 for(let i=0;i<12;i++)coach.complete('oll','5',{mode:'random'});
 assert.equal(records().length,12);
 assert.equal(records()[8].xp,0);
 assert.equal(records()[11].xp,0);
});
test('coach is connected in classic trainer and analytics, no card-based review is presented',()=>{
 const trainer=read('assets/js/secao.js'),analytics=read('v2/features/academy-insights.mjs'),app=read('v2/app.js');
 for(const needle of ['coach.complete(', 'coach.rate(', 'coach.weightedPick(', 'coach.dueCases(', 'sequentialReview','trainerRecognizedButton','changeTrainingMode'])assert.ok(trainer.includes(needle),needle);
 for(const needle of ['academyTrainingPanel(s.cases)','academy-training-chart','academy-goal-period','academy-save-goals'])assert.ok(analytics.includes(needle),needle);
 assert.ok(app.includes("if(page==='srs')return '<section"));
 assert.ok(!app.includes("if(page==='srs')return studyPage"));
 assert.ok(trainer.includes("new URLSearchParams(location.search).get('mode')"));
});
