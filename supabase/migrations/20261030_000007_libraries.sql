-- Biblioteca por versões: identidade fixa, publicação aprovada e cache offline no cliente.
-- Executar após o SQL completo de instalação do CFOP Studio.
BEGIN;

CREATE TABLE IF NOT EXISTS public.cfop_case_catalog (
 case_id text PRIMARY KEY,
 stage text NOT NULL CHECK (stage IN ('f2l','oll','pll')),
 ordinal integer NOT NULL CHECK (ordinal BETWEEN 1 AND 57),
 case_name text NOT NULL CHECK (char_length(case_name) BETWEEN 1 AND 80),
 UNIQUE(stage,ordinal),
 CHECK(case_id=upper(stage)||'-'||lpad(ordinal::text,2,'0'))
);
-- Casos imutáveis; apenas a instalação por SQL privilegiado altera este cadastro.
INSERT INTO public.cfop_case_catalog(case_id,stage,ordinal,case_name)
SELECT 'F2L-'||lpad(n::text,2,'0'),'f2l',n,'F2L '||lpad(n::text,2,'0')
FROM generate_series(1,41) n
ON CONFLICT DO NOTHING;
INSERT INTO public.cfop_case_catalog(case_id,stage,ordinal,case_name)
SELECT 'OLL-'||lpad(n::text,2,'0'),'oll',n,
 CASE n WHEN 1 THEN 'Sune' WHEN 2 THEN 'Anti-Sune' WHEN 3 THEN 'H'
 WHEN 4 THEN 'Pi' WHEN 5 THEN 'T' WHEN 6 THEN 'L' WHEN 7 THEN 'U'
 ELSE 'OLL '||lpad(n::text,2,'0') END
FROM generate_series(1,57) n
ON CONFLICT DO NOTHING;
INSERT INTO public.cfop_case_catalog(case_id,stage,ordinal,case_name)
SELECT 'PLL-'||lpad(x.ord::text,2,'0'),'pll',x.ord,x.name
FROM unnest(ARRAY['Ua','Ub','H','Z','Aa','Ab','E','Ra','Rb','Ja','Jb','T','F','V','Y','Na','Nb','Ga','Gb','Gc','Gd']) WITH ORDINALITY AS x(name,ord)
ON CONFLICT DO NOTHING;

