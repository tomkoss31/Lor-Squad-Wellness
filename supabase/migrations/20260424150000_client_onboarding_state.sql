-- =============================================================================
-- Chantier Tuto interactif client (2026-04-24)
--
-- Ajout de 3 colonnes sur client_app_accounts pour persister l'état du tuto
-- onboarding côté DB (synchronisé avec localStorage pour fluidité offline).
-- RPC SECURITY DEFINER set_client_onboarding_state_by_token pour que l'app
-- client anon (authentifiée via magic-link token) puisse mettre à jour son
-- propre état sans policy permissive directe.
--
-- À EXÉCUTER DANS SUPABASE STUDIO → SQL EDITOR.
-- =============================================================================

begin;

alter table public.client_app_accounts
  add column if not exists onboarding_completed_at timestamptz,
  add column if not exists onboarding_skipped_at timestamptz,
  add column if not exists onboarding_last_step integer default 0;

create index if not exists idx_client_app_accounts_onboarding_pending
  on public.client_app_accounts(onboarding_completed_at, onboarding_skipped_at)
  where onboarding_completed_at is null and onboarding_skipped_at is null;

comment on column public.client_app_accounts.onboarding_completed_at is
  'Chantier Tuto interactif client (2026-04-24) : timestamp de fin du tuto.';
comment on column public.client_app_accounts.onboarding_skipped_at is
  'Chantier Tuto interactif client (2026-04-24) : timestamp du skip volontaire.';
comment on column public.client_app_accounts.onboarding_last_step is
  'Chantier Tuto interactif client (2026-04-24) : progression 0-6, permet de reprendre.';

-- RPC : set état onboarding par token magic-link (app client anon).
-- Accepte les 3 actions possibles via des booléens :
--   p_mark_completed = true → set completed_at = now()
--   p_mark_skipped = true   → set skipped_at = now()
--   p_last_step              → met à jour la progression
create or replace function public.set_client_onboarding_state_by_token(
  p_token uuid,
  p_mark_completed boolean default false,
  p_mark_skipped boolean default false,
  p_last_step integer default null
)
returns boolean
language plpgsql
security definer
as $$
declare
  v_id uuid;
begin
  select id into v_id
  from public.client_app_accounts
  where token = p_token
    and (expires_at is null or expires_at > now())
  limit 1;

  if v_id is null then
    return false;
  end if;

  update public.client_app_accounts
  set
    onboarding_completed_at = case
      when p_mark_completed then now()
      else onboarding_completed_at
    end,
    onboarding_skipped_at = case
      when p_mark_skipped then now()
      else onboarding_skipped_at
    end,
    onboarding_last_step = coalesce(p_last_step, onboarding_last_step)
  where id = v_id;

  return true;
end;
$$;

grant execute on function public.set_client_onboarding_state_by_token(uuid, boolean, boolean, integer) to anon, authenticated;

-- Extension de la RPC get_client_messages_by_token pour renvoyer aussi
-- l'état onboarding ? Non — on va étendre get_client_assessment_by_token
-- ou utiliser une RPC dédiée pour plus de clarté.

create or replace function public.get_client_onboarding_state_by_token(p_token uuid)
returns table (
  completed_at timestamptz,
  skipped_at timestamptz,
  last_step integer
)
language plpgsql
security definer
as $$
begin
  return query
    select
      onboarding_completed_at,
      onboarding_skipped_at,
      onboarding_last_step
    from public.client_app_accounts
    where token = p_token
      and (expires_at is null or expires_at > now())
    limit 1;
end;
$$;

grant execute on function public.get_client_onboarding_state_by_token(uuid) to anon, authenticated;

commit;
