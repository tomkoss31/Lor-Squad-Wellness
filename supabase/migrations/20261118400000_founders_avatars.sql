-- =============================================================================
-- Founders avatars — RPC publique pour /business §05 (2026-05-18)
-- =============================================================================
-- Expose les avatars de Thomas et Mélanie pour le bloc fondateurs sur la
-- page publique /business. Les noms/IDs sont identifiés par role + position
-- dans l'équipe : admin actif le plus ancien (Thomas) + 2e admin actif le
-- plus ancien (Mélanie).
--
-- Pas d'expo d'autres champs sensibles. Just l'URL publique de l'avatar
-- (déjà publique de fait dans le bucket Storage).
-- =============================================================================

begin;

create or replace function public.get_founders_avatars()
returns table (
  thomas_avatar_url text,
  melanie_avatar_url text
)
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_thomas_avatar text;
  v_melanie_avatar text;
begin
  -- Thomas : 1er admin actif (par created_at)
  select avatar_url into v_thomas_avatar
    from public.users
   where role = 'admin'
     and active = true
     and length(coalesce(avatar_url, '')) > 0
   order by created_at asc
   limit 1;

  -- Mélanie : 2e admin actif. Si seul 1 admin existe, retourne NULL.
  select avatar_url into v_melanie_avatar
    from public.users
   where role = 'admin'
     and active = true
     and length(coalesce(avatar_url, '')) > 0
   order by created_at asc
   offset 1 limit 1;

  thomas_avatar_url := v_thomas_avatar;
  melanie_avatar_url := v_melanie_avatar;
  return next;
end;
$$;

grant execute on function public.get_founders_avatars() to anon, authenticated;

comment on function public.get_founders_avatars() is
  'Public : expose les avatars des 2 fondateurs (admins actifs les plus
   anciens) pour le bloc §05 Témoignages de /business. Pas d''autres
   donnees sensibles. 2026-05-18.';

-- ─── Avatars par slug (partenaires §05) ─────────────────────────────────────
-- Permet de hydrater les avatars partenaires affichés sur /business §05
-- (Ambre, Laura, Valentin, etc.) en lookant via le prénom normalisé.
-- Réutilise ls_normalize_slug (migration 20261118300000).

create or replace function public.get_avatars_by_slugs(p_slugs text[])
returns table (slug text, avatar_url text)
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  return query
  with input as (
    select unnest(p_slugs) as s
  )
  select i.s, u.avatar_url
    from input i
    left join lateral (
      select avatar_url
        from public.users u2
       where u2.active = true
         and u2.role in ('distributor', 'admin', 'referent')
         and length(coalesce(u2.avatar_url, '')) > 0
         and public.ls_normalize_slug(split_part(coalesce(u2.name, ''), ' ', 1)) = i.s
       limit 1
    ) u on true;
end;
$$;

grant execute on function public.get_avatars_by_slugs(text[]) to anon, authenticated;

comment on function public.get_avatars_by_slugs(text[]) is
  'Public : lookup d''avatars partenaires par slug prénom normalisé. Utilisé
   par /business §05 pour les cards partenaires. Retourne avatar_url=NULL si
   slug non trouvé (fallback gradient initiale côté front). 2026-05-18.';

commit;