CREATE TABLE IF NOT EXISTS public.cfop_libraries (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 title text NOT NULL CHECK (char_length(trim(title)) BETWEEN 2 AND 90),
 description text NOT NULL DEFAULT '' CHECK (char_length(description)<=500),
 is_public boolean NOT NULL DEFAULT false,
 created_by uuid NOT NULL REFERENCES auth.users(id),
 created_at timestamptz NOT NULL DEFAULT now(),
 updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS public.cfop_library_cases (
 library_id uuid NOT NULL REFERENCES public.cfop_libraries(id) ON DELETE CASCADE,
 case_id text NOT NULL REFERENCES public.cfop_case_catalog(case_id),
 algorithm text NOT NULL DEFAULT '' CHECK (char_length(algorithm)<=1800),
 setup text NOT NULL DEFAULT '' CHECK (char_length(setup)<=1800),
 orientation text NOT NULL DEFAULT '' CHECK (char_length(orientation)<=160),
 image_data text CHECK (image_data IS NULL OR (char_length(image_data)<=650000 AND image_data ~ '^data:image/(webp|png|jpeg);base64,')),
 status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','approved','rejected')),
 source_page integer CHECK (source_page IS NULL OR source_page>0),
 updated_at timestamptz NOT NULL DEFAULT now(),
 PRIMARY KEY(library_id,case_id),
 CONSTRAINT cfop_approved_case_algorithm CHECK(status<>'approved' OR char_length(trim(algorithm))>0)
);
CREATE INDEX IF NOT EXISTS cfop_library_cases_status_idx ON public.cfop_library_cases(library_id,status);
CREATE INDEX IF NOT EXISTS cfop_libraries_public_idx ON public.cfop_libraries(is_public,updated_at DESC);

ALTER TABLE public.cfop_case_catalog ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cfop_libraries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cfop_library_cases ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.cfop_case_catalog,public.cfop_libraries,public.cfop_library_cases FROM anon,authenticated;
GRANT SELECT ON public.cfop_case_catalog TO anon,authenticated;
GRANT SELECT ON public.cfop_libraries TO anon,authenticated;
GRANT SELECT ON public.cfop_library_cases TO anon,authenticated;
GRANT INSERT,UPDATE,DELETE ON public.cfop_libraries,public.cfop_library_cases TO authenticated;
DROP POLICY IF EXISTS cfop_catalog_read ON public.cfop_case_catalog;
CREATE POLICY cfop_catalog_read ON public.cfop_case_catalog FOR SELECT TO anon,authenticated USING(true);

DROP POLICY IF EXISTS cfop_libraries_read ON public.cfop_libraries;
CREATE POLICY cfop_libraries_read ON public.cfop_libraries FOR SELECT TO anon,authenticated
USING (is_public OR (CASE WHEN (SELECT auth.uid()) IS NULL THEN false ELSE (SELECT public.cfop_is_owner(auth.uid())) END));
DROP POLICY IF EXISTS cfop_libraries_write ON public.cfop_libraries;
CREATE POLICY cfop_libraries_write ON public.cfop_libraries FOR ALL TO authenticated
USING ((SELECT public.cfop_is_owner(auth.uid())) AND (SELECT public.cfop_user_allowed(auth.uid())))
WITH CHECK (created_by=(SELECT auth.uid()) AND (SELECT public.cfop_is_owner(auth.uid())) AND (SELECT public.cfop_user_allowed(auth.uid())));
DROP POLICY IF EXISTS cfop_library_cases_read ON public.cfop_library_cases;
CREATE POLICY cfop_library_cases_read ON public.cfop_library_cases FOR SELECT TO anon,authenticated
USING (
 (CASE WHEN (SELECT auth.uid()) IS NULL THEN false ELSE (SELECT public.cfop_is_owner(auth.uid())) END)
 OR (status='approved' AND EXISTS(
  SELECT 1 FROM public.cfop_libraries l WHERE l.id=library_id AND l.is_public
 ))
);
DROP POLICY IF EXISTS cfop_library_cases_write ON public.cfop_library_cases;
CREATE POLICY cfop_library_cases_write ON public.cfop_library_cases FOR ALL TO authenticated
USING ((SELECT public.cfop_is_owner(auth.uid())) AND (SELECT public.cfop_user_allowed(auth.uid())))
WITH CHECK ((SELECT public.cfop_is_owner(auth.uid())) AND (SELECT public.cfop_user_allowed(auth.uid())));

-- Nunca troque a chave do caso: ela vincula permanentemente sua identidade entre bibliotecas.
CREATE OR REPLACE FUNCTION public.cfop_library_case_guard()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=''
AS $$
BEGIN
 IF TG_OP='UPDATE' AND (NEW.case_id<>OLD.case_id OR NEW.library_id<>OLD.library_id) THEN
  RAISE EXCEPTION 'Identidade do caso é imutável';
 END IF;
 IF TG_OP<>'DELETE' THEN NEW.updated_at=now(); RETURN NEW; END IF;
 RETURN OLD;
END;
$$;
REVOKE ALL ON FUNCTION public.cfop_library_case_guard() FROM public,anon,authenticated;
DROP TRIGGER IF EXISTS cfop_library_case_guard ON public.cfop_library_cases;
CREATE TRIGGER cfop_library_case_guard BEFORE UPDATE ON public.cfop_library_cases
FOR EACH ROW EXECUTE FUNCTION public.cfop_library_case_guard();

-- Impedir publicação de biblioteca vazia; edição de item já aprovado é imediatamente pública.
CREATE OR REPLACE FUNCTION public.cfop_library_publication_guard()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=''
AS $$
BEGIN
 IF NEW.is_public AND NOT EXISTS(
  SELECT 1 FROM public.cfop_library_cases c
  WHERE c.library_id=NEW.id AND c.status='approved'
 ) THEN RAISE EXCEPTION 'Aprove ao menos um caso antes de publicar a biblioteca'; END IF;
 NEW.updated_at=now();RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.cfop_library_publication_guard() FROM public,anon,authenticated;
DROP TRIGGER IF EXISTS cfop_library_publication_guard ON public.cfop_libraries;
CREATE TRIGGER cfop_library_publication_guard BEFORE INSERT OR UPDATE ON public.cfop_libraries
FOR EACH ROW EXECUTE FUNCTION public.cfop_library_publication_guard();


-- Rascunhos ficam separados da versão pública até o fundador publicar.
CREATE TABLE IF NOT EXISTS public.cfop_library_case_drafts (
 library_id uuid NOT NULL REFERENCES public.cfop_libraries(id) ON DELETE CASCADE,
 case_id text NOT NULL REFERENCES public.cfop_case_catalog(case_id),
 algorithm text NOT NULL DEFAULT '' CHECK (char_length(algorithm)<=1800),
 setup text NOT NULL DEFAULT '' CHECK (char_length(setup)<=1800),
 orientation text NOT NULL DEFAULT '' CHECK (char_length(orientation)<=160),
 image_data text CHECK (image_data IS NULL OR (char_length(image_data)<=650000 AND image_data ~ '^data:image/(webp|png|jpeg);base64,')),
 status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','approved','rejected')),
 source_page integer CHECK (source_page IS NULL OR source_page>0),
 updated_at timestamptz NOT NULL DEFAULT now(),
 PRIMARY KEY(library_id,case_id)
);
ALTER TABLE public.cfop_library_case_drafts ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.cfop_library_case_drafts FROM anon,authenticated;
GRANT SELECT,INSERT,UPDATE,DELETE ON public.cfop_library_case_drafts TO authenticated;
DROP POLICY IF EXISTS cfop_library_drafts_owner ON public.cfop_library_case_drafts;
CREATE POLICY cfop_library_drafts_owner ON public.cfop_library_case_drafts
FOR ALL TO authenticated
USING ((SELECT public.cfop_is_owner(auth.uid())) AND (SELECT public.cfop_user_allowed(auth.uid())))
WITH CHECK ((SELECT public.cfop_is_owner(auth.uid())) AND (SELECT public.cfop_user_allowed(auth.uid())));

CREATE OR REPLACE FUNCTION public.cfop_publish_library(p_library uuid)
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path=''
AS $
DECLARE
 v_actor uuid:=auth.uid();
 v_count integer:=0;
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
 (library_id,case_id,algorithm,setup,orientation,image_data,status,source_page,updated_at)
 SELECT library_id,case_id,algorithm,setup,orientation,image_data,'approved',source_page,now()
 FROM public.cfop_library_case_drafts
 WHERE library_id=p_library AND status='approved' AND char_length(trim(algorithm))>0
 ON CONFLICT(library_id,case_id) DO UPDATE SET
  algorithm=excluded.algorithm,setup=excluded.setup,
  orientation=excluded.orientation,image_data=excluded.image_data,
  status='approved',source_page=excluded.source_page,updated_at=now();
 UPDATE public.cfop_libraries SET is_public=true,updated_at=now() WHERE id=p_library;
 INSERT INTO public.cfop_admin_audit(actor_id,target_id,action,detail)
 VALUES(v_actor,v_actor,'publish_library',jsonb_build_object('library',p_library,'cases',v_count));
 RETURN v_count;
END;
$;
REVOKE ALL ON FUNCTION public.cfop_publish_library(uuid) FROM public,anon;
GRANT EXECUTE ON FUNCTION public.cfop_publish_library(uuid) TO authenticated;

NOTIFY pgrst, 'reload schema';
COMMIT;
SELECT stage,count(*) AS casos_fixos FROM public.cfop_case_catalog GROUP BY stage ORDER BY stage;
