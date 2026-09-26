-- =============================================================================
-- Le comptoir du club — lot 1 : la carte et la caisse au pointage (26/09/2026).
-- Maquette SHZYSBaqfgWVqdMncgrcPG validée, « go lot 1 » de Thomas.
-- Réflexion complète : docs/REFLEXION_MONETISATION_2026-09.md.
--
-- LES RÈGLES VALIDÉES PAR THOMAS
--   · La carte de visites, c'est le club : le propriétaire l'encaisse (le shake
--     et la boisson du matin sont compris, servis avec le stock du club).
--   · Tout ce qui s'ajoute (upgrades et « à emporter ») vient des pots de la
--     coach en caisse, achetés avec SA remise, payé sur SON terminal. Elle garde
--     sa marge ; rien à reverser au club. Le propriétaire touche l'écart de
--     remise par Herbalife.
--   · Un seul prix par produit pour tout le club, fixé par le propriétaire.
-- L'app N'ENCAISSE RIEN : elle enregistre ce que la coach a vendu.
--
-- CE QUE FAIT CE FICHIER (100 % additif, rien de ce qui tourne ne change)
--   1. club_carte  : la carte du club (le tableau du comptoir), par club.
--   2. club_ventes : chaque vente, lignes FIGÉES au prix du jour. À PART de
--      pv_transactions / pv_client_products (les commandes des fiches) : rien
--      n'est compté deux fois dans les PV ni dans l'écran Rentabilité.
--   3. Les fonctions (security definer, lues et écrites par elles seules) :
--      club_caisse, club_vendre, club_achats, club_vente_annuler,
--      club_carte_enregistrer.
--   4. La carte de départ : les 34 lignes du tableau du 26/09 + le grand
--      thé-aloé (2,60 € par défaut, modifiable).
--
-- Colonnes posées pour les lots suivants (aucun écran ne les lit encore) :
--   · ref_herbalife + portions : coût d'une unité et PV (lots 3 et 4) ;
--   · maison : ce qu'une vente met « à la maison » en doses (lot 2) :
--     {"f1": 1} un shake · {"pdm": 2} deux doses · {"the": 3} · {"aloe": 47}.
-- =============================================================================

