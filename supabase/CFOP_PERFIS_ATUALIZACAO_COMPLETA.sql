-- ACADEMIA CPOF: identidade única, avatar quadrado e moderação de perfil.
-- Execute após a instalação do backend de contas e da administração.
-- Conserva contas e histórico; nomes antigos iguais recebem identificador único.
BEGIN;
ALTER TABLE public.cfop_profiles
 ADD COLUMN IF NOT EXISTS avatar_data text;
ALTER TABLE public.cfop_user_admin_state
 ADD COLUMN IF NOT EXISTS name_locked boolean NOT NULL DEFAULT false,
 ADD COLUMN IF NOT EXISTS avatar_blocked boolean NOT NULL DEFAULT false;

-- O nome genérico antigo não deve ser uma identidade registrada.
UPDATE public.cfop_profiles
 SET nickname='Cubista-'||left(replace(user_id::text,'-',''),12),
 updated_at=now()
 WHERE nickname IS NULL OR length(btrim(nickname))<3
    OR lower(btrim(nickname)) IN ('cubista','cubista anônimo','cubista anonimo');

-- O banco antigo permitia 40 caracteres; ajusta os existentes ao novo limite.
UPDATE public.cfop_profiles
 SET nickname=left(btrim(nickname),36),updated_at=now()
 WHERE length(btrim(nickname))>36;

-- Preserva o primeiro detentor dos nomes repetidos, corrigindo os demais.
WITH duplicates AS (
 SELECT user_id,row_number() OVER
  (PARTITION BY lower(btrim(nickname)) ORDER BY created_at,user_id) AS number
 FROM public.cfop_profiles
)
UPDATE public.cfop_profiles p
 SET nickname='Cubista-'||left(replace(p.user_id::text,'-',''),12),
     updated_at=now()
 FROM duplicates d WHERE p.user_id=d.user_id AND d.number>1;

CREATE UNIQUE INDEX IF NOT EXISTS cfop_profiles_unique_nickname
 ON public.cfop_profiles(lower(btrim(nickname)));

ALTER TABLE public.cfop_profiles
 DROP CONSTRAINT IF EXISTS cfop_profiles_nickname_valid;
ALTER TABLE public.cfop_profiles
 ADD CONSTRAINT cfop_profiles_nickname_valid
 CHECK (
  length(btrim(nickname)) BETWEEN 3 AND 36
  AND lower(btrim(nickname)) NOT IN ('cubista anônimo','cubista anonimo')
 );

ALTER TABLE public.cfop_profiles
 DROP CONSTRAINT IF EXISTS cfop_profiles_avatar_valid;
ALTER TABLE public.cfop_profiles
 ADD CONSTRAINT cfop_profiles_avatar_valid CHECK (
   avatar_data IS NULL OR (
    octet_length(avatar_data)<=80000
    AND avatar_data ~ '^data:image/webp;base64,[A-Za-z0-9+/=]+$'
   )
 );

-- Nenhum cliente pode burlar o bloqueio alterando diretamente a tabela.
REVOKE INSERT,UPDATE,DELETE ON public.cfop_profiles FROM anon,authenticated;
GRANT SELECT ON public.cfop_profiles TO authenticated;
ALTER TABLE public.cfop_profiles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS cfop_profiles_read ON public.cfop_profiles;
CREATE POLICY cfop_profiles_read ON public.cfop_profiles FOR SELECT
 TO authenticated USING (user_id=(SELECT auth.uid()) OR
  (SELECT public.cfop_is_owner(auth.uid())));
DROP POLICY IF EXISTS cfop_profiles_insert ON public.cfop_profiles;
DROP POLICY IF EXISTS cfop_profiles_update ON public.cfop_profiles;

