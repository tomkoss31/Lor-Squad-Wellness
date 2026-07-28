-- =============================================================================
-- BBC — la permanence du matin (« La semaine du club », 2026-07-28).
--
-- ⚠ CE CHANTIER NE CRÉE PAS SA PROPRE TABLE, ET C'EST LE POINT IMPORTANT.
-- En allant l'écrire, on a trouvé `club_shifts` DÉJÀ EN BASE : le chantier
-- Agenda V2 (LOT 6.6, branche claude/app-360-simplification) l'a livrée la
-- veille pour la grille classique, avec la même définition métier — « qui tient
-- le bar, et quand ». Base partagée dev/prod : elle est vivante partout.
--
-- Créer une seconde table BBC aurait donné deux vérités pour la même question,
-- exactement ce que la règle B9 interdit (une feature = un seul endroit). On
-- réutilise donc la table telle quelle, et cette migration n'ajoute QUE ce qui
-- manque au mode BBC.
--
-- Ce qu'on N'A PAS fait, volontairement :
--   · pas de colonne `shift_date` — la table raisonne en plages horaires
--     (starts_at / ends_at) et l'agenda classique s'en sert déjà ainsi. Le
--     mode BBC compose sa plage à partir de `clubs.settings.open_hours`.
--   · pas de contrainte d'unicité (club_id, jour) — elle aurait CASSÉ l'agenda
--     classique, où poser deux plages le même jour est légitime. L'invariant
--     BBC « un seul bloc de permanence par matin » est donc tenu par la RPC,
--     qui remplace toute plage chevauchante au lieu d'en empiler une de plus.
--
-- 100 % ADDITIF : create table if not exists (no-op en prod, utile sur une base
-- neuve), add column if not exists, create function. Aucun drop de table, aucun
-- alter destructeur, aucune donnée existante touchée.
-- =============================================================================

-- ── 1. La table, reprise à l'identique du LOT 6.6 ───────────────────────────
-- No-op sur la base partagée (elle existe). Présente ici pour qu'un
-- `supabase db push` depuis la seule branche feat/bbc parte d'une base saine :
-- les deux fichiers sont `if not exists`, ils se croisent sans se marcher
-- dessus au moment du merge.
--
-- ⚠ CE FICHIER NE SUFFIT PAS À LUI SEUL : il active la RLS sans définir de
-- policy. Sur une base neuve (branche Supabase, `db reset`), la table naîtrait
-- donc muette — le SELECT direct du front renverrait [] pour toujours, en
-- silence, pendant que les RPC (security definer) écriraient correctement :
-- le coach affecte quelqu'un, la RPC réussit, et le matin repasse « personne
-- n'ouvre » au refetch, sans la moindre erreur. Les 4 policies sont dans
-- 20261206280000_bbc_club_shifts_rls_owner.sql (idempotentes), qui est LA
-- référence depuis la revue de sécurité — ne pas les recopier ici, deux
-- définitions concurrentes de la même policy finissent toujours par diverger.
create table if not exists public.club_shifts (
  id uuid primary key default gen_random_uuid(),
  club_id uuid not null references public.clubs (id) on delete cascade,
  user_id uuid not null references public.users (id) on delete cascade,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  note text,
  created_at timestamptz not null default now(),
  constraint club_shifts_order_check check (ends_at > starts_at)
);
create index if not exists club_shifts_club_start_idx on public.club_shifts (club_id, starts_at);
create index if not exists club_shifts_user_idx on public.club_shifts (user_id, starts_at);
alter table public.club_shifts enable row level security;

-- ── 2. La récurrence, prévue mais pas branchée ──────────────────────────────
-- Décision produit : affectation date par date pour l'instant. On pose quand
-- même la colonne, nullable et SANS CHECK : le jour où on l'active, une ligne
-- portant 'weekly' vaudra « tous les <même jour de semaine> à partir de
-- starts_at », et une plage datée l'emportera sur la règle. Sans CHECK, on
-- pourra inventer d'autres valeurs plus tard sans migration cassante.
-- Personne ne la lit aujourd'hui — ni le front BBC, ni l'agenda classique.
alter table public.club_shifts add column if not exists recurrence text;

