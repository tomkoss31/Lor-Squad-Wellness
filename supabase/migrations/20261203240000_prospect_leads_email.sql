-- =============================================================================
-- Chantier Colis (2026-07-08) — email sur prospect_leads.
--
-- Nécessaire pour le funnel /colis : email obligatoire sur la page de
-- remerciement du tunnel (en plus du téléphone déjà capturé). Réutilisé plus
-- tard comme segment newsletter dédié « leads colis » (chantier différé,
-- décision Thomas 2026-07-08 : pas maintenant).
--
-- Additif pur : ne touche aucune colonne existante. Les 4 réponses du
-- questionnaire colis (énergie/sommeil/objectif/dispo) et le choix de fin de
-- tunnel (rdv/bilan/email_only) vivent dans la colonne `metadata` jsonb déjà
-- existante — pas de nouvelle colonne nécessaire pour ça.
-- =============================================================================

alter table public.prospect_leads
  add column if not exists email text;

comment on column public.prospect_leads.email is
  'Email du lead. Obligatoire sur le funnel /colis (chantier 2026-07-08) ; '
  'optionnel/absent pour les autres sources historiques. Format non contraint '
  'en base (validation côté formulaire) pour rester tolérant aux imports.';
