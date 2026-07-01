-- Per-tier minutes pools. A free import and a premium import draw from separate
-- budgets, so upgrading to Premium gives a FULL 300 min — the free minutes
-- already used don't eat into it.
--
-- imported_free captures the tier AT IMPORT TIME (set by yt-transcribe from the
-- user's premium status; the column-scoped update grant means clients can only
-- touch is_deleted, never this). The gate sums only the pool matching the
-- user's CURRENT tier:
--   premium now → SUM(duration_sec) where imported_free = false
--   free now    → SUM(duration_sec) where imported_free = true

alter table public.user_imports_listening
  add column if not exists imported_free boolean not null default true;
