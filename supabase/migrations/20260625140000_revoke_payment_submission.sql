-- Revoke an ALREADY-APPROVED payment (refund / fraud caught after approval).
--
-- Unlike reject (which only acts on a 'pending' row before any grant), revoke
-- reverses a completed approval atomically across all three records:
--   1. users.premium_until  -> now()  (premium ends IMMEDIATELY; see note)
--   2. the linked subscriptions ledger row -> status 'refunded'
--   3. the payment_submissions row -> status 'rejected' + reason (so the mobile
--      status screen reflects the loss and the user may resubmit; the 'refunded'
--      ledger row is the durable record that it was once granted)
--
-- NOTE: setting premium_until = now() kills ALL of the user's premium, even if
-- other stacked subscriptions contributed days. That's intentional for v1 —
-- revocation means "this user shouldn't have premium right now".
CREATE OR REPLACE FUNCTION "public"."revoke_payment_submission"(
    "submission_id" bigint,
    "reason" text
)
    RETURNS "public"."payment_submissions"
    LANGUAGE "plpgsql"
    SECURITY DEFINER
    SET search_path = public
    AS $$
DECLARE
  v_sub_req public.payment_submissions;
BEGIN
  SELECT * INTO v_sub_req
  FROM public.payment_submissions
  WHERE id = submission_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Unknown submission: %', submission_id;
  END IF;
  IF v_sub_req.status <> 'approved' THEN
    RAISE EXCEPTION 'Submission % is not approved (is %)', submission_id, v_sub_req.status;
  END IF;

  -- 1. Kill premium immediately.
  UPDATE public.users SET premium_until = now() WHERE id = v_sub_req.user_id;

  -- 2. Mark the granted ledger row refunded.
  IF v_sub_req.subscription_id IS NOT NULL THEN
    UPDATE public.subscriptions
       SET status = 'refunded'
     WHERE id = v_sub_req.subscription_id;
  END IF;

  -- 3. Reflect the reversal on the submission.
  UPDATE public.payment_submissions
     SET status        = 'rejected',
         reject_reason = reason,
         reviewed_by   = auth.uid(),
         reviewed_at   = now()
   WHERE id = submission_id
  RETURNING * INTO v_sub_req;

  RETURN v_sub_req;
END;
$$;

ALTER FUNCTION "public"."revoke_payment_submission"(bigint, text) OWNER TO "postgres";

-- Backend-only (SECURITY DEFINER bypasses RLS).
REVOKE ALL ON FUNCTION "public"."revoke_payment_submission"(bigint, text)
  FROM PUBLIC, "anon", "authenticated";
GRANT EXECUTE ON FUNCTION "public"."revoke_payment_submission"(bigint, text)
  TO "service_role";
