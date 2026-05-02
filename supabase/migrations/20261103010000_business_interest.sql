-- =============================================================================
-- Pop-up business bilan (2026-11-03)
--
-- Ajoute 4 colonnes a clients pour capturer l interet du client pour
-- un complement de revenu via Herbalife. Strategie 2-temps :
--   1. Question legere etape 1 du bilan (sous Profession) :
--      "Au-dela de ton job, t arrive-t-il de penser a un complement de
--      revenu ?" -> 3 radios stockees dans business_curiosity
--      (never / sometimes / often).
--   2. Si reponse != 'never' -> nouvelle etape 'business-ambition'
--      affichee entre 'concept' et 'program' qui propose 6 montants
--      (skip / +100 / +300 / +500 / +1000 / +plus) -> stocke dans
--      business_interest_amount + business_interest_date + (optionnel)
--      business_interest_note (champ libre si "Plus").
--
-- Co-pilote affiche une BusinessOpportunitiesCard si >=1 client a
-- coche un montant > 0.
--
-- RLS : herite des policies clients existantes (distributor + admin
-- via lignee).
-- =============================================================================

begin;

-- Curiosite initiale (etape 1 du bilan)
alter table public.clients
  add column if not exists business_curiosity text
    check (business_curiosity is null or business_curiosity in ('never', 'sometimes', 'often'));

comment on column public.clients.business_curiosity is
  'Reponse a la question legere etape 1 du bilan : interet pour un complement de revenu. NULL = pas demande / pas de bilan. never / sometimes / often.';

-- Montant d ambition (etape business-ambition)
-- 0 = "Pas pour moi" explicite. NULL = pas atteint cette etape.
alter table public.clients
  add column if not exists business_interest_amount integer
    check (business_interest_amount is null or business_interest_amount >= 0);

comment on column public.clients.business_interest_amount is
  'Montant mensuel souhaite en €/mois (0 = decline, 100 / 300 / 500 / 1000, ou autre via business_interest_note pour "Plus"). NULL = pas atteint cette etape.';

alter table public.clients
  add column if not exists business_interest_date timestamptz;

comment on column public.clients.business_interest_date is
  'Date de capture de business_interest_amount (utile pour relances).';

alter table public.clients
  add column if not exists business_interest_note text;

comment on column public.clients.business_interest_note is
  'Champ libre si le client choisit "Plus" (precision sur l ambition). Optionnel.';

-- Index pour le filtre Co-pilote "Clients ouverts au business"
create index if not exists idx_clients_business_interest_amount
  on public.clients(business_interest_amount desc)
  where business_interest_amount is not null and business_interest_amount > 0;

commit;
