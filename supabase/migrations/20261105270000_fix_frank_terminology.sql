-- =============================================================================
-- Fix terminologie FRANK officielle (2026-05-05)
--
-- Erreur ma part : j'avais écrit "Famille / Réseau / Amis / Nouveaux /
-- Konnaissances" partout. La bonne version Lor'Squad est :
--   F = Family
--   R = Relations
--   A = Amis
--   N = Network
--   K = Kids' parents
--
-- On ne touche PAS la value DB de liste_100_contacts.frank_category (elle
-- reste 'famille', 'reseau', 'amis', 'nouveaux', 'connaissances') pour ne
-- pas casser les rows existantes. Seuls les LABELS UI changent (gérés
-- côté front dans LISTE_100_FRANK_META).
--
-- Cette migration met à jour uniquement le BODY de l'annonce
-- "Formation : Méthode FRANK & ma Liste 100" pour qu'elle reflète la
-- bonne terminologie quand un user clique dessus.
-- =============================================================================

begin;

update public.app_announcements
set body = 'Nouveau module M1.E : 5 leçons + quiz pour construire ta Liste 100 sans rien oublier (Family / Relations / Amis / Network / Kids'' parents), tagger chaque contact en chaud/tiède/froid, et faire vivre ta liste comme un funnel de prospection chaude.'
where title = 'Formation : Méthode FRANK & ma Liste 100';

commit;
