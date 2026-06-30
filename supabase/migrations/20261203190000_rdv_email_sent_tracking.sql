-- =============================================================================
-- Traçabilité « mail envoyé » sur les fiches (2026-06-30).
--   • rdv_bookings.confirm_email_sent_at : horodatage du mail de confirmation
--     prospect (le J-1 a déjà reminder_email_sent_at).
--   • client_rdv_reminders_sent : nouveau kind 'confirm_email' pour tracer la
--     confirmation envoyée au client de suivi (lecture future côté fiche).
-- Additif, aucune donnée touchée.
-- =============================================================================

alter table public.rdv_bookings
  add column if not exists confirm_email_sent_at timestamptz;

alter table public.client_rdv_reminders_sent
  drop constraint if exists client_rdv_reminders_sent_kind_check;

alter table public.client_rdv_reminders_sent
  add constraint client_rdv_reminders_sent_kind_check
  check (kind in ('eve', 'imminent2h', 'eve_email', 'confirm_email'));
