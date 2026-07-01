-- Speak Your Mind — per-user, per-day AI token usage, for daily budgets.
--
-- One row per (user, local calendar day). The "daily reset" is implicit: a new
-- day is a new row, so today's bucket starts at 0 with no cron job. The local
-- day is computed in Asia/Yangon (UTC+6:30) by the edge function, so all users
-- reset together at Myanmar midnight.
--
-- Writes happen ONLY inside the speak-your-mind-review edge function (service
-- role, which bypasses RLS). End users may READ their own rows so the app can
-- show "feedback checks left today" — but cannot write (no insert/update policy).

create table if not exists public.sym_usage (
  user_id    uuid    not null references auth.users (id) on delete cascade,
  usage_date date    not null,
  tokens     integer not null default 0,
  calls      integer not null default 0,
  updated_at timestamptz not null default now(),
  primary key (user_id, usage_date)
);

-- Fast "first usage_date for this user" lookup (the 3-day trial check).
create index if not exists sym_usage_user_date_idx
  on public.sym_usage (user_id, usage_date);

alter table public.sym_usage enable row level security;

-- Read-only for the owning user (drives the "checks left" display). There are
-- deliberately NO insert/update/delete policies: the service-role function is
-- the only writer.
drop policy if exists "sym_usage_select_own" on public.sym_usage;
create policy "sym_usage_select_own"
  on public.sym_usage
  for select
  to authenticated
  using (user_id = auth.uid());
