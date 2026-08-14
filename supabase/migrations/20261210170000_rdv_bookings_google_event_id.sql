-- Identifiant de l'événement créé sur l'agenda Google de l'équipe.
-- Sans lui, on saurait poser un rendez-vous sur l'agenda mais jamais l'en
-- retirer : un prospect qui annule laisserait un fantôme dans la journée, et le
-- coach verrait un RDV que plus personne n'honore.
--
-- Nullable et sans contrainte : l'intégration agenda est best-effort (si elle
-- n'est pas configurée ou tombe en panne, la réservation doit passer quand
-- même). Une ligne sans event_id est donc NORMALE, pas une anomalie.
alter table public.rdv_bookings
  add column if not exists google_event_id text;

comment on column public.rdv_bookings.google_event_id is
  'Événement Google Agenda correspondant (null si l''intégration est inactive ou a échoué). Sert à supprimer l''événement quand le RDV est annulé.';
