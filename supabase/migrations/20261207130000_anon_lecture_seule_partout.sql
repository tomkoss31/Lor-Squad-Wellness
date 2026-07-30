-- =============================================================================
-- `anon` en lecture seule sur TOUT le schéma public (2026-07-29).
--
-- La migration 20261207100000 avait fermé 14 tables. Il en restait 97 où le
-- rôle `anon` gardait DELETE et UPDATE — des GRANT larges posés par défaut à la
-- création du projet et jamais resserrés.
--
-- POURQUOI C'EST SÛR : le contrôle mené juste avant a montré que sur ces 97
-- tables, 34 seulement portent une policy pouvant s'appliquer à `anon`, et que
-- TOUTES exigent une identité (`auth.uid()`, `is_admin()`, `can_access_owner()`
-- — cette dernière valant `is_admin() or auth.uid() = propriétaire`). Aucune
-- écriture anonyme ne passait donc déjà. Retirer le GRANT ne casse rien : ça
-- supprime un droit que le RLS refusait de toute façon.
--
-- POURQUOI LE FAIRE QUAND MÊME : aujourd'hui la sécurité de ces 97 tables tient
-- sur UNE seule barrière, le RLS. Une policy permissive posée par erreur dans
-- six mois rouvre tout, en silence — c'est exactement ce qui est arrivé à
-- `assessments` avec son `USING (true)`. Avec le GRANT retiré, la même erreur
-- ne suffit plus : il faudrait se tromper deux fois.
--
-- INSERT est CONSERVÉ : les formulaires publics (bilan en ligne, leads,
-- témoignages, messages client) en dépendent. Seules l'écriture destructive et
-- la modification partent.
--
-- `authenticated` et `service_role` ne sont pas touchés : les coachs
-- travaillent, les edge functions aussi.
-- =============================================================================

do $$
declare t record;
begin
  for t in
    select c.relname
      from pg_class c
      join pg_namespace n on n.oid = c.relnamespace
     where n.nspname = 'public' and c.relkind = 'r'
  loop
    execute format('revoke delete, update on public.%I from anon', t.relname);
  end loop;
end $$;

-- Deux fonctions privilégiées sans aucun garde-fou interne, exécutables par
-- n'importe qui. `_tg_auto_promote_current_rank` est une fonction de trigger :
-- elle se déclenche par le trigger, elle n'a pas besoin d'être appelable.
-- `_mark_starter_gate_for(uuid, text)` est un utilitaire interne : laissé
-- ouvert, il permettait de marquer les étapes d'onboarding de n'importe quel
-- distributeur.
revoke execute on function public._mark_starter_gate_for(uuid, text)  from anon, authenticated;
revoke execute on function public._tg_auto_promote_current_rank()     from anon, authenticated;
