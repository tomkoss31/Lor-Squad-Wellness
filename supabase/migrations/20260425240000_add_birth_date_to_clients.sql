-- Chantier birth_date (2026-04-25).
-- Ajoute la date de naissance sur clients en plus du champ age existant.
-- L'âge est calculé dynamiquement côté front à partir de birth_date.
-- Le champ age est conservé pour rétrocompatibilité (clients sans birth_date
-- saisie ou imports legacy).

ALTER TABLE public.clients
  ADD COLUMN IF NOT EXISTS birth_date DATE;

COMMENT ON COLUMN public.clients.birth_date IS
  'Date de naissance du client (AAAA-MM-JJ). L''âge est calculé dynamiquement côté front. Le champ age en DB est conservé pour rétrocompatibilité (priorité birth_date > age legacy).';

-- Index pour le futur filtrage anniversaire (sous-chantier F).
CREATE INDEX IF NOT EXISTS idx_clients_birth_date
  ON public.clients(birth_date)
  WHERE birth_date IS NOT NULL;
