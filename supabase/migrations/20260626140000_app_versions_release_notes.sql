-- Per-release "what's new" notes, shown on the mobile New Version screen.
-- Nullable / freeform (authored in Burmese); when empty the app falls back to
-- its generic update message. No RLS change — the existing read policy already
-- exposes every column.

ALTER TABLE "public"."app_versions"
    ADD COLUMN IF NOT EXISTS "release_notes" text;
