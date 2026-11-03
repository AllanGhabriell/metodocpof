-- Academia CFOP: versões editáveis da base Original, sem modificar os dados-fonte.
-- Executar após as migrações de bibliotecas e da base privada.
-- Esta migração preserva casos originais, usuários, tempos, XP e bibliotecas.
BEGIN;

CREATE TABLE IF NOT EXISTS public.cfop_original_case_overrides (
  case_id text PRIMARY KEY REFERENCES public.cfop_original_base_cases(case_id) ON DELETE CASCADE,
  draft jsonb NOT NULL,
  published jsonb,
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid REFERENCES auth.users(id),
  CONSTRAINT cfop_original_override_draft_format CHECK (
    jsonb_typeof(draft)='object'
    AND draft->>'status' IN ('draft','approved','rejected')
    AND char_length(coalesce(draft->>'algorithm','')) BETWEEN 1 AND 3000
    AND char_length(coalesce(draft->>'setup','')) <= 3000
    AND char_length(coalesce(draft->>'orientation','')) <= 160
    AND char_length(draft::text) <= 1450000
    AND (draft->>'imageData' IS NULL OR
      (char_length(draft->>'imageData') <= 650000
       AND draft->>'imageData' ~ '^data:image/(png|jpeg|webp);base64,'))
    AND (draft->>'imageOriginal' IS NULL OR
      (char_length(draft->>'imageOriginal') <= 650000
       AND draft->>'imageOriginal' ~ '^data:image/(png|jpeg|webp);base64,'))
  ),
  CONSTRAINT cfop_original_override_published_format CHECK (
    published IS NULL OR
    (jsonb_typeof(published)='object'
     AND char_length(coalesce(published->>'algorithm','')) BETWEEN 1 AND 3000
     AND char_length(coalesce(published->>'setup','')) <= 3000
     AND char_length(coalesce(published->>'orientation','')) <= 160
     AND char_length(published::text) <= 1450000
     AND (published->>'imageData' IS NULL OR
      (char_length(published->>'imageData') <= 650000
       AND published->>'imageData' ~ '^data:image/(png|jpeg|webp);base64,'))
     AND (published->>'imageOriginal' IS NULL OR
      (char_length(published->>'imageOriginal') <= 650000
       AND published->>'imageOriginal' ~ '^data:image/(png|jpeg|webp);base64,'))
    )
  )
);
ALTER TABLE public.cfop_original_case_overrides ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.cfop_original_case_overrides FROM PUBLIC,anon,authenticated;
GRANT SELECT,INSERT,UPDATE ON public.cfop_original_case_overrides TO authenticated;

DROP POLICY IF EXISTS cfop_original_override_owner_read ON public.cfop_original_case_overrides;
CREATE POLICY cfop_original_override_owner_read ON public.cfop_original_case_overrides
 FOR SELECT TO authenticated
 USING ((SELECT public.cfop_is_owner(auth.uid()))
   AND (SELECT public.cfop_user_allowed(auth.uid())));

DROP POLICY IF EXISTS cfop_original_override_owner_insert ON public.cfop_original_case_overrides;
CREATE POLICY cfop_original_override_owner_insert ON public.cfop_original_case_overrides
 FOR INSERT TO authenticated
 WITH CHECK ((SELECT public.cfop_is_owner(auth.uid()))
   AND (SELECT public.cfop_user_allowed(auth.uid())));

DROP POLICY IF EXISTS cfop_original_override_owner_update ON public.cfop_original_case_overrides;
CREATE POLICY cfop_original_override_owner_update ON public.cfop_original_case_overrides
 FOR UPDATE TO authenticated
 USING ((SELECT public.cfop_is_owner(auth.uid()))
   AND (SELECT public.cfop_user_allowed(auth.uid())))
 WITH CHECK ((SELECT public.cfop_is_owner(auth.uid()))
   AND (SELECT public.cfop_user_allowed(auth.uid())));

-- Devolve a versão publicada, sem divulgar rascunhos ou imagens-fonte.
-- Visitantes só podem ler a etapa quando Original é a base principal.
CREATE OR REPLACE FUNCTION public.cfop_original_cases_for_stage(p_stage text)
RETURNS TABLE(case_id text,details jsonb)
LANGUAGE plpgsql SECURITY DEFINER SET search_path=''
AS $$
DECLARE
 v_actor uuid:=auth.uid();
 v_owner boolean:=false;
