-- =============================================================================
-- Chantier #7 V2 (2026-05-17) — Extension prospect_leads pour popup lead
-- capture sur /business + traçabilité UTM + coach_slug.
-- =============================================================================
--
-- Ces colonnes étaient stockées en metadata jsonb dans la V1. On les remonte
-- en colonnes typées pour pouvoir requêter en SQL natif (ex : taux de consent,
-- répartition referral_source par mois, leads par coach via slug).
--
-- Idempotent : ok à rejouer.
-- =============================================================================

alter table public.prospect_leads
  add column if not exists referral_source text,
  add column if not exists consent_recontact boolean default false,
  add column if not exists coach_slug text,
  add column if not exists utm_source text,
  add column if not exists utm_medium text,
  add column if not exists utm_campaign text;

comment on column public.prospect_leads.referral_source is
  'Texte libre saisi par le lead via popup lead capture chantier #7.X
  (« Tu nous as trouvé·e comment ? » — Insta / FB / ami / autre).';
comment on column public.prospect_leads.consent_recontact is
  'Consentement explicite RGPD pour recontact. Obligatoirement true via
  popup lead capture (case à cocher requise).';
comment on column public.prospect_leads.coach_slug is
  'Slug du coach via ?ref= si la page /business était partagée par un
  partenaire. Résolu vers referrer_user_id côté edge fn.';
comment on column public.prospect_leads.utm_source is
  'utm_source capturé depuis l''URL de la page /business (campagnes externes).';
comment on column public.prospect_leads.utm_medium is
  'utm_medium capturé depuis l''URL de la page /business.';
comment on column public.prospect_leads.utm_campaign is
  'utm_campaign capturé depuis l''URL de la page /business.';

-- Index pour requêter "leads par source de referral ce mois"
create index if not exists idx_prospect_leads_referral_source_created
  on public.prospect_leads(referral_source, created_at desc)
  where referral_source is not null;
