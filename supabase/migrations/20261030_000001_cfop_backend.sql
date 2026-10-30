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
