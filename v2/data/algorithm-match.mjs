import {CASE_BY_ID} from './case-catalog.mjs';
// O algoritmo é uma pista, nunca altera o catálogo fixo. Casos ambíguos ficam para revisão humana.
export function normalizedAlgorithm(text){
 return String(text||'').replace(/[’‘′]/g,"'").replace(/[{}()]/g,'').replace(/2'/g,'2').replace(/\s+/g,' ').trim().toUpperCase();
}
export function algorithmIndex(cases){
 const index=new Map();
 for(const c of cases||[]){
  if(!CASE_BY_ID.has(c.id))continue;
  for(const s of [c.algorithm]){const alg=normalizedAlgorithm(s);if(!alg)continue;
   const k=c.stage+':'+alg;
   if(!index.has(k))index.set(k,new Set());
   index.get(k).add(c.id);
  }
 }
 return index
}
export function identifyByAlgorithm(stage,algorithm,index){
 const possibilities=index.get(stage+':'+normalizedAlgorithm(algorithm));
 return possibilities?.size===1?[...possibilities][0]:null;
}
