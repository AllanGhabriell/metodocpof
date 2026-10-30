import {apply,solved,verifyDiagram,verifySetupAndSolution} from './engine.mjs';
// Aprovação editorial é independente da validade matemática.
export function reviewCase(record){
 const checks=[];
 const check=(name,valid,details=null)=>checks.push({name,valid,details});
 let initial=null;
 try{
  if(!record?.id||!record?.stage||!record?.algorithm||typeof record.setup!=='string')throw new TypeError('Dados obrigatórios ausentes');
  check('estrutura',true);
  const verified=verifySetupAndSolution(record.setup,record.algorithm,{allowAuf:record.stage==='pll'});
  initial=verified.initial;
  check('setup_e_solucao',verified.valid,{auf:verified.matchingAuf});
 }catch(error){
  check('estrutura_ou_notacao',false,{message:error.message});
 }
 if(initial&&record.diagram){
  try{const result=verifyDiagram(initial,record.diagram);check('diagrama',result.valid,result.mismatches)}
  catch(error){check('diagrama',false,{message:error.message})}
 }
 if(initial&&record.expectedState){
  try{check('estado_esperado',JSON.stringify(initial)===JSON.stringify(record.expectedState))}
  catch(error){check('estado_esperado',false,{message:error.message})}
 }
 const automaticPassed=checks.length>0&&checks.every(c=>c.valid);
 const humanApproved=record.review?.approved===true&&typeof record.review?.reviewer==='string'&&record.review.reviewer.trim().length>0;
 return {id:record?.id??null,checks,automaticPassed,humanApproved,publicationReady:automaticPassed&&humanApproved};
}
