create extension if not exists pgcrypto;

create table if not exists public.users (
  id uuid primary key references auth.users (id) on delete cascade,
  name text not null,
  email text not null unique,
  role text not null check (role in ('admin', 'distributor')),
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
  started boolean not null default false,
  start_date date,
  next_follow_up timestamptz not null,
  notes text not null default '',
  created_at timestamptz not null default now()
);

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

alter table public.users enable row level security;
alter table public.clients enable row level security;
alter table public.assessments enable row level security;
alter table public.follow_ups enable row level security;

drop policy if exists "users select self or admin" on public.users;
create policy "users select self or admin"
on public.users
for select
using (auth.uid() = id or public.is_admin());

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
using (public.is_active_user() and (public.is_admin() or distributor_id = auth.uid()));

drop policy if exists "clients insert own or admin" on public.clients;
create policy "clients insert own or admin"
on public.clients
for insert
with check (public.is_active_user() and (public.is_admin() or distributor_id = auth.uid()));

drop policy if exists "clients update own or admin" on public.clients;
create policy "clients update own or admin"
on public.clients
for update
using (public.is_active_user() and (public.is_admin() or distributor_id = auth.uid()))
with check (public.is_active_user() and (public.is_admin() or distributor_id = auth.uid()));

drop policy if exists "clients delete own or admin" on public.clients;
create policy "clients delete own or admin"
on public.clients
for delete
using (public.is_active_user() and (public.is_admin() or distributor_id = auth.uid()));

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
      and (public.is_admin() or public.clients.distributor_id = auth.uid())
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
      and (public.is_admin() or public.clients.distributor_id = auth.uid())
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
      and (public.is_admin() or public.clients.distributor_id = auth.uid())
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
      and (public.is_admin() or public.clients.distributor_id = auth.uid())
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
      and (public.is_admin() or public.clients.distributor_id = auth.uid())
  )
)
with check (
  public.is_active_user()
  and exists (
    select 1
    from public.clients
    where public.clients.id = follow_ups.client_id
      and (public.is_admin() or public.clients.distributor_id = auth.uid())
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
      and (public.is_admin() or public.clients.distributor_id = auth.uid())
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
      and (public.is_admin() or public.clients.distributor_id = auth.uid())
  )
);
