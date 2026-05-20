-- =============================================================================
-- Annonce : Check-list quotidienne Co-pilote (chantier #2, 2026-05-20)
--
-- Pop-up matinal auto avec 5 actions de discipline (suivis F1/F21, Leads,
-- dormants, RDV, liste 100). Skippable, persistance DB, relance push 20h.
--
-- Spec validée Thomas (brainstorm Égypte 2026-05, Q7/Q8).
-- =============================================================================

begin;

insert into public.app_announcements
  (id, title, body, emoji, accent, link_path, link_label, audience, published_at)
select
  gen_random_uuid(),
  '5 actions par jour, jamais plus ☀️',
  'Ton Co-pilote affiche désormais une check-list matinale avec 5 actions à fort impact : suivis F1/F21 dus, Leads bilan online, clients dormants, RDV du jour, contacts de ta liste 100. 5 minutes le matin, score X/5, skippable et jamais bloquante. Si tu n''as pas tout coché à 20h, tu reçois un rappel push avant minuit. Fiche tuto sur Mon développement > Check-list quotidienne.',
  '☀️',
  'gold',
  '/co-pilote',
  'Voir ma check-list',
  'all',
  now()
where not exists (
  select 1 from public.app_announcements where title = '5 actions par jour, jamais plus ☀️'
);

commit;
