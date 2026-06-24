-- Store the Daily Speaking recording in Supabase (option B) so it's replayable
-- on web + mobile, not just on the device that made it. The edge function
-- uploads the audio to the shared `user-recordings` bucket under
-- {auth.uid()}/daily-speaking/... and records the path + a 30-day expiry here.
-- (Retention sweep runs from an Edge Function — SQL can't delete storage objects.)

ALTER TABLE "public"."daily_speaking_sessions"
  ADD COLUMN IF NOT EXISTS "audio_path" text,
  ADD COLUMN IF NOT EXISTS "expires_at" timestamptz;
