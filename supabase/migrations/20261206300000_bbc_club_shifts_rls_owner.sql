-- =============================================================================
-- club_shifts — durcissement RLS : c'est le CLUB qui décide qui tient le bar.
-- Revue adversariale « La semaine du club », 2026-07-28.
--
-- ⚠ TROU VÉRIFIÉ EN BASE (transaction rollbackée). Les policies d'écriture du
-- LOT 6.6 avaient pour première branche `user_id = auth.uid()` : elles ne
-- testaient QUE la colonne que l'appelant remplit lui-même, jamais la propriété
-- du parent. N'importe quel coach authentifié pouvait donc, par l'API REST
-- (ouverte au client anon + JWT), poser une permanence sur le club d'un AUTRE
-- coach en se désignant lui-même. C'est exactement le défaut déjà corrigé une
-- fois ici — cf. 20261206180000, « les policies ne testaient que
-- coach_user_id = auth.uid() ».
--
-- Ce que ça coûtait côté BBC : « Personne n'ouvre » (ambre, pointillé) devenait
-- « Permanence du matin — <untel> » sur le club de la victime. On éteignait
-- l'alarme, qui est la seule raison d'être de l'écran.
--
-- Les RPC `bbc_assign_shift` / `bbc_clear_shift`, elles, vérifiaient déjà la
-- propriété du club (testé : appel croisé refusé, « non autorise »). Mais rien
-- n'oblige à passer par les RPC. Cette migration aligne l'écriture DIRECTE sur
-- la même règle que les RPC : une seule règle, au même endroit qu'ailleurs.
--
-- 100 % ADDITIF côté données : on ne touche qu'aux policies (aucun drop de
-- table, aucune colonne, aucune ligne modifiée). Vérifié avant écriture :
-- `club_shifts` est vide en base — personne n'est privé d'une permanence
-- existante par ce durcissement.
-- =============================================================================

-- ── Lecture : inchangée, et c'est voulu ─────────────────────────────────────
-- Savoir qui tient le club est justement l'information qu'on veut partager.
-- Recréée ici (idempotent) pour qu'une base neuve ne dépende pas du fichier
-- 20261206260000, qui vit sur une autre branche.
drop policy if exists club_shifts_select_authenticated on public.club_shifts;
create policy club_shifts_select_authenticated on public.club_shifts
  for select using (auth.uid() is not null);

-- ── Écriture : propriétaire du club, ou admin ───────────────────────────────
-- ⚠ On DROP explicitement les anciens noms `*_self_or_owner` avant de créer les
-- nouveaux. Renommer sans supprimer aurait laissé les deux policies coexister,
-- et Postgres évalue les policies permissives en OR : la vulnérable aurait
-- suffi à tout rouvrir, en silence.
drop policy if exists club_shifts_insert_self_or_owner on public.club_shifts;
drop policy if exists club_shifts_insert_owner on public.club_shifts;
create policy club_shifts_insert_owner on public.club_shifts
  for insert with check (
    public.is_admin()
    or exists (
      select 1 from public.clubs c
      where c.id = club_id and c.owner_user_id = auth.uid()
    )
  );

-- L'UPDATE est verrouillé des DEUX côtés sur la propriété. Garder la branche
-- « je modifie ma propre ligne » aurait rouvert le trou par un autre chemin :
-- rien n'empêche un UPDATE de changer `club_id`, donc de déplacer sa propre
-- permanence vers le club d'un inconnu. Un équipier qui veut se retirer passe
-- par le DELETE ci-dessous.
drop policy if exists club_shifts_update_self_or_owner on public.club_shifts;
drop policy if exists club_shifts_update_owner on public.club_shifts;
create policy club_shifts_update_owner on public.club_shifts
  for update
  using (
    public.is_admin()
    or exists (
      select 1 from public.clubs c
      where c.id = club_id and c.owner_user_id = auth.uid()
    )
  )
  with check (
    public.is_admin()
    or exists (
      select 1 from public.clubs c
      where c.id = club_id and c.owner_user_id = auth.uid()
    )
  );

-- Le DELETE garde la branche « moi-même », et c'est le seul endroit où elle est
-- sûre : se désaffecter fait CRIER l'écran (le matin repasse ambre « personne
-- n'ouvre »). Le sens dangereux est l'inverse — faire croire qu'un matin est
-- couvert — et il est fermé ci-dessus.
drop policy if exists club_shifts_delete_self_or_owner on public.club_shifts;
create policy club_shifts_delete_self_or_owner on public.club_shifts
  for delete using (
    user_id = auth.uid()
    or public.is_admin()
    or exists (
      select 1 from public.clubs c
      where c.id = club_id and c.owner_user_id = auth.uid()
    )
  );
