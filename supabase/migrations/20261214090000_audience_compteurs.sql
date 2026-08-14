-- =============================================================================
-- Audience du site — DES COMPTEURS, PAS UN JOURNAL.
--
-- ⚠️ LIRE AVANT DE « SIMPLIFIER » CE SCHÉMA.
--
-- La prod tourne sur une t4g.nano : 0,5 Go de RAM, 224 Mo de shared_buffers,
-- 60 connexions. Elle est déjà tombée 2 h 45 le 2026-07-29 parce que trop de
-- travail concurrent l'a fait basculer en swap. Un tracker d'audience normal
-- écrit UNE LIGNE PAR PAGE VUE — c'est exactement la charge qui la retuerait,
-- et une table qu'il faudrait purger éternellement.
--
-- Ici, une ligne par (jour × type × clé × coach), incrémentée. Le volume ne
-- dépend PAS du trafic : il dépend du nombre de pages. Quelques centaines de
-- lignes par jour au pire, et aucune purge à prévoir.
--
-- Corollaire : on ne pourra jamais rejouer une session ni calculer une
-- médiane — on ne garde aucune trace individuelle. C'est le prix, il est
-- assumé, et c'est aussi ce qui rend la mesure anonyme par construction.
-- =============================================================================

-- ── 1. Pages vues et clics ──────────────────────────────────────────────────
create table if not exists public.audience_daily (
  jour             date        not null,
  -- 'page' = une vue ; 'clic' = un bouton nommé.
  type             text        not null check (type in ('page', 'clic')),
  -- Chemin NORMALISÉ (/bilan-online/:coach/formulaire) ou nom du bouton.
  -- Jamais une URL brute : sinon chaque visiteur d'un coach crée sa ligne.
  cle              text        not null check (length(cle) between 1 and 120),
  -- Le coach dont le lien a été utilisé. NULL = lien public générique.
  coach_user_id    uuid        references public.users(id) on delete set null,
  vues             integer     not null default 0,
  -- Sessions distinctes : le navigateur ne l'annonce qu'à sa 1re vue.
  visites          integer     not null default 0,
  -- Dernière page vue de la session = la page depuis laquelle on part.
  sorties          integer     not null default 0,
  -- Somme des durées, chacune DÉJÀ plafonnée à 10 min côté serveur, et le
  -- nombre de mesures : la moyenne se calcule à la lecture.
  duree_ms         bigint      not null default 0,
  duree_n          integer     not null default 0,
  maj_at           timestamptz not null default now()
);

-- `nulls not distinct` (PG15+, on est en 17) : sans ça, deux lignes de lien
-- public générique (coach NULL) ne rentreraient jamais en conflit et se
-- dupliqueraient à l'infini.
create unique index if not exists audience_daily_uniq
  on public.audience_daily (jour, type, cle, coach_user_id) nulls not distinct;

-- La page lit toujours « du plus récent au plus vu », sur une fenêtre de date.
create index if not exists audience_daily_jour
  on public.audience_daily (jour desc, type);

-- ── 2. Étapes de tunnel — le « où ça décroche » ─────────────────────────────
create table if not exists public.audience_funnel_daily (
  jour           date        not null,
  tunnel         text        not null check (length(tunnel) between 1 and 60),
  etape          text        not null check (length(etape) between 1 and 60),
  -- Le rang fige l'ordre d'affichage : une étape ajoutée plus tard ne doit pas
  -- réordonner l'historique.
  rang           smallint    not null,
  coach_user_id  uuid        references public.users(id) on delete set null,
  n              integer     not null default 0,
  maj_at         timestamptz not null default now()
);

create unique index if not exists audience_funnel_daily_uniq
  on public.audience_funnel_daily (jour, tunnel, etape, coach_user_id) nulls not distinct;

create index if not exists audience_funnel_daily_jour
  on public.audience_funnel_daily (jour desc, tunnel, rang);

