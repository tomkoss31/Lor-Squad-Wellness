-- =============================================================================
-- Agenda V2 — LOT 6.3 : la couleur de chaque coach dans l'agenda (2026-07-27).
--
-- Jusqu'ici la couleur était dérivée d'un hash de l'identifiant : stable, mais
-- arbitraire — personne ne pouvait dire « le violet, c'est Mélanie ». Décision
-- Thomas : comme TimeTree, chacun CHOISIT sa couleur, et elle ne bouge plus.
--
-- NULL = pas encore choisie → le front retombe sur l'ancienne palette dérivée
-- de l'identifiant. Aucun agenda ne devient gris en attendant que l'équipe
-- passe régler son profil.
-- =============================================================================

alter table public.users
  add column if not exists calendar_color text;

comment on column public.users.calendar_color is
  'Couleur du coach dans l agenda (hex #RRGGBB). NULL = non choisie, le front derive une couleur de l identifiant. Chantier Agenda V2 2026-07-27.';

-- Garde-fou : on stocke un hex court et rien d'autre. Sans ça, une valeur
-- fantaisiste finirait injectée telle quelle dans un style CSS.
alter table public.users
  drop constraint if exists users_calendar_color_check;
alter table public.users
  add constraint users_calendar_color_check
  check (calendar_color is null or calendar_color ~ '^#[0-9A-Fa-f]{6}$');
