-- =============================================================================
-- Agenda V2 — LOT 6.6 : les permanences du club (2026-07-27).
--
-- « Qui tient le club, et quand ». Ce n'est PAS un rendez-vous client : c'est
-- une plage de présence au bar. D'où une table à part plutôt qu'un détournement
-- de `prospects` ou `follow_ups` — un créneau de permanence n'a ni client, ni
-- statut de conversion, ni rappel à envoyer.
--
-- Affichage : un calque en fond de la grille semaine (bande hachurée), sous
-- les RDV. Le moteur d'agenda est partagé — la permanence n'est qu'une donnée
-- de plus qu'il sait dessiner.
-- =============================================================================

create table if not exists public.club_shifts (
  id uuid primary key default gen_random_uuid(),
  club_id uuid not null references public.clubs (id) on delete cascade,
  user_id uuid not null references public.users (id) on delete cascade,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  note text,
  created_at timestamptz not null default now(),
  -- Un créneau qui finit avant de commencer produirait une bande de hauteur
  -- négative : on refuse au niveau de la base plutôt que de le dessiner.
  constraint club_shifts_order_check check (ends_at > starts_at)
);

comment on table public.club_shifts is
  'Permanences du club : qui tient le bar et quand. Distinct des RDV clients. Chantier Agenda V2 LOT 6.6, 2026-07-27.';

create index if not exists club_shifts_club_start_idx
  on public.club_shifts (club_id, starts_at);
create index if not exists club_shifts_user_idx
  on public.club_shifts (user_id, starts_at);

alter table public.club_shifts enable row level security;

-- Lecture : tout le monde dans l'app voit les permanences des clubs (c'est le
-- but — savoir qui tient le club). Écriture : la personne concernée, le
-- propriétaire du club, ou un admin.
drop policy if exists club_shifts_select_authenticated on public.club_shifts;
create policy club_shifts_select_authenticated on public.club_shifts
  for select using (auth.uid() is not null);

drop policy if exists club_shifts_insert_self_or_owner on public.club_shifts;
create policy club_shifts_insert_self_or_owner on public.club_shifts
  for insert with check (
    user_id = auth.uid()
    or public.is_admin()
    or exists (
      select 1 from public.clubs c
      where c.id = club_id and c.owner_user_id = auth.uid()
    )
  );

drop policy if exists club_shifts_delete_self_or_owner on public.club_shifts;
create policy club_shifts_delete_self_or_owner on public.club_shifts
  for delete using (
    user_id = auth.uid()
    or public.is_admin()
    or exists (
      select 1 from public.clubs c
      where c.id = club_id and c.owner_user_id = auth.uid()
    )
  );

drop policy if exists club_shifts_update_self_or_owner on public.club_shifts;
create policy club_shifts_update_self_or_owner on public.club_shifts
  for update using (
    user_id = auth.uid()
    or public.is_admin()
    or exists (
      select 1 from public.clubs c
      where c.id = club_id and c.owner_user_id = auth.uid()
    )
  );
