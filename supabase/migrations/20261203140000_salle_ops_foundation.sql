-- =============================================================================
-- Salle des Opérations — fondation serveur (chantier onboarding distri).
-- 2026-06-29. ADDITIF PUR. Ne touche NI les PV, NI les rangs, NI les 5 portes
-- d'activation (garde-fou §14) — on ne fait qu'AJOUTER une ancre J0 et des
-- triggers qui FERMENT des portes existantes sur acte réel (anti-triche §4).
--
--   1. users.starter_started_at : ancre « Jour 0 » (date de sponsoring).
--   2. _mark_starter_gate_for(user, key) : helper interne qui marque une porte
--      'done' pour un user donné + recalcule l'activation (même règle que
--      mark_starter_task, mais appelable par trigger). Onboarding only.
--   3. Triggers :
--        - assessments AFTER INSERT      → ferme 'premier_bilan'
--        - pv_transactions AFTER INSERT  → ferme 'premier_pv_pack'
--          (uniquement type='commande' ET pv>0 = vrais PV).
-- =============================================================================

-- 1) Ancre J0 ----------------------------------------------------------------
alter table public.users
  add column if not exists starter_started_at timestamptz;

comment on column public.users.starter_started_at is
  'Ancre Jour 0 du démarrage (date de sponsoring / lancement de la recrue). NULL = non lancé. Alimente le compteur « Jour X / 90 » de la Salle des Opérations.';

-- 2) Helper interne : ferme une porte pour un user donné + recalcul activation.
--    SECURITY DEFINER, pas de dépendance à auth.uid() → appelable par trigger.
--    Idempotent. N'agit QUE sur les recrues non encore activées (anti-triche
--    pertinent uniquement pendant l'onboarding).
create or replace function public._mark_starter_gate_for(p_user uuid, p_task_key text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_activated timestamptz;
  v_gate_done int;
  v_gate_keys text[] := array[
    'liste_50', 'premiere_story', 'premier_bilan', 'premier_hom', 'premier_pv_pack'
  ];
begin
  if p_user is null then return; end if;

  -- Déjà activé → rien à faire (les portes ne servent qu'au démarrage).
  select activated_at into v_activated from public.users where id = p_user;
  if v_activated is not null then return; end if;

  insert into public.distributor_starter_progress (user_id, task_key, status, done_at)
  values (p_user, p_task_key, 'done', now())
  on conflict (user_id, task_key) do update
    set status     = 'done',
        done_at    = coalesce(public.distributor_starter_progress.done_at, now()),
        updated_at = now();

  -- Recalcul activation (même règle que mark_starter_task).
  select count(*) into v_gate_done
  from public.distributor_starter_progress
  where user_id = p_user and status = 'done' and task_key = any(v_gate_keys);

  if v_gate_done >= array_length(v_gate_keys, 1) then
    update public.users
      set activated_at = now()
      where id = p_user and activated_at is null;
  end if;
end;
$$;

-- 3a) assessments → ferme 'premier_bilan' (distri résolu via clients.distributor_id,
--     même résolution que le trigger d'exposition). Best-effort : ne JAMAIS
--     faire échouer l'insert du bilan.
create or replace function public.tg_starter_gate_assessment()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_distributor uuid;
begin
  begin
    select c.distributor_id into v_distributor
    from public.clients c
    where c.id = new.client_id;

    if v_distributor is not null
       and exists (select 1 from public.users u where u.id = v_distributor) then
      perform public._mark_starter_gate_for(v_distributor, 'premier_bilan');
    end if;
  exception
    when others then
      return new;
  end;
  return new;
end;
$$;

drop trigger if exists trg_starter_gate_assessment on public.assessments;
create trigger trg_starter_gate_assessment
  after insert on public.assessments
  for each row execute function public.tg_starter_gate_assessment();

-- 3b) pv_transactions → ferme 'premier_pv_pack' (type='commande' ET pv>0 = vrais
--     PV : fin de bilan, panier, réassort client, conso perso validée).
--     responsible_id = le distri qui a fait la vente. Best-effort.
create or replace function public.tg_starter_gate_pv()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  begin
    if new.type = 'commande'
       and coalesce(new.pv, 0) > 0
       and new.responsible_id is not null then
      perform public._mark_starter_gate_for(new.responsible_id, 'premier_pv_pack');
    end if;
  exception
    when others then
      return new;
  end;
  return new;
end;
$$;

drop trigger if exists trg_starter_gate_pv on public.pv_transactions;
create trigger trg_starter_gate_pv
  after insert on public.pv_transactions
  for each row execute function public.tg_starter_gate_pv();
