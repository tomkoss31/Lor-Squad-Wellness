-- Lor'Squad AI (wagon 3 chantier 8, 2026-06-10) — journal d'usage + coût.
-- Chaque appel à l'edge lor-squad-ai (génération de message CRM par IA) est
-- loggué ici pour suivre la consommation de tokens et le coût en €.
-- Insert en service_role depuis l'edge ; lecture admin (tous) / coach (les siens).
-- Idempotent.

create table if not exists public.ai_usage_log (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.users(id) on delete set null,
  feature text not null default 'crm_message',
  model text not null,
  input_tokens integer not null default 0,
  output_tokens integer not null default 0,
  cost_eur numeric(10,4) not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists ai_usage_log_user_idx on public.ai_usage_log (user_id, created_at desc);

alter table public.ai_usage_log enable row level security;

drop policy if exists "ai_usage_admin_select" on public.ai_usage_log;
create policy "ai_usage_admin_select"
  on public.ai_usage_log
  for select
  to authenticated
  using (
    exists (select 1 from public.users u where u.id = auth.uid() and u.role = 'admin')
    or user_id = auth.uid()
  );

comment on table public.ai_usage_log is
  'Lor''Squad AI (2026-06-10) : journal tokens + coût par appel IA (edge lor-squad-ai).';
