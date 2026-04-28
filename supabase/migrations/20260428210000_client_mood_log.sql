-- =============================================================================
-- Client Mood Log — Premium Client Module 2 (Tier B, 2026-04-28)
--
-- Capture l etat moral quotidien du client (5 emojis : 🔥 / 🙂 / 😐 / 😴 / 😣).
-- 1 entry par client par jour. Le coach voit l historique sur la fiche.
--
-- RPC client-side via token (anon callable).
-- =============================================================================

begin;

-- ─── Table ───────────────────────────────────────────────────────────────────
create table if not exists public.client_mood_log (
  id uuid primary key default gen_random_uuid(),
  client_id text not null, -- match client_app_accounts.client_id (text)
  mood_key text not null
    check (mood_key in ('great', 'good', 'okay', 'tired', 'tough')),
  comment text,
  log_date date not null default current_date,
  created_at timestamptz not null default now(),
  -- 1 entry par client par jour (UPSERT pour update du jour)
  unique (client_id, log_date)
);

create index if not exists idx_client_mood_log_client_date
  on public.client_mood_log(client_id, log_date desc);

create index if not exists idx_client_mood_log_recent
  on public.client_mood_log(created_at desc);

-- ─── RLS ─────────────────────────────────────────────────────────────────────
alter table public.client_mood_log enable row level security;

-- Aucune policy permissive : manipulation via les RPC SECURITY DEFINER.

-- ─── RPC : record_client_mood ────────────────────────────────────────────────
-- Upsert le mood du jour (1 par jour, override possible). Trigger XP +5
-- via record_client_xp en cascade.
create or replace function public.record_client_mood(
  p_token text,
  p_mood_key text,
  p_comment text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_client_id text;
  v_was_new boolean;
  v_xp_result jsonb;
begin
  -- Validate mood_key
  if p_mood_key not in ('great', 'good', 'okay', 'tired', 'tough') then
    return jsonb_build_object('error', 'invalid_mood_key');
  end if;

  -- Verify token + get client_id
  select caa.client_id into v_client_id
  from public.client_app_accounts caa
  where caa.token = p_token
  limit 1;

  if v_client_id is null then
    return jsonb_build_object('error', 'invalid_token');
  end if;

  -- Detect si c est un nouveau mood pour le jour (was_new) avant upsert
  select not exists (
    select 1 from public.client_mood_log
    where client_id = v_client_id and log_date = current_date
  ) into v_was_new;

  -- Upsert
  insert into public.client_mood_log (client_id, mood_key, comment)
  values (v_client_id, p_mood_key, nullif(trim(coalesce(p_comment, '')), ''))
  on conflict (client_id, log_date)
  do update set
    mood_key = excluded.mood_key,
    comment = excluded.comment;

  -- Trigger XP +5 si c etait le 1er mood du jour (sinon le dedup_key bloque)
  v_xp_result := public.record_client_xp(p_token, 'mood_checkin');

  return jsonb_build_object(
    'success', true,
    'mood_key', p_mood_key,
    'was_new', v_was_new,
    'xp', v_xp_result
  );
end;
$$;

revoke all on function public.record_client_mood(text, text, text) from public;
grant execute on function public.record_client_mood(text, text, text) to anon, authenticated;

-- ─── RPC : get_client_mood_today ─────────────────────────────────────────────
-- Retourne le mood du jour (si saisi). Permet au front d afficher l etat
-- "dejà coche aujourd hui" sur le widget Accueil.
create or replace function public.get_client_mood_today(p_token text)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_client_id text;
  v_mood_key text;
  v_comment text;
begin
  select caa.client_id into v_client_id
  from public.client_app_accounts caa
  where caa.token = p_token
  limit 1;

  if v_client_id is null then
    return jsonb_build_object('error', 'invalid_token');
  end if;

  select mood_key, comment into v_mood_key, v_comment
  from public.client_mood_log
  where client_id = v_client_id and log_date = current_date
  limit 1;

  return jsonb_build_object(
    'mood_key', v_mood_key,
    'comment', v_comment,
    'has_today', v_mood_key is not null
  );
end;
$$;

revoke all on function public.get_client_mood_today(text) from public;
grant execute on function public.get_client_mood_today(text) to anon, authenticated;

-- ─── RPC : get_client_mood_history (pour fiche coach, admin only) ────────────
create or replace function public.get_client_mood_history(p_client_id uuid, p_days integer default 30)
returns table (
  log_date date,
  mood_key text,
  comment text
)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if not (
    public.is_admin() or
    auth.uid() in (select id from public.users where role in ('referent', 'distributor'))
  ) then
    raise exception 'access denied' using errcode = '42501';
  end if;

  return query
  select m.log_date, m.mood_key, m.comment
  from public.client_mood_log m
  where m.client_id = p_client_id::text
    and m.log_date >= current_date - (greatest(1, least(p_days, 365)) || ' days')::interval
  order by m.log_date desc;
end;
$$;

grant execute on function public.get_client_mood_history(uuid, integer) to authenticated;

-- ─── Comments ────────────────────────────────────────────────────────────────
comment on table public.client_mood_log is
  'Tier B Premium Client (2026-04-28) — mood quotidien client (5 niveaux). 1 entry par jour, upsertable. Source pour widget Accueil + historique fiche coach.';

comment on function public.record_client_mood is
  'Upsert mood du jour pour un client (token-auth). Trigger +5 XP via mood_checkin si premier mood du jour.';

commit;
