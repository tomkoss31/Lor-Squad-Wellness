-- =============================================================================
-- FAILLE CRITIQUE — écriture anonyme sur les données métier (2026-07-29).
--
-- Trouvée pendant l'audit de fond demandé après le gel de la base.
--
-- CE QUI ÉTAIT RÉELLEMENT EXPOSÉ : la table `assessments`, soit 774 bilans,
-- effaçables par un inconnu avec la seule clé publique du site (lisible dans
-- le JavaScript par quiconque ouvre le code source).
--
-- ⚠ CORRECTIF DE PORTÉE, même jour : l'alerte initiale annonçait aussi
-- `clients` et `follow_ups`, sur la foi d'un `HTTP 204` renvoyé par un DELETE
-- de test. C'ÉTAIT UNE ERREUR DE LECTURE. Un `204` sur une suppression qui ne
-- vise aucune ligne existante signifie « requête acceptée, zéro ligne
-- touchée » — pas « autorisée ». Vérification faite en lisant les policies :
-- `clients` et `follow_ups` n'ont AUCUNE policy DELETE, donc RLS refusait par
-- défaut. Seule `assessments` portait `assessment_delete USING (true)` pour le
-- rôle `public` — un trou réel, confirmé par lecture de la règle elle-même.
--
-- LEÇON : ne jamais conclure à une faille sur un code HTTP. Lire la policy.
-- Le test qui fait foi : `select qual from pg_policies where ...`.
--
-- DEUX CAUSES CUMULÉES — il fallait les deux, corriger une seule ne suffit pas :
--   1. le rôle `anon` avait les droits DELETE/UPDATE sur les tables métier
--      (les GRANT larges par défaut de Supabase, jamais resserrés) ;
--   2. `assessments` portait une policy `assessment_delete` en
--      `USING (true)` pour le rôle `public` — donc RLS ne filtrait RIEN.
--   Le RLS est censé être le garde-fou : ici il était grand ouvert, et le
--   GRANT laissait passer.
--
-- CE QUI N'EST PAS TOUCHÉ, et pourquoi :
--   · INSERT reste ouvert à `anon` sur les tables de capture publique
--     (prospect_leads, online_bilans, client_messages) : les formulaires
--     publics en dépendent.
--   · `authenticated` garde ses droits : les coachs connectés doivent
--     pouvoir travailler. Le CRM (useCrmLeads / useOnlineBilans) modifie
--     bien ces tables, mais en tant que coach connecté, jamais en anonyme.
--   · `service_role` intact : les edge functions continuent de tout faire.
--
-- TRUNCATE : retiré à `anon` ET `authenticated` sur tout le schéma public.
-- TRUNCATE vide une table entière en CONTOURNANT le RLS. PostgREST ne
-- l'expose pas aujourd'hui, donc ce n'était pas exploitable — mais c'est un
-- droit que personne d'autre que `service_role` n'a de raison de porter.
--
-- ⚠ RESTE À TRAITER, hors de cette migration (demande un arbitrage produit) :
-- la policy `assessment_delete` est toujours en `USING (true)` pour
-- `authenticated`. Autrement dit, un coach connecté peut supprimer les bilans
-- d'un AUTRE coach. Risque interne, pas externe. À restreindre au
-- propriétaire une fois les parcours de suppression légitimes cartographiés.
-- =============================================================================

revoke delete, update on public.assessments         from anon;
revoke delete, update on public.clients             from anon;
revoke delete, update on public.follow_ups          from anon;
revoke delete, update on public.users               from anon;
revoke delete, update on public.client_messages     from anon;
revoke delete, update on public.pv_client_products  from anon;
revoke delete, update on public.pv_transactions     from anon;
revoke delete, update on public.client_recaps       from anon;
revoke delete, update on public.client_app_accounts from anon;
revoke delete, update on public.prospects           from anon;
revoke delete, update on public.bilan_orders        from anon;
revoke delete, update on public.client_consents     from anon;

-- Tables de capture publique : INSERT conservé (les formulaires en vivent),
-- mais un inconnu n'a aucune raison de modifier ou supprimer des leads.
revoke delete, update on public.prospect_leads      from anon;
revoke delete, update on public.online_bilans       from anon;

-- TRUNCATE sur tout le schéma public : contourne le RLS par nature.
do $$
declare t record;
begin
  for t in
    select c.relname
      from pg_class c
      join pg_namespace n on n.oid = c.relnamespace
     where n.nspname = 'public' and c.relkind = 'r'
  loop
    execute format('revoke truncate on public.%I from anon, authenticated', t.relname);
  end loop;
end $$;
