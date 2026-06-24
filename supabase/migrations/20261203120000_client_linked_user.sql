-- Lien fiche cliente <-> compte coach/distri (chantier 2026-06-24).
--
-- Une cliente devenue coach (ex. Judith) reste suivie sur sa fiche "forme",
-- mais ses commandes doivent compter sur SON volume distri (sa qualification),
-- pas comme une vente cliente chez son parrain. Ce lien permet :
--   - badge "aussi distri" + avertissement dans le panier,
--   - raccourci vers la saisie PV equipe,
--   - (futur) routage automatique du volume.
--
-- Colonne TEXT (pas de FK / pas de cast ::uuid) pour rester aligne avec
-- distributor_id (text) et eviter les pieges RLS de cast cross-type
-- documentes dans CLAUDE.md.
alter table public.clients
  add column if not exists linked_user_id text null;

comment on column public.clients.linked_user_id is
  'Si cette fiche cliente est aussi un compte coach/distri (users.id, en text). NULL sinon. Sert au badge + avertissement PV dans le panier (chantier 2026-06-24).';
