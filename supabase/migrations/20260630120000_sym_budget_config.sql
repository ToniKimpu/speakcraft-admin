-- Speak Your Mind — admin-editable daily token budgets.
--
-- A single config row the speak-your-mind-review edge function reads (cached
-- ≤60s) so the budgets can be tuned from the admin panel without a redeploy:
--   free_trial_daily  free tokens/day during the trial window
--   free_daily        free tokens/day AFTER the trial (no hard cut-off)
--   trial_days        length of the full-rate free trial
--   premium_daily     premium tokens/day
--
-- Reads: any authenticated user (the numbers aren't secret; the app may surface
-- them). Writes: service-role only (the admin panel), like the other config.

create table if not exists public.sym_budget_config (
  id               integer primary key default 1,
  free_trial_daily integer not null default 10000,
  free_daily       integer not null default 5000,
  trial_days       integer not null default 3,
  premium_daily    integer not null default 15000,
  updated_at       timestamptz not null default now(),
  constraint sym_budget_config_singleton check (id = 1)
);

-- Seed the single row with the agreed defaults.
insert into public.sym_budget_config (id) values (1)
  on conflict (id) do nothing;

alter table public.sym_budget_config enable row level security;

drop policy if exists "sym_budget_config_read" on public.sym_budget_config;
create policy "sym_budget_config_read"
  on public.sym_budget_config
  for select
  to authenticated
  using (true);

-- No insert/update/delete policy: writes go through the service-role admin only.
