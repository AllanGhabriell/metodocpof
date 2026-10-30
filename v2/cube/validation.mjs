import {apply,solved,facelets,verifyDiagram} from './engine.mjs';
// A verificação matemática depende da etapa: F2L e OLL não precisam resolver a última camada.
function isF2LSolved(state){
 const f=facelets(state),base=f.D[4];
 if(!f.D.every(c=>c===base))return false;
 return ['F','R','B','L'].every(face=>f[face].slice(3).every(c=>c===f[face][4]));
}
function isOLLSolved(state){const f=facelets(state);return isF2LSolved(state)&&f.U.every(c=>c===f.U[4])}
function isPLLSolved(state){const f=facelets(state);return Object.values(f).every(arr=>arr.every(c=>c===arr[4]))}
export function checkStage(state,stage){
 if(stage==='f2l')return isF2LSolved(state);
 if(stage==='oll')return isOLLSolved(state);
 if(stage==='pll')return isPLLSolved(state);
 if(stage==='cross'){
  const f=facelets(state),base=f.D[4];
  return [1,3,5,7].every(i=>f.D[i]===base)&&['F','R','B','L'].every(face=>f[face][7]===f[face][4]);
 }
 return false;
}
export function verifyStageCase(setup,algorithm,stage){
 const initial=apply(solved(),setup),after=apply(initial,algorithm);
 const matchingAuf=(stage==='pll'?['','U',"U'",'U2']:['']).find(auf=>checkStage(apply(after,auf),stage));
 return {valid:matchingAuf!==undefined,matchingAuf:matchingAuf??null,initial,after};
}
// Conferência editorial e matemática são independentes. A aprovação local não cria privilégio de administrador.
export function reviewCase(record,{requireDiagram=false,requireExpectedState=false}={}){
 const checks=[];const check=(name,valid,details=null)=>checks.push({name,valid,details});
 let initial=null;
 try{
  if(!record?.id||!['f2l','oll','pll','cross'].includes(record?.stage)||!record?.algorithm||typeof record.setup!=='string')throw new TypeError('Dados obrigatórios ausentes');
  check('estrutura',true);
  const result=verifyStageCase(record.setup,record.algorithm,record.stage);
  initial=result.initial;
  check('setup_e_solucao',result.valid,{message:result.valid?'Etapa resolvida.':'O algoritmo não conclui a etapa especificada a partir deste setup.',auf:result.matchingAuf});
 }catch(error){check('estrutura_ou_notacao',false,{message:error.message})}
 if(requireDiagram&&!record?.diagram)check('diagrama',false,{message:'Diagrama de referência obrigatório'});
 if(requireExpectedState&&!record?.expectedState)check('estado_esperado',false,{message:'Estado de referência obrigatório'});
 if(initial&&record?.diagram){
  try{const result=verifyDiagram(initial,record.diagram);check('diagrama',result.valid,{message:result.valid?'Correspondente ao setup.':'Há adesivos divergentes.',mismatches:result.mismatches})}
  catch(error){check('diagrama',false,{message:error.message})}
 }
 if(initial&&record?.expectedState){
  const valid=Array.isArray(record.expectedState)&&record.expectedState.length===54&&JSON.stringify(initial)===JSON.stringify(record.expectedState);
  check('estado_esperado',valid,{message:valid?'Estado de referência corresponde ao setup.':'O estado de referência não corresponde ao setup.'});
 }
 const automaticPassed=checks.length>0&&checks.every(c=>c.valid);
 const humanApproved=record.review?.approved===true&&typeof record.review?.reviewer==='string'&&record.review.reviewer.trim().length>0;
 return {id:record?.id??null,checks,automaticPassed,humanApproved,publicationReady:automaticPassed&&humanApproved};
}
