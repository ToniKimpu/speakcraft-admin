-- Consolidate user audio into ONE private bucket with per-user/per-feature
-- folders, instead of a bucket per feature. Path convention:
--   {auth.uid()}/{feature}/{...}/{uuid}.m4a
--   e.g. {auth.uid()}/listening/{listening_id}/{uuid}.m4a
-- Keeping the auth uid as the FIRST folder lets a single RLS policy isolate
-- every feature's audio per-user. Daily Speaking reuses this bucket later under
-- {auth.uid()}/daily-speaking/...
--
-- NOTE: storage object/bucket DELETION is not allowed from SQL on this project
-- (Storage API only). So: (a) the previous 'listening-recordings' bucket is left
-- in place (empty/unused — remove via the dashboard if desired), and
-- (b) save_recording only deletes DB rows and RETURNS the dropped paths; the
-- client removes those files via the Storage API. Retention must likewise run
-- from a scheduled Edge Function (Storage API), not pg_cron SQL.

-- New shared bucket (insert IS allowed; delete is not).
INSERT INTO "storage"."buckets" ("id", "name", "public")
VALUES ('user-recordings', 'user-recordings', false)
ON CONFLICT ("id") DO NOTHING;

-- Per-user isolation across all features in the one bucket.
DROP POLICY IF EXISTS "own user audio" ON "storage"."objects";
CREATE POLICY "own user audio" ON "storage"."objects"
  FOR ALL TO "authenticated"
  USING      ("bucket_id" = 'user-recordings'
              AND (storage.foldername("name"))[1] = auth.uid()::text)
  WITH CHECK ("bucket_id" = 'user-recordings'
              AND (storage.foldername("name"))[1] = auth.uid()::text);

-- The old per-feature policy is now unused; drop it (DDL is allowed).
DROP POLICY IF EXISTS "own recording files" ON "storage"."objects";

-- save_recording is bucket-agnostic (it never names a bucket — it only deletes
-- DB rows and returns the dropped audio_paths), so it needs no change here.
