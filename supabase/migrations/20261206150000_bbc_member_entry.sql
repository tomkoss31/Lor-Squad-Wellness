-- =============================================================================
-- BBC — écran d'entrée du membre (2026-07-24).
-- Vu une seule fois : `client_app_accounts.bbc_entry_seen_at`. Le membre n'a
-- pas de session Supabase (accès par token) → RPC security definer, même
-- patron que les autres fonctions *_by_token. 100 % additif.
-- =============================================================================

alter table public.client_app_accounts
  add column if not exists bbc_entry_seen_at timestamptz;

create or replace function public.mark_bbc_entry_seen(p_token text)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_found boolean;
begin
  update public.client_app_accounts
    set bbc_entry_seen_at = coalesce(bbc_entry_seen_at, now())
  where token = p_token::uuid
  returning true into v_found;
  return coalesce(v_found, false);
end;
$$;
revoke all on function public.mark_bbc_entry_seen(text) from public;
grant execute on function public.mark_bbc_entry_seen(text) to anon, authenticated;
