-- Keep public.users in sync when auth.users changes (guest → account convert).
--
-- handle_new_user only fires on INSERT, so when a guest converts (links Google
-- or adds email/password), auth.users.email / raw_user_meta_data change but the
-- public.users row keeps its guest values (email '', name ''). The mobile client
-- can't fix this itself: the authenticated role has no UPDATE grant on
-- public.users, so a client UPDATE fails with "permission denied for table
-- users" (42501). Do the sync server-side with a SECURITY DEFINER trigger.
--
-- Only fills name when it's currently blank, so a name the user set earlier is
-- never overwritten by a provider's display name.
CREATE OR REPLACE FUNCTION "public"."handle_user_update"()
    RETURNS "trigger"
    LANGUAGE "plpgsql"
    SECURITY DEFINER
    SET search_path = public
    AS $$
BEGIN
  UPDATE public.users
     SET email = coalesce(NEW.email, email),
         name = CASE
                  WHEN coalesce(name, '') = '' THEN
                    coalesce(
                      NEW.raw_user_meta_data->>'name',
                      NEW.raw_user_meta_data->>'full_name',
                      name
                    )
                  ELSE name
                END
   WHERE user_id = NEW.id;
  RETURN NEW;
END;
$$;

ALTER FUNCTION "public"."handle_user_update"() OWNER TO "postgres";

DROP TRIGGER IF EXISTS "on_auth_user_updated" ON "auth"."users";
CREATE TRIGGER "on_auth_user_updated"
  AFTER UPDATE ON "auth"."users"
  FOR EACH ROW
  WHEN (OLD.email IS DISTINCT FROM NEW.email
        OR OLD.raw_user_meta_data IS DISTINCT FROM NEW.raw_user_meta_data)
  EXECUTE FUNCTION "public"."handle_user_update"();
