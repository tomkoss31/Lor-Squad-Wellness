-- =============================================================================
-- BBC — persistance cobayes + assignation coach (2026-07-24). 100% additif.
--   - outreach_templates : scripts (miroir du front, verrouillables)
--   - outreach_messages   : chaque cobaye envoyé (compteur réel du jour)
--   - set_club_model()    : RPC admin/self pour poser users.club_model
--
-- INERTE tant que non poussé. Nouvelles tables + 1 RPC — aucun impact existant.
-- =============================================================================

begin;

-- 1. Templates de scripts (miroir front bbcScripts.ts ; source d'un futur
--    push admin). Lecture pour tout utilisateur authentifié.
create table if not exists public.outreach_templates (
  key text primary key,
  label text not null,
  body text not null,
  model text,
  locked boolean not null default true,
  created_at timestamptz not null default now()
);
alter table public.outreach_templates enable row level security;
drop policy if exists "outreach_templates_read" on public.outreach_templates;
create policy "outreach_templates_read"
  on public.outreach_templates for select
  using (auth.role() = 'authenticated');

-- 2. Cobayes envoyés (le seul chiffre du mois 1). Chaque coach voit/gère
--    les siens ; le compteur du jour = count(sent_at::date = aujourd'hui).
create table if not exists public.outreach_messages (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users (id) on delete cascade,
  template_key text,
  contact_label text,
  client_id uuid references public.clients (id) on delete set null,
  channel text not null default 'whatsapp',
  sent_at timestamptz not null default now()
);
create index if not exists outreach_messages_user_sent_idx
  on public.outreach_messages (user_id, sent_at);
alter table public.outreach_messages enable row level security;
drop policy if exists "outreach_messages_own" on public.outreach_messages;
create policy "outreach_messages_own"
  on public.outreach_messages for all
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- 3. RPC : poser users.club_model (self ou admin). Security definer car la
--    table users n'est pas librement modifiable côté client.
create or replace function public.set_club_model(p_user_id uuid, p_model text)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_caller uuid := auth.uid();
  v_is_admin boolean;
begin
  if p_model not in ('classic', 'bbc') then
    raise exception 'club_model invalide : %', p_model;
  end if;
  select (role = 'admin') into v_is_admin from public.users where id = v_caller;
  if not (v_caller = p_user_id or coalesce(v_is_admin, false)) then
    raise exception 'non autorisé';
  end if;
  update public.users set club_model = p_model where id = p_user_id;
  return p_model;
end;
$$;
revoke all on function public.set_club_model(uuid, text) from public;
grant execute on function public.set_club_model(uuid, text) to authenticated;

commit;
