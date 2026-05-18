-- Chantier A (2026-05-18) — Refonte pages publiques V2 dark.
-- Annonce distri de la refonte visuelle (bilan online welcome + form + merci)
-- avec tokens partages + toggle dark/light cote utilisateur.
begin;

insert into public.app_announcements (id, title, body, emoji, accent, link_path, link_label, audience, published_at)
select
  gen_random_uuid(),
  'Pages publiques V2 dark 🌙',
  'Refonte visuelle complete des pages /bilan-online (welcome, form 5 etapes, merci) : style dark premium aligne sur le logo La Base 360, gradients teal-violet-coral, Sora + Inter, toggle dark/light cote utilisateur (preference sauvegardee). Tes liens existants /bilan-online/<ton-prenom> fonctionnent toujours, juste plus beaux. Recette + partage WhatsApp.',
  '🌙',
  'gold',
  '/bilan-online',
  'Voir la nouvelle Welcome',
  'all',
  now()
where not exists (
  select 1 from public.app_announcements where title = 'Pages publiques V2 dark 🌙'
);

commit;
