-- =============================================================================
-- « À conclure » — la MOITIÉ de la contrainte manquait (31/08/2026)
--
-- La migration 20261215260000 a élargi le vocabulaire des réponses avec
-- `pas_venue` et `venue_pas_demarre`… mais UNIQUEMENT sur `prospect_leads`.
-- La table jumelle `online_bilans` porte sa propre contrainte CHECK, posée par
-- 20261213090000, et elle est restée aux six valeurs d'origine.
--
-- CE QUE ÇA CASSAIT, vérifié en base le 31/08 (revue avant mise en prod) :
-- pour quelqu'un arrivé par le bilan en ligne, « Pas venue » marquait bien le
-- rendez-vous en `no_show` — puis l'écriture de la relance était REJETÉE par
-- Postgres. La personne quittait « À conclure » (le rendez-vous étant soldé)
-- sans jamais revenir dans aucune file. Exactement le trou que ce chantier
-- devait boucher, recréé sur l'autre moitié des leads.
--
-- ⚠️ LA LEÇON : quand deux tables portent le MÊME vocabulaire, elles portent
-- aussi deux contraintes. En élargir une seule crée un CRM qui marche pour
-- une source et casse pour l'autre — en silence côté écran, car l'échec ne se
-- voit que dans un toast.
--
-- Sans risque : on élargit, aucune ligne existante ne devient invalide.
-- =============================================================================

do $$
begin
  if exists (
    select 1 from pg_constraint
    where conname = 'online_bilans_derniere_reponse_check'
  ) then
    alter table public.online_bilans
      drop constraint online_bilans_derniere_reponse_check;
  end if;

  alter table public.online_bilans
    add constraint online_bilans_derniere_reponse_check
    check (derniere_reponse is null or derniere_reponse in (
      'pas_de_reponse',
      'rappellera',
      'ne_sait_pas',
      'pas_maintenant',
      'plus_interesse',
      'rdv',
      'pas_venue',
      'venue_pas_demarre'
    ));
end $$;
