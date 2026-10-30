import {facelets, stickerPositions} from './engine.mjs';

// Diagrama isométrico de F2L: não reutilizar o mapa superior de OLL/PLL.
// A posição das peças vem do motor 3x3; o mascaramento é apenas visual.
const positions=stickerPositions();
const posGroups=new Map();
positions.forEach(({position},index)=>{
  const key=position.join(',');
  if(!posGroups.has(key))posGroups.set(key,[]);
  posGroups.get(key).push(index);
});

const sameColors=(actual,expected)=>
  actual.length===expected.length &&
  actual.slice().sort().join('|')===expected.slice().sort().join('|');

function targetStickers(state,front,right,bottom){
  const target=new Set();
  const corner=[front,right,bottom];
  const edge=[front,right];
  for(const group of posGroups.values()){
    const colors=group.map(i=>state[i]);
    if(sameColors(colors,corner)||sameColors(colors,edge)){
      group.forEach(i=>target.add(i));
    }
  }
  return target;
}

const point=(o,x,y,c,r)=>[o[0]+x[0]*c+y[0]*r,o[1]+x[1]*c+y[1]*r];
function sticker(o,x,y,row,col,color){
  const corners=[[col,row],[col+1,row],[col+1,row+1],[col,row+1]]
    .map(([c,r])=>point(o,x,y,c,r).map(v=>v.toFixed(2)).join(',')).join(' ');
  return '<polygon points="'+corners+'" fill="'+color+
    '" stroke="#11121a" stroke-width="2.3" stroke-linejoin="round"/>';
}

/**
 * A ilustração conserva apenas as cores do canto e da aresta do par,
 * como nos esquemas de reconhecimento F2L do material do usuário:
 * camada U escura, face frontal vermelha e direita azul.
 */
export function f2lRecognitionDiagram(state,{size=258}={}){
  const faces=facelets(state);
  const front=faces.F[4],right=faces.R[4],bottom=faces.D[4],top=faces.U[4];
  const pair=targetStickers(state,front,right,bottom);
  const colors={
    [front]:'#ed4546',
    [right]:'#2764ef',
    [bottom]:'#f5f7fb',
    [top]:'#f2cf46'
  };
  const gray='#292b31',slot='#24262d';
  const palette=value=>colors[value]||gray;
  // Correspondência exata com a ordem do vetor de facelets: U, D, F, B, R, L.
  const offsets={U:0,D:9,F:18,B:27,R:36,L:45};
  const visibleColor=(face,index)=>{
    const global=offsets[face]+index;
    if(pair.has(global))return palette(state[global]);
    if(face==='U')return gray;
    // O slot frontal-direito incompleto permanece sombreado até o encaixe.
    if((face==='F'&&(index===5||index===8))||
       (face==='R'&&(index===3||index===6)))return slot;
    return face==='F'?colors[front]:colors[right];
  };
  const origin={
    U:[140,19],
    F:[53,62.5],
    R:[140,106]
  };
  const axes={
    U:[[29,14.5],[-29,14.5]],
    F:[[29,14.5],[0,38]],
    R:[[29,-14.5],[0,38]]
  };
  let html='';
  for(const face of ['F','R','U']){
    const [x,y]=axes[face];
    for(let row=0;row<3;row++)for(let col=0;col<3;col++){
      html+=sticker(origin[face],x,y,row,col,visibleColor(face,row*3+col));
    }
  }
  return '<svg class="recognition-diagram f2l-recognition" width="'+size+
    '" height="'+Math.round(size*0.93)+
    '" viewBox="35 0 210 233" xmlns="http://www.w3.org/2000/svg" role="img" '+
    'aria-label="F2L em perspectiva, branco do par destacado, frente vermelha, direita azul e topo escuro nos adesivos irrelevantes">'+
    html+'</svg>';
}
