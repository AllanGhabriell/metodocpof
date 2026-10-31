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

commit;
