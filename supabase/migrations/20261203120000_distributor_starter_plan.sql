-- =============================================================================
-- Démarrage 30 jours — checklist duplicable par recrue + flag d'activation.
-- Chantier "Moteur d'équipe" PR1 (2026-06-27).
--
-- Additif PUR : ne touche ni aux PV, ni aux rangs, ni aux clients existants.
--   - users.activated_at : date où la recrue franchit la "porte de démarrage"
--     (= recrue ACTIVÉE au sens du funnel d'équipe). NULL = pas encore activée.
--   - distributor_starter_progress : état par tâche. Le TEMPLATE des tâches vit
--     côté front (src/data/starterPlan.ts) — comme sections.ts pour l'Academy.
--   - RPC mark_starter_task : écriture self-only + recalcul de l'activation.
--
-- RLS : un distri voit SA progression + celle de sa downline (sponsor) ; écriture
-- via RPC SECURITY DEFINER uniquement (jamais d'INSERT direct). Réutilise le
-- helper is_in_user_subtree() déjà en place (20260425230000_team_tree_lineage).
-- =============================================================================

-- 1) Flag d'activation sur users (recrue ACTIVÉE) ----------------------------
alter table public.users
  add column if not exists activated_at timestamptz;

comment on column public.users.activated_at is
  'Date de complétion des tâches-portes du démarrage 30j (recrue ACTIVÉE au sens funnel équipe). NULL = pas encore activée.';

-- 2) État de complétion par tâche -------------------------------------------
create table if not exists public.distributor_starter_progress (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references public.users(id) on delete cascade,
  task_key   text not null,
  status     text not null default 'pending'
    check (status in ('pending','done','skipped')),
  done_at    timestamptz,
  meta       jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, task_key)
);

create index if not exists idx_starter_progress_user
  on public.distributor_starter_progress(user_id);

comment on table public.distributor_starter_progress is
  'État (pending/done/skipped) des tâches du démarrage 30 jours par distributeur. Template des tâches côté front (src/data/starterPlan.ts).';

-- 3) RLS ---------------------------------------------------------------------
alter table public.distributor_starter_progress enable row level security;

-- Lecture : soi-même + sa downline (sponsor) + admin.
drop policy if exists starter_progress_select on public.distributor_starter_progress;
create policy starter_progress_select on public.distributor_starter_progress
  for select using (
    user_id = auth.uid()
    or public.is_in_user_subtree(user_id, auth.uid())
    or exists (select 1 from public.users u where u.id = auth.uid() and u.role = 'admin')
  );

-- Écriture interdite en direct → passe par mark_starter_task() (SECURITY DEFINER).
grant select on public.distributor_starter_progress to authenticated;
revoke insert, update, delete on public.distributor_starter_progress from anon, authenticated;

-- 4) RPC : marquer une tâche (self only) + recalcul de l'activation ----------
create or replace function public.mark_starter_task(
  p_task_key text,
  p_status text,
  p_activation_keys text[]   -- tâches-portes (fournies par le template front)
) returns timestamptz
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_activated timestamptz;
  v_gate_done int;
  v_gate_total int := coalesce(array_length(p_activation_keys, 1), 0);
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

  -- Activation : toutes les tâches-portes sont-elles 'done' ?
  if v_gate_total > 0 then
    select count(*) into v_gate_done
    from public.distributor_starter_progress
    where user_id = v_uid
      and status = 'done'
      and task_key = any(p_activation_keys);

    if v_gate_done >= v_gate_total then
      update public.users
        set activated_at = now()
        where id = v_uid and activated_at is null;
    end if;
  end if;

  select activated_at into v_activated from public.users where id = v_uid;
  return v_activated;
end;
$$;

grant execute on function public.mark_starter_task(text, text, text[]) to authenticated;

-- 5) Annonce distri (règle "livrable complet") ------------------------------
insert into public.app_announcements
  (title, body, emoji, accent, link_path, link_label, audience, published_at)
values
  ('Ton démarrage en 30 jours 🚀',
   'Une check-list pas-à-pas pour bien lancer ton activité. Coche tes actions, suis ta progression, deviens « activé ».',
   '🚀', 'gold', '/demarrage', 'Commencer', 'distri', now())
on conflict do nothing;
