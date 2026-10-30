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
