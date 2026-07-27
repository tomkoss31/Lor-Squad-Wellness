-- =============================================================================
-- Agenda V2 — LOT 6.4 : la durée d'un RDV (2026-07-27).
--
-- Jusqu'ici un RDV était un INSTANT, pas une plage : ni prospects.rdv_date ni
-- follow_ups.due_date ne portaient de durée. La grille horaire dessinait donc
-- tous les blocs à 45 min en dur — un bilan d'une heure et un suivi de vingt
-- minutes occupaient la même place, et le coach ne pouvait pas voir ses vrais
-- creux.
--
-- Modèle retenu (décision Thomas) : un réglage « mes RDV durent X » par coach,
-- plus un choix rapide 30/45/60/90 au moment de poser le RDV. Deux champs
-- suffisent, on n'ajoute pas d'heure de fin à saisir.
--
-- duration_min NULL = « comme d'habitude » → le front applique le réglage du
-- coach. Les RDV déjà en base restent donc cohérents sans backfill.
-- =============================================================================

-- ─── Le réglage par coach ────────────────────────────────────────────────────
alter table public.users
  add column if not exists default_rdv_minutes integer not null default 45;

alter table public.users
  drop constraint if exists users_default_rdv_minutes_check;
alter table public.users
  add constraint users_default_rdv_minutes_check
  check (default_rdv_minutes between 5 and 480);

comment on column public.users.default_rdv_minutes is
  'Duree par defaut d un RDV pour ce coach, en minutes (defaut 45). Utilisee quand le RDV ne porte pas de duree propre. Chantier Agenda V2 2026-07-27.';

-- ─── La durée portée par le RDV lui-même ─────────────────────────────────────
-- NULL = pas de durée spécifique → on retombe sur le réglage du coach.
alter table public.prospects
  add column if not exists duration_min integer;

alter table public.prospects
  drop constraint if exists prospects_duration_min_check;
alter table public.prospects
  add constraint prospects_duration_min_check
  check (duration_min is null or duration_min between 5 and 480);

comment on column public.prospects.duration_min is
  'Duree du RDV en minutes. NULL = duree par defaut du coach (users.default_rdv_minutes). Chantier Agenda V2 2026-07-27.';

alter table public.follow_ups
  add column if not exists duration_min integer;

alter table public.follow_ups
  drop constraint if exists follow_ups_duration_min_check;
alter table public.follow_ups
  add constraint follow_ups_duration_min_check
  check (duration_min is null or duration_min between 5 and 480);

comment on column public.follow_ups.duration_min is
  'Duree du suivi en minutes. NULL = duree par defaut du coach. Chantier Agenda V2 2026-07-27.';
