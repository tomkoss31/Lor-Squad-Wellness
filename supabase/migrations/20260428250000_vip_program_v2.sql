-- =============================================================================
-- VIP Program V2 — Triggers auto + Actions XP dediees + Status intentions
-- (2026-04-28)
--
-- Ameliorations du programme Client Privilegie :
--   1. Trigger auto-recalcul vip_status quand un PV est insere/update/delete
--   2. 6 nouvelles actions XP dediees au programme VIP (au lieu du proxy
--      mood_checkin actuel)
--   3. RPC update_referral_intention_status pour permettre au coach de
--      changer le statut d un prospect (contacted / converted / lost)
-- =============================================================================

begin;

-- ─── 1. Etendre record_client_xp avec 6 nouvelles actions VIP ────────────────
-- Recree la fonction pour ajouter les nouvelles actions sans casser les
-- existantes. Toutes les actions existantes preservees.
create or replace function public.record_client_xp(p_token text, p_action_key text)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $function$
declare
  v_client_id text; v_xp integer; v_dedup_key text;
  v_today text := to_char(current_date, 'YYYY-MM-DD');
  v_week text := to_char(current_date, 'IYYY-IW');
  v_inserted_id uuid; v_total_xp integer;
begin
  select caa.client_id into v_client_id
  from public.client_app_accounts caa where caa.token = p_token limit 1;
  if v_client_id is null then return jsonb_build_object('error', 'invalid_token'); end if;

  case p_action_key
    -- Actions Premium Client (deja existantes)
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
    when 'tab_agenda'          then v_xp := 5;   v_dedup_key := 'tab_agenda_' || v_today;
    when 'tab_pv'              then v_xp := 5;   v_dedup_key := 'tab_pv_' || v_today;
    when 'tab_evolution'       then v_xp := 5;   v_dedup_key := 'tab_evolution_' || v_today;
    when 'tab_conseils'        then v_xp := 5;   v_dedup_key := 'tab_conseils_' || v_today;
    when 'message_sent'        then v_xp := 15;  v_dedup_key := 'message_sent_' || v_today;
    when 'mood_checkin'        then v_xp := 5;   v_dedup_key := 'mood_checkin_' || v_today;
    when 'measurement_added'   then v_xp := 10;  v_dedup_key := 'measurement_added_' || v_today;
    when 'weekly_weigh_in'     then v_xp := 20;  v_dedup_key := 'weigh_in_' || v_week;
    when 'photo_uploaded'      then v_xp := 50;  v_dedup_key := 'photo_' || extract(epoch from now())::text;

    -- ─── V2 (2026-04-28) : Actions VIP dediees ─────────────────────────────
    when 'vip_sandbox_completed'   then v_xp := 20;   v_dedup_key := 'vip_sandbox_completed';
    when 'vip_intentions_filled'   then v_xp := 30;   v_dedup_key := 'vip_intentions_filled';
    when 'vip_first_referral'      then v_xp := 100;  v_dedup_key := 'vip_first_referral';
    when 'vip_silver_reached'      then v_xp := 200;  v_dedup_key := 'vip_silver_reached';
    when 'vip_gold_reached'        then v_xp := 500;  v_dedup_key := 'vip_gold_reached';
    when 'vip_ambassador_reached'  then v_xp := 1000; v_dedup_key := 'vip_ambassador_reached';

    else return jsonb_build_object('error', 'unknown_action', 'action_key', p_action_key);
  end case;

  insert into public.client_xp_events (client_id, action_key, xp_amount, dedup_key)
  values (v_client_id, p_action_key, v_xp, v_dedup_key)
  on conflict (client_id, dedup_key) do nothing returning id into v_inserted_id;

  select coalesce(sum(xp_amount), 0)::int into v_total_xp
  from public.client_xp_events where client_id = v_client_id;

  if v_inserted_id is null then
    return jsonb_build_object('gained_xp', 0, 'total_xp', v_total_xp,
      'action_key', p_action_key, 'already_gained', true);
  end if;
  return jsonb_build_object('gained_xp', v_xp, 'total_xp', v_total_xp,
    'action_key', p_action_key, 'already_gained', false);
end;
$function$;

