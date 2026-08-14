-- =============================================================================
-- La newsletter n'avait aucune porte de sortie.
--
-- Le formulaire du site club promet « désinscription en un clic » et rien ne
-- la permettait : ni colonne, ni lien dans les mails. Au-delà de l'obligation
-- légale, l'effet concret est qu'on force les gens à cliquer « spam » — et
-- Gmail sanctionne alors le DOMAINE entier, e-mails de rendez-vous compris.
-- =============================================================================

alter table public.newsletter_subscribers
  add column if not exists unsubscribed_at timestamptz;

comment on column public.newsletter_subscribers.unsubscribed_at is
  'Désinscription. L''adresse rejoint aussi email_suppressions (liste commune à la newsletter ET aux campagnes) : se désabonner une fois vaut pour tout.';

create index if not exists newsletter_subscribers_actifs
  on public.newsletter_subscribers (created_at desc)
  where unsubscribed_at is null;
