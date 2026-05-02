-- =============================================================================
-- Phase A — Formation pyramide : foundation DB (2026-11-01)
--
-- Workflow validation cascade pour le centre de formation :
--   1. Distri soumet un module + son quiz
--   2. Si quiz_score = 100 % → status='validated' auto + push info sponsor
--   3. Sinon → status='pending_review_sponsor' + notif sponsor (lignee)
--   4. Si sponsor pas reactif > 48h → escalation 'pending_review_admin'
--      (cron horaire formation-relay-to-admin, en Phase E)
--
-- Visibilite RLS :
--   - Self : un user voit ses propres progressions
--   - Sponsor : voit toute sa lignee descendante (recursif via
--     is_in_user_subtree, helper deja en place du chantier Team Tree)
--   - Admin : tout
--
-- Couple Thomas + Melanie : geree via is_admin() (les 2 sont admin).
--
-- Idempotent : rejouable sans casse (IF NOT EXISTS / CREATE OR REPLACE
-- / DROP POLICY IF EXISTS / ADD COLUMN IF NOT EXISTS / DROP CONSTRAINT
-- IF EXISTS).
-- =============================================================================

begin;

-- ─── 1. Tables ──────────────────────────────────────────────────────────────

create table if not exists public.formation_user_progress (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  module_id text not null,
  status text not null default 'not_started'
    check (status in (
      'not_started',
      'in_progress',
      'pending_review_sponsor',
      'pending_review_admin',
      'validated',
      'rejected'
    )),
  quiz_score numeric check (quiz_score is null or (quiz_score >= 0 and quiz_score <= 100)),
  quiz_answers jsonb not null default '[]'::jsonb,
  submitted_at timestamptz,
  reviewed_by uuid references public.users(id) on delete set null,
  reviewed_at timestamptz,
  feedback text,
  validation_path text
    check (validation_path is null or validation_path in ('auto', 'sponsor', 'admin_relay')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, module_id)
);

create index if not exists idx_formation_progress_user
  on public.formation_user_progress(user_id);
create index if not exists idx_formation_progress_status_submitted
  on public.formation_user_progress(status, submitted_at)
  where status in ('pending_review_sponsor', 'pending_review_admin');
create index if not exists idx_formation_progress_reviewed_by
  on public.formation_user_progress(reviewed_by);

comment on table public.formation_user_progress is
  'Progression d''un user sur un module Formation. Workflow validation cascade : auto (100%) / sponsor / admin_relay (>48h).';

create table if not exists public.formation_review_threads (
  id uuid primary key default gen_random_uuid(),
  progress_id uuid not null references public.formation_user_progress(id) on delete cascade,
  sender_id uuid not null references public.users(id) on delete cascade,
  kind text not null
    check (kind in ('question', 'answer', 'validation_decision', 'feedback')),
  content text not null,
  created_at timestamptz not null default now()
);

create index if not exists idx_formation_threads_progress
  on public.formation_review_threads(progress_id, created_at);
create index if not exists idx_formation_threads_sender
  on public.formation_review_threads(sender_id);

comment on table public.formation_review_threads is
  'Discussions entre distri/sponsor/admin autour d''une progression module. Kind : question / answer / validation_decision / feedback.';

-- ─── 2. Trigger updated_at auto sur formation_user_progress ────────────────

create or replace function public.touch_formation_progress_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists formation_progress_set_updated_at
  on public.formation_user_progress;
create trigger formation_progress_set_updated_at
  before update on public.formation_user_progress
  for each row
  execute function public.touch_formation_progress_updated_at();

-- ─── 3. Trigger fallback sponsor auto sur premier admin ─────────────────────
-- Regle metier : aucun distri sans sponsor. Si insert sans sponsor_id ni
-- parent_user_id, on auto-set le premier admin actif (Thomas en pratique).

create or replace function public.users_auto_fallback_sponsor()
returns trigger
language plpgsql
as $$
declare
  v_admin_id uuid;
begin
  if new.sponsor_id is null and new.parent_user_id is null then
    select id into v_admin_id
    from public.users
    where role = 'admin' and active = true
    order by created_at asc
    limit 1;
    if v_admin_id is not null and v_admin_id <> new.id then
      new.sponsor_id := v_admin_id;
      new.parent_user_id := v_admin_id;
    end if;
  end if;
  return new;
