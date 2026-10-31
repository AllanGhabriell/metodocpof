BEGIN;
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
COMMIT;
