-- =============================================================================
-- Client XP System — Premium Client (Tier B Module 1, 2026-04-28)
--
-- Reproduit la mecanique XP cote distri (gamification 5) pour le client
-- final, accessible via /client/:token. Each action client (cliquer
-- agenda, saisir mensuration, envoyer message, etc.) gagne des XP.
--
-- Securite : RPC SECURITY DEFINER + verification du token client_app_accounts
-- → pas de RLS lourde, pas d auth Supabase requise pour le client (l app
-- client est anonyme avec token uuid). Les RPC sont grant execute to anon
-- pour ce raison.
--
-- Tracking dedup : table client_xp_events avec colonne dedup_key + unique
-- (client_id, dedup_key). Les caps "1x", "1x/jour", "1x/semaine" sont
-- encodes via cette cle (ex : "tab_agenda_2026-04-28").
-- =============================================================================

begin;

-- ─── Table client_xp_events ──────────────────────────────────────────────────
create table if not exists public.client_xp_events (
  id uuid primary key default gen_random_uuid(),
  -- client_id en text pour matcher client_app_accounts.client_id (text, pas uuid).
  -- Voir CLAUDE.md : "NE JAMAIS faire ::uuid en policy permissive".
  client_id text not null,
  action_key text not null,
  xp_amount integer not null check (xp_amount >= 0),
  -- dedup_key : permet d encoder les caps. Pattern :
  --   "1x"           → action_key (ex: "first_login")
  --   "1x/jour"      → action_key + "_" + YYYY-MM-DD
  --   "1x/semaine"   → action_key + "_" + IYYY-IW (ISO week)
  --   "no_cap"       → action_key + "_" + epoch (toujours different)
  dedup_key text not null,
  created_at timestamptz not null default now(),
  unique (client_id, dedup_key)
);

create index if not exists idx_client_xp_events_client
  on public.client_xp_events(client_id);

create index if not exists idx_client_xp_events_action
  on public.client_xp_events(action_key);

-- ─── RLS ─────────────────────────────────────────────────────────────────────
alter table public.client_xp_events enable row level security;

-- Aucune policy permissive : la table est manipulee uniquement via les RPC
-- SECURITY DEFINER ci-dessous. Les utilisateurs anon ne peuvent ni lire ni
-- ecrire directement.