-- ── 1. La carte du club ─────────────────────────────────────────────────────
create table if not exists public.club_carte (
  id            uuid primary key default gen_random_uuid(),
  club_id       uuid not null references public.clubs (id) on delete cascade,
  rubrique      text not null check (rubrique in ('petit_dej', 'supplement', 'encas', 'complement', 'h24', 'accessoire')),
  nom           text not null check (length(btrim(nom)) between 1 and 80),
  detail        text check (detail is null or length(detail) <= 80),
  prix          numeric(8,2) not null check (prix >= 0 and prix < 1000),
  -- 'upgrade' = ajouté au shake du jour, sur place ; 'emporter' = part avec elle.
  sorte         text not null default 'emporter' check (sorte in ('emporter', 'upgrade')),
  ref_herbalife text,
  portions      numeric(8,2) check (portions is null or portions > 0),
  maison        jsonb check (maison is null or jsonb_typeof(maison) = 'object'),
  ordre         integer not null default 0,
  actif         boolean not null default true,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
create index if not exists club_carte_club_idx on public.club_carte (club_id, rubrique, ordre);

comment on table public.club_carte is
  'La carte du club (le tableau du comptoir). Un seul prix par produit, fixé par le propriétaire. Écriture par club_carte_enregistrer uniquement.';

-- ── 2. Les ventes ───────────────────────────────────────────────────────────
create table if not exists public.club_ventes (
  id           uuid primary key default gen_random_uuid(),
  club_id      uuid not null references public.clubs (id) on delete cascade,
  client_id    uuid references public.clients (id) on delete set null,
  -- La coach EN CAISSE (celle qui a vendu et encaissé sur son terminal), pas la
  -- coach qui suit la fiche : c'est elle qui garde la marge.
  vendeur_id   uuid not null references public.users (id) on delete restrict,
  -- [{carte_id, nom, detail, rubrique, sorte, prix, qte}] — figées au prix du jour.
  lignes       jsonb not null check (jsonb_typeof(lignes) = 'array' and jsonb_array_length(lignes) > 0),
  total        numeric(10,2) not null check (total >= 0),
  annulee_at   timestamptz,
  annulee_par  uuid references public.users (id) on delete set null,
  created_at   timestamptz not null default now()
);
create index if not exists club_ventes_club_idx on public.club_ventes (club_id, created_at desc);
create index if not exists club_ventes_client_idx on public.club_ventes (client_id, created_at desc);
create index if not exists club_ventes_vendeur_idx on public.club_ventes (vendeur_id, created_at desc);

comment on table public.club_ventes is
  'Ce que la coach en caisse a vendu (upgrades et à emporter), payé sur SON terminal. L''app n''encaisse rien. Écriture par club_vendre / club_vente_annuler uniquement.';

-- ── Sécurité : lecture par le RLS, écriture par les fonctions seules ────────
alter table public.club_carte enable row level security;
alter table public.club_ventes enable row level security;
revoke all on public.club_carte, public.club_ventes from anon, authenticated;
grant select on public.club_carte, public.club_ventes to authenticated;

drop policy if exists club_carte_lecture on public.club_carte;
create policy club_carte_lecture on public.club_carte for select to authenticated
  using (club_id = (select public.bbc_mon_club()) or (select public.is_admin()));

drop policy if exists club_ventes_lecture on public.club_ventes;
create policy club_ventes_lecture on public.club_ventes for select to authenticated
  using (
    club_id = (select public.bbc_mon_club())
    or vendeur_id = (select auth.uid())
    or (select public.is_admin())
  );

-- ── Qui peut vendre à cette membre : une coach de son club (ou un admin) ────
-- Plus large que bbc_agir_pour, et c'est voulu : la stagiaire en caisse sert
-- TOUT le club, pas seulement ses propres membres.
create or replace function public._club_membre_du_club(p_client uuid, p_club uuid)
returns boolean
language sql
stable
security definer
set search_path = public, extensions
as $$
  select coalesce((
    select (c.club_id is not null and c.club_id = p_club)
        or public.est_coach_de_mon_club(c.distributor_id)
        or public.is_admin()
      from public.clients c
     where c.id = p_client
  ), false);
$$;
revoke all on function public._club_membre_du_club(uuid, uuid) from public, anon, authenticated;

-- ── Le propriétaire du club (ou un admin) : seul à changer la carte ─────────
create or replace function public._club_proprio(p_club uuid)
returns boolean
language sql
stable
security definer
set search_path = public, extensions
as $$
  select public.is_admin()
      or exists (select 1 from public.clubs c where c.id = p_club and c.owner_user_id = (select auth.uid()));
$$;
revoke all on function public._club_proprio(uuid) from public, anon, authenticated;

-- ── 3a. Ce que la feuille de caisse affiche ─────────────────────────────────
-- La carte (actifs et non actifs : les Réglages montrent tout), SES habituels
-- (ce qu'elle a pris sur 120 jours, avec sa dernière quantité) et les plus
-- vendus du club sur 60 jours. Un seul appel : la base tourne sur un Nano.
create or replace function public.club_caisse(p_client uuid default null)
returns jsonb
language plpgsql
stable
security definer
set search_path = public, extensions
as $$
declare
  v_moi  uuid := (select auth.uid());
  v_club uuid := public.bbc_mon_club();
  v_membre boolean := false;
begin
  if v_moi is null then
    raise exception 'non autorise';
  end if;
  if v_club is null then
    return jsonb_build_object('club', null, 'modifiable', false, 'carte', '[]'::jsonb,
                              'habituels', '[]'::jsonb, 'meilleures', '[]'::jsonb);
  end if;
  if p_client is not null then
    v_membre := public._club_membre_du_club(p_client, v_club);
  end if;

  return jsonb_build_object(
    'club', v_club,
    'modifiable', public._club_proprio(v_club),
    'carte', coalesce((
      select jsonb_agg(jsonb_build_object(
               'id', k.id, 'rubrique', k.rubrique, 'nom', k.nom, 'detail', k.detail,
               'prix', k.prix, 'sorte', k.sorte, 'ordre', k.ordre, 'actif', k.actif)
             order by k.rubrique, k.ordre, k.nom)
        from public.club_carte k
       where k.club_id = v_club), '[]'::jsonb),
    'habituels', case when not v_membre then '[]'::jsonb else coalesce((
      select jsonb_agg(jsonb_build_object('carte_id', h.carte_id, 'qte', h.qte) order by h.n desc, h.derniere desc)
        from (
          select (l ->> 'carte_id')::uuid as carte_id,
                 count(*) as n,
                 max(v.created_at) as derniere,
                 (array_agg((l ->> 'qte')::integer order by v.created_at desc))[1] as qte
            from public.club_ventes v
            cross join lateral jsonb_array_elements(v.lignes) l
           where v.client_id = p_client
             and v.club_id = v_club
             and v.annulee_at is null
             and v.created_at > now() - interval '120 days'
           group by 1
           order by count(*) desc, max(v.created_at) desc
           limit 6
        ) h), '[]'::jsonb) end,
    'meilleures', coalesce((
      select jsonb_agg(m.carte_id order by m.q desc)
        from (
          select (l ->> 'carte_id')::uuid as carte_id, sum((l ->> 'qte')::integer) as q
            from public.club_ventes v
            cross join lateral jsonb_array_elements(v.lignes) l
           where v.club_id = v_club
             and v.annulee_at is null
             and v.created_at > now() - interval '60 days'
           group by 1
           order by 2 desc
           limit 8
        ) m), '[]'::jsonb)
  );
end;
$$;
revoke all on function public.club_caisse(uuid) from public, anon;
grant execute on function public.club_caisse(uuid) to authenticated;

-- ── 3b. Enregistrer une vente ───────────────────────────────────────────────
-- Les PRIX VIENNENT DE LA CARTE, jamais du navigateur (même règle que
-- create-club-card-payment). Entrée : [{carte_id, qte}] ; deux lignes du même
-- produit sont additionnées.
create or replace function public.club_vendre(p_client uuid, p_lignes jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_moi    uuid := (select auth.uid());
  v_club   uuid := public.bbc_mon_club();
  v_lignes jsonb := '[]'::jsonb;
  v_total  numeric(10,2) := 0;
  v_nb     integer := 0;
  v_id     uuid;
  r        record;
begin
  if v_moi is null then
    raise exception 'non autorise';
  end if;
  if v_club is null then
    raise exception 'pas de club';
  end if;
  if p_client is not null and not public._club_membre_du_club(p_client, v_club) then
    raise exception 'non autorise';
  end if;
  if p_lignes is null or jsonb_typeof(p_lignes) <> 'array'
     or jsonb_array_length(p_lignes) = 0 or jsonb_array_length(p_lignes) > 60 then
    raise exception 'lignes invalides';
  end if;

  for r in
    select k.id, k.nom, k.detail, k.rubrique, k.sorte, k.prix, x.qte, k.actif
      from (
        select (e ->> 'carte_id')::uuid as carte_id, sum((e ->> 'qte')::integer) as qte
          from jsonb_array_elements(p_lignes) e
         group by 1
      ) x
      left join public.club_carte k on k.id = x.carte_id and k.club_id = v_club
  loop
    if r.id is null or not r.actif then
      raise exception 'produit inconnu';
    end if;
    if r.qte is null or r.qte < 1 or r.qte > 99 then
      raise exception 'quantite invalide';
    end if;
    v_lignes := v_lignes || jsonb_build_array(jsonb_build_object(
      'carte_id', r.id, 'nom', r.nom, 'detail', r.detail, 'rubrique', r.rubrique,
      'sorte', r.sorte, 'prix', r.prix, 'qte', r.qte));
    v_total := v_total + r.prix * r.qte;
    v_nb := v_nb + 1;
  end loop;

  if v_nb = 0 then
    raise exception 'lignes invalides';
  end if;

  insert into public.club_ventes (club_id, client_id, vendeur_id, lignes, total)
  values (v_club, p_client, v_moi, v_lignes, v_total)
  returning id into v_id;

  return jsonb_build_object('id', v_id, 'total', v_total, 'lignes', v_lignes);
end;
$$;
revoke all on function public.club_vendre(uuid, jsonb) from public, anon;
grant execute on function public.club_vendre(uuid, jsonb) to authenticated;

-- ── 3c. Ses achats, pour sa fiche ───────────────────────────────────────────
-- Les 30 derniers (hors annulés), avec le prénom de la coach qui a vendu et
-- `annulable` : le jour même (heure de Paris), par celle qui a vendu, le
-- propriétaire ou un admin.
create or replace function public.club_achats(p_client uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = public, extensions
as $$
declare
  v_moi    uuid := (select auth.uid());
  v_club   uuid := public.bbc_mon_club();
  v_proprio boolean;
begin
  if v_moi is null then
    raise exception 'non autorise';
  end if;
  if v_club is null or not public._club_membre_du_club(p_client, v_club) then
    return '[]'::jsonb;
  end if;
  v_proprio := public._club_proprio(v_club);

  return coalesce((
    select jsonb_agg(jsonb_build_object(
             'id', a.id, 'created_at', a.created_at, 'total', a.total, 'lignes', a.lignes,
             'vendeur', a.vendeur, 'annulable', a.annulable)
           order by a.created_at desc)
      from (
        select v.id, v.created_at, v.total, v.lignes,
               coalesce(nullif(split_part(btrim(coalesce(u.name, '')), ' ', 1), ''), 'Coach') as vendeur,
               ((v.vendeur_id = v_moi or v_proprio)
                 and (v.created_at at time zone 'Europe/Paris')::date = (now() at time zone 'Europe/Paris')::date) as annulable
          from public.club_ventes v
          left join public.users u on u.id = v.vendeur_id
         where v.client_id = p_client
           and v.annulee_at is null
         order by v.created_at desc
         limit 30
      ) a), '[]'::jsonb);
end;
$$;
revoke all on function public.club_achats(uuid) from public, anon;
grant execute on function public.club_achats(uuid) to authenticated;

-- ── 3d. Annuler une vente, le jour même ─────────────────────────────────────
-- Une erreur de saisie se corrige en annulant puis en revendant. Après minuit
-- (heure de Paris), une vente ne bouge plus : c'est de la compta.
create or replace function public.club_vente_annuler(p_vente uuid)
returns void
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_moi uuid := (select auth.uid());
  v     public.club_ventes%rowtype;
begin
  if v_moi is null then
    raise exception 'non autorise';
  end if;
  select * into v from public.club_ventes where id = p_vente;
  if not found then
    raise exception 'vente introuvable';
  end if;
  if v.annulee_at is not null then
    return;
  end if;
  if not (v.vendeur_id = v_moi or public._club_proprio(v.club_id)) then
    raise exception 'non autorise';
  end if;
  if (v.created_at at time zone 'Europe/Paris')::date <> (now() at time zone 'Europe/Paris')::date then
    raise exception 'trop tard';
  end if;
  update public.club_ventes set annulee_at = now(), annulee_par = v_moi where id = p_vente;
end;
$$;
revoke all on function public.club_vente_annuler(uuid) from public, anon;
grant execute on function public.club_vente_annuler(uuid) to authenticated;

-- ── 3e. Le propriétaire change sa carte ─────────────────────────────────────
-- p_id null = un nouveau produit. On ne supprime jamais une ligne : on la
-- désactive (les ventes passées la citent).
create or replace function public.club_carte_enregistrer(
  p_id       uuid,
  p_rubrique text,
  p_nom      text,
  p_detail   text,
  p_prix     numeric,
  p_sorte    text,
  p_actif    boolean
)
returns uuid
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_club uuid := public.bbc_mon_club();
  v_id   uuid;
begin
  if (select auth.uid()) is null or v_club is null or not public._club_proprio(v_club) then
    raise exception 'non autorise';
  end if;
  if p_id is null then
    insert into public.club_carte (club_id, rubrique, nom, detail, prix, sorte, actif, ordre)
    values (v_club, p_rubrique, btrim(p_nom), nullif(btrim(coalesce(p_detail, '')), ''), round(p_prix, 2),
            coalesce(p_sorte, 'emporter'), coalesce(p_actif, true),
            coalesce((select max(ordre) + 10 from public.club_carte where club_id = v_club and rubrique = p_rubrique), 10))
    returning id into v_id;
  else
    update public.club_carte
       set rubrique = coalesce(p_rubrique, rubrique),
           nom = coalesce(nullif(btrim(coalesce(p_nom, '')), ''), nom),
           detail = case when p_detail is null then detail else nullif(btrim(p_detail), '') end,
           prix = coalesce(round(p_prix, 2), prix),
           sorte = coalesce(p_sorte, sorte),
           actif = coalesce(p_actif, actif),
           updated_at = now()
     where id = p_id and club_id = v_club
    returning id into v_id;
    if v_id is null then
      raise exception 'produit inconnu';
    end if;
  end if;
  return v_id;
end;
$$;
revoke all on function public.club_carte_enregistrer(uuid, text, text, text, numeric, text, boolean) from public, anon;
grant execute on function public.club_carte_enregistrer(uuid, text, text, text, numeric, text, boolean) to authenticated;

-- ── 4. La carte de départ : le tableau du comptoir du 26/09 ─────────────────
-- Prix du tableau (photo : docs/reflexion/tableau-du-club-2026-09-26.jpg).
-- Portions par contenant : catalogue de l'app + recherche du 26/09 (la note de
-- réflexion les cite). Seulement pour un club qui n'a encore aucune carte.
insert into public.club_carte (club_id, rubrique, nom, detail, prix, sorte, ref_herbalife, portions, maison, ordre)
select c.id, v.rubrique, v.nom, v.detail, v.prix, v.sorte, v.ref_herbalife, v.portions, v.maison::jsonb, v.ordre
  from public.clubs c
 cross join (values
   ('petit_dej',  'Formula 1',                    'sachet · 1 shake',            3.80, 'emporter', '4466', 21,   '{"f1": 1}',                      10),
   ('petit_dej',  'PDM',                          'sachet · 2 doses',            4.50, 'emporter', '2600', 21,   '{"pdm": 2}',                     20),
   ('petit_dej',  'Thermo',                       'sachet · 3 doses de thé',     4.10, 'emporter', '178K', 10,   '{"the": 3}',                     30),
   ('petit_dej',  'Pack 6 jours',                 'F1 + Thermo',                31.00, 'emporter', null,   null, '{"f1": 6, "the": 6}',            40),
   ('petit_dej',  'Pack 6 jours avec PDM',        'F1 + Thermo + PDM',          44.00, 'emporter', null,   null, '{"f1": 6, "the": 6, "pdm": 6}',  50),
   ('petit_dej',  'Aloé Vera',                    'flacon de 473 ml',           54.50, 'emporter', '0006', 1,    '{"aloe": 47}',                   60),
   ('supplement', 'Grand thé-aloé',               'une dose de plus de chaque',  2.60, 'upgrade',  null,   null, null,                             10),
   ('supplement', 'Collagène',                    null,                          2.80, 'upgrade',  '076K', 30,   null,                             20),
   ('supplement', 'Fibre pomme',                  '5 g',                         1.50, 'upgrade',  '2554', 30,   null,                             30),
   ('supplement', 'Fibre orange goji',            '3 g + vitamine C',            2.10, 'upgrade',  '201K', 33,   null,                             40),
   ('supplement', 'Beta',                         'cholestérol',                 1.90, 'upgrade',  '0267', 30,   null,                             50),
   ('supplement', 'F3',                           '5 g de protéines',            1.30, 'upgrade',  '0242', 40,   null,                             60),
   ('supplement', 'PDM',                          'une dose',                    1.90, 'upgrade',  '2600', 42,   null,                             70),
   ('supplement', 'Créatine+',                    null,                          1.00, 'upgrade',  '488K', 60,   null,                             80),
   ('encas',      'Barre vanille amande',         '10 g de protéines',           2.30, 'emporter', '3968', 14,   null,                             10),
   ('encas',      'Barre chocolat citron',        '10 g de protéines',           2.30, 'emporter', null,   14,   null,                             20),
   ('encas',      'Barre Achieve cookie',         '21 g de protéines',           4.60, 'emporter', '149K', 6,    null,                             30),
   ('encas',      'Barre Achieve chocolat noir',  '21 g de protéines',           4.60, 'emporter', '150K', 6,    null,                             40),
   ('encas',      'Barre F1 chocolat noir',       '13 g de protéines',           4.40, 'emporter', '4472', 7,    null,                             50),
   ('encas',      'Barre F1 cranberry',           '15 g de protéines',           4.40, 'emporter', '4473', 7,    null,                             60),
   ('encas',      'Chips barbecue',               '11 g de protéines',           2.80, 'emporter', '141K', 10,   null,                             70),
   ('encas',      'Chips crème oignons',          '12 g de protéines',           2.80, 'emporter', null,   10,   null,                             80),
   ('encas',      'Shake F1 à emporter',          '18 g de protéines',           5.50, 'emporter', null,   null, null,                             90),
   ('encas',      'Iced coffee à emporter',       '15 g de protéines',           5.30, 'emporter', '012K', 14,   null,                            100),
   ('complement', 'Microbiotic Max',              null,                          3.30, 'emporter', '173K', 20,   null,                             10),
   ('complement', 'Immune Booster',               null,                          2.50, 'emporter', '233K', 21,   null,                             20),
   ('h24',        'CR7 Drive',                    null,                          1.70, 'emporter', '1466', 20,   null,                             10),
   ('h24',        'LiftOff',                      null,                          4.00, 'emporter', '3152', 10,   null,                             20),
   ('h24',        'LiftOff Max',                  null,                          3.90, 'emporter', '192K', 10,   null,                             30),
   ('h24',        'Rebuild Strength',             null,                          5.10, 'emporter', '403K', 20,   null,                             40),
   ('h24',        'Hydrate',                      null,                          2.40, 'emporter', '1433', 20,   null,                             50),
   ('accessoire', 'Shaker oublié',                null,                          3.50, 'emporter', null,   null, null,                             10),
   ('accessoire', 'Cuillère doseuse',             null,                          2.50, 'emporter', null,   null, null,                             20),
   ('accessoire', 'Shaker couleur',               null,                         13.50, 'emporter', null,   null, null,                             30),
   ('accessoire', 'Gourde 2 L',                   null,                         19.00, 'emporter', null,   null, null,                             40)
 ) as v(rubrique, nom, detail, prix, sorte, ref_herbalife, portions, maison, ordre)
 where not exists (select 1 from public.club_carte k where k.club_id = c.id);
