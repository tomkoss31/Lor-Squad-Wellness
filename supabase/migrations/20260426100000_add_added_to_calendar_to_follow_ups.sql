-- Chantier J (2026-04-26) : tracking de la confirmation client "Ajouté à
-- mon agenda" sur les RDV. Permet au coach de voir si le client a confirmé
-- avoir ajouté son RDV à son calendrier (Google / .ics) et d'éviter les
-- relances inutiles.
--
-- NULL = pas encore confirmé. Timestamp = date/heure de confirmation.

ALTER TABLE public.follow_ups
  ADD COLUMN IF NOT EXISTS added_to_calendar_at TIMESTAMPTZ;

COMMENT ON COLUMN public.follow_ups.added_to_calendar_at IS
  'Timestamp de confirmation client "Ajouté à mon agenda" depuis l app cliente. NULL = pas encore confirmé.';

CREATE INDEX IF NOT EXISTS idx_follow_ups_added_to_calendar
  ON public.follow_ups(added_to_calendar_at)
  WHERE added_to_calendar_at IS NOT NULL;
