-- =============================================================================
-- « Elle n'est pas venue » — le cinquième état d'un rendez-vous.
--
-- LE CONSTAT (audit du 25/08). Un lapin ne laissait AUCUNE trace :
--   · `rdv_bookings.status` n'avait pas de valeur pour ça (requested /
--     confirmed / canceled / honored) ;
--   · et le bouton de la feuille qui porte pourtant le mot — « Pas encore /
--     Elle réfléchit, ou elle n'est pas venue » — n'écrivait rien du tout
--     (`onPasEncore={() => setQualif(null)}`).
--
-- Deux mondes parallèles : un rendez-vous saisi À LA MAIN dans l'agenda a bien
-- son bouton « Pas venu » (`prospects.status = 'no_show'`), celui réservé sur
-- le site du club non. On aligne le club sur ce qui existait déjà.
--
-- ── POURQUOI PAS « canceled » ─────────────────────────────────────────────
-- Même raison qu'en ajoutant « honored » le 19/08 : un lapin n'est pas une
-- annulation. Le confondre fausserait le taux de présence du club, et
-- `get_club_discovery_availability` ne compte pas les annulés — le créneau
-- repartirait à la vente alors qu'il a bel et bien été bloqué.
-- =============================================================================

alter table public.rdv_bookings drop constraint if exists rdv_bookings_status_check;

alter table public.rdv_bookings add constraint rdv_bookings_status_check
  check (status = any (array[
    'requested'::text,
    'confirmed'::text,
    'canceled'::text,
    'honored'::text,
    'no_show'::text
  ]));

comment on column public.rdv_bookings.status is
  'requested = demandé · confirmed = accepté · canceled = annulé · honored = la personne est venue · no_show = elle n''est pas venue (25/08).';