CREATE OR REPLACE FUNCTION public.cfop_set_identity(
 p_new_name text DEFAULT NULL,
 p_set_avatar boolean DEFAULT false,
 p_avatar_data text DEFAULT NULL
) RETURNS TABLE(nickname text,avatar_data text)
LANGUAGE plpgsql SECURITY DEFINER SET search_path=''
AS $identity$
DECLARE v_user uuid:=auth.uid();v_name text;v_locked boolean;v_blocked boolean;
BEGIN
 IF v_user IS NULL THEN RAISE EXCEPTION 'Entre na conta para personalizar o perfil'; END IF;
 IF NOT public.cfop_user_allowed(v_user) THEN RAISE EXCEPTION 'Sua conta está com acesso restrito'; END IF;
 SELECT coalesce(name_locked,false),coalesce(avatar_blocked,false)
  INTO v_locked,v_blocked FROM public.cfop_user_admin_state WHERE user_id=v_user;
 v_locked:=coalesce(v_locked,false);v_blocked:=coalesce(v_blocked,false);
 IF p_new_name IS NOT NULL AND v_locked THEN
  RAISE EXCEPTION 'A alteração do nome foi bloqueada pela administração';
 END IF;
 IF p_set_avatar AND v_blocked AND p_avatar_data IS NOT NULL THEN
  RAISE EXCEPTION 'O envio de fotos foi bloqueado pela administração';
 END IF;
 IF p_new_name IS NOT NULL THEN
  v_name:=btrim(regexp_replace(p_new_name,'[[:space:]]+',' ','g'));
  IF length(v_name) NOT BETWEEN 3 AND 36 OR
     v_name !~ '^[[:alnum:]À-ÿ][[:alnum:]À-ÿ ._-]*$' OR
     lower(v_name) IN ('cubista anônimo','cubista anonimo')
  THEN RAISE EXCEPTION 'Use um nome de 3 a 36 caracteres, com letras, números, espaços, ponto, hífen ou sublinhado'; END IF;
 END IF;
 IF p_set_avatar AND p_avatar_data IS NOT NULL
   AND (octet_length(p_avatar_data)>80000 OR
        p_avatar_data !~ '^data:image/webp;base64,[A-Za-z0-9+/=]+$')
 THEN RAISE EXCEPTION 'Foto inválida: use uma imagem WebP compactada até 60 KB'; END IF;
 -- É possível ter conta sem apelido escolhido, com nome temporário exclusivo.
 INSERT INTO public.cfop_profiles(user_id,nickname,avatar_data)
 VALUES(v_user,coalesce(v_name,'Cubista-'||left(replace(v_user::text,'-',''),12)),
       CASE WHEN p_set_avatar THEN p_avatar_data ELSE NULL END)
 ON CONFLICT(user_id) DO UPDATE SET
 nickname=coalesce(v_name,public.cfop_profiles.nickname),
 avatar_data=CASE WHEN p_set_avatar THEN p_avatar_data
                   ELSE public.cfop_profiles.avatar_data END,
 updated_at=now();
 RETURN QUERY SELECT p.nickname,p.avatar_data FROM public.cfop_profiles p
  WHERE p.user_id=v_user;
EXCEPTION WHEN unique_violation THEN
 RAISE EXCEPTION 'Este nome já está sendo usado. Escolha outro.';
