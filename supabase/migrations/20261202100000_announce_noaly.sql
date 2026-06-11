-- =============================================================================
-- Annonces distri — Noaly est activée (clé API posée le 2026-06-11).
-- Règle du livrable complet : les features Noaly étaient dormantes (503) tant
-- que la clé manquait ; maintenant qu'elle répond, on annonce aux distri.
-- =============================================================================

insert into public.app_announcements
  (title, body, emoji, accent, link_path, link_label, audience, published_at)
values
  ('Noaly, ton assistante IA, est arrivée',
   'Une bulle ✨ apparaît en bas à droite sur toutes tes pages : c''est Noaly, l''IA de La Base 360. Pose-lui tes questions, demande-lui qui relancer, retrouve un client, ou fais-lui rédiger un message (relance douce, félicitations, proposition de RDV). Elle connaît l''app et t''ouvre la bonne page. Essaie, elle est là pour te faire gagner du temps.',
   '✨', 'teal', '/co-pilote', 'Dire bonjour à Noaly', 'all', now()),
  ('Noaly t''aide à présenter le bilan',
   'À l''étape « Programme proposé » d''un bilan, un bouton « ✨ Demande à Noaly » te donne en un clic : une synthèse claire du bilan, un pitch à dire au client à voix haute, des points à vérifier, et sur quoi insister dans le programme. Elle ne modifie jamais ton bilan — elle te briefe. Parfait juste avant de présenter au client.',
   '🎤', 'gold', '/clients', 'Voir mes clients', 'all', now())
on conflict do nothing;
