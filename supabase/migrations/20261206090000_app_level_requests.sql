-- =============================================================================
-- Chantier Simplification (2026-07-27) — LOT 4 : demander l'accès complet.
--
-- « Mon développement » devient l'espace de Thomas. Un membre qui veut y
-- accéder le demande depuis le cockpit La Base Académie ; Thomas voit les
-- demandes en attente sur /users, juste au-dessus du réglage « Niveau d'app ».
--
-- Volontairement SANS notification push : le chantier en cours coupe le bruit
-- (LOT 5), on n'en rajoute pas. La demande attend sagement là où Thomas va de
-- toute façon pour basculer le niveau.
-- =============================================================================

create table if not exists public.app_level_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  status text not null default 'pending'
    check (status in ('pending', 'approved', 'refused')),
  handled_at timestamptz,
  handled_by uuid references public.users(id) on delete set null
);

comment on table public.app_level_requests is
  'Demandes d acces au niveau app complet (chantier Simplification 2026-07-27). Une seule demande en attente par personne.';

-- Une seule demande en attente par personne (le bouton devient inerte ensuite).
create unique index if not exists app_level_requests_one_pending
  on public.app_level_requests (user_id)
  where status = 'pending';

create index if not exists app_level_requests_status_idx
  on public.app_level_requests (status, created_at desc);

alter table public.app_level_requests enable row level security;

-- Chacun crée et relit SA demande ; les admins voient et traitent tout.
drop policy if exists app_level_requests_insert_self on public.app_level_requests;
create policy app_level_requests_insert_self on public.app_level_requests
  for insert with check (user_id = auth.uid());

drop policy if exists app_level_requests_select_own_or_admin on public.app_level_requests;
create policy app_level_requests_select_own_or_admin on public.app_level_requests
  for select using (user_id = auth.uid() or public.is_admin());

drop policy if exists app_level_requests_update_admin on public.app_level_requests;
create policy app_level_requests_update_admin on public.app_level_requests
  for update using (public.is_admin()) with check (public.is_admin());
