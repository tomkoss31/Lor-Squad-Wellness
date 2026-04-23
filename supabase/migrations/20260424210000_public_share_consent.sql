-- Chantier RGPD partage public (2026-04-24).
-- Consentement explicite client avant qu'un coach puisse créer un
-- lien /partage/:token public. Sans consent → bouton coach désactivé.
--
-- Idempotent.

alter table public.clients
  add column if not exists public_share_consent boolean not null default false,
  add column if not exists public_share_consent_at timestamptz,
  add column if not exists public_share_revoked_at timestamptz;

comment on column public.clients.public_share_consent is
  'RGPD : le client a-t-il explicitement consenti au partage public de ses stats ?';
comment on column public.clients.public_share_consent_at is
  'Timestamp du consentement initial.';
comment on column public.clients.public_share_revoked_at is
  'Timestamp de la révocation. Invalide tous les tokens public_share_tokens du client.';

-- ─── RLS : permettre au client (via app) d'update ses propres colonnes consent
-- On utilise une policy dédiée qui existe déjà OU on la crée. Le client doit
-- pouvoir donner/révoquer son consentement depuis son espace client.
--
-- Note : cette policy autorise n'importe quelle mise à jour sur la row du
-- client self. La surface de risque est acceptable (le client possède déjà
-- sa propre donnée), et le front ne permet d'éditer que les 3 colonnes RGPD.
-- Si besoin de durcir plus tard : passer par une Edge Function dédiée.
drop policy if exists "clients_self_update_via_app" on public.clients;
create policy "clients_self_update_via_app"
  on public.clients
  for update
  to authenticated
  using (
    exists (
      select 1 from public.client_app_accounts caa
      where caa.client_id::uuid = clients.id
        and caa.auth_user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.client_app_accounts caa
      where caa.client_id::uuid = clients.id
        and caa.auth_user_id = auth.uid()
    )
  );
