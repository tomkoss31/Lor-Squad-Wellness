-- =============================================================================
-- FIX get_pv_action_plan — type mismatch text/uuid (2026-04-29)
--
-- Apres inspection :
--   pv_transactions, pv_client_products, clients : TOUT en uuid
--   client_messages.client_id, client_messages.distributor_id : en text
--
-- Donc la seule section qui necessite un cast est la 3 (silencieux) ou
-- on compare client_messages (text) avec clients (uuid) et p_user_id (uuid).
-- =============================================================================

begin;

create or replace function public.get_pv_action_plan(p_user_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $function$
declare
  vmonth date := date_trunc('month', current_date)::date;
  vmonthend date := (date_trunc('month', current_date) + interval '1 month' - interval '1 day')::date;
  v3monthstart date := (date_trunc('month', current_date) - interval '3 months')::date;
  v_user_text text := p_user_id::text;
  v_target int;
  v_pv_curr numeric;
  v_pv_prev_3m numeric;
  v_days_in_month int;
  v_day_of_month int;
  v_prorata numeric;
  v_status text;
  v_ratio numeric;
  v_top_dormant jsonb;
  v_restock_due jsonb;
  v_silent_active jsonb;
  v_expected_gain numeric;
begin
  if auth.uid() <> p_user_id and not exists (
    select 1 from public.users where "id" = auth.uid() and role = 'admin' and active = true
  ) then
    raise exception 'access denied';
  end if;

  select coalesce(monthly_pv_target, 2500) into v_target
  from public.users where "id" = p_user_id;
  if v_target is null then v_target := 2500; end if;

  select coalesce(sum(pv * coalesce(quantity, 1)), 0)::numeric into v_pv_curr
  from public.pv_transactions
  where responsible_id = p_user_id and date >= vmonth;

  select coalesce(sum(pv * coalesce(quantity, 1)), 0)::numeric into v_pv_prev_3m
  from public.pv_transactions
  where responsible_id = p_user_id
    and date >= v3monthstart and date < vmonth;

  v_days_in_month := extract(day from vmonthend)::int;
  v_day_of_month := extract(day from current_date)::int;
  v_prorata := (v_day_of_month::numeric / v_days_in_month::numeric) * v_target;

  if v_prorata = 0 then
    v_ratio := 1; v_status := 'on_track';
  else
    v_ratio := v_pv_curr / v_prorata;
    if v_ratio < 0.85 then v_status := 'delayed';
    elsif v_ratio > 1.15 then v_status := 'ahead';
    else v_status := 'on_track';
    end if;
  end if;

  -- Section 1 : pv_transactions / clients tous uuid
  with client_history as (
    select tx.client_id, tx.client_name,
      sum(tx.pv * coalesce(tx.quantity, 1))::numeric as pv_3m,
      max(tx.date) as last_purchase
    from public.pv_transactions tx
    where tx.responsible_id = p_user_id and tx.date >= v3monthstart
    group by tx.client_id, tx.client_name
    having max(tx.date) <= current_date - interval '25 days'
  ),
  ranked as (
    select ch.*, ntile(10) over (order by ch.pv_3m desc) as decile,
      ch.pv_3m / 3 as monthly_avg
    from client_history ch
  ),
  top_dormant as (
    select r.client_id, r.client_name, r.monthly_avg::int as monthly_avg_pv,
      (current_date - r.last_purchase)::int as days_since
    from ranked r where r.decile <= 3
    order by r.monthly_avg desc limit 5
  )
  select coalesce(jsonb_agg(jsonb_build_object(
    'client_id', td.client_id, 'client_name', td.client_name,
    'monthly_avg_pv', td.monthly_avg_pv, 'days_since', td.days_since
  )), '[]'::jsonb) into v_top_dormant from top_dormant td;

  -- Section 2 : pv_client_products / clients tous uuid
  with active_products as (
    select pcp.client_id, pcp.product_name, pcp.start_date,
      coalesce(pcp.duration_reference_days, 30) as dur,
      coalesce(pcp.pv_per_unit, 0) * coalesce(pcp.quantity_start, 1) as pv_unit,
      cli.first_name, cli.last_name,
      pcp.start_date + (coalesce(pcp.duration_reference_days, 30) || ' days')::interval as cure_end
    from public.pv_client_products pcp
    join public.clients cli on cli."id" = pcp.client_id
    where pcp.active = true and cli.distributor_id = p_user_id
  ),
  due_soon as (
    select ap.client_id, ap.first_name, ap.last_name, ap.product_name,
      (ap.cure_end::date - current_date)::int as days_left,
      ap.pv_unit::int as pv_estimated
    from active_products ap
    where ap.cure_end::date between current_date - interval '3 days' and current_date + interval '7 days'
    order by ap.cure_end asc limit 5
  )
  select coalesce(jsonb_agg(jsonb_build_object(
    'client_id', ds.client_id, 'client_name', concat(ds.first_name, ' ', ds.last_name),
    'product_name', ds.product_name, 'days_left', ds.days_left, 'pv_estimated', ds.pv_estimated
  )), '[]'::jsonb) into v_restock_due from due_soon ds;

  -- Section 3 : client_messages en text → on cast cli.id et p_user_id en text
  with last_messages as (
    select msg.client_id, max(msg.created_at) as last_msg
    from public.client_messages msg
    where msg.distributor_id = v_user_text group by msg.client_id
  ),
  silent as (
    select cli."id" as client_id, cli.first_name, cli.last_name,
      coalesce(extract(day from now() - lm.last_msg)::int, 999) as days_silent
    from public.clients cli
    left join last_messages lm on lm.client_id = cli."id"::text
    where cli.distributor_id = p_user_id
      and coalesce(cli.lifecycle_status, 'active') = 'active'
      and (lm.last_msg is null or lm.last_msg <= current_date - interval '21 days')
    order by days_silent desc limit 5
  )
  select coalesce(jsonb_agg(jsonb_build_object(
    'client_id', s.client_id, 'client_name', concat(s.first_name, ' ', s.last_name),
    'days_silent', s.days_silent
  )), '[]'::jsonb) into v_silent_active from silent s;

  select coalesce(
    (select sum((x->>'monthly_avg_pv')::numeric) from jsonb_array_elements(v_top_dormant) x) * 0.6, 0
  ) + coalesce(
    (select sum((x->>'pv_estimated')::numeric) from jsonb_array_elements(v_restock_due) x) * 0.7, 0
  ) into v_expected_gain;

  return jsonb_build_object(
    'target_pv', v_target, 'current_pv', v_pv_curr::int,
    'prorata_pv', round(v_prorata)::int, 'delta_pv', round(v_pv_curr - v_prorata)::int,
    'ratio', round(v_ratio::numeric, 2), 'status', v_status,
    'day_of_month', v_day_of_month, 'days_in_month', v_days_in_month,
    'days_left', v_days_in_month - v_day_of_month,
    'top_dormant', v_top_dormant, 'restock_due', v_restock_due,
    'silent_active', v_silent_active, 'expected_gain', round(v_expected_gain)::int,
    'computed_at', now()
  );
end;
$function$;

grant execute on function public.get_pv_action_plan(uuid) to authenticated;

commit;
