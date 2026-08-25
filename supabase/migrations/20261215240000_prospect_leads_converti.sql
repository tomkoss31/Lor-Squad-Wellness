-- =============================================================================
-- « Converti » doit être un LIEN, pas un mot.
--
-- LE CONSTAT (audit du 25/08). `online_bilans` porte `converted_to_client_id`
-- et `converted_at` ; `prospect_leads` — la table de TOUT ce qui arrive par le
-- site du club, le funnel colis, /welcome, /rejoindre — n'avait NI l'un NI
-- l'autre. Conséquences mesurées :
--
--   · 30 prospect_leads, UN SEUL marqué « converted » — et aucune fiche
--     cliente ne lui correspond, ni par email ni par téléphone.
--   · pour 137 clients en base, le CRM n'en connaît que 3.
--   · le taux de conversion affiché compte donc des ÉTIQUETTES, pas des
--     fiches. On ne peut aller ni du lead vers son client, ni l'inverse.
--
-- ── POURQUOI PAS UNE CLÉ ÉTRANGÈRE STRICTE ────────────────────────────────
-- `on delete set null` : supprimer une fiche cliente ne doit pas emporter le
-- lead avec elle. On garde d'où la personne venait et ce qui l'a fait venir —
-- c'est ce qui alimente l'attribution par source. Effacer le lead reviendrait
-- à ne plus jamais savoir ce qui fonctionne (même raison qu'au 19/08, quand on
-- a choisi « converted » plutôt qu'une suppression).
--
-- Aucune donnée existante n'est touchée : les deux colonnes naissent à NULL.
-- =============================================================================

alter table public.prospect_leads
  add column if not exists converted_to_client_id uuid
    references public.clients(id) on delete set null,
  add column if not exists converted_at timestamptz;

comment on column public.prospect_leads.converted_to_client_id is
  'La fiche cliente née de ce lead. NULL = pas encore convertie. Ajoutée le 25/08 : « converti » n''était qu''un statut, sans aucun moyen de retrouver le client.';

comment on column public.prospect_leads.converted_at is
  'Quand la fiche cliente a été créée. timestamptz — jamais timestamp (règle CLAUDE.md).';

-- Retrouver les leads d'un client, et l'inverse, sans balayer la table.
create index if not exists prospect_leads_converted_client_idx
  on public.prospect_leads (converted_to_client_id)
  where converted_to_client_id is not null;
