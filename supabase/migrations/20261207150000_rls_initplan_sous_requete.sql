-- =============================================================================
-- `auth.uid()` évalué une fois par requête, plus une fois par ligne (2026-07-29).
--
-- LE PROBLÈME (alerte `auth_rls_initplan` de l'analyseur Supabase, 187 cas) :
-- écrit tel quel, `auth.uid()` est considéré par le planificateur comme
-- dépendant de la ligne courante. Il est donc rappelé POUR CHAQUE LIGNE
-- examinée. Sur une table de 774 bilans, 774 appels au lieu d'un — et le
-- planificateur perd en plus la possibilité d'utiliser certains index.
--
-- Enveloppé dans `(select auth.uid())`, l'appel devient un sous-plan constant :
-- PostgreSQL l'évalue UNE fois et réutilise le résultat. Aucun changement de
-- sens, aucun changement de qui a accès à quoi — seulement le moment où
-- l'appel est fait.
--
-- HONNÊTETÉ SUR LE GAIN : ce n'est PAS ce qui a gelé la base le 29/07 (c'était
-- le manque de mémoire, cf. project-incident-gel-base-nano). Sur des tables de
-- quelques centaines de lignes, le gain est réel mais modeste. C'est du
-- nettoyage de fond, pas un remède.
--
-- PRUDENCE APPLIQUÉE — réécrire 187 règles d'ACCÈS d'un coup, c'est risquer
-- d'ouvrir ou de fermer une porte par accident. Protocole suivi :
--   1. photo de l'état complet dans `public._audit_policies_avant` (280 lignes) ;
--   2. transformation, en EXCLUANT toute règle contenant déjà un
--      `(select auth.uid())` — les cas mixtes sont laissés tels quels ;
--   3. comparaison avant/après. Résultat : 280 → 280 règles, aucune disparue,
--      aucune apparue, aucun rôle ni type (permissif/restrictif) modifié, et
--      AUCUNE condition ne diffère autrement que par l'enveloppe.
--   4. test fonctionnel : un anonyme voit 0 ligne de `clients`, `assessments`,
--      `follow_ups`, `client_messages`, `users`, `coach_payment_settings` ;
--      les données publiques restent visibles ; le site répond.
--
-- La table `public._audit_policies_avant` est conservée volontairement : elle
-- permet de reconstruire à l'identique n'importe quelle règle en cas de doute.
-- Supprimable une fois la recette faite.
-- =============================================================================

do $$
declare
  p record;
  v_qual text;
  v_check text;
  v_sql text;
begin
  for p in
    select schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
      from pg_policies
     where schemaname = 'public'
       and (
             (coalesce(qual,'')       ~ 'auth\.uid\(\)' and coalesce(qual,'')       !~ '\(\s*select\s+auth\.uid\(\)')
          or (coalesce(with_check,'') ~ 'auth\.uid\(\)' and coalesce(with_check,'') !~ '\(\s*select\s+auth\.uid\(\)')
           )
  loop
    v_qual  := regexp_replace(p.qual,       'auth\.uid\(\)', '(select auth.uid())', 'g');
    v_check := regexp_replace(p.with_check, 'auth\.uid\(\)', '(select auth.uid())', 'g');

    v_sql := format('create policy %I on public.%I as %s for %s to %s',
                    p.policyname, p.tablename,
                    case when p.permissive = 'PERMISSIVE' then 'permissive' else 'restrictive' end,
                    lower(p.cmd),
                    array_to_string(p.roles, ', '));

    -- USING n'existe pas sur INSERT ; WITH CHECK n'existe pas sur SELECT/DELETE.
    if p.cmd <> 'INSERT' and v_qual is not null then
      v_sql := v_sql || format(' using (%s)', v_qual);
    end if;
    if p.cmd in ('INSERT','UPDATE','ALL') and v_check is not null then
      v_sql := v_sql || format(' with check (%s)', v_check);
    end if;

    execute format('drop policy %I on public.%I', p.policyname, p.tablename);
    execute v_sql;
  end loop;
end $$;

-- La table de photo est créée hors migration (elle sert de filet, pas de schéma).
-- Elle est verrouillée ici : sans RLS ni révocation, elle exposait la carte
-- complète des règles de sécurité à n'importe quel visiteur — l'analyseur l'a
-- immédiatement signalée en `rls_disabled_in_public`. RLS actif SANS policy =
-- personne ne lit, sauf `service_role`.
alter table if exists public._audit_policies_avant enable row level security;
revoke all on public._audit_policies_avant from anon, authenticated;
