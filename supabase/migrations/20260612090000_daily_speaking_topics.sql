-- Daily Speaking — suggested-topic bank.
--
-- Read by the mobile app's suggested-topic on-ramp. The rich content
-- (vocabulary, target phrases, warmup questions) is stored as JSONB so it maps
-- 1:1 to the Flutter `DailySpeakingTopic.fromJson` (snake_case keys). Authored
-- from this admin; only `is_published = true AND is_deleted = false` rows are
-- visible to the app. See speakcraft-mobile `SUGGESTED_TOPICS_SUPABASE_PLAN.md`.

CREATE TABLE IF NOT EXISTS "public"."daily_speaking_topics" (
    "id" text PRIMARY KEY DEFAULT (gen_random_uuid())::text,
    "title" text NOT NULL,
    "prompt_en" text NOT NULL,
    "prompt_mm" text NOT NULL DEFAULT '',
    "difficulty" text NOT NULL DEFAULT 'beginner'
        CHECK ("difficulty" IN ('beginner', 'intermediate', 'advanced')),
    "duration_target_seconds" integer NOT NULL DEFAULT 180,
    -- [{ term, definition_mm, example_en }]
    "vocabulary" jsonb NOT NULL DEFAULT '[]'::jsonb,
    -- [{ phrase_en, translation_mm }]
    "target_phrases" jsonb NOT NULL DEFAULT '[]'::jsonb,
    -- ["...", "..."]
    "warmup_questions" jsonb NOT NULL DEFAULT '[]'::jsonb,
    "tags" text[] NOT NULL DEFAULT '{}',
    "sort_order" integer NOT NULL DEFAULT 0,
    "is_published" boolean NOT NULL DEFAULT false,
    "is_deleted" boolean NOT NULL DEFAULT false,
    "created_at" timestamp with time zone NOT NULL DEFAULT now(),
    "updated_at" timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE "public"."daily_speaking_topics" OWNER TO "postgres";

CREATE INDEX IF NOT EXISTS "daily_speaking_topics_published_idx"
    ON "public"."daily_speaking_topics" ("is_published", "sort_order");

-- Keep updated_at fresh on every edit.
CREATE OR REPLACE FUNCTION "public"."touch_updated_at"() RETURNS trigger
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

ALTER FUNCTION "public"."touch_updated_at"() OWNER TO "postgres";

DROP TRIGGER IF EXISTS "trg_daily_speaking_topics_touch"
    ON "public"."daily_speaking_topics";
CREATE TRIGGER "trg_daily_speaking_topics_touch"
    BEFORE UPDATE ON "public"."daily_speaking_topics"
    FOR EACH ROW EXECUTE FUNCTION "public"."touch_updated_at"();

-- RLS — public read of published, non-deleted topics only. No write policy =>
-- clients can never author topics; the admin app writes via the service role
-- key (which bypasses RLS).
ALTER TABLE "public"."daily_speaking_topics" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "daily speaking topics readable when published"
    ON "public"."daily_speaking_topics"
    FOR SELECT TO "authenticated", "anon"
    USING ("is_published" = true AND "is_deleted" = false);

GRANT SELECT ON TABLE "public"."daily_speaking_topics" TO "authenticated", "anon";
GRANT ALL    ON TABLE "public"."daily_speaking_topics" TO "service_role";

-- Optional starter content so the app shows real Supabase data immediately.
-- Safe to delete from the admin once you've authored your own topics.
INSERT INTO "public"."daily_speaking_topics"
    ("id", "title", "prompt_en", "prompt_mm", "difficulty",
     "duration_target_seconds", "vocabulary", "target_phrases",
     "warmup_questions", "tags", "sort_order", "is_published")
VALUES
    (
      'seed-my-hometown',
      'My hometown',
      'Describe your hometown. Where is it, what is it known for, and what do you like most about it?',
      '',
      'beginner',
      180,
      '[{"term":"hometown","definition_mm":"ဇာတိမြို့ / မွေးရပ်မြေ","example_en":"My hometown is a small town near the river."},
        {"term":"be known for","definition_mm":"... ကြောင့် နာမည်ကြီးသည်","example_en":"My city is known for its street food."}]'::jsonb,
      '[{"phrase_en":"It is famous for","translation_mm":"... ကြောင့် ထင်ရှားသည်"},
        {"phrase_en":"What I like most is","translation_mm":"ကျွန်တော် အကြိုက်ဆုံးက"}]'::jsonb,
      '["Where is your hometown?","What is it famous for?","What do you miss about it?"]'::jsonb,
      ARRAY['places', 'description'],
      0,
      true
    ),
    (
      'seed-a-goal',
      'A goal you are working on',
      'Talk about a goal you are currently working towards. Why is it important to you, and how are you trying to achieve it?',
      '',
      'intermediate',
      180,
      '[{"term":"work towards","definition_mm":"... ဆီသို့ ကြိုးစားသည်","example_en":"I am working towards a promotion at my job."},
        {"term":"step by step","definition_mm":"တစ်ဆင့်ပြီးတစ်ဆင့်","example_en":"I am learning English step by step."}]'::jsonb,
      '[{"phrase_en":"My main goal is to","translation_mm":"ကျွန်တော့ရဲ့ အဓိက ရည်မှန်းချက်က"},
        {"phrase_en":"In order to achieve this","translation_mm":"ဒါကို အောင်မြင်ဖို့အတွက်"}]'::jsonb,
      '["What is the goal?","Why does it matter to you?","What is your next step?"]'::jsonb,
      ARRAY['goals', 'self'],
      0,
      true
    )
ON CONFLICT ("id") DO NOTHING;
