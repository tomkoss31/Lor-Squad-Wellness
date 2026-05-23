-- =============================================================================
-- Chantier #8 (2026-05-23) — Newsletter "La Base 360 News" (bi-mensuel).
--
-- Étape 8.1 du brainstorm Égypte 2026-05 :
--   - 3 tables : newsletters / newsletter_recipients / newsletter_briefs
--   - RLS : read public (page web /news/:slug) + read/write admin
--   - Audience V1 = unique (clients + distri) ; champ gardé pour future split
--   - Frequency : bi-mensuel (6/an) ; pas de cron en V1, déclenchement manuel
--
-- Décisions actées (cf. CLAUDE.md et brainstorm dump #4) :
--   - Teaser pour version publique (soft-paywall via is_public_section JSON)
--   - 4 templates saisonniers + 8 neutres (table newsletter_briefs)
--   - Slug racine /news
--
-- Idempotent : ok à rejouer.
-- =============================================================================

-- ─── 1. Table newsletters ─────────────────────────────────────────────────────
create table if not exists public.newsletters (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  slug text not null unique,
  subtitle text,
  -- Contenu structuré : { sections: [{ id, title, body_md, is_public }, ...] }
  body_json jsonb not null default '{"sections":[]}'::jsonb,
  -- Snapshot HTML compilé au moment "Envoyer" (figé, sert pour email + web)
  body_html text,
  -- URL bucket Supabase pour le PDF généré (étape 8.12)
  pdf_url text,
  -- Image 1200×630 OG/Twitter card (étape 8.8)
  preview_image_url text,
  audience text not null default 'all'
    check (audience in ('clients', 'distri', 'all')),
  status text not null default 'draft'
    check (status in ('draft', 'scheduled', 'sent', 'archived')),
  -- True = page /news/:slug accessible publiquement (lead-magnet)
  is_public boolean not null default true,
  -- Clé template saisonnier (cf. newsletter_briefs.key)
  template_key text,
  scheduled_for timestamptz,
  sent_at timestamptz,
  sent_by_user_id uuid references public.users(id) on delete set null,
  created_by_user_id uuid references public.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  -- Analytics agrégées (incrémentées par webhooks/handlers)
  view_count integer not null default 0,
  bilan_cta_clicks integer not null default 0,
  business_cta_clicks integer not null default 0,
  email_open_count integer not null default 0,
  email_click_count integer not null default 0
);

comment on table public.newsletters is
  'Chantier #8 (2026-05-23) : newsletter bi-mensuelle "La Base 360 News".
   1 ligne = 1 édition (ex: "Préparation été — juin 2026").
   Audience V1 unique clients+distri (audience=''all''), kept field for future split.';
comment on column public.newsletters.body_json is
  'Sections structurées éditées dans /admin/newsletters/:id/edit.
   Shape: { sections: [{ id, title, body_md, is_public, position }, ...] }.
   is_public=false → masqué en page publique (teaser paywall).';
comment on column public.newsletters.body_html is
  'Snapshot HTML compilé au moment Envoyer (figé). Sert pour email Resend
   ET rendu page web /news/:slug. Évite drift si édition après envoi.';
comment on column public.newsletters.is_public is
  'True = page web /news/:slug accessible sans auth (lead-magnet).
   False = newsletter privée clients/distri uniquement.';

create index if not exists idx_newsletters_status_sent
  on public.newsletters(status, sent_at desc);
create index if not exists idx_newsletters_public_sent
  on public.newsletters(slug)
  where status = 'sent' and is_public = true;

-- Trigger updated_at
create or replace function public.newsletters_touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists trg_newsletters_touch on public.newsletters;
create trigger trg_newsletters_touch
  before update on public.newsletters
  for each row
  execute function public.newsletters_touch_updated_at();

-- ─── 2. Table newsletter_recipients ───────────────────────────────────────────
-- Tracking par destinataire : open / clicks / Resend message_id.
create table if not exists public.newsletter_recipients (
  id uuid primary key default gen_random_uuid(),
  newsletter_id uuid not null references public.newsletters(id) on delete cascade,
  -- 'client' = entrée venant de clients ; 'distri' = users role distributor/admin
  recipient_type text not null check (recipient_type in ('client', 'distri')),
  -- text pour cross-type safety (cf. règle RLS du 25/04 dans CLAUDE.md)
  recipient_id text not null,
  email text not null,
  sent_at timestamptz not null default now(),
  delivered_at timestamptz,
  opened_at timestamptz,
  clicked_bilan_at timestamptz,
  clicked_business_at timestamptz,
  bounced_at timestamptz,
  -- Provider message id (Resend) pour matcher les webhooks
  resend_message_id text,
  unique (newsletter_id, recipient_type, recipient_id)
);

comment on table public.newsletter_recipients is
  'Chantier #8 : 1 ligne = 1 envoi à 1 destinataire. Open/click trackés
   via webhooks Resend (étape 8.6). recipient_id en text pour éviter
   cast cross-type (clients.id uuid vs users.id uuid, mais on garde text
   pour cohérence avec client_app_accounts pattern).';

create index if not exists idx_newsletter_recipients_newsletter
  on public.newsletter_recipients(newsletter_id, sent_at desc);
create index if not exists idx_newsletter_recipients_resend_msg
  on public.newsletter_recipients(resend_message_id)
  where resend_message_id is not null;

-- ─── 3. Table newsletter_briefs (templates saisonniers) ──────────────────────
-- 4 saisonniers + 8 neutres (décision D4.3 brainstorm).
create table if not exists public.newsletter_briefs (
  id uuid primary key default gen_random_uuid(),
  key text not null unique,
  label text not null,
  season text check (season in ('spring', 'summer', 'autumn', 'winter', 'neutral')),
  default_subtitle text,
  default_sections jsonb not null default '[]'::jsonb,
  default_cta_bilan_text text,
  default_cta_business_text text,
  is_seasonal boolean not null default false,
  active boolean not null default true,
  position integer not null default 0,
  created_at timestamptz not null default now()
);

comment on table public.newsletter_briefs is
  'Chantier #8 : templates pré-remplis pour création rapide d''une
   newsletter. 4 saisonniers (summer-prep / back-to-school / winter-immunity
   / new-year-fresh) + 8 neutres mensuels. Seedés en étape 8.11.';

-- ─── 4. RLS ───────────────────────────────────────────────────────────────────
alter table public.newsletters enable row level security;
alter table public.newsletter_recipients enable row level security;
alter table public.newsletter_briefs enable row level security;

-- Newsletters : lecture publique uniquement pour status=sent + is_public=true
drop policy if exists "newsletters_public_read" on public.newsletters;
create policy "newsletters_public_read"
  on public.newsletters
  for select
  using (status = 'sent' and is_public = true);

-- Newsletters : read complet pour distri/admin (drafts inclus)
drop policy if exists "newsletters_admin_read" on public.newsletters;
create policy "newsletters_admin_read"
  on public.newsletters
  for select
  to authenticated
  using (
    exists (
      select 1 from public.users u
      where u.id = auth.uid()
        and u.active = true
        and u.role in ('distributor', 'admin', 'referent')
    )
  );

-- Newsletters : write admin uniquement (création + édition + envoi)
drop policy if exists "newsletters_admin_write" on public.newsletters;
create policy "newsletters_admin_write"
  on public.newsletters
  for all
  to authenticated
  using (
    exists (
      select 1 from public.users u
      where u.id = auth.uid()
        and u.role = 'admin'
    )
  )
  with check (
    exists (
      select 1 from public.users u
      where u.id = auth.uid()
        and u.role = 'admin'
    )
  );

-- newsletter_recipients : admin only (pas de read public — RGPD)
drop policy if exists "newsletter_recipients_admin_all" on public.newsletter_recipients;
create policy "newsletter_recipients_admin_all"
  on public.newsletter_recipients
  for all
  to authenticated
  using (
    exists (
      select 1 from public.users u
      where u.id = auth.uid()
        and u.role = 'admin'
    )
  )
  with check (
    exists (
      select 1 from public.users u
      where u.id = auth.uid()
        and u.role = 'admin'
    )
  );

-- newsletter_briefs : read pour tous les authentifiés (admin l'utilise dans l'éditeur)
drop policy if exists "newsletter_briefs_auth_read" on public.newsletter_briefs;
create policy "newsletter_briefs_auth_read"
  on public.newsletter_briefs
  for select
  to authenticated
  using (active = true);

drop policy if exists "newsletter_briefs_admin_write" on public.newsletter_briefs;
create policy "newsletter_briefs_admin_write"
  on public.newsletter_briefs
  for all
  to authenticated
  using (
    exists (
      select 1 from public.users u
      where u.id = auth.uid()
        and u.role = 'admin'
    )
  )
  with check (
    exists (
      select 1 from public.users u
      where u.id = auth.uid()
        and u.role = 'admin'
    )
  );

-- ─── 5. Seed test : 1 newsletter brouillon visible dès la migration ──────────
-- Permet de tester immédiatement la query "list newsletters" sans passer
-- par la page admin (pas encore livrée — étape 8.3).
insert into public.newsletters (title, slug, subtitle, status, is_public, body_json)
values (
  'Préparation été — juin/juillet 2026',
  'preparation-ete-2026',
  'Hydratation, repas légers, voyages, bouger en vacances',
  'draft',
  true,
  jsonb_build_object(
    'sections', jsonb_build_array(
      jsonb_build_object(
        'id', 'hydration',
        'title', 'Hydratation & soleil',
        'body_md', 'Brouillon — sera rédigé en étape 8.12.',
        'is_public', true,
        'position', 1
      )
    )
  )
)
on conflict (slug) do nothing;