comment on column public.club_shifts.recurrence is
  'Récurrence future (ex. weekly). Prévue au schéma, non implémentée — aucun lecteur au 2026-07-28.';

-- ── 3. Les RPC du mode BBC ──────────────────────────────────────────────────
-- La RLS du LOT 6.6 autorise déjà le propriétaire du club à écrire en direct.
-- Ces fonctions n'ajoutent donc pas un droit : elles ajoutent l'INVARIANT que
-- la table ne peut pas porter (un seul bloc par matin) et un point d'entrée
-- qui raisonne en « ce matin-là », comme l'écran.

-- Affecte (ou réaffecte) quelqu'un à un créneau. Le geste normal côté comptoir
-- est de CHANGER qui tient le bar : la fonction remplace ce qui chevauche la
-- plage visée plutôt que d'échouer ou d'empiler une seconde permanence.
create or replace function public.bbc_assign_shift(
  p_club_id uuid,
  p_starts_at timestamptz,
  p_ends_at timestamptz,
  p_user_id uuid
)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_me uuid := auth.uid();
  v_owner uuid;
  v_id uuid;
begin
  if p_ends_at <= p_starts_at then
    raise exception 'creneau invalide';
  end if;

  select owner_user_id into v_owner from public.clubs where id = p_club_id;
  if v_owner is null then
    raise exception 'club introuvable';
  end if;

  -- `security definer` contourne la RLS : ce test N'EST PAS une ceinture de
  -- plus, c'est LE contrôle d'accès. La propriété se vérifie sur `clubs` — pas
  -- sur une colonne de la ligne écrite, qu'un appelant choisit librement.
  if v_owner is distinct from v_me
     and not exists (select 1 from public.users u where u.id = v_me and u.role = 'admin') then
    raise exception 'non autorise';
  end if;

  -- La personne doit exister, sans devoir appartenir à l'équipe du coach : un
  -- club se dépanne (quelqu'un d'une autre lignée ouvre un samedi). Le front
  -- ne PROPOSE que l'équipe ; la base ne l'IMPOSE pas.
  if not exists (select 1 from public.users u where u.id = p_user_id) then
    raise exception 'personne introuvable';
  end if;

  -- « Un seul bloc de permanence par matin » : on efface ce qui chevauche la
  -- plage visée, pas la journée entière — une plage d'après-midi posée depuis
  -- l'agenda classique n'a pas à disparaître parce qu'on affecte le matin.
  delete from public.club_shifts
  where club_id = p_club_id
    and starts_at < p_ends_at
    and ends_at > p_starts_at;

  insert into public.club_shifts (club_id, user_id, starts_at, ends_at)
  values (p_club_id, p_user_id, p_starts_at, p_ends_at)
  returning id into v_id;

  return json_build_object('id', v_id);
end;
$$;
revoke all on function public.bbc_assign_shift(uuid, timestamptz, timestamptz, uuid) from public;
grant execute on function public.bbc_assign_shift(uuid, timestamptz, timestamptz, uuid) to authenticated;

-- Libère un créneau. On SUPPRIME la ligne : « libéré » et « jamais renseigné »
-- doivent retomber sur le même affichage ambre, sinon deux états indiscernables
-- à l'œil finiraient par produire deux comportements différents (relance,
-- notification…) sans que personne comprenne pourquoi.
create or replace function public.bbc_clear_shift(
  p_club_id uuid,
  p_starts_at timestamptz,
  p_ends_at timestamptz
)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_me uuid := auth.uid();
  v_owner uuid;
  v_n int;
begin
  select owner_user_id into v_owner from public.clubs where id = p_club_id;
  if v_owner is null then
    raise exception 'club introuvable';
  end if;
  if v_owner is distinct from v_me
     and not exists (select 1 from public.users u where u.id = v_me and u.role = 'admin') then
    raise exception 'non autorise';
  end if;

  delete from public.club_shifts
  where club_id = p_club_id
    and starts_at < p_ends_at
    and ends_at > p_starts_at;
  get diagnostics v_n = row_count;

  return json_build_object('supprimes', v_n);
end;
$$;
revoke all on function public.bbc_clear_shift(uuid, timestamptz, timestamptz) from public;
grant execute on function public.bbc_clear_shift(uuid, timestamptz, timestamptz) to authenticated;
