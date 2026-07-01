-- Support guest (anonymous) auth users.
--
-- Guest sign-in uses Supabase anonymous auth, which creates an auth.users row
-- with a NULL email. That fires handle_new_user, whose INSERT copies NEW.email
-- into public.users.email (NOT NULL) — so a raw NULL would both violate the
-- constraint AND, on read, break the mobile AppUser model (email is a required
-- non-null String). Coalesce email to '' for the guest case: it satisfies
-- NOT NULL, matches the app's existing empty-user convention (AppUser.empty
-- uses email = ''), and needs no change to get_user or the mobile model. Real
-- email/Google accounts are unaffected — NEW.email is always present for them.
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
    coalesce(NEW.email, ''),
    coalesce(NEW.raw_user_meta_data->>'name', ''),
    NEW.raw_user_meta_data->>'profile_path',
    v_account_id
  )
  ON CONFLICT ("user_id") DO NOTHING;

  RETURN NEW;
END;
$$;

ALTER FUNCTION "public"."handle_new_user"() OWNER TO "postgres";
