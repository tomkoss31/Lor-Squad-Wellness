-- Lot 3 (18/09/2026) — la porte d'activation « liste_50 » (Écris ta Liste 100) est RETIRÉE.
-- Décision Thomas : la Liste 100 et le Cahier de bord quittent l'app (13 contacts, lui seul,
-- « je ne l'utilise pas du tout ni personne »). Sans cet écran, plus personne ne pouvait
-- cocher la porte : l'activation (users.activated_at) serait devenue impossible.
-- Les portes restantes : premiere_story · premier_bilan · premier_pv_pack.
-- MIROIR côté front : src/features/copilote/salle-ops/goProSteps.ts (ACTIVATION_GATES).
-- Même motif que 20261209090000_activation_sans_hom.sql (premier_hom retiré le 04/08).

create or replace function public.mark_starter_task(p_task_key text, p_status text)
returns timestamptz
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_activated timestamptz;
  v_gate_done int;
  -- Source de vérité serveur des tâches-portes d'activation.
  -- `premier_hom` retiré le 2026-08-03 (cf. en-tête).
  v_gate_keys text[] := array[
    'premiere_story', 'premier_bilan', 'premier_pv_pack'
  ];
begin
  if v_uid is null then
    raise exception 'not authenticated';
  end if;
  if p_status not in ('pending', 'done', 'skipped') then
    raise exception 'invalid status %', p_status;
  end if;

  insert into public.distributor_starter_progress (user_id, task_key, status, done_at)
  values (v_uid, p_task_key, p_status, case when p_status = 'done' then now() end)
  on conflict (user_id, task_key) do update
    set status     = excluded.status,
        done_at    = case when excluded.status = 'done' then now() else null end,
        updated_at = now();

  select count(*) into v_gate_done
  from public.distributor_starter_progress
  where user_id = v_uid
    and status = 'done'
    and task_key = any(v_gate_keys);

  if v_gate_done >= array_length(v_gate_keys, 1) then
    update public.users
      set activated_at = now()
      where id = v_uid and activated_at is null;
  end if;

  select activated_at into v_activated from public.users where id = v_uid;
  return v_activated;
end;
$$;

-- 2. Fonction appelée par les triggers (bilan créé, commande PV enregistrée)
create or replace function public._mark_starter_gate_for(p_user uuid, p_task_key text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_activated timestamptz;
  v_gate_done int;
  -- Même liste que mark_starter_task : `premier_hom` retiré le 2026-08-03.
  v_gate_keys text[] := array[
    'premiere_story', 'premier_bilan', 'premier_pv_pack'
  ];
begin
  if p_user is null then return; end if;

  select activated_at into v_activated from public.users where id = p_user;
  if v_activated is not null then return; end if;

  insert into public.distributor_starter_progress (user_id, task_key, status, done_at)
  values (p_user, p_task_key, 'done', now())
  on conflict (user_id, task_key) do update
    set status     = 'done',
        done_at    = coalesce(public.distributor_starter_progress.done_at, now()),
        updated_at = now();

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

-- Rattrapage : qui avait déjà les 3 portes restantes sans être activé ?
update public.users u
   set activated_at = now()
 where u.activated_at is null
   and (select count(distinct p.task_key) from public.distributor_starter_progress p
         where p.user_id = u.id and p.status = 'done'
           and p.task_key in ('premiere_story', 'premier_bilan', 'premier_pv_pack')) = 3;
