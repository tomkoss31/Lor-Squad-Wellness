-- Chantier Invitation distributeur V2 (2026-04-24).
-- Ajoute le support "lite / sponsor" au flow existant :
-- un distri (pas juste un admin) peut inviter un filleul juste avec
-- prénom + téléphone ; l'invité saisit email + nom + mot de passe
-- lui-même pendant le wizard.
--
-- Idempotent : ok à rejouer.

alter table public.distributor_invitation_tokens
  add column if not exists phone text,
  add column if not exists variant text not null default 'admin';

-- Constraint sur variant : 'admin' (flow existant : email pré-rempli)
-- ou 'sponsor' (nouveau flow V2 : invité saisit email lui-même).
do $$
begin
  if not exists (
    select 1 from information_schema.table_constraints
    where table_schema = 'public'
      and table_name = 'distributor_invitation_tokens'
      and constraint_name = 'distri_invite_variant_check'
  ) then
    alter table public.distributor_invitation_tokens
      add constraint distri_invite_variant_check
      check (variant in ('admin', 'sponsor'));
  end if;
end$$;

-- Email devient nullable (en flow sponsor, l'invité choisit son email).
do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public'
      and table_name = 'distributor_invitation_tokens'
      and column_name = 'email'
      and is_nullable = 'NO'
  ) then
    alter table public.distributor_invitation_tokens alter column email drop not null;
  end if;
end$$;

-- RLS V2 : tout distributeur actif peut créer une invitation sponsor
-- (plus seulement admin). La policy existante "distri_invite_admin_manage"
-- reste pour le flow admin.
drop policy if exists "distri_invite_sponsor_create" on public.distributor_invitation_tokens;
create policy "distri_invite_sponsor_create"
  on public.distributor_invitation_tokens
  for insert
  to authenticated
  with check (
    variant = 'sponsor'
    and sponsor_id = auth.uid()
    and exists (
      select 1 from public.users u
      where u.id = auth.uid() and u.active = true
    )
  );

drop policy if exists "distri_invite_sponsor_read_own" on public.distributor_invitation_tokens;
create policy "distri_invite_sponsor_read_own"
  on public.distributor_invitation_tokens
  for select
  to authenticated
  using (
    sponsor_id = auth.uid()
    or public.is_admin()
  );

drop policy if exists "distri_invite_sponsor_delete_own" on public.distributor_invitation_tokens;
create policy "distri_invite_sponsor_delete_own"
  on public.distributor_invitation_tokens
  for delete
  to authenticated
  using (
    sponsor_id = auth.uid()
    or public.is_admin()
  );

comment on column public.distributor_invitation_tokens.phone is
  'Téléphone de l''invité (flow sponsor) pour lien WhatsApp.';
comment on column public.distributor_invitation_tokens.variant is
  'admin = flow admin (email pré-rempli) · sponsor = flow sponsor lite (invité saisit email).';
