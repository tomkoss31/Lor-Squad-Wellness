-- =============================================================================
-- Chantier #11 (2026-05-18) — Témoignages clients vérifiés
-- =============================================================================
-- Sprint 1 : table + RLS + index + trigger updated_at.
-- L'edge fn submit-testimonial fait l'INSERT en service_role (pas de policy
-- publique INSERT). Le client est identifie par client_app_accounts.token.
-- =============================================================================

begin;

create table if not exists public.client_testimonials (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients(id) on delete cascade,
  client_token uuid not null,   -- snapshot client_app_accounts.token au moment de la creation
  coach_user_id uuid references public.users(id) on delete set null,

  -- Contenu
  content text not null check (char_length(content) between 10 and 1000),
  rating int not null check (rating between 1 and 5),

  -- Photo (V2 plus tard)
  photo_consent boolean not null default false,
  photo_url text,

  -- Localisation (preparation i18n chantier #5)
  language text not null default 'fr' check (language in ('fr','en','es','pt','tr','hi','de','it','ar')),

  -- Moderation admin
  status text not null default 'pending' check (status in ('pending','approved','rejected')),
  approved_at timestamptz,
  approved_by uuid references public.users(id) on delete set null,
  rejected_reason text,

  -- Meta
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Index : lecture publique des approved par langue
create index if not exists idx_testimonials_status_lang
  on public.client_testimonials (status, language, created_at desc)
  where status = 'approved';

-- Index : lookup par client (anti-doublon, fetch coach)
create index if not exists idx_testimonials_client
  on public.client_testimonials (client_id);

-- Index : lecture coach
create index if not exists idx_testimonials_coach
  on public.client_testimonials (coach_user_id, status, created_at desc)
  where coach_user_id is not null;

-- ─── RLS ──────────────────────────────────────────────────────────────────────
alter table public.client_testimonials enable row level security;

-- SELECT public uniquement pour les approved (carousel /bilan-online, /business, newsletter)
drop policy if exists "testimonials_public_select_approved" on public.client_testimonials;
create policy "testimonials_public_select_approved"
  on public.client_testimonials
  for select
  to anon, authenticated
  using (status = 'approved');

-- SELECT pour le coach proprietaire OU admin (toutes les statuts)
drop policy if exists "testimonials_coach_admin_select_own" on public.client_testimonials;
create policy "testimonials_coach_admin_select_own"
  on public.client_testimonials
  for select
  to authenticated
  using (
    coach_user_id = auth.uid()
    or exists (
      select 1 from public.users u
      where u.id = auth.uid()
        and u.active = true
        and u.role = 'admin'
    )
  );

-- UPDATE admin only (moderation : approve / reject)
drop policy if exists "testimonials_admin_update" on public.client_testimonials;
create policy "testimonials_admin_update"
  on public.client_testimonials
  for update
  to authenticated
  using (
    exists (
      select 1 from public.users u
      where u.id = auth.uid()
        and u.active = true
        and u.role = 'admin'
    )
  )
  with check (
    exists (
      select 1 from public.users u
      where u.id = auth.uid()
        and u.active = true
        and u.role = 'admin'
    )
  );

-- INSERT : aucune policy publique. L'edge fn submit-testimonial utilise
-- service_role apres validation du client_token contre client_app_accounts.

-- ─── Trigger updated_at ──────────────────────────────────────────────────────
create or replace function public.touch_client_testimonials_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists client_testimonials_set_updated_at on public.client_testimonials;
create trigger client_testimonials_set_updated_at
  before update on public.client_testimonials
  for each row
  execute function public.touch_client_testimonials_updated_at();

-- ─── Commentaires ────────────────────────────────────────────────────────────
comment on table public.client_testimonials is
  'Temoignages clients verifies (chantier #11, 2026-05-18). Affichage public
  uniquement pour status=approved. Soumis via edge fn submit-testimonial avec
  validation client_token contre client_app_accounts. Anti-doublon : 1 actif
  (pending OU approved) par client_id.';
comment on column public.client_testimonials.client_token is
  'Snapshot du client_app_accounts.token au moment de la creation. Permet
  de retracer le contexte sans depender d''un token actif futur.';
comment on column public.client_testimonials.language is
  'ISO 639-1 prepare i18n chantier #5. V1 = fr uniquement.';
comment on column public.client_testimonials.status is
  'pending (soumis non valide) | approved (visible public) | rejected (admin).';

commit;