-- ─── 2. RPC pour mettre a jour le statut d une intention (cote coach) ───────
create or replace function public.update_referral_intention_status(
  p_intention_id uuid,
  p_new_status text,
  p_converted_client_id uuid default null
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $function$
declare
  v_referrer_client_id uuid;
  v_distri_id uuid;
  v_old_status text;
begin
  if p_new_status not in ('pending', 'contacted', 'converted', 'lost') then
    return jsonb_build_object('error', 'invalid_status');
  end if;

  -- Verify access : le coach doit etre proprio du client referrer (ou admin)
  select cri.referrer_client_id, cli.distributor_id, cri.status
  into v_referrer_client_id, v_distri_id, v_old_status
  from public.client_referral_intentions cri
  join public.clients cli on cli."id" = cri.referrer_client_id
  where cri."id" = p_intention_id;

  if v_referrer_client_id is null then
    return jsonb_build_object('error', 'intention_not_found');
  end if;

  if v_distri_id <> auth.uid() and not exists (
    select 1 from public.users where "id" = auth.uid() and role = 'admin' and active = true
  ) then
    return jsonb_build_object('error', 'access_denied');
  end if;

  -- Update
  update public.client_referral_intentions
  set
    status = p_new_status,
    contacted_at = case
      when p_new_status = 'contacted' and contacted_at is null then now()
      else contacted_at
    end,
    converted_at = case
      when p_new_status = 'converted' then now()
      when p_new_status <> 'converted' then null
      else converted_at
    end,
    converted_to_client_id = case
      when p_new_status = 'converted' then p_converted_client_id
      else null
    end
  where "id" = p_intention_id;

  return jsonb_build_object(
    'success', true,
    'intention_id', p_intention_id,
    'new_status', p_new_status,
    'old_status', v_old_status
  );
end;
$function$;

grant execute on function public.update_referral_intention_status(uuid, text, uuid) to authenticated;

-- ─── 3. Trigger auto-recalcul vip_status sur INSERT/UPDATE pv_transactions ──
-- Quand un PV est ajoute, on recalcule le vip_status cache pour le client
-- + tous ses ascendants (qui beneficient des PV via l arbre).
--
-- Fonction utilitaire : recalcul vip_status pour 1 client.
create or replace function public.refresh_client_vip_status(p_client_id uuid)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $function$
declare
  v_status_payload jsonb;
  v_new_level text;
begin
  -- Calcule via la RPC existante
  v_status_payload := public.get_client_vip_status(p_client_id);

  -- Si erreur (client introuvable), on skip
  if v_status_payload ? 'error' then return; end if;

  v_new_level := v_status_payload->>'level';

  -- Update le cache si changement
  update public.clients
  set vip_status = v_new_level
  where "id" = p_client_id and (vip_status is null or vip_status <> v_new_level);
end;
$function$;

-- Fonction trigger : pour un client donne, recalcule le vip_status pour
-- LUI-MEME + TOUS SES ASCENDANTS (recursif).
create or replace function public.trg_pv_refresh_vip_ascendants()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $function$
declare
  v_target_client uuid;
  v_ancestor_id uuid;
begin
  -- Determine le client_id a partir du record
  if (TG_OP = 'INSERT' or TG_OP = 'UPDATE') then
    v_target_client := NEW.client_id;
  elsif TG_OP = 'DELETE' then
    v_target_client := OLD.client_id;
  end if;

  if v_target_client is null then return null; end if;

  -- Recalcule pour le client lui-meme + tous ses ascendants
  -- (CTE recursive remontant l arbre via vip_sponsor_client_id).
  for v_ancestor_id in
    with recursive ascendants as (
      select cli."id", cli.vip_sponsor_client_id, 0 as depth
      from public.clients cli
      where cli."id" = v_target_client
      union all
      select cli."id", cli.vip_sponsor_client_id, a.depth + 1
      from public.clients cli
      join ascendants a on a.vip_sponsor_client_id = cli."id"
      where a.depth < 100  -- safeguard contre cycles éventuels
    )
    select "id" from ascendants
  loop
    perform public.refresh_client_vip_status(v_ancestor_id);
  end loop;

  if (TG_OP = 'DELETE') then return OLD; else return NEW; end if;
end;
$function$;

drop trigger if exists trg_pv_refresh_vip_ascendants on public.pv_transactions;
create trigger trg_pv_refresh_vip_ascendants
  after insert or update or delete on public.pv_transactions
  for each row
  execute function public.trg_pv_refresh_vip_ascendants();

-- ─── 4. Comments ─────────────────────────────────────────────────────────────
comment on function public.record_client_xp is
  'V2 (2026-04-28) — ajout 6 actions VIP dediees : vip_sandbox_completed (20), vip_intentions_filled (30), vip_first_referral (100), vip_silver_reached (200), vip_gold_reached (500), vip_ambassador_reached (1000).';

comment on function public.update_referral_intention_status is
  'V2 (2026-04-28) — permet au coach de changer le statut d un prospect du form client (pending → contacted → converted/lost). Optionnellement lie un client cree.';

comment on function public.trg_pv_refresh_vip_ascendants is
  'V2 (2026-04-28) — trigger auto-recalcul du cache vip_status. Quand un PV est ajoute/update/deleted, recalcule pour le client + tous ses ascendants (CTE recursive avec safeguard depth<100).';

commit;
