-- save_recording — ONE central enforcement point for the per-sentence recording
-- cap, so mobile and the future web app share the same rule (can't drift or be
-- bypassed). Mirrors how grant_subscription centralizes the premium rule.
--
--   Free user                : keep the 1 most-recent take per sentence
--                              (re-recording replaces the previous one).
--   Premium (premium_until>now): keep the 5 most-recent takes (ring buffer).
--   Pinned recordings are EXEMPT from the cap (future "save this clip").
--
-- Returns the Storage object paths of any recordings dropped by the cap. The
-- CALLER must remove those files via the Storage API afterwards — deleting a
-- storage.objects row directly does NOT remove the underlying file, so the RPC
-- enforces the count (authoritative) and the client cleans up the bytes.

CREATE OR REPLACE FUNCTION "public"."save_recording"(
    "p_listening_id" integer,
    "p_sentence_id"  text,
    "p_audio_path"   text
)
    RETURNS text[]
    LANGUAGE "plpgsql"
    SECURITY DEFINER
    SET search_path = public
    AS $$
DECLARE
  v_user_id bigint;
  v_premium boolean;
  v_cap     integer;
  v_dropped text[];
BEGIN
  -- Resolve the caller and their premium state (auth.uid() -> users row).
  SELECT id, (premium_until IS NOT NULL AND premium_until > now())
    INTO v_user_id, v_premium
  FROM public.users
  WHERE user_id = auth.uid();

  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'No user row for the current auth user';
  END IF;

  v_cap := CASE WHEN v_premium THEN 5 ELSE 1 END;

  -- Record the new take.
  INSERT INTO public.listening_recordings (user_id, listening_id, sentence_id, audio_path)
  VALUES (v_user_id, p_listening_id, p_sentence_id, p_audio_path);

  -- Ring buffer: keep the newest v_cap NON-pinned takes for this exact
  -- (user, video, sentence); delete the older ones and report their paths.
  WITH ranked AS (
    SELECT id, audio_path,
           row_number() OVER (ORDER BY created_at DESC, id DESC) AS rn
    FROM public.listening_recordings
    WHERE user_id = v_user_id
      AND listening_id = p_listening_id
      AND sentence_id  = p_sentence_id
      AND NOT pinned
  ),
  dropped AS (
    DELETE FROM public.listening_recordings
    WHERE id IN (SELECT id FROM ranked WHERE rn > v_cap)
    RETURNING audio_path
  )
  SELECT coalesce(array_agg(audio_path), '{}') INTO v_dropped FROM dropped;

  RETURN v_dropped;
END;
$$;

ALTER FUNCTION "public"."save_recording"(integer, text, text) OWNER TO "postgres";

-- End users may call it; SECURITY DEFINER scopes everything to their auth.uid().
REVOKE ALL ON FUNCTION "public"."save_recording"(integer, text, text) FROM PUBLIC, "anon";
GRANT EXECUTE ON FUNCTION "public"."save_recording"(integer, text, text) TO "authenticated", "service_role";
