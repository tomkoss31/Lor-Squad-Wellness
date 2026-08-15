-- =============================================================================
-- Identité vendeur : adapter au statut VDI (2026-08-11, retour Thomas).
--
-- ⚠️ LE SIRET N'EST PLUS BLOQUANT. Un vendeur à domicile indépendant (VDI) est
-- dispensé d'immatriculation au RCS/RSAC tant qu'il reste sous le seuil (50 %
-- du PASS, 24 030 € en 2026) et dans ses 3 premières années civiles.
--
-- ⚠️ NUANCE À NE PAS CONFONDRE : cette dispense porte sur le REGISTRE (RCS),
-- PAS sur le SIRET. Depuis février 2024, un VDI déclare son activité au guichet
-- unique INPI sous 15 jours et reçoit un code APE + un SIRET. La plupart des
-- VDI en ont donc un. On le demande, on l'affiche s'il existe, mais on ne
-- ferme pas la boutique de celle qui ne l'a pas encore reçu.
--
-- Ce qui devient obligatoire pour identifier un vendeur particulier en ligne :
-- nom, adresse, email ET TÉLÉPHONE (le téléphone remplace le SIRET dans le
-- noyau — un acheteur doit pouvoir joindre son vendeur).
-- =============================================================================

alter table public.users
  add column if not exists legal_status text;

comment on column public.users.legal_status is
  'Statut du vendeur : vdi | auto | societe. Pilote la mention légale affichée '
  '(un VDI non immatriculé doit indiquer sa dispense de RCS).';

-- Pré-remplir : Thomas est en société, les autres sont VDI par défaut.
update public.users
   set legal_status = case when boutique_slug = 'thomas' then 'societe' else 'vdi' end
 where legal_status is null and boutique_slug is not null;

-- Noyau obligatoire, VERSION 2 : le SIRET sort, le téléphone entre.
create or replace function public.boutique_legal_complete(p_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public, extensions
as $$
  select coalesce(
    length(trim(coalesce(u.legal_entity_name, ''))) > 1
    and length(trim(coalesce(u.legal_address, ''))) > 5
    and coalesce(u.legal_email, '') ~ '^[^@[:space:]]+@[^@[:space:]]+\.[a-zA-Z]{2,}$'
    -- au moins 8 chiffres : un acheteur doit pouvoir joindre son vendeur
    and length(regexp_replace(coalesce(u.shop_contact_phone, ''), '\D', '', 'g')) >= 8
    and length(trim(coalesce(u.legal_director, ''))) > 2,
    false)
  from public.users u
  where u.id = p_user_id;
$$;

revoke all on function public.boutique_legal_complete(uuid) from public;
grant execute on function public.boutique_legal_complete(uuid) to authenticated, anon;

-- RPC publique : ajoute le statut (le téléphone est déjà exposé par contact_phone).
create or replace function public.get_boutique_by_slug(p_slug text)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $function$
declare
  v_slug text;
  v_user record;
begin
  v_slug := public.ls_normalize_slug(p_slug);
  if v_slug is null or length(v_slug) < 2 then
    return null;
  end if;

  select id, name, shop_name, avatar_url, boutique_active,
         boutique_hero_video_url, shop_contact_phone, boutique_ai_scan_url,
         legal_entity_name, legal_form, legal_status, legal_address, legal_siret,
         legal_email, legal_director, legal_vat, legal_rcs, legal_capital,
         legal_mediator_name, legal_mediator_url
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
    'ai_scan_url',    v_user.boutique_ai_scan_url,
    'legal', jsonb_build_object(
      'entity_name',   nullif(trim(coalesce(v_user.legal_entity_name, '')), ''),
      'form',          nullif(trim(coalesce(v_user.legal_form, '')), ''),
      'status',        nullif(trim(coalesce(v_user.legal_status, '')), ''),
      'address',       nullif(trim(coalesce(v_user.legal_address, '')), ''),
      'siret',         nullif(trim(coalesce(v_user.legal_siret, '')), ''),
      'email',         nullif(trim(coalesce(v_user.legal_email, '')), ''),
      'phone',         nullif(trim(coalesce(v_user.shop_contact_phone, '')), ''),
      'director',      nullif(trim(coalesce(v_user.legal_director, '')), ''),
      'vat',           nullif(trim(coalesce(v_user.legal_vat, '')), ''),
      'rcs',           nullif(trim(coalesce(v_user.legal_rcs, '')), ''),
      'capital',       nullif(trim(coalesce(v_user.legal_capital, '')), ''),
      'mediator_name', nullif(trim(coalesce(v_user.legal_mediator_name, '')), ''),
      'mediator_url',  nullif(trim(coalesce(v_user.legal_mediator_url, '')), ''),
      'complete',      public.boutique_legal_complete(v_user.id)
    )
  );
end;
$function$;
