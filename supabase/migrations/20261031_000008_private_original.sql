-- Privacidade do catálogo: base original restrita ao fundador.
-- Executar depois da migração 000007. Não apaga bibliotecas já publicadas.
BEGIN;

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
END
$$;
REVOKE ALL ON FUNCTION public.cfop_delete_original_base() FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.cfop_delete_original_base() TO authenticated;

NOTIFY pgrst,'reload schema';
COMMIT;
