create extension if not exists pgcrypto;

create table if not exists public.users (
  id uuid primary key references auth.users (id) on delete cascade,
  name text not null,
  email text not null unique,
  role text not null check (role in ('admin', 'referent', 'distributor')),
  sponsor_id uuid references public.users (id) on delete set null,
  sponsor_name text,
  active boolean not null default true,
  title text not null default 'Acces distributeur',
  created_at timestamptz not null default now(),
  last_access_at timestamptz
);

create table if not exists public.clients (
  id uuid primary key default gen_random_uuid(),
  first_name text not null,
  last_name text not null,
  sex text not null check (sex in ('female', 'male')),
  phone text not null default '',
  email text not null default '',
  age integer not null default 0,
  height integer not null default 0,
  job text not null default '',
  city text,
  distributor_id uuid not null references public.users (id) on delete restrict,
  distributor_name text not null,
  status text not null check (status in ('active', 'pending', 'follow-up')),
  objective text not null check (objective in ('weight-loss', 'sport')),
  current_program text not null default '',
  pv_program_id text,
  started boolean not null default false,
  start_date date,
  next_follow_up timestamptz not null,
  notes text not null default '',
  created_at timestamptz not null default now()
);

alter table public.users add column if not exists sponsor_id uuid references public.users (id) on delete set null;
alter table public.users add column if not exists sponsor_name text;
select pg_notify('pgrst', 'reload schema');

alter table public.clients add column if not exists pv_program_id text;