end;
$$;

-- Doit s executer AVANT users_sync_parent_sponsor pour que la sync trouve
-- sponsor_id deja set.
drop trigger if exists users_auto_fallback_sponsor_trigger on public.users;
create trigger users_auto_fallback_sponsor_trigger
  before insert on public.users
  for each row
  execute function public.users_auto_fallback_sponsor();

-- ─── 4. Helpers SQL ────────────────────────────────────────────────────────

-- Liste des progressions qui attendent la validation du user courant
-- (en tant que sponsor d une recrue dans sa lignee descendante).
create or replace function public.get_my_pending_formation_reviews()
returns table (
  progress_id uuid,
  user_id uuid,
  user_name text,
  module_id text,
  quiz_score numeric,
  submitted_at timestamptz,
  hours_pending int
)
language sql
stable
security invoker
set search_path = public
as $$
  select
    p.id as progress_id,
    p.user_id,
    u.name as user_name,
    p.module_id,
    p.quiz_score,
    p.submitted_at,
    extract(epoch from (now() - p.submitted_at))::int / 3600 as hours_pending
  from public.formation_user_progress p
  inner join public.users u on u.id = p.user_id
  where p.status = 'pending_review_sponsor'
    and public.is_in_user_subtree(p.user_id, auth.uid())
    and p.user_id <> auth.uid()
  order by p.submitted_at asc;
$$;

comment on function public.get_my_pending_formation_reviews() is
  'Liste des modules en attente de validation pour le user courant (sponsor recursif). Tries du plus ancien au plus recent.';

grant execute on function public.get_my_pending_formation_reviews() to authenticated;

-- Liste des progressions escaladees en admin_relay (admin only).
create or replace function public.get_admin_formation_relay_queue()
returns table (
  progress_id uuid,
  user_id uuid,
  user_name text,
  sponsor_id uuid,
  sponsor_name text,
  module_id text,
  quiz_score numeric,
  submitted_at timestamptz,
  hours_pending int
)
language sql
stable
security invoker
set search_path = public
as $$
  select
    p.id as progress_id,
    p.user_id,
    u.name as user_name,
    sponsor.id as sponsor_id,
    sponsor.name as sponsor_name,
    p.module_id,
    p.quiz_score,
    p.submitted_at,
    extract(epoch from (now() - p.submitted_at))::int / 3600 as hours_pending
  from public.formation_user_progress p
  inner join public.users u on u.id = p.user_id
  left join public.users sponsor on sponsor.id = u.parent_user_id
  where p.status = 'pending_review_admin'
    and public.is_admin()
  order by p.submitted_at asc;
$$;

comment on function public.get_admin_formation_relay_queue() is
  'File des modules escaladees en admin_relay (>48h sans review sponsor). Admin only via RLS.';

grant execute on function public.get_admin_formation_relay_queue() to authenticated;

-- award_formation_xp : stub Phase A. Implementation reelle en Phase B
-- (branche sur la table xp_log de l Academy si compatible).
create or replace function public.award_formation_xp(
  p_user_id uuid,
  p_module_id text,
  p_kind text  -- 'module_done' (10) | 'quiz_perfect' (50) | 'first_validation' (100)
)
returns int
language plpgsql
security definer
set search_path = public
as $$
declare
  v_amount int;
begin
  if not (auth.uid() = p_user_id or public.is_admin()) then
    raise exception 'access denied';
  end if;

  v_amount := case p_kind
    when 'module_done'       then 10
    when 'quiz_perfect'      then 50
    when 'first_validation'  then 100
    else 0
  end;

  return v_amount;
end;
$$;

grant execute on function public.award_formation_xp(uuid, text, text) to authenticated;

-- ─── 5. RLS sur formation_user_progress ─────────────────────────────────────

alter table public.formation_user_progress enable row level security;

drop policy if exists "formation_progress_select" on public.formation_user_progress;
create policy "formation_progress_select"
  on public.formation_user_progress for select
  to authenticated
  using (
    user_id = auth.uid()
    or public.is_in_user_subtree(user_id, auth.uid())
    or public.is_admin()
  );

