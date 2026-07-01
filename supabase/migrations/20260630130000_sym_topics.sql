-- Speak Your Mind — topic content (online), mirroring vocab_groups.
--
-- One row per topic: lightweight index columns for the level list + premium
-- gating, plus a `data` jsonb holding the full topic (toolbox + produce + guide
-- + audio paths). The app reads the index for the home screen and the `data`
-- jsonb when a topic is opened — so the whole module talks to one table.
--
-- Gating: is_free (Level 1 = true) drives the L1-free / L2–L3-premium model.
-- RLS returns only published rows; writes are service-role only (admin seed).

create table if not exists public.sym_topics (
  id             text primary key,
  level          integer not null default 1,
  domain_en      text not null default '',
  domain_mm      text not null default '',
  title_en       text not null default '',
  title_mm       text not null default '',
  order_in_level integer not null default 0,
  move_count     integer not null default 0,
  phrase_count   integer not null default 0,
  is_free        boolean not null default false,
  published      boolean not null default true,
  data           jsonb not null,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

create index if not exists sym_topics_level_order_idx
  on public.sym_topics (level, order_in_level);

alter table public.sym_topics enable row level security;

drop policy if exists "sym_topics_read_published" on public.sym_topics;
create policy "sym_topics_read_published"
  on public.sym_topics
  for select
  to authenticated
  using (published = true);

-- No insert/update/delete policy: the admin seed/edit runs as service-role.
