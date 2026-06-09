-- Chantier #13-B (2026-06-08) — Annonce distri : fiche coach publique partageable.
-- Pattern idempotent (insert ... where not exists) + accent/audience valides.

insert into public.app_announcements
  (title, body, emoji, accent, link_path, link_label, audience, published_at)
select
  'Ta fiche coach publique est là',
  'Tu as maintenant une vitrine partageable : /coach/ton-prénom. Mets le lien en bio Insta ou en story — un prospect choisit bilan gratuit ou rejoindre ton équipe. Récupère ton lien dans Paramètres > Profil (pense à remplir ta photo + bio pour un rendu pro).',
  '🔗', 'teal', '/parametres?tab=profil', 'Récupérer mon lien', 'all', now()
where not exists (
  select 1 from public.app_announcements where title = 'Ta fiche coach publique est là'
);
