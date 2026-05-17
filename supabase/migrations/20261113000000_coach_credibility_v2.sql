-- =============================================================================
-- Chantier #10 V2 — badges coach (2026-05-17, après feedback Thomas)
--
-- V1 affichait : 🏆 rang + 📋 bilans réalisés + 🗓 ancienneté app.
-- Problèmes :
--   - "X bilans réalisés" décrédibilise les nouveaux distri (0-5 bilans).
--   - "X mois d'expérience" basé sur users.created_at = ancienneté DANS
--     l'app, pas ancienneté coaching Herbalife → fausse pour tous les
--     coachs experts qui arrivent sur La Base 360.
--
-- V2 :
--   - DROP du chip "bilans réalisés".
--   - Ancienneté basée sur un nouveau champ `users.coaching_since` (date),
--     saisi manuellement par chaque distri dans Paramètres > Profil.
--     NULL = pas de chip ancienneté affiché.
--   - Nouveau chip "📍 ville" (réutilise `users.city` déjà existant).
--     NULL = pas de chip ville affiché.
--
-- Logique d'affichage finale :
--   - Rang : toujours affiché (au pire "Distributor (25%)" si défaut).
--   - Ville : affichée si `city` non null.
--   - Ancienneté : affichée si `coaching_since` non null.
-- =============================================================================

begin;

-- 1. Nouveau champ coaching_since
alter table public.users
  add column if not exists coaching_since date;

comment on column public.users.coaching_since is
  'Chantier #10 V2 — Date à laquelle le distri a commencé son activité Herbalife (saisi manuellement Paramètres > Profil). Sert à calculer le badge ancienneté visible sur la page Welcome bilan online. NULL = pas affiché.';

-- 2. Remplace get_coach_credibility (drop bilans_count, add city + coaching_since)
create or replace function public.get_coach_credibility(p_user_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_user record;
  v_tenure_months integer;
  v_first_name text;
begin
  if p_user_id is null then
    return null;
  end if;

  select id, name, current_rank, coaching_since, city, role, active
    into v_user
    from public.users
    where id = p_user_id
      and active = true
      and role in ('distributor', 'admin', 'referent')
    limit 1;

  if not found then
    return null;
  end if;

  v_first_name := nullif(split_part(coalesce(v_user.name, ''), ' ', 1), '');

  -- Ancienneté basée sur coaching_since (et non users.created_at). Si null,
  -- on renvoie null → le front ne montre pas le chip.
  if v_user.coaching_since is null then
    v_tenure_months := null;
  else
    v_tenure_months := greatest(
      1,
      extract(year from age(now(), v_user.coaching_since::timestamptz))::integer * 12
      + extract(month from age(now(), v_user.coaching_since::timestamptz))::integer
    );
  end if;

  return jsonb_build_object(
    'user_id',        v_user.id,
    'first_name',     v_first_name,
    'name',           v_user.name,
    'rank',           v_user.current_rank,
    'rank_label',     public.ls_rank_short_label(v_user.current_rank),
    'city',           v_user.city,
    'coaching_since', v_user.coaching_since,
    'tenure_months',  v_tenure_months
  );
end;
$$;

comment on function public.get_coach_credibility(uuid) is
  'Chantier #10 V2 — Stats publiques coach (rang + ville + ancienneté coaching Herbalife). Lecture seule, données safe. SECURITY DEFINER pour bypass RLS users.';

commit;
