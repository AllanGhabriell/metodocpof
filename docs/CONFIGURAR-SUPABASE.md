# Academia CPOF — ativar contas e sincronização

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

Se todas aparecerem como **OK**, **não execute as migrações novamente**.

Caso faltem tabelas, examine o banco existente antes de executar, nesta ordem, os scripts que correspondem às etapas não aplicadas:

1. `supabase/migrations/20261030_000001_cfop_backend.sql` (tabelas e RLS).
2. `supabase/migrations/20261030_000002_admin_allowlist.sql` (administradores autorizados).
3. `supabase/migrations/20261030_000003_admin_dashboard.sql` (estatísticas e RPC administrativas).
4. `supabase/migrations/20261030_000004_admin_roles_bans.sql` (permissões administrativas).

Uma tabela existir não comprova que todas as políticas/funções estão corretas. Se houver diferenças entre o schema atual e os scripts, revise antes de aplicar qualquer DDL.

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
