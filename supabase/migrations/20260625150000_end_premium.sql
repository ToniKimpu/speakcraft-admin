-- Generic "end premium now" for a user — covers premium granted by ANY path
-- (manual comp grant, legacy, etc.), not just an approved payment submission
-- (that's what revoke_payment_submission handles).
--
-- Sets premium_until = now() (access ends immediately) and closes out any
-- still-active subscription ledger rows as 'expired' so the ledger stays
-- consistent. Neutral wording ('expired', not 'refunded') since this is a
-- generic end, not necessarily a refund.
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

  UPDATE public.users SET premium_until = now() WHERE id = target_user_id;

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
