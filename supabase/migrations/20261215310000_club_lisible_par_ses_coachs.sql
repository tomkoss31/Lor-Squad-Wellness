-- =============================================================================
-- Le club est lisible par les coachs QUI Y TRAVAILLENT, pas seulement par son
-- propriétaire.
--
-- ── LE CONSTAT (02/09, jeton d'une coach non-admin simulé) ───────────────────
-- `clubs_owner_manage` dit : propriétaire OU admin. Mélanie ne passe donc PAS
-- parce qu'elle est rattachée à La Base Nutrition — elle passe parce qu'elle
-- est **admin**. Une coach ordinaire lit ZÉRO club, alors qu'un club existe et
-- qu'elle y est rattachée par `users.club_id`.
--
-- Conséquence concrète, mesurée : `useBbcMode` rend `activeClub = null`, donc
-- l'app BBC affiche « Mon club · Verdun · 7h-11h » (les valeurs par défaut du
-- code, pas celles du club), les rituels tombent sur le barème générique, et
-- `BbcSemaine` reçoit `clubId = null` — la semaine du club est vide. C'est
-- exactement la panne qui a coûté à Mélanie 6 rendez-vous sur 16 le 01/09,
-- sauf qu'ici aucune correction front ne peut y remédier : le mur est dans les
-- droits.
--
-- ── CE QUE ÇA OUVRE, EXACTEMENT ─────────────────────────────────────────────
-- La ligne `clubs` : nom, ville, slug, horaires d'ouverture, jours et heures
-- des rituels, barème des cœurs, liens Zoom. **Aucune donnée personnelle.**
-- C'est l'affichage du club, pas son fichier clients — les membres restent
-- protégés par la RLS de `clients`, que cette migration ne touche pas.
--
-- ── CE QUE ÇA N'OUVRE PAS ───────────────────────────────────────────────────
-- Rien en écriture. `clubs_owner_manage` est en `FOR ALL` et reste seul à
-- porter INSERT / UPDATE / DELETE : une coach rattachée ne peut pas renommer le
-- club, changer les horaires ni toucher au barème. On ajoute une policy SELECT
-- distincte au lieu d'élargir l'existante, précisément pour que l'écriture ne
-- puisse pas suivre la lecture par accident.
--
-- Les policies permissives s'additionnent en OU : le propriétaire et les admins
-- continuent de passer par `clubs_owner_manage`, inchangée.
-- =============================================================================

-- `bbc_mon_club()` existe déjà (security definer, search_path figé) et répond
-- « le club que je possède, sinon celui auquel je suis rattaché ». On la
-- réutilise plutôt que d'écrire une sous-requête sur `users` dans la policy :
-- une policy interroge la table avec les droits de l'appelant, et la règle 7 de
-- CLAUDE.md rappelle ce que coûte une sous-requête RLS mal placée (récursion
-- infinie sur `users`, toute écriture bloquée). Une fonction definer contourne
-- le problème au lieu de le déplacer.
drop policy if exists "clubs_read_membre_du_club" on public.clubs;
create policy "clubs_read_membre_du_club"
  on public.clubs for select
  to authenticated
  using (
    public.is_active_user()
    and id = public.bbc_mon_club()
  );

comment on policy "clubs_read_membre_du_club" on public.clubs is
  'Lecture seule du club où ce coach travaille (users.club_id, via bbc_mon_club()). Sans elle, un coach non-admin rattaché à un club lit 0 ligne et son app BBC retombe sur les horaires par défaut du code. N''ouvre AUCUNE écriture : clubs_owner_manage reste seule à porter INSERT/UPDATE/DELETE.';
