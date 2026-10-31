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
