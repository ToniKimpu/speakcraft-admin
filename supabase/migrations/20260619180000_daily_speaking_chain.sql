-- Carry the version-loop chain on the server session row so Daily Speaking
-- history (v1/v2/… grouping + "Polish & retry") survives the move off local
-- Drift. The client mints topic_attempt_id before the review call and sends it
-- (with revision_number) so the edge function writes a complete row.

ALTER TABLE "public"."daily_speaking_sessions"
  ADD COLUMN IF NOT EXISTS "topic_attempt_id" text,
  ADD COLUMN IF NOT EXISTS "revision_number" int NOT NULL DEFAULT 1;

CREATE INDEX IF NOT EXISTS "dss_user_chain_idx"
  ON "public"."daily_speaking_sessions" ("user_id", "topic_attempt_id");
