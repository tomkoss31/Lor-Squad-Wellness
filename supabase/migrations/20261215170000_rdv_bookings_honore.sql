-- =============================================================================
-- Un rendez-vous qui a EU LIEU n'est pas un rendez-vous annulé.
--
-- Chantier « qualifier depuis l'agenda » (Thomas, 19/08) : la personne vient,
-- on la qualifie (membre du club ou suivi classique), sa fiche est créée — et
-- son rendez-vous doit alors quitter l'agenda et le CRM.
--
-- Or `status` ne connaissait que requested / confirmed / canceled. Pour faire
-- disparaître un rendez-vous honoré il aurait fallu le marquer « annulé » :
--   • le taux de présence du club serait devenu faux ;
--   • les créneaux libérés seraient revenus à la vente alors que la personne
--     est venue (`get_club_discovery_availability` ne compte pas les annulés) ;
--   • et on aurait perdu la seule trace disant qu'elle s'est présentée.
--
-- D'où un quatrième état. Il reste « occupé » pour le calcul des places, comme
-- confirmed — ce qui est exact : le créneau a bien été consommé.
-- =============================================================================

alter table public.rdv_bookings drop constraint if exists rdv_bookings_status_check;
alter table public.rdv_bookings add constraint rdv_bookings_status_check
  check (status = any (array['requested'::text, 'confirmed'::text, 'canceled'::text, 'honored'::text]));

comment on column public.rdv_bookings.status is
  'requested = demandé · confirmed = confirmé par le coach · canceled = annulé · honored = la personne est venue et a été qualifiée (fiche créée). « honored » sort le RDV de l''agenda SANS le compter comme une annulation : sans lui, un rendez-vous honoré devrait être marqué annulé pour disparaître, et tous les taux de présence seraient faux.';
