# Academia CFOP — ativar contas e sincronização

## O que já está preparado no site

- `v2/cloud/project-config.mjs` contém apenas o endereço do projeto e a **chave pública publishable** do Supabase. Um visitante não precisa mais preencher essas informações.
- `studio.html?page=profile` mostra **Continuar com Google**, **Entrar com e-mail e senha**, **Criar conta** e **Recuperar senha**, conforme os provedores habilitados no Supabase.
- Depois do login, as informações de perfil, dificuldade dos casos, progresso, cronômetro, XP e metas usam `public.cfop_user_state.payload`, um JSONB separado por usuário e protegido por RLS.
- A chave **secreta/service_role** nunca entra no GitHub Pages. Uma chave secreta já compartilhada deve ser **revogada/rotacionada** no painel do Supabase.

## Etapa 1 — confirmar as tabelas, sem alterar dados

Abra **Supabase → SQL Editor** no projeto indicado abaixo e execute apenas a consulta de leitura:

```sql
select
  name as tabela_necessaria,
  case when to_regclass('public.' || name) is null
    then 'FALTANDO'
    else 'OK'
  end as situacao
from (
 values
  ('cfop_profiles'),
  ('cfop_user_state'),
  ('cfop_admins'),
  ('cfop_published_cases'),
  ('cfop_challenges'),
  ('cfop_challenge_results'),
  ('cfop_user_admin_state'),
  ('cfop_usage_daily'),
  ('cfop_user_notifications'),
  ('cfop_admin_audit')
) as necessary(name);
```

Se todas aparecerem como **OK**, **não reexecute as migrações 000001 a 000004**. A alteração de administrador exige executar a nova migração **000005** (veja abaixo).

Caso faltem tabelas, examine o banco existente antes de executar, nesta ordem, os scripts que correspondem às etapas não aplicadas:

1. `supabase/migrations/20261030_000001_cfop_backend.sql` (tabelas e RLS).
2. `supabase/migrations/20261030_000002_admin_allowlist.sql` (administradores autorizados).
3. `supabase/migrations/20261030_000003_admin_dashboard.sql` (estatísticas e RPC administrativas).
4. `supabase/migrations/20261030_000004_admin_roles_bans.sql` (permissões administrativas).
5. `supabase/migrations/20261030_000005_single_admin.sql` (remove administradores antigos e mantém somente `coelhodatoca124@gmail.com`).
6. `supabase/migrations/20261030_000006_admin_security_audit.sql` (reforça bloqueios e audita casos publicados).

Uma tabela existir não comprova que todas as políticas/funções estão corretas. Se houver diferenças entre o schema atual e os scripts, revise antes de aplicar qualquer DDL.

### Atualizar as permissões de administrador no projeto já existente

Mesmo com as tabelas instaladas, execute no **Supabase → SQL Editor** o conteúdo de `supabase/migrations/20261030_000005_single_admin.sql`. Publicar alterações no GitHub **não modifica as permissões existentes no banco**.

A migração mantém somente `coelhodatoca124@gmail.com` como administrador e fundador; `allanghabriell8@gmail.com`, `allanghabriell572@gmail.com` e qualquer outro administrador anterior passam a ser usuários comuns, sem perder a conta ou o progresso. A conta autorizada só recebe privilégios após confirmar seu e-mail.

Confira o resultado no SQL Editor:

```sql
select u.email
from public.cfop_admins a
join auth.users u on u.id = a.user_id
order by u.email;
```

A consulta deve retornar apenas `coelhodatoca124@gmail.com`. Se não retornar linhas, entre ou cadastre essa conta e confirme o e-mail antes de verificar novamente.

### Ativar a versão completa do painel de administração

Para um projeto que já executou as migrações `000001` a `000004`, execute **somente** as novas migrações `000005` e `000006`, nesta ordem, no SQL Editor. Elas não alteram as contas comuns nem apagam progresso.

Após executar ambas:

1. Entre com `coelhodatoca124@gmail.com` (com e-mail confirmado), atualize a página e abra **Meu espaço → Administração → Usuários**.
2. Consulte contas, filtros de moderação, sessões e resoluções; selecione um usuário para alterar XP, corrigir estatísticas, enviar notificação, suspender ou banir.
3. Para revisar o conteúdo, use **Admin · Casos**. A lista de casos publicados permite reabrir uma versão como rascunho ou retirá-la da biblioteca. A republicação exige validação e aprovação manual.
4. Confira **Histórico de ações administrativas**. Publicações/edições/exclusões feitas após a migração `000006` são registradas.
5. Entre em uma conta comum para verificar que **Administração** não aparece e que alterações administrativas pela API são bloqueadas.

**Privilégios iniciais:** somente `coelhodatoca124@gmail.com` permanece administrador fundador. O fundador pode delegar a função de administrador a outras contas confirmadas usando o próprio painel, caso decida fazê-lo futuramente.

**Importante:** as alterações no GitHub não executam SQL no banco remoto. Os testes automatizados não substituem a verificação com usuários reais e RLS no Supabase.

### Conferir RLS nas tabelas privadas

```sql
select tablename, rowsecurity
from pg_tables
where schemaname = 'public'
  and tablename in (
    'cfop_user_state','cfop_profiles','cfop_admins',
    'cfop_published_cases','cfop_user_admin_state'
  )
order by tablename;
```

Para as tabelas privadas, `rowsecurity` precisa ser `true`. As permissões do projeto já estão descritas na migração `000001`.

## Etapa 2 — Auth URL Configuration

No Supabase, em **Authentication → URL Configuration**:

**Site URL**

```text
https://allanghabriell.github.io/metodocpof/
```

**Redirect URLs** — acrescente:

```text
https://allanghabriell.github.io/metodocpof/studio.html
```

É esse o endereço utilizado pelo app para o retorno de Google, confirmações e recuperação de senha.

## Etapa 3 — permitir os provedores desejados

**E-mail e senha:** em **Authentication → Providers**, confirme que o provedor Email está ativo. Se a confirmação de e-mail estiver exigida, o usuário precisará confirmar o cadastro.

**Google:** em **Authentication → Providers → Google**, ative o provedor e preencha Client ID e Client Secret **no Supabase**, nunca no site. No Google Cloud Console, o URI de redirecionamento autorizado do OAuth deve ser o callback do Supabase:

```text
https://mygszfrgmrbnhbuhhzba.supabase.co/auth/v1/callback
```

A permissão para usar o Google deve ser validada com uma conta real após a ativação do provedor.

## Etapa 4 — conferir o funcionamento

1. Abra `https://allanghabriell.github.io/metodocpof/studio.html?page=profile` numa aba anônima.
2. Confirme que o login aparece **diretamente**, sem pedir URL ou chave pública.
3. Crie uma conta com e-mail/senha ou entre com Google, se habilitado.
4. Treine alguns casos de F2L, OLL ou PLL, veja os dados em **Evolução** e aguarde a sincronização.
5. Entre na mesma conta em outro navegador e confira se o histórico aparece.
6. Se aparecer erro de sincronização, veja o texto mostrado na área de conta, o SQL acima e as RLS.

**Importante:** os testes do GitHub validam o código, mas não comprovam que o banco remoto está ativo ou que o login Google foi habilitado. Para conferir o banco em tempo real, conecte o projeto Supabase à sua sessão do ChatGPT ou execute as consultas no painel.
