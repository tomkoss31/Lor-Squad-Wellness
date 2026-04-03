alter table public.users
drop constraint if exists users_role_check;

alter table public.users
add constraint users_role_check
check (role in ('admin', 'referent', 'distributor'));

alter table public.users
add column if not exists sponsor_id uuid references public.users (id) on delete set null;

alter table public.users
add column if not exists sponsor_name text;

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
