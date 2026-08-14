-- =============================================================================
-- Socle « Campagnes » — chantier 2026-08 (maquette validée par Thomas 2026-07-31).
--
-- Généralise le moteur newsletter (déjà en prod) pour de l'outreach email :
-- audiences arbitraires (import CSV / bilans online / clients), 2 types
-- (riche brandé réutilisant newsletter-html.ts, texte perso façon
-- lead-relaunch), tracking par destinataire, désabonnement global.
--
-- 3 tables :
--   campaigns            — la campagne (contenu, statut, compteurs agrégés)
--   campaign_recipients  — un destinataire + son tracking (miroir de
--                          newsletter_recipients, pour que le webhook Resend
--                          se généralise sans réinventer la forme)
--   email_suppressions   — liste de suppression GLOBALE : un désabonné est
--                          exclu de TOUTE campagne future, pour toujours
--                          (décision Thomas). Alimentée par la page de
--                          désinscription + les bounces/plaintes Resend.
--
-- SÉCURITÉ (les 7 règles, CLAUDE.md § Sécurité) :
--   - RLS activé sur les 3 tables ;
--   - anon N'A AUCUN droit (révoqué) : ces tables sont un outil admin interne.
--     La page publique de désinscription et le webhook écrivent en
--     service_role via edge function, jamais en anon direct ;
--   - policies admin-only via is_admin() (SECURITY DEFINER → pas de récursion,
--     pas de sous-requête inline sur une table dans sa propre policy) ;
--   - aucune policy « to public » / USING (true).
-- =============================================================================

-- ─── 1. campaigns ───────────────────────────────────────────────────────────
create table if not exists public.campaigns (
  id                  uuid primary key default gen_random_uuid(),
  title               text not null default 'Sans titre',
  type                text not null default 'rich' check (type in ('rich', 'plain')),
  subject             text not null default '',
  -- rich : sections (même forme que newsletters.body_json / NewsletterSection)
  body_json           jsonb not null default '[]'::jsonb,
  -- plain : la lettre en texte brut (type 'plain')
  body_text           text not null default '',
  audience_label      text not null default '',
  status              text not null default 'draft'
                        check (status in ('draft', 'scheduled', 'sending', 'sent', 'archived')),
  scheduled_for       timestamptz,
  sent_at             timestamptz,
  from_email          text not null default 'bonjour@labase360.fr',
  reply_to            text not null default 'labaseverdun@gmail.com',
  -- compteurs agrégés (dénormalisés, mis à jour par le webhook — comme
  -- newsletters.email_open_count) pour afficher les stats sans agréger 600 lignes
  recipient_count     integer not null default 0,
  delivered_count     integer not null default 0,
  opened_count        integer not null default 0,
  clicked_count       integer not null default 0,
  bounced_count       integer not null default 0,
  unsubscribed_count  integer not null default 0,
  created_by_user_id  uuid references public.users(id) on delete set null,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

comment on table public.campaigns is
  'Campagnes email (outreach interne). Généralise le moteur newsletter. Outil admin. Maquette validée 2026-07-31.';

-- ─── 2. campaign_recipients ─────────────────────────────────────────────────
create table if not exists public.campaign_recipients (
  id                  uuid primary key default gen_random_uuid(),
  campaign_id         uuid not null references public.campaigns(id) on delete cascade,
  email               text not null,
  first_name          text,                 -- personnalisation « Bonjour {prénom} »
  source              text not null default 'csv'
                        check (source in ('csv', 'online_bilan', 'client', 'manual')),
  source_ref          text,                 -- id d'origine (online_bilans.id, clients.id…)
  -- tracking par destinataire (miroir newsletter_recipients)
  sent_at             timestamptz,
  delivered_at        timestamptz,
  opened_at           timestamptz,
  clicked_at          timestamptz,
  bounced_at          timestamptz,
  unsubscribed_at     timestamptz,
  resend_message_id   text,                 -- clé de correspondance pour le webhook Resend
  send_error          text,
  created_at          timestamptz not null default now(),
  unique (campaign_id, email)               -- un email une seule fois par campagne (dédup)
);

comment on table public.campaign_recipients is
  'Un destinataire d''une campagne + son tracking (delivered/opened/clicked/bounced/unsubscribed). Miroir de newsletter_recipients.';

-- Index : lookup webhook par resend_message_id, et parcours par campagne.
create index if not exists campaign_recipients_campaign_idx on public.campaign_recipients (campaign_id);
create index if not exists campaign_recipients_resend_idx on public.campaign_recipients (resend_message_id) where resend_message_id is not null;

-- ─── 3. email_suppressions (liste de suppression GLOBALE) ───────────────────
-- email en lower(trim(...)) applicatif ; on garde la contrainte d'unicité sur
-- l'expression normalisée pour qu'un même contact ne puisse pas réapparaître.
create table if not exists public.email_suppressions (
  id           uuid primary key default gen_random_uuid(),
  email        text not null,
  reason       text not null default 'unsubscribed'
                 check (reason in ('unsubscribed', 'bounced', 'complained', 'manual')),
  campaign_id  uuid references public.campaigns(id) on delete set null,  -- d'où ça vient
  created_at   timestamptz not null default now()
);

create unique index if not exists email_suppressions_email_uidx
  on public.email_suppressions (lower(btrim(email)));

comment on table public.email_suppressions is
  'Liste de suppression GLOBALE : un email ici est exclu de TOUTE campagne future, définitivement. Alimentée par la page de désinscription + bounces/plaintes Resend.';

-- ─── Sécurité : RLS + révocation anon + policies admin-only ─────────────────
alter table public.campaigns            enable row level security;
alter table public.campaign_recipients  enable row level security;
alter table public.email_suppressions   enable row level security;

-- anon n'a rien à faire ici (outil admin ; l'écriture publique passe par edge
-- function en service_role). On révoque tout, DELETE/UPDATE/TRUNCATE compris.
revoke all on public.campaigns           from anon;
revoke all on public.campaign_recipients from anon;
revoke all on public.email_suppressions  from anon;

-- Admin only, via is_admin() (SECURITY DEFINER, contourne le RLS → pas de
-- récursion, pas de sous-requête inline dans la policy).
create policy campaigns_admin_all on public.campaigns
  for all to authenticated using (is_admin()) with check (is_admin());

create policy campaign_recipients_admin_all on public.campaign_recipients
  for all to authenticated using (is_admin()) with check (is_admin());

create policy email_suppressions_admin_all on public.email_suppressions
  for all to authenticated using (is_admin()) with check (is_admin());
