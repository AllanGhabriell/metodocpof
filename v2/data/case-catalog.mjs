// Catálogo imutável de identidade dos 119 casos. Nomes são metadados da etapa, não vêm de uma biblioteca.
// F2L/OLL usam índice estável da ordem documental O CUBO 2024; PLL usa as 21 siglas convencionais.
export const PLL_NAMES=["Ua","Ub","H","Z","Aa","Ab","E","Ra","Rb","Ja","Jb","T","F","V","Y","Na","Nb","Ga","Gb","Gc","Gd"];
export const LIMITS=Object.freeze({f2l:41,oll:57,pll:21});
const f2lGroups=[["Casos básicos",1,4],["Branco lateral · topo diferente",5,10],["Branco lateral · topo igual",11,14],["Par separado · branco no topo",15,18],["Par conectado incorretamente",19,24],["Canto encaixado · aresta no topo",25,30],["Aresta encaixada · canto no topo",31,36],["Canto e aresta posicionados",37,41]];
const ollGroups=[["Meios orientados",1,7],["Formato T",8,9],["Quadrados",10,11],["Formato C",12,13],["Formato W",14,15],["Cantos corretos",16,17],["Formato P",18,21],["Linha",22,25],["Peixe",26,29],["Movimento do cavalo",30,33],["Formatos estranhos",34,37],["Formato L",38,43],["Relâmpago",44,49],["Outras orientações",50,57]];
const ollNamed=["Sune","Anti-Sune","H","Pi","T","L","U"];
const groupFor=(groups,n)=>groups.find(([,first,last])=>n>=first&&n<=last)?.[0]||'Outros';
const numbered=(stage,n)=>stage.toUpperCase()+'-'+String(n).padStart(2,'0');
export const FIXED_CASES=Object.freeze([
 ...Array.from({length:41},(_,i)=>{const n=i+1;return Object.freeze({id:numbered('f2l',n),stage:'f2l',ordinal:n,name:'F2L '+String(n).padStart(2,'0'),group:groupFor(f2lGroups,n)})}),
 ...Array.from({length:57},(_,i)=>{const n=i+1;return Object.freeze({id:numbered('oll',n),stage:'oll',ordinal:n,name:ollNamed[i]||'OLL '+String(n).padStart(2,'0'),group:groupFor(ollGroups,n)})}),
 ...PLL_NAMES.map((name,i)=>Object.freeze({id:numbered('pll',i+1),stage:'pll',ordinal:i+1,name,group:i<4?'Permutação de meios':i<7?'Permutação de cantos':i<13?'Troca de cantos adjacentes':i<17?'Troca de cantos opostos':'Permutações G'}))
]);
export const CASE_BY_ID=new Map(FIXED_CASES.map(c=>[c.id,c]));
export function canonicalCase(stage,ordinal){return FIXED_CASES.find(c=>c.stage===stage&&c.ordinal===Number(ordinal))||null}
export function matchCaseId(stage,reference){const input=String(reference||'').trim();if(!LIMITS[stage]||!input)return null;const exact=FIXED_CASES.find(c=>c.stage===stage&&(c.id.toLowerCase()===input.toLowerCase()||stage==='pll'&&c.name.toLowerCase()===input.toLowerCase()));if(exact)return exact.id;const n=Number(input.replace(new RegExp('^'+stage+'-?','i'),''));return canonicalCase(stage,n)?.id||null}
export function isCanonicalCase(stage,id){return CASE_BY_ID.get(id)?.stage===stage}
