-- Record which Gemini model actually produced each session (primary or the
-- overload fallback), so flash-vs-flash-lite quality/cost can be compared per
-- row alongside the token-breakdown columns.
ALTER TABLE "public"."daily_speaking_sessions"
  ADD COLUMN IF NOT EXISTS "ai_model" text;
