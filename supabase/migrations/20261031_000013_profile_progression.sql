-- Academia CFOP | perfil, itens cosméticos e patente exclusiva do fundador.
-- Aplique somente depois das migrações 000001..000012. Faça backup do banco.
BEGIN;
CREATE TABLE IF NOT EXISTS public.cfop_reward_catalog(
 id text PRIMARY KEY CHECK (id ~ '^[a-z0-9][a-z0-9_-]{2,47}$'),
 kind text NOT NULL CHECK (kind IN ('title','frame','name','background','aura','badge','card')),
 title text NOT NULL CHECK (char_length(title) BETWEEN 3 AND 65),
 style_key text NOT NULL CHECK (style_key ~ '^[a-z0-9_-]{3,48}$'),
 min_level integer NOT NULL DEFAULT 1 CHECK (min_level BETWEEN 1 AND 500),
 active boolean NOT NULL DEFAULT true,
 created_at timestamptz NOT NULL DEFAULT now(),
 updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.cfop_reward_catalog ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.cfop_reward_catalog FROM PUBLIC,anon,authenticated;
GRANT SELECT ON public.cfop_reward_catalog TO authenticated;
DROP POLICY IF EXISTS cfop_reward_catalog_read ON public.cfop_reward_catalog;
CREATE POLICY cfop_reward_catalog_read ON public.cfop_reward_catalog
 FOR SELECT TO authenticated USING(active=true);

CREATE TABLE IF NOT EXISTS public.cfop_user_journey(
 user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
 answers jsonb NOT NULL DEFAULT '{}'::jsonb CHECK(jsonb_typeof(answers)='object' AND pg_column_size(answers)<=5000),
 equipped jsonb NOT NULL DEFAULT '{}'::jsonb CHECK(jsonb_typeof(equipped)='object' AND pg_column_size(equipped)<=1500),
 focus text NOT NULL DEFAULT 'free' CHECK(focus IN ('free','cross','f2l','oll','pll','all')),
 updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.cfop_user_journey ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.cfop_user_journey FROM PUBLIC,anon,authenticated;
GRANT SELECT,INSERT,UPDATE ON public.cfop_user_journey TO authenticated;
DROP POLICY IF EXISTS cfop_journey_own_read ON public.cfop_user_journey;
CREATE POLICY cfop_journey_own_read ON public.cfop_user_journey FOR SELECT TO authenticated
 USING(user_id=(SELECT auth.uid()));
DROP POLICY IF EXISTS cfop_journey_own_insert ON public.cfop_user_journey;
CREATE POLICY cfop_journey_own_insert ON public.cfop_user_journey FOR INSERT TO authenticated
 WITH CHECK(user_id=(SELECT auth.uid()) AND public.cfop_user_allowed(user_id));
DROP POLICY IF EXISTS cfop_journey_own_update ON public.cfop_user_journey;
CREATE POLICY cfop_journey_own_update ON public.cfop_user_journey FOR UPDATE TO authenticated
 USING(user_id=(SELECT auth.uid()))
 WITH CHECK(user_id=(SELECT auth.uid()) AND public.cfop_user_allowed(user_id));

-- Não se basear em email vindo do cliente ou em user_metadata: fundador é
-- identificado pela função de autorização previamente protegida.
CREATE OR REPLACE FUNCTION public.cfop_my_creator_status()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=''
AS $$
 SELECT auth.uid() IS NOT NULL AND public.cfop_is_owner(auth.uid());
$$;
REVOKE ALL ON FUNCTION public.cfop_my_creator_status() FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.cfop_my_creator_status() TO authenticated;

-- Operação privilegiada explícita, sem escrita REST direta no catálogo.
CREATE OR REPLACE FUNCTION public.cfop_admin_reward_save(
 p_id text,p_kind text,p_title text,p_style text,p_level integer,p_active boolean DEFAULT true
) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=''
AS $$
DECLARE v_actor uuid:=auth.uid();
BEGIN
 IF v_actor IS NULL OR NOT public.cfop_is_admin(v_actor) OR NOT public.cfop_user_allowed(v_actor) THEN
  RAISE EXCEPTION 'Acesso restrito aos administradores';
 END IF;
 IF p_id IS NULL OR p_id !~ '^[a-z0-9][a-z0-9_-]{2,47}$'
  OR p_kind NOT IN ('title','frame','name','background','aura','badge','card')
  OR length(trim(coalesce(p_title,''))) NOT BETWEEN 3 AND 65
  OR p_style IS NULL OR p_style !~ '^[a-z0-9_-]{3,48}$'
  OR p_level NOT BETWEEN 1 AND 500 THEN
  RAISE EXCEPTION 'Item inválido';
 END IF;
 -- Identidade do fundador não é um cosmético editável ou concedível a outros.
 IF p_id IN ('creator','deus-criador','founder') OR p_style IN ('creator','founder') THEN
  RAISE EXCEPTION 'Identidade exclusiva do criador';
 END IF;
 INSERT INTO public.cfop_reward_catalog(id,kind,title,style_key,min_level,active)
 VALUES(p_id,p_kind,trim(p_title),p_style,p_level,coalesce(p_active,true))
 ON CONFLICT(id) DO UPDATE SET kind=EXCLUDED.kind,title=EXCLUDED.title,
 style_key=EXCLUDED.style_key,min_level=EXCLUDED.min_level,active=EXCLUDED.active,updated_at=now();
 INSERT INTO public.cfop_admin_audit(actor_id,target_id,action,detail)
 VALUES(v_actor,v_actor,'reward_catalog',pg_catalog.jsonb_build_object('id',p_id,'kind',p_kind,'min_level',p_level,'active',p_active));
END;
$$;
REVOKE ALL ON FUNCTION public.cfop_admin_reward_save(text,text,text,text,integer,boolean) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.cfop_admin_reward_save(text,text,text,text,integer,boolean) TO authenticated;
NOTIFY pgrst,'reload schema';
COMMIT;
