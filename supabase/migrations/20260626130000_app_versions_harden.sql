-- Harden app_versions for admin management.
--
-- Before: RLS let ANY authenticated user insert/update/delete version rows
-- (policy "allow all access to authenticated users" USING/ WITH CHECK true,
-- plus GRANT ALL to anon + authenticated). That let any app user push a bogus
-- force-update row. After: public READ of non-deleted rows only; all writes go
-- through the admin's service-role key (bypasses RLS). Mirrors the
-- writing_lessons / daily_speaking_topics pattern.
--
-- Also adds soft-delete + updated_at (admin consistency) and a UNIQUE on
-- build_number (the app reads the single highest-build row, so builds must be
-- unambiguous). The mobile read query is unchanged: the SELECT policy filters
-- out soft-deleted rows for it automatically.

-- New columns.
ALTER TABLE "public"."app_versions"
    ADD COLUMN IF NOT EXISTS "is_deleted" boolean NOT NULL DEFAULT false;
ALTER TABLE "public"."app_versions"
    ADD COLUMN IF NOT EXISTS "updated_at" timestamp with time zone NOT NULL DEFAULT now();

-- One row per build.
CREATE UNIQUE INDEX IF NOT EXISTS "app_versions_build_number_key"
    ON "public"."app_versions" ("build_number");

-- Keep updated_at fresh (reuses the shared touch fn from earlier migrations).
CREATE OR REPLACE FUNCTION "public"."touch_updated_at"() RETURNS trigger
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;
ALTER FUNCTION "public"."touch_updated_at"() OWNER TO "postgres";

DROP TRIGGER IF EXISTS "trg_app_versions_touch" ON "public"."app_versions";
CREATE TRIGGER "trg_app_versions_touch"
    BEFORE UPDATE ON "public"."app_versions"
    FOR EACH ROW EXECUTE FUNCTION "public"."touch_updated_at"();

-- Drop every existing policy (names may contain stray characters), then lock
-- down to read-only public access.
DO $$
DECLARE pol record;
BEGIN
  FOR pol IN
    SELECT policyname FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'app_versions'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.app_versions', pol.policyname);
  END LOOP;
END $$;

ALTER TABLE "public"."app_versions" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "app versions readable when not deleted"
    ON "public"."app_versions"
    FOR SELECT TO "authenticated", "anon"
    USING ("is_deleted" = false);

-- Read-only for clients; writes only via service role (bypasses RLS).
REVOKE ALL ON TABLE "public"."app_versions" FROM "anon", "authenticated";
GRANT SELECT ON TABLE "public"."app_versions" TO "anon", "authenticated";
GRANT ALL    ON TABLE "public"."app_versions" TO "service_role";

REVOKE ALL ON SEQUENCE "public"."app_versions_id_seq" FROM "anon", "authenticated";
GRANT ALL ON SEQUENCE "public"."app_versions_id_seq" TO "service_role";
