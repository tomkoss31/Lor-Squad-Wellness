-- Demande de rappel depuis la page Résultat Bilan (2026-07-18).
--
-- Un lead qui lit sa page /resultat-bilan/:token peut cliquer « Fais-toi
-- rappeler par Thomas » : il ne paie pas tout de suite, il veut juste que le
-- coach le recontacte. On horodate la demande sur SON lead (online_bilans),
-- pour que le coach la RETROUVE dans son CRM — la notif push est transitoire,
-- cette colonne est la trace durable.
--
-- Rempli par l'edge request-callback (service_role). Le lead a déjà laissé son
-- prénom + contact + canal préféré à l'étape bilan → aucune re-saisie.
alter table public.online_bilans
  add column if not exists callback_requested_at timestamptz;

comment on column public.online_bilans.callback_requested_at is
  'Horodatage du clic « rappelle-moi » sur la page Résultat Bilan. NULL = pas de demande. Surfacé dans le CRM leads.';
