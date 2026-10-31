-- CFOP STUDIO: CORREÇÃO ÚNICA PARA SALVAR BIBLIOTECA PRINCIPAL.
-- Supabase > SQL Editor > New query > colar tudo > Run.
-- É necessário já ter a estrutura de bibliotecas (000007).
-- Não remove bibliotecas existentes, usuários nem progresso.
BEGIN;

-- 1. Base original com acesso controlado
-- Privacidade do catálogo: base original restrita ao fundador.
-- Executar depois da migração 000007. Não apaga bibliotecas já publicadas.

CREATE TABLE IF NOT EXISTS public.cfop_original_base_control (
 singleton boolean PRIMARY KEY DEFAULT true CHECK (singleton),
 deleted_at timestamptz,
 updated_at timestamptz NOT NULL DEFAULT now()
);
INSERT INTO public.cfop_original_base_control(singleton) VALUES(true)
ON CONFLICT(singleton) DO NOTHING;

CREATE TABLE IF NOT EXISTS public.cfop_original_base_cases (
 case_id text PRIMARY KEY REFERENCES public.cfop_case_catalog(case_id),
 details jsonb NOT NULL CHECK(jsonb_typeof(details)='object'),
 created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.cfop_original_base_control ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cfop_original_base_cases ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.cfop_original_base_control,public.cfop_original_base_cases FROM anon,authenticated;
GRANT SELECT ON public.cfop_original_base_control TO authenticated;
GRANT SELECT,INSERT ON public.cfop_original_base_cases TO authenticated;

DROP POLICY IF EXISTS cfop_original_control_owner ON public.cfop_original_base_control;
CREATE POLICY cfop_original_control_owner ON public.cfop_original_base_control
FOR SELECT TO authenticated USING (
 (SELECT public.cfop_is_owner(auth.uid()))
);
DROP POLICY IF EXISTS cfop_original_cases_owner_read ON public.cfop_original_base_cases;
CREATE POLICY cfop_original_cases_owner_read ON public.cfop_original_base_cases
FOR SELECT TO authenticated USING (
 (SELECT public.cfop_is_owner(auth.uid()))
 AND EXISTS(SELECT 1 FROM public.cfop_original_base_control c WHERE c.singleton AND c.deleted_at IS NULL)
);
DROP POLICY IF EXISTS cfop_original_cases_owner_insert ON public.cfop_original_base_cases;
CREATE POLICY cfop_original_cases_owner_insert ON public.cfop_original_base_cases
FOR INSERT TO authenticated WITH CHECK (
 (SELECT public.cfop_is_owner(auth.uid()))
 AND (SELECT public.cfop_user_allowed(auth.uid()))
 AND EXISTS(SELECT 1 FROM public.cfop_original_base_control c WHERE c.singleton AND c.deleted_at IS NULL)
);

-- Os casos do antigo editor deixam de ser públicos: a publicação para alunos
-- ocorre apenas por cfop_libraries + cfop_library_cases (casos aprovados).
DROP POLICY IF EXISTS cfop_cases_public_read ON public.cfop_published_cases;
DROP POLICY IF EXISTS cfop_cases_owner_read ON public.cfop_published_cases;
CREATE POLICY cfop_cases_owner_read ON public.cfop_published_cases
FOR SELECT TO authenticated USING (
 (SELECT public.cfop_is_owner(auth.uid()))
);

CREATE OR REPLACE FUNCTION public.cfop_delete_original_base()
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=''
AS $$
DECLARE actor uuid:=auth.uid();
BEGIN
 IF actor IS NULL OR NOT public.cfop_is_owner(actor) OR NOT public.cfop_user_allowed(actor)
 THEN RAISE EXCEPTION 'Somente o fundador pode excluir a base original'; END IF;
 IF EXISTS(SELECT 1 FROM public.cfop_original_base_control WHERE deleted_at IS NOT NULL)
 THEN RAISE EXCEPTION 'A base original já foi excluída'; END IF;
 DELETE FROM public.cfop_original_base_cases;
 UPDATE public.cfop_original_base_control
  SET deleted_at=now(),updated_at=now() WHERE singleton=true;
 INSERT INTO public.cfop_admin_audit(actor_id,target_id,action,detail)
 VALUES(actor,actor,'delete_original_base','{}'::jsonb);
END;
$$;
REVOKE ALL ON FUNCTION public.cfop_delete_original_base() FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.cfop_delete_original_base() TO authenticated;

NOTIFY pgrst,'reload schema';

-- 2. Padrão de F2L/OLL/PLL e função de salvamento
-- Padrão público por etapa; a base original só pode ser escolhida para F2L e PLL.
-- Execute depois de 20261031_000008_private_original.sql.

CREATE TABLE IF NOT EXISTS public.cfop_stage_defaults(
 stage text PRIMARY KEY CHECK(stage IN ('f2l','oll','pll')),
 source text NOT NULL DEFAULT 'none' CHECK(source IN ('none','original','library')),
 library_id uuid REFERENCES public.cfop_libraries(id) ON DELETE RESTRICT,
 updated_at timestamptz NOT NULL DEFAULT now(),
 updated_by uuid REFERENCES auth.users(id),
 CONSTRAINT cfop_stage_default_source_check CHECK (
  (source IN ('none','original') AND library_id IS NULL)
  OR (source='library' AND library_id IS NOT NULL)
 ),
 CONSTRAINT cfop_original_no_oll CHECK (source<>'original' OR stage IN ('f2l','pll'))
);
INSERT INTO public.cfop_stage_defaults(stage,source)
VALUES('f2l','none'),('oll','none'),('pll','none')
ON CONFLICT(stage) DO NOTHING;
ALTER TABLE public.cfop_stage_defaults ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.cfop_stage_defaults FROM PUBLIC,anon,authenticated;
GRANT SELECT ON public.cfop_stage_defaults TO anon,authenticated;
GRANT UPDATE ON public.cfop_stage_defaults TO authenticated;
DROP POLICY IF EXISTS cfop_stage_defaults_read ON public.cfop_stage_defaults;
CREATE POLICY cfop_stage_defaults_read ON public.cfop_stage_defaults FOR SELECT TO anon,authenticated USING(true);
DROP POLICY IF EXISTS cfop_stage_defaults_update ON public.cfop_stage_defaults;
CREATE POLICY cfop_stage_defaults_update ON public.cfop_stage_defaults FOR UPDATE TO authenticated
USING((SELECT public.cfop_is_owner(auth.uid())) AND (SELECT public.cfop_user_allowed(auth.uid())))
WITH CHECK((SELECT public.cfop_is_owner(auth.uid())) AND (SELECT public.cfop_user_allowed(auth.uid())));

CREATE OR REPLACE FUNCTION public.cfop_set_stage_default(p_stage text,p_source text,p_library uuid DEFAULT NULL)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=''
AS $$
DECLARE actor uuid:=auth.uid();
BEGIN
 IF actor IS NULL OR NOT public.cfop_is_owner(actor) OR NOT public.cfop_user_allowed(actor)
 THEN RAISE EXCEPTION 'Somente o fundador pode configurar a base principal'; END IF;
 IF p_stage NOT IN ('f2l','oll','pll') OR p_source NOT IN ('none','original','library')
 THEN RAISE EXCEPTION 'Etapa ou tipo de biblioteca inválido'; END IF;
 IF p_source='original' THEN
  IF p_stage='oll' THEN RAISE EXCEPTION 'Não existe base original de OLL'; END IF;
  IF NOT EXISTS(SELECT 1 FROM public.cfop_original_base_control WHERE singleton AND deleted_at IS NULL)
  THEN RAISE EXCEPTION 'A base original foi excluída'; END IF;
  IF p_library IS NOT NULL THEN RAISE EXCEPTION 'Base original não recebe ID de biblioteca'; END IF;
 ELSIF p_source='library' THEN
  IF p_library IS NULL OR NOT EXISTS(
   SELECT 1 FROM public.cfop_libraries l
   JOIN public.cfop_library_cases c ON c.library_id=l.id
   JOIN public.cfop_case_catalog cc ON cc.case_id=c.case_id
   WHERE l.id=p_library AND l.is_public=true AND c.status='approved' AND cc.stage=p_stage
  ) THEN RAISE EXCEPTION 'Publique ao menos um caso desta etapa antes de defini-la como principal'; END IF;
 ELSIF p_library IS NOT NULL THEN RAISE EXCEPTION 'Opção sem biblioteca não recebe ID'; END IF;
 UPDATE public.cfop_stage_defaults
  SET source=p_source,library_id=p_library,updated_at=now(),updated_by=actor
 WHERE stage=p_stage;
 IF NOT FOUND THEN RAISE EXCEPTION 'Etapa não encontrada'; END IF;
 INSERT INTO public.cfop_admin_audit(actor_id,target_id,action,detail)
 VALUES(actor,actor,'set_stage_default',
  jsonb_build_object('stage',p_stage,'source',p_source,'library_id',p_library));
END;
$$;
REVOKE ALL ON FUNCTION public.cfop_set_stage_default(text,text,uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.cfop_set_stage_default(text,text,uuid) TO authenticated;

-- A base original é publicamente consultável somente para a etapa que o
-- administrador escolher como principal. As outras etapas seguem privadas.
CREATE OR REPLACE FUNCTION public.cfop_original_public_stage(p_case_id text)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=''
AS $$
 SELECT EXISTS(
  SELECT 1 FROM public.cfop_case_catalog c
  JOIN public.cfop_stage_defaults d ON d.stage=c.stage
  JOIN public.cfop_original_base_control ctl ON ctl.singleton=true
  WHERE c.case_id=p_case_id AND d.source='original'
    AND c.stage IN ('f2l','pll') AND ctl.deleted_at IS NULL
 );
$$;
REVOKE ALL ON FUNCTION public.cfop_original_public_stage(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.cfop_original_public_stage(text) TO anon,authenticated;
GRANT SELECT ON public.cfop_original_base_cases TO anon;
DROP POLICY IF EXISTS cfop_original_cases_stage_default_read ON public.cfop_original_base_cases;
CREATE POLICY cfop_original_cases_stage_default_read
ON public.cfop_original_base_cases FOR SELECT TO anon,authenticated
USING(public.cfop_original_public_stage(case_id));

-- Não pode excluir a base enquanto ela é padrão público.
CREATE OR REPLACE FUNCTION public.cfop_delete_original_base()
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=''
AS $$
DECLARE actor uuid:=auth.uid();
BEGIN
 IF actor IS NULL OR NOT public.cfop_is_owner(actor) OR NOT public.cfop_user_allowed(actor)
 THEN RAISE EXCEPTION 'Somente o fundador pode excluir a base original'; END IF;
 IF EXISTS(SELECT 1 FROM public.cfop_original_base_control WHERE deleted_at IS NOT NULL)
 THEN RAISE EXCEPTION 'A base original já foi excluída'; END IF;
 UPDATE public.cfop_stage_defaults SET source='none',library_id=NULL,updated_at=now(),updated_by=actor
 WHERE source='original';
 DELETE FROM public.cfop_original_base_cases;
 UPDATE public.cfop_original_base_control SET deleted_at=now(),updated_at=now() WHERE singleton=true;
 INSERT INTO public.cfop_admin_audit(actor_id,target_id,action,detail)
 VALUES(actor,actor,'delete_original_base','{}'::jsonb);
END;
$$;
REVOKE ALL ON FUNCTION public.cfop_delete_original_base() FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.cfop_delete_original_base() TO authenticated;
NOTIFY pgrst,'reload schema';

-- 3. Exclusão de bibliotecas pelo fundador
CREATE OR REPLACE FUNCTION public.cfop_delete_library(p_library uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=''
AS $$
DECLARE actor uuid:=auth.uid();
BEGIN
 IF actor IS NULL OR NOT public.cfop_is_owner(actor) OR NOT public.cfop_user_allowed(actor)
 THEN RAISE EXCEPTION 'Somente o administrador fundador pode excluir bibliotecas'; END IF;
 IF NOT EXISTS(SELECT 1 FROM public.cfop_libraries WHERE id=p_library)
 THEN RAISE EXCEPTION 'Biblioteca não encontrada'; END IF;
 UPDATE public.cfop_stage_defaults
 SET source='none',library_id=NULL,updated_at=now(),updated_by=actor
 WHERE library_id=p_library;
 DELETE FROM public.cfop_library_case_drafts WHERE library_id=p_library;
 DELETE FROM public.cfop_library_cases WHERE library_id=p_library;
 DELETE FROM public.cfop_libraries WHERE id=p_library;
 INSERT INTO public.cfop_admin_audit(actor_id,target_id,action,detail)
 VALUES(actor,actor,'delete_library',jsonb_build_object('library_id',p_library));
END;
$$;
REVOKE ALL ON FUNCTION public.cfop_delete_library(uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.cfop_delete_library(uuid) TO authenticated;
NOTIFY pgrst,'reload schema';

NOTIFY pgrst, 'reload schema';
COMMIT;

SELECT stage AS etapa, source AS base_principal, library_id AS biblioteca
FROM public.cfop_stage_defaults ORDER BY stage;
