-- =============================================================================
-- La boîte d'arrivée du CRM — rien n'entre dans l'entonnoir sans un geste.
--
-- Lot 2 du chantier CRM Board V2 (maquette Claude Design du 20/08).
--
-- LE CONSTAT : les leads des 11 points d'entrée tombent aujourd'hui DIRECTEMENT
-- dans les colonnes du pipeline, mélangés à des RDV à confirmer, des doublons
-- et des bilans à peine commencés. L'entonnoir ne dit donc plus qui en est où.
--
-- ── POURQUOI UNE TABLE À PART, ET PAS UNE COLONNE PAR TABLE SOURCE ────────
-- Le CRM agrège QUATRE tables : `prospect_leads`, `online_bilans`,
-- `client_referrals` et `rdv_bookings`. Ajouter `accepted_at` à chacune, ce
-- serait quatre migrations, quatre `select` à modifier, et la garantie qu'une
-- cinquième source arrive un jour sans la colonne.
--
-- On reprend donc EXACTEMENT le motif de `crm_archived_leads`, déjà en place
-- et éprouvé : une table de marquage (`lead_table`, `lead_id`), indépendante
-- des tables métier. Rien n'est modifié côté source, et une nouvelle source
-- s'y branche sans migration.
--
-- ── LE RATTRAPAGE, QUI N'EST PAS UN DÉTAIL ────────────────────────────────
-- Sans lui, la boîte d'arrivée s'ouvrirait avec les 27 leads existants dedans
-- et l'entonnoir se viderait d'un coup — l'inverse du but. Tout ce qui existe
-- au moment de la migration est donc déclaré DÉJÀ ACCEPTÉ, daté de sa propre
-- création. Seules les arrivées postérieures passeront par la boîte.
--
-- `accepted_by` reste nullable : le rattrapage n'a pas d'auteur, et prétendre
-- le contraire attribuerait à quelqu'un des gestes qu'il n'a pas faits.
-- =============================================================================

create table if not exists public.crm_lead_acceptations (
  lead_table  text        not null,
  lead_id     uuid        not null,
  accepted_at timestamptz not null default now(),
  accepted_by uuid        null references public.users(id) on delete set null,
  primary key (lead_table, lead_id)
);

comment on table public.crm_lead_acceptations is
  'Marque un lead comme ENTRÉ dans l''entonnoir. Absent = il attend encore dans la boîte d''arrivée. Jumelle de crm_archived_leads : même motif (lead_table, lead_id), aucune colonne ajoutée aux 4 tables sources du CRM.';

alter table public.crm_lead_acceptations enable row level security;

-- Même portée que sa jumelle : le CRM est un outil de coach, tout compte
-- connecté le manipule. Le cloisonnement par propriétaire se fait à l'affichage
-- (`isInScope`), pas ici — c'est déjà le choix fait pour crm_archived_leads.
-- `drop ... if exists` d'abord : Postgres n'a pas de `create policy if not
-- exists`, et cette migration a déjà été appliquée sur la base partagée (elle
-- portait un numéro en collision avec `20261215200000_dispos_lead`, renumérotée
-- au moment de la release). Sans ça, la rejouer casserait sur « policy already
-- exists ».
drop policy if exists crm_lead_acceptations_auth_manage on public.crm_lead_acceptations;
create policy crm_lead_acceptations_auth_manage
  on public.crm_lead_acceptations for all to authenticated
  using ((select auth.uid()) is not null)
  with check ((select auth.uid()) is not null);

revoke all on public.crm_lead_acceptations from anon;

-- Lu à chaque ouverture du CRM, pour soustraire les acceptés de la boîte.
create index if not exists crm_lead_acceptations_at_idx
  on public.crm_lead_acceptations (accepted_at desc);

-- ── Rattrapage : l'existant est déjà dans l'entonnoir ──────────────────────
insert into public.crm_lead_acceptations (lead_table, lead_id, accepted_at, accepted_by)
select 'prospect_leads', id, coalesce(created_at, now()), null::uuid from public.prospect_leads
union all
select 'online_bilans', id, coalesce(created_at, now()), null::uuid from public.online_bilans
union all
select 'client_referrals', id, coalesce(created_at, now()), null::uuid from public.client_referrals
union all
select 'rdv_bookings', id, coalesce(created_at, now()), null::uuid from public.rdv_bookings
on conflict (lead_table, lead_id) do nothing;
