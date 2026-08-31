-- =============================================================================
-- « À conclure » — le maillon manquant du cycle de vie d'un lead (28/08/2026)
--
-- LE TROU, mesuré en base ce jour : 5 rendez-vous étaient « confirmed » alors
-- que leur créneau était PASSÉ, plus 2 demandes jamais acceptées dont la date
-- était passée aussi. Sur 31 rendez-vous, UN SEUL portait `honored`. Personne
-- ne les avait soldés parce que l'app ne pose jamais la question.
--
-- Un rendez-vous passé doit produire une réponse : venue, venue sans démarrer,
-- ou pas venue. Les deux dernières renvoient la personne dans la file, avec une
-- échéance. Ces deux faits n'existaient pas dans le vocabulaire des réponses.
--
-- ⚠️ POURQUOI NE PAS RÉUTILISER `pas_de_reponse` POUR UN LAPIN :
-- son libellé est « Appelé·e, pas de réponse ». L'écrire sur la fiche de
-- quelqu'un qui a manqué un rendez-vous serait FAUX, et cette phrase se
-- retrouve telle quelle sur la carte du CRM et dans les relances. On préfère
-- deux clés honnêtes à une clé réutilisée qui ment.
--
-- Délais validés par Thomas le 28/08 : pas venue → J+2, venue mais pas
-- démarré → J+7.
--
-- Sans risque : on ÉLARGIT une contrainte CHECK (aucune ligne existante ne
-- devient invalide) et on ne touche à aucune donnée.
-- =============================================================================

do $$
begin
  if exists (
    select 1 from pg_constraint
    where conname = 'prospect_leads_derniere_reponse_check'
  ) then
    alter table public.prospect_leads
      drop constraint prospect_leads_derniere_reponse_check;
  end if;

  alter table public.prospect_leads
    add constraint prospect_leads_derniere_reponse_check
    check (derniere_reponse is null or derniere_reponse in (
      'pas_de_reponse',      -- +24 h
      'rappellera',          -- +3 j   (filet de sécurité)
      'ne_sait_pas',         -- +7 j
      'pas_maintenant',      -- +1 mois
      'plus_interesse',      -- sort de la file
      'rdv',                 -- quitte le CRM, rejoint l'agenda
      -- ── ajoutés le 28/08/2026 (étape « À conclure ») ──────────────────────
      'pas_venue',           -- +2 j  : a manqué son rendez-vous
      'venue_pas_demarre'    -- +7 j  : est venue, n'a pas démarré
    ));
end $$;

comment on column public.prospect_leads.derniere_reponse is
  'Dernière réponse obtenue. Vocabulaire fermé (CHECK). pas_venue et '
  'venue_pas_demarre viennent de l''étape « À conclure » : un rendez-vous '
  'passé doit être soldé, et les deux issues qui renvoient dans la file '
  'portent des délais différents (J+2 et J+7).';
