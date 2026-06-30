-- =============================================================================
-- RDV prospects (rdv_bookings) : marqueur anti-doublon du mail de rappel J-1.
-- (2026-06-30) — le mail de confirmation, lui, part une seule fois à la résa
-- (edge book-rdv), donc pas besoin de marqueur pour celui-là.
-- =============================================================================

alter table public.rdv_bookings
  add column if not exists reminder_email_sent_at timestamptz;
