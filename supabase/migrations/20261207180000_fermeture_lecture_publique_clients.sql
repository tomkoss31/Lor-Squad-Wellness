-- =============================================================================
-- FAILLE CRITIQUE — 52 jetons clients lisibles par n'importe qui (2026-07-29).
--
-- Trois policies accordaient la LECTURE au rôle `public` avec pour seule
-- condition `expires_at > now()` :
--
--   client_app_accounts      · client_app_public_read
--   client_recaps            · recap_public_read
--   client_evolution_reports · report_public_read
--
-- Aucune vérification d'identité, aucune vérification de jeton. La condition ne
-- regarde que la date d'expiration — donc TOUTE ligne non expirée était lisible
-- par TOUT LE MONDE, pas seulement par son destinataire.
--
-- CE QUE ÇA DONNAIT, avec la seule clé publique du site :
--   GET /rest/v1/client_app_accounts?select=token  ->  52 jetons
-- Le jeton est la clé d'entrée de l'espace client (`/client/:token`). Avec ces
-- 52 valeurs, un inconnu ouvrait le dossier de chaque client : poids,
-- mensurations, bilans, messages, rendez-vous. Les récaps et les rapports
-- d'évolution étaient exposés de la même façon.
--
-- (Vérifié en comptant les lignes renvoyées, sans lire aucune valeur.)
--
-- POURQUOI CES POLICIES NE SERVAIENT À RIEN : l'app client ne lit PAS ces
-- tables en direct. Elle passe par les edge functions (`client-app-data` et
-- consorts) qui travaillent en `service_role` et contournent le RLS — c'est
-- l'architecture décrite dans CLAUDE.md, § « Architecture data app client ».
-- Les seules lectures depuis un navigateur sont côté COACH (ProfilTab,
-- NewAssessmentPage, ClientAppPreviewButton, useBbcMembers), donc
-- authentifiées.
--
-- CE QU'ON MET À LA PLACE : `client_app_accounts` avait déjà sa règle coach
-- (`v2_client_app_coach_select`) — il suffit de retirer la règle publique. Les
-- deux autres tables n'avaient QUE la règle publique : les supprimer sèchement
-- aurait coupé l'accès aux coachs. On leur donne donc la même règle que
-- partout ailleurs : le coach du client, plus les admins.
-- =============================================================================

drop policy if exists client_app_public_read on public.client_app_accounts;

drop policy if exists recap_public_read on public.client_recaps;
create policy recap_coach_select on public.client_recaps
  for select to authenticated
  using (
    is_active_user()
    and exists (
      select 1 from public.clients c
       where c.id::text = client_recaps.client_id
         and can_access_owner(c.distributor_id)
    )
  );

drop policy if exists report_public_read on public.client_evolution_reports;
create policy report_coach_select on public.client_evolution_reports
  for select to authenticated
  using (
    is_active_user()
    and exists (
      select 1 from public.clients c
       where c.id::text = client_evolution_reports.client_id
         and can_access_owner(c.distributor_id)
    )
  );
