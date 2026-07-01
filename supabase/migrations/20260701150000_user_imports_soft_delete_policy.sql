-- Simpler owner soft-delete: instead of a security-definer RPC, give the owner a
-- COLUMN-SCOPED update grant so they can flip ONLY is_deleted directly. Postgres
-- rejects any attempt to update other columns (e.g. duration_sec), so the
-- minutes budget stays tamper-proof — the reason we couldn't just open a blanket
-- owner UPDATE policy.

drop policy if exists "user_imports_soft_delete_own" on public.user_imports_listening;
create policy "user_imports_soft_delete_own" on public.user_imports_listening
  for update to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

grant update (is_deleted) on table public.user_imports_listening to authenticated;

-- The soft_delete_user_import RPC is no longer used by the app; keep it (harmless)
-- or drop it. Dropping to avoid a dead, security-definer function.
drop function if exists public.soft_delete_user_import(uuid);
