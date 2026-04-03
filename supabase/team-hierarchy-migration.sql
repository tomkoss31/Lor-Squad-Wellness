alter table public.users
drop constraint if exists users_role_check;

alter table public.users
add constraint users_role_check
check (role in ('admin', 'referent', 'distributor'));

alter table public.users
add column if not exists sponsor_id uuid references public.users (id) on delete set null;

alter table public.users
add column if not exists sponsor_name text;

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

drop policy if exists "users select self or admin" on public.users;
create policy "users select self or admin"
on public.users
for select
using (auth.uid() = id or public.is_admin() or sponsor_id = auth.uid());

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

alter table public.activity_logs enable row level security;

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
