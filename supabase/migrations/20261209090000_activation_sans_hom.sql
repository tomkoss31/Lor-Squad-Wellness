-- =============================================================================
-- Activation : le « 1er HOM » ne bloque plus (2026-08-03)
--
-- CONSTAT EN BASE : sur 19 coachs, ZÉRO n'était activé. Détail des portes :
--   premier_bilan  ✔ 8      liste_50      ✔ 4
--   premiere_story ✔ 4      premier_pv_pack ✔ 4
--   premier_hom    ✔ 2   ← la seule qui bloquait tout le monde
--
-- Le HOM est une réunion PHYSIQUE : rien dans l'app ne peut la détecter, et la
-- case à cocher n'a ni lien ni rappel. Résultat : le cockpit Salle des Ops
-- s'affichait en plein écran à la place du Co-pilote, TOUS LES JOURS, pour les
-- 19 coachs — y compris les plus actifs (Maria, 10 clients).
--
-- Décision Thomas : on retire `premier_hom` des conditions d'activation.
-- L'étape reste dans le parcours Go Pro (on continue de la proposer et de la
-- cocher), elle ne verrouille simplement plus la sortie du cockpit.
--
-- Les 4 portes restantes sont toutes objectivables dans l'app :
--   liste_50 · premiere_story · premier_bilan · premier_pv_pack
-- =============================================================================

-- 1. RPC appelée par le front (bouton « ✓ C'est fait »)
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
    'liste_50', 'premiere_story', 'premier_bilan', 'premier_pv_pack'
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
    'liste_50', 'premiere_story', 'premier_bilan', 'premier_pv_pack'
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

-- 3. Rattrapage A — les portes ne comptaient que les événements POSTÉRIEURS à
--    la pose des triggers. Des coachs avec un historique réel se retrouvaient
--    avec « 1er bilan » non coché : Prisca et Alex 103 bilans, Mandy 27,
--    Léa 11. On recoche la porte à partir des données réelles.
insert into public.distributor_starter_progress (user_id, task_key, status, done_at)
select distinct c.distributor_id, 'premier_bilan', 'done', now()
from public.clients c
join public.assessments a on a.client_id = c.id
where c.distributor_id is not null
on conflict (user_id, task_key) do update
  set status  = 'done',
      done_at = coalesce(public.distributor_starter_progress.done_at, now()),
      updated_at = now();

-- 4. Rattrapage B — LA PREUVE PAR L'ACTION (décision Thomas 2026-08-03).
--    Un coach qui a réalisé 3 bilans ou plus est manifestement lancé : lui
--    imposer le cockpit de démarrage en plein écran tous les jours n'a aucun
--    sens. C'est l'usage réel qui décide, pas les cases cochées.
update public.users u
set activated_at = now()
where u.activated_at is null
  and (
    select count(*)
    from public.clients c
    join public.assessments a on a.client_id = c.id
    where c.distributor_id = u.id
  ) >= 3;

-- 5. Rattrapage C — ceux qui remplissaient déjà les 4 portes et restaient
--    coincés à cause du seul HOM.
update public.users u
set activated_at = now()
where u.activated_at is null
  and (
    select count(*)
    from public.distributor_starter_progress p
    where p.user_id = u.id
      and p.status = 'done'
      and p.task_key in ('liste_50', 'premiere_story', 'premier_bilan', 'premier_pv_pack')
  ) >= 4;
