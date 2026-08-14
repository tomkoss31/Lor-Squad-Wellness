-- =============================================================================
-- RDV du club — brique 5 : le prospect gère son RDV depuis son email.
-- (chantier « RDV du club », 2026-08-09)
-- =============================================================================
--
-- Jusqu'ici, un prospect qui avait un empêchement devait répondre à l'email et
-- attendre qu'un coach s'en occupe à la main. On lui donne un lien personnel
-- « Modifier / annuler mon rendez-vous ».
--
-- Jeton DÉDIÉ plutôt que de réutiliser rdv_bookings.id : le jeton peut être
-- révoqué (regénéré) sans toucher à la réservation, et l'id ne se retrouve
-- jamais dans une URL envoyée par email.
--
-- Aucune policy RLS ajoutée : la lecture/écriture par jeton passe exclusivement
-- par l'edge manage-club-booking en service_role. La colonne reste donc
-- invisible pour anon / authenticated (les policies existantes ne l'exposent
-- qu'aux coachs et admins déjà autorisés).
-- =============================================================================

alter table public.rdv_bookings
  add column if not exists manage_token uuid not null default gen_random_uuid();

-- Recherche par jeton (l'edge ne fait que ça).
create unique index if not exists rdv_bookings_manage_token_key
  on public.rdv_bookings (manage_token);
