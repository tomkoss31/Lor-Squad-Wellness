-- =============================================================================
-- Suppression d'un bilan : réservée au coach du client (2026-07-29).
--
-- Avant : `assessment_delete` était en `USING (true)` pour le rôle `public`.
-- Combinée aux GRANT par défaut, cette policy laissait un inconnu effacer les
-- 774 bilans (cf. migration 20261207100000, qui a fermé le volet anonyme).
-- Ce fichier ferme le volet interne : sans lui, tout coach connecté pouvait
-- encore supprimer les bilans d'un AUTRE coach.
--
-- Décision de Thomas : le coach du client + les admins.
--
-- On ne réinvente pas la règle de propriété : on recopie **mot pour mot** celle
-- qui régit déjà la LECTURE (`assessments select via client`). Résultat simple
-- à expliquer et impossible à désynchroniser : **qui peut voir un bilan peut le
-- supprimer, personne d'autre.**
--
-- `(select auth.uid())` et non `auth.uid()` : sous cette forme, Postgres
-- évalue l'appel UNE fois pour la requête au lieu d'une fois PAR LIGNE
-- (c'est l'alerte `auth_rls_initplan` de l'analyseur Supabase).
--
-- `to authenticated` : `anon` n'a de toute façon plus le droit DELETE depuis
-- la migration précédente — ceinture et bretelles.
--
-- Note : un bilan dont le client a été supprimé n'est plus effaçable par
-- l'interface (le EXISTS échoue). Cas résiduel assumé — les edge functions,
-- en `service_role`, contournent le RLS et peuvent nettoyer.
-- =============================================================================

drop policy if exists assessment_delete on public.assessments;

create policy assessment_delete on public.assessments
  for delete
  to authenticated
  using (
    is_active_user()
    and exists (
      select 1
        from public.clients c
       where c.id = assessments.client_id
         and (is_admin() or c.distributor_id = (select auth.uid()))
    )
  );
