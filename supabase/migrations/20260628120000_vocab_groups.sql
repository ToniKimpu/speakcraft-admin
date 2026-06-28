-- Vocabulary module — content table.
--
-- Backs the mobile app's standalone Vocabulary module. One public-read content
-- table, authored/seeded from this admin, mirroring the bundled Flutter JSON
-- 1:1 so productionizing is a copy:
--   * vocab_groups — one group per row. The full group (words, examples,
--     exercises, minimal_pairs, why_grouped…) lives in `data` JSONB, matching
--     `VocabGroup.fromJson`. The scalar columns also serve the list-screen
--     manifest (replaces `assets/vocabulary/index.json`).
--
-- Audio is NOT stored here — clip URLs are computed in the app
-- (bunny/<level>/<group>/<slug>.mp3). `has_audio` just flags when a group's
-- clips have been uploaded to Bunny, so shipping audio is a one-column flip.
--
-- Only `is_published = true AND is_deleted = false` groups are visible to the
-- app. The admin writes via the service-role key (bypasses RLS); clients can
-- never author content. Mirrors the writing_lessons / app_versions pattern.

CREATE TABLE IF NOT EXISTS "public"."vocab_groups" (
    "id" text PRIMARY KEY,                       -- e.g. 'feelings'
    "level" integer NOT NULL DEFAULT 1,          -- 1/2/3 → beginner/intermediate/upper
    "section" text NOT NULL DEFAULT '',          -- e.g. 'Daily life' (groups the list tabs)
    "order_in_level" integer NOT NULL DEFAULT 0, -- maps to group JSON `order`
    "title" text NOT NULL DEFAULT '',
    "theme" text NOT NULL DEFAULT '',
    "unit" text NOT NULL DEFAULT 'word',         -- word | expression
    "style" text NOT NULL DEFAULT 'contrast',    -- theme | contrast
    "word_count" integer NOT NULL DEFAULT 0,
    -- full group; NO audio paths (computed). Matches VocabGroup.fromJson.
    "data" jsonb NOT NULL DEFAULT '{}'::jsonb,
    "has_audio" boolean NOT NULL DEFAULT false,
    "is_published" boolean NOT NULL DEFAULT false,
    "is_deleted" boolean NOT NULL DEFAULT false,
    "created_at" timestamp with time zone NOT NULL DEFAULT now(),
    "updated_at" timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE "public"."vocab_groups" OWNER TO "postgres";

-- List-screen manifest query: published groups, in curriculum order.
CREATE INDEX IF NOT EXISTS "vocab_groups_list_idx"
    ON "public"."vocab_groups"
    ("is_published", "level", "order_in_level");

-- updated_at trigger (reuses the shared touch fn from earlier migrations).
CREATE OR REPLACE FUNCTION "public"."touch_updated_at"() RETURNS trigger
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;
ALTER FUNCTION "public"."touch_updated_at"() OWNER TO "postgres";

DROP TRIGGER IF EXISTS "trg_vocab_groups_touch" ON "public"."vocab_groups";
CREATE TRIGGER "trg_vocab_groups_touch"
    BEFORE UPDATE ON "public"."vocab_groups"
    FOR EACH ROW EXECUTE FUNCTION "public"."touch_updated_at"();

-- RLS — read-only public access; admin writes via service role (bypasses RLS).
ALTER TABLE "public"."vocab_groups" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "vocab groups readable when published"
    ON "public"."vocab_groups"
    FOR SELECT TO "authenticated", "anon"
    USING ("is_published" = true AND "is_deleted" = false);

GRANT SELECT ON TABLE "public"."vocab_groups" TO "authenticated", "anon";
GRANT ALL    ON TABLE "public"."vocab_groups" TO "service_role";
