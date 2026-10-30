/**
 * Configuração PÚBLICA da Academia CPOF.
 *
 * A chave sb_publishable_ identifica o projeto para o navegador; não concede
 * permissões administrativas. Quem protege os dados são Auth + RLS do Supabase.
 *
 * NUNCA colocar sb_secret_, service_role, senhas ou tokens de usuário aqui.
 * Para trocar o projeto, atualizar este arquivo uma única vez e publicar o site.
 */
export const PUBLIC_SUPABASE_CONFIG=Object.freeze({
  url:'https://mygszfrgmrbnhbuhhzba.supabase.co',
  publishableKey:'sb_publishable_VnDUZLkurV8wo7kfAVNL9w_IyukojoI'
});
