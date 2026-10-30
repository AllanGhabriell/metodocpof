import {facelets,stickerPositions} from './engine.mjs';
const geometry=stickerPositions();
export const resolutionOrientation='x2 y';
export function maskCaseState(state,stage){
 const result=state.slice();
 if(!['f2l','oll','pll'].includes(stage))return result;
 const pieces=new Map();
 geometry.forEach(({position},i)=>{const k=position.join(',');if(!pieces.has(k))pieces.set(k,[]);pieces.get(k).push(i)});
 const focus=new Set();
 if(stage==='f2l'){
  for(const indices of pieces.values()){
   const colors=indices.map(i=>state[i]).sort().join('');
   if(colors==='BRU'||colors==='BR')indices.forEach(i=>focus.add(i));
  }
 }
 for(let i=0;i<result.length;i++){
  const {face,position}=geometry[i];
  if(stage==='f2l'){
   // Peças do par vermelho-azul-branco permanecem visíveis em qualquer camada.
   if(position[1]===1&&!focus.has(i)&&!(face==='D'&&i%9===4))result[i]='X';
  }else if(stage==='oll'){
   // Orientação: mostrar somente adesivos amarelos no topo e laterais superiores.
   if(position[1]!==1||state[i]!=='D')result[i]='X';
  }else if(stage==='pll'){
   // Permutação: mostrar a camada superior; ocultar as duas camadas inferiores.
   if(position[1]!==1)result[i]='X';
  }
 }
 return result;
}
export function orientationCenters(state){const f=facelets(state);return {top:f.U[4],front:f.F[4],right:f.R[4],bottom:f.D[4]}}
