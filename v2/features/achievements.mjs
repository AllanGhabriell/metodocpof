import {academyActivityData} from './academy-insights.mjs';
const DAY=86400000;
export const achievementCatalog=[
 {id:'first',title:'Primeiro treino',subtitle:'Registre sua primeira atividade',xp:15,icon:'✦'},
 {id:'ten',title:'Entrando no ritmo',subtitle:'Registre 10 atividades',xp:20,icon:'⚡'},
 {id:'fifty',title:'50 práticas',subtitle:'Complete 50 atividades',xp:40,icon:'🎯'},
 {id:'hundred',title:'100 práticas',subtitle:'Alcance 100 atividades',xp:65,icon:'🏅'},
 {id:'f2l',title:'Explorador F2L',subtitle:'Pratique 5 casos de F2L',xp:30,icon:'🧩'},
 {id:'oll',title:'Olhar de OLL',subtitle:'Pratique 5 casos de OLL',xp:30,icon:'👁️'},
 {id:'pll',title:'Mestre dos giros',subtitle:'Pratique 5 casos de PLL',xp:30,icon:'🔁'},
 {id:'f2l20',title:'F2L avançando',subtitle:'Pratique 20 casos diferentes de F2L',xp:70,icon:'💠'},
 {id:'oll20',title:'OLL avançando',subtitle:'Pratique 20 casos diferentes de OLL',xp:70,icon:'🌟'},
 {id:'pll21',title:'Todos os PLL',subtitle:'Pratique os 21 casos de PLL',xp:130,icon:'👑'},
 {id:'all',title:'CFOP completo',subtitle:'Treine F2L, OLL e PLL',xp:85,icon:'🌈'},
 {id:'allcross',title:'Da cruz ao PLL',subtitle:'Pratique Cross e as três etapas de casos',xp:110,icon:'🏆'},
 {id:'streak3',title:'Três dias seguidos',subtitle:'Treine por 3 dias seguidos',xp:30,icon:'🔥'},
 {id:'streak7',title:'Uma semana de treino',subtitle:'Treine por 7 dias seguidos',xp:75,icon:'📅'},
 {id:'streak30',title:'Um mês de dedicação',subtitle:'Treine por 30 dias seguidos',xp:250,icon:'💎'},
 {id:'firstsolve',title:'Primeiro solve',subtitle:'Registre seu primeiro tempo de cubo',xp:25,icon:'⏱️'},
 {id:'solves10',title:'Dez resoluções',subtitle:'Registre 10 tempos válidos',xp:50,icon:'🚀'},
 {id:'sub60',title:'Sub-60',subtitle:'Faça um tempo abaixo de 60s',xp:60,icon:'💨'},
 {id:'sub30',title:'Sub-30',subtitle:'Faça um tempo abaixo de 30s',xp:100,icon:'🥇'},
 {id:'sub20',title:'Sub-20',subtitle:'Faça um tempo abaixo de 20s',xp:180,icon:'⚡'},
 {id:'cross',title:'Cruz construída',subtitle:'Conclua uma atividade Cross',xp:25,icon:'✚'},
 {id:'f2l41',title:'Cartógrafo dos 41',subtitle:'Pratique os 41 casos distintos de F2L',xp:0,icon:'🗺️',rarity:'lendária'},
 {id:'oll57',title:'Olhos do Prisma',subtitle:'Pratique os 57 casos distintos de OLL',xp:0,icon:'🔮',rarity:'mítica'},
 {id:'solves100',title:'Centúria dos Giros',subtitle:'Registre 100 resoluções válidas',xp:0,icon:'⚔️',rarity:'épica'},
 {id:'streak90',title:'Disciplina de Ferro',subtitle:'Treine 90 dias consecutivos',xp:0,icon:'🛡️',rarity:'lendária'},
 {id:'sub15',title:'Raio Primordial',subtitle:'Registre tempo válido abaixo de 15 segundos',xp:0,icon:'⚡',rarity:'mítica'},
 {id:'persistence',title:'Caminho do Artesão',subtitle:'Pratique ao menos 10 casos de cada etapa',xp:0,icon:'🛠️',rarity:'rara'}
];
const safeArray=(key)=>{try{const v=JSON.parse(localStorage.getItem(key)||'[]');return Array.isArray(v)?v:[]}catch{return []}};
export function achievementStats(extraRecords=[]){
 const activity=academyActivityData(extraRecords),cases=activity.cases||[];
 const stages={f2l:new Set(),oll:new Set(),pll:new Set()};
 for(const item of cases)if(stages[item.stage])stages[item.stage].add(String(item.caseId));
 const rawTimes=activity.times||[];
 const valid=rawTimes.map(x=>Number(x.ms)).filter(ms=>Number.isFinite(ms)&&ms>=1000&&ms<=3600000);
 const first=valid.length?Math.min(...valid):null;
 const cross=extraRecords.some(r=>/cross|cruz/i.test(r.type||''));
 // Metas de atividade não devem crescer com cliques repetidos no mesmo caso.
 const distinctCases=new Set(cases.map(r=>r.stage+'|'+r.caseId));
 const distinctActivities=new Set(extraRecords.map(r=>String(r.type)+'|'+String(r.date)));
 const total=distinctCases.size+valid.length+distinctActivities.size;
 return {
  total,streak:activity.streak||0,counts:Object.fromEntries(Object.entries(stages).map(([k,v])=>[k,v.size])),
  stageAttempts:cases.length,cross,best:first,solveCount:valid.length,
  lastFive:valid.slice(-5),hasAll:['f2l','oll','pll'].every(k=>stages[k].size>0),
  times:valid
 };
}
export function earnedAchievements(records=[]){
 const s=achievementStats(records),c=s.counts;
 const passed={
  first:s.total>0,ten:s.total>=10,fifty:s.total>=50,hundred:s.total>=100,
  f2l:c.f2l>=5,oll:c.oll>=5,pll:c.pll>=5,
  f2l20:c.f2l>=20,oll20:c.oll>=20,pll21:c.pll>=21,
  all:s.hasAll,allcross:s.hasAll&&s.cross,
  streak3:s.streak>=3,streak7:s.streak>=7,streak30:s.streak>=30,
  firstsolve:s.solveCount>=1,solves10:s.solveCount>=10,
  sub60:s.best!==null&&s.best<60000,sub30:s.best!==null&&s.best<30000,
  sub20:s.best!==null&&s.best<20000,cross:s.cross,
  f2l41:c.f2l>=41,oll57:c.oll>=57,solves100:s.solveCount>=100,streak90:s.streak>=90,
  sub15:s.best!==null&&s.best<15000,persistence:c.f2l>=10&&c.oll>=10&&c.pll>=10
 };
 return achievementCatalog.map(a=>({...a,earned:!!passed[a.id]}));
}
export const achievementBonus=records=>earnedAchievements(records).filter(a=>a.earned).reduce((n,a)=>n+a.xp,0);
