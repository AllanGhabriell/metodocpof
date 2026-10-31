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

commit;

-- Verificação no SQL Editor: deve mostrar somente coelhodatoca124@gmail.com
-- (ou nenhuma linha até o e-mail dessa conta ser confirmado).
-- select u.email from public.cfop_admins a
-- join auth.users u on u.id = a.user_id order by u.email;
