-- CFOP Studio — INSTALAÇÃO INTEGRAL EM UM ÚNICO COMANDO.
-- Para SQL Editor do Supabase. Inclui migrações 000001 até 000006.
-- Cria tabelas ausentes sem apagar cadastros nem histórico.
-- A conta coelhodatoca124@gmail.com precisa ter e-mail confirmado.
BEGIN;

-- ===== PARTE 1 de 6: 20261030_000001_cfop_backend.sql =====

-- CFOP Studio — banco de dados, autenticação e políticas de segurança (Supabase/PostgreSQL).
-- Execute no SQL Editor de um projeto Supabase que você controla.
-- Nunca coloque a chave secret/service_role no navegador ou repositório.

create table if not exists public.cfop_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  nickname text not null default 'Cubista' check (char_length(nickname) between 1 and 40),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.cfop_user_state (
  user_id uuid primary key references auth.users(id) on delete cascade,
  payload jsonb not null default '{}'::jsonb,
  revision bigint not null default 0 check (revision >= 0),
  updated_at timestamptz not null default now(),
  constraint cfop_payload_object check (jsonb_typeof(payload) = 'object'),
  constraint cfop_payload_size check (octet_length(payload::text) < 8000000)
);

create table if not exists public.cfop_admins (
  user_id uuid primary key references auth.users(id) on delete cascade,
  granted_at timestamptz not null default now()
);

create table if not exists public.cfop_published_cases (
  id text primary key check (char_length(id) between 3 and 50),
  stage text not null check (stage in ('f2l','oll','pll')),
  name text not null default '' check (char_length(name) <= 90),
  algorithm text not null check (char_length(algorithm) between 1 and 1800),
  setup text not null check (char_length(setup) between 1 and 1800),
  diagram jsonb not null,
  expected_state jsonb not null,
  image_data text check (image_data is null or (char_length(image_data) <= 650000 and image_data ~ '^data:image/(png|jpeg|webp);base64,')),
  source text not null default 'Revisão editorial',
  review_status text not null default 'verified' check (review_status = 'verified'),
  approved_by uuid not null references auth.users(id),
  updated_at timestamptz not null default now(),
  constraint cfop_case_diagram_object check (jsonb_typeof(diagram)='object'),
  constraint cfop_case_state_array check (jsonb_typeof(expected_state)='array' and jsonb_array_length(expected_state)=54)
);

create table if not exists public.cfop_challenges (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  title text not null check (char_length(title) between 1 and 80),
  scramble text not null check (char_length(scramble) between 10 and 260),
  target_ms integer not null check (target_ms between 1000 and 3600000),
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '30 days')
);

