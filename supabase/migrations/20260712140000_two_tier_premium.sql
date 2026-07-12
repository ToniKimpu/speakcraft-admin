-- Two-tier premium: Standard vs Pro.
--
-- WHY
-- The only per-use variable costs in the app are (1) YouTube video import
-- (OpenAI Whisper) and (2) Speak Your Mind AI feedback (Gemini). Many premium
-- users barely use them. So premium splits into:
--   * Standard — ALL content (Listening, Grammar, Vocabulary, SYM topics), but
--                NO video import and NO AI feedback.
--   * Pro      — everything, including the two metered features.
--
-- MODEL
-- Content access stays binary and shared: both tiers have a live premium_until,
-- and get_user.is_premium_user (premium_until > now) keeps gating all content
-- unchanged. The tiers differ on ONE new dimension — a Pro entitlement — which
-- mirrors the existing premium_until cache pattern:
--   * users.pro_until           — cache of Pro access (like premium_until)
--   * subscription_plans.tier   — 'standard' | 'pro'; a Pro plan grants pro_until
-- Enforcement of the two metered features lives in the edge functions
-- (yt-transcribe, yt-enrich, speak-your-mind-review), which will gate on
-- pro_until. This migration only adds the data + grant/read plumbing.

-- ---------------------------------------------------------------------------
-- 1. Plan tier. Default 'standard' is the SAFE default (least access) for any
--    future plan added without an explicit tier.
-- ---------------------------------------------------------------------------
ALTER TABLE public.subscription_plans
  ADD COLUMN IF NOT EXISTS tier text NOT NULL DEFAULT 'standard'
    CONSTRAINT subscription_plans_tier_check CHECK (tier IN ('standard', 'pro'));

-- Every EXISTING plan sold full access ("everything"), so it's a Pro plan.
-- New Standard plans are added later via the admin.
UPDATE public.subscription_plans SET tier = 'pro';

-- ---------------------------------------------------------------------------
-- 2. Pro entitlement cache on users (mirrors premium_until).
-- ---------------------------------------------------------------------------
ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS pro_until timestamptz;

-- ---------------------------------------------------------------------------
-- 3. Grandfather: everyone who is premium today paid for "everything" → Pro.
--    Independent stacking below keeps this correct on future renewals.
-- ---------------------------------------------------------------------------
UPDATE public.users
   SET pro_until = premium_until
 WHERE premium_until IS NOT NULL;

-- ---------------------------------------------------------------------------
-- 4. grant_subscription: unchanged signature. Always extends premium_until
--    (content) with the stacking greatest() logic; ADDITIONALLY, for a Pro
--    plan, stacks pro_until independently (Pro time starts from the later of now
--    or the existing pro_until, so a Standard→Pro upgrade never shortens either
--    window).
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION "public"."grant_subscription"(
    "target_user_id" bigint,
    "plan_code" text,
    "payment_ref_param" text DEFAULT NULL,
    "note_param" text DEFAULT NULL
)
    RETURNS "public"."subscriptions"
    LANGUAGE "plpgsql"
    SECURITY DEFINER
    SET search_path = public
    AS $$
DECLARE
  v_plan   public.subscription_plans;
  v_base   timestamp with time zone;
  v_end    timestamp with time zone;
  v_pro_end timestamp with time zone;
  v_sub    public.subscriptions;
BEGIN
  SELECT * INTO v_plan
  FROM public.subscription_plans
  WHERE code = plan_code AND is_active = true;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Unknown or inactive plan: %', plan_code;
  END IF;

  -- Content window (premium_until) — stacks on the later of now / existing.
  SELECT greatest(now(), coalesce(premium_until, now())) INTO v_base
  FROM public.users
  WHERE id = target_user_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Unknown user: %', target_user_id;
  END IF;

  v_end := v_base + make_interval(days => v_plan.duration_days);

  INSERT INTO public.subscriptions
    (user_id, plan_id, status, current_period_end, provider, payment_ref, granted_by, note)
  VALUES
    (target_user_id, v_plan.id, 'active', v_end, 'manual', payment_ref_param, auth.uid(), note_param)
  RETURNING * INTO v_sub;

  UPDATE public.users SET premium_until = v_end WHERE id = target_user_id;

  -- Pro window (pro_until) — only Pro plans grant it; stacks independently.
  IF v_plan.tier = 'pro' THEN
    SELECT greatest(now(), coalesce(pro_until, now())) INTO v_base
    FROM public.users
    WHERE id = target_user_id;
    v_pro_end := v_base + make_interval(days => v_plan.duration_days);
    UPDATE public.users SET pro_until = v_pro_end WHERE id = target_user_id;
  END IF;

  RETURN v_sub;
END;
$$;

ALTER FUNCTION "public"."grant_subscription"(bigint, text, text, text) OWNER TO "postgres";

-- ---------------------------------------------------------------------------
-- 5. get_user: expose is_pro (pro_until > now) + raw pro_until, so clients can
--    gate the metered features and re-evaluate offline (like premium_until).
--    Postgres forbids changing a function's return type via CREATE OR REPLACE,
--    so DROP + recreate; DROP also drops owner/grants → re-applied below. Adding
--    columns is backward-compatible: installed apps read keys by name and ignore
--    unknown ones (verified: Flutter AppUser.fromJson has no
--    disallowUnrecognizedKeys), so is_pro/pro_until are simply ignored by old
--    builds.
-- ---------------------------------------------------------------------------
DROP FUNCTION IF EXISTS "public"."get_user"("user_id_param" "uuid");

CREATE OR REPLACE FUNCTION "public"."get_user"("user_id_param" "uuid")
    RETURNS TABLE(
      "id" bigint, "name" "text", "email" "text", "profile_path" "text",
      "user_id" "uuid", "device_id" "text", "total_token_used" bigint,
      "is_premium_user" boolean, "account_id" "text",
      "premium_until" timestamp with time zone,
      "is_pro" boolean, "pro_until" timestamp with time zone
    )
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  RETURN QUERY
  SELECT
    users.id,
    users.name,
    users.email,
    users.profile_path,
    users.user_id,
    users.device_id,
    users.total_token_used,
    (users.premium_until IS NOT NULL AND users.premium_until > now()) AS is_premium_user,
    users.account_id,
    users.premium_until,
    (users.pro_until IS NOT NULL AND users.pro_until > now()) AS is_pro,
    users.pro_until
  FROM
    users
  WHERE users.user_id = user_id_param;
END;
$$;

ALTER FUNCTION "public"."get_user"("user_id_param" "uuid") OWNER TO "postgres";

GRANT ALL ON FUNCTION "public"."get_user"("user_id_param" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_user"("user_id_param" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_user"("user_id_param" "uuid") TO "service_role";
