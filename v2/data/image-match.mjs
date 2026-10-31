// Comparação local conservadora entre recortes já aprovados e novos diagramas.
// Não atribui identidade se o padrão for ambíguo ou apresentar diferença excessiva.
const SIZE=16;
function getColors(data){
 const out=[];for(let i=0;i<data.length;i+=4){
  const r=data[i],g=data[i+1],b=data[i+2],alpha=data[i+3],lum=(r+g+b)/3;
  if(alpha<80||lum>233)out.push('w');
  else if(lum<70)out.push('d');
  else if(r>130&&g>110&&b<110&&r>b*1.25&&g>b*1.18)out.push('y');
  else if(r>g*1.3&&r>b*1.27)out.push('r');
  else if(g>r*1.17&&g>b*1.15)out.push('g');
  else if(b>r*1.25&&b>g*1.13)out.push('b');
  else if(lum<155)out.push('k');
  else out.push('w');
 }
 return out
}
export function compareSignatures(a,b){
 if(!a||!b||a.length!==SIZE*SIZE||b.length!==SIZE*SIZE)return 1;
 let score=0,total=0;
 for(let y=0;y<SIZE;y++)for(let x=0;x<SIZE;x++){
  const i=y*SIZE+x,aa=a[i],bb=b[i];if(aa==='w'&&bb==='w')continue;
  total++;if(aa!==bb)score++;
 }
 return total>=18?score/total:1
}
function rotate(a){return Array.from({length:SIZE*SIZE},(_,i)=>{
 const x=i%SIZE,y=Math.floor(i/SIZE);return a[(SIZE-1-x)*SIZE+y]
})}
export function bestDiagramDistance(a,b){
 let v=b,best=1;for(let i=0;i<4;i++){best=Math.min(best,compareSignatures(a,v));v=rotate(v)}return best
}
export function signatureFromImage(src){
 return new Promise((resolve,reject)=>{
  const img=new Image();
  img.onload=()=>{
   const c=document.createElement('canvas');c.width=c.height=SIZE;
   const ctx=c.getContext('2d',{willReadFrequently:true});ctx.fillStyle='#fff';ctx.fillRect(0,0,SIZE,SIZE);
   ctx.drawImage(img,0,0,SIZE,SIZE);resolve(getColors(ctx.getImageData(0,0,SIZE,SIZE).data));
  };
  img.onerror=()=>reject(Error('Recorte não pôde ser lido'));img.src=src;
 })
}
export async function matchDiagrams(cases,references){
 const fingerprints=[];
 for(const c of references||[]){
  if(!c.case_id||!c.image_data)continue;
  try{fingerprints.push({id:c.case_id,colors:await signatureFromImage(c.image_data)})}catch{}
 }
 const found=new Map();
 for(const c of cases||[]){
  if(!c.imageData)continue;
  const source=await signatureFromImage(c.imageData).catch(()=>null);
  if(!source)continue;
  const ranks=fingerprints.map(r=>({id:r.id,d:bestDiagramDistance(source,r.colors)}))
   .sort((a,b)=>a.d-b.d);
  if(ranks.length&&ranks[0].d<=.23&&(!ranks[1]||ranks[1].d-ranks[0].d>=.12)){
   found.set(c,ranks[0].id);
  }
 }
 return found
}
