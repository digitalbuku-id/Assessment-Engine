-- Migration unit 1: schema_changes
-- Transaction mode: transactional
-- Boundary reason: default

SET check_function_bodies = false;

DROP EXTENSION pg_net;

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT DELETE, INSERT, SELECT, UPDATE ON TABLES TO anon;

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT SELECT, USAGE ON SEQUENCES TO anon;

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON ROUTINES TO anon;

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT DELETE, INSERT, SELECT, UPDATE ON TABLES TO authenticated;

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT SELECT, USAGE ON SEQUENCES TO authenticated;

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON ROUTINES TO authenticated;

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT DELETE, INSERT, SELECT, UPDATE ON TABLES TO service_role;

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT SELECT, USAGE ON SEQUENCES TO service_role;

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON ROUTINES TO service_role;

CREATE FUNCTION public.rls_auto_enable()
  RETURNS event_trigger
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO 'pg_catalog'
  AS $function$
DECLARE
  cmd record;
BEGIN
  FOR cmd IN
    SELECT *
    FROM pg_event_trigger_ddl_commands()
    WHERE command_tag IN ('CREATE TABLE', 'CREATE TABLE AS', 'SELECT INTO')
      AND object_type IN ('table','partitioned table')
  LOOP
     IF cmd.schema_name IS NOT NULL AND cmd.schema_name IN ('public') AND cmd.schema_name NOT IN ('pg_catalog','information_schema') AND cmd.schema_name NOT LIKE 'pg_toast%' AND cmd.schema_name NOT LIKE 'pg_temp%' THEN
      BEGIN
        EXECUTE format('alter table if exists %s enable row level security', cmd.object_identity);
        RAISE LOG 'rls_auto_enable: enabled RLS on %', cmd.object_identity;
      EXCEPTION
        WHEN OTHERS THEN
          RAISE LOG 'rls_auto_enable: failed to enable RLS on %', cmd.object_identity;
      END;
     ELSE
        RAISE LOG 'rls_auto_enable: skip % (either system schema or not in enforced list: %.)', cmd.object_identity, cmd.schema_name;
     END IF;
  END LOOP;
END;
$function$;

GRANT ALL ON FUNCTION public.rls_auto_enable() TO anon;

GRANT ALL ON FUNCTION public.rls_auto_enable() TO authenticated;

GRANT ALL ON FUNCTION public.rls_auto_enable() TO service_role;

ALTER TABLE public.analytics_events
  ENABLE ROW LEVEL SECURITY;

GRANT DELETE, INSERT, SELECT, UPDATE ON public.analytics_events TO anon;

GRANT DELETE, INSERT, SELECT, UPDATE ON public.analytics_events TO authenticated;

GRANT DELETE, INSERT, SELECT, UPDATE ON public.analytics_events TO service_role;

ALTER TABLE public.assessment_feedback
  ENABLE ROW LEVEL SECURITY;

GRANT DELETE, INSERT, SELECT, UPDATE ON public.assessment_feedback TO anon;

GRANT DELETE, INSERT, SELECT, UPDATE ON public.assessment_feedback TO authenticated;

GRANT DELETE, INSERT, SELECT, UPDATE ON public.assessment_feedback TO service_role;

ALTER TABLE public.assessment_reports
  ENABLE ROW LEVEL SECURITY;

GRANT DELETE, INSERT, SELECT, UPDATE ON public.assessment_reports TO anon;

GRANT DELETE, INSERT, SELECT, UPDATE ON public.assessment_reports TO authenticated;

GRANT DELETE, INSERT, SELECT, UPDATE ON public.assessment_reports TO service_role;

ALTER TABLE public.assessment_results
  ENABLE ROW LEVEL SECURITY;

GRANT DELETE, INSERT, SELECT, UPDATE ON public.assessment_results TO anon;

GRANT DELETE, INSERT, SELECT, UPDATE ON public.assessment_results TO authenticated;

GRANT DELETE, INSERT, SELECT, UPDATE ON public.assessment_results TO service_role;

ALTER TABLE public.assessment_sessions
  ENABLE ROW LEVEL SECURITY;

GRANT DELETE, INSERT, SELECT, UPDATE ON public.assessment_sessions TO anon;

GRANT DELETE, INSERT, SELECT, UPDATE ON public.assessment_sessions TO authenticated;

GRANT DELETE, INSERT, SELECT, UPDATE ON public.assessment_sessions TO service_role;

ALTER TABLE public.experiments
  ENABLE ROW LEVEL SECURITY;

GRANT DELETE, INSERT, SELECT, UPDATE ON public.experiments TO anon;

GRANT DELETE, INSERT, SELECT, UPDATE ON public.experiments TO authenticated;

GRANT DELETE, INSERT, SELECT, UPDATE ON public.experiments TO service_role;

ALTER TABLE public.feedback
  ENABLE ROW LEVEL SECURITY;

GRANT DELETE, INSERT, SELECT, UPDATE ON public.feedback TO anon;

GRANT DELETE, INSERT, SELECT, UPDATE ON public.feedback TO authenticated;

GRANT DELETE, INSERT, SELECT, UPDATE ON public.feedback TO service_role;

ALTER TABLE public.users
  ENABLE ROW LEVEL SECURITY;

GRANT DELETE, INSERT, SELECT, UPDATE ON public.users TO anon;

GRANT DELETE, INSERT, SELECT, UPDATE ON public.users TO authenticated;

GRANT DELETE, INSERT, SELECT, UPDATE ON public.users TO service_role;

CREATE EVENT TRIGGER ensure_rls
  ON ddl_command_end
  WHEN TAG IN ('CREATE TABLE', 'CREATE TABLE AS', 'SELECT INTO')
  EXECUTE FUNCTION public.rls_auto_enable();
