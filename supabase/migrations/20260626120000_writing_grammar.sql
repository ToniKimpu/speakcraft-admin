-- Grammar (Writing) module — content tables.
--
-- Backs the mobile app's Grammar module (code-named `writing`). Two public-read
-- content tables, authored from this admin, that mirror the bundled Flutter JSON
-- 1:1 so productionizing is a copy:
--   * writing_lessons — one grammar unit per row (teach / toolkit / exercises as
--     JSONB, matching `WritingUnit.fromJson` snake_case keys). The scalar columns
--     also serve the path-screen manifest (replaces `assets/writing/units/index.json`).
--   * writing_lexicon — shared verb / time-word / adjective / noun banks. Each row
--     keeps the whole entry in `data` JSONB (the four kinds differ in shape), keyed
--     by `kind`, matching `LexiconVerb/TimeWord/Adjective/Noun.fromJson`.
--
-- Only `is_published = true AND is_deleted = false` lessons are visible to the app.
-- Lexicon is reference data: readable whenever not deleted. The admin writes via
-- the service-role key (bypasses RLS); clients can never author content.
--
-- Progress + submissions tables (auth, RLS own-rows) come later with the
-- handwrite-and-grade slice — see speakcraft-lite WRITING_FEATURE_PLAN.md.

-- ---------------------------------------------------------------------------
-- writing_lessons
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS "public"."writing_lessons" (
    "id" text PRIMARY KEY,                      -- e.g. 'l1_be_am_is_are'
    "level" integer NOT NULL DEFAULT 1,
    "section_id" text NOT NULL DEFAULT '',      -- e.g. '1.2' (orders/labels sections)
    "section" text NOT NULL DEFAULT '',         -- display name, e.g. 'Present'
    "order_in_level" integer NOT NULL DEFAULT 0, -- maps to unit JSON `order`
    "type" text NOT NULL DEFAULT 'grammar_unit',
    "title" text NOT NULL,
    "subtitle_mm" text NOT NULL DEFAULT '',
    -- 7-part teach page: situation/use/form/walkthrough/trap/examples/checks…
    "teach" jsonb NOT NULL DEFAULT '{}'::jsonb,
    -- { verbs:[id], time_words:[id], adjectives:[id], nouns:[id], verb_form, … }
    "toolkit" jsonb NOT NULL DEFAULT '{}'::jsonb,
    -- ordered ladder: [{ kind, grade, prompt_en, options, answers, grading … }]
    "exercises" jsonb NOT NULL DEFAULT '[]'::jsonb,
    "practice_recap_en" text NOT NULL DEFAULT '',
    "practice_recap_mm" text NOT NULL DEFAULT '',
    "image_path" text NOT NULL DEFAULT '',      -- reserved for scan/picture task types
    "tags" text[] NOT NULL DEFAULT '{}',
    "is_published" boolean NOT NULL DEFAULT false,
    "is_deleted" boolean NOT NULL DEFAULT false,
    "created_at" timestamp with time zone NOT NULL DEFAULT now(),
    "updated_at" timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE "public"."writing_lessons" OWNER TO "postgres";

-- Path-screen manifest query: published units, in curriculum order.
CREATE INDEX IF NOT EXISTS "writing_lessons_path_idx"
    ON "public"."writing_lessons"
    ("is_published", "level", "section_id", "order_in_level");

-- ---------------------------------------------------------------------------
-- writing_lexicon
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS "public"."writing_lexicon" (
    "id" text PRIMARY KEY,                      -- e.g. 'v_live', 't_always'
    "kind" text NOT NULL
        CHECK ("kind" IN ('verb', 'time_word', 'adjective', 'noun')),
    -- the full entry, shape per kind (matches the Flutter Lexicon*.fromJson)
    "data" jsonb NOT NULL DEFAULT '{}'::jsonb,
    "is_deleted" boolean NOT NULL DEFAULT false,
    "created_at" timestamp with time zone NOT NULL DEFAULT now(),
    "updated_at" timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE "public"."writing_lexicon" OWNER TO "postgres";

CREATE INDEX IF NOT EXISTS "writing_lexicon_kind_idx"
    ON "public"."writing_lexicon" ("kind", "is_deleted");

-- ---------------------------------------------------------------------------
-- updated_at trigger (reuses the shared touch fn from the topics migration)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION "public"."touch_updated_at"() RETURNS trigger
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

ALTER FUNCTION "public"."touch_updated_at"() OWNER TO "postgres";

DROP TRIGGER IF EXISTS "trg_writing_lessons_touch" ON "public"."writing_lessons";
CREATE TRIGGER "trg_writing_lessons_touch"
    BEFORE UPDATE ON "public"."writing_lessons"
    FOR EACH ROW EXECUTE FUNCTION "public"."touch_updated_at"();

DROP TRIGGER IF EXISTS "trg_writing_lexicon_touch" ON "public"."writing_lexicon";
CREATE TRIGGER "trg_writing_lexicon_touch"
    BEFORE UPDATE ON "public"."writing_lexicon"
    FOR EACH ROW EXECUTE FUNCTION "public"."touch_updated_at"();

-- ---------------------------------------------------------------------------
-- RLS — read-only public access; admin writes via service role (bypasses RLS).
-- ---------------------------------------------------------------------------
ALTER TABLE "public"."writing_lessons" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."writing_lexicon" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "writing lessons readable when published"
    ON "public"."writing_lessons"
    FOR SELECT TO "authenticated", "anon"
    USING ("is_published" = true AND "is_deleted" = false);

CREATE POLICY "writing lexicon readable when not deleted"
    ON "public"."writing_lexicon"
    FOR SELECT TO "authenticated", "anon"
    USING ("is_deleted" = false);

GRANT SELECT ON TABLE "public"."writing_lessons" TO "authenticated", "anon";
GRANT ALL    ON TABLE "public"."writing_lessons" TO "service_role";

GRANT SELECT ON TABLE "public"."writing_lexicon" TO "authenticated", "anon";
GRANT ALL    ON TABLE "public"."writing_lexicon" TO "service_role";
