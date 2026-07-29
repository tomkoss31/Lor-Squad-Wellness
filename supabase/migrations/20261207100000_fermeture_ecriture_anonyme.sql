-- =============================================================================
-- FAILLE CRITIQUE — écriture anonyme sur les données métier (2026-07-29).
--
-- Trouvée pendant l'audit de fond demandé après le gel de la base.
--
-- CE QUI ÉTAIT POSSIBLE, sans compte ni mot de passe :
--   DELETE https://<projet>.supabase.co/rest/v1/clients      -> HTTP 204
--   DELETE https://<projet>.supabase.co/rest/v1/assessments  -> HTTP 204
--   DELETE https://<projet>.supabase.co/rest/v1/follow_ups   -> HTTP 204
-- Vérifié en réel sur un identifiant inexistant (aucune donnée supprimée).
-- La clé publique nécessaire est dans le JavaScript du site : lisible par
-- quiconque ouvre le code source. 150 clients, 774 bilans et 149 suivis
-- étaient effaçables par un inconnu, en une requête.
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
