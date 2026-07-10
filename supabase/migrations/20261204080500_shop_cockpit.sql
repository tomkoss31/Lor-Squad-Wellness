-- =============================================================================
-- Chantier Boutique HL SKIN — Étape 6 : cockpit config distri (2026-07-10)
-- =============================================================================
--
-- Champs config boutique (téléphone contact + vidéo hero) + compteur de visites
-- (visible coach/admin dans le cockpit). Le tracking de visite est incrémenté
-- côté public via RPC SECURITY DEFINER (pattern track-newsletter-view).
-- Idempotent.
-- =============================================================================

begin;

alter table public.users
  add column if not exists shop_contact_phone     text,
  add column if not exists boutique_hero_video_url text;

comment on column public.users.boutique_hero_video_url is
  'Boutique HL SKIN — URL de la vidéo hero (YouTube ou MP4 direct). Vide = animation par défaut.';

-- Compteur de visites journalier par boutique.
create table if not exists public.shop_visit_daily (
  coach_user_id uuid not null references public.users(id) on delete cascade,
  day           date not null,
  count         integer not null default 0,
  primary key (coach_user_id, day)
);

comment on table public.shop_visit_daily is
  'Boutique HL SKIN — compteur de visites par jour et par distri (affiché au cockpit).';

alter table public.shop_visit_daily enable row level security;

drop policy if exists shop_visit_daily_owner_read on public.shop_visit_daily;
create policy shop_visit_daily_owner_read
  on public.shop_visit_daily for select to authenticated
  using (coach_user_id = auth.uid()
    or exists (select 1 from public.users u where u.id = auth.uid() and u.role = 'admin'));

-- Incrément public d'une visite (résout la boutique par slug, ignore si inactive).
create or replace function public.track_boutique_visit(p_slug text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_slug text;
  v_uid  uuid;
begin
  v_slug := public.ls_normalize_slug(p_slug);
  if v_slug is null or length(v_slug) < 2 then
    return;
  end if;
  select id into v_uid
    from public.users
    where boutique_active = true and boutique_slug = v_slug
    limit 1;
  if v_uid is null then
    return;
  end if;
  insert into public.shop_visit_daily (coach_user_id, day, count)
    values (v_uid, current_date, 1)
    on conflict (coach_user_id, day) do update set count = public.shop_visit_daily.count + 1;
end;
$$;

comment on function public.track_boutique_visit(text) is
  'Boutique HL SKIN — incrémente le compteur de visites du jour. SECURITY DEFINER, appelable anon.';

grant execute on function public.track_boutique_visit(text) to anon, authenticated;

commit;
