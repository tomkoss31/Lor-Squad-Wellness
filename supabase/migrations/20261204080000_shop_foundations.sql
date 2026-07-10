-- =============================================================================
-- Chantier Boutique HL SKIN — Étape 1 : fondations data (2026-07-10)
-- =============================================================================
--
-- Socle e-commerce de la boutique « Beauté K Skin » (mini-site de vente par
-- distributrice, identité cosmétique, paiement Stripe compte-du-distri).
--
-- Contenu :
--   1. Table `shop_products` = catalogue boutique GLOBAL (gamme HL SKIN),
--      distinct du module PV (`pv_products` reste au suivi coach). Prix TTC
--      public national, donc catalogue partagé — pas de coach_user_id ici.
--   2. Colonnes boutique sur `users` : nom de boutique personnalisable +
--      slug URL unique (opt-in) + flag d'activation. Corrige au passage la
--      collision de prénoms de `/coach/:slug` (slug custom dédié).
--   3. RPC publique `get_boutique_by_slug` (SECURITY DEFINER, grant anon) :
--      résout la boutique publique d'une distri, payload safe uniquement.
--   4. Bucket Storage `product-images` (lecture publique, upload admin).
--
-- Aucune logique existante n'est touchée : tout est additif. Idempotent.
-- Datetime : timestamptz partout (règle projet).
-- =============================================================================

begin;

-- ─── 1. Catalogue boutique global ───────────────────────────────────────────
create table if not exists public.shop_products (
  id                uuid primary key default gen_random_uuid(),
  slug              text not null unique,        -- id URL stable (ex 'serum-niacinamide')
  legacy_catalog_id text,                         -- lien vers pvCatalog.ts (ex 'hlskin-niacinamide')
  name              text not null,
  tagline           text,                         -- desc courte (carte produit)
  description       text,                         -- desc longue (fiche produit)
  concern           text,                         -- 'eclat' | 'pores' | 'age' | 'hydratation'
  ingredient_hero   text,                         -- storytelling actif héros
  how_to            text,                         -- mode d'emploi
  benefits          jsonb  not null default '[]'::jsonb,  -- ["bénéfice 1", ...]
  faq               jsonb  not null default '[]'::jsonb,  -- [{"q":"...","a":"..."}]
  price_ttc         numeric(10,2) not null,       -- prix public TTC (EUR)
  currency          text   not null default 'EUR',
  pv                numeric(10,2) not null default 0,
  volume_label      text,                         -- ex '30 ml', 'cure 30 doses'
  images            jsonb  not null default '[]'::jsonb,  -- [{"url":"...","kind":"packshot|texture|lifestyle|before_after"}]
  badge             text,                         -- 'best-seller' | 'new' | null
  rating            numeric(2,1),                 -- null tant qu'il n'y a pas d'avis réels
  reviews_count     integer not null default 0,
  stock             integer,                      -- null = illimité
  active            boolean not null default true,
  sort_order        integer not null default 0,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

comment on table public.shop_products is
  'Boutique HL SKIN — catalogue e-commerce global (gamme partagée, prix public national). Distinct de pv_products (suivi coach).';

create index if not exists shop_products_active_sort_idx
  on public.shop_products (active, sort_order);

alter table public.shop_products enable row level security;

-- Lecture publique des produits actifs (page boutique = anonyme).
drop policy if exists shop_products_public_read on public.shop_products;
create policy shop_products_public_read
  on public.shop_products
  for select
  to anon, authenticated
  using (active = true);

-- Écriture réservée aux admins (catalogue géré côté admin).
drop policy if exists shop_products_admin_write on public.shop_products;
create policy shop_products_admin_write
  on public.shop_products
  for all
  to authenticated
  using (exists (select 1 from public.users u where u.id = auth.uid() and u.role = 'admin'))
  with check (exists (select 1 from public.users u where u.id = auth.uid() and u.role = 'admin'));

grant select on public.shop_products to anon, authenticated;

-- ─── 2. Identité boutique sur users ─────────────────────────────────────────
alter table public.users
  add column if not exists shop_name       text,
  add column if not exists boutique_slug    text,
  add column if not exists boutique_active  boolean not null default false;

comment on column public.users.shop_name is
  'Nom de boutique HL SKIN personnalisable par la distri (fallback applicatif si null).';
comment on column public.users.boutique_slug is
  'Slug URL unique de la boutique (/boutique/<slug>), normalisé via ls_normalize_slug. Opt-in.';
comment on column public.users.boutique_active is
  'La boutique HL SKIN est-elle publiée / accessible publiquement.';

-- Unicité du slug (partielle : plusieurs NULL autorisés).
create unique index if not exists users_boutique_slug_uidx
  on public.users (boutique_slug)
  where boutique_slug is not null;

-- ─── 3. RPC publique : résolution boutique par slug ─────────────────────────
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

  select id, name, shop_name, avatar_url, boutique_active
    into v_user
    from public.users
    where boutique_active = true
      and boutique_slug = v_slug
    limit 1;

  if not found then
    return null;
  end if;

  -- Payload SAFE uniquement (jamais email / téléphone / sponsor chain).
  return jsonb_build_object(
    'user_id',    v_user.id,
    'first_name', nullif(split_part(coalesce(v_user.name, ''), ' ', 1), ''),
    'shop_name',  coalesce(nullif(v_user.shop_name, ''), 'Beauté K Skin'),
    'avatar_url', v_user.avatar_url
  );
end;
$$;

comment on function public.get_boutique_by_slug(text) is
  'Boutique HL SKIN — résout la boutique publique d''une distri par slug. Payload safe, lecture seule, SECURITY DEFINER pour visiteur anonyme.';

grant execute on function public.get_boutique_by_slug(text) to anon, authenticated;

-- ─── 4. Bucket Storage images produit ───────────────────────────────────────
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'product-images',
  'product-images',
  true,                                        -- lecture publique (photos boutique)
  5 * 1024 * 1024,                             -- 5 MB / image
  array['image/png', 'image/jpeg', 'image/webp', 'image/avif']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists product_images_admin_insert on storage.objects;
create policy product_images_admin_insert
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'product-images'
    and exists (select 1 from public.users u where u.id = auth.uid() and u.role = 'admin')
  );

drop policy if exists product_images_admin_update on storage.objects;
create policy product_images_admin_update
  on storage.objects for update to authenticated
  using (
    bucket_id = 'product-images'
    and exists (select 1 from public.users u where u.id = auth.uid() and u.role = 'admin')
  );

drop policy if exists product_images_admin_delete on storage.objects;
create policy product_images_admin_delete
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'product-images'
    and exists (select 1 from public.users u where u.id = auth.uid() and u.role = 'admin')
  );

commit;
