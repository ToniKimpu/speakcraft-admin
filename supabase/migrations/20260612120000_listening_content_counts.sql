-- Listening — precomputed lesson-content counts.
--
-- Power the mobile app's per-video "what you'll get" outcome banner without
-- the app having to fetch and parse the lesson JSON (sentence count lives in
-- main_subtitle.json; vocab/pattern counts are spread across ~50 per-sentence
-- explanation files). Authored from this admin: run count_lesson.py on the
-- lesson's JSON folder and paste the numbers into the listening form.
-- 0 = unknown → the app falls back to generic banner copy.

ALTER TABLE "public"."listenings"
    ADD COLUMN IF NOT EXISTS "sentence_count" integer NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS "vocab_count" integer NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS "pattern_count" integer NOT NULL DEFAULT 0;
