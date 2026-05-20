-- Chantier #13 sous-vague C (2026-05-18) — Annonce admin fiche distri unifiee.
-- Audience admin only : la refonte profite a Thomas + Melanie (gestion equipe).
begin;

insert into public.app_announcements (id, title, body, emoji, accent, link_path, link_label, audience, published_at)
select
  gen_random_uuid(),
  'Fiche distri enrichie 👥',
  'Tu peux maintenant ouvrir la fiche complete d''un distri en cliquant n''importe ou sur sa carte depuis Parametres > Equipe, /pv/team ou /flex/equipe. Tu y trouves son engagement, son apprentissage, son activite, son rang Herbalife, ses PV Bizworks mois par mois, et tu peux geler son compte si besoin. Plus rapide pour piloter ton equipe.',
  '👥',
  'gold',
  '/parametres?tab=equipe',
  'Explorer',
  'admin',
  now()
where not exists (
  select 1 from public.app_announcements where title = 'Fiche distri enrichie 👥'
);

commit;
