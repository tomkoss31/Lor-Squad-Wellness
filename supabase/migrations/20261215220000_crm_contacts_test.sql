-- =============================================================================
-- Les comptes de test sortent du CRM — demande de Thomas, 24/08.
--
-- LE CONSTAT (mesure en base du 24/08). Thomas et Mélanie testent les tunnels
-- publics avec leurs propres coordonnées. Résultat : 13 lignes de test dans
-- `rdv_bookings`, dont 8 réservations au nom de « MELANIE » et une série de
-- « Test » / « thomas ». Elles polluent l'agenda, les compteurs, et elles
-- ressortaient en tête de l'analyse des doublons.
--
-- ── POURQUOI MARQUER LE CONTACT, ET PAS LA LIGNE ──────────────────────────
-- Marquer les 13 lignes serait à refaire à chaque test. On marque donc les
-- COORDONNÉES : tout ce qui arrivera demain avec l'adresse de Thomas sera
-- reconnu comme un test, sans aucune intervention. C'est la seule forme qui
-- ne demande pas d'entretien.
--
-- ── LA CLÉ EST CELLE DU CRM, PAS UNE NOUVELLE ─────────────────────────────
-- `cle` reprend EXACTEMENT le format de `src/features/crm/cleDoublon.ts` :
-- « t:` + 9 chiffres » ou « e:` + adresse en minuscules ». Une deuxième
-- normalisation finirait par diverger de la première — c'est précisément le
-- défaut qu'on vient de corriger (trois détecteurs, trois réponses).
--
-- ⚠️ Rien n'est supprimé. Les lignes de test restent en base ; elles sont
-- seulement écartées de l'affichage, et le filtre se retire en une requête.
-- =============================================================================

create table if not exists public.crm_contacts_test (
  cle         text primary key,
  libelle     text,
  created_at  timestamptz not null default now(),
  created_by  uuid references auth.users(id) on delete set null
);

comment on table public.crm_contacts_test is
  'Coordonnées de test (coachs qui essaient les tunnels publics). Toute fiche ou réservation portant une de ces clés est écartée du CRM. Clé au format de cleDoublon.ts : « t:<9 chiffres> » ou « e:<adresse> ».';

alter table public.crm_contacts_test enable row level security;

-- Lecture par tout compte connecté (le CRM en a besoin à chaque chargement),
-- écriture réservée aux admins : c'est un réglage d'équipe, pas un préférence.
drop policy if exists crm_contacts_test_lecture on public.crm_contacts_test;
create policy crm_contacts_test_lecture
  on public.crm_contacts_test for select to authenticated
  using ((select auth.uid()) is not null);

drop policy if exists crm_contacts_test_admin on public.crm_contacts_test;
create policy crm_contacts_test_admin
  on public.crm_contacts_test for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- `anon` n'a rien à faire ici : les tunnels publics écrivent en service_role.
revoke all on public.crm_contacts_test from anon;

-- ── Les coordonnées connues au 24/08 ──────────────────────────────────────
-- Vérifiées dans `users` : Thomas (fit2tom.coach@gmail.com / 06 79 44 87 59)
-- et Mélanie (milmel55@gmail.com / 06 30 86 03 45). `tomkoss31@gmail.com` est
-- l'adresse personnelle de Thomas, celle qui sert le plus aux essais.
insert into public.crm_contacts_test (cle, libelle) values
  ('e:fit2tom.coach@gmail.com', 'Thomas — adresse coach'),
  ('e:tomkoss31@gmail.com',     'Thomas — adresse perso (essais)'),
  ('e:milmel55@gmail.com',      'Mélanie — adresse perso'),
  ('t:679448759',               'Thomas — téléphone'),
  ('t:630860345',               'Mélanie — téléphone')
on conflict (cle) do nothing;
