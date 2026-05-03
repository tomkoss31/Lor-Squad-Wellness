-- =============================================================================
-- Charte du distributeur — preferred_template (2026-05-03)
--
-- Permet au distri de choisir parmi 3 templates :
--   - officielle (default) : A4 paper crème classique
--   - manifeste            : A4 paper, serment poétique original
--   - story                : 9:16 dark luxury (partage Instagram)
--
-- Persisté sur la même row que pourquoi_text/objectif/signature.
-- Si admin/sponsor ouvre /distributors/:id/charte, il voit le template
-- choisi par le distri.
-- =============================================================================

begin;

alter table public.distributor_charters
  add column if not exists preferred_template text not null default 'officielle';

alter table public.distributor_charters
  drop constraint if exists charters_preferred_template_check;

alter table public.distributor_charters
  add constraint charters_preferred_template_check
  check (preferred_template in ('officielle', 'manifeste', 'story'));

comment on column public.distributor_charters.preferred_template is
  'Template visuel choisi pour le rendu de la charte. 3 valeurs : officielle / manifeste / story.';

commit;
