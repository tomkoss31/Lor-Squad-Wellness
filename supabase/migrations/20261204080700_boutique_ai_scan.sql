-- =============================================================================
-- Boutique HL SKIN — lien HL/Skin AI (analyse de peau par IA) (2026-07-11)
-- =============================================================================
--
-- HL/Skin AI (hlskin.ai) : chaque distri crée son lien unique (login Herbalife),
-- le client scanne son visage → diagnostic + reco produits en <60 s. On stocke
-- le lien du distri pour le mettre en avant sur sa boutique + le Co-pilote.
-- Idempotent.
-- =============================================================================

begin;

alter table public.users
  add column if not exists boutique_ai_scan_url text;

comment on column public.users.boutique_ai_scan_url is
  'Boutique HL SKIN — lien HL/Skin AI (hlskin.ai) unique du distri pour l''analyse de peau.';

-- Exposer le lien dans la RPC publique de la boutique.
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
         boutique_hero_video_url, shop_contact_phone, boutique_ai_scan_url
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
    'contact_phone',  v_user.shop_contact_phone,
    'ai_scan_url',    v_user.boutique_ai_scan_url
  );
end;
$$;

grant execute on function public.get_boutique_by_slug(text) to anon, authenticated;

commit;
