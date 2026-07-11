-- =============================================================================
-- Témoignages — catégorie (2026-07-11)
-- =============================================================================
-- Sépare coaching (défaut, existant) / skin (boutique HL SKIN) / business.
-- Réutilise toute l'infra client_testimonials (RLS, modération admin, notifs,
-- carousel). Les lignes existantes deviennent 'coaching' (défaut). Idempotent.
-- =============================================================================

alter table public.client_testimonials
  add column if not exists category text not null default 'coaching';

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'client_testimonials_category_check'
  ) then
    alter table public.client_testimonials
      add constraint client_testimonials_category_check
      check (category in ('coaching','skin','business'));
  end if;
end $$;

create index if not exists idx_testimonials_category_approved
  on public.client_testimonials (category, coach_user_id, created_at desc)
  where status = 'approved';

comment on column public.client_testimonials.category is
  'coaching (défaut/existant) | skin (boutique HL SKIN) | business. Filtre l''affichage par contexte.';
