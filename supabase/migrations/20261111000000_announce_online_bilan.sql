-- Chantier #1 Bilan Online — étape 1.10 (2026-05-17).
-- Annonce distri du nouveau funnel bilan online + onglet Leads.
begin;

insert into public.app_announcements (id, title, body, emoji, accent, link_path, link_label, audience, published_at)
select
  gen_random_uuid(),
  'Ton lien bilan online perso 🌱',
  'Nouvelle entrée publique : partage le lien /bilan-online/<ton-prénom> sur Insta, WhatsApp, partout. Tes prospects remplissent un bilan en 2 min, tu reçois une push, tu retrouves le Lead dans /clients onglet "🌱 Leads" avec kanban + templates de réponse multi-canal + relance auto J+3.',
  '🌱',
  'gold',
  '/clients?tab=leads',
  'Voir mes Leads',
  'all',
  now()
where not exists (
  select 1 from public.app_announcements where title = 'Ton lien bilan online perso 🌱'
);

commit;
