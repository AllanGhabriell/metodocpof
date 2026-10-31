-- Execute após supabase/CFOP_PERFIS_ATUALIZACAO_COMPLETA.sql. Faça backup antes.
BEGIN;
CREATE OR REPLACE FUNCTION public.cfop_set_identity(
 p_new_name text DEFAULT NULL, p_set_avatar boolean DEFAULT false, p_avatar_data text DEFAULT NULL
) RETURNS TABLE(nickname text,avatar_data text)
LANGUAGE plpgsql SECURITY DEFINER SET search_path=''
AS $identity$
DECLARE
 v_user uuid := auth.uid();
 v_old_name text;v_old_avatar text;v_new_name text;
 v_name_changed boolean:=false;v_avatar_changed boolean:=false;
 v_locked boolean;v_blocked boolean;
 v_name_count int;v_avatar_count int;
 v_last_name timestamptz;v_last_avatar timestamptz;
 v_now timestamptz:=now(); v_admin boolean:=false;
 v_today date:=(now() AT TIME ZONE 'America/Fortaleza')::date;
BEGIN
 IF v_user IS NULL THEN RAISE EXCEPTION 'Entre na sua conta para personalizar o perfil'; END IF;
 IF NOT public.cfop_user_allowed(v_user) THEN RAISE EXCEPTION 'Sua conta está com acesso restrito'; END IF;
 v_admin:=public.cfop_is_admin(v_user);
 -- Serializa todas as alterações dessa conta e evita ultrapassar limites em duas abas.
 PERFORM 1 FROM auth.users WHERE id=v_user FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Conta não encontrada'; END IF;
 SELECT p.nickname,p.avatar_data INTO v_old_name,v_old_avatar
 FROM public.cfop_profiles p WHERE p.user_id=v_user FOR UPDATE;
 SELECT coalesce(s.name_locked,false),coalesce(s.avatar_blocked,false)
 INTO v_locked,v_blocked FROM public.cfop_user_admin_state s WHERE s.user_id=v_user;
 v_locked:=coalesce(v_locked,false);v_blocked:=coalesce(v_blocked,false);
 IF p_new_name IS NOT NULL THEN
  v_new_name:=btrim(regexp_replace(p_new_name,'[[:space:]]+',' ','g'));
  IF char_length(v_new_name) NOT BETWEEN 3 AND 36 OR
     v_new_name !~ '^[[:alnum:]À-ÿ][[:alnum:]À-ÿ ._-]*$' OR
     lower(v_new_name) IN ('cubista anônimo','cubista anonimo')
  THEN RAISE EXCEPTION 'Nome inválido: use de 3 a 36 caracteres (letras, números, espaços, ponto, hífen e sublinhado)'; END IF;
  v_name_changed:=v_old_name IS DISTINCT FROM v_new_name;
 END IF;
 IF p_set_avatar THEN
  IF p_avatar_data IS NOT NULL AND
    (octet_length(p_avatar_data)>80000 OR p_avatar_data !~ '^data:image/webp;base64,[A-Za-z0-9+/=]+$')
  THEN RAISE EXCEPTION 'Foto inválida: envie WebP compactado com no máximo 60 KB'; END IF;
  v_avatar_changed:=v_old_avatar IS DISTINCT FROM p_avatar_data;
 END IF;
 IF v_name_changed AND v_locked AND NOT v_admin THEN
  RAISE EXCEPTION 'A alteração do seu nome está bloqueada pela administração'; END IF;
 IF v_avatar_changed AND v_blocked AND p_avatar_data IS NOT NULL AND NOT v_admin THEN
  RAISE EXCEPTION 'O envio de fotos está bloqueado pela administração'; END IF;

 IF v_name_changed AND NOT v_admin THEN
   SELECT count(*)::int,max(e.changed_at) INTO v_name_count,v_last_name
   FROM public.cfop_identity_events e WHERE e.user_id=v_user AND e.kind='name'
    AND (e.changed_at AT TIME ZONE 'America/Fortaleza')::date=v_today;
  IF v_name_count>=3 THEN
   RAISE EXCEPTION 'Limite de 3 mudanças de nome atingido hoje. Tente novamente amanhã.'; END IF;
  IF v_last_name IS NOT NULL AND v_now<v_last_name+interval '30 minutes' THEN
   RAISE EXCEPTION 'Aguarde 30 minutos entre mudanças de nome.'; END IF;
 END IF;
 IF v_avatar_changed AND NOT v_admin THEN
   SELECT count(*)::int,max(e.changed_at) INTO v_avatar_count,v_last_avatar
   FROM public.cfop_identity_events e WHERE e.user_id=v_user AND e.kind='avatar'
    AND (e.changed_at AT TIME ZONE 'America/Fortaleza')::date=v_today;
  IF v_avatar_count>=6 THEN
    RAISE EXCEPTION 'Limite de 6 mudanças de foto atingido hoje. Tente novamente amanhã.'; END IF;
   IF v_last_avatar IS NOT NULL AND v_now<v_last_avatar+
     make_interval(mins => CASE v_avatar_count WHEN 1 THEN 5 WHEN 2 THEN 15
                           WHEN 3 THEN 30 WHEN 4 THEN 60 ELSE 120 END) THEN
    RAISE EXCEPTION 'Aguarde o horário de liberação da próxima foto, indicado no perfil.'; END IF;
 END IF;
 IF v_name_changed AND EXISTS (
  SELECT 1 FROM public.cfop_profiles p
  WHERE lower(btrim(p.nickname))=lower(btrim(v_new_name)) AND p.user_id<>v_user
 ) THEN RAISE EXCEPTION 'Este nome já está sendo utilizado. Escolha outro.'; END IF;

 INSERT INTO public.cfop_profiles(user_id,nickname,avatar_data)
 VALUES(v_user,coalesce(v_new_name,'Cubista-'||left(replace(v_user::text,'-',''),12)),
  CASE WHEN p_set_avatar THEN p_avatar_data ELSE NULL END)
 ON CONFLICT(user_id) DO UPDATE SET
 nickname=CASE WHEN p_new_name IS NOT NULL THEN v_new_name ELSE public.cfop_profiles.nickname END,
 avatar_data=CASE WHEN p_set_avatar THEN p_avatar_data ELSE public.cfop_profiles.avatar_data END,
 updated_at=CASE WHEN v_name_changed OR v_avatar_changed THEN v_now ELSE public.cfop_profiles.updated_at END;
 IF v_name_changed THEN
  INSERT INTO public.cfop_identity_events(user_id,kind,changed_at) VALUES(v_user,'name',v_now);END IF;
 IF v_avatar_changed THEN
  INSERT INTO public.cfop_identity_events(user_id,kind,changed_at) VALUES(v_user,'avatar',v_now);END IF;
 RETURN QUERY SELECT p.nickname,p.avatar_data FROM public.cfop_profiles p WHERE p.user_id=v_user;
