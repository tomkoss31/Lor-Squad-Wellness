-- =============================================================================
-- Chantier Boutique HL SKIN — Étape 4 : commandes + checkout (2026-07-10)
-- =============================================================================
--
-- `shop_orders` = commande boutique. Créée en 'pending' AU MOMENT du checkout
-- (email + adresse capturés AVANT le paiement → lead récupéré même si abandon
-- ou si la distri n'a pas encore branché Stripe). Passe à 'paid' via
-- confirm-shop-payment (vérif serveur Stripe, compte du distri, sans webhook).
-- `shop_order_items` = lignes (prix figés serveur au moment de la commande).
--
-- Écriture = edges service_role uniquement (aucune policy insert/update). Lecture
-- = distri propriétaire + admin. Idempotent.
-- =============================================================================

begin;

create table if not exists public.shop_orders (
  id                  uuid primary key default gen_random_uuid(),
  coach_user_id       uuid not null references public.users(id),
  boutique_slug       text,
  customer_email      text not null,
  customer_first_name text,
  customer_last_name  text,
  customer_phone      text,
  shipping_address    jsonb,                 -- {line1,line2,postal_code,city,country}
  currency            text not null default 'EUR',
  subtotal_cents      integer not null,
  discount_cents      integer not null default 0,
  promo_code          text,
  promo_code_id       uuid references public.promo_codes(id) on delete set null,
  shipping_cents      integer not null default 0,
  total_cents         integer not null,
  status              text not null default 'pending',  -- pending|paid|canceled|failed
  provider            text not null default 'stripe',
  provider_session_id text,
  payment_url         text,
  lead_captured_at    timestamptz not null default now(),
  created_at          timestamptz not null default now(),
  paid_at             timestamptz
);

comment on table public.shop_orders is
  'Boutique HL SKIN — commandes. Créées pending au checkout (lead capturé avant paiement). paid via confirm-shop-payment.';

create index if not exists shop_orders_coach_idx on public.shop_orders (coach_user_id, created_at desc);
create index if not exists shop_orders_session_idx on public.shop_orders (provider_session_id);
create index if not exists shop_orders_status_idx on public.shop_orders (status);

create table if not exists public.shop_order_items (
  id               uuid primary key default gen_random_uuid(),
  order_id         uuid not null references public.shop_orders(id) on delete cascade,
  product_id       uuid references public.shop_products(id) on delete set null,
  product_slug     text,
  product_name     text not null,
  unit_price_cents integer not null,
  quantity         integer not null,
  line_total_cents integer not null
);
create index if not exists shop_order_items_order_idx on public.shop_order_items (order_id);

alter table public.shop_orders enable row level security;
alter table public.shop_order_items enable row level security;

-- Lecture : distri propriétaire + admin (écriture = service_role, pas de policy).
drop policy if exists shop_orders_owner_read on public.shop_orders;
create policy shop_orders_owner_read
  on public.shop_orders for select to authenticated
  using (coach_user_id = auth.uid()
    or exists (select 1 from public.users u where u.id = auth.uid() and u.role = 'admin'));

drop policy if exists shop_order_items_owner_read on public.shop_order_items;
create policy shop_order_items_owner_read
  on public.shop_order_items for select to authenticated
  using (exists (
    select 1 from public.shop_orders o
    where o.id = shop_order_items.order_id
      and (o.coach_user_id = auth.uid()
        or exists (select 1 from public.users u where u.id = auth.uid() and u.role = 'admin'))
  ));

-- Incrément atomique du compteur d'usage d'un code promo (appelé par
-- confirm-shop-payment au passage à paid, en service_role).
create or replace function public.increment_promo_usage(p_promo_id uuid)
returns void
language sql
security definer
set search_path = public
as $$
  update public.promo_codes set used_count = used_count + 1 where id = p_promo_id;
$$;

comment on function public.increment_promo_usage(uuid) is
  'Boutique HL SKIN — incrémente promo_codes.used_count (paiement confirmé). Service_role only.';

commit;
