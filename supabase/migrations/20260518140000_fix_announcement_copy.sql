-- =============================================================================
-- Fix copy announcements (2026-05-18) — distri-friendly
-- =============================================================================
-- Retour Thomas : les 2 announcements precedents (chantier A + chantier #11)
-- contenaient du jargon technique (paths URL /temoignage/<token>, "admin only",
-- "Cron J+60", "WhatsApp client", "gradients teal-violet-coral", "Sora + Inter").
-- Refonte en texte simple/clair/concis pour les distri, avec accents.
-- =============================================================================

begin;

-- Temoignages clients automatises -> "Tes temoignages clients"
update public.app_announcements
set
  title = 'Tes témoignages clients 💬',
  body = 'Tes clients peuvent maintenant t''envoyer un retour en 30 secondes. Tu valides ce que tu veux afficher, et leurs avis remontent automatiquement sur ta page bilan pour rassurer les prochains prospects.'
where title = 'Temoignages clients automatises 💬';

-- Pages publiques V2 dark -> "Page bilan refaite a neuf"
update public.app_announcements
set
  title = 'Page bilan refaite à neuf 🌙',
  body = 'Tes liens de bilan en ligne sont les mêmes, juste en plus beaux. Style sombre premium, et tes prospects peuvent basculer en mode clair s''ils préfèrent.'
where title = 'Pages publiques V2 dark 🌙';

commit;
