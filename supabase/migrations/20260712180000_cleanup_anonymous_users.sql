-- Scheduled cleanup of stale anonymous (guest) users.
--
-- WHY
-- Every genuinely-new guest (new device / cleared cookies / expired session)
-- mints a real auth.users row via signInAnonymously that nothing removes on its
-- own, so one-visit guests accumulate forever. This job deletes guests that are:
--   (a) still anonymous   — never upgraded (identity linking flips is_anonymous
--       to false, so upgraded guests are excluded automatically),
--   (b) created > 30 days ago, AND
--   (c) with NO session activity in the last 30 days — so an ACTIVE returning
--       guest is kept even if their account is old.
-- Real users and upgraded guests are never touched.
--
-- CASCADE NOTE
-- public.users has no FK to auth.users, so deleting the auth row alone would
-- orphan the profile + all its bigint-keyed data. We delete the public.users
-- row FIRST (cascades every public.users(id)-keyed table — progress, answers,
-- comments, subscriptions, …) and THEN the auth.users row (cascades the
-- auth.uid()-keyed tables sym_usage / user_imports_listening).

CREATE OR REPLACE FUNCTION public.delete_stale_anonymous_users(
  p_older_than interval DEFAULT interval '30 days'
)
  RETURNS integer
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path = public
AS $$
DECLARE
  v_ids   uuid[];
  v_count integer;
BEGIN
  SELECT array_agg(u.id) INTO v_ids
  FROM auth.users u
  WHERE u.is_anonymous = true
    AND u.created_at < now() - p_older_than
    AND NOT EXISTS (
      SELECT 1 FROM auth.sessions s
      WHERE s.user_id = u.id
        AND coalesce(s.refreshed_at, s.updated_at, s.created_at)
              > now() - p_older_than
    );

  IF v_ids IS NULL THEN
    RETURN 0;
  END IF;

  -- Profile first (cascades bigint-keyed data), then the auth row.
  DELETE FROM public.users WHERE user_id = ANY(v_ids);
  DELETE FROM auth.users   WHERE id      = ANY(v_ids);

  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$;

ALTER FUNCTION public.delete_stale_anonymous_users(interval) OWNER TO postgres;
REVOKE ALL ON FUNCTION public.delete_stale_anonymous_users(interval)
  FROM PUBLIC, anon, authenticated;
-- Backend-only: the cron job runs it; service_role can also trigger it manually.
GRANT EXECUTE ON FUNCTION public.delete_stale_anonymous_users(interval) TO service_role;

-- Schedule daily at 03:00 UTC. pg_cron runs in the postgres database.
-- Re-scheduling with the same job name updates the existing job (idempotent).
CREATE EXTENSION IF NOT EXISTS pg_cron;

SELECT cron.schedule(
  'delete-stale-anonymous-users',
  '0 3 * * *',
  $$ SELECT public.delete_stale_anonymous_users(); $$
);
