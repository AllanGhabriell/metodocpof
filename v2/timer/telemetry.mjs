import {cloudTable,isAuthenticated} from '../cloud/cloud.mjs?v=20261031-58';
// Only daily aggregates. Offline and guest times remain on the device.
export async function recordTimerSolve(mode,ms,correct){
 if(!isAuthenticated()||!['3x3','cross1','cross2','cross3','cross4'].includes(mode))return false;
 if(!Number.isFinite(ms)||ms<1000||ms>3600000)return false;
 try{
  return await cloudTable('rpc/cfop_record_timer_solve',{method:'POST',body:{
   p_mode:mode,p_ms:Math.round(ms),p_correct:Boolean(correct)
  }})===true;
 }catch(e){console.info('Resumo de treino indisponível (execute a migração 000012).');return false}
}
export async function adminTimerInsights(days=30){
 return cloudTable('rpc/cfop_admin_timer_insights',{method:'POST',body:{p_days:days}});
}
