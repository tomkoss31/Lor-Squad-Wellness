-- =============================================================================
-- Fix link_path des annonces Formation (2026-05-04)
--
-- La migration précédente (20261105120000) a posé link_path =
-- '/formation/demarrer/<slug>' alors que le vrai pattern routing est
-- '/formation/parcours/<levelSlug>/<moduleSlug>'. Résultat : popups
-- redirigeaient vers une page inexistante.
--
-- Cette migration corrige les 2 entrées concernées de manière idempotente.
-- =============================================================================

begin;

update public.app_announcements
set link_path = '/formation/parcours/demarrer/methode-frank-liste-100'
where title = 'Formation : Méthode FRANK & ma Liste 100'
  and link_path = '/formation/demarrer/methode-frank-liste-100';

update public.app_announcements
set link_path = '/formation/parcours/demarrer/trame-ebe-6-etapes'
where title = 'Formation : la trame EBE en 6 étapes'
  and link_path = '/formation/demarrer/trame-ebe-6-etapes';

-- L'annonce "Academy : nouvelle section..." pointait vers une seule
-- section mais on a depuis splitté en 4 sections. On la met à jour
-- pour pointer vers la première (la vue d'ensemble) qui mène ensuite
-- aux 3 autres sections (Cahier, Simulateur, Liste 100→Agenda).
update public.app_announcements
set body = 'On a ajouté 4 nouvelles sections à ton Academy : (1) vue d''ensemble des outils livrés en mai, (2) Cahier de bord, (3) Simulateur EBE, (4) connexion Liste 100 → Agenda. Chaque section : intro + quiz court ciblé. Total 20 minutes.',
    link_label = 'Démarrer la vue d''ensemble'
where title = 'Academy : nouvelle section "Tes nouveaux outils"';

commit;
