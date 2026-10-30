import {facelets} from './engine.mjs';
const palette={U:'#f2f3f7',D:'#f4d448',F:'#239e63',B:'#3779d6',L:'#ef8e37',R:'#d44b47',X:'#303038'};
const rect=(x,y,w,h,color)=>'<rect x="'+x+'" y="'+y+'" width="'+w+'" height="'+h+'" rx="1" fill="'+(palette[color]||palette.X)+'" stroke="#15151a" stroke-width="1.6"/>';
export function recognitionDiagram(state,stage,{size=230}={}){
 const f=facelets(state),tile=26,gap=2,unit=tile+gap,origin=43;
 const paint=(face,index)=>stage==='oll'?(f[face][index]==='D'?'D':'X'):f[face][index];
 let cells='';
 for(let r=0;r<3;r++)for(let c=0;c<3;c++)cells+=rect(origin+c*unit,origin+r*unit,tile,tile,paint('U',r*3+c));
 // Faixas laterais adjacentes à camada superior: B (acima), F (abaixo), L/R.
 for(let c=0;c<3;c++){
  cells+=rect(origin+c*unit,origin-12,tile,9,paint('B',c));
  cells+=rect(origin+c*unit,origin+3*unit+3,tile,9,paint('F',c));
 }
 for(let r=0;r<3;r++){
  cells+=rect(origin-12,origin+r*unit,9,tile,paint('L',r));
  cells+=rect(origin+3*unit+3,origin+r*unit,9,tile,paint('R',r));
 }
 return '<svg class="recognition-diagram" width="'+size+'" height="'+size+'" viewBox="0 0 170 170" role="img" aria-label="Diagrama de reconhecimento '+stage.toUpperCase()+' com face superior e faixas laterais">'+cells+'</svg>';
}
