-- =============================================================================
-- Un cœur sait enfin QUI il a amené (07/09)
--
-- Thomas : « on veut créer la fiche d'Audrey et que ça donne direct un cœur à
-- Romane ». Impossible jusqu'ici : un cœur ne portait que `referred_name` et
-- `referred_contact`, du TEXTE LIBRE. Créer la fiche d'Audrey produisait un
-- enregistrement étranger au cœur de Romane — rien ne les reliait, et personne
-- ne pouvait dire « Romane a amené Audrey » autrement qu'en le sachant.
--
-- 1. LE LIEN RÉEL. `referred_client_id` pointe vers la fiche née du cœur. Il
--    reste NULL pour une reco simplement notée (un prénom, un numéro) : c'est
--    la différence entre « quelqu'un m'a parlé d'Audrey » et « Audrey est
--    membre ». Nullable à dessein — les 3 cœurs saisis à l'inscription d'un
--    membre n'ont, eux, pas encore de fiche.
--
-- 2. QUI VOIT LE CŒUR. La lecture était réservée au coach inscrit dans
--    `coach_id`. Or un cœur s'écrit au nom du coach qui suit la fiche du
--    PARRAIN — c'est la policy d'INSERT qui l'impose. Thomas, admin du club,
--    ne voyait donc pas les cœurs des membres de Mélanie, et l'écran « Cœurs »
--    du BBC lui montrait une partie du club en se taisant sur le reste.
--    On étend au club, exactement comme `bbc_active_cards` et
--    `bbc_visit_counts` le font déjà depuis le 17/08.
--
-- ⚠️ Ce n'est PAS un élargissement de droits : un coach ordinaire garde
-- strictement ses lignes. Seul l'admin du club voit celles de son club, et la
-- portée est bornée par `bbc_mon_club()`, jamais ouverte à toute la base.
--
-- Vérifié dans une transaction annulée, sous l'identité de Thomas : l'écriture
-- passe la policy d'INSERT avec `coach_id` = le coach de Romane, ET Thomas
-- relit bien la ligne alors qu'il n'est pas ce coach.
-- =============================================================================

alter table public.client_referrals
  add column if not exists referred_client_id uuid references public.clients(id) on delete set null;

comment on column public.client_referrals.referred_client_id is
  'La fiche NEE de ce coeur, quand elle existe. NULL pour une reco simplement notee. Posee a la creation de la fiche depuis la feuille EBE (07/09).';

create index if not exists idx_client_referrals_referred_client
  on public.client_referrals (referred_client_id)
  where referred_client_id is not null;

-- ── Qui peut LIRE un cœur ───────────────────────────────────────────────────
drop policy if exists referral_coach_read on public.client_referrals;
create policy referral_coach_read on public.client_referrals
  for select
  using (
    (select auth.uid())::text = coach_id
    or exists (
      select 1
        from public.clients cl
        join public.users u on u.id = (select auth.uid())
       where cl.id::text = client_referrals.from_client_id
         and u.role = 'admin'
         and cl.club_id is not null
         and cl.club_id = public.bbc_mon_club()
    )
  );

-- ── Et qui peut le QUALIFIER (démarré / perdu) ──────────────────────────────
drop policy if exists referral_coach_update on public.client_referrals;
create policy referral_coach_update on public.client_referrals
  for update
  using (
    (select auth.uid())::text = coach_id
    or exists (
      select 1
        from public.clients cl
        join public.users u on u.id = (select auth.uid())
       where cl.id::text = client_referrals.from_client_id
         and u.role = 'admin'
         and cl.club_id is not null
         and cl.club_id = public.bbc_mon_club()
    )
  );
