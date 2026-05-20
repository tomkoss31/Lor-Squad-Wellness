-- =============================================================================
-- Chantier #11 V1.1 (2026-05-18) — Lien generique par coach
-- =============================================================================
-- Retour Thomas : le lien per-client est lourd (faut aller dans la fiche).
-- Pivot vers lien generique /temoignage/coach/<slug> partageable en bulk.
-- client_id devient nullable, ajout coach_slug snapshot. Drop cron J+60 qui
-- n'a plus de sens (plus de cible client individuelle).
-- =============================================================================

begin;

-- ─── Schema ──────────────────────────────────────────────────────────────────
alter table public.client_testimonials
  alter column client_id drop not null;

alter table public.client_testimonials
  add column if not exists coach_slug text;

-- L'index existant sur client_id reste utile (lookup admin par client).
-- Pas d'unique sur (client_id) car la regle anti-doublon V1 est cote edge fn.

-- ─── Drop cron J+60 (plus pertinent avec lien generique) ─────────────────────
do $$
begin
  if exists (select 1 from cron.job where jobname = 'request-testimonial-daily') then
    perform cron.unschedule('request-testimonial-daily');
  end if;
end$$;

drop function if exists public.get_testimonial_request_candidates(timestamptz, timestamptz);

-- ─── Comments ────────────────────────────────────────────────────────────────
comment on column public.client_testimonials.client_id is
  'Optionnel : client_id si soumis via lien per-client legacy /temoignage/:token.
  NULL si soumis via lien generique /temoignage/coach/:slug.';
comment on column public.client_testimonials.coach_slug is
  'Snapshot du slug coach au moment de la soumission. Utilise quand client_id
  est NULL (mode lien generique). Le slug = ls_normalize_slug(users.first_name).';

commit;
