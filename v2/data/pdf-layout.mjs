import {canonicalCase,matchCaseId,LIMITS,CASE_BY_ID} from './case-catalog.mjs';
const clean=s=>String(s||'').replace(/[’‘′´]/g,"'").replace(/\s+/g,' ').trim();
const MOVE=/(?:^|[\s({])(?:[URFDLBMESxyzurfdlb](?:w)?)(?:2'?|'|2)?(?=[\s)}]|$)/g;
const TOKENS=/(?:[URFDLBMESxyzurfdlb](?:w)?)(?:2'?|'|2)?/g;
export function isAlgorithm(text){const t=clean(text);if(t.length<5||t.length>350||/[,:;.!?]/.test(t.replace(/[(){}']/g,'')))return false;
 const stripped=t.replace(/[(){}\d' \t]/g,'').replace(TOKENS,'');
 return (t.match(MOVE)||[]).length>=3&&stripped.length===0
}
const NAMES={pll:/^(?:Ua|Ub|H|Z|Aa|Ab|E|Ra|Rb|Ja|Jb|T|F|V|Y|Na|Nb|Ga|Gb|Gc|Gd)$/i,oll:/^(?:Sune|Anti-Sune|Pi|H|T|L|U)$/i};
// F2L usa diagramas tridimensionais mais altos, seguidos imediatamente pelo
// desenho seguinte. O recorte amplo usado por OLL invadia a linha de baixo.
export function diagramRect(stage,algorithmX,algorithmY,scale){
 const baseX=algorithmX-111*scale,baseY=algorithmY-30*scale;
 if(stage==='f2l')return {
  x:Math.max(0,Math.round(baseX)),y:Math.max(0,Math.round(baseY-6*scale)),
  w:Math.round(91*scale),h:Math.round(91*scale)
 };
 return {
  x:Math.max(0,Math.round(baseX)),y:Math.max(0,Math.round(baseY)),
  w:Math.round(113*scale),h:Math.round(113*scale)
 };
}
export function detectColumns(page,stage){
 const w=page.width||page.canvas?.width||980,h=page.height||page.canvas?.height||1380;
 const scale=w/595.276, rows=[];
 // Each PDF text span has an (x,y) position in rendered pixels (top-left origin).
 for(const it of page.items||[]){
  const x=Number(it.x),y=Number(it.y),str=clean(it.text);
  if(!Number.isFinite(x)||!Number.isFinite(y)||!str)continue;
  const side=x>=w*.59?'right':x>=w*.215&&x<w*.57?'left':null;
  if(!side)continue;
  let r=rows.find(r=>r.side===side&&Math.abs(r.y-y)<4*scale);
  if(!r){r={side,y,x,items:[]};rows.push(r)}
  r.items.push({x,text:str});r.x=Math.min(r.x,x);
 }
 const lines=rows.map(r=>({...r,text:clean(r.items.sort((a,b)=>a.x-b.x).map(i=>i.text).join(' '))}))
  .filter(r=>isAlgorithm(r.text)).sort((a,b)=>a.y-b.y||a.x-b.x);
 let minY=130*scale;
 if(page.page===1){
  const headline=(page.items||[]).filter(v=>/casos de (?:F2L|OLL|PLL)/i.test(v.text));
  minY=headline.length?Math.min(...headline.map(v=>v.y))+35*scale:stage==='f2l'?580*scale:stage==='oll'?455*scale:590*scale;
 }
 const relevant=lines.filter(line=>line.y>=minY&&line.y<h-55*scale);
 const clusters={left:[],right:[]};
 for(const line of relevant){
  const col=clusters[line.side];let last=col.at(-1);
  if(last&&line.y-last.at(-1).y<=35*scale)last.push(line);
  else col.push([line]);
 }
 const candidates=[];
 for(const col of Object.values(clusters)){
  for(const group of col){
   const alg=group[0],setup=group.at(-1),side=alg.side;
   const nearby=(page.items||[]).filter(it=>{
    const s=clean(it.text);return (NAMES[stage]?.test(s)||/\bcaso\s*\d+\b/i.test(s))&&
      Math.abs(it.y-alg.y)<35*scale&&it.x>=(side==='left'?w*.20:w*.63)
   }).sort((a,b)=>Math.abs(a.y-alg.y)-Math.abs(b.y-alg.y));
   candidates.push({page:page.page,side,y:alg.y,x:alg.x,algorithm:alg.text,
    setup:group.length>1?setup.text:'',alternatives:group.slice(1,-1).map(v=>v.text),
    detectedName:clean(nearby[0]?.text),rect:diagramRect(stage,alg.x,alg.y,scale)});
  }
 }
 return candidates.sort((a,b)=>a.y-b.y||a.x-b.x);
}
export function assignFixedCases(pages,stage,start=0){
 if(!LIMITS[stage])throw Error('Etapa inválida');
 const detections=pages.flatMap(p=>detectColumns(p,stage)),found=[],used=new Set();
 for(let i=0;i<detections.length;i++){
  const c=detections[i],named=matchCaseId(stage,c.detectedName);
  let fixed=named&&CASE_BY_ID.get(named)?.stage===stage?CASE_BY_ID.get(named):canonicalCase(stage,start+i+1);
  if(fixed&&used.has(fixed.id)){fixed=null}
  if(!fixed)continue;used.add(fixed.id);
  found.push({...c,case_id:fixed.id,name:fixed.name,stage,confidence:named?'nome':'ordem',
    status:'draft',orientation:'',imageData:null});
 }
 return {cases:found.slice(0,LIMITS[stage]),detected:detections.length,expected:LIMITS[stage],
   incomplete:found.length!==LIMITS[stage]};
}
export function cropDiagram(page,rect,{size=288}={}){
 const c=document.createElement('canvas');c.width=c.height=size;
 const ctx=c.getContext('2d',{alpha:false});ctx.fillStyle='#fff';ctx.fillRect(0,0,size,size);
 const src=page.canvas||page;const x=Math.max(0,rect.x),y=Math.max(0,rect.y),
 w=Math.min(src.width-x,rect.w),h=Math.min(src.height-y,rect.h);
 if(w>0&&h>0){
   const dest=Math.round(size*.94);const ratio=Math.min(dest/w,dest/h);
   const dw=w*ratio,dh=h*ratio;ctx.drawImage(src,x,y,w,h,(size-dw)/2,(size-dh)/2,dw,dh);
 }
 return c.toDataURL('image/webp',.78)
}
