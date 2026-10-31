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
