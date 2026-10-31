-- Academia CPOF — reparo definitivo da leitura pública, inclusive SEM LOGIN.
-- Cole TUDO no Supabase SQL Editor e execute UMA vez.
-- Não altera, publica, deleta ou renomeia casos/bibliotecas.
-- Substitui apenas as políticas de acesso às duas tabelas de bibliotecas.
BEGIN;

ALTER TABLE public.cfop_libraries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cfop_library_cases ENABLE ROW LEVEL SECURITY;

GRANT SELECT ON public.cfop_case_catalog TO anon, authenticated;
GRANT SELECT ON public.cfop_libraries,public.cfop_library_cases TO anon,authenticated;
GRANT INSERT,UPDATE,DELETE ON public.cfop_libraries,public.cfop_library_cases TO authenticated;

-- A função de verificar o administrador continua PROIBIDA a visitantes anônimos.
-- Somente contas autenticadas a executam; o resultado não concede permissão.
REVOKE EXECUTE ON FUNCTION public.cfop_is_owner(uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.cfop_is_owner(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.cfop_user_allowed(uuid) TO authenticated;

-- Elimina políticas históricas FOR ALL/SELECT que acabavam executando
-- cfop_is_owner no contexto de visitantes. Mantém a segurança substituindo
-- todas as políticas destas duas tabelas por regras explícitas.
DO $policies$
DECLARE item record;
BEGIN
 FOR item IN SELECT policyname FROM pg_policies
    WHERE schemaname='public' AND tablename='cfop_libraries'
 LOOP
  EXECUTE format('DROP POLICY IF EXISTS %I ON public.cfop_libraries',item.policyname);
 END LOOP;
 FOR item IN SELECT policyname FROM pg_policies
    WHERE schemaname='public' AND tablename='cfop_library_cases'
 LOOP
  EXECUTE format('DROP POLICY IF EXISTS %I ON public.cfop_library_cases',item.policyname);
 END LOOP;
END;
$policies$;

-- Leituras ANÔNIMAS — sem chamadas a funções administrativas.
CREATE POLICY cfop_libraries_visible_to_everyone
ON public.cfop_libraries FOR SELECT TO anon,authenticated
USING (is_public = true);

CREATE POLICY cfop_library_cases_visible_to_everyone
ON public.cfop_library_cases FOR SELECT TO anon,authenticated
USING (
 status='approved'
 AND EXISTS (
  SELECT 1 FROM public.cfop_libraries l
  WHERE l.id=library_id AND l.is_public=true
 )
);

-- Leitura privada de rascunhos SOMENTE pelo fundador autenticado.
CREATE POLICY cfop_libraries_founder_read
ON public.cfop_libraries FOR SELECT TO authenticated
USING ((SELECT auth.uid()) IS NOT NULL AND (SELECT public.cfop_is_owner(auth.uid())));

CREATE POLICY cfop_library_cases_founder_read
ON public.cfop_library_cases FOR SELECT TO authenticated
USING ((SELECT auth.uid()) IS NOT NULL AND (SELECT public.cfop_is_owner(auth.uid())));

-- Escrita SOMENTE pelo fundador (as permissões antigas FOR ALL deixam
-- de interferir nas consultas de visitantes).
CREATE POLICY cfop_libraries_founder_insert
ON public.cfop_libraries FOR INSERT TO authenticated
WITH CHECK (
 created_by=(SELECT auth.uid())
 AND (SELECT public.cfop_is_owner(auth.uid()))
 AND (SELECT public.cfop_user_allowed(auth.uid()))
);
CREATE POLICY cfop_libraries_founder_update
ON public.cfop_libraries FOR UPDATE TO authenticated
USING (
 (SELECT public.cfop_is_owner(auth.uid()))
 AND (SELECT public.cfop_user_allowed(auth.uid()))
)
WITH CHECK (
 created_by=(SELECT auth.uid())
 AND (SELECT public.cfop_is_owner(auth.uid()))
 AND (SELECT public.cfop_user_allowed(auth.uid()))
);
CREATE POLICY cfop_libraries_founder_delete
ON public.cfop_libraries FOR DELETE TO authenticated
USING (
 (SELECT public.cfop_is_owner(auth.uid()))
 AND (SELECT public.cfop_user_allowed(auth.uid()))
);

CREATE POLICY cfop_library_cases_founder_insert
ON public.cfop_library_cases FOR INSERT TO authenticated
WITH CHECK (
 (SELECT public.cfop_is_owner(auth.uid()))
 AND (SELECT public.cfop_user_allowed(auth.uid()))
);
CREATE POLICY cfop_library_cases_founder_update
ON public.cfop_library_cases FOR UPDATE TO authenticated
USING (
 (SELECT public.cfop_is_owner(auth.uid()))
 AND (SELECT public.cfop_user_allowed(auth.uid()))
)
WITH CHECK (
 (SELECT public.cfop_is_owner(auth.uid()))
 AND (SELECT public.cfop_user_allowed(auth.uid()))
);
CREATE POLICY cfop_library_cases_founder_delete
ON public.cfop_library_cases FOR DELETE TO authenticated
USING (
 (SELECT public.cfop_is_owner(auth.uid()))
 AND (SELECT public.cfop_user_allowed(auth.uid()))
);

-- Teste dentro da transação como role ANON, antes de confirmar as mudanças.
-- Se alguma consulta ainda exigir cfop_is_owner, a execução aborta e
-- nenhuma política nova fica aplicada pela metade.
SET LOCAL ROLE anon;
SELECT count(*) AS bibliotecas_visiveis_sem_login FROM public.cfop_libraries;
SELECT count(*) AS casos_visiveis_sem_login FROM public.cfop_library_cases;
RESET ROLE;
NOTIFY pgrst, 'reload schema';
COMMIT;

-- Diagnóstico para o administrador: publicadas ≠ rascunhos.
SELECT l.title AS biblioteca,
 CASE WHEN l.is_public THEN 'PUBLICADA' ELSE 'RASCUNHO' END AS situacao,
 count(c.case_id) FILTER (WHERE cat.stage='f2l') AS f2l,
 count(c.case_id) FILTER (WHERE cat.stage='oll') AS oll,
 count(c.case_id) FILTER (WHERE cat.stage='pll') AS pll
FROM public.cfop_libraries l
LEFT JOIN public.cfop_library_cases c ON c.library_id=l.id AND c.status='approved'
LEFT JOIN public.cfop_case_catalog cat ON cat.case_id=c.case_id
GROUP BY l.id,l.title,l.is_public
ORDER BY l.title;
