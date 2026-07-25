-- =============================================================================
-- RDV manuels de l'Agenda (table prospects) : marqueur anti-doublon du mail de
-- rappel J-1 au futur client. (2026-07-25)
--
-- Contexte : un RDV ajouté à la main par le coach dans l'Agenda est stocké dans
-- `prospects` (avec un email facultatif). Jusqu'ici AUCUN rappel email ne partait
-- pour ces RDV (l'edge client-rdv-reminder ne scannait que follow_ups + les
-- réservations publiques rdv_bookings). On ajoute le même marqueur que
-- rdv_bookings.reminder_email_sent_at pour que l'edge envoie 1 seul mail J-1.
-- =============================================================================

alter table public.prospects
  add column if not exists reminder_email_sent_at timestamptz;
