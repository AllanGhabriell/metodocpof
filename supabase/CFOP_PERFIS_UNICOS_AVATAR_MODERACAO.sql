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

-- Verificação local: não envia imagens nem altera perfis de usuários.
SELECT count(*) AS usuarios_com_perfil,count(DISTINCT lower(btrim(nickname))) AS nomes_exclusivos
FROM public.cfop_profiles;