create table if not exists public.assessments (
  id text primary key,
  client_id uuid not null references public.clients (id) on delete cascade,
  date date not null,
  type text not null check (type in ('initial', 'follow-up')),
  objective text not null check (objective in ('weight-loss', 'sport')),
  program_id text,
  program_title text not null,
  summary text not null default '',
  notes text not null default '',
  next_follow_up timestamptz,
  body_scan jsonb not null,
  questionnaire jsonb not null,
  pedagogical_focus jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.follow_ups (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null unique references public.clients (id) on delete cascade,
  client_name text,
  due_date timestamptz not null,
  type text not null,
  status text not null check (status in ('scheduled', 'pending')),
  program_title text not null,
  last_assessment_date date not null,
  created_at timestamptz not null default now()
);

create table if not exists public.activity_logs (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  action text not null,
  actor_id uuid not null,
  actor_name text not null,
  owner_user_id uuid,
  client_id uuid,
  client_name text,
  target_user_id uuid,
  target_user_name text,
  summary text not null,
  detail text
);

create table if not exists public.pv_programs (
  id text primary key,
  name text not null,
  alias text[] not null default '{}',
  price_public numeric not null default 0,
  main_reference_duration_days integer not null default 21,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.pv_products (
  id text primary key,
  name text not null,
  category text not null,
  price_public numeric not null default 0,
  pv numeric not null default 0,
  quantite_label text not null default '',
  duree_reference_jours integer not null default 21,
  note_metier text,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.pv_program_products (
  program_id text not null references public.pv_programs (id) on delete cascade,
  product_id text not null references public.pv_products (id) on delete cascade,
  display_order integer not null default 0,
  primary key (program_id, product_id)
);

create table if not exists public.pv_client_products (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients (id) on delete cascade,
  responsible_id uuid not null references public.users (id) on delete restrict,
  responsible_name text not null,
  program_id text not null,
  product_id text not null,
  product_name text not null,
  quantity_start numeric not null default 1,
  start_date date not null,
  duration_reference_days integer not null default 21,
  pv_per_unit numeric not null default 0,
  price_public_per_unit numeric not null default 0,
  quantite_label text not null default '',
  note_metier text,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (client_id, product_id)
);

create table if not exists public.pv_transactions (
  id uuid primary key default gen_random_uuid(),
  date date not null,
  client_id uuid not null references public.clients (id) on delete cascade,
  client_name text not null,
  responsible_id uuid not null references public.users (id) on delete restrict,
  responsible_name text not null,
  product_id text not null,
  product_name text not null,
  quantity numeric not null default 1,
  pv numeric not null default 0,
  price numeric not null default 0,
  type text not null check (type in ('commande', 'reprise-sur-place')),
  note text not null default '',
  created_at timestamptz not null default now()
);

insert into public.pv_programs (id, name, alias, price_public, main_reference_duration_days, active)
values
  ('starter', 'Programme Starter', array['Programme Decouverte', 'Programme Starter', 'Decouverte', 'Starter'], 159, 21, true),
  ('premium', 'Programme Premium', array[]::text[], 234, 42, true),
  ('booster-1', 'Programme Booster 1', array[]::text[], 277, 42, true),
  ('booster-2', 'Programme Booster 2', array[]::text[], 324, 42, true),
  ('custom', 'Suivi personnalise', array['Suivi personnalisé'], 0, 21, true)
on conflict (id) do update
set
  name = excluded.name,
  alias = excluded.alias,
  price_public = excluded.price_public,
  main_reference_duration_days = excluded.main_reference_duration_days,
  active = excluded.active;

insert into public.pv_products (
  id,
  name,
  category,
  price_public,
  pv,
  quantite_label,
  duree_reference_jours,
  note_metier,
  active
)
values
  ('formula-1', 'Formula 1', 'shake / repas', 63.5, 23.95, '21 doses', 21, 'En pratique, 1 pot = 21 jours de reference dans le suivi.', true),
  ('pdm', 'Melange pour boisson proteinee', 'proteine', 75, 33, '42 doses', 42, 'Reference simple de 1 dose / jour sur 42 jours.', true),
  ('phyto-brule-graisse', 'Phytocomplete brule-graisse', 'gelules', 90, 38, '60 gelules', 30, 'Reference simple de 30 jours.', true),
  ('aloe-vera', 'Boisson Aloe Vera', 'hydratation', 54.5, 24.95, '473 ml', 21, 'Dans le suivi, au-dela de 21 jours on considere l''hydratation comme mal tenue.', true),
  ('the-51g', 'Boisson instantanee a base de the 51 g', 'hydratation / routine', 41, 19.95, '51 g', 21, 'Meme logique terrain que l''aloe : au-dela de 21 jours, la routine n''a pas ete tenue.', true),
  ('multifibres', 'Boisson multifibres', 'fibres', 43.5, 22.95, '30 doses', 30, 'Reference simple de 30 jours.', true)
on conflict (id) do update
set
  name = excluded.name,
  category = excluded.category,
  price_public = excluded.price_public,
  pv = excluded.pv,
  quantite_label = excluded.quantite_label,
  duree_reference_jours = excluded.duree_reference_jours,
  note_metier = excluded.note_metier,
  active = excluded.active;

insert into public.pv_program_products (program_id, product_id, display_order)
values
  ('starter', 'aloe-vera', 1),
  ('starter', 'the-51g', 2),
  ('starter', 'formula-1', 3),
  ('premium', 'aloe-vera', 1),
  ('premium', 'the-51g', 2),
  ('premium', 'formula-1', 3),
  ('premium', 'pdm', 4),
  ('booster-1', 'aloe-vera', 1),
  ('booster-1', 'the-51g', 2),
  ('booster-1', 'formula-1', 3),
  ('booster-1', 'pdm', 4),
  ('booster-1', 'multifibres', 5),
  ('booster-2', 'aloe-vera', 1),
  ('booster-2', 'the-51g', 2),
  ('booster-2', 'formula-1', 3),
  ('booster-2', 'pdm', 4),
  ('booster-2', 'phyto-brule-graisse', 5),
  ('custom', 'formula-1', 1)
on conflict (program_id, product_id) do update
set display_order = excluded.display_order;

create or replace function public.current_role()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select role from public.users where id = auth.uid()
$$;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(public.current_role() = 'admin', false)
$$;

create or replace function public.is_active_user()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce((select active from public.users where id = auth.uid()), false)
$$;

create or replace function public.can_access_owner(target_owner_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    public.is_admin()
    or auth.uid() = target_owner_id
    or (
      public.current_role() = 'referent'
      and exists (
        select 1
        from public.users
        where id = target_owner_id
          and sponsor_id = auth.uid()
      )
    ),
    false
  )
$$;

alter table public.users enable row level security;
alter table public.clients enable row level security;
alter table public.assessments enable row level security;
alter table public.follow_ups enable row level security;
alter table public.activity_logs enable row level security;
alter table public.pv_programs enable row level security;
alter table public.pv_products enable row level security;
alter table public.pv_program_products enable row level security;
alter table public.pv_client_products enable row level security;
alter table public.pv_transactions enable row level security;

drop policy if exists "users select self or admin" on public.users;
create policy "users select self or admin"
on public.users
for select
using (auth.uid() = id or public.is_admin() or sponsor_id = auth.uid());

drop policy if exists "users update admin" on public.users;
create policy "users update admin"
on public.users
for update
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "clients select own or admin" on public.clients;
create policy "clients select own or admin"
on public.clients
for select
using (public.is_active_user() and public.can_access_owner(distributor_id));

drop policy if exists "clients insert own or admin" on public.clients;
create policy "clients insert own or admin"
on public.clients
for insert
with check (public.is_active_user() and public.can_access_owner(distributor_id));

drop policy if exists "clients update own or admin" on public.clients;
create policy "clients update own or admin"
on public.clients
for update
using (public.is_active_user() and public.can_access_owner(distributor_id))
with check (public.is_active_user() and public.can_access_owner(distributor_id));

drop policy if exists "clients delete own or admin" on public.clients;
create policy "clients delete own or admin"
on public.clients
for delete
using (public.is_active_user() and public.can_access_owner(distributor_id));

drop policy if exists "assessments select via client" on public.assessments;
create policy "assessments select via client"
on public.assessments
for select
using (
  public.is_active_user()
  and exists (
    select 1
    from public.clients
    where public.clients.id = assessments.client_id
      and public.can_access_owner(public.clients.distributor_id)
  )
);

drop policy if exists "assessments insert via client" on public.assessments;
create policy "assessments insert via client"
on public.assessments
for insert
with check (
  public.is_active_user()
  and exists (
    select 1
    from public.clients
    where public.clients.id = assessments.client_id
      and public.can_access_owner(public.clients.distributor_id)
  )
);

drop policy if exists "follow_ups select via client" on public.follow_ups;
create policy "follow_ups select via client"
on public.follow_ups
for select
using (
  public.is_active_user()
  and exists (
    select 1
    from public.clients
    where public.clients.id = follow_ups.client_id
      and public.can_access_owner(public.clients.distributor_id)
  )
);

drop policy if exists "follow_ups insert via client" on public.follow_ups;
create policy "follow_ups insert via client"
on public.follow_ups
for insert
with check (
  public.is_active_user()
  and exists (
    select 1
    from public.clients
    where public.clients.id = follow_ups.client_id
      and public.can_access_owner(public.clients.distributor_id)
  )
);

drop policy if exists "follow_ups update via client" on public.follow_ups;
create policy "follow_ups update via client"
on public.follow_ups
for update
using (
  public.is_active_user()
  and exists (
    select 1
    from public.clients
    where public.clients.id = follow_ups.client_id
      and public.can_access_owner(public.clients.distributor_id)
  )
)
with check (
  public.is_active_user()
  and exists (
    select 1
    from public.clients
    where public.clients.id = follow_ups.client_id
      and public.can_access_owner(public.clients.distributor_id)
  )
);

drop policy if exists "assessments delete via client" on public.assessments;
create policy "assessments delete via client"
on public.assessments
for delete
using (
  public.is_active_user()
  and exists (
    select 1
    from public.clients
    where public.clients.id = assessments.client_id
      and public.can_access_owner(public.clients.distributor_id)
  )
);

drop policy if exists "follow_ups delete via client" on public.follow_ups;
create policy "follow_ups delete via client"
on public.follow_ups
for delete
using (
  public.is_active_user()
  and exists (
    select 1
    from public.clients
    where public.clients.id = follow_ups.client_id
      and public.can_access_owner(public.clients.distributor_id)
  )
);

drop policy if exists "activity_logs select visible activity" on public.activity_logs;
create policy "activity_logs select visible activity"
on public.activity_logs
for select
using (
  public.is_active_user()
  and (
    public.is_admin()
    or actor_id = auth.uid()
    or target_user_id = auth.uid()
    or (owner_user_id is not null and public.can_access_owner(owner_user_id))
    or (
      client_id is not null
      and exists (
        select 1
        from public.clients
        where public.clients.id = activity_logs.client_id
          and public.can_access_owner(public.clients.distributor_id)
      )
    )
  )
);

drop policy if exists "activity_logs insert own" on public.activity_logs;
create policy "activity_logs insert own"
on public.activity_logs
for insert
with check (public.is_active_user() and actor_id = auth.uid());

drop policy if exists "pv_programs select active users" on public.pv_programs;
create policy "pv_programs select active users"
on public.pv_programs
for select
using (public.is_active_user());

drop policy if exists "pv_products select active users" on public.pv_products;
create policy "pv_products select active users"
on public.pv_products
for select
using (public.is_active_user());

drop policy if exists "pv_program_products select active users" on public.pv_program_products;
create policy "pv_program_products select active users"
on public.pv_program_products
for select
using (public.is_active_user());

drop policy if exists "pv_client_products select via client" on public.pv_client_products;
create policy "pv_client_products select via client"
on public.pv_client_products
for select
using (
  public.is_active_user()
  and exists (
    select 1
    from public.clients
    where public.clients.id = pv_client_products.client_id
      and public.can_access_owner(public.clients.distributor_id)
  )
);

drop policy if exists "pv_client_products insert via client" on public.pv_client_products;
create policy "pv_client_products insert via client"
on public.pv_client_products
for insert
with check (
  public.is_active_user()
  and exists (
    select 1
    from public.clients
    where public.clients.id = pv_client_products.client_id
      and public.can_access_owner(public.clients.distributor_id)
  )
);

drop policy if exists "pv_client_products update via client" on public.pv_client_products;
create policy "pv_client_products update via client"
on public.pv_client_products
for update
using (
  public.is_active_user()
  and exists (
    select 1
    from public.clients
    where public.clients.id = pv_client_products.client_id
      and public.can_access_owner(public.clients.distributor_id)
  )
)
with check (
  public.is_active_user()
  and exists (
    select 1
    from public.clients
    where public.clients.id = pv_client_products.client_id
      and public.can_access_owner(public.clients.distributor_id)
  )
);

drop policy if exists "pv_client_products delete via client" on public.pv_client_products;
create policy "pv_client_products delete via client"
on public.pv_client_products
for delete
using (
  public.is_active_user()
  and exists (
    select 1
    from public.clients
    where public.clients.id = pv_client_products.client_id
      and public.can_access_owner(public.clients.distributor_id)
  )
);

drop policy if exists "pv_transactions select via client" on public.pv_transactions;
create policy "pv_transactions select via client"
on public.pv_transactions
for select
using (
  public.is_active_user()
  and exists (
    select 1
    from public.clients
    where public.clients.id = pv_transactions.client_id
      and public.can_access_owner(public.clients.distributor_id)
  )
);

drop policy if exists "pv_transactions insert via client" on public.pv_transactions;
create policy "pv_transactions insert via client"
on public.pv_transactions
for insert
with check (
  public.is_active_user()
  and exists (
    select 1
    from public.clients
    where public.clients.id = pv_transactions.client_id
      and public.can_access_owner(public.clients.distributor_id)
  )
);

drop policy if exists "pv_transactions update via client" on public.pv_transactions;
create policy "pv_transactions update via client"
on public.pv_transactions
for update
using (
  public.is_active_user()
  and exists (
    select 1
    from public.clients
    where public.clients.id = pv_transactions.client_id
      and public.can_access_owner(public.clients.distributor_id)
  )
)
with check (
  public.is_active_user()
  and exists (
    select 1
    from public.clients
    where public.clients.id = pv_transactions.client_id
      and public.can_access_owner(public.clients.distributor_id)
  )
);

drop policy if exists "pv_transactions delete via client" on public.pv_transactions;
create policy "pv_transactions delete via client"
on public.pv_transactions
for delete
using (
  public.is_active_user()
  and exists (
    select 1
    from public.clients
    where public.clients.id = pv_transactions.client_id
      and public.can_access_owner(public.clients.distributor_id)
  )
);

-- =============================================================================
-- === Tables créées via Studio (export 2026-04-18) ============================
-- =============================================================================
-- Les 7 tables ci-dessous étaient créées manuellement dans Supabase Studio
-- et n'étaient pas versionnées. Extraction réalisée via
-- scripts/export-missing-rls.sql pour les remettre sous contrôle de version.
--
-- ⚠️ SÉCURITÉ : plusieurs policies ci-dessous utilisent USING (true) ou
-- TO public sans filtrage par owner_id / token. Cela constitue des angles
-- morts RLS identifiés lors de l'intégration. Ne PAS corriger sans
-- validation explicite — à traiter dans un chantier Sécurité L2 dédié.
-- =============================================================================

-- ---------- Tables ----------

create table if not exists public.client_app_accounts (
  id uuid not null default gen_random_uuid(),
  token uuid not null default gen_random_uuid(),
  client_id text not null,
  coach_id text not null,
  coach_name text not null,
  coach_whatsapp text,
  coach_telegram text,
  coach_phone text,
  created_at timestamp with time zone default now(),
  expires_at timestamp with time zone default (now() + '1 year'::interval),
  client_first_name text,
  client_last_name text,
  metrics_history jsonb,
  insights jsonb,
  recommendations jsonb,
  program_title text,
  assessments_count integer,
  next_follow_up text
);

create table if not exists public.client_evolution_reports (
  id uuid not null default gen_random_uuid(),
  token uuid not null default gen_random_uuid(),
  client_id text not null,
  coach_name text not null,
  client_first_name text not null,
  client_last_name text not null,
  client_gender text,
  generated_at text not null,
  assessments_count integer not null default 0,
  first_assessment_date text,
  latest_assessment_date text,
  objective text,
  program_title text,
  next_follow_up text,
  metrics_history jsonb default '[]'::jsonb,
  recommendations jsonb default '[]'::jsonb,
  insights jsonb default '[]'::jsonb,
  created_at timestamp with time zone default now(),
  expires_at timestamp with time zone default (now() + '90 days'::interval),
  distributor_id text
);

create table if not exists public.client_messages (
  id uuid not null default gen_random_uuid(),
  report_token uuid,
  client_id text not null,
  client_name text not null,
  distributor_id text not null,
  message_type text not null default 'product_request'::text,
  product_name text,
  message text,
  client_contact text,
  read boolean default false,
  created_at timestamp with time zone default now()
);

create table if not exists public.client_recaps (
  id uuid not null default gen_random_uuid(),
  token uuid not null default gen_random_uuid(),
  client_id text not null,
  coach_name text not null,
  client_first_name text not null,
  client_last_name text not null,
  assessment_date text not null,
  program_title text,
  objective text,
  body_scan jsonb,
  recommendations jsonb default '[]'::jsonb,
  referrals jsonb default '[]'::jsonb,
  created_at timestamp with time zone default now(),
  expires_at timestamp with time zone default (now() + '90 days'::interval)
);

create table if not exists public.client_referrals (
  id uuid not null default gen_random_uuid(),
  from_client_id text not null,
  from_client_name text not null,
  coach_id text not null,
  referred_name text not null,
  referred_contact text not null,
  status text default 'new'::text,
  created_at timestamp with time zone default now()
);

create table if not exists public.push_subscriptions (
  id uuid not null default gen_random_uuid(),
  user_id text not null,
  endpoint text not null,
  p256dh text not null,
  auth text not null,
  user_name text,
  updated_at timestamp with time zone default now()
);

create table if not exists public.rdv_change_requests (
  id uuid not null default gen_random_uuid(),
  client_id text not null,
  coach_id text not null,
  client_name text not null,
  current_rdv text,
  message text not null,
  status text default 'pending'::text,
  created_at timestamp with time zone default now()
);

-- ---------- Index uniques ----------

create unique index if not exists client_app_accounts_client_id_key
  on public.client_app_accounts using btree (client_id);
create unique index if not exists client_app_accounts_token_key
  on public.client_app_accounts using btree (token);
create unique index if not exists client_evolution_reports_token_key
  on public.client_evolution_reports using btree (token);
create unique index if not exists client_recaps_token_key
  on public.client_recaps using btree (token);
create unique index if not exists push_subscriptions_user_id_key
  on public.push_subscriptions using btree (user_id);

-- ---------- Enable RLS ----------

alter table public.client_app_accounts enable row level security;
alter table public.client_evolution_reports enable row level security;
alter table public.client_messages enable row level security;
alter table public.client_recaps enable row level security;
alter table public.client_referrals enable row level security;
alter table public.push_subscriptions enable row level security;
alter table public.rdv_change_requests enable row level security;

-- ---------- Policies : client_app_accounts ----------
-- Audit L2 (2026-04-19) : `client_app_coach_write` (FOR ALL TO public USING
-- auth.uid() IS NOT NULL) remplacée par 4 policies fines scopées via
-- can_access_owner(). Plus aucun coach ne peut manipuler l'accès app d'un
-- client qui ne lui appartient pas (sauf admin, et référent pour ses filleuls).

drop policy if exists "client_app_coach_select" on public.client_app_accounts;
create policy "client_app_coach_select"
  on public.client_app_accounts
  as permissive
  for select
  to authenticated
  using (
    public.is_active_user()
    and exists (
      select 1 from public.clients
      where public.clients.id::text = public.client_app_accounts.client_id
        and public.can_access_owner(public.clients.distributor_id)
    )
  );

drop policy if exists "client_app_coach_insert" on public.client_app_accounts;
create policy "client_app_coach_insert"
  on public.client_app_accounts
  as permissive
  for insert
  to authenticated
  with check (
    public.is_active_user()
    and exists (
      select 1 from public.clients
      where public.clients.id::text = public.client_app_accounts.client_id
        and public.can_access_owner(public.clients.distributor_id)
    )
  );

drop policy if exists "client_app_coach_update" on public.client_app_accounts;
create policy "client_app_coach_update"
  on public.client_app_accounts
  as permissive
  for update
  to authenticated
  using (
    public.is_active_user()
    and exists (
      select 1 from public.clients
      where public.clients.id::text = public.client_app_accounts.client_id
        and public.can_access_owner(public.clients.distributor_id)
    )
  )
  with check (
    public.is_active_user()
    and exists (
      select 1 from public.clients
      where public.clients.id::text = public.client_app_accounts.client_id
        and public.can_access_owner(public.clients.distributor_id)
    )
  );

drop policy if exists "client_app_coach_delete" on public.client_app_accounts;
create policy "client_app_coach_delete"
  on public.client_app_accounts
  as permissive
  for delete
  to authenticated
  using (
    public.is_active_user()
    and exists (
      select 1 from public.clients
      where public.clients.id::text = public.client_app_accounts.client_id
        and public.can_access_owner(public.clients.distributor_id)
    )
  );

drop policy if exists "client_app_public_read" on public.client_app_accounts;
create policy "client_app_public_read"
  on public.client_app_accounts
  as permissive
  for select
  to public
  using (expires_at > now());

-- ---------- Policies : client_evolution_reports ----------
-- Audit L2 (2026-04-19) : insert/update/delete étaient `TO public USING (true)`.
-- Resserrées sur le coach propriétaire via can_access_owner(). La lecture
-- publique par token (`report_public_read`) reste ouverte (clients).

drop policy if exists "report_coach_delete" on public.client_evolution_reports;
create policy "report_coach_delete"
  on public.client_evolution_reports
  as permissive
  for delete
  to authenticated
  using (
    public.is_active_user()
    and exists (
      select 1 from public.clients
      where public.clients.id::text = public.client_evolution_reports.client_id
        and public.can_access_owner(public.clients.distributor_id)
    )
  );

drop policy if exists "report_coach_insert" on public.client_evolution_reports;
create policy "report_coach_insert"
  on public.client_evolution_reports
  as permissive
  for insert
  to authenticated
  with check (
    public.is_active_user()
    and exists (
      select 1 from public.clients
      where public.clients.id::text = public.client_evolution_reports.client_id
        and public.can_access_owner(public.clients.distributor_id)
    )
  );

drop policy if exists "report_coach_update" on public.client_evolution_reports;
create policy "report_coach_update"
  on public.client_evolution_reports
  as permissive
  for update
  to authenticated
  using (
    public.is_active_user()
    and exists (
      select 1 from public.clients
      where public.clients.id::text = public.client_evolution_reports.client_id
        and public.can_access_owner(public.clients.distributor_id)
    )
  )
  with check (
    public.is_active_user()
    and exists (
      select 1 from public.clients
      where public.clients.id::text = public.client_evolution_reports.client_id
        and public.can_access_owner(public.clients.distributor_id)
    )
  );

drop policy if exists "report_public_read" on public.client_evolution_reports;
create policy "report_public_read"
  on public.client_evolution_reports
  as permissive
  for select
  to public
  using (expires_at > now());

-- ---------- Policies : client_messages ----------
-- Audit L2 (2026-04-19) : read/update/delete étaient `TO public USING (true)`.
-- Resserrées sur le coach propriétaire via can_access_owner(). L'insert
-- public (`msg_public_insert`) reste ouvert pour les rapports/recaps clients.

drop policy if exists "msg_coach_delete" on public.client_messages;
create policy "msg_coach_delete"
  on public.client_messages
  as permissive
  for delete
  to authenticated
  using (
    public.is_active_user()
    and exists (
      select 1 from public.clients
      where public.clients.id::text = public.client_messages.client_id
        and public.can_access_owner(public.clients.distributor_id)
    )
  );

drop policy if exists "msg_coach_read" on public.client_messages;
create policy "msg_coach_read"
  on public.client_messages
  as permissive
  for select
  to authenticated
  using (
    public.is_active_user()
    and exists (
      select 1 from public.clients
      where public.clients.id::text = public.client_messages.client_id
        and public.can_access_owner(public.clients.distributor_id)
    )
  );

drop policy if exists "msg_coach_update" on public.client_messages;
create policy "msg_coach_update"
  on public.client_messages
  as permissive
  for update
  to authenticated
  using (
    public.is_active_user()
    and exists (
      select 1 from public.clients
      where public.clients.id::text = public.client_messages.client_id
        and public.can_access_owner(public.clients.distributor_id)
    )
  )
  with check (
    public.is_active_user()
    and exists (
      select 1 from public.clients
      where public.clients.id::text = public.client_messages.client_id
        and public.can_access_owner(public.clients.distributor_id)
    )
  );

drop policy if exists "msg_public_insert" on public.client_messages;
create policy "msg_public_insert"
  on public.client_messages
  as permissive
  for insert
  to public
  with check (true);

-- ---------- Policies : client_recaps ----------

drop policy if exists "recap_coach_insert" on public.client_recaps;
create policy "recap_coach_insert"
  on public.client_recaps
  as permissive
  for insert
  to public
  with check (auth.uid() is not null);

drop policy if exists "recap_public_read" on public.client_recaps;
create policy "recap_public_read"
  on public.client_recaps
  as permissive
  for select
  to public
  using (expires_at > now());

-- Audit L2 (2026-04-19) : `recap_public_update` supprimée — n'importe qui
-- pouvait modifier un recap tant qu'il n'était pas expiré. Remplacée par
-- `recap_coach_update` scopée sur le coach propriétaire du client.

drop policy if exists "recap_coach_update" on public.client_recaps;
create policy "recap_coach_update"
  on public.client_recaps
  as permissive
  for update
  to authenticated
  using (
    public.is_active_user()
    and exists (
      select 1 from public.clients
      where public.clients.id::text = public.client_recaps.client_id
        and public.can_access_owner(public.clients.distributor_id)
    )
  )
  with check (
    public.is_active_user()
    and exists (
      select 1 from public.clients
      where public.clients.id::text = public.client_recaps.client_id
        and public.can_access_owner(public.clients.distributor_id)
    )
  );

-- ---------- Policies : client_referrals ----------

drop policy if exists "referral_coach_read" on public.client_referrals;
create policy "referral_coach_read"
  on public.client_referrals
  as permissive
  for select
  to public
  using ((auth.uid())::text = coach_id);

drop policy if exists "referral_coach_update" on public.client_referrals;
create policy "referral_coach_update"
  on public.client_referrals
  as permissive
  for update
  to public
  using ((auth.uid())::text = coach_id);

drop policy if exists "referral_via_valid_app_account" on public.client_referrals;
create policy "referral_via_valid_app_account"
  on public.client_referrals
  as permissive
  for insert
  to public
  with check (exists (
    select 1
    from public.client_app_accounts
    where client_app_accounts.client_id = client_referrals.from_client_id
      and client_app_accounts.coach_id = client_referrals.coach_id
      and client_app_accounts.expires_at > now()
  ));

-- ---------- Policies : push_subscriptions ----------

drop policy if exists "push_own" on public.push_subscriptions;
create policy "push_own"
  on public.push_subscriptions
  as permissive
  for all
  to public
  using ((auth.uid())::text = user_id);

-- Audit L2 (2026-04-19) : les 4 policies push_public_* (TO public USING true)
-- remplacées par 4 policies push_user_* scopées sur (auth.uid())::text = user_id.
-- Pas de can_access_owner() : la table porte l'owner directement, et un admin
-- ne doit pas pouvoir manipuler les endpoints VAPID des autres coachs.
-- Note : `push_own` (ci-dessus) reste active, redondante mais non-conflictuelle.

drop policy if exists "push_user_delete" on public.push_subscriptions;
create policy "push_user_delete"
  on public.push_subscriptions
  as permissive
  for delete
  to authenticated
  using ((auth.uid())::text = user_id);

drop policy if exists "push_user_insert" on public.push_subscriptions;
create policy "push_user_insert"
  on public.push_subscriptions
  as permissive
  for insert
  to authenticated
  with check ((auth.uid())::text = user_id);

drop policy if exists "push_user_select" on public.push_subscriptions;
create policy "push_user_select"
  on public.push_subscriptions
  as permissive
  for select
  to authenticated
  using ((auth.uid())::text = user_id);

drop policy if exists "push_user_update" on public.push_subscriptions;
create policy "push_user_update"
  on public.push_subscriptions
  as permissive
  for update
  to authenticated
  using ((auth.uid())::text = user_id)
  with check ((auth.uid())::text = user_id);

-- ---------- Policies : rdv_change_requests ----------

drop policy if exists "rdv_request_coach_read" on public.rdv_change_requests;
create policy "rdv_request_coach_read"
  on public.rdv_change_requests
  as permissive
  for select
  to public
  using ((auth.uid())::text = coach_id);

drop policy if exists "rdv_request_coach_update" on public.rdv_change_requests;
create policy "rdv_request_coach_update"
  on public.rdv_change_requests
  as permissive
  for update
  to public
  using ((auth.uid())::text = coach_id);

drop policy if exists "rdv_request_via_valid_app_account" on public.rdv_change_requests;
create policy "rdv_request_via_valid_app_account"
  on public.rdv_change_requests
  as permissive
  for insert
  to public
  with check (exists (
    select 1
    from public.client_app_accounts
    where client_app_accounts.client_id = rdv_change_requests.client_id
      and client_app_accounts.coach_id = rdv_change_requests.coach_id
      and client_app_accounts.expires_at > now()
  ));
