// Motor de facelets 3x3. Convenção: U=branco, F=verde, R=vermelho.
const faces={
 U:{n:[0,1,0],r:[1,0,0],d:[0,0,1]},
 D:{n:[0,-1,0],r:[1,0,0],d:[0,0,-1]},
 F:{n:[0,0,1],r:[1,0,0],d:[0,-1,0]},
 B:{n:[0,0,-1],r:[-1,0,0],d:[0,-1,0]},
 R:{n:[1,0,0],r:[0,0,-1],d:[0,-1,0]},
 L:{n:[-1,0,0],r:[0,0,1],d:[0,-1,0]}
};
const add=(a,b,k=1)=>a.map((v,i)=>v+b[i]*k);
const key=(p,n)=>p.join(',')+'|'+n.join(',');
const stickers=[];const positions=new Map();
for(const [face,{n,r,d}] of Object.entries(faces)){
 for(let row=0;row<3;row++)for(let col=0;col<3;col++){
  const p=add(add(n,r,col-1),d,row-1);
  const sticker={face,row,col,p,n};
  positions.set(key(p,n),stickers.length);
  stickers.push(sticker);
 }
}
const definitions={
 U:{axis:1,sign:1,layers:[1]},D:{axis:1,sign:-1,layers:[-1]},
 R:{axis:0,sign:1,layers:[1]},L:{axis:0,sign:-1,layers:[-1]},
 F:{axis:2,sign:1,layers:[1]},B:{axis:2,sign:-1,layers:[-1]},
 M:{axis:0,sign:-1,layers:[0]},E:{axis:1,sign:-1,layers:[0]},S:{axis:2,sign:1,layers:[0]},
 x:{axis:0,sign:1,layers:[-1,0,1]},y:{axis:1,sign:1,layers:[-1,0,1]},z:{axis:2,sign:1,layers:[-1,0,1]}
};
const rotate=(v,axis,dir)=>{
 const [x,y,z]=v;
 if(axis===0)return [x,-dir*z,dir*y];
 if(axis===1)return [dir*z,y,-dir*x];
 return [-dir*y,dir*x,z];
};
export function solved(){return stickers.map(s=>s.face)}
export function parse(algorithm){
 const input=String(algorithm).replace(/[’‘′]/g,"'").replace(/\/\/[^\n]*/g,' ');
 let i=0;
 function sequence(close){
  const result=[];
  while(i<input.length){
   if(/\s|,/.test(input[i])){i++;continue}
   if(close&&input[i]===close){i++;return result}
   if(input[i]==='('||input[i]==='{'){
    const end=input[i++]==='('?')':'}';
    const group=sequence(end);
    const repeat=readNumber();
    for(let j=0;j<(repeat||1);j++)result.push(...group);
    continue;
   }
   const match=/^(Rw|Lw|Uw|Dw|Fw|Bw|[URFDLBMESxyzurfdlb])([2]?'?|')/.exec(input.slice(i));
   if(!match)throw new SyntaxError('Movimento inválido na posição '+i+': '+input.slice(i,i+12));
   i+=match[0].length;
   let face=match[1];
   if(/^[urfdlb]$/.test(face))face=face.toUpperCase()+'w';
   result.push({face,turns:match[2].includes('2')?2:match[2].includes("'")?-1:1});
  }
  if(close)throw new SyntaxError('Agrupamento não fechado: '+close);
  return result;
 }
 function readNumber(){const m=/^\d+/.exec(input.slice(i));if(m){i+=m[0].length;return Number(m[0])}return 0}
 return sequence(null);
}
export function inverse(algorithm){
 return parse(algorithm).reverse().map(({face,turns})=>face+(turns===2?'2':turns===1?"'":'')).join(' ');
}
function definition(face){
 if(definitions[face])return definitions[face];
 if(/^[URFDLB]w$/.test(face)){
  const base=definitions[face[0]];
  return {...base,layers:[base.sign,0]};
 }
 throw new SyntaxError('Face desconhecida: '+face);
}
export function apply(state,algorithm){
 let current=state.slice();
 if(current.length!==54)throw new RangeError('O estado deve conter 54 adesivos');
 for(const {face,turns} of Array.isArray(algorithm)?algorithm:parse(algorithm)){
  const {axis,sign,layers}=definition(face);
  const dir=-sign*(turns<0?-1:1);
  const steps=Math.abs(turns)===2?2:1;
  for(let step=0;step<steps;step++){
   const next=current.slice();
   for(let k=0;k<stickers.length;k++){
    const {p,n}=stickers[k];
    if(!layers.includes(p[axis]))continue;
    const target=positions.get(key(rotate(p,axis,dir),rotate(n,axis,dir)));
    if(target===undefined)throw new Error('Mapeamento inválido');
    next[target]=current[k];
   }
   current=next;
  }
 }
 return current;
}
export function isSolved(state){return Object.keys(faces).every((f,i)=>state.slice(i*9,i*9+9).every(c=>c===f))}
export function facelets(state){return Object.fromEntries(Object.keys(faces).map((f,i)=>[f,state.slice(i*9,i*9+9)]))}
export function verifySetupAndSolution(setup,solution,{allowAuf=true}={}){
 const initial=apply(solved(),setup);
 const after=apply(initial,solution);
 const aufs=allowAuf?['','U',"U'",'U2']:[''];
 const matchingAuf=aufs.find(auf=>isSolved(apply(after,auf)));
 return {valid:matchingAuf!==undefined,matchingAuf:matchingAuf??null,initial,after};
}
export function verifyDiagram(state,expected){
 const actual=facelets(state);const mismatches=[];
 for(const [face,pattern] of Object.entries(expected)){
  if(!actual[face]||pattern.length!==9)throw new TypeError('Diagrama inválido: '+face);
  pattern.forEach((color,i)=>{if(color!==null&&color!==undefined&&color!=='?'&&color!=='*'&&actual[face][i]!==color)mismatches.push({face,index:i,expected:color,actual:actual[face][i]})});
 }
 return {valid:mismatches.length===0,mismatches};
}

export function stickerPositions(){return stickers.map(({face,p})=>({face,position:p.slice()}))}
