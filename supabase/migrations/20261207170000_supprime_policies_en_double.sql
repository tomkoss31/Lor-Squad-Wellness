-- =============================================================================
-- Suppression des règles d'accès en double exact (2026-07-29).
--
-- 15 paires du type `msg_coach_read` + `v2_msg_coach_read` : même table, même
-- action, mêmes rôles, condition STRICTEMENT identique. Vestige d'une
-- réécriture où la version d'origine n'a jamais été retirée.
--
-- PostgreSQL évalue TOUTES les règles permissives d'une table en OR, à chaque
-- requête. Une paire identique, c'est donc le même test fait deux fois, pour
-- rien — c'est l'alerte `multiple_permissive_policies` de l'analyseur.
--
-- ZÉRO EFFET SUR LES ACCÈS : `A OR A` vaut `A`. Retirer un exemplaire ne peut
-- ni ouvrir ni fermer quoi que ce soit. C'est la seule raison pour laquelle
-- cette migration est sans risque, et le regroupement ci-dessous ne considère
-- comme doublons que les règles dont **la condition, les rôles et l'action**
-- sont identiques au caractère près.
--
-- On garde la version `v2_` quand elle existe : c'est la réécriture délibérée,
-- celle que les migrations récentes connaissent.
--
-- Tables concernées : client_app_accounts, client_evolution_reports,
-- client_messages, client_recaps, push_subscriptions.
-- =============================================================================

do $$
declare
  g record;
  garde text;
  p text;
begin
  for g in
    select tablename, cmd, roles::text as roles_txt,
           coalesce(qual,'') as q, coalesce(with_check,'') as wc,
           array_agg(policyname order by policyname) as noms
      from pg_policies
     where schemaname = 'public'
     group by tablename, cmd, roles::text, coalesce(qual,''), coalesce(with_check,'')
    having count(*) > 1
  loop
    -- On conserve la version `v2_` si elle existe, sinon la première par ordre
    -- alphabétique. Le choix est arbitraire par construction : les règles sont
    -- identiques, seule leur étiquette diffère.
    select coalesce(
             (select n from unnest(g.noms) n where n like 'v2\_%' limit 1),
             g.noms[1])
      into garde;

    foreach p in array g.noms loop
      if p <> garde then
        execute format('drop policy %I on public.%I', p, g.tablename);
        raise notice 'doublon retiré : %.% (conservée : %)', g.tablename, p, garde;
      end if;
    end loop;
  end loop;
end $$;
