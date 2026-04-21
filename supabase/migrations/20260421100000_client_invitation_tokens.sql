-- =============================================================================
-- Chantier Lien d'invitation client app (2026-04-21)
--
-- Flow :
--   1. Coach clique "Envoyer le lien d'accès" sur la fiche → INSERT dans
--      client_invitation_tokens avec expires_at = now() + 7 days.
--   2. Client reçoit le lien par WhatsApp/SMS, clique, atterrit sur
--      /bienvenue?token=XYZ.
--   3. L'Edge Function validate-invitation-token confirme la validité et
--      renvoie { has_email_on_record } pour que le front sache quel cas
--      afficher (mot de passe simple OU explication + email + mot de passe).
--   4. Client soumet → Edge Function consume-invitation-token crée l'auth
--      user, met à jour la fiche (email si vide), garantit l'existence d'un
--      client_app_accounts avec auth_user_id populé, marque le token
--      consommé et retourne session + token long-lived pour redirect.
--
-- À EXÉCUTER DANS SUPABASE STUDIO → SQL EDITOR.
-- =============================================================================

-- ─── Nouvelle table : invitation tokens ─────────────────────────────────────
create table if not exists public.client_invitation_tokens (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients(id) on delete cascade,
  token text not null unique,
  created_by uuid not null references public.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null,
  consumed_at timestamptz
);

create index if not exists idx_client_invitation_tokens_token
  on public.client_invitation_tokens(token);

create index if not exists idx_client_invitation_tokens_client
  on public.client_invitation_tokens(client_id);

-- Helper: un seul token actif par client à la fois (non expiré, non consommé).
-- Pas d'unique constraint stricte (on veut garder l'historique), le code
-- front/edge marque l'ancien comme consumed_at quand on en crée un nouveau.

comment on table public.client_invitation_tokens is
  'Chantier invitation client app (2026-04-21) : lien magique 7 jours pour '
  'que le client crée son accès (mot de passe, et email si pas encore en fiche). '
  'Consommé une seule fois, tracé via consumed_at.';

-- ─── RLS ────────────────────────────────────────────────────────────────────
alter table public.client_invitation_tokens enable row level security;

-- Le coach propriétaire (via can_access_owner) peut gérer les tokens de ses
-- clients (création / lecture / invalidation). La validation et la
-- consommation côté client se font via Edge Function en service role, donc
-- pas besoin de policy publique.
drop policy if exists "invit_coach_manage" on public.client_invitation_tokens;
create policy "invit_coach_manage"
  on public.client_invitation_tokens
  for all
  to authenticated
  using (
    exists (
      select 1 from public.clients c
      where c.id = client_invitation_tokens.client_id
        and public.is_active_user()
        and public.can_access_owner(c.distributor_id)
    )
  )
  with check (
    exists (
      select 1 from public.clients c
      where c.id = client_invitation_tokens.client_id
        and public.is_active_user()
        and public.can_access_owner(c.distributor_id)
    )
  );

-- ─── Extension client_app_accounts : lien vers auth.users ───────────────────
-- Le chantier Access Client existant utilise un token UUID comme magic link
-- (URL /client/:token). Le nouveau flow crée en plus un vrai user auth.users
-- lié à cette ligne via auth_user_id → permet l'auto-login et l'évolution
-- future vers une vraie zone authentifiée.
alter table public.client_app_accounts
  add column if not exists auth_user_id uuid
  references auth.users(id) on delete set null;

create index if not exists idx_client_app_accounts_auth_user
  on public.client_app_accounts(auth_user_id);

comment on column public.client_app_accounts.auth_user_id is
  'Chantier invitation client app (2026-04-21) : lien vers auth.users quand '
  'le client a créé son compte via /bienvenue. Null pour les accès token-only '
  'legacy.';
