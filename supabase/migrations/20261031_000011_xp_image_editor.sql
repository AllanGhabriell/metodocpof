-- Academia CPOF — evolução: XP validado no servidor + originais de imagens.
-- Execute uma única vez após 000001…000010, no SQL Editor do projeto correto.
-- Não exclui contas, XP antigo, bibliotecas ou imagens publicadas.
BEGIN;

-- O original fica separado do WebP corrigido; RLS existente protege os dois campos.
ALTER TABLE public.cfop_library_case_drafts
 ADD COLUMN IF NOT EXISTS image_original text;
ALTER TABLE public.cfop_library_cases
 ADD COLUMN IF NOT EXISTS image_original text;

ALTER TABLE public.cfop_library_case_drafts
 DROP CONSTRAINT IF EXISTS cfop_draft_image_original_format;
ALTER TABLE public.cfop_library_case_drafts
 ADD CONSTRAINT cfop_draft_image_original_format
 CHECK (image_original IS NULL OR (char_length(image_original)<=650000
 AND image_original ~ '^data:image/(png|jpeg|webp);base64,'));

ALTER TABLE public.cfop_library_cases
 DROP CONSTRAINT IF EXISTS cfop_case_image_original_format;
ALTER TABLE public.cfop_library_cases
 ADD CONSTRAINT cfop_case_image_original_format
 CHECK (image_original IS NULL OR (char_length(image_original)<=650000
 AND image_original ~ '^data:image/(png|jpeg|webp);base64,'));

-- Manter a publicação atual, inclusive edições de bibliotecas já publicadas.
CREATE OR REPLACE FUNCTION public.cfop_publish_library(p_library uuid)
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path=''
AS $$
DECLARE v_actor uuid:=auth.uid();v_count integer:=0;
BEGIN
 IF v_actor IS NULL OR NOT public.cfop_is_owner(v_actor)
    OR NOT public.cfop_user_allowed(v_actor) THEN
   RAISE EXCEPTION 'Apenas o administrador fundador pode publicar';
 END IF;
 IF NOT EXISTS(SELECT 1 FROM public.cfop_libraries WHERE id=p_library) THEN
   RAISE EXCEPTION 'Biblioteca não encontrada';
 END IF;
 SELECT count(*) INTO v_count FROM public.cfop_library_case_drafts
 WHERE library_id=p_library AND status='approved' AND char_length(trim(algorithm))>0;
 IF v_count=0 THEN RAISE EXCEPTION 'Aprove pelo menos um caso antes de publicar'; END IF;

 INSERT INTO public.cfop_library_cases
 (library_id,case_id,algorithm,setup,orientation,image_data,image_original,status,source_page,updated_at)
 SELECT library_id,case_id,algorithm,setup,orientation,image_data,
        coalesce(image_original,image_data),'approved',source_page,now()
 FROM public.cfop_library_case_drafts
 WHERE library_id=p_library AND status='approved' AND char_length(trim(algorithm))>0
 ON CONFLICT(library_id,case_id) DO UPDATE SET
  algorithm=excluded.algorithm,
  setup=excluded.setup,
  orientation=excluded.orientation,
  image_data=excluded.image_data,
  image_original=coalesce(public.cfop_library_cases.image_original,excluded.image_original),
  status='approved',source_page=excluded.source_page,updated_at=now();
 UPDATE public.cfop_libraries SET is_public=true,updated_at=now() WHERE id=p_library;
 INSERT INTO public.cfop_admin_audit(actor_id,target_id,action,detail)
 VALUES(v_actor,v_actor,'publish_library',jsonb_build_object('library',p_library,'cases',v_count));
 RETURN v_count;
