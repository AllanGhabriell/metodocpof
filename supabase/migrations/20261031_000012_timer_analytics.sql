-- Academia CFOP — métrica agregada por dia e modalidade, protegida por RLS.
-- Pré-requisitos: migrações anteriores com cfop_is_admin/cfop_user_allowed.
-- Não armazena embaralhamentos, comentários, tempos individuais, tokens ou localização.
BEGIN;
CREATE TABLE IF NOT EXISTS public.cfop_timer_daily(
 user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
 day date NOT NULL,
 mode text NOT NULL CHECK (mode IN ('3x3','cross1','cross2','cross3','cross4')),
 attempts integer NOT NULL DEFAULT 0 CHECK (attempts BETWEEN 0 AND 100000),
 correct integer NOT NULL DEFAULT 0 CHECK (correct BETWEEN 0 AND 100000),
 time_sum_ms bigint NOT NULL DEFAULT 0 CHECK (time_sum_ms>=0),
 best_ms integer CHECK (best_ms>=0),
 last_at timestamptz NOT NULL DEFAULT now(),
 PRIMARY KEY(user_id,day,mode)
);
CREATE INDEX IF NOT EXISTS cfop_timer_daily_activity_idx ON public.cfop_timer_daily(day DESC,mode);
ALTER TABLE public.cfop_timer_daily ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.cfop_timer_daily FROM PUBLIC,anon,authenticated;
GRANT SELECT ON public.cfop_timer_daily TO authenticated;
DROP POLICY IF EXISTS cfop_timer_own_summary ON public.cfop_timer_daily;
CREATE POLICY cfop_timer_own_summary ON public.cfop_timer_daily FOR SELECT TO authenticated
USING(user_id=(SELECT auth.uid()));
-- Admin lê métricas somente via RPC; acesso direto a todos os registros fica bloqueado.
CREATE OR REPLACE FUNCTION public.cfop_record_timer_solve(p_mode text,p_ms integer,p_correct boolean)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path=''
AS $$
DECLARE v_uid uuid:=auth.uid();v_day date:=(now() AT TIME ZONE 'America/Fortaleza')::date;
BEGIN
 IF v_uid IS NULL OR NOT public.cfop_user_allowed(v_uid) THEN RETURN false; END IF;
 IF p_mode NOT IN ('3x3','cross1','cross2','cross3','cross4') OR p_ms IS NULL OR p_ms<1000 OR p_ms>3600000 THEN RETURN false;END IF;
 INSERT INTO public.cfop_timer_daily(user_id,day,mode,attempts,correct,time_sum_ms,best_ms)
 VALUES(v_uid,v_day,p_mode,1,CASE WHEN p_correct THEN 1 ELSE 0 END,
 CASE WHEN p_correct THEN p_ms ELSE 0 END,CASE WHEN p_correct THEN p_ms ELSE NULL END)
 ON CONFLICT(user_id,day,mode) DO UPDATE SET
 attempts=LEAST(public.cfop_timer_daily.attempts+1,100000),
 correct=LEAST(public.cfop_timer_daily.correct+CASE WHEN p_correct THEN 1 ELSE 0 END,100000),
 time_sum_ms=public.cfop_timer_daily.time_sum_ms+CASE WHEN p_correct THEN p_ms ELSE 0 END,
 best_ms=CASE WHEN p_correct THEN LEAST(COALESCE(public.cfop_timer_daily.best_ms,p_ms),p_ms) ELSE public.cfop_timer_daily.best_ms END,
 last_at=now();
 RETURN true;
END;
$$;
REVOKE ALL ON FUNCTION public.cfop_record_timer_solve(text,integer,boolean) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.cfop_record_timer_solve(text,integer,boolean) TO authenticated;

CREATE OR REPLACE FUNCTION public.cfop_admin_timer_insights(p_days integer DEFAULT 30)
RETURNS TABLE(user_id uuid,mode text,day date,attempts bigint,correct bigint,mean_ms bigint,best_ms integer,last_at timestamptz)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=''
AS $$
BEGIN
 IF NOT public.cfop_is_admin(auth.uid()) THEN RAISE EXCEPTION 'Somente administradores autorizados'; END IF;
 RETURN QUERY SELECT d.user_id,d.mode,d.day,d.attempts::bigint,d.correct::bigint,
 CASE WHEN d.correct>0 THEN (d.time_sum_ms/d.correct)::bigint ELSE NULL::bigint END,
 d.best_ms,d.last_at
 FROM public.cfop_timer_daily d
 WHERE d.day>=(now() AT TIME ZONE 'America/Fortaleza')::date-GREATEST(1,LEAST(p_days,180))
 ORDER BY d.day DESC LIMIT 10000;
END;
$$;
REVOKE ALL ON FUNCTION public.cfop_admin_timer_insights(integer) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.cfop_admin_timer_insights(integer) TO authenticated;
NOTIFY pgrst,'reload schema';
COMMIT;
