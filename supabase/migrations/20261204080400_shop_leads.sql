-- =============================================================================
-- Chantier Boutique HL SKIN — Étape 5 : leads boutique (popup bienvenue) (2026-07-10)
-- =============================================================================
--
-- Emails capturés sur la boutique (popup de bienvenue −5 % + inscription).
-- Distinct des commandes (shop_orders) et de la vraie CRM prospects : c'est la
-- liste email de la boutique (base des relances). Le tag/pont vers la CRM skin
-- se fera au cockpit (Étape 6).
--
-- Écriture = edge service_role. Lecture = distri propriétaire + admin. Idempotent.
-- =============================================================================

begin;

create table if not exists public.shop_leads (
  id                 uuid primary key default gen_random_uuid(),
  coach_user_id      uuid not null references public.users(id) on delete cascade,
  boutique_slug      text,
  email              text not null,
  first_name         text,
  source             text not null default 'welcome_popup',  -- welcome_popup | newsletter
  welcome_code       text,
  code_email_sent_at timestamptz,
  reminder_sent_at   timestamptz,          -- future relance 22h
  converted_order_id uuid references public.shop_orders(id) on delete set null,
  created_at         timestamptz not null default now()
);

comment on table public.shop_leads is
  'Boutique HL SKIN — emails capturés (popup bienvenue / inscription). Base des relances. Un email unique par distri.';

-- Un email unique par distri (upsert sur re-soumission). Email toujours stocké
-- en minuscules par l'edge → index simple qui matche l'ON CONFLICT de l'upsert.
create unique index if not exists shop_leads_owner_email_uidx
  on public.shop_leads (coach_user_id, email);
create index if not exists shop_leads_coach_idx on public.shop_leads (coach_user_id, created_at desc);

alter table public.shop_leads enable row level security;

drop policy if exists shop_leads_owner_read on public.shop_leads;
create policy shop_leads_owner_read
  on public.shop_leads for select to authenticated
  using (coach_user_id = auth.uid()
    or exists (select 1 from public.users u where u.id = auth.uid() and u.role = 'admin'));

commit;
