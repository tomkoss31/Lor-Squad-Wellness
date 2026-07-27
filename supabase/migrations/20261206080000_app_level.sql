-- =============================================================================
-- Chantier Simplification (2026-07-27) — LOT 0 : socle de visibilité.
--
-- Constat : un distri a ~45 destinations atteignables depuis les menus. Mélanie
-- (65 clients, 405 bilans) n'utilise QUE bilan / clients / agenda / CRM. Le
-- reste est du bruit pour elle — mais reste indispensable à Thomas.
--
-- Décision Thomas : on ne SUPPRIME rien, on rend visible selon la personne.
--   essentiel = le socle du quotidien (défaut de tout le monde)
--   complet   = toute l'app (Thomas seul au départ, il ouvre au cas par cas)
--
-- ⚠ RÈGLE ABSOLUE : app_level ne pilote QUE l'affichage des menus. Il ne
-- restreint jamais une route ni une donnée. Une URL directe (push notif,
-- annonce, deep-link Co-pilote) reste ouverte pour tout le monde → aucune
-- régression possible sur les liens existants, et zéro fausse sécurité.
-- La sécurité réelle reste portée par les RLS et le rôle.
-- =============================================================================

alter table public.users
  add column if not exists app_level text not null default 'essentiel';

alter table public.users
  drop constraint if exists users_app_level_check;
alter table public.users
  add constraint users_app_level_check
  check (app_level in ('essentiel', 'complet'));

comment on column public.users.app_level is
  'Niveau de visibilité de la navigation : essentiel (socle quotidien) | complet (toute l app). N affecte QUE l affichage des menus — jamais les routes ni la donnée. Modifiable par un admin uniquement (trigger users_guard_app_level).';

-- Seed : Thomas seul en complet (décision 2026-07-27). Tout le reste hérite du
-- défaut 'essentiel', Mélanie incluse — c'est précisément le cas d'usage cible.
update public.users
  set app_level = 'complet'
  where lower(email) = 'fit2tom.coach@gmail.com';

-- ─── Garde-fou anti auto-promotion ──────────────────────────────────────────
-- La policy `users_update_self` autorise chacun à modifier sa propre ligne
-- (ville, avatar, rang…). Sans ce trigger, n'importe qui pourrait se passer en
-- 'complet' d'un simple update. Le trigger ne se déclenche que si la valeur
-- CHANGE → les edge functions service_role qui touchent d'autres colonnes ne
-- sont pas impactées.
create or replace function public.guard_app_level_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.app_level is distinct from old.app_level and not public.is_admin() then
    raise exception 'app_level : modification réservée aux admins';
  end if;
  return new;
end;
$$;

drop trigger if exists users_guard_app_level on public.users;
create trigger users_guard_app_level
  before update on public.users
  for each row
  execute function public.guard_app_level_change();
