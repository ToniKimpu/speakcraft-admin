-- Token / cost accounting for user_imports.
--
-- Gemini reports tokens (prompt = input, candidates = output). Whisper bills
-- per audio-minute, not tokens, so we track audio seconds separately. All three
-- columns ACCUMULATE across the initial transcribe and every lazy enrichment
-- step, so a SUM over user_imports gives total spend.

alter table public.user_imports
  add column if not exists gemini_input_tokens bigint not null default 0,
  add column if not exists gemini_output_tokens bigint not null default 0,
  add column if not exists whisper_audio_sec integer not null default 0;

-- Atomic increment so concurrent enrichment calls (e.g. several per-sentence
-- explanations in quick succession) don't clobber each other's totals.
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
  update public.user_imports
     set gemini_input_tokens  = gemini_input_tokens  + coalesce(p_in, 0),
         gemini_output_tokens = gemini_output_tokens + coalesce(p_out, 0),
         whisper_audio_sec     = whisper_audio_sec     + coalesce(p_whisper_sec, 0)
   where id = p_id;
$$;

-- Service role only — clients never write token counts.
revoke all on function public.increment_import_tokens(uuid, bigint, bigint, integer)
  from public, anon, authenticated;
