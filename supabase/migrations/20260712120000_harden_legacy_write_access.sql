-- Harden legacy over-permissive write access ahead of public anonymous sign-in.
--
-- WHY NOW
-- The plan is to let visitors use the free tier via Supabase anonymous auth
-- (signInAnonymously). That puts every visitor into the `authenticated` role
-- with a single anon-key call — no email, no cost. Any policy that trusts
-- `authenticated` blindly therefore becomes a PUBLIC surface the moment anon
-- sign-in is enabled.
--
-- The original remote_schema shipped ~28 tables with:
--     POLICY "... authenticated ..." USING (true) WITH CHECK (true)   -- FOR ALL
--     GRANT ALL ON TABLE ... TO anon, authenticated;
-- i.e. any authenticated user can INSERT/UPDATE/DELETE them. With anon auth that
-- means a random visitor could:
--   * self-grant premium by INSERTing into `premium_users`, and
--   * vandalise/DELETE the whole content catalog (`listenings`, `patterns`, …).
--
-- FIX (mirrors the existing 20260626130000_app_versions_harden precedent):
--   * Content/catalog tables  -> read-only for clients; writes via service_role.
--   * premium_users           -> fully locked from clients (premium is sourced
--                                 from users.premium_until via the service-role
--                                 grant/approve functions; premium_users is
--                                 legacy and unreferenced by newer migrations).
--   * users                   -> block client INSERT/DELETE (UPDATE is already
--                                 column-restricted by 20260625130000; the row is
--                                 created by the handle_new_user trigger, which is
--                                 SECURITY DEFINER and bypasses grants).
--
-- The admin CMS mutates content through the service_role (which has BYPASSRLS +
-- full grants), so none of these client-side revokes affect admin publishing —
-- exactly as app_versions_harden already demonstrated.
--
-- Read exposure is intentionally UNCHANGED here: these tables stay readable by
-- `authenticated` (which now includes anon-auth guests), so the "browse the full
-- catalog, premium items shown locked" UX keeps working. Premium gating stays in
-- the app layer, as today. Opening the catalog to the pure `anon` role (browsing
-- with no session at all) is a separate product decision, not this migration.
--
-- NOTE: Phase 1 only. The per-user data / legacy tables listed at the bottom keep
-- their blanket USING(true) for now (a cross-user read/write concern, but far
-- lower severity than self-grant-premium / catalog-destroy). They need per-row
-- `auth.uid()` scoping AND confirmation of whether the current apps still use
-- them before we touch their write paths — tracked as Phase 2.

------------------------------------------------------------------------------
-- A. Content / catalog tables → read-only for clients, writes via service_role
------------------------------------------------------------------------------
DO $$
DECLARE
  t   text;
  pol record;
  content_tables text[] := ARRAY[
    'days',
    'exercises',
    'lessons',
    'patterns',
    'pattern_examples',
    'pattern_exercises',
    'pattern_vocabularies',
    'pattern_vocabulary_relation',
    'pattern_exercises_vocabularies_relation',
    'pattern_examples_vocabularies_relation',
    'translations',
    'translation_days',
    'translation_levels',
    'translation_vocabulary_relation',
    'listenings',
    'listening_vocabularies',
    'listening_vocabularies_relation',
    'subject_verb_agreements'
  ];
BEGIN
  FOREACH t IN ARRAY content_tables LOOP
    -- Drop every existing policy on the table (handles the several inconsistent
    -- policy names, including one with a stray zero-width char).
    FOR pol IN
      SELECT policyname FROM pg_policies
      WHERE schemaname = 'public' AND tablename = t
    LOOP
      EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', pol.policyname, t);
    END LOOP;

    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);

    -- Clients may read the catalog (preserves current authenticated-only read;
    -- anon-auth guests are `authenticated`, so browsing keeps working).
    EXECUTE format(
      'CREATE POLICY "catalog readable by clients" ON public.%I '
      'FOR SELECT TO authenticated USING (true)', t);

    -- Privileges: strip client writes; admin writes go through service_role.
    EXECUTE format('REVOKE ALL   ON TABLE public.%I FROM anon, authenticated', t);
    EXECUTE format('GRANT  SELECT ON TABLE public.%I TO authenticated', t);
    EXECUTE format('GRANT  ALL   ON TABLE public.%I TO service_role', t);
  END LOOP;
END $$;

------------------------------------------------------------------------------
-- B. premium_users → fully locked from clients (self-grant vector)
------------------------------------------------------------------------------
-- Premium is sourced from public.users.premium_until (granted only by the
-- service-role functions approve_payment_submission()/grant_subscription()).
-- premium_users is legacy; deny all client access so nobody can self-insert a
-- premium membership.
DO $$
DECLARE pol record;
BEGIN
  FOR pol IN
    SELECT policyname FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'premium_users'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.premium_users', pol.policyname);
  END LOOP;
END $$;

ALTER TABLE public.premium_users ENABLE ROW LEVEL SECURITY;
-- No client policy is created → with RLS enabled and no policy, all anon /
-- authenticated access is denied. service_role bypasses RLS.
REVOKE ALL ON TABLE public.premium_users FROM anon, authenticated;
GRANT  ALL ON TABLE public.premium_users TO service_role;

------------------------------------------------------------------------------
-- C. users → block client INSERT / DELETE (UPDATE already column-locked)
------------------------------------------------------------------------------
-- Row creation is handled by the handle_new_user trigger (SECURITY DEFINER,
-- bypasses grants). 20260625130000 already revoked blanket UPDATE and re-granted
-- it on a safe column allow-list. Close the remaining client write vectors so a
-- guest can't INSERT junk users or DELETE other people's accounts. SELECT and the
-- existing column-level UPDATE grants are left untouched.
REVOKE INSERT, DELETE, TRUNCATE ON TABLE public.users FROM anon, authenticated;

------------------------------------------------------------------------------
-- PHASE 2 (not in this migration — needs app-usage confirmation + user scoping)
------------------------------------------------------------------------------
-- These keep blanket USING(true), letting any authenticated user touch OTHER
-- users' rows. Lower severity, but should be scoped to auth.uid() = <owner> once
-- we confirm which of the current apps (if any) still read/write them:
--   days_users_relation, exercises_users_relation, exercise_user_answers,
--   translation_days_users_relation, translation_user_answer,
--   love_user_comments, pattern_user_comments, user_comment_replies
