-- =============================================================================
-- Le rappel de RDV ne partait qu'UNE SEULE FOIS PAR SUIVI, à vie.
--
-- `client_rdv_reminders_sent` avait pour clé (follow_up_id, kind). Or l'app
-- REPLANIFIE le même suivi à chaque nouveau rendez-vous au lieu d'en créer un :
-- une fois le premier « ton RDV est demain » envoyé, le marqueur restait, et
-- le client ne recevait plus jamais de rappel.
--
-- Mesuré le 2026-08-14 : 25 clients sur 30 ayant un RDV à venir étaient dans ce
-- cas. Joel n'avait plus rien reçu depuis le 10/07, Tom depuis le 03/07.
-- La fonction les écartait sans même les compter comme « ignorés », d'où des
-- réponses `found: 3, sent: 0, skipped: 0` qui ressemblaient à une journée
-- sans rendez-vous.
--
-- La clé porte désormais la DATE DU RDV visé : un suivi replanifié redevient
-- éligible, et un même RDV ne peut toujours pas être rappelé deux fois.
-- =============================================================================

alter table public.client_rdv_reminders_sent
  add column if not exists rdv_date date;

-- Backfill fidèle à la sémantique : les rappels « la veille » visaient le
-- lendemain de leur envoi, les autres le jour même.
update public.client_rdv_reminders_sent
   set rdv_date = case
     when kind in ('eve', 'eve_email') then (sent_at at time zone 'Europe/Paris')::date + 1
     else (sent_at at time zone 'Europe/Paris')::date
   end
 where rdv_date is null;

alter table public.client_rdv_reminders_sent
  alter column rdv_date set not null;

alter table public.client_rdv_reminders_sent
  drop constraint client_rdv_reminders_sent_pkey;

alter table public.client_rdv_reminders_sent
  add constraint client_rdv_reminders_sent_pkey
  primary key (follow_up_id, kind, rdv_date);

comment on column public.client_rdv_reminders_sent.rdv_date is
  'Date Paris du RDV visé. Fait partie de la clé : sans elle, un suivi replanifié ne redéclenchait plus jamais de rappel (incident 2026-08-14).';
