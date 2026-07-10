-- =============================================================================
-- Boutique HL SKIN — get_boutique_by_slug v2 : expose vidéo hero + téléphone
-- (chantier Étape 6, 2026-07-10). Idempotent (create or replace).
-- =============================================================================

create or replace function public.get_boutique_by_slug(p_slug text)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_slug text;
  v_user record;
begin
  v_slug := public.ls_normalize_slug(p_slug);
  if v_slug is null or length(v_slug) < 2 then
    return null;
  end if;

  select id, name, shop_name, avatar_url, boutique_active,
         boutique_hero_video_url, shop_contact_phone
    into v_user
    from public.users
    where boutique_active = true
      and boutique_slug = v_slug
    limit 1;

  if not found then
    return null;
  end if;

  return jsonb_build_object(
    'user_id',        v_user.id,
    'first_name',     nullif(split_part(coalesce(v_user.name, ''), ' ', 1), ''),
    'shop_name',      coalesce(nullif(v_user.shop_name, ''), 'Beauté K Skin'),
    'avatar_url',     v_user.avatar_url,
    'hero_video_url', v_user.boutique_hero_video_url,
    'contact_phone',  v_user.shop_contact_phone
  );
end;
$$;

grant execute on function public.get_boutique_by_slug(text) to anon, authenticated;
