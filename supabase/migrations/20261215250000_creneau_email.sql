-- =============================================================================
-- Le mail « il te reste à choisir ton heure » — et son garde-fou.
--
-- LE CONSTAT (audit du 25/08) : 8 personnes sur 20 laissent leurs coordonnées
-- sur le site du club et ne choisissent JAMAIS de créneau. Elles ne reçoivent
-- rien. C'est la plus grosse fuite de l'entonnoir, et elle est silencieuse.
--
-- ── POURQUOI UNE COLONNE, ET PAS UN CALCUL ────────────────────────────────
-- Le mail part d'une tâche planifiée : sans trace de l'envoi, la même personne
-- le recevrait à CHAQUE passage, toutes les dix minutes, jusqu'à ce qu'elle
-- réserve. C'est le même motif anti-doublon que `reminder_email_sent_at` sur
-- `rdv_bookings`, et il est écrit une fois pour toutes.
--
-- L'index partiel ne couvre que les lignes à traiter (jamais relancées) : la
-- tâche les trouve sans balayer la table, sur une base qui tient sur une
-- petite instance.
-- =============================================================================

alter table public.prospect_leads
  add column if not exists creneau_email_sent_at timestamptz;

comment on column public.prospect_leads.creneau_email_sent_at is
  'Quand on lui a envoyé « il te reste à choisir ton heure ». NULL = jamais envoyé. Anti-doublon de la tâche club-mail-creneau-manquant (25/08).';

create index if not exists prospect_leads_creneau_email_a_faire_idx
  on public.prospect_leads (created_at)
  where creneau_email_sent_at is null;
