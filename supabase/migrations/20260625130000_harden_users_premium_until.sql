-- Harden the users table against client-side premium self-grants.
--
-- public.users has a permissive RLS policy ("Allow all access to authenticated
-- users" — USING(true) WITH CHECK(true)), so any logged-in user could write
-- ANY column on their row, including `premium_until` — i.e. grant themselves
-- free premium directly via the REST API, bypassing the whole payment flow.
--
-- Fix with COLUMN-LEVEL privileges instead of touching the policy: revoke the
-- blanket UPDATE from `authenticated`, then grant UPDATE only on the columns the
-- mobile app legitimately writes from the client:
--   * device_id        (single-device lock on login)
--   * name             (profile)
--   * profile_path      (avatar)
--   * total_token_used (AI usage metering)
--
-- Everything else — premium_until, is_active, user_type, email, account_id,
-- user_id, id, created_at — becomes non-writable by `authenticated`. The
-- service_role bypasses these grants entirely, so grant_subscription() and
-- approve_payment_submission() keep working. RLS still governs row visibility;
-- this is an orthogonal, defense-in-depth lock at the column level.

REVOKE UPDATE ON "public"."users" FROM "authenticated";

GRANT UPDATE ("name", "profile_path", "device_id", "total_token_used")
  ON "public"."users" TO "authenticated";

-- anon should never update users; revoke defensively (no-op if not granted).
REVOKE UPDATE ON "public"."users" FROM "anon";
