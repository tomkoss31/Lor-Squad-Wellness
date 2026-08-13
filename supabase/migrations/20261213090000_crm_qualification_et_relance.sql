-- =============================================================================
-- Qualifier quelqu'un, c'est dire QUAND il revient — 13/08/2026
--
-- Thomas : « on contacte, ça répond pas, comment on l'indique que c'est
-- contacté et à rappeler avec rappel sur co-pilote à 24 H ? et la qualif de
-- répondu mais ne sais pas, ou me rappelle, ou n'est plus intéressé, à
-- relancer plus tard ? »
--
-- ── LE CONSTAT ──────────────────────────────────────────────────────────────
--
-- Le CRM propose cinq cases (Nouveaux / Contactés / Qualifiés-RDV / Convertis
-- / Perdus) et AUCUNE notion de temps. Quand Thomas appelle Laure et que ça ne
-- répond pas, il la passe en « Contactés »… et elle SORT DE TOUS LES RADARS :
-- le cron de relance ne regarde que les `new`, et la file du Co-pilote aussi.
-- Il vient de faire disparaître quelqu'un qu'il voulait rappeler demain.
--
-- ── L'ASYMÉTRIE QUE LA BASE RÉVÈLE ──────────────────────────────────────────
--
-- `online_bilans` possède DÉJÀ `relance_due_at` + `relance_done_at`, et deux
-- statuts de plus (`to_recontact`, `relance`) — que le menu du CRM ne propose
-- même pas (`statusOptionsFor()` n'en renvoie que quatre). La moitié de la
-- mécanique existait, inutilisée, sur une seule des deux tables.
--
-- `prospect_leads` — les leads du site du club, ceux qui arrivent tous les
-- jours — n'a rien du tout.
--
-- ── CE QUE FAIT CETTE MIGRATION ─────────────────────────────────────────────
--
-- 1. `prospect_leads` reçoit les deux colonnes de relance, nommées EXACTEMENT
--    comme celles d'`online_bilans` : le code qui lit les deux tables ne doit
--    pas avoir à connaître deux vocabulaires.
-- 2. Les DEUX tables reçoivent `derniere_reponse` : le statut dit où en est la
--    personne (grossier, existant, deux vocabulaires différents) ; la dernière
--    réponse dit CE QUI S'EST PASSÉ au dernier contact, et c'est elle qui
--    choisit le message de 2e tentative.
--
-- Tout est NULLABLE et additif : aucune ligne existante n'est touchée, aucun
-- code existant ne casse.
-- =============================================================================

begin;

-- ─── 1. La relance sur prospect_leads ───────────────────────────────────────
alter table public.prospect_leads
  add column if not exists relance_due_at  timestamptz,
  add column if not exists relance_done_at timestamptz;

comment on column public.prospect_leads.relance_due_at is
  'Quand cette personne doit remonter dans la file du Co-pilote. Posé par la '
  'qualification (« pas de réponse » → +24 h, etc.), jamais saisi à la main.';
comment on column public.prospect_leads.relance_done_at is
  'Relance effectuée : la ligne sort de la file jusqu''à la prochaine échéance.';

-- Les relances dues sont lues à chaque ouverture du Co-pilote : sans index,
-- c''est un scan de toute la table à chaque fois.
create index if not exists prospect_leads_relance_due_idx
  on public.prospect_leads (relance_due_at)
  where relance_due_at is not null and relance_done_at is null;

create index if not exists online_bilans_relance_due_idx
  on public.online_bilans (relance_due_at)
  where relance_due_at is not null and relance_done_at is null;

-- ─── 2. « Ce qui s'est passé » — sur les deux tables ────────────────────────
--
-- Six valeurs, exactement celles de la maquette validée. Elles ne remplacent
-- PAS le statut : elles le complètent. `status` reste ce qu'il était (les deux
-- tables ont des vocabulaires différents et on ne les fusionne pas ici) ;
-- `derniere_reponse` est commune, et c'est elle qui pilote l'écran.
alter table public.prospect_leads
  add column if not exists derniere_reponse text;
alter table public.online_bilans
  add column if not exists derniere_reponse text;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'prospect_leads_derniere_reponse_check'
  ) then
    alter table public.prospect_leads
      add constraint prospect_leads_derniere_reponse_check
      check (derniere_reponse is null or derniere_reponse in (
        'pas_de_reponse',   -- +24 h
        'rappellera',       -- +3 j  (filet de sécurité)
        'ne_sait_pas',      -- +7 j
        'pas_maintenant',   -- +1 mois
        'plus_interesse',   -- sort de la file
        'rdv'               -- quitte le CRM, rejoint l'agenda
      ));
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'online_bilans_derniere_reponse_check'
  ) then
    alter table public.online_bilans
      add constraint online_bilans_derniere_reponse_check
      check (derniere_reponse is null or derniere_reponse in (
        'pas_de_reponse', 'rappellera', 'ne_sait_pas',
        'pas_maintenant', 'plus_interesse', 'rdv'
      ));
  end if;
end $$;

comment on column public.prospect_leads.derniere_reponse is
  'Ce qui s''est passé au dernier contact. Pilote le libellé affiché ET le '
  'message de 2e tentative. Le statut dit OÙ on en est, ceci dit CE QUI S''EST PASSÉ.';
comment on column public.online_bilans.derniere_reponse is
  'Idem prospect_leads — volontairement le même nom sur les deux tables.';

-- ─── 3. Ouvrir le statut de prospect_leads ──────────────────────────────────
--
-- « à recontacter » manquait : sans lui, un lead qu'on rappelle demain devait
-- être rangé dans « Contactés », c''est-à-dire nulle part. `online_bilans`
-- avait déjà `to_recontact` ; on aligne.
alter table public.prospect_leads
  drop constraint if exists prospect_leads_status_check;

alter table public.prospect_leads
  add constraint prospect_leads_status_check
  check (status in ('new', 'contacted', 'to_recontact', 'converted', 'lost'));

commit;
