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
 const math=Object.create(Math);let random=0.25;math.random=()=>random;
 const context={localStorage:store,Date:Clock,Math:math,console};
 context.globalThis=context;
 runInNewContext(read('assets/js/trainer-coach.js'),context,{filename:'trainer-coach.js'});
 return {coach:context.CPOFCoach,store,setRandom:value=>{random=value},advance:ms=>{now+=ms},records:()=>JSON.parse(store.getItem('cpof-academy-activity-v1')||'[]')};
}
test('three trainers share compact controls and never flash original case PNGs before library choice',()=>{
 const pages=['f2l.html','oll.html','pll.html'].map(read);
 const ids=pages.map(html=>[...html.matchAll(/\bid="([^"]+)"/g)].map(m=>m[1]));
 assert.deepEqual(ids[0],ids[1]);
 assert.deepEqual(ids[1],ids[2]);
 const options=['random','sequential','competitive','adaptive','review','focus'];
 for(let i=0;i<3;i++){
  const html=pages[i],stage=['f2l','oll','pll'][i];
  for(const mode of options)assert.ok(html.includes('value="'+mode+'"'),mode);
  for(const id of ['trainer-easy-btn','trainer-hard-btn','prev-case-btn','skip-case-btn','trainer-mode-help'])assert.ok(html.includes('id="'+id+'"'),id);
  assert.ok(!html.includes('class="trainer-feedback"'),'no separate review panel');
  assert.ok(!html.includes('data-trainer-rating="medium"'),'only two decisions');
  assert.ok(html.indexOf('<section id="case-moves"')>html.indexOf('<div class="img-wrap"'),'algorithm follows image');
  assert.ok(html.indexOf('<div class="controls-row"')>html.indexOf('<section id="case-moves"'),'controls follow optional algorithm');
  assert.ok(html.includes('src="data:image/gif;base64,'),stage+' safe placeholder');
  assert.ok(!html.includes('src="'+stage+'/'),stage+' original PNG should load only after library selection');
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
 for(const needle of ['coach.complete(', 'coach.weightedPick(', 'coach.dueCases(', 'sequentialReview','trainerRecognizedButton','trainerEasyButton','trainerHardButton','onDifficultCase','changeTrainingMode'])assert.ok(trainer.includes(needle),needle);
 for(const needle of ['academyTrainingPanel(s.cases)','academy-training-chart','academy-goal-period','academy-save-goals'])assert.ok(analytics.includes(needle),needle);
 assert.ok(app.includes("if(page==='srs')return '<section"));
 assert.ok(!app.includes("if(page==='srs')return studyPage"));
 assert.ok(trainer.includes("new URLSearchParams(location.search).get('mode')"));
});

test('easy and difficult are recorded as attempts and two consecutive easy results remove a hard priority',()=>{
 const {coach,records}=fixture();
 const hard=coach.complete('f2l','12',{mode:'random',result:'hard'});
 assert.equal(hard.record.grade,'bad');
 assert.equal(hard.record.result,'hard');
 assert.equal(hard.stats.hardClicks,1);
 assert.equal(hard.stats.needsPractice,true);
 assert.equal(hard.stats.rating,'hard');
 const once=coach.complete('f2l','12',{mode:'random',result:'easy'});
 assert.equal(once.record.grade,'good');
 assert.equal(once.stats.needsPractice,true);
 assert.equal(once.stats.consecutiveEasy,1);
 const twice=coach.complete('f2l','12',{mode:'random',result:'easy'});
 assert.equal(twice.stats.needsPractice,false);
 assert.equal(twice.stats.rating,'easy');
 assert.equal(twice.stats.consecutiveEasy,2);
 const hardAgain=coach.complete('f2l','12',{mode:'sequential',result:'hard'});
 assert.equal(hardAgain.stats.needsPractice,true);
 assert.equal(hardAgain.stats.hardClicks,2);
 assert.equal(hardAgain.stats.consecutiveEasy,0);
 assert.equal(records().length,4);
});

test('random mode increases the chance of difficult cases without always showing them',()=>{
 const {coach,setRandom}=fixture();
 coach.complete('oll','1',{mode:'random',result:'hard'});
 coach.complete('oll','2',{mode:'random',result:'easy'});
 setRandom(0.25);
 assert.equal(coach.weightedPick('oll',['1','2'],'random'),'1');
 setRandom(0.99999);
 assert.equal(coach.weightedPick('oll',['1','2'],'random'),'2');
 assert.equal(coach.weightedPick('oll',['1','2','3','4'],'random',{recent:['1','2','3']}),'4');
});

test('sequential difficult cases are reinforced without counting skips as successful attempts',()=>{
 const trainer=read('assets/js/secao.js');
 assert.ok(trainer.includes("advanceSequentialPractice('hard')"));
 assert.ok(trainer.includes("advanceSequentialPractice('easy')"));
 assert.ok(trainer.includes("advanceSequentialPractice('skip')"));
 assert.ok(trainer.includes('if(outcome!==\'skip\'&&needsMorePractice(last))'));
 assert.ok(trainer.includes("logCasePractice(caseId,elapsed,'hard')"));
 assert.ok(trainer.includes("logCasePractice(currentCase,elapsedMs,state.competitive.enabled?'completed':'easy')"));
 assert.ok(trainer.includes("['random','adaptive','review','focus'].includes(currentTrainingMode())"));
});

test('large case preview has the same dimensions in every mode and respects user sizing',()=>{
 const css=read('assets/css/trainer-unified.css');
 assert.match(css,/body\[data-set\] \.img-wrap,[\s\S]*?body\[data-set\] \.img-wrap\.show-mask\s*\{[^}]*height:clamp\(260px,42vh,400px\)/);
 assert.match(css,/body\[data-set\] \.img-wrap #case-image\s*\{[^}]*var\(--case-scale,1\)/);
 assert.match(css,/body\[data-set\] \.controls-row\s*\{[^}]*grid-template-columns:1\.15fr 1fr 1fr \.75fr/s);
 assert.match(css,/\.controls-row\.is-competitive\.has-recognition/);
 const trainer=read('assets/js/secao.js');
 assert.ok(trainer.includes('caseMovesToggle.hidden = false;'));
 assert.ok(!trainer.includes('if (orderedMode) movesOpen = true;'));
 assert.ok(trainer.includes("onDifficultCase(){"));
});

test('the mode explanations stay collapsible and the drawer has tidy grouped controls',()=>{
 for(const stage of ['f2l','oll','pll']){
  const html=read(stage+'.html');
  assert.match(html,/<details class="trainer-mode-help"/);
  assert.match(html,/<details class="trainer-guide">/);
  for(const word of ['Aleatório','Sequencial','Competitivo','Adaptativo','Revisão espaçada','Foco'])
   assert.ok(html.includes(word));
  assert.ok(!html.includes('0 práticas'));
  assert.ok(!html.includes('Como está este caso?'));
  assert.ok(!html.includes('Não consegui resolver'));
  assert.match(html,/id="trainer-timed-practice"/);
  assert.ok(html.indexOf('id="trainer-timed-practice"')>html.indexOf('id="menu-panel"'));
 }
});
