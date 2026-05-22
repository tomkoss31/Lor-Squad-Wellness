-- =============================================================================
-- Admin audit log (chantier #12 polish 2026-05-22)
--
-- Trace toutes les actions sensibles admin (création/modif/suppression
-- d'externes, modifs RLS-sensibles). Permet :
--   - Debug : reconstituer "qui a fait quoi" en cas de problème
--   - Détection abus : burst d'actions = token compromis
--   - Conformité : journal d'accès admin
--
-- Insert via SECURITY DEFINER RPC `log_admin_action` qui prend l'action
-- + payload jsonb. Pas de policy permissive — write strictement via RPC.
-- =============================================================================

begin;

create table if not exists public.admin_audit_log (
  id uuid not null default gen_random_uuid(),
  actor_user_id uuid null references public.users(id) on delete set null,
  actor_email text null,
  action text not null,
  target_id uuid null,
  target_label text null,
  payload jsonb null,
  ip_address text null,
  created_at timestamptz not null default now(),
  primary key (id)
);

create index if not exists idx_admin_audit_log_actor on public.admin_audit_log(actor_user_id, created_at desc);
create index if not exists idx_admin_audit_log_action on public.admin_audit_log(action, created_at desc);
create index if not exists idx_admin_audit_log_created on public.admin_audit_log(created_at desc);

comment on table public.admin_audit_log is
  'Chantier #12 (2026-05-22) : journal d''audit des actions admin sensibles. Write via RPC log_admin_action uniquement. Read via policy admin.';

alter table public.admin_audit_log enable row level security;

-- Lecture : admin uniquement
drop policy if exists admin_audit_log_read on public.admin_audit_log;
create policy admin_audit_log_read on public.admin_audit_log
  for select to authenticated
  using (
    exists (
      select 1 from public.users u
       where u.id = auth.uid() and u.role = 'admin' and u.active = true
    )
  );

-- Write bloqué hors RPC
drop policy if exists admin_audit_log_no_direct_write on public.admin_audit_log;
create policy admin_audit_log_no_direct_write on public.admin_audit_log
  for all to authenticated
  using (false)
  with check (false);

-- RPC log_admin_action : called by edge functions/api with service_role.
-- Pas exposé aux users authentifiés (utilisé en interne via service_role).
create or replace function public.log_admin_action(
  p_actor_user_id uuid,
  p_action text,
  p_target_id uuid,
  p_target_label text,
  p_payload jsonb,
  p_ip text
)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_email text;
begin
  -- Best effort lookup email
  select email into v_email from public.users where id = p_actor_user_id limit 1;
  insert into public.admin_audit_log
    (actor_user_id, actor_email, action, target_id, target_label, payload, ip_address)
  values
    (p_actor_user_id, v_email, p_action, p_target_id, p_target_label, p_payload, p_ip);
end;
$$;

revoke all on function public.log_admin_action(uuid, text, uuid, text, jsonb, text) from public;
grant execute on function public.log_admin_action(uuid, text, uuid, text, jsonb, text) to service_role;

commit;
