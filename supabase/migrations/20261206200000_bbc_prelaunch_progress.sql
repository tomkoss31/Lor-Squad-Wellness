-- =============================================================================
-- BBC — parcours de pré-lancement 6 semaines (2026-07-24).
--
-- C'est le cœur duplicable du modèle : ce qu'on déroule à un distri AVANT
-- d'ouvrir son club. Table DÉDIÉE — on ne touche pas au « Démarrage 30 jours »
-- classique (`distributor_starter_progress`, dont les portes d'activation sont
-- codées en dur à trois endroits). Zéro risque de régression côté classic.
-- =============================================================================

create table if not exists public.bbc_prelaunch_progress (
  user_id uuid not null references public.users (id) on delete cascade,
  task_key text not null,
  done_at timestamptz,
  updated_at timestamptz not null default now(),
  primary key (user_id, task_key)
);

alter table public.bbc_prelaunch_progress enable row level security;

drop policy if exists "bbc_prelaunch_own" on public.bbc_prelaunch_progress;
create policy "bbc_prelaunch_own"
  on public.bbc_prelaunch_progress for all
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- Un admin suit la progression de son équipe (lecture seule).
drop policy if exists "bbc_prelaunch_admin_read" on public.bbc_prelaunch_progress;
create policy "bbc_prelaunch_admin_read"
  on public.bbc_prelaunch_progress for select
  using (exists (select 1 from public.users u where u.id = auth.uid() and u.role = 'admin'));

create or replace function public.bbc_toggle_prelaunch(p_task_key text, p_done boolean)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
begin
  if v_uid is null then
    raise exception 'non authentifie';
  end if;
  insert into public.bbc_prelaunch_progress (user_id, task_key, done_at, updated_at)
  values (v_uid, p_task_key, case when p_done then now() else null end, now())
  on conflict (user_id, task_key) do update
    set done_at = case when p_done then coalesce(public.bbc_prelaunch_progress.done_at, now()) else null end,
        updated_at = now();
  return p_done;
end;
$$;
revoke all on function public.bbc_toggle_prelaunch(text, boolean) from public;
grant execute on function public.bbc_toggle_prelaunch(text, boolean) to authenticated;
