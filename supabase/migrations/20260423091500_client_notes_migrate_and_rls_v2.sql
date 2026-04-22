-- Chantier Polish Vue complète V2 (2026-04-24).
-- Patch V2 de la migration client_notes (20260423091000) :
--   1) Migre les notes existantes depuis clients.general_note → client_notes
--   2) Renomme clients.general_note en general_note_deprecated (backup)
--   3) Remplace les RLS 'owner_only (author_id)' par
--      'owner_or_admin (via clients.distributor_id)'
--
-- Idempotent : ok à rejouer (utilise IF NOT EXISTS, conditionnels, etc.)

-- ─── 1) Migration des notes existantes ──────────────────────────────────
-- On insère une note de type 'free' par client qui a une general_note non vide.
-- Anti-doublon : on ne ré-insère pas si une note 'free' avec exactement
-- le même contenu existe déjà pour ce client (rejeu idempotent).

do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public'
      and table_name = 'clients'
      and column_name = 'general_note'
  ) then
    insert into public.client_notes (client_id, author_id, type, content, created_at)
    select
      c.id,
      c.distributor_id,
      'free',
      c.general_note,
      coalesce(c.created_at, now())
    from public.clients c
    where c.general_note is not null
      and trim(c.general_note) <> ''
      and not exists (
        select 1 from public.client_notes n
        where n.client_id = c.id
          and n.type = 'free'
          and n.content = c.general_note
      );
  end if;
end$$;

-- ─── 2) Renommage clients.general_note → general_note_deprecated ────────
do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public'
      and table_name = 'clients'
      and column_name = 'general_note'
  ) and not exists (
    select 1 from information_schema.columns
    where table_schema = 'public'
      and table_name = 'clients'
      and column_name = 'general_note_deprecated'
  ) then
    alter table public.clients rename column general_note to general_note_deprecated;
    comment on column public.clients.general_note_deprecated is
      'DEPRECATED (2026-04-24) — remplacé par la table client_notes. Gardé en backup.';
  end if;
end$$;

-- ─── 3) Remplacement des RLS V1 par RLS V2 (owner_or_admin) ─────────────
-- V1 utilisait author_id = auth.uid() (trop restrictif : un admin qui
-- reprend un dossier ne peut pas éditer ses propres notes après transfert).
-- V2 : le distributeur propriétaire du dossier OU un admin actif peut
-- tout faire sur les notes de ce client.

drop policy if exists "client_notes_owner_all" on public.client_notes;
drop policy if exists "client_notes_admin_read" on public.client_notes;
drop policy if exists "client_notes_owner_or_admin_select" on public.client_notes;
drop policy if exists "client_notes_owner_or_admin_insert" on public.client_notes;
drop policy if exists "client_notes_owner_or_admin_update" on public.client_notes;
drop policy if exists "client_notes_owner_or_admin_delete" on public.client_notes;

create policy "client_notes_owner_or_admin_select"
  on public.client_notes
  for select
  using (
    exists (
      select 1 from public.clients c
      where c.id = client_notes.client_id
        and (
          c.distributor_id = auth.uid()
          or exists (
            select 1 from public.users u
            where u.id = auth.uid() and u.role = 'admin' and u.active = true
          )
        )
    )
  );

create policy "client_notes_owner_or_admin_insert"
  on public.client_notes
  for insert
  with check (
    exists (
      select 1 from public.clients c
      where c.id = client_notes.client_id
        and (
          c.distributor_id = auth.uid()
          or exists (
            select 1 from public.users u
            where u.id = auth.uid() and u.role = 'admin' and u.active = true
          )
        )
    )
  );

create policy "client_notes_owner_or_admin_update"
  on public.client_notes
  for update
  using (
    exists (
      select 1 from public.clients c
      where c.id = client_notes.client_id
        and (
          c.distributor_id = auth.uid()
          or exists (
            select 1 from public.users u
            where u.id = auth.uid() and u.role = 'admin' and u.active = true
          )
        )
    )
  );

create policy "client_notes_owner_or_admin_delete"
  on public.client_notes
  for delete
  using (
    exists (
      select 1 from public.clients c
      where c.id = client_notes.client_id
        and (
          c.distributor_id = auth.uid()
          or exists (
            select 1 from public.users u
            where u.id = auth.uid() and u.role = 'admin' and u.active = true
          )
        )
    )
  );
