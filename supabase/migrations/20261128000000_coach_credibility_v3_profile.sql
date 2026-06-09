-- =============================================================================
-- Chantier #13-B — Fiche distri PUBLIQUE (2026-06-08)
--
-- V3 de get_coach_credibility : ajoute les champs nécessaires à la page
-- publique /coach/:slug, en plus de ce que renvoyait V2 (rang/ville/ancienneté).
-- Champs ajoutés (additifs, non-breaking — les consommateurs V2 les ignorent) :
--   - avatar_url  : photo du coach (Supabase Storage) → hero
--   - bio         : texte de présentation court (Paramètres > Profil)
--   - bilans_count   : nb de bilans initiaux réalisés (preuve sociale)
--   - clients_count  : nb de personnes accompagnées (preuve sociale)
--
-- ⚠️ Les compteurs sont renvoyés bruts ; le FRONT décide de les afficher
--    seulement au-dessus d'un seuil (ne pas décrédibiliser un distri débutant
--    avec "1 personne accompagnée" — cf. raison du DROP en V2).
--
-- SECURITY DEFINER + données safe uniquement (jamais email/téléphone/sponsor).
-- =============================================================================

begin;

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
  v_bilans_count integer;
  v_clients_count integer;
begin
  if p_user_id is null then
    return null;
  end if;

  select id, name, current_rank, coaching_since, city, avatar_url, bio, role, active
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

  if v_user.coaching_since is null then
    v_tenure_months := null;
  else
    v_tenure_months := greatest(
      1,
      extract(year from age(now(), v_user.coaching_since::timestamptz))::integer * 12
      + extract(month from age(now(), v_user.coaching_since::timestamptz))::integer
    );
  end if;

  select count(*)::integer
    into v_bilans_count
    from public.assessments a
    join public.clients c on c.id = a.client_id
    where c.distributor_id = p_user_id
      and a.type = 'initial';

  select count(*)::integer
    into v_clients_count
    from public.clients
    where distributor_id = p_user_id;

  return jsonb_build_object(
    'user_id',        v_user.id,
    'first_name',     v_first_name,
    'name',           v_user.name,
    'rank',           v_user.current_rank,
    'rank_label',     public.ls_rank_short_label(v_user.current_rank),
    'city',           v_user.city,
    'coaching_since', v_user.coaching_since,
    'tenure_months',  v_tenure_months,
    'avatar_url',     v_user.avatar_url,
    'bio',            v_user.bio,
    'bilans_count',   v_bilans_count,
    'clients_count',  v_clients_count
  );
end;
$$;

comment on function public.get_coach_credibility(uuid) is
  'Chantier #13-B V3 — Stats publiques coach + avatar/bio + compteurs (bilans/clients) pour la fiche publique /coach/:slug. Compteurs bruts : le front applique un seuil d''affichage. Lecture seule, données safe. SECURITY DEFINER.';

commit;