create table if not exists public.cfop_challenge_results (
  challenge_id uuid not null references public.cfop_challenges(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  elapsed_ms integer not null check (elapsed_ms between 1 and 3600000),
  penalty text not null default 'OK' check (penalty in ('OK','+2','DNF')),
  updated_at timestamptz not null default now(),
  primary key (challenge_id,user_id)
);

create index if not exists cfop_challenges_created_idx on public.cfop_challenges (created_at desc);
create index if not exists cfop_results_challenge_idx on public.cfop_challenge_results (challenge_id, elapsed_ms);

alter table public.cfop_profiles enable row level security;
alter table public.cfop_user_state enable row level security;
alter table public.cfop_admins enable row level security;
alter table public.cfop_published_cases enable row level security;
alter table public.cfop_challenges enable row level security;
alter table public.cfop_challenge_results enable row level security;

revoke all on public.cfop_profiles, public.cfop_user_state, public.cfop_admins, public.cfop_published_cases, public.cfop_challenges, public.cfop_challenge_results from anon, authenticated;
grant select, insert, update on public.cfop_profiles to authenticated;
grant select, insert, update on public.cfop_user_state to authenticated;
grant select on public.cfop_admins to authenticated;
grant select on public.cfop_published_cases to anon, authenticated;
grant insert, update, delete on public.cfop_published_cases to authenticated;
grant select, insert, update, delete on public.cfop_challenges to authenticated;
grant select, insert, update, delete on public.cfop_challenge_results to authenticated;

drop policy if exists cfop_profiles_read on public.cfop_profiles;
create policy cfop_profiles_read on public.cfop_profiles for select to authenticated using (true);
drop policy if exists cfop_profiles_insert on public.cfop_profiles;
create policy cfop_profiles_insert on public.cfop_profiles for insert to authenticated
 with check (user_id = (select auth.uid()));
drop policy if exists cfop_profiles_update on public.cfop_profiles;
create policy cfop_profiles_update on public.cfop_profiles for update to authenticated
 using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

drop policy if exists cfop_state_read on public.cfop_user_state;
create policy cfop_state_read on public.cfop_user_state for select to authenticated
 using (user_id = (select auth.uid()));
drop policy if exists cfop_state_insert on public.cfop_user_state;
create policy cfop_state_insert on public.cfop_user_state for insert to authenticated
 with check (user_id = (select auth.uid()));
drop policy if exists cfop_state_update on public.cfop_user_state;
create policy cfop_state_update on public.cfop_user_state for update to authenticated
 using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

drop policy if exists cfop_admin_self on public.cfop_admins;
create policy cfop_admin_self on public.cfop_admins for select to authenticated
 using (user_id = (select auth.uid()));
-- Sem políticas de insert/update/delete: só o administrador do banco concede acesso.
-- Para conceder, no SQL Editor privilegiado (não no frontend):
-- insert into public.cfop_admins (user_id) values ('UUID-DO-SEU-USUARIO');

drop policy if exists cfop_cases_public_read on public.cfop_published_cases;
create policy cfop_cases_public_read on public.cfop_published_cases for select to anon,authenticated using (true);
drop policy if exists cfop_cases_admin_insert on public.cfop_published_cases;
create policy cfop_cases_admin_insert on public.cfop_published_cases for insert to authenticated
 with check (
   approved_by = (select auth.uid())
   and exists (select 1 from public.cfop_admins a where a.user_id = (select auth.uid()))
 );
drop policy if exists cfop_cases_admin_update on public.cfop_published_cases;
create policy cfop_cases_admin_update on public.cfop_published_cases for update to authenticated
 using (exists (select 1 from public.cfop_admins a where a.user_id = (select auth.uid())))
 with check (
   approved_by = (select auth.uid())
   and exists (select 1 from public.cfop_admins a where a.user_id = (select auth.uid()))
 );
drop policy if exists cfop_cases_admin_delete on public.cfop_published_cases;
create policy cfop_cases_admin_delete on public.cfop_published_cases for delete to authenticated
 using (exists (select 1 from public.cfop_admins a where a.user_id = (select auth.uid())));

drop policy if exists cfop_challenges_read on public.cfop_challenges;
create policy cfop_challenges_read on public.cfop_challenges for select to authenticated using (true);
drop policy if exists cfop_challenges_create on public.cfop_challenges;
create policy cfop_challenges_create on public.cfop_challenges for insert to authenticated
 with check (owner_id = (select auth.uid()));
drop policy if exists cfop_challenges_edit on public.cfop_challenges;
create policy cfop_challenges_edit on public.cfop_challenges for update to authenticated
 using (owner_id = (select auth.uid())) with check (owner_id = (select auth.uid()));
drop policy if exists cfop_challenges_delete on public.cfop_challenges;
create policy cfop_challenges_delete on public.cfop_challenges for delete to authenticated
 using (owner_id = (select auth.uid()));

drop policy if exists cfop_results_read on public.cfop_challenge_results;
create policy cfop_results_read on public.cfop_challenge_results for select to authenticated using (true);
drop policy if exists cfop_results_create on public.cfop_challenge_results;
create policy cfop_results_create on public.cfop_challenge_results for insert to authenticated
 with check (
   user_id = (select auth.uid())
   and exists (select 1 from public.cfop_challenges c where c.id=challenge_id and c.expires_at>now())
 );
drop policy if exists cfop_results_edit on public.cfop_challenge_results;
create policy cfop_results_edit on public.cfop_challenge_results for update to authenticated
 using (user_id = (select auth.uid()))
 with check (
   user_id = (select auth.uid())
   and exists (select 1 from public.cfop_challenges c where c.id=challenge_id and c.expires_at>now())
 );
drop policy if exists cfop_results_delete on public.cfop_challenge_results;
create policy cfop_results_delete on public.cfop_challenge_results for delete to authenticated
 using (user_id = (select auth.uid()));

-- Segurança: sem permissões de administração autoatribuídas,
-- sem chaves secret/service_role na aplicação, sem resultados certificados.


-- ===== PARTE 2 de 6: 20261030_000002_admin_allowlist.sql =====

-- Administrador único autorizado pelo proprietário do CFOP Studio.
-- Execute após 20261030_000001_cfop_backend.sql.
-- Somente usuários com e-mail confirmado recebem privilégios.
-- A autorização efetiva continua sendo conferida por RLS em cfop_admins.

create or replace function public.cfop_grant_allowlisted_admin()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.email_confirmed_at is not null
     and lower(new.email) = 'coelhodatoca124@gmail.com' then
    insert into public.cfop_admins (user_id)
    values (new.id)
    on conflict (user_id) do nothing;
  end if;
  return new;
end;
$$;

revoke all on function public.cfop_grant_allowlisted_admin() from public, anon, authenticated;

drop trigger if exists cfop_allowlisted_admin_on_auth on auth.users;
create trigger cfop_allowlisted_admin_on_auth
after insert or update of email, email_confirmed_at on auth.users
for each row
execute function public.cfop_grant_allowlisted_admin();

-- Também ativa contas que já fizeram login antes desta migração.
insert into public.cfop_admins (user_id)
select id from auth.users
where email_confirmed_at is not null
  and lower(email) = 'coelhodatoca124@gmail.com'
on conflict (user_id) do nothing;


-- ===== PARTE 3 de 6: 20261030_000003_admin_dashboard.sql =====

-- CFOP Studio — Painel administrativo e telemetria mínima.
-- Pré-requisito: migrações 000001 e 000002 executadas.
-- Não registra IP, localização, páginas visitadas nem conteúdo digitado.
create table if not exists public.cfop_user_admin_state (
 user_id uuid primary key references auth.users(id) on delete cascade,
 xp_adjustment integer not null default 0 check (xp_adjustment between -1000000 and 1000000),
 suspended_until timestamptz,
 suspension_reason text not null default '' check (char_length(suspension_reason)<=240),
 updated_at timestamptz not null default now()
);
create table if not exists public.cfop_usage_daily (
 user_id uuid not null references auth.users(id) on delete cascade,
 day date not null default (now() at time zone 'utc')::date,
 active_seconds integer not null default 0 check (active_seconds between 0 and 86400),
 sessions integer not null default 0 check (sessions between 0 and 1000),
 solves integer not null default 0 check (solves between 0 and 100000),
 last_seen timestamptz not null default now(),
 primary key(user_id,day)
);
create table if not exists public.cfop_user_notifications (
 id uuid primary key default gen_random_uuid(),
 user_id uuid not null references auth.users(id) on delete cascade,
 sent_by uuid references auth.users(id),
 body text not null check (char_length(body) between 1 and 500),
 created_at timestamptz not null default now(),
 read_at timestamptz
);
create table if not exists public.cfop_admin_audit (
 id bigint generated always as identity primary key,
 actor_id uuid not null references auth.users(id),
 target_id uuid not null references auth.users(id),
 action text not null,
 detail jsonb not null default '{}'::jsonb,
 created_at timestamptz not null default now()
);
create index if not exists cfop_usage_day_idx on public.cfop_usage_daily(day);
create index if not exists cfop_notifications_user_idx on public.cfop_user_notifications(user_id,created_at desc);
create index if not exists cfop_audit_created_idx on public.cfop_admin_audit(created_at desc);

alter table public.cfop_user_admin_state enable row level security;
alter table public.cfop_usage_daily enable row level security;
alter table public.cfop_user_notifications enable row level security;
alter table public.cfop_admin_audit enable row level security;
revoke all on public.cfop_user_admin_state,public.cfop_usage_daily,public.cfop_user_notifications,public.cfop_admin_audit from anon,authenticated;
grant select on public.cfop_user_admin_state to authenticated;
grant select on public.cfop_user_notifications to authenticated;
drop policy if exists cfop_user_admin_state_self on public.cfop_user_admin_state;
create policy cfop_user_admin_state_self on public.cfop_user_admin_state for select to authenticated using(user_id=(select auth.uid()));
drop policy if exists cfop_notifications_self on public.cfop_user_notifications;
create policy cfop_notifications_self on public.cfop_user_notifications for select to authenticated using(user_id=(select auth.uid()));

create or replace function public.cfop_is_admin(p_uid uuid)
returns boolean language sql stable security definer set search_path=''
as $$ select exists(select 1 from public.cfop_admins where user_id=p_uid) $$;
revoke all on function public.cfop_is_admin(uuid) from public,anon;
grant execute on function public.cfop_is_admin(uuid) to authenticated;

-- Registro limitado ao próprio usuário, no máximo 60 segundos por chamada.
-- Clientes não enviam identificadores de outros usuários.
create or replace function public.cfop_record_activity(p_seconds integer default 0,p_session boolean default false,p_solves integer default 0)
returns void language plpgsql security definer set search_path=''
as $$
declare v_user uuid:=auth.uid();v_day date:=(now() at time zone 'utc')::date;
begin
 if v_user is null then raise exception 'Login necessário';end if;
 if p_seconds<0 or p_seconds>60 or p_solves<0 or p_solves>1 then raise exception 'Atividade inválida';end if;
 if exists(select 1 from public.cfop_user_admin_state where user_id=v_user and suspended_until>now()) then
   raise exception 'Conta temporariamente suspensa';
 end if;
 insert into public.cfop_usage_daily(user_id,day,active_seconds,sessions,solves,last_seen)
 values(v_user,v_day,p_seconds,case when p_session then 1 else 0 end,p_solves,now())
 on conflict(user_id,day) do update set
 active_seconds=least(86400,public.cfop_usage_daily.active_seconds+excluded.active_seconds),
 sessions=least(1000,public.cfop_usage_daily.sessions+excluded.sessions),
 solves=least(100000,public.cfop_usage_daily.solves+excluded.solves),
 last_seen=now();
end;$$;
revoke all on function public.cfop_record_activity(integer,boolean,integer) from public,anon;
grant execute on function public.cfop_record_activity(integer,boolean,integer) to authenticated;

-- Lista somente para admins: sem IP, tokens ou dados privados de autenticação.
create or replace function public.cfop_admin_users()
returns table(user_id uuid,email text,nickname text,joined_at timestamptz,last_sign_in timestamptz,
last_seen timestamptz,active_seconds bigint,session_count bigint,solve_count bigint,xp_adjustment integer,suspended_until timestamptz,suspension_reason text)
language plpgsql stable security definer set search_path=''
as $$
begin
 if not public.cfop_is_admin(auth.uid()) then raise exception 'Acesso negado';end if;
 return query select u.id,u.email::text,coalesce(p.nickname,'Cubista'),u.created_at,u.last_sign_in_at,
 max(d.last_seen),coalesce(sum(d.active_seconds),0)::bigint,coalesce(sum(d.sessions),0)::bigint,
 coalesce(sum(d.solves),0)::bigint,coalesce(c.xp_adjustment,0),c.suspended_until,coalesce(c.suspension_reason,'')
 from auth.users u left join public.cfop_profiles p on p.user_id=u.id
 left join public.cfop_usage_daily d on d.user_id=u.id
 left join public.cfop_user_admin_state c on c.user_id=u.id
 group by u.id,u.email,u.created_at,u.last_sign_in_at,p.nickname,c.xp_adjustment,c.suspended_until,c.suspension_reason
 order by u.created_at desc limit 1000;
end;$$;
revoke all on function public.cfop_admin_users() from public,anon;
grant execute on function public.cfop_admin_users() to authenticated;

create or replace function public.cfop_admin_action(p_target uuid,p_action text,p_value integer default 0,p_message text default '')
returns void language plpgsql security definer set search_path=''
as $$
declare v_actor uuid:=auth.uid();
begin
 if not public.cfop_is_admin(v_actor) then raise exception 'Acesso negado';end if;
 if p_target is null or not exists(select 1 from auth.users where id=p_target) then raise exception 'Usuário não encontrado';end if;
 if p_action='xp' then
   if abs(p_value)>10000 then raise exception 'Ajuste máximo de 10000 XP';end if;
   insert into public.cfop_user_admin_state(user_id,xp_adjustment) values(p_target,p_value)
   on conflict(user_id) do update set xp_adjustment=greatest(-1000000,least(1000000,public.cfop_user_admin_state.xp_adjustment+excluded.xp_adjustment)),updated_at=now();
 elsif p_action='suspend' then
   if p_target=v_actor or public.cfop_is_admin(p_target) then raise exception 'Não é permitido suspender administradores';end if;
   if p_value<1 or p_value>365 then raise exception 'Duração de 1 a 365 dias';end if;
   insert into public.cfop_user_admin_state(user_id,suspended_until,suspension_reason) values(p_target,now()+make_interval(days=>p_value),left(p_message,240))
   on conflict(user_id) do update set suspended_until=excluded.suspended_until,suspension_reason=excluded.suspension_reason,updated_at=now();
 elsif p_action='unsuspend' then
   update public.cfop_user_admin_state set suspended_until=null,suspension_reason='',updated_at=now() where user_id=p_target;
 elsif p_action in ('adjust_solves','adjust_sessions','adjust_minutes') then
   if abs(p_value)>1000 then raise exception 'Ajuste máximo de 1000 unidades';end if;
   insert into public.cfop_usage_daily(user_id,day) values(p_target,(now() at time zone 'utc')::date)
   on conflict(user_id,day) do nothing;
   if p_action='adjust_solves' then
     update public.cfop_usage_daily set solves=greatest(0,least(100000,solves+p_value))
     where user_id=p_target and day=(now() at time zone 'utc')::date;
   elsif p_action='adjust_sessions' then
     update public.cfop_usage_daily set sessions=greatest(0,least(1000,sessions+p_value))
     where user_id=p_target and day=(now() at time zone 'utc')::date;
   else
     update public.cfop_usage_daily set active_seconds=greatest(0,least(86400,active_seconds+p_value*60))
     where user_id=p_target and day=(now() at time zone 'utc')::date;
   end if;
 elsif p_action='message' then
   if char_length(trim(p_message))<1 or char_length(p_message)>500 then raise exception 'Mensagem inválida';end if;
   insert into public.cfop_user_notifications(user_id,sent_by,body) values(p_target,v_actor,p_message);
 else raise exception 'Ação desconhecida';end if;
 insert into public.cfop_admin_audit(actor_id,target_id,action,detail) values(v_actor,p_target,p_action,jsonb_build_object('value',p_value,'message',left(p_message,240)));
end;$$;
revoke all on function public.cfop_admin_action(uuid,text,integer,text) from public,anon;
grant execute on function public.cfop_admin_action(uuid,text,integer,text) to authenticated;

create or replace function public.cfop_admin_audit_recent()
returns table(actor_email text,target_email text,action text,detail jsonb,created_at timestamptz)
language plpgsql stable security definer set search_path=''
as $$
begin
 if not public.cfop_is_admin(auth.uid()) then raise exception 'Acesso negado';end if;
 return query select a.email::text,t.email::text,h.action,h.detail,h.created_at
 from public.cfop_admin_audit h join auth.users a on a.id=h.actor_id join auth.users t on t.id=h.target_id
 order by h.created_at desc limit 100;
end;$$;
revoke all on function public.cfop_admin_audit_recent() from public,anon;
grant execute on function public.cfop_admin_audit_recent() to authenticated;

-- Suspensão impede alterações nas áreas online do aplicativo.
-- Login Google e dados locais permanecem fora desta restrição.
create or replace function public.cfop_user_allowed(p_uid uuid)
returns boolean language sql stable security definer set search_path=''
as $$select not exists(select 1 from public.cfop_user_admin_state where user_id=p_uid and suspended_until>now())$$;
revoke all on function public.cfop_user_allowed(uuid) from public,anon;
grant execute on function public.cfop_user_allowed(uuid) to authenticated;
drop policy if exists cfop_state_insert on public.cfop_user_state;
create policy cfop_state_insert on public.cfop_user_state for insert to authenticated
with check(user_id=(select auth.uid()) and public.cfop_user_allowed((select auth.uid())));
drop policy if exists cfop_state_update on public.cfop_user_state;
create policy cfop_state_update on public.cfop_user_state for update to authenticated
using(user_id=(select auth.uid()) and public.cfop_user_allowed((select auth.uid())))
with check(user_id=(select auth.uid()) and public.cfop_user_allowed((select auth.uid())));
drop policy if exists cfop_challenges_create on public.cfop_challenges;
create policy cfop_challenges_create on public.cfop_challenges for insert to authenticated
with check(owner_id=(select auth.uid()) and public.cfop_user_allowed((select auth.uid())));
drop policy if exists cfop_challenges_edit on public.cfop_challenges;
create policy cfop_challenges_edit on public.cfop_challenges for update to authenticated
using(owner_id=(select auth.uid()) and public.cfop_user_allowed((select auth.uid())))
with check(owner_id=(select auth.uid()) and public.cfop_user_allowed((select auth.uid())));
drop policy if exists cfop_results_create on public.cfop_challenge_results;
create policy cfop_results_create on public.cfop_challenge_results for insert to authenticated
with check(user_id=(select auth.uid()) and public.cfop_user_allowed((select auth.uid()))
and exists(select 1 from public.cfop_challenges c where c.id=challenge_id and c.expires_at>now()));
drop policy if exists cfop_results_edit on public.cfop_challenge_results;
create policy cfop_results_edit on public.cfop_challenge_results for update to authenticated
using(user_id=(select auth.uid()) and public.cfop_user_allowed((select auth.uid())))
with check(user_id=(select auth.uid()) and public.cfop_user_allowed((select auth.uid()))
and exists(select 1 from public.cfop_challenges c where c.id=challenge_id and c.expires_at>now()));


-- ===== PARTE 4 de 6: 20261030_000004_admin_roles_bans.sql =====

-- CFOP Studio: delegação de administradores e banimento permanente.
-- Executar DEPOIS de 000001, 000002 e 000003.
-- Somente a conta fundadora coelhodatoca124@gmail.com pode promover/rebaixar administradores.
alter table public.cfop_user_admin_state
 add column if not exists banned_at timestamptz,
 add column if not exists banned_reason text not null default '';
alter table public.cfop_user_admin_state
 drop constraint if exists cfop_banned_reason_length;
alter table public.cfop_user_admin_state
 add constraint cfop_banned_reason_length check(char_length(banned_reason)<=240);

create or replace function public.cfop_is_owner(p_uid uuid)
returns boolean language sql stable security definer set search_path=''
as $$
 select exists(
  select 1 from auth.users u
  join public.cfop_admins a on a.user_id=u.id
  where u.id=p_uid and u.email_confirmed_at is not null
   and lower(u.email) = 'coelhodatoca124@gmail.com'
 )
$$;
revoke all on function public.cfop_is_owner(uuid) from public,anon;
grant execute on function public.cfop_is_owner(uuid) to authenticated;

create or replace function public.cfop_manage_admin(p_target uuid,p_grant boolean)
returns void language plpgsql security definer set search_path=''
as $$
declare v_actor uuid:=auth.uid();
begin
 if v_actor is null or not public.cfop_is_owner(v_actor) then
  raise exception 'Somente os administradores fundadores podem alterar permissões';
 end if;
 if p_target is null or not exists(select 1 from auth.users where id=p_target and email_confirmed_at is not null) then
  raise exception 'A conta deve existir e ter e-mail confirmado';
 end if;
 if p_target=v_actor or public.cfop_is_owner(p_target) then
  raise exception 'Não é permitido alterar a função dos administradores fundadores';
 end if;
 if p_grant then
  insert into public.cfop_admins(user_id) values(p_target) on conflict do nothing;
 else
  delete from public.cfop_admins where user_id=p_target;
 end if;
 insert into public.cfop_admin_audit(actor_id,target_id,action,detail)
 values(v_actor,p_target,case when p_grant then 'grant_admin' else 'revoke_admin' end,'{}'::jsonb);
end;$$;
revoke all on function public.cfop_manage_admin(uuid,boolean) from public,anon;
grant execute on function public.cfop_manage_admin(uuid,boolean) to authenticated;

create or replace function public.cfop_manage_ban(p_target uuid,p_ban boolean,p_reason text default '')
returns void language plpgsql security definer set search_path=''
as $$
declare v_actor uuid:=auth.uid();
begin
 if v_actor is null or not public.cfop_is_admin(v_actor) then raise exception 'Acesso negado';end if;
 if p_target is null or not exists(select 1 from auth.users where id=p_target) then raise exception 'Usuário não encontrado';end if;
 if public.cfop_is_admin(p_target) then raise exception 'Remova primeiro a função de administrador, se permitido';end if;
 if p_ban then
  insert into public.cfop_user_admin_state(user_id,banned_at,banned_reason)
  values(p_target,now(),left(coalesce(p_reason,''),240))
  on conflict(user_id) do update set banned_at=excluded.banned_at,banned_reason=excluded.banned_reason,updated_at=now();
 else
  update public.cfop_user_admin_state set banned_at=null,banned_reason='',updated_at=now() where user_id=p_target;
 end if;
 insert into public.cfop_admin_audit(actor_id,target_id,action,detail)
 values(v_actor,p_target,case when p_ban then 'ban' else 'unban' end,jsonb_build_object('reason',left(coalesce(p_reason,''),240)));
end;$$;
revoke all on function public.cfop_manage_ban(uuid,boolean,text) from public,anon;
grant execute on function public.cfop_manage_ban(uuid,boolean,text) to authenticated;

create or replace function public.cfop_user_allowed(p_uid uuid)
returns boolean language sql stable security definer set search_path=''
as $$select not exists(
 select 1 from public.cfop_user_admin_state
 where user_id=p_uid and (banned_at is not null or suspended_until>now())
)$$;
revoke all on function public.cfop_user_allowed(uuid) from public,anon;
grant execute on function public.cfop_user_allowed(uuid) to authenticated;

-- Atividade não pode ser registrada por contas banidas.
create or replace function public.cfop_record_activity(p_seconds integer default 0,p_session boolean default false,p_solves integer default 0)
returns void language plpgsql security definer set search_path=''
as $$
declare v_user uuid:=auth.uid();v_day date:=(now() at time zone 'utc')::date;
begin
 if v_user is null then raise exception 'Login necessário';end if;
 if p_seconds<0 or p_seconds>60 or p_solves<0 or p_solves>1 then raise exception 'Atividade inválida';end if;
 if not public.cfop_user_allowed(v_user) then raise exception 'Conta com acesso restrito';end if;
 insert into public.cfop_usage_daily(user_id,day,active_seconds,sessions,solves,last_seen)
 values(v_user,v_day,p_seconds,case when p_session then 1 else 0 end,p_solves,now())
 on conflict(user_id,day) do update set
 active_seconds=least(86400,public.cfop_usage_daily.active_seconds+excluded.active_seconds),
 sessions=least(1000,public.cfop_usage_daily.sessions+excluded.sessions),
 solves=least(100000,public.cfop_usage_daily.solves+excluded.solves),
 last_seen=now();
end;$$;
revoke all on function public.cfop_record_activity(integer,boolean,integer) from public,anon;
grant execute on function public.cfop_record_activity(integer,boolean,integer) to authenticated;

-- Uma função específica devolve os estados das contas sem expor a tabela auth.users.
create or replace function public.cfop_admin_user_flags()
returns table(user_id uuid,is_admin boolean,is_owner boolean,is_banned boolean,banned_reason text)
language plpgsql stable security definer set search_path=''
as $$
begin
 if not public.cfop_is_admin(auth.uid()) then raise exception 'Acesso negado';end if;
 return query select u.id,public.cfop_is_admin(u.id),public.cfop_is_owner(u.id),
 (s.banned_at is not null),coalesce(s.banned_reason,'')
 from auth.users u left join public.cfop_user_admin_state s on s.user_id=u.id
 order by u.created_at desc limit 1000;
end;$$;
revoke all on function public.cfop_admin_user_flags() from public,anon;
grant execute on function public.cfop_admin_user_flags() to authenticated;


-- ===== PARTE 5 de 6: 20261030_000005_single_admin.sql =====

-- CFOP Studio — manter somente coelhodatoca124@gmail.com como administrador.
-- Executar após 20261030_000001 até 20261030_000004 no SQL Editor do Supabase.
-- Seguro para reexecução: contas comuns não são excluídas, somente seus privilégios admin.

begin;

-- Atualiza a concessão automática para novos cadastros e confirmações.
create or replace function public.cfop_grant_allowlisted_admin()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.email_confirmed_at is not null
     and lower(new.email) = 'coelhodatoca124@gmail.com' then
    insert into public.cfop_admins (user_id)
    values (new.id)
    on conflict (user_id) do nothing;
  end if;
  return new;
end;
$$;

revoke all on function public.cfop_grant_allowlisted_admin() from public, anon, authenticated;

drop trigger if exists cfop_allowlisted_admin_on_auth on auth.users;
create trigger cfop_allowlisted_admin_on_auth
after insert or update of email, email_confirmed_at on auth.users
for each row
execute function public.cfop_grant_allowlisted_admin();

-- Somente essa conta mantém os poderes de administrador fundador.
create or replace function public.cfop_is_owner(p_uid uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from auth.users u
    join public.cfop_admins a on a.user_id = u.id
    where u.id = p_uid
      and u.email_confirmed_at is not null
      and lower(u.email) = 'coelhodatoca124@gmail.com'
  )
$$;

revoke all on function public.cfop_is_owner(uuid) from public, anon;
grant execute on function public.cfop_is_owner(uuid) to authenticated;

-- Remove TODAS as permissões administrativas anteriores de outras contas.
-- Preserva os registros em auth.users, perfis e progresso dos usuários.
delete from public.cfop_admins
where user_id not in (
  select id
  from auth.users
  where email_confirmed_at is not null
    and lower(email) = 'coelhodatoca124@gmail.com'
);

-- Concede o privilégio à conta autorizada, caso ela já exista e esteja confirmada.
-- Se ainda não existir, o trigger acima atuará quando confirmar o cadastro.
insert into public.cfop_admins (user_id)
select id
from auth.users
where email_confirmed_at is not null
  and lower(email) = 'coelhodatoca124@gmail.com'
on conflict (user_id) do nothing;
-- Verificação no SQL Editor: deve mostrar somente coelhodatoca124@gmail.com
-- (ou nenhuma linha até o e-mail dessa conta ser confirmado).
-- select u.email from public.cfop_admins a
-- join auth.users u on u.id = a.user_id order by u.email;


-- ===== PARTE 6 de 6: 20261030_000006_admin_security_audit.sql =====

-- CFOP Studio: reforço de moderação e auditoria dos casos publicados.
-- Executar após as migrações 000001–000005.
-- Não remove contas, históricos nem dados de treinamento.
begin;

-- Restringe operações em contas suspensas ou banidas, incluindo exclusões.
drop policy if exists cfop_challenges_delete on public.cfop_challenges;
create policy cfop_challenges_delete on public.cfop_challenges
for delete to authenticated using (
 owner_id=(select auth.uid()) and public.cfop_user_allowed((select auth.uid()))
);
drop policy if exists cfop_results_delete on public.cfop_challenge_results;
create policy cfop_results_delete on public.cfop_challenge_results
for delete to authenticated using (
 user_id=(select auth.uid()) and public.cfop_user_allowed((select auth.uid()))
);
drop policy if exists cfop_profiles_update on public.cfop_profiles;
create policy cfop_profiles_update on public.cfop_profiles
for update to authenticated
using(user_id=(select auth.uid()) and public.cfop_user_allowed((select auth.uid())))
with check(user_id=(select auth.uid()) and public.cfop_user_allowed((select auth.uid())));

-- O editor público é acessível somente a administradores habilitados.
drop policy if exists cfop_cases_admin_insert on public.cfop_published_cases;
create policy cfop_cases_admin_insert on public.cfop_published_cases
for insert to authenticated with check (
 approved_by=(select auth.uid())
 and public.cfop_is_admin((select auth.uid()))
 and public.cfop_user_allowed((select auth.uid()))
);
drop policy if exists cfop_cases_admin_update on public.cfop_published_cases;
create policy cfop_cases_admin_update on public.cfop_published_cases
for update to authenticated
using(public.cfop_is_admin((select auth.uid())) and public.cfop_user_allowed((select auth.uid())))
with check(
 approved_by=(select auth.uid())
 and public.cfop_is_admin((select auth.uid()))
 and public.cfop_user_allowed((select auth.uid()))
);
drop policy if exists cfop_cases_admin_delete on public.cfop_published_cases;
create policy cfop_cases_admin_delete on public.cfop_published_cases
for delete to authenticated using(
 public.cfop_is_admin((select auth.uid())) and public.cfop_user_allowed((select auth.uid()))
);

-- Ações em casos públicos passam a constar no histórico administrativo.
-- Um gatilho registra apenas a identidade do caso e o tipo de alteração.
create or replace function public.cfop_audit_published_case()
returns trigger language plpgsql security definer set search_path=''
as $$
declare
 v_actor uuid:=auth.uid();
 v_case text;
 v_stage text;
begin
 if v_actor is null or not public.cfop_is_admin(v_actor)
     or not public.cfop_user_allowed(v_actor) then
   raise exception 'Acesso negado à publicação';
 end if;
 if TG_OP='DELETE' then
   v_case:=old.id;
   v_stage:=old.stage;
 else
   v_case:=new.id;
   v_stage:=new.stage;
 end if;
 insert into public.cfop_admin_audit(actor_id,target_id,action,detail)
 values(v_actor,v_actor,
   case TG_OP
    when 'INSERT' then 'publish_case'
    when 'UPDATE' then 'update_case'
    else 'unpublish_case'
   end,
   jsonb_build_object('case_id',v_case,'stage',v_stage));
 if TG_OP='DELETE' then return old;end if;
 return new;
end;$$;
revoke all on function public.cfop_audit_published_case() from public,anon,authenticated;

drop trigger if exists cfop_published_case_audit on public.cfop_published_cases;
create trigger cfop_published_case_audit
after insert or update or delete on public.cfop_published_cases
for each row execute function public.cfop_audit_published_case();

-- Evita tornar administrador alguém que está banido ou suspenso.
create or replace function public.cfop_manage_admin(p_target uuid,p_grant boolean)
returns void language plpgsql security definer set search_path=''
as $$
declare v_actor uuid:=auth.uid();
begin
 if v_actor is null or not public.cfop_is_owner(v_actor)
    or not public.cfop_user_allowed(v_actor) then
   raise exception 'Somente o fundador autorizado pode alterar permissões';
 end if;
 if p_target is null or not exists(
   select 1 from auth.users
   where id=p_target and email_confirmed_at is not null
 ) then raise exception 'A conta deve existir e ter e-mail confirmado';end if;
 if p_target=v_actor or public.cfop_is_owner(p_target) then
   raise exception 'Não é permitido alterar a função do administrador fundador';
 end if;
 if p_grant and not public.cfop_user_allowed(p_target) then
   raise exception 'Não é permitido promover uma conta suspensa ou banida';
 end if;
 if p_grant then
   insert into public.cfop_admins(user_id) values(p_target) on conflict do nothing;
 else
   delete from public.cfop_admins where user_id=p_target;
 end if;
 insert into public.cfop_admin_audit(actor_id,target_id,action,detail)
 values(v_actor,p_target,case when p_grant then 'grant_admin' else 'revoke_admin' end,'{}'::jsonb);
end;$$;
revoke all on function public.cfop_manage_admin(uuid,boolean) from public,anon;
grant execute on function public.cfop_manage_admin(uuid,boolean) to authenticated;


COMMIT;

SELECT u.email AS administrador FROM public.cfop_admins a JOIN auth.users u ON a.user_id=u.id ORDER BY u.email;
