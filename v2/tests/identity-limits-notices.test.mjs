import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=p=>readFileSync(new URL(p,import.meta.url),'utf8');
const sql=read('../../supabase/CFOP_PERFIS_ATUALIZACAO_COMPLETA.sql');
const cloud=read('../cloud/cloud.mjs');
const identity=read('../cloud/identity.mjs');
const admin=read('../cloud/admin.mjs');
const app=read('../app.js');
const banner=read('../../assets/js/notice-banner.js');
const pages=['index','f2l','oll','pll','cross','scramble','importer'].map(p=>read('../../'+p+'.html'));
const has=(str,...items)=>{for(const key of items)assert.ok(str.includes(key),'Não encontrado: '+key)};
test('usuário pode alterar nome e foto com limite no banco e sem reservar apelidos antigos',()=>{
 has(sql,"cfop_identity_events","v_name_count>=3","v_avatar_count>=2",
 "interval '30 minutes'","interval '2 hours'","v_name_changed",
 "v_avatar_changed","v_old_name IS DISTINCT FROM v_new_name",
 "lower(btrim(p.nickname))=lower(btrim(v_new_name))",
 "Este nome já está sendo utilizado",
 "FOR UPDATE");
 assert.ok(!sql.includes("cfop_identity_history_reserved"));
 has(identity,'rpc/cfop_identity_limits','name_remaining','photo_remaining','name_next_at','photo_next_at');
});
test('fundador pode corrigir nome e moderar foto com auditoria e sem mexer em senhas',()=>{
 has(sql,'cfop_admin_manage_identity',"p_action='rename'",'profile_','cfop_admin_audit',
  "p_action='reset_name_limit'","p_action='reset_photo_limit'",
  'Somente o administrador fundador pode corrigir identidades');
 has(admin,'admin-rename','reset_name_limit','reset_photo_limit','cfop_admin_manage_identity');
});
test('aviso fica pendente até a pessoa marcar como lido com verificação de destinatário',()=>{
 has(sql,'cfop_admin_send_notice','cfop_mark_notice_read','read_at IS NULL',
  'AND user_id=v_user',"v_hour>=8 OR v_day>=24",
  "p_priority NOT IN ('normal','important')");
 has(cloud,'cloudNoticeOverlay','markNoticeRead','data-cloud="read-notice"',
  'cpof:notices-changed','read_at,priority','setInterval(()=>{if(isAuthenticated()');
 has(app,'cloudNoticeOverlay()','markNoticeRead(noticeId)');
 has(banner,'pendingNotices','Marcar como lida','markNoticeRead(next.id)');
});
test('telas principais e treinadores trazem mensagem pendente',()=>{
 for(const html of pages)has(html,'notice-banner.js?v=');
});
test('endpoint antigo de mensagens não contorna limite novo de envio',()=>{
 has(sql,"raise exception 'Envie avisos pelo novo canal de notificações administrativas'");
 has(admin,'cfop_admin_send_notice','p_priority:');
});