-- ── 3. L'incrément, en UN aller-retour ──────────────────────────────────────
--
-- L'edge envoie tout le paquet d'une session en un seul appel. Sur une nano,
-- le coût dominant n'est pas l'écriture mais le nombre de requêtes et de
-- connexions : 1 appel pour 12 événements, pas 12 appels.
create or replace function public.audience_bump(p_events jsonb)
returns integer
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_n integer := 0;
begin
  if p_events is null or jsonb_typeof(p_events) <> 'array' then
    return 0;
  end if;
  -- Garde-fou volume : un appel ne peut pas écrire des milliers de lignes.
  if jsonb_array_length(p_events) > 60 then
    raise exception 'audience_bump: paquet trop gros (%)', jsonb_array_length(p_events);
  end if;

  with e as (
    select * from jsonb_to_recordset(p_events) as x(
      type text, cle text, coach_user_id uuid,
      vues int, visites int, sorties int, duree_ms bigint, duree_n int,
      tunnel text, etape text, rang smallint, n int
    )
  ),
  pages as (
    insert into public.audience_daily
      (jour, type, cle, coach_user_id, vues, visites, sorties, duree_ms, duree_n)
    select current_date, e.type, e.cle, e.coach_user_id,
           coalesce(e.vues,0), coalesce(e.visites,0), coalesce(e.sorties,0),
           -- Plafond 10 min PAR VUE, appliqué ici : c'est le serveur qui
           -- décide, jamais le navigateur (qui peut mentir).
           least(coalesce(e.duree_ms,0), 600000 * greatest(coalesce(e.duree_n,0),1)),
           coalesce(e.duree_n,0)
      from e where e.type in ('page','clic') and e.cle is not null
    on conflict (jour, type, cle, coach_user_id) do update set
      vues     = public.audience_daily.vues     + excluded.vues,
      visites  = public.audience_daily.visites  + excluded.visites,
      sorties  = public.audience_daily.sorties  + excluded.sorties,
      duree_ms = public.audience_daily.duree_ms + excluded.duree_ms,
      duree_n  = public.audience_daily.duree_n  + excluded.duree_n,
      maj_at   = now()
    returning 1
  ),
  etapes as (
    insert into public.audience_funnel_daily (jour, tunnel, etape, rang, coach_user_id, n)
    select current_date, e.tunnel, e.etape, coalesce(e.rang,0), e.coach_user_id, coalesce(e.n,1)
      from e where e.type is null and e.tunnel is not null and e.etape is not null
    on conflict (jour, tunnel, etape, coach_user_id) do update set
      n      = public.audience_funnel_daily.n + excluded.n,
      maj_at = now()
    returning 1
  )
  select (select count(*) from pages) + (select count(*) from etapes) into v_n;

  return v_n;
end;
$$;

-- ── 4. Sécurité (règles de l'audit du 2026-07-29) ───────────────────────────
alter table public.audience_daily        enable row level security;
alter table public.audience_funnel_daily enable row level security;

-- `anon` n'a AUCUN accès : le site public écrit via l'edge en service_role,
-- jamais en direct. Une table créée sans ça est lisible par tout Internet.
revoke all on public.audience_daily        from anon, authenticated;
revoke all on public.audience_funnel_daily from anon, authenticated;
grant select on public.audience_daily        to authenticated;
grant select on public.audience_funnel_daily to authenticated;

-- Ces compteurs disent combien de monde chaque coach attire : entre distris,
-- c'est de la performance commerciale. Chacun voit SES liens plus le trafic
-- des liens génériques ; l'admin voit tout.
create policy audience_daily_read on public.audience_daily
  for select to authenticated
  using (public.is_admin() or coach_user_id is null or coach_user_id = (select auth.uid()));

create policy audience_funnel_read on public.audience_funnel_daily
  for select to authenticated
  using (public.is_admin() or coach_user_id is null or coach_user_id = (select auth.uid()));

-- La RPC n'est appelable que par l'edge (service_role). L'ouvrir à anon
-- laisserait n'importe qui gonfler les chiffres depuis l'extérieur.
revoke all on function public.audience_bump(jsonb) from public, anon, authenticated;

comment on table public.audience_daily is
  'Compteurs d''audience agrégés par jour. JAMAIS une ligne par visite — cf. incident t4g.nano 2026-07-29.';
comment on table public.audience_funnel_daily is
  'Compteurs par étape de tunnel : la base du « où ça décroche ».';
