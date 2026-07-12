-- Keep public.users.email in sync when a guest links a real identity.
--
-- WHY
-- handle_new_user (20260702130000) fires only on INSERT into auth.users, so a
-- guest's public.users.email is created as '' (the anonymous placeholder). When
-- that guest later upgrades — links a Google identity or converts to an
-- email/password account — auth.users.email becomes their real, VERIFIED email,
-- but public.users.email would otherwise stay '' forever (no INSERT re-fires).
--
-- This trigger backfills it automatically on the email change, so the profile
-- shows the right address after upgrade. The value comes from auth.users (a
-- verified identity), never from client input — which is exactly why we do NOT
-- add `email` to the client-writable column allow-list from 20260625130000:
-- users still can't rewrite their own email, but a genuine identity link does.

create or replace function public.sync_user_email()
    returns trigger
    language plpgsql
    security definer
    set search_path = public
as $$
begin
  -- Only when the email actually changed to a non-empty value (guest link /
  -- email conversion). Ignore no-op updates and clears.
  if new.email is distinct from old.email and coalesce(new.email, '') <> '' then
    update public.users
       set email = new.email
     where user_id = new.id;
  end if;
  return new;
end;
$$;

alter function public.sync_user_email() owner to postgres;

drop trigger if exists on_auth_user_email_synced on auth.users;
create trigger on_auth_user_email_synced
  after update of email on auth.users
  for each row execute function public.sync_user_email();
