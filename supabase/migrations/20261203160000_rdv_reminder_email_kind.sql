-- =============================================================================
-- Rappel RDV : autorise le marqueur 'eve_email' (email de rappel J-1, 2026-06-30).
-- Sans ça, l'insert anti-doublon échoue (CHECK) → l'email se renverrait à chaque
-- cron. Additif : on étend juste la contrainte.
-- =============================================================================

alter table public.client_rdv_reminders_sent
  drop constraint if exists client_rdv_reminders_sent_kind_check;

alter table public.client_rdv_reminders_sent
  add constraint client_rdv_reminders_sent_kind_check
  check (kind in ('eve', 'imminent2h', 'eve_email'));