-- ─── RPC : record_client_xp ──────────────────────────────────────────────────
-- Enregistre un evenement XP pour un client identifie par son token.
-- Si le dedup_key existe deja → no-op (already gained), retourne 0 XP.
-- Sinon insert + return total_xp recalcule.
create or replace function public.record_client_xp(
  p_token text,
  p_action_key text
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_client_id text;
  v_xp integer;
  v_dedup_key text;
  v_today text := to_char(current_date, 'YYYY-MM-DD');
  v_week text := to_char(current_date, 'IYYY-IW');
  v_inserted_id uuid;
  v_total_xp integer;
begin
  -- Verify token + get client_id
  select caa.client_id into v_client_id
  from public.client_app_accounts caa
  where caa.token = p_token
  limit 1;

  if v_client_id is null then
    return jsonb_build_object('error', 'invalid_token');
  end if;

  -- Map action_key → xp + dedup strategy.
  -- Synchro avec CLIENT_XP_ACTIONS dans src/features/client-xp/actions.ts
  case p_action_key
    -- Caps "1x" (one-shot lifetime)
    when 'first_login'         then v_xp := 50;  v_dedup_key := 'first_login';
    when 'install_pwa'         then v_xp := 50;  v_dedup_key := 'install_pwa';
    when 'sandbox_completed'   then v_xp := 100; v_dedup_key := 'sandbox_completed';
    when 'tutorial_completed'  then v_xp := 30;  v_dedup_key := 'tutorial_completed';
    when 'silhouette_complete' then v_xp := 50;  v_dedup_key := 'silhouette_complete';
    when 'telegram_joined'     then v_xp := 30;  v_dedup_key := 'telegram_joined';
    when 'anniversary_1m'      then v_xp := 200; v_dedup_key := 'anniversary_1m';
    when 'anniversary_3m'      then v_xp := 500; v_dedup_key := 'anniversary_3m';
    when 'anniversary_6m'      then v_xp := 800; v_dedup_key := 'anniversary_6m';
    when 'google_review'       then v_xp := 200; v_dedup_key := 'google_review';
    -- Caps "1x/jour"
    when 'tab_agenda'          then v_xp := 5;   v_dedup_key := 'tab_agenda_' || v_today;
    when 'tab_pv'              then v_xp := 5;   v_dedup_key := 'tab_pv_' || v_today;
    when 'tab_evolution'       then v_xp := 5;   v_dedup_key := 'tab_evolution_' || v_today;
    when 'tab_conseils'        then v_xp := 5;   v_dedup_key := 'tab_conseils_' || v_today;
    when 'message_sent'        then v_xp := 15;  v_dedup_key := 'message_sent_' || v_today;
    when 'mood_checkin'        then v_xp := 5;   v_dedup_key := 'mood_checkin_' || v_today;
    when 'measurement_added'   then v_xp := 10;  v_dedup_key := 'measurement_added_' || v_today;
    -- Cap "1x/semaine"
    when 'weekly_weigh_in'     then v_xp := 20;  v_dedup_key := 'weigh_in_' || v_week;
    -- Cap "no_cap" (un par occurrence)
    when 'photo_uploaded'      then v_xp := 50;  v_dedup_key := 'photo_' || extract(epoch from now())::text;
    else
      return jsonb_build_object('error', 'unknown_action', 'action_key', p_action_key);
  end case;

  -- Insert with conflict ignore
  insert into public.client_xp_events (client_id, action_key, xp_amount, dedup_key)
  values (v_client_id, p_action_key, v_xp, v_dedup_key)
  on conflict (client_id, dedup_key) do nothing
  returning id into v_inserted_id;

  -- Recompute total
  select coalesce(sum(xp_amount), 0)::int into v_total_xp
  from public.client_xp_events
  where client_id = v_client_id;

  if v_inserted_id is null then
    -- Already gained (dedup hit)
    return jsonb_build_object(
      'gained_xp', 0,
      'total_xp', v_total_xp,
      'action_key', p_action_key,
      'already_gained', true
    );
  end if;

  return jsonb_build_object(
    'gained_xp', v_xp,
    'total_xp', v_total_xp,
    'action_key', p_action_key,
    'already_gained', false
  );
end;
$$;

revoke all on function public.record_client_xp(text, text) from public;
grant execute on function public.record_client_xp(text, text) to anon, authenticated;

-- ─── RPC : get_client_xp ─────────────────────────────────────────────────────
-- Retourne l etat XP courant d un client identifie par token.
-- Niveaux : 1 Debutant (0) / 2 En route (100) / 3 Engage (300) /
--          4 Champion (700) / 5 Legende (1500).
create or replace function public.get_client_xp(p_token text)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_client_id text;
  v_total_xp integer;
  v_level integer;
  v_level_title text;
  v_next_threshold integer;
  v_prev_threshold integer;
begin
  select caa.client_id into v_client_id
  from public.client_app_accounts caa
  where caa.token = p_token
  limit 1;

  if v_client_id is null then
    return jsonb_build_object('error', 'invalid_token');
  end if;

  select coalesce(sum(xp_amount), 0)::int into v_total_xp
  from public.client_xp_events
  where client_id = v_client_id;

  -- Mapping niveaux
  if v_total_xp >= 1500 then
    v_level := 5; v_level_title := 'Légende';
    v_prev_threshold := 1500; v_next_threshold := 1500;
  elsif v_total_xp >= 700 then
    v_level := 4; v_level_title := 'Champion.ne';
    v_prev_threshold := 700; v_next_threshold := 1500;
  elsif v_total_xp >= 300 then
    v_level := 3; v_level_title := 'Engagé.e';
    v_prev_threshold := 300; v_next_threshold := 700;
  elsif v_total_xp >= 100 then
    v_level := 2; v_level_title := 'En route';
    v_prev_threshold := 100; v_next_threshold := 300;
  else
    v_level := 1; v_level_title := 'Débutant.e';
    v_prev_threshold := 0; v_next_threshold := 100;
  end if;

  return jsonb_build_object(
    'total_xp', v_total_xp,
    'level', v_level,
    'level_title', v_level_title,
    'prev_threshold', v_prev_threshold,
    'next_threshold', v_next_threshold,
    'xp_in_level', v_total_xp - v_prev_threshold,
    'xp_to_next', greatest(0, v_next_threshold - v_total_xp)
  );
end;
$$;

revoke all on function public.get_client_xp(text) from public;
grant execute on function public.get_client_xp(text) to anon, authenticated;

-- ─── Comments ────────────────────────────────────────────────────────────────
comment on table public.client_xp_events is
  'Tier B Premium Client (2026-04-28) — events XP par client. Manipulee uniquement via les RPC SECURITY DEFINER record_client_xp / get_client_xp. Le dedup_key encode la strategie de cap (1x lifetime, 1x/jour, 1x/semaine, no_cap).';

comment on function public.record_client_xp is
  'Enregistre un evenement XP pour un client identifie par token. No-op si dedup_key deja existant (cap atteint). Retourne JSON avec gained_xp + total_xp + already_gained.';

comment on function public.get_client_xp is
  'Retourne l etat XP courant d un client (total + niveau + threshold). Levels 1-5 : Debutant / En route / Engage / Champion / Legende.';

commit;