END;
$identity$;
REVOKE ALL ON FUNCTION public.cfop_set_identity(text,boolean,text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.cfop_set_identity(text,boolean,text) TO authenticated;

CREATE OR REPLACE FUNCTION public.cfop_admin_identity_list()
RETURNS TABLE(user_id uuid,avatar_data text,name_locked boolean,avatar_blocked boolean)
LANGUAGE plpgsql SECURITY DEFINER SET search_path=''
AS $adminlist$
BEGIN
 IF auth.uid() IS NULL OR NOT public.cfop_is_owner(auth.uid()) THEN
  RAISE EXCEPTION 'Acesso reservado ao administrador fundador';
 END IF;
 RETURN QUERY SELECT p.user_id,p.avatar_data,
  coalesce(s.name_locked,false),coalesce(s.avatar_blocked,false)
 FROM public.cfop_profiles p
 LEFT JOIN public.cfop_user_admin_state s ON s.user_id=p.user_id;
END;
$adminlist$;
REVOKE ALL ON FUNCTION public.cfop_admin_identity_list() FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.cfop_admin_identity_list() TO authenticated;

CREATE OR REPLACE FUNCTION public.cfop_admin_identity_action(
 p_target uuid,p_action text
) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path=''
AS $adminaction$
DECLARE v_actor uuid:=auth.uid();
BEGIN
 IF v_actor IS NULL OR NOT public.cfop_is_owner(v_actor) THEN
  RAISE EXCEPTION 'Acesso reservado ao administrador fundador';
 END IF;
 IF p_target IS NULL OR NOT EXISTS(SELECT 1 FROM auth.users WHERE id=p_target)
 THEN RAISE EXCEPTION 'Usuário não encontrado'; END IF;
 IF p_target=v_actor OR public.cfop_is_admin(p_target) THEN
  RAISE EXCEPTION 'A moderação de perfil não se aplica a administradores';
 END IF;
 IF p_action='remove_photo' THEN
  UPDATE public.cfop_profiles SET avatar_data=NULL,updated_at=now() WHERE user_id=p_target;
 ELSIF p_action IN ('block_photo','allow_photo','lock_name','unlock_name') THEN
  INSERT INTO public.cfop_user_admin_state(user_id,name_locked,avatar_blocked)
  VALUES(p_target,p_action='lock_name',p_action='block_photo')
  ON CONFLICT(user_id) DO UPDATE SET
   name_locked=CASE WHEN p_action='lock_name' THEN true
                    WHEN p_action='unlock_name' THEN false
                    ELSE public.cfop_user_admin_state.name_locked END,
   avatar_blocked=CASE WHEN p_action='block_photo' THEN true
                       WHEN p_action='allow_photo' THEN false
                       ELSE public.cfop_user_admin_state.avatar_blocked END,
   updated_at=now();
  IF p_action='block_photo' THEN
   UPDATE public.cfop_profiles SET avatar_data=NULL,updated_at=now() WHERE user_id=p_target;
  END IF;
 ELSE RAISE EXCEPTION 'Ação de perfil inválida'; END IF;
 INSERT INTO public.cfop_admin_audit(actor_id,target_id,action,detail)
 VALUES(v_actor,p_target,p_action,'{}'::jsonb);
END;
$adminaction$;
REVOKE ALL ON FUNCTION public.cfop_admin_identity_action(uuid,text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.cfop_admin_identity_action(uuid,text) TO authenticated;
NOTIFY pgrst,'reload schema';
COMMIT;



-- Complemento da Academia CPOF: limites por conta + avisos que exigem leitura.
-- Horários de contagem dos limites: America/Fortaleza (UTC-3).
BEGIN;
CREATE TABLE IF NOT EXISTS public.cfop_identity_events (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  kind text NOT NULL CHECK (kind IN ('name','avatar')),
  changed_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS cfop_identity_events_counter
 ON public.cfop_identity_events(user_id,kind,changed_at DESC);
ALTER TABLE public.cfop_identity_events ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.cfop_identity_events FROM PUBLIC,anon,authenticated;

-- O banco antigo pode já ter um perfil, sem histórico de trocas; não inventar eventos retroativos.
-- Esta função limita somente mudanças reais. Um nome anterior torna-se disponível
-- imediatamente quando o usuário passa a utilizar outro.
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
 v_now timestamptz:=now();
 v_today date:=(now() AT TIME ZONE 'America/Fortaleza')::date;
BEGIN
 IF v_user IS NULL THEN RAISE EXCEPTION 'Entre na sua conta para personalizar o perfil'; END IF;
 IF NOT public.cfop_user_allowed(v_user) THEN RAISE EXCEPTION 'Sua conta está com acesso restrito'; END IF;
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
 IF v_name_changed AND v_locked THEN
  RAISE EXCEPTION 'A alteração do seu nome está bloqueada pela administração'; END IF;
 IF v_avatar_changed AND v_blocked AND p_avatar_data IS NOT NULL THEN
  RAISE EXCEPTION 'O envio de fotos está bloqueado pela administração'; END IF;

 IF v_name_changed THEN
  SELECT count(*)::int,max(e.changed_at) INTO v_name_count,v_last_name
   FROM public.cfop_identity_events e WHERE e.user_id=v_user AND e.kind='name'
    AND (e.changed_at AT TIME ZONE 'America/Fortaleza')::date=v_today;
  IF v_name_count>=3 THEN
   RAISE EXCEPTION 'Limite de 3 mudanças de nome atingido hoje. Tente novamente amanhã.'; END IF;
  IF v_last_name IS NOT NULL AND v_now<v_last_name+interval '30 minutes' THEN
   RAISE EXCEPTION 'Aguarde 30 minutos entre mudanças de nome.'; END IF;
 END IF;
 IF v_avatar_changed THEN
  SELECT count(*)::int,max(e.changed_at) INTO v_avatar_count,v_last_avatar
   FROM public.cfop_identity_events e WHERE e.user_id=v_user AND e.kind='avatar'
    AND (e.changed_at AT TIME ZONE 'America/Fortaleza')::date=v_today;
  IF v_avatar_count>=2 THEN
   RAISE EXCEPTION 'Limite de 2 mudanças de foto atingido hoje. Tente novamente amanhã.'; END IF;
  IF v_last_avatar IS NOT NULL AND v_now<v_last_avatar+interval '2 hours' THEN
   RAISE EXCEPTION 'Aguarde 2 horas entre mudanças de foto.'; END IF;
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
  v_n_last timestamptz;v_a_last timestamptz;v_reset timestamptz;
BEGIN
 IF v_user IS NULL THEN RAISE EXCEPTION 'Faça login para ver seus limites'; END IF;
 v_reset:=((v_day+1)::timestamp AT TIME ZONE 'America/Fortaleza');
 SELECT count(*)::int,max(e.changed_at) INTO name_used,v_n_last
  FROM public.cfop_identity_events e
  WHERE e.user_id=v_user AND e.kind='name'
  AND (e.changed_at AT TIME ZONE 'America/Fortaleza')::date=v_day;
 SELECT count(*)::int,max(e.changed_at) INTO photo_used,v_a_last
  FROM public.cfop_identity_events e
  WHERE e.user_id=v_user AND e.kind='avatar'
  AND (e.changed_at AT TIME ZONE 'America/Fortaleza')::date=v_day;
 name_remaining:=greatest(0,3-name_used);
 photo_remaining:=greatest(0,2-photo_used);
 name_next_at:=CASE WHEN name_used>=3 THEN v_reset
  WHEN v_n_last IS NULL THEN NULL
  WHEN now()>=v_n_last+interval '30 minutes' THEN NULL
  ELSE v_n_last+interval '30 minutes' END;
 photo_next_at:=CASE WHEN photo_used>=2 THEN v_reset
  WHEN v_a_last IS NULL THEN NULL
  WHEN now()>=v_a_last+interval '2 hours' THEN NULL
  ELSE v_a_last+interval '2 hours' END;
 RETURN NEXT;
END;$limits$;
REVOKE ALL ON FUNCTION public.cfop_identity_limits() FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.cfop_identity_limits() TO authenticated;

CREATE OR REPLACE FUNCTION public.cfop_admin_identity_limits()
RETURNS TABLE(user_id uuid,name_today integer,photo_today integer,name_last timestamptz,photo_last timestamptz)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=''
AS $adminlimits$
DECLARE v_day date:=(now() AT TIME ZONE 'America/Fortaleza')::date;
BEGIN
 IF auth.uid() IS NULL OR NOT public.cfop_is_owner(auth.uid()) THEN
  RAISE EXCEPTION 'Somente o administrador fundador pode consultar limites de perfil'; END IF;
 RETURN QUERY SELECT u.id,
  count(e.id) FILTER (WHERE e.kind='name' AND (e.changed_at AT TIME ZONE 'America/Fortaleza')::date=v_day)::int,
  count(e.id) FILTER (WHERE e.kind='avatar' AND (e.changed_at AT TIME ZONE 'America/Fortaleza')::date=v_day)::int,
  max(e.changed_at) FILTER (WHERE e.kind='name'),
  max(e.changed_at) FILTER (WHERE e.kind='avatar')
 FROM auth.users u LEFT JOIN public.cfop_identity_events e ON e.user_id=u.id
 GROUP BY u.id;
END;$adminlimits$;
REVOKE ALL ON FUNCTION public.cfop_admin_identity_limits() FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.cfop_admin_identity_limits() TO authenticated;

-- Atualizações manuais do fundador, sem consumir a cota do usuário.
-- Apenas os campos autorizados são modificáveis. Nunca expor tokens ou senhas.
CREATE OR REPLACE FUNCTION public.cfop_admin_manage_identity(
 p_target uuid,p_action text,p_value text DEFAULT ''
) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=''
AS $manage$
DECLARE v_actor uuid:=auth.uid();v_name text;v_previous text;v_changes integer;
BEGIN
 IF v_actor IS NULL OR NOT public.cfop_is_owner(v_actor) THEN
  RAISE EXCEPTION 'Somente o administrador fundador pode corrigir identidades';END IF;
 IF p_target IS NULL THEN RAISE EXCEPTION 'Usuário não encontrado';END IF;
 PERFORM 1 FROM auth.users WHERE id=p_target FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Usuário não encontrado';END IF;
 IF p_target=v_actor OR public.cfop_is_admin(p_target) THEN
  RAISE EXCEPTION 'Não é permitido editar administradores';END IF;
 SELECT nickname INTO v_previous FROM public.cfop_profiles WHERE user_id=p_target;
 IF p_action='rename' THEN
  v_name:=btrim(regexp_replace(coalesce(p_value,''),'[[:space:]]+',' ','g'));
  IF char_length(v_name) NOT BETWEEN 3 AND 36 OR
     v_name !~ '^[[:alnum:]À-ÿ][[:alnum:]À-ÿ ._-]*$' OR
     lower(v_name) IN ('cubista anônimo','cubista anonimo')
  THEN RAISE EXCEPTION 'Nome inválido: use de 3 a 36 caracteres';END IF;
  IF EXISTS(SELECT 1 FROM public.cfop_profiles p
    WHERE lower(btrim(p.nickname))=lower(btrim(v_name)) AND p.user_id<>p_target)
  THEN RAISE EXCEPTION 'Este nome já está sendo utilizado';END IF;
  INSERT INTO public.cfop_profiles(user_id,nickname) VALUES(p_target,v_name)
  ON CONFLICT(user_id) DO UPDATE SET nickname=excluded.nickname,updated_at=now();
 ELSIF p_action='reset_name_limit' OR p_action='reset_photo_limit' THEN
  DELETE FROM public.cfop_identity_events e WHERE e.user_id=p_target
   AND e.kind=CASE WHEN p_action='reset_name_limit' THEN 'name' ELSE 'avatar' END
   AND (e.changed_at AT TIME ZONE 'America/Fortaleza')::date=
       (now() AT TIME ZONE 'America/Fortaleza')::date;
  GET DIAGNOSTICS v_changes=ROW_COUNT;
 ELSIF p_action='remove_photo' THEN
  UPDATE public.cfop_profiles SET avatar_data=NULL,updated_at=now() WHERE user_id=p_target;
 ELSIF p_action IN ('lock_name','unlock_name','block_photo','allow_photo') THEN
  INSERT INTO public.cfop_user_admin_state(user_id,name_locked,avatar_blocked)
   VALUES(p_target,p_action='lock_name',p_action='block_photo')
  ON CONFLICT(user_id) DO UPDATE SET
   name_locked=CASE WHEN p_action='lock_name' THEN true WHEN p_action='unlock_name' THEN false ELSE public.cfop_user_admin_state.name_locked END,
   avatar_blocked=CASE WHEN p_action='block_photo' THEN true WHEN p_action='allow_photo' THEN false ELSE public.cfop_user_admin_state.avatar_blocked END,
   updated_at=now();
  IF p_action='block_photo' THEN UPDATE public.cfop_profiles SET avatar_data=NULL,updated_at=now() WHERE user_id=p_target; END IF;
 ELSE RAISE EXCEPTION 'Ação administrativa desconhecida'; END IF;
 INSERT INTO public.cfop_admin_audit(actor_id,target_id,action,detail)
 VALUES(v_actor,p_target,'profile_'||p_action,
  jsonb_build_object('old_name',CASE WHEN p_action='rename' THEN v_previous ELSE NULL END,
   'new_name',CASE WHEN p_action='rename' THEN v_name ELSE NULL END,
   'reset_count',CASE WHEN p_action LIKE 'reset_%' THEN v_changes ELSE NULL END));
END;
$manage$;
REVOKE ALL ON FUNCTION public.cfop_admin_manage_identity(uuid,text,text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.cfop_admin_manage_identity(uuid,text,text) TO authenticated;

-- Um aviso permanece sem read_at até a pessoa confirmar. Limite de envio
-- impede abuso por acidente e protege a caixa do destinatário.
ALTER TABLE public.cfop_user_notifications
 ADD COLUMN IF NOT EXISTS priority text NOT NULL DEFAULT 'normal';
ALTER TABLE public.cfop_user_notifications
 DROP CONSTRAINT IF EXISTS cfop_notice_priority_valid;
ALTER TABLE public.cfop_user_notifications
 ADD CONSTRAINT cfop_notice_priority_valid CHECK(priority IN ('normal','important'));
CREATE INDEX IF NOT EXISTS cfop_notice_unread_idx
 ON public.cfop_user_notifications(user_id,created_at) WHERE read_at IS NULL;

CREATE OR REPLACE FUNCTION public.cfop_admin_send_notice(
 p_target uuid,p_message text,p_priority text DEFAULT 'normal'
) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path=''
AS $send$
DECLARE v_actor uuid:=auth.uid();v_id uuid;v_text text;v_hour int;v_day int;
BEGIN
 IF v_actor IS NULL OR NOT public.cfop_is_admin(v_actor) THEN
  RAISE EXCEPTION 'Acesso reservado à administração';END IF;
 IF p_target IS NULL OR NOT EXISTS(SELECT 1 FROM auth.users WHERE id=p_target)
 THEN RAISE EXCEPTION 'Conta de destino não encontrada';END IF;
 v_text:=btrim(coalesce(p_message,''));
 IF length(v_text) NOT BETWEEN 1 AND 500 THEN RAISE EXCEPTION 'Mensagem de 1 a 500 caracteres';END IF;
 IF p_priority NOT IN ('normal','important') OR p_priority IS NULL THEN RAISE EXCEPTION 'Prioridade inválida';END IF;
 -- Serialize notificações do mesmo destinatário para evitar envio simultâneo acima do limite.
 PERFORM 1 FROM auth.users WHERE id=p_target FOR UPDATE;
 SELECT count(*)::int INTO v_hour FROM public.cfop_user_notifications
   WHERE user_id=p_target AND sent_by=v_actor AND created_at>=now()-interval '1 hour';
 SELECT count(*)::int INTO v_day FROM public.cfop_user_notifications
   WHERE user_id=p_target AND sent_by=v_actor AND created_at>=now()-interval '24 hours';
 IF v_hour>=8 OR v_day>=24 THEN
  RAISE EXCEPTION 'Limite de avisos para este usuário atingido: máximo 8 por hora e 24 em 24 horas';END IF;
 INSERT INTO public.cfop_user_notifications(user_id,sent_by,body,priority)
 VALUES(p_target,v_actor,v_text,p_priority) RETURNING id INTO v_id;
 INSERT INTO public.cfop_admin_audit(actor_id,target_id,action,detail)
 VALUES(v_actor,p_target,'notice_sent',jsonb_build_object('priority',p_priority,'message',left(v_text,240)));
 RETURN v_id;
END;$send$;
REVOKE ALL ON FUNCTION public.cfop_admin_send_notice(uuid,text,text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.cfop_admin_send_notice(uuid,text,text) TO authenticated;

CREATE OR REPLACE FUNCTION public.cfop_mark_notice_read(p_notice uuid)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path=''
AS $readnotice$
DECLARE v_user uuid:=auth.uid();v_updated int;
BEGIN
 IF v_user IS NULL OR p_notice IS NULL THEN RAISE EXCEPTION 'Entre na conta para confirmar a leitura';END IF;
 UPDATE public.cfop_user_notifications
 SET read_at=now() WHERE id=p_notice AND user_id=v_user AND read_at IS NULL;
 GET DIAGNOSTICS v_updated=ROW_COUNT;
 RETURN v_updated>0;
END;$readnotice$;
REVOKE ALL ON FUNCTION public.cfop_mark_notice_read(uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.cfop_mark_notice_read(uuid) TO authenticated;

-- Impede uso do endpoint legado para contornar os limites de envio de avisos.

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
   raise exception 'Envie avisos pelo novo canal de notificações administrativas';
 else raise exception 'Ação desconhecida';end if;
 insert into public.cfop_admin_audit(actor_id,target_id,action,detail) values(v_actor,p_target,p_action,jsonb_build_object('value',p_value,'message',left(p_message,240)));
end;$$;

NOTIFY pgrst,'reload schema';
COMMIT;

SELECT count(*) AS contas_com_perfil,count(DISTINCT lower(btrim(nickname))) AS nomes_unicos FROM public.cfop_profiles;