EXCEPTION WHEN unique_violation THEN
 RAISE EXCEPTION 'Este nome já está sendo utilizado. Escolha outro.';
END;
$identity$;
REVOKE ALL ON FUNCTION public.cfop_set_identity(text,boolean,text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.cfop_set_identity(text,boolean,text) TO authenticated;
CREATE OR REPLACE FUNCTION public.cfop_identity_limits()
RETURNS TABLE(name_used integer,name_remaining integer,name_next_at timestamptz,
 photo_used integer,photo_remaining integer,photo_next_at timestamptz)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=''
AS $limits$
DECLARE v_user uuid:=auth.uid();v_day date:=(now() AT TIME ZONE 'America/Fortaleza')::date;
  v_n_last timestamptz;v_a_last timestamptz;v_reset timestamptz;v_admin boolean:=false;
BEGIN
 IF v_user IS NULL THEN RAISE EXCEPTION 'Faça login para ver seus limites'; END IF;
 v_reset:=((v_day+1)::timestamp AT TIME ZONE 'America/Fortaleza');
 v_admin:=public.cfop_is_admin(v_user);
 SELECT count(*)::int,max(e.changed_at) INTO name_used,v_n_last
  FROM public.cfop_identity_events e
  WHERE e.user_id=v_user AND e.kind='name'
  AND (e.changed_at AT TIME ZONE 'America/Fortaleza')::date=v_day;
 SELECT count(*)::int,max(e.changed_at) INTO photo_used,v_a_last
  FROM public.cfop_identity_events e
  WHERE e.user_id=v_user AND e.kind='avatar'
  AND (e.changed_at AT TIME ZONE 'America/Fortaleza')::date=v_day;
 name_remaining:=CASE WHEN v_admin THEN 999999 ELSE greatest(0,3-name_used) END;
  photo_remaining:=CASE WHEN v_admin THEN 999999 ELSE greatest(0,6-photo_used) END;
 name_next_at:=CASE WHEN v_admin THEN NULL WHEN name_used>=3 THEN v_reset
  WHEN v_n_last IS NULL THEN NULL
  WHEN now()>=v_n_last+interval '30 minutes' THEN NULL
  ELSE v_n_last+interval '30 minutes' END;
 photo_next_at:=CASE WHEN v_admin THEN NULL WHEN photo_used>=6 THEN v_reset
   WHEN v_a_last IS NULL THEN NULL
   WHEN now()>=v_a_last+make_interval(mins => CASE photo_used WHEN 1 THEN 5
     WHEN 2 THEN 15 WHEN 3 THEN 30 WHEN 4 THEN 60 ELSE 120 END) THEN NULL
   ELSE v_a_last+make_interval(mins => CASE photo_used WHEN 1 THEN 5
     WHEN 2 THEN 15 WHEN 3 THEN 30 WHEN 4 THEN 60 ELSE 120 END) END;
 RETURN NEXT;
END;$limits$;
REVOKE ALL ON FUNCTION public.cfop_identity_limits() FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.cfop_identity_limits() TO authenticated;

ALTER TABLE public.cfop_user_notifications
 ADD COLUMN IF NOT EXISTS actor_name text,
 ADD COLUMN IF NOT EXISTS actor_avatar text,
 ADD COLUMN IF NOT EXISTS actor_is_creator boolean NOT NULL DEFAULT false;

CREATE OR REPLACE FUNCTION public.cfop_notice_stamp_sender()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=''
AS $stamp$
BEGIN
 IF NEW.sent_by IS NOT NULL THEN
  SELECT coalesce(nullif(btrim(p.nickname),''),'Administrador'),
   CASE WHEN p.avatar_data LIKE 'data:image/webp;base64,%' THEN p.avatar_data ELSE NULL END
   INTO NEW.actor_name,NEW.actor_avatar
  FROM public.cfop_profiles p WHERE p.user_id=NEW.sent_by;
  NEW.actor_name:=coalesce(NEW.actor_name,'Administrador');
  NEW.actor_is_creator:=coalesce(public.cfop_is_owner(NEW.sent_by),false);
 END IF;
 RETURN NEW;
END;$stamp$;
DROP TRIGGER IF EXISTS cfop_notice_stamp_sender_trg ON public.cfop_user_notifications;
CREATE TRIGGER cfop_notice_stamp_sender_trg BEFORE INSERT ON public.cfop_user_notifications
 FOR EACH ROW EXECUTE FUNCTION public.cfop_notice_stamp_sender();

CREATE OR REPLACE FUNCTION public.cfop_notify_admin_account_action()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=''
AS $account_notice$
DECLARE v_body text;v_amount integer;
BEGIN
 IF NEW.target_id IS NULL OR NEW.actor_id IS NULL THEN RETURN NEW;END IF;
 IF NEW.action NOT IN (
  'xp','adjust_solves','adjust_sessions','adjust_minutes','suspend','unsuspend',
  'ban','unban','grant_admin','revoke_admin','profile_rename',
  'profile_remove_photo','profile_lock_name','profile_unlock_name',
  'profile_block_photo','profile_allow_photo','profile_reset_name_limit','profile_reset_photo_limit'
 ) THEN RETURN NEW;END IF;
 IF NEW.action='xp' THEN
  v_amount:=coalesce((NEW.detail->>'value')::integer,0);
  v_body:=format('Seu saldo de XP recebeu um ajuste administrativo de %s%s XP.',
   CASE WHEN v_amount>=0 THEN '+' ELSE '' END,v_amount);
 ELSIF NEW.action='profile_rename' THEN
  v_body:=format('Seu nome foi alterado de "%s" para "%s".',
   coalesce(NEW.detail->>'old_name','anterior'),coalesce(NEW.detail->>'new_name','novo'));
 ELSIF NEW.action='profile_remove_photo' THEN v_body:='Sua foto de perfil foi removida pela administração.';
 ELSIF NEW.action='profile_block_photo' THEN v_body:='O envio de fotos foi bloqueado e sua foto anterior pode ter sido removida.';
 ELSIF NEW.action='profile_allow_photo' THEN v_body:='O envio de fotos foi liberado.';
 ELSIF NEW.action='profile_lock_name' THEN v_body:='As alterações do seu nome foram bloqueadas.';
 ELSIF NEW.action='profile_unlock_name' THEN v_body:='As alterações do seu nome foram liberadas.';
 ELSIF NEW.action='profile_reset_name_limit' THEN v_body:='Seu limite diário de alterações de nome foi redefinido.';
 ELSIF NEW.action='profile_reset_photo_limit' THEN v_body:='Seu limite diário de alterações de foto foi redefinido.';
 ELSIF NEW.action='grant_admin' THEN v_body:='Sua conta recebeu permissões administrativas.';
 ELSIF NEW.action='revoke_admin' THEN v_body:='Suas permissões administrativas foram revogadas.';
 ELSIF NEW.action='ban' THEN v_body:='Sua conta foi banida dos recursos online.';
 ELSIF NEW.action='unban' THEN v_body:='O banimento da sua conta foi removido.';
 ELSIF NEW.action='suspend' THEN v_body:='Sua conta foi suspensa temporariamente dos recursos online.';
 ELSIF NEW.action='unsuspend' THEN v_body:='A suspensão da sua conta foi encerrada.';
 ELSIF NEW.action='adjust_solves' THEN v_body:='Seu número de resoluções foi corrigido pela administração.';
 ELSIF NEW.action='adjust_sessions' THEN v_body:='Seu número de sessões foi corrigido pela administração.';
 ELSE v_body:='Seu tempo registrado de atividade foi corrigido pela administração.';
 END IF;
 INSERT INTO public.cfop_user_notifications(user_id,sent_by,body,priority)
 VALUES(NEW.target_id,NEW.actor_id,left(v_body,500),'important');
 RETURN NEW;
END;$account_notice$;
DROP TRIGGER IF EXISTS cfop_notify_admin_account_action_trg ON public.cfop_admin_audit;
CREATE TRIGGER cfop_notify_admin_account_action_trg AFTER INSERT ON public.cfop_admin_audit
 FOR EACH ROW EXECUTE FUNCTION public.cfop_notify_admin_account_action();
UPDATE public.cfop_user_notifications n
SET actor_name=coalesce(nullif(btrim(p.nickname),''),'Administrador'),
 actor_avatar=CASE WHEN p.avatar_data LIKE 'data:image/webp;base64,%' THEN p.avatar_data ELSE NULL END,
 actor_is_creator=coalesce(public.cfop_is_owner(n.sent_by),false)
FROM public.cfop_profiles p WHERE p.user_id=n.sent_by AND n.actor_name IS NULL;
NOTIFY pgrst,'reload schema';
COMMIT;