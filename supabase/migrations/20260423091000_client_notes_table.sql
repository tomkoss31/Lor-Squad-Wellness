-- Chantier Polish Vue complète + refonte bilan (2026-04-24).
-- Table des notes coach vivantes (post-bilan) : suivi, ajustements produits,
-- ressenti client, note libre. Multi-auteurs (un coach peut reprendre un
-- client d'un autre coach admin), RLS owner_only sur author_id.
--
-- Idempotent : ok à rejouer.

create table if not exists public.client_notes (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients(id) on delete cascade,
  author_id uuid references public.users(id) on delete set null,
  type text not null check (type in ('followup','product_adjustment','feeling','free')),
  content text not null,
  created_at timestamptz not null default now()
);

create index if not exists client_notes_client_id_idx
  on public.client_notes (client_id, created_at desc);

alter table public.client_notes enable row level security;

-- L'auteur peut tout faire sur ses propres notes (propriété stricte).
drop policy if exists "client_notes_owner_all" on public.client_notes;
create policy "client_notes_owner_all"
  on public.client_notes
  for all
  using (author_id = auth.uid())
  with check (author_id = auth.uid());

-- Admin peut tout voir (pas d'édition des notes d'un autre coach, juste lecture).
drop policy if exists "client_notes_admin_read" on public.client_notes;
create policy "client_notes_admin_read"
  on public.client_notes
  for select
  using (
    exists (
      select 1 from public.users u
      where u.id = auth.uid() and u.role = 'admin' and u.active = true
    )
  );

comment on table public.client_notes is
  'Notes coach vivantes : suivi, ajustement produits, ressenti, libre. Post-bilan.';
