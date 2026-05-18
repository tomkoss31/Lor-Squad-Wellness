-- Chantier #11 Sprint 2 (2026-05-18) — Annonce distri temoignages.
begin;

insert into public.app_announcements (id, title, body, emoji, accent, link_path, link_label, audience, published_at)
select
  gen_random_uuid(),
  'Temoignages clients automatises 💬',
  'Tes clients peuvent maintenant t''envoyer un retour en 30 secondes via /temoignage/<token>. Tu modere depuis /admin/testimonials (admin only) puis ils s''affichent automatiquement sur la Welcome bilan online en carousel auto-rotation. Cron J+60 te ping pour relancer les clients dormants. Partage les liens sur ton WhatsApp client pour amorcer les premiers avis !',
  '💬',
  'gold',
  '/admin/testimonials',
  'Moderer',
  'admin',
  now()
where not exists (
  select 1 from public.app_announcements where title = 'Temoignages clients automatises 💬'
);

commit;
