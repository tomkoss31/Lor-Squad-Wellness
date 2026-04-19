-- =============================================================================
-- Sujet C — Nouveau statut "Suivi libre" (2026-04-19)
--
-- Besoin : certains clients fidèles préfèrent un suivi à la demande, sans
-- rappel auto dans l'agenda. Actuellement on était forcés de mettre une date
-- fictive → pollue le dashboard RDV/relances avec de faux rappels.
--
-- Solution : un flag booléen `free_follow_up` sur clients.
--   - false (default) → comportement actuel (RDV planifiés, notifs auto)
--   - true            → client reste actif MAIS ignoré par le dashboard RDV,
--                       les relances et les notifications push. Coach gère à
--                       la demande.
--
-- Index partiel : n'indexe que les lignes free_follow_up=true (généralement
-- minoritaires) pour accélérer les filtres "hors suivi libre" sans coût sur
-- les lignes false.
--
-- À EXÉCUTER DANS SUPABASE STUDIO → SQL EDITOR.
-- =============================================================================

alter table public.clients
  add column if not exists free_follow_up boolean not null default false;

create index if not exists idx_clients_free_follow_up
  on public.clients(free_follow_up)
  where free_follow_up = true;

comment on column public.clients.free_follow_up is
  'Sujet C (2026-04-19) : si true, le client est en "suivi libre" — actif mais hors agenda automatique (pas de RDV planifié, pas de relance, pas de notif push). Géré à la demande par le coach.';