drop policy if exists "formation_progress_insert_self" on public.formation_user_progress;
create policy "formation_progress_insert_self"
  on public.formation_user_progress for insert
  to authenticated
  with check (user_id = auth.uid());

drop policy if exists "formation_progress_update" on public.formation_user_progress;
create policy "formation_progress_update"
  on public.formation_user_progress for update
  to authenticated
  using (
    (user_id = auth.uid()
     and status in ('not_started', 'in_progress', 'rejected'))
    or (public.is_in_user_subtree(user_id, auth.uid())
        and user_id <> auth.uid()
        and status = 'pending_review_sponsor')
    or public.is_admin()
  )
  with check (
    (user_id = auth.uid()
     and status in ('not_started', 'in_progress', 'pending_review_sponsor', 'rejected'))
    or (public.is_in_user_subtree(user_id, auth.uid())
        and user_id <> auth.uid()
        and status in ('validated', 'rejected', 'pending_review_sponsor'))
    or public.is_admin()
  );

drop policy if exists "formation_progress_delete_admin" on public.formation_user_progress;
create policy "formation_progress_delete_admin"
  on public.formation_user_progress for delete
  to authenticated
  using (public.is_admin());

-- ─── 6. RLS sur formation_review_threads ────────────────────────────────────

alter table public.formation_review_threads enable row level security;

drop policy if exists "formation_threads_select" on public.formation_review_threads;
create policy "formation_threads_select"
  on public.formation_review_threads for select
  to authenticated
  using (
    exists (
      select 1 from public.formation_user_progress p
      where p.id = formation_review_threads.progress_id
        and (
          p.user_id = auth.uid()
          or public.is_in_user_subtree(p.user_id, auth.uid())
          or public.is_admin()
        )
    )
  );

drop policy if exists "formation_threads_insert" on public.formation_review_threads;
create policy "formation_threads_insert"
  on public.formation_review_threads for insert
  to authenticated
  with check (
    sender_id = auth.uid()
    and exists (
      select 1 from public.formation_user_progress p
      where p.id = progress_id
        and (
          p.user_id = auth.uid()
          or public.is_in_user_subtree(p.user_id, auth.uid())
          or public.is_admin()
        )
    )
  );

drop policy if exists "formation_threads_delete_admin" on public.formation_review_threads;
create policy "formation_threads_delete_admin"
  on public.formation_review_threads for delete
  to authenticated
  using (public.is_admin());

-- ─── 7. Extension push_notifications_sent.entity_type ───────────────────────
-- IMPORTANT : sans cette extension, l'INSERT d une push avec entity_type
-- 'formation_*' echoue avec violation de check constraint en Phase B/E.

alter table public.push_notifications_sent
  drop constraint if exists push_notifications_sent_entity_type_check;

alter table public.push_notifications_sent
  add constraint push_notifications_sent_entity_type_check
  check (entity_type in (
    'followup',
    'prospect_meeting',
    'client_message',
    'morning_digest',
    'coach_tip',
    'formation_validation_pending',
    'formation_validation_done',
    'formation_admin_relay',
    'formation_decision'
  ));

-- ─── 8. Preferences notif user formation ────────────────────────────────────

alter table public.users
  add column if not exists notif_formation_to_review boolean not null default true,
  add column if not exists notif_formation_progress  boolean not null default true,
  add column if not exists notif_formation_decision  boolean not null default true,
  add column if not exists notif_formation_admin     boolean not null default true;

comment on column public.users.notif_formation_to_review is
  'Recevoir notifs push quand une recrue de ma lignee soumet un module a valider. Default true.';
comment on column public.users.notif_formation_progress is
  'Recevoir notifs push quand une recrue valide un module en auto (100%). Default true.';
comment on column public.users.notif_formation_decision is
  'Recevoir notifs push quand mon sponsor/admin a valide ou rejete mon module. Default true.';
comment on column public.users.notif_formation_admin is
  'Admin only : recevoir notifs push quand un module passe en admin_relay (>48h). Default true.';

commit;
