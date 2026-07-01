-- Rework the YouTube-import feature:
--   1. Rename user_imports -> user_imports_listening (clearer: it's the
--      "imported YouTube video → Listening lesson" table).
--   2. Soft delete (is_deleted) so the user can remove a video from "My Videos"
--      WITHOUT resetting their used-minutes (we keep the row for accounting).
--   3. Quota moves from a per-import COUNT to a total-MINUTES budget. Whisper is
--      the only metered cost ($0.006/min); Gemini is intentionally unmetered.
--      Used minutes = SUM(duration_sec) over ALL the user's rows (including
--      soft-deleted) — which is exactly why delete must be soft.

-- 1. Rename (policies, indexes, grants and the FK all follow the table).
alter table public.user_imports rename to user_imports_listening;

-- 2. Soft delete.
alter table public.user_imports_listening
  add column if not exists is_deleted boolean not null default false;

-- 3. Total-minutes budget config (admin-editable). Defaults: free 10 min,
--    premium 300 min. Old count/per-video columns are left in place (unused).
alter table public.youtube_import_config
  add column if not exists free_total_sec    integer not null default 600,
  add column if not exists premium_total_sec integer not null default 18000;

update public.youtube_import_config
   set free_total_sec = 600, premium_total_sec = 18000
 where id = 1;

-- increment_import_tokens referenced the old table name in its body — recreate
-- it against the renamed table.
create or replace function public.increment_import_tokens(
  p_id uuid,
  p_in bigint,
  p_out bigint,
  p_whisper_sec integer default 0
) returns void
language sql
security definer
set search_path = public
as $$
  update public.user_imports_listening
     set gemini_input_tokens  = gemini_input_tokens  + coalesce(p_in, 0),
         gemini_output_tokens = gemini_output_tokens + coalesce(p_out, 0),
         whisper_audio_sec     = whisper_audio_sec     + coalesce(p_whisper_sec, 0)
   where id = p_id;
$$;
revoke all on function public.increment_import_tokens(uuid, bigint, bigint, integer)
  from public, anon, authenticated;

-- Owner-callable soft delete. RLS UPDATE is service-role only, so route the
-- "remove from My Videos" action through a security-definer that verifies
-- ownership and only flips is_deleted.
create or replace function public.soft_delete_user_import(p_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.user_imports_listening
     set is_deleted = true
   where id = p_id and user_id = auth.uid();
end;
$$;
revoke all on function public.soft_delete_user_import(uuid) from public, anon;
grant execute on function public.soft_delete_user_import(uuid) to authenticated;

-- Hard delete is no longer allowed (it would refund used minutes). Drop the
-- owner DELETE policy and revoke the grant; owner SELECT stays.
drop policy if exists "user_imports_delete_own" on public.user_imports_listening;
revoke delete on table public.user_imports_listening from authenticated;