END;
$$;
REVOKE ALL ON FUNCTION public.cfop_publish_library(uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.cfop_publish_library(uuid) TO authenticated;

-- Ledger de recompensas, sem INSERT/UPDATE/DELETE para usuários via API REST.
CREATE TABLE IF NOT EXISTS public.cfop_xp_rewards(
 id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
 user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
 stage text NOT NULL CHECK(stage IN ('f2l','oll','pll')),
 case_id text NOT NULL REFERENCES public.cfop_case_catalog(case_id),
 kind text NOT NULL CHECK(kind IN ('first','review')),
 xp integer NOT NULL CHECK(xp IN (2,8)),
 awarded_day date NOT NULL,
 created_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(user_id,stage,case_id,awarded_day)
);
CREATE UNIQUE INDEX IF NOT EXISTS cfop_xp_first_unique
 ON public.cfop_xp_rewards(user_id,stage,case_id)
 WHERE kind='first';
CREATE INDEX IF NOT EXISTS cfop_xp_user_time
 ON public.cfop_xp_rewards(user_id,created_at DESC);
ALTER TABLE public.cfop_xp_rewards ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.cfop_xp_rewards FROM PUBLIC,anon,authenticated;
GRANT SELECT ON public.cfop_xp_rewards TO authenticated;
DROP POLICY IF EXISTS cfop_xp_self ON public.cfop_xp_rewards;
CREATE POLICY cfop_xp_self ON public.cfop_xp_rewards FOR SELECT TO authenticated
 USING (user_id=(SELECT auth.uid()));

CREATE OR REPLACE FUNCTION public.cfop_xp_balance()
RETURNS bigint LANGUAGE plpgsql SECURITY DEFINER SET search_path='' STABLE
AS $$
DECLARE v_uid uuid:=auth.uid();v_total bigint;
BEGIN
 IF v_uid IS NULL THEN RAISE EXCEPTION 'Entre na sua conta'; END IF;
 SELECT coalesce(sum(xp),0)::bigint INTO v_total
 FROM public.cfop_xp_rewards WHERE user_id=v_uid;
 RETURN v_total;
END;
$$;
REVOKE ALL ON FUNCTION public.cfop_xp_balance() FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.cfop_xp_balance() TO authenticated;

-- Recompensa limitada por usuário, etapa, caso e dia. Somente relógio do banco.
-- Os tempos declarados não provam uma resolução física; o teto restringe abusos.
CREATE OR REPLACE FUNCTION public.cfop_claim_case_xp(
 p_stage text,p_case_id text,p_mode text,p_result text
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=''
AS $$
DECLARE
 v_uid uuid:=auth.uid();
 v_today date:=(now() AT TIME ZONE 'America/Fortaleza')::date;
 v_prior timestamptz;
 v_last timestamptz;
 v_daily integer;
 v_amount integer:=0;
 v_kind text;
 v_total bigint;
BEGIN
 IF v_uid IS NULL THEN RAISE EXCEPTION 'Entre na sua conta'; END IF;
 IF NOT public.cfop_user_allowed(v_uid) THEN RAISE EXCEPTION 'Conta suspensa'; END IF;
 IF p_stage NOT IN ('f2l','oll','pll') OR
    p_mode NOT IN ('random','competitive','adaptive','review','focus') OR
    p_result NOT IN ('easy','completed','hard','missed') THEN
   RAISE EXCEPTION 'Treinamento inválido';
 END IF;
 IF NOT EXISTS(SELECT 1 FROM public.cfop_case_catalog
               WHERE case_id=p_case_id AND stage=p_stage) THEN
   RAISE EXCEPTION 'Identificação de caso inválida';
 END IF;
 -- Trava de transação por usuário impede múltiplas abas de ganhar ao mesmo tempo.
 PERFORM pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(v_uid::text,341));
 SELECT max(created_at) INTO v_last FROM public.cfop_xp_rewards
 WHERE user_id=v_uid AND stage=p_stage AND case_id=p_case_id;
 SELECT coalesce(sum(xp),0) INTO v_daily FROM public.cfop_xp_rewards
 WHERE user_id=v_uid AND awarded_day=v_today;
 IF p_result IN ('easy','completed') AND v_daily<80 AND
    (v_last IS NULL OR v_last<=now()-interval '24 hours') AND
    NOT EXISTS(SELECT 1 FROM public.cfop_xp_rewards
      WHERE user_id=v_uid AND stage=p_stage AND case_id=p_case_id AND awarded_day=v_today) THEN
    IF v_last IS NULL THEN v_kind:='first';v_amount:=8;
    ELSE v_kind:='review';v_amount:=2;END IF;
    IF v_daily+v_amount<=80 THEN
      INSERT INTO public.cfop_xp_rewards(user_id,stage,case_id,kind,xp,awarded_day)
      VALUES(v_uid,p_stage,p_case_id,v_kind,v_amount,v_today);
    ELSE v_amount:=0;END IF;
 END IF;
 SELECT coalesce(sum(xp),0)::bigint INTO v_total
 FROM public.cfop_xp_rewards WHERE user_id=v_uid;
 RETURN pg_catalog.jsonb_build_object('xp',v_amount,'balance',v_total);
END;
$$;
REVOKE ALL ON FUNCTION public.cfop_claim_case_xp(text,text,text,text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.cfop_claim_case_xp(text,text,text,text) TO authenticated;

NOTIFY pgrst,'reload schema';
COMMIT;
-- Para conferir após executar:
-- SELECT to_regclass('public.cfop_xp_rewards') AS xp_ledger,
--        count(*) AS recompensas FROM public.cfop_xp_rewards;
