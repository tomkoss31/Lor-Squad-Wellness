-- Lead scoring silencieux depuis la page Résultat Bilan (2026-07-19).
--
-- Quand le lead clique « Fais-toi rappeler », la page envoie son engagement :
-- score (0-100), tier (chaud/tiede/froid) et la liste des signaux (intention,
-- formule choisie, détail calcul ouvert, add-on vu, temps sur page). Ça aide le
-- coach à savoir QUI relancer en 1er et AVEC QUEL angle.
--
-- Rempli par l'edge request-callback (service_role). NULL = pas de demande de
-- rappel (ou lead d'avant cette feature). Surfacé dans le CRM lead.
alter table public.online_bilans
  add column if not exists engagement jsonb;

comment on column public.online_bilans.engagement is
  'Score d''engagement au clic « rappelle-moi » : {score:int, tier:chaud|tiede|froid, signals:text[]}. NULL = pas de demande.';
