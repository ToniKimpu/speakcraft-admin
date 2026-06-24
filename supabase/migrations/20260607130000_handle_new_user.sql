-- Provider-agnostic profile-row creation.
-- Replaces the client-side `users` insert: when a new auth.users row is created
-- (email today; Google/Apple later), this trigger creates the matching public.users
-- profile row. More secure (clients can't forge it) and works for every provider.

-- user_id maps 1:1 to auth.users.id; enforce uniqueness so it can be the conflict
-- target and to guarantee get_user() resolves a single row.
ALTER TABLE "public"."users"
  ADD CONSTRAINT "users_user_id_key" UNIQUE ("user_id");

CREATE OR REPLACE FUNCTION "public"."handle_new_user"()
    RETURNS "trigger"
    LANGUAGE "plpgsql"
    SECURITY DEFINER
    SET search_path = public
    AS $$
DECLARE
  v_account_id text;
BEGIN
  -- Match the existing 'PMP######' account-id convention; retry on the (rare) clash.
  LOOP
    v_account_id := 'PMP' || lpad((floor(random() * 1000000))::int::text, 6, '0');
    EXIT WHEN NOT EXISTS (SELECT 1 FROM public.users WHERE account_id = v_account_id);
  END LOOP;

  INSERT INTO public.users (user_id, email, name, profile_path, account_id)
  VALUES (
    NEW.id,
    NEW.email,
    coalesce(NEW.raw_user_meta_data->>'name', ''),
    NEW.raw_user_meta_data->>'profile_path',
    v_account_id
  )
  ON CONFLICT ("user_id") DO NOTHING;

  RETURN NEW;
END;
$$;

ALTER FUNCTION "public"."handle_new_user"() OWNER TO "postgres";

DROP TRIGGER IF EXISTS "on_auth_user_created" ON "auth"."users";
CREATE TRIGGER "on_auth_user_created"
  AFTER INSERT ON "auth"."users"
  FOR EACH ROW EXECUTE FUNCTION "public"."handle_new_user"();
