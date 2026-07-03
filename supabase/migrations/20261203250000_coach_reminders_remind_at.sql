-- =============================================================================
-- coach_reminders : date + HEURE + push au coach (2026-07-03).
--
-- Demande Thomas/Mélanie : « Me rappeler de relancer » doit devenir une vraie
-- to-do avec date/heure. Le jour J, le COACH (jamais le client) reçoit :
--   - le rappel remonté en haut du Co-pilote (déjà géré in-app)
--   - un push sur l'app (nouveau : edge cron coach-reminder-notifier)
--
-- `remind_on` (date) reste pour compat ; on ajoute `remind_at` (timestamptz =
-- date + heure précise) qui pilote le push. `notified_at` = anti-doublon.
-- =============================================================================

alter table public.coach_reminders
  add column if not exists remind_at   timestamptz,
  add column if not exists notified_at timestamptz;

-- Index pour le cron : rappels dus, pas encore notifiés.
create index if not exists idx_coach_reminders_due
  on public.coach_reminders(remind_at)
  where status = 'pending' and notified_at is null;
