-- Make "end premium now" also end Pro.
--
-- end_premium (20260625150000) predates the Pro tier — it only set
-- premium_until = now(). After the two-tier split that would leave a revoked
-- user's pro_until in the future, so they'd lose content but KEEP the metered AI
-- features (import, AI feedback). Clear pro_until too so ending access ends
-- everything. Idempotent for non-Pro users (pro_until was already null/past).
CREATE OR REPLACE FUNCTION "public"."end_premium"("target_user_id" bigint)
    RETURNS void
    LANGUAGE "plpgsql"
    SECURITY DEFINER
    SET search_path = public
    AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.users WHERE id = target_user_id) THEN
    RAISE EXCEPTION 'Unknown user: %', target_user_id;
  END IF;

  UPDATE public.users
     SET premium_until = now(),
         pro_until     = now()
   WHERE id = target_user_id;

  UPDATE public.subscriptions
     SET status = 'expired', current_period_end = now()
   WHERE user_id = target_user_id
     AND status IN ('active', 'trialing');
END;
$$;

ALTER FUNCTION "public"."end_premium"(bigint) OWNER TO "postgres";

REVOKE ALL ON FUNCTION "public"."end_premium"(bigint)
  FROM PUBLIC, "anon", "authenticated";
GRANT EXECUTE ON FUNCTION "public"."end_premium"(bigint) TO "service_role";
