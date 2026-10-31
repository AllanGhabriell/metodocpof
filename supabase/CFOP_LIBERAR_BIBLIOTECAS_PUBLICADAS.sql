-- Academia CPOF: tornar visíveis apenas as bibliotecas publicadas
-- e seus casos aprovados (F2L, OLL e PLL). Mantém rascunhos privados.
-- Pode ser executado mais de uma vez. Não publica nem exclui casos.
BEGIN;

ALTER TABLE public.cfop_libraries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cfop_library_cases ENABLE ROW LEVEL SECURITY;
GRANT SELECT ON public.cfop_libraries TO anon, authenticated;
GRANT SELECT ON public.cfop_library_cases TO anon, authenticated;

-- Leitura anônima sem depender da função de administrador.
DROP POLICY IF EXISTS cfop_libraries_read ON public.cfop_libraries;
DROP POLICY IF EXISTS cfop_libraries_public_select ON public.cfop_libraries;
CREATE POLICY cfop_libraries_public_select ON public.cfop_libraries
 FOR SELECT TO anon,authenticated USING (is_public = true);

DROP POLICY IF EXISTS cfop_libraries_owner_select ON public.cfop_libraries;
CREATE POLICY cfop_libraries_owner_select ON public.cfop_libraries
 FOR SELECT TO authenticated
 USING ((SELECT auth.uid()) IS NOT NULL AND (SELECT public.cfop_is_owner(auth.uid())));

DROP POLICY IF EXISTS cfop_library_cases_read ON public.cfop_library_cases;
DROP POLICY IF EXISTS cfop_library_cases_public_select ON public.cfop_library_cases;
CREATE POLICY cfop_library_cases_public_select ON public.cfop_library_cases
 FOR SELECT TO anon,authenticated
 USING (
  status='approved'
  AND EXISTS(
   SELECT 1 FROM public.cfop_libraries l
   WHERE l.id=library_id AND l.is_public=true
  )
 );

DROP POLICY IF EXISTS cfop_library_cases_owner_select ON public.cfop_library_cases;
CREATE POLICY cfop_library_cases_owner_select ON public.cfop_library_cases
 FOR SELECT TO authenticated
 USING ((SELECT auth.uid()) IS NOT NULL AND (SELECT public.cfop_is_owner(auth.uid())));

NOTIFY pgrst, 'reload schema';
COMMIT;

-- Diagnóstico: veja quais bibliotecas realmente estão publicadas.
-- A configuração da biblioteca principal, isoladamente, não publica casos.
SELECT l.title AS biblioteca,
       CASE WHEN l.is_public THEN 'PUBLICADA' ELSE 'RASCUNHO' END AS situacao,
       count(c.case_id) FILTER (WHERE cat.stage='f2l') AS f2l_aprovados,
       count(c.case_id) FILTER (WHERE cat.stage='oll') AS oll_aprovados,
       count(c.case_id) FILTER (WHERE cat.stage='pll') AS pll_aprovados
FROM public.cfop_libraries l
LEFT JOIN public.cfop_library_cases c
 ON c.library_id=l.id AND c.status='approved'
LEFT JOIN public.cfop_case_catalog cat ON cat.case_id=c.case_id
GROUP BY l.id,l.title,l.is_public
ORDER BY l.title;
