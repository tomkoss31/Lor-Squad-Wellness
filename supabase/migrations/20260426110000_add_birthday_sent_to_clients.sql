-- Chantier N (2026-04-26) : tracker des messages anniversaire envoyes.
-- Permet de filtrer les clients deja notifies cette annee dans le bloc
-- BirthdayBlock du dashboard Co-pilote (evite les rappels en double).

ALTER TABLE public.clients
  ADD COLUMN IF NOT EXISTS birthday_sent_at TIMESTAMPTZ;

COMMENT ON COLUMN public.clients.birthday_sent_at IS
  'Timestamp du dernier message anniversaire envoye. NULL = pas encore envoye cette annee.';

CREATE INDEX IF NOT EXISTS idx_clients_birthday_sent_at
  ON public.clients(birthday_sent_at)
  WHERE birthday_sent_at IS NOT NULL;
