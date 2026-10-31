// Gamificação progressiva. XP mede participação, não habilidade técnica.
export const MAX_LEVEL=500;
export const titles=[
 [1,'Forasteiro'],[5,'Novato'],[10,'Aspirante'],[15,'Aprendiz'],[20,'Explorador'],
 [30,'Escudeiro'],[40,'Adepto'],[50,'Artífice'],[60,'Guardião'],[70,'Sentinela'],
 [80,'Cavaleiro'],[90,'Arcanista'],[100,'Mestre Arcano'],[110,'Campeão'],[120,'Arquimago'],
 [130,'Grão-Mestre'],[140,'Senhor do Prisma'],[150,'Lendário'],[170,'Lendário Ascendente'],
 [190,'Herói Mítico'],[210,'Soberano Astral'],[230,'Guardião Celestial'],[250,'Primordial'],
 [300,'Transcendente'],[350,'Arquiteto do Infinito'],[400,'Eterno'],[450,'Soberano do Multiverso'],
 [500,'Divindade Prismática']
];
const thresholds=new Array(MAX_LEVEL+1).fill(0);
for(let level=2;level<=MAX_LEVEL;level++){
 const n=level-1;
 thresholds[level]=thresholds[level-1]+Math.round(90+5*n+.065*n*n);
}
export function levelFromXp(raw){
 const xp=Math.max(0,Math.floor(Number(raw)||0));
 let lo=1,hi=MAX_LEVEL;
 while(lo<hi){const middle=Math.ceil((lo+hi)/2);if(thresholds[middle]<=xp)lo=middle;else hi=middle-1}
 const level=lo,earned=xp-thresholds[level],needed=level===MAX_LEVEL?0:thresholds[level+1]-thresholds[level];
 return {xp,level,title:titleFor(level),earned,needed,percent:needed?Math.min(100,Math.floor(earned/needed*100)):100};
}
export const totalForLevel=l=>thresholds[Math.max(1,Math.min(MAX_LEVEL,Math.floor(Number(l)||1)))];
export const titleFor=level=>titles.filter(([at])=>level>=at).at(-1)?.[1]||'Forasteiro';
export const defaultRewards=[
 {id:'frame-base',kind:'frame',title:'Moldura clássica',style_key:'classic',min_level:1},
 {id:'frame-crystal',kind:'frame',title:'Cristal azul',style_key:'crystal',min_level:15},
 {id:'frame-fire',kind:'frame',title:'Chamas do Guardião',style_key:'fire',min_level:60},
 {id:'frame-gold',kind:'frame',title:'Ouro imperial',style_key:'gold',min_level:130},
 {id:'frame-prismatic',kind:'frame',title:'Prisma lendário',style_key:'prismatic',min_level:150},
 {id:'name-base',kind:'name',title:'Nome clássico',style_key:'classic',min_level:1},
 {id:'name-ocean',kind:'name',title:'Azul elétrico',style_key:'ocean',min_level:30},
 {id:'name-emerald',kind:'name',title:'Esmeralda',style_key:'emerald',min_level:65},
 {id:'name-gold',kind:'name',title:'Dourado real',style_key:'gold',min_level:130},
 {id:'background-base',kind:'background',title:'Academia noturna',style_key:'classic',min_level:1},
 {id:'background-space',kind:'background',title:'Galáxia',style_key:'space',min_level:45},
 {id:'background-arcane',kind:'background',title:'Templo arcano',style_key:'arcane',min_level:100},
 {id:'background-prism',kind:'background',title:'Dimensão prismática',style_key:'prism',min_level:190},
 {id:'aura-base',kind:'aura',title:'Sem aura',style_key:'classic',min_level:1},
 {id:'aura-energy',kind:'aura',title:'Energia azul',style_key:'energy',min_level:75},
 {id:'aura-gold',kind:'aura',title:'Faíscas douradas',style_key:'gold',min_level:150},
 {id:'badge-base',kind:'badge',title:'Brasão básico',style_key:'classic',min_level:1},
 {id:'badge-knight',kind:'badge',title:'Escudo de cavaleiro',style_key:'knight',min_level:85},
 {id:'badge-crown',kind:'badge',title:'Coroa prismática',style_key:'crown',min_level:160},
 {id:'card-base',kind:'card',title:'Cartão clássico',style_key:'classic',min_level:1},
 {id:'card-royal',kind:'card',title:'Cartão real',style_key:'royal',min_level:115},
 {id:'card-celestial',kind:'card',title:'Cartão celestial',style_key:'celestial',min_level:230}
];
export const rewardKinds={frame:'Molduras',name:'Cores do nome',background:'Fundos',aura:'Auras',badge:'Brasões',card:'Cartões'};
export function availableTitles(level,additional=[]){
 const base=titles.filter(([n])=>n<=level).map(([min_level,title])=>({id:'title-'+min_level,kind:'title',title,min_level,style_key:'standard'}));
 return [...base,...additional.filter(x=>x.kind==='title'&&Number(x.min_level)<=level)];
}
export function normalizedRewards(items=[]){
 const byId=new Map(defaultRewards.map(x=>[x.id,{...x,active:true}]));
 for(const raw of items)if(raw&&/^[a-z0-9_-]{3,48}$/.test(String(raw.id))&&(Object.hasOwn(rewardKinds,raw.kind)||raw.kind==='title')&&/^[a-z0-9_-]{3,48}$/.test(String(raw.style_key))){
  if(raw.active===false){byId.delete(raw.id);continue}
  byId.set(raw.id,{id:String(raw.id),kind:raw.kind,title:String(raw.title||'').slice(0,65),style_key:String(raw.style_key||'classic'),min_level:Number(raw.min_level)||1,active:true});
 }
 return [...byId.values()];
}
