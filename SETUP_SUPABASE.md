# CFOP Studio — ativação do backend Supabase

A interface do CFOP Studio e os módulos de autenticação/sincronização/desafios online já estão no repositório. **Eles não se conectam a um banco automaticamente.** É necessário ligar um projeto Supabase do próprio proprietário. Nunca envie senhas, chaves `secret` ou `service_role` pelo chat nem as inclua no GitHub.

## 1. Criar ou conectar um projeto Supabase
1. Entre em <https://supabase.com/dashboard> com sua própria conta e crie um projeto (ou use um existente).
2. Abra **SQL Editor** e execute a migração `supabase/migrations/20261030_000001_cfop_backend.sql`.
3. Em **Authentication → URL Configuration**, cadastre o endereço público do CFOP Studio como **Site URL** e como URL de redirecionamento permitida (o endereço exato usado na navegação).
4. Em **Project Settings → API**, copie **Project URL** e a **publishable key** (ou a chave pública `anon`, quando disponível). **Nunca copie a secret/service_role key.**
5. No CFOP Studio, abra **Conta e perfil → Conta e sincronização**, cole esses **dois dados públicos** e selecione **Conectar projeto**.
6. Crie uma conta com e-mail e senha. Se a confirmação de e-mail estiver ativa no Supabase, confirme o cadastro por e-mail e entre novamente.

## 2. Conceder acesso ao administrador
A autorização para editar/publicar casos é do **banco de dados** (RLS), não de um botão oculto na interface. Nenhuma conta vira administradora automaticamente.

1. Entre na conta do proprietário no aplicativo.
2. Em **Conta e sincronização**, copie o **ID da sua conta** (UUID).
3. No **SQL Editor** do projeto Supabase, execute o seguinte comando, substituindo pelo UUID da própria conta:

```sql
insert into public.cfop_admins (user_id)
values ('SEU-UUID-AQUI')
on conflict (user_id) do nothing;
```

4. Saia e entre novamente no CFOP Studio. A seção **Admin · Casos** ficará disponível.

**Não** execute o comando de concessão a favor de desconhecidos. Remoção administrativa:

```sql
delete from public.cfop_admins where user_id = 'UUID-A-REVOGAR';
```

A migração habilita RLS em todas as tabelas; uma pessoa comum não consegue inserir/alterar casos públicos nem conceder poderes de administrador.

## 3. Funcionalidades online
- **Conta:** cadastro, login, saída, confirmação por e-mail (se ativada), e recuperação de senha.
- **Sincronização:** progresso, cartões, tempos, planejamento, rascunhos e estados de ocultação/exclusão via banco `cfop_user_state`; os dados locais permanecem disponíveis sem conexão. A sincronização mescla registros e utiliza revisão otimista; em conflitos, preserva registros distintos.
- **Desafios:** criar convite, compartilhar link, registrar tempo por conta autenticada e consultar ranking atualizado periodicamente. Resultados são autodeclarados; não certifica uma resolução física.
- **Admin:** revisão visual local, validação e publicação de casos na biblioteca pública com políticas RLS.
- **Offline:** o service worker guarda recursos essenciais e as atividades locais funcionam sem internet depois do carregamento inicial. Entrar na conta, sincronizar ou compartilhar resultados exige conexão.

## 4. Testes recomendados após a conexão

1. Criar dois usuários: um administrador autorizado via SQL, outro usuário normal.
2. Conferir que a seção de casos administrativos só aparece para o administrador.
3. Confirmar que o usuário normal **não consegue** escrever na tabela `cfop_published_cases`, mesmo chamando a API diretamente.
4. Registrar um tempo e um cartão, sair, entrar em outro dispositivo e confirmar a sincronização.
5. Criar um desafio pelo usuário A, abrir o convite na conta B, enviar um tempo e atualizar o ranking.
6. Colocar o aparelho offline após a primeira visita, conferir que o cronômetro/treino local continuam disponíveis e verificar a sincronização ao reconectar.
7. Conferir cada setup e diagrama individualmente antes de publicar os casos; **os 119 casos importados preliminarmente não estão validados**.

## Observações
- O aplicativo utiliza **apenas a chave pública** do projeto; a proteção real é realizada por autenticação e políticas RLS.
- A área administrativa exige conectividade para confirmar permissões.
- As regras de validação dos casos são independentes da autenticação; um caso não fica correto apenas por ser publicado.
- Faça backup local antes de limpar armazenamento do navegador.