BEGIN
 IF p_stage NOT IN ('f2l','pll') THEN RETURN; END IF;
 IF NOT EXISTS (
  SELECT 1 FROM public.cfop_original_base_control
  WHERE singleton=true AND deleted_at IS NULL
 ) THEN RETURN; END IF;
 IF v_actor IS NOT NULL THEN
  v_owner:=public.cfop_is_owner(v_actor) AND public.cfop_user_allowed(v_actor);
 END IF;
 IF NOT v_owner AND NOT EXISTS (
  SELECT 1 FROM public.cfop_stage_defaults
  WHERE stage=p_stage AND source='original'
 ) THEN RETURN; END IF;
 RETURN QUERY
 SELECT b.case_id,
   b.details || (coalesce(o.published,'{}'::jsonb) - 'status' - 'imageOriginal')
 FROM public.cfop_original_base_cases b
 LEFT JOIN public.cfop_original_case_overrides o ON o.case_id=b.case_id
 JOIN public.cfop_case_catalog cc ON cc.case_id=b.case_id
 WHERE cc.stage=p_stage
 ORDER BY b.case_id;
END;
$$;
REVOKE ALL ON FUNCTION public.cfop_original_cases_for_stage(text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.cfop_original_cases_for_stage(text) TO anon,authenticated;

-- A aprovação do editor não publica automaticamente. A operação é explícita.
CREATE OR REPLACE FUNCTION public.cfop_publish_original_overrides(p_case_ids text[])
RETURNS integer
LANGUAGE plpgsql SECURITY DEFINER SET search_path=''
AS $$
DECLARE
 v_actor uuid:=auth.uid();
 v_id text;
 v_count integer:=0;
BEGIN
 IF v_actor IS NULL OR NOT public.cfop_is_owner(v_actor)
    OR NOT public.cfop_user_allowed(v_actor) THEN
  RAISE EXCEPTION 'Somente o fundador pode publicar edições da base original';
 END IF;
 IF p_case_ids IS NULL OR cardinality(p_case_ids) NOT BETWEEN 1 AND 119 THEN
  RAISE EXCEPTION 'Escolha entre 1 e 119 casos para publicar';
 END IF;
 IF NOT EXISTS (
  SELECT 1 FROM public.cfop_original_base_control
  WHERE singleton=true AND deleted_at IS NULL
 ) THEN RAISE EXCEPTION 'Base Original indisponível'; END IF;
 FOREACH v_id IN ARRAY p_case_ids LOOP
  IF NOT EXISTS (
   SELECT 1 FROM public.cfop_original_case_overrides o
   JOIN public.cfop_original_base_cases b ON b.case_id=o.case_id
   WHERE o.case_id=v_id AND o.draft->>'status'='approved'
  ) THEN RAISE EXCEPTION 'Caso % sem edição aprovada',v_id; END IF;
 END LOOP;
 UPDATE public.cfop_original_case_overrides o
 SET published=(o.draft - 'status'),updated_at=now(),updated_by=v_actor
 WHERE o.case_id=ANY(p_case_ids)
   AND o.draft->>'status'='approved';
 GET DIAGNOSTICS v_count=ROW_COUNT;
 INSERT INTO public.cfop_admin_audit(actor_id,target_id,action,detail)
 VALUES(v_actor,v_actor,'publish_original_overrides',
        jsonb_build_object('cases',p_case_ids,'count',v_count));
 RETURN v_count;
END;
$$;
REVOKE ALL ON FUNCTION public.cfop_publish_original_overrides(text[]) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.cfop_publish_original_overrides(text[]) TO authenticated;

-- Restaurar elimina somente a edição; a fonte original permanece intocada.
CREATE OR REPLACE FUNCTION public.cfop_restore_original_case(p_case_id text)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path=''
AS $$
DECLARE v_actor uuid:=auth.uid();v_count integer;
BEGIN
 IF v_actor IS NULL OR NOT public.cfop_is_owner(v_actor)
  OR NOT public.cfop_user_allowed(v_actor) THEN
  RAISE EXCEPTION 'Somente o fundador pode restaurar casos originais';
 END IF;
 DELETE FROM public.cfop_original_case_overrides WHERE case_id=p_case_id;
 GET DIAGNOSTICS v_count=ROW_COUNT;
 INSERT INTO public.cfop_admin_audit(actor_id,target_id,action,detail)
 VALUES(v_actor,v_actor,'restore_original_case',
        jsonb_build_object('case_id',p_case_id,'restored',v_count>0));
 RETURN v_count>0;
END;
$$;
REVOKE ALL ON FUNCTION public.cfop_restore_original_case(text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.cfop_restore_original_case(text) TO authenticated;

NOTIFY pgrst,'reload schema';
COMMIT;
