-- Remaniement + Club VIP + CRM (2026-06-10) — annonces distri du merge prod.
-- Règle du livrable complet : chaque feature livrée = une annonce.
-- Pattern idempotent (insert ... where not exists) + accent/audience valides.

-- 1. Outil de prospection (page mère + sous-pages)
insert into public.app_announcements
  (title, body, emoji, accent, link_path, link_label, audience, published_at)
select
  'Ton Outil de prospection, tout au même endroit',
  'Nouvelle page mère : la méthode (commence ici), ton bilan online + ta fiche publique, tes liens marketing (docs à jour 2026) et la prospection internationale. Fini de chercher — tout est rangé, tout est expliqué.',
  '🎯', 'teal', '/outils-prospection', 'Découvrir l''outil', 'all', now()
where not exists (
  select 1 from public.app_announcements where title = 'Ton Outil de prospection, tout au même endroit'
);

-- 2. CRM commun
insert into public.app_announcements
  (title, body, emoji, accent, link_path, link_label, audience, published_at)
select
  'Nouveau : ton CRM, tous tes leads au même endroit',
  'Bilan online, Club VIP, opportunité, recos de tes clients — tout arrive dans un seul pipeline (sidebar 🎯 CRM). Glisse les cards entre colonnes, contacte avec un message pro pré-rédigé selon la source, relance en un clic.',
  '🗂', 'gold', '/crm', 'Ouvrir mon CRM', 'all', now()
where not exists (
  select 1 from public.app_announcements where title = 'Nouveau : ton CRM, tous tes leads au même endroit'
);

-- 3. Club VIP (workflow complet)
insert into public.app_announcements
  (title, body, emoji, accent, link_path, link_label, audience, published_at)
select
  'Club VIP : invite, simule, récolte les recos',
  'Nouvel onglet 👑 sur chaque fiche client (montre l''escalier des remises + envoie l''invitation pré-remplie avec ton ID sponsor), simulateur multi-mois dans la PWA de tes clients, et ta page publique /vip/ton-prénom à partager. Le mode d''emploi est dans Mon développement.',
  '👑', 'gold', '/developpement/club-vip-explique', 'Lire le mode d''emploi', 'all', now()
where not exists (
  select 1 from public.app_announcements where title = 'Club VIP : invite, simule, récolte les recos'
);

-- 4. Éducation par page + hub rangé
insert into public.app_announcements
  (title, body, emoji, accent, link_path, link_label, audience, published_at)
select
  'Chaque outil a maintenant son bouton 📖',
  'FLEX, Routine du jour, Club VIP… le bouton « Comment ça marche » est directement sur chaque page. Le hub Mon développement a été rangé par sections (quotidien / apprendre / prospecter) et la cloche 🔔 s''illumine quand il y a du nouveau. Bonus : filtre par date sur ta Liste 100.',
  '📖', 'teal', '/developpement', 'Voir le hub rangé', 'all', now()
where not exists (
  select 1 from public.app_announcements where title = 'Chaque outil a maintenant son bouton 📖'
);
