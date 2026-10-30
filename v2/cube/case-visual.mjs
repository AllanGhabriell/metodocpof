import {facelets,stickerPositions} from './engine.mjs';
const geometry=stickerPositions();
export const resolutionOrientation='x2 y';
export function maskCaseState(state,stage){
 const result=state.slice();
 if(!['f2l','oll','pll'].includes(stage))return result;
 for(let i=0;i<result.length;i++){
  const {face,position}=geometry[i];
  if(stage==='f2l'){
   // O F2L depende dos cantos e arestas da camada U: não ocultar suas
   // cores laterais nem as peças inteiras. Escurecer só o amarelo irrelevante.
   // Preservar o centro superior como referência de orientação.
   if(state[i]==='D' && !(face==='U'&&i%9===4))result[i]='X';
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
