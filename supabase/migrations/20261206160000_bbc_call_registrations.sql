-- =============================================================================
-- BBC — inscriptions aux rituels + suivi (2026-07-24).
--
-- Une ligne = un membre inscrit à UNE occurrence datée d'un rituel
-- (`call_key` + `scheduled_at`). L'occurrence est calculée depuis la config du
-- club (`clubs.settings.calls`) — aucune date en dur.
--   - attended : null = pas encore passé · true/false = pointé après l'appel
--   - followed_up_at : la « patate chaude » (suivi dans les 10 min) est faite
-- 100 % additif.
-- =============================================================================

create table if not exists public.club_call_registrations (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients (id) on delete cascade,
  coach_user_id uuid not null references public.users (id) on delete cascade,
  call_key text not null,
  scheduled_at timestamptz not null,
  attended boolean,
  followed_up_at timestamptz,
  created_at timestamptz not null default now(),
  constraint club_call_registrations_unique unique (client_id, call_key, scheduled_at)
);
create index if not exists club_call_reg_coach_idx on public.club_call_registrations (coach_user_id, scheduled_at);

alter table public.club_call_registrations enable row level security;
drop policy if exists "club_call_reg_own" on public.club_call_registrations;
create policy "club_call_reg_own"
  on public.club_call_registrations for all
  using (coach_user_id = auth.uid())
  with check (coach_user_id = auth.uid());

-- Inscrire un membre à une occurrence (idempotent).
create or replace function public.bbc_register_call(p_client_id uuid, p_call_key text, p_scheduled_at timestamptz)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_coach uuid := auth.uid();
  v_owner uuid;
  v_id uuid;
begin
  select distributor_id into v_owner from public.clients where id = p_client_id;
  if v_owner is distinct from v_coach then
    raise exception 'non autorise';
  end if;
  insert into public.club_call_registrations (client_id, coach_user_id, call_key, scheduled_at)
  values (p_client_id, v_coach, p_call_key, p_scheduled_at)
  on conflict on constraint club_call_registrations_unique do update set client_id = excluded.client_id
  returning id into v_id;
  return json_build_object('id', v_id);
end;
$$;
revoke all on function public.bbc_register_call(uuid, text, timestamptz) from public;
grant execute on function public.bbc_register_call(uuid, text, timestamptz) to authenticated;

-- Prochain appel du membre (app membre, accès par token).
create or replace function public.bbc_member_next_call(p_token text)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_client_id uuid;
  v_row record;
begin
  select (client_id)::uuid into v_client_id
  from public.client_app_accounts where token = p_token::uuid limit 1;
  if v_client_id is null then return null; end if;
  select call_key, scheduled_at, attended into v_row
  from public.club_call_registrations
  where client_id = v_client_id and scheduled_at > now() - interval '2 hours'
  order by scheduled_at asc limit 1;
  if not found then return null; end if;
  return json_build_object('call_key', v_row.call_key, 'scheduled_at', v_row.scheduled_at, 'attended', v_row.attended);
end;
$$;
revoke all on function public.bbc_member_next_call(text) from public;
grant execute on function public.bbc_member_next_call(text) to anon, authenticated;
