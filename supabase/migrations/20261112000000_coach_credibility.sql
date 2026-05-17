-- =============================================================================
-- Chantier #10 — Badges + certifications coach (2026-05-17)
--
-- Expose une RPC publique `get_coach_credibility(p_user_id)` consommée par la
-- page Welcome bilan online (et + tard /business, newsletter). Renvoie un
-- payload safe : prénom, rang Herbalife (clé + libellé court FR), nombre de
-- bilans initiaux réalisés, ancienneté en mois. AUCUNE donnée sensible.
--
-- Helper `get_coach_credibility_by_slug(p_slug)` : résout d'abord le slug
-- (mêmes règles que submit-online-bilan, sans accents, lowercase, alphanum
-- only) puis appelle get_coach_credibility.
--
-- SECURITY DEFINER : permet à un visiteur anonyme (page Welcome publique) de
-- lire ces stats sans contourner les RLS de `users` / `clients` / `assessments`.
-- Bornage strict : ne retourne JAMAIS l'email, le téléphone ou la sponsor
-- chain. Lecture seule.
-- =============================================================================

begin;

-- ─── 1. Helper de normalisation slug (mirror JS submit-online-bilan) ────────
create or replace function public.ls_normalize_slug(p_input text)
returns text
language sql
immutable
as $$
  select regexp_replace(
    translate(
      lower(coalesce(p_input, '')),
      'àáâãäåæçèéêëìíîïñòóôõöøùúûüýÿ',
      'aaaaaaaceeeeiiiinoooooouuuuyy'
    ),
    '[^a-z0-9]', '', 'g'
  );
$$;

comment on function public.ls_normalize_slug(text) is
  'Chantier #10 — normalise un prénom en slug URL (lowercase, sans accents, alphanum). Mirror exact de la fonction normalizeSlug() côté JS dans submit-online-bilan.';

-- ─── 2. Mapping rang → libellé court FR (cohérent avec RANK_LABELS front) ───
create or replace function public.ls_rank_short_label(p_rank text)
returns text
language sql
immutable
as $$
  select case p_rank
    when 'distributor_25'        then 'Distributor'
    when 'senior_consultant_35'  then 'Senior Consultant'
    when 'success_builder_42'    then 'Success Builder'
    when 'supervisor_50'         then 'Supervisor'
    when 'active_supervisor_50'  then 'Active Supervisor'
    when 'world_team_50'         then 'World Team'
    when 'active_world_team_50'  then 'Active World Team'
    when 'get_team_50'           then 'G.E.T. Team'
    when 'get_team_2500_50'      then 'G.E.T. 2 500 RO'
    when 'millionaire_50'        then 'Millionaire Team'
    when 'millionaire_7500_50'   then 'Millionaire 7 500 RO'
    when 'presidents_50'         then 'President''s Team'
    else 'Distributor'
  end;
$$;

-- ─── 3. RPC principale : get_coach_credibility(user_id) ─────────────────────
create or replace function public.get_coach_credibility(p_user_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_user record;
  v_bilans_count integer;
  v_tenure_months integer;
  v_first_name text;
begin
  if p_user_id is null then
    return null;
  end if;

  select id, name, current_rank, created_at, role, active
    into v_user
    from public.users
    where id = p_user_id
      and active = true
      and role in ('distributor', 'admin', 'referent')
    limit 1;

  if not found then
    return null;
  end if;

  -- Prénom : on prend la 1ʳᵉ partie du `name` (cohérent avec slug Welcome).
  v_first_name := nullif(split_part(coalesce(v_user.name, ''), ' ', 1), '');

  -- Compte les bilans initiaux du distri (uniquement type 'initial', les
  -- follow-ups n'inflatent pas la métrique).
  select count(*)::integer
    into v_bilans_count
    from public.assessments a
    join public.clients c on c.id = a.client_id
    where c.distributor_id = p_user_id
      and a.type = 'initial';

  -- Ancienneté en mois pleins depuis created_at (min 1 si compte du jour).
  v_tenure_months := greatest(
    1,
    extract(year from age(now(), v_user.created_at))::integer * 12
    + extract(month from age(now(), v_user.created_at))::integer
  );

  return jsonb_build_object(
    'user_id',        v_user.id,
    'first_name',     v_first_name,
    'name',           v_user.name,
    'rank',           v_user.current_rank,
    'rank_label',     public.ls_rank_short_label(v_user.current_rank),
    'bilans_count',   v_bilans_count,
    'tenure_months',  v_tenure_months
  );
end;
$$;

comment on function public.get_coach_credibility(uuid) is
  'Chantier #10 — Stats publiques d''un coach pour les pages Welcome bilan online / /business / newsletter. Lecture seule, données safe uniquement. SECURITY DEFINER pour bypass RLS sur clients/assessments.';

-- ─── 4. RPC slug → credibility (utilisée par la page Welcome) ───────────────
create or replace function public.get_coach_credibility_by_slug(p_slug text)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_slug text;
  v_user_id uuid;
begin
  v_slug := public.ls_normalize_slug(p_slug);
  if v_slug is null or length(v_slug) < 2 then
    return null;
  end if;

  select id
    into v_user_id
    from public.users
    where active = true
      and role in ('distributor', 'admin', 'referent')
      and public.ls_normalize_slug(split_part(coalesce(name, ''), ' ', 1)) = v_slug
    order by created_at asc
    limit 1;

  if v_user_id is null then
    return null;
  end if;

  return public.get_coach_credibility(v_user_id);
end;
$$;

comment on function public.get_coach_credibility_by_slug(text) is
  'Chantier #10 — Résout un slug coach (prénom normalisé) → user_id, puis renvoie le payload credibility. Mirror exact de la résolution de submit-online-bilan.';

-- ─── 5. Permissions : lecture publique (page Welcome anonyme) ───────────────
grant execute on function public.get_coach_credibility(uuid) to anon, authenticated;
grant execute on function public.get_coach_credibility_by_slug(text) to anon, authenticated;
grant execute on function public.ls_normalize_slug(text) to anon, authenticated;
grant execute on function public.ls_rank_short_label(text) to anon, authenticated;

commit;
