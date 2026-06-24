-- Async (job + poll) pipeline for Daily Speaking. The review edge function now
-- creates a session row and returns its id immediately, processes Gemini in the
-- background (EdgeRuntime.waitUntil), and the app polls the row. A stuck job
-- (worker killed mid-call) is re-dispatched (by the client re-kick now, a sweep
-- cron later). See DAILY_SPEAKING_ASYNC_PLAN.md.

ALTER TABLE "public"."daily_speaking_sessions"
  ADD COLUMN IF NOT EXISTS "status" text NOT NULL DEFAULT 'completed',
  ADD COLUMN IF NOT EXISTS "error_message" text,
  ADD COLUMN IF NOT EXISTS "attempts" int NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "processing_started_at" timestamptz,
  ADD COLUMN IF NOT EXISTS "request" jsonb;

-- Sweep / claim lookups.
CREATE INDEX IF NOT EXISTS "dss_status_idx"
  ON "public"."daily_speaking_sessions" ("status", "processing_started_at");

-- Quota counts only sessions that did NOT terminally fail, so a failed/retried
-- attempt doesn't burn the learner's daily quota.
CREATE OR REPLACE FUNCTION "public"."daily_speaking_usage_today"("p_user_id" bigint)
    RETURNS TABLE("session_count" int, "tokens_used" int)
    LANGUAGE "sql" STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT count(*)::int,
         coalesce(sum(total_tokens), 0)::int
  FROM public.daily_speaking_sessions
  WHERE user_id = p_user_id
    AND created_at >= date_trunc('day', now())
    AND status <> 'error';
$$;

-- Atomically claim a session for (re)processing. Returns the row if claimable —
-- queued, terminally-errored under the attempt cap, or 'processing' but stale
-- (its worker died) — else returns nothing. Prevents a re-kick / sweep and the
-- inline dispatch from double-processing the same row.
CREATE OR REPLACE FUNCTION "public"."claim_daily_speaking_session"(
  "p_id" bigint, "p_stale_seconds" int, "p_max_attempts" int)
    RETURNS SETOF public.daily_speaking_sessions
    LANGUAGE "sql" VOLATILE SECURITY DEFINER SET search_path = public AS $$
  UPDATE public.daily_speaking_sessions
     SET status = 'processing',
         processing_started_at = now(),
         attempts = attempts + 1
   WHERE id = p_id
     AND attempts < p_max_attempts
     AND (
       status IN ('queued', 'error')
       OR (status = 'processing'
           AND processing_started_at < now() - make_interval(secs => p_stale_seconds))
     )
  RETURNING *;
$$;

-- Sessions a sweep should (re)kick.
CREATE OR REPLACE FUNCTION "public"."daily_speaking_sweepable"(
  "p_stale_seconds" int, "p_max_attempts" int, "p_limit" int)
    RETURNS SETOF public.daily_speaking_sessions
    LANGUAGE "sql" STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT *
  FROM public.daily_speaking_sessions
  WHERE attempts < p_max_attempts
    AND (
      status = 'queued'
      OR status = 'error'
      OR (status = 'processing'
          AND processing_started_at < now() - make_interval(secs => p_stale_seconds))
    )
  ORDER BY created_at
  LIMIT p_limit;
$$;

ALTER FUNCTION "public"."claim_daily_speaking_session"(bigint, int, int) OWNER TO "postgres";
ALTER FUNCTION "public"."daily_speaking_sweepable"(int, int, int) OWNER TO "postgres";
GRANT EXECUTE ON FUNCTION "public"."claim_daily_speaking_session"(bigint, int, int) TO "service_role";
GRANT EXECUTE ON FUNCTION "public"."daily_speaking_sweepable"(int, int, int) TO "service_role";

-- Phase 1.5 (enable after verifying the core works) — auto-retry stuck jobs even
-- when the learner's app is closed. Requires pg_cron + pg_net + a stored service
-- key; mirrors this project's other documented cron jobs:
--   SELECT cron.schedule('daily-speaking-sweep', '* * * * *', $$
--     SELECT net.http_post(
--       url := 'https://<project-ref>.supabase.co/functions/v1/daily-speaking-sweep',
--       headers := jsonb_build_object('Authorization','Bearer '||current_setting('app.dss_service_key'),
--                                     'Content-Type','application/json'),
--       body := '{}'::jsonb);
--   $$);
