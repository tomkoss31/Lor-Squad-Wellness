-- =============================================================================
-- Distri uplink Herbalife — rang hors-app (2026-05-21, fix Thomas)
--
-- Cas usage : le distri uplink HL réel n'existe pas dans la table `users`
-- (ancienne distri jamais utilisée par l'app, lignée historique). On veut
-- pouvoir saisir librement son nom + son rang sans devoir créer un user.
--
-- Nouvelle colonne `clients.herbalife_uplink_rank` (text, optionnelle).
-- Priorité résolution dans la RPC :
--   1. Si `herbalife_uplink_user_id` non-null → rang du user pointé
--   2. Sinon si `herbalife_uplink_rank` non-null → ce rang directement
--   3. Sinon → rang du viewer (cas standard)
-- =============================================================================

begin;

alter table public.clients
  add column if not exists herbalife_uplink_rank text null;

comment on column public.clients.herbalife_uplink_rank is
  'Chantier uplink HL (2026-05-21) : rang Herbalife de l''uplink hors-app. Utilisé seulement si herbalife_uplink_user_id est NULL (uplink saisi librement sans être créé comme user). Valeurs : distributor_25 / senior_consultant_35 / success_builder_42 / supervisor_50 / ...';

commit;
