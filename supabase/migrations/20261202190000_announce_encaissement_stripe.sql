-- =============================================================================
-- Annonce distri — Encaissement Stripe direct (chantier 2026-06-15).
--
-- Chaque distri peut désormais encaisser ses clients en CB à la fin du bilan,
-- sur SON propre compte Stripe (pas de commission, pas d'intermédiaire).
-- Config : Mon business → Encaissement (/encaissement). Le schéma
-- coach_payment_settings supportait déjà provider='stripe' + stripe_secret_key
-- (migration 20261202080000) → aucune modif de schéma nécessaire ici.
--
-- Cf. « Règle du livrable complet » (CLAUDE.md) : toute feature livrée = 1 entrée
-- app_announcements.
-- =============================================================================

insert into public.app_announcements
  (title, body, emoji, accent, link_path, link_label, audience, published_at)
values
  (
    'Encaisse tes clients en 1 clic 💳',
    'Nouveau : configure ton compte Stripe (gratuit, à ton nom) et le client paie son programme directement à la fin du bilan. L''argent arrive sur TON compte — on ne prend rien. Mon business → Encaissement.',
    '💳',
    'gold',
    '/encaissement',
    'Configurer',
    'all',
    now()
  )
on conflict do nothing;
