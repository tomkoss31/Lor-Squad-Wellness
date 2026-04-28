-- =============================================================================
-- Academy Section Feedback (Tier B #9 — 2026-04-28)
--
-- Apres avoir termine une section Academy (et son quiz si present), le
-- distri voit une mini-modale "Cette section t a aidee ?" avec :
--   - 👍 / 👎
--   - Texte libre optionnel
--
-- Tom et Mel utilisent ces retours dans /admin pour iterer sur les
-- sections faibles (ratio 👎 eleve = a revoir).
--
-- 1 ligne par (user, section) — on UPSERT sur duplicate. Si le distri
-- relance la section et donne un feedback different, on remplace.
-- =============================================================================

begin;

create table if not exists public.academy_section_feedback (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  section_id text not null,
  helpful boolean not null,
  comment text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  -- Unique (user, section) → upsert si re-feedback
  constraint academy_section_feedback_unique_user_section
    unique (user_id, section_id)
);

create index if not exists idx_academy_section_feedback_section
  on public.academy_section_feedback(section_id);

create index if not exists idx_academy_section_feedback_helpful
  on public.academy_section_feedback(helpful);

-- ─── RLS ─────────────────────────────────────────────────────────────────────
alter table public.academy_section_feedback enable row level security;

drop policy if exists "academy_feedback_self_insert" on public.academy_section_feedback;
create policy "academy_feedback_self_insert"
  on public.academy_section_feedback
  for insert
  to authenticated
  with check (auth.uid() = user_id);

drop policy if exists "academy_feedback_self_update" on public.academy_section_feedback;
create policy "academy_feedback_self_update"
  on public.academy_section_feedback
  for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "academy_feedback_self_select" on public.academy_section_feedback;
create policy "academy_feedback_self_select"
  on public.academy_section_feedback
  for select
  to authenticated
  using (auth.uid() = user_id or public.is_admin());

-- ─── Trigger updated_at auto ─────────────────────────────────────────────────
create or replace function public.touch_academy_feedback_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists trg_academy_feedback_updated_at on public.academy_section_feedback;
create trigger trg_academy_feedback_updated_at
  before update on public.academy_section_feedback
  for each row execute function public.touch_academy_feedback_updated_at();

-- ─── RPC d agregation pour /admin (admins uniquement) ──────────────────────
-- Returns by section : count_helpful + count_not_helpful + recent comments.
create or replace function public.get_academy_feedback_summary()
returns table (
  section_id text,
  helpful_count integer,
  not_helpful_count integer,
  total_count integer,
  helpful_pct integer,
  recent_comments jsonb
)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if not public.is_admin() then
    raise exception 'access denied' using errcode = '42501';
  end if;

  return query
  select
    f.section_id,
    count(*) filter (where f.helpful)::int as helpful_count,
    count(*) filter (where not f.helpful)::int as not_helpful_count,
    count(*)::int as total_count,
    case
      when count(*) = 0 then 0
      else round(100.0 * count(*) filter (where f.helpful) / count(*))::int
    end as helpful_pct,
    coalesce(
      (
        select jsonb_agg(
          jsonb_build_object(
            'helpful', sub.helpful,
            'comment', sub.comment,
            'user_name', u.name,
            'created_at', sub.created_at
          )
          order by sub.created_at desc
        )
        from (
          select fc.helpful, fc.comment, fc.user_id, fc.created_at
          from public.academy_section_feedback fc
          where fc.section_id = f.section_id
            and fc.comment is not null
            and length(trim(fc.comment)) > 0
          order by fc.created_at desc
          limit 5
        ) sub
        join public.users u on u.id = sub.user_id
      ),
      '[]'::jsonb
    ) as recent_comments
  from public.academy_section_feedback f
  group by f.section_id
  order by f.section_id;
end;
$$;

revoke all on function public.get_academy_feedback_summary() from public, anon;
grant execute on function public.get_academy_feedback_summary() to authenticated;

comment on table public.academy_section_feedback is
  'Tier B #9 (2026-04-28) — feedback distri par section Academy. 1 ligne par (user, section), upsert sur re-feedback. RLS : user voit son propre feedback, admin voit tout.';

comment on function public.get_academy_feedback_summary is
  'Tier B #9 (2026-04-28) — aggregation par section (helpful_pct + 5 derniers commentaires) pour /admin Academy. Reservee admins.';

commit;
