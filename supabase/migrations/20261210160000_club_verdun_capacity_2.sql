-- =============================================================================
-- Capacité par créneau : 3 → 2 (Thomas, 2026-08-09)
--
-- « Pour l'instant il n'y a que Tom et moi pour faire des bilans. » Un créneau
-- ne peut donc pas accueillir plus de 2 rendez-vous en parallèle.
--
-- ⚠️ RAPPEL DU MODÈLE — vérifié en base avant d'écrire, à ne pas « corriger » :
-- la capacité se compte en RÉSERVATIONS, jamais en personnes.
-- `book_club_discovery` et `get_club_discovery_availability` font tous deux un
-- count(*) sur les lignes de rdv_bookings, pas un sum(people_count). Une
-- personne qui vient À DEUX occupe donc 1 SEULE place — c'est bien le souhait
-- de Thomas, et c'est déjà ce que le code faisait. Sommer people_count
-- casserait la règle.
--
-- jsonb_set plutôt qu'un remplacement de l'objet : hours, holidays,
-- slot_step_min, duration_min et opening_date sont préservés.
-- Vérifié après application : capacité 2, pas 60 min, durée 45 min, 15 jours
-- fermés, horaires intacts ; l'affichage annonce bien « 2 places » par créneau.
-- =============================================================================

update public.clubs
   set settings = jsonb_set(settings, '{discovery,capacity}', '2'::jsonb, true)
 where slug = 'verdun';
