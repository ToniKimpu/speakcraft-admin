-- Expose account_id through get_user so the mobile profile screen can show it.
--
-- The users table has always had account_id (text, NOT NULL, assigned as
-- 'PMP######' in handle_new_user), and the mobile AppUser model already maps
-- @JsonKey(name: 'account_id'). The only missing link was get_user, whose
-- RETURNS TABLE signature omitted the column, so the RPC never surfaced it and
-- AppUser.accountId was always null. Recreate get_user with account_id added
-- (appended last to keep positional deserialization of existing fields intact).
--
-- Postgres forbids changing a function's return type via CREATE OR REPLACE
-- (SQLSTATE 42P13), and adding a column to the RETURNS TABLE is a return-type
-- change, so we DROP first and then recreate. DROP also removes the owner and
-- grants, so both are re-applied below to match the prior definition.
DROP FUNCTION IF EXISTS "public"."get_user"("user_id_param" "uuid");

CREATE OR REPLACE FUNCTION "public"."get_user"("user_id_param" "uuid")
    RETURNS TABLE("id" bigint, "name" "text", "email" "text", "profile_path" "text", "user_id" "uuid", "device_id" "text", "total_token_used" bigint, "is_premium_user" boolean, "account_id" "text")
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  RETURN QUERY
  SELECT
    users.id,
    users.name,
    users.email,
    users.profile_path,
    users.user_id,
    users.device_id,
    users.total_token_used,
    (users.premium_until IS NOT NULL AND users.premium_until > now()) AS is_premium_user,
    users.account_id
  FROM
    users
  WHERE users.user_id = user_id_param;
END;
$$;

ALTER FUNCTION "public"."get_user"("user_id_param" "uuid") OWNER TO "postgres";

GRANT ALL ON FUNCTION "public"."get_user"("user_id_param" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_user"("user_id_param" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_user"("user_id_param" "uuid") TO "service_role";
