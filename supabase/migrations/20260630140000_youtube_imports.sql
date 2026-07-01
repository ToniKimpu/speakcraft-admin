-- YouTube Import — user-imported YouTube videos become full Listening &
-- Shadowing lessons. A user pastes a link, supplies the audio, and the
-- yt-transcribe edge function produces the lesson JSON.
--
-- Net-new here:
--   * user_imports            — one row per imported video (per user), holding
--                               the youtube metadata + storage paths to each
--                               generated feature JSON (lazily populated).
--   * youtube_import_config   — admin-editable limits (free lifetime count +
--                               duration caps), single row id = 1 (mirrors
--                               sym_budget_config).
--   * storage bucket 'user-imports' — PUBLIC-read (transcripts of public videos,
--                               non-sensitive); writes only via the service-role
--                               edge function. Path: {auth.uid()}/{import_id}/<file>.json
--
-- Keyed by the auth uuid directly (like sym_usage), not public.users.id.
-- The free lifetime quota is simply COUNT(user_imports) for the user — we only
-- insert a row on a SUCCESSFUL import, so failed/over-limit attempts never count.

-- ---------------------------------------------------------------------
-- 1. Imported videos.
-- ---------------------------------------------------------------------
create table if not exists public.user_imports (
  id                        uuid primary key default gen_random_uuid(),
  user_id                   uuid not null references auth.users (id) on delete cascade,
  youtube_id                text not null,
  title                     text not null default '',
  thumbnail_url             text not null default '',
  duration_sec              integer not null default 0,
  source_url                text not null default '',          -- canonical watch URL
  -- Storage object URLs (public). Empty string = that step not generated yet.
  subtitle_path             text not null default '',          -- main_subtitle.json (+ MM)
  shadowing_path            text not null default '',
  record_path               text not null default '',
  key_takeaways_path        text not null default '',          -- lazy (premium)
  sentence_explanation_path text not null default '',          -- lazy (premium)
  multiple_choice_path      text not null default '',          -- lazy (premium)
  created_at                timestamptz not null default now()
);
create index if not exists user_imports_user_idx
  on public.user_imports (user_id, created_at desc);

alter table public.user_imports enable row level security;

-- Owner may READ + DELETE their own imports (the app lists "My Videos" and lets
-- the user remove one). INSERT/UPDATE happen ONLY via the service-role edge
-- function — there are deliberately no insert/update policies.
drop policy if exists "user_imports_select_own" on public.user_imports;
create policy "user_imports_select_own" on public.user_imports
  for select to authenticated using (user_id = auth.uid());

drop policy if exists "user_imports_delete_own" on public.user_imports;
create policy "user_imports_delete_own" on public.user_imports
  for delete to authenticated using (user_id = auth.uid());

grant select, delete on table public.user_imports to authenticated;
grant all on table public.user_imports to service_role;

-- ---------------------------------------------------------------------
-- 2. Admin-editable limits (single row). Mirrors sym_budget_config.
-- ---------------------------------------------------------------------
create table if not exists public.youtube_import_config (
  id                       integer primary key default 1,
  free_lifetime_limit      integer not null default 5,     -- free imports, ever
  free_max_duration_sec    integer not null default 600,   -- 10 min
  premium_max_duration_sec integer not null default 3600,  -- 60 min
  updated_at               timestamptz not null default now(),
  constraint youtube_import_config_singleton check (id = 1)
);
insert into public.youtube_import_config (id) values (1) on conflict (id) do nothing;

alter table public.youtube_import_config enable row level security;
-- Readable by any signed-in user (the app shows "X of N free imports left").
drop policy if exists "yt_import_config_read" on public.youtube_import_config;
create policy "yt_import_config_read" on public.youtube_import_config
  for select to authenticated using (true);
grant select on table public.youtube_import_config to authenticated;
grant all on table public.youtube_import_config to service_role;

-- ---------------------------------------------------------------------
-- 3. Public storage bucket for generated feature JSON.
--    Public-read so the app can fetch the JSON by plain URL (no signed-url
--    expiry) — same access model as the curated Bunny content. Writes are
--    service-role only (the edge function); no client write policy is created.
-- ---------------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('user-imports', 'user-imports', true)
on conflict (id) do nothing;
