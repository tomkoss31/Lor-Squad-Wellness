-- =============================================================================
-- Chantier colis (2026-07-08) — 3ᵉ audience newsletter : "leads_colis".
--
-- Additif pur, opt-in explicite : les audiences existantes ('clients',
-- 'distri', 'all') sont INCHANGÉES (all = clients+distri, comme avant).
-- 'leads_colis' est une nouvelle valeur distincte, jamais incluse dans 'all'
-- automatiquement — un envoi à cette audience est toujours un choix explicite
-- de l'admin.
--
-- Cible : prospect_leads où source='colis' et email renseigné.
-- =============================================================================

alter table public.newsletters
  drop constraint if exists newsletters_audience_check;
alter table public.newsletters
  add constraint newsletters_audience_check
  check (audience in ('clients', 'distri', 'all', 'leads_colis'));

alter table public.newsletter_recipients
  drop constraint if exists newsletter_recipients_recipient_type_check;
alter table public.newsletter_recipients
  add constraint newsletter_recipients_recipient_type_check
  check (recipient_type in ('client', 'distri', 'lead'));

comment on constraint newsletters_audience_check on public.newsletters is
  'V1 clients/distri/all inchangé. leads_colis = nouvelle audience opt-in '
  '(prospect_leads source=colis avec email), jamais incluse dans all.';
