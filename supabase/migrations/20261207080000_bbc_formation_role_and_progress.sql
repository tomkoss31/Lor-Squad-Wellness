-- =============================================================================
-- BBC — Formation : marche du lecteur + progression réelle (2026-07-28).
--
-- Deux manques qui faisaient mentir l'écran Formation :
--   1. la marche affichée (« TU ES Coach stagiaire ») était une constante ;
--   2. le compteur « 3 / 9 fait » était une chaîne de caractères.
--
-- Cette migration est 100 % ADDITIVE (1 colonne nullable, 1 table, 2 fonctions).
-- Base Supabase PARTAGÉE dev/prod : aucun drop, aucun alter cassant. Tant
-- qu'elle n'est pas poussée, le front tombe en repli propre — il n'affiche NI
-- badge de marche, NI compteur, et ne verrouille RIEN (règle : le pire cas doit
-- être « on ne sait pas », jamais « c'est fermé »).
-- =============================================================================

begin;

-- ── 1. Override de marche ───────────────────────────────────────────────────
-- Même patron que `pilotage_level_override` / `monthly_pv_override` : la
-- dérivation par les faits ne sait pas tout. « Junior partner » se décide par
-- un entretien d'1h30 et un engagement de 3 à 9 mois — ça ne laisse AUCUNE
-- trace en base. Seul un humain (le propriétaire du club) peut le poser.
alter table public.users
  add column if not exists bbc_role_override text;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'users_bbc_role_override_check'
      and conrelid = 'public.users'::regclass
  ) then
    alter table public.users
      add constraint users_bbc_role_override_check
      check (bbc_role_override is null or bbc_role_override in
             ('membre', 'stagiaire', 'junior', 'proprietaire', 'rollout'));
  end if;
end$$;

-- Pas de trigger garde-fou ici, CONTRAIREMENT à `app_level` (cf. CLAUDE.md).
-- La policy `users_update_self` laisse chacun modifier sa propre ligne, donc un
-- coach peut techniquement se poser sa propre marche. C'est assumé : cette
-- colonne ne protège RIEN — au pire il ouvre un module de formation en avance,
-- et la règle du chantier est justement « ouvrir plutôt que fermer ». Ajouter
-- un 2e trigger BEFORE UPDATE sur `users` coûterait plus cher en risque de
-- régression (toute édition de profil y passerait) qu'il ne rapporte.
create or replace function public.set_bbc_role_override(p_user_id uuid, p_role text)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
begin
  if v_uid is null then
    raise exception 'non authentifie';
  end if;
  -- Un admin, ou un propriétaire de club actif sur quelqu'un de son arbre :
  -- c'est le club owner qui nomme ses junior partners, pas la plateforme.
  if not (
    public.is_admin()
    or (
      exists (select 1 from public.clubs c where c.owner_user_id = v_uid and c.active)
      and public.is_in_user_subtree(p_user_id, v_uid)
    )
  ) then
    raise exception 'non autorise';
  end if;
  if p_role is not null and p_role not in ('membre', 'stagiaire', 'junior', 'proprietaire', 'rollout') then
    raise exception 'marche inconnue';
  end if;
  update public.users set bbc_role_override = p_role where id = p_user_id;
  return p_role;
end;
$$;
revoke all on function public.set_bbc_role_override(uuid, text) from public;
grant execute on function public.set_bbc_role_override(uuid, text) to authenticated;

-- ── 2. Progression Formation ────────────────────────────────────────────────
-- Table DÉDIÉE, copie conforme de `bbc_prelaunch_progress`. On NE réutilise PAS
-- `formation_user_progress` : son trigger `trg_notify_formation_validation` ne
-- filtre pas sur le module_id, donc un module BBC validé partirait en notif au
-- sponsor pour un module que le registre Formation classique ne connaît pas —
-- et mélanger les deux espaces d'identifiants (M1.1… vs 00…08) reproduirait le
-- piège des programmes PV documenté dans CLAUDE.md.
create table if not exists public.bbc_formation_progress (
  user_id uuid not null references public.users (id) on delete cascade,
  module_key text not null,          -- '00' … '08'
  done_at timestamptz,
  updated_at timestamptz not null default now(),
  primary key (user_id, module_key)
);

alter table public.bbc_formation_progress enable row level security;

drop policy if exists "bbc_formation_own" on public.bbc_formation_progress;
create policy "bbc_formation_own"
  on public.bbc_formation_progress for all
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- Lecture admin : c'est ce qui permettra à un propriétaire de club de voir où
-- en sont ses stagiaires sans jamais pouvoir cocher à leur place.
drop policy if exists "bbc_formation_admin_read" on public.bbc_formation_progress;
create policy "bbc_formation_admin_read"
  on public.bbc_formation_progress for select
  using (exists (select 1 from public.users u where u.id = auth.uid() and u.role = 'admin'));

-- Idempotente (coalesce sur done_at) : recocher ne réécrit pas la date, sinon
-- un double-clic ferait reculer « depuis quand c'est fait ».
create or replace function public.bbc_toggle_formation(p_module_key text, p_done boolean)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
begin
  if v_uid is null then
    raise exception 'non authentifie';
  end if;
  insert into public.bbc_formation_progress (user_id, module_key, done_at, updated_at)
  values (v_uid, p_module_key, case when p_done then now() else null end, now())
  on conflict (user_id, module_key) do update
    set done_at = case when p_done then coalesce(public.bbc_formation_progress.done_at, now()) else null end,
        updated_at = now();
  return p_done;
end;
$$;
revoke all on function public.bbc_toggle_formation(text, boolean) from public;
grant execute on function public.bbc_toggle_formation(text, boolean) to authenticated;

commit;
