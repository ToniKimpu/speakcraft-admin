import { createClient } from "@supabase/supabase-js";

// Pure service-role client with NO user session attached. Requests therefore run
// as the `service_role` Postgres role — bypassing RLS and able to call privileged
// SECURITY DEFINER RPCs (e.g. grant_subscription) that are restricted from the
// `authenticated` role.
//
// SERVER-ONLY. Never import this into a client component: the service-role key
// must never reach the browser. (The key is read from SUPABASE_SERVICE_ROLE_KEY,
// which is not NEXT_PUBLIC_ prefixed, so it stays server-side.)
//
// Note: createServerSupabaseClient() carries the admin's auth cookie, so despite
// using the service-role key it actually runs as `authenticated`. Use THIS client
// for anything that must cross RLS / row-ownership boundaries.
export function createServiceRoleClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    }
  );
}
