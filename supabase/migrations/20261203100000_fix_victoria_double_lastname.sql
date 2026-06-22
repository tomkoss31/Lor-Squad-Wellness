-- =============================================================================
-- Fix data : nom de famille dupliqué (2026-06-16, demande Thomas).
--
-- La fiche de Victoria a un nom de famille en double : « Victoria Cavalec
-- Cavalec » (visible sur le leaderboard + le diplôme). On corrige la donnée
-- source dans users.name. Match robuste (casse + espaces normalisés), ciblé
-- sur ce seul cas — aucun autre user touché.
-- =============================================================================

begin;

update public.users
set name = 'Victoria Cavalec'
where lower(regexp_replace(trim(name), '\s+', ' ', 'g')) = 'victoria cavalec cavalec';

commit;
