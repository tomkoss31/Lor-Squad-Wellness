-- =============================================================================
-- Identité légale du VENDEUR par distributeur (correction juridique 2026-08-11).
--
-- ⚠️ LE PROBLÈME CORRIGÉ : les pages légales de CHAQUE boutique affichaient les
-- constantes COMPANY_* de src/lib/branding.ts, c'est-à-dire SAS HTM FITLIFE,
-- son SIRET, l'adresse personnelle de Thomas et sa boîte mail. Les CGV de la
-- boutique de Victoria déclaraient donc SAS HTM FITLIFE comme VENDEUR de ses
-- produits — responsabilité contractuelle, réclamations et litiges rattachés à
-- Thomas pour des ventes qu'il ne réalise pas. 6 commandes réelles étaient déjà
-- passées dans ces conditions.
--
-- LE MODÈLE CORRECT :
--   • VENDEUR / éditeur de la boutique = LE DISTRIBUTEUR (ces colonnes)
--   • Solution technique (plateforme)  = La Base 360 / SAS HTM FITLIFE
--   • Hébergement                      = Supabase (Irlande) + Vercel
-- La Base 360 n'est PAS l'hébergeur au sens de la LCEN : c'est le fournisseur
-- de la solution. Ne pas écrire « hébergé par La Base 360 » — ce serait faux.
-- =============================================================================

alter table public.users
  -- Identité du vendeur (obligatoires pour vendre en ligne à des particuliers)
  add column if not exists legal_entity_name text,   -- raison sociale, ou « Prénom Nom » en entreprise individuelle
  add column if not exists legal_form       text,    -- Auto-entrepreneur, EI, SASU, SARL…
  add column if not exists legal_address    text,    -- adresse complète du siège
  add column if not exists legal_siret      text,    -- 14 chiffres
  add column if not exists legal_email      text,    -- contact & réclamations
  add column if not exists legal_director   text,    -- directeur de la publication
  -- Facultatifs selon la forme juridique
  add column if not exists legal_vat        text,    -- TVA intracom (souvent absent : franchise en base)
  add column if not exists legal_rcs        text,    -- ville d'immatriculation RCS (sociétés)
  add column if not exists legal_capital    text,    -- capital social (sociétés)
  -- Médiateur de la consommation : obligatoire pour la vente en ligne B2C
  add column if not exists legal_mediator_name text,
  add column if not exists legal_mediator_url  text;

comment on column public.users.legal_entity_name is
  'Vendeur affiché sur SA boutique. Ne JAMAIS retomber sur les constantes '
  'COMPANY_* (SAS HTM FITLIFE) : cela attribuerait ses ventes à la plateforme.';

-- Le noyau sans lequel une boutique ne peut pas légalement vendre.
-- Le médiateur en est volontairement EXCLU : il est obligatoire mais aucun
-- distributeur n'y a encore adhéré — le bloquer fermerait toutes les boutiques.
-- Il est signalé comme avertissement dans le cockpit, pas comme verrou.
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
    and length(regexp_replace(coalesce(u.legal_siret, ''), '\D', '', 'g')) = 14
    and coalesce(u.legal_email, '') ~ '^[^@[:space:]]+@[^@[:space:]]+\.[a-zA-Z]{2,}$'
    and length(trim(coalesce(u.legal_director, ''))) > 2,
    false)
  from public.users u
  where u.id = p_user_id;
$$;

revoke all on function public.boutique_legal_complete(uuid) from public;
grant execute on function public.boutique_legal_complete(uuid) to authenticated, anon;

-- ── RPC publique : expose l'identité DU VENDEUR aux pages de sa boutique ─────
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
         legal_entity_name, legal_form, legal_address, legal_siret, legal_email,
         legal_director, legal_vat, legal_rcs, legal_capital,
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
    -- Identité du vendeur : ces champs pilotent les mentions légales et les CGV.
    'legal', jsonb_build_object(
      'entity_name',   nullif(trim(coalesce(v_user.legal_entity_name, '')), ''),
      'form',          nullif(trim(coalesce(v_user.legal_form, '')), ''),
      'address',       nullif(trim(coalesce(v_user.legal_address, '')), ''),
      'siret',         nullif(trim(coalesce(v_user.legal_siret, '')), ''),
      'email',         nullif(trim(coalesce(v_user.legal_email, '')), ''),
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
