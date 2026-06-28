-- Vocabulary premium gating — per-group `is_free` flag.
--
-- Freemium policy: Beginner (level 1) is free; Intermediate (2) and Upper (3)
-- are premium. Mirrors the Listening module's per-item `is_free` gating, so the
-- app can reuse `isUnlocked({isFree})` and the premium sheet.
--
-- Enforcement is CLIENT-SIDE (the UI blocks premium groups). RLS still returns
-- all published rows, matching how Listening already works. New groups default
-- to locked (false) — explicitly free a group by setting is_free = true.

ALTER TABLE "public"."vocab_groups"
    ADD COLUMN IF NOT EXISTS "is_free" boolean NOT NULL DEFAULT false;

-- Backfill the current 50 groups: free the Beginner level, lock the rest.
UPDATE "public"."vocab_groups" SET "is_free" = ("level" = 1);
