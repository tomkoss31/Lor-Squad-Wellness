-- Newsletter publique du site club (Breakfast Club) — inscription email depuis le
-- footer. Table ISOLÉE, distincte du système newsletter admin (#8, La Base 360
-- News). Écriture uniquement via l'edge `submit-newsletter` en service_role ;
-- anon/authenticated n'y touchent jamais directement.

create table if not exists public.newsletter_subscribers (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  consent boolean not null default false,
  source text not null default 'newsletter-club',
  created_at timestamptz not null default now()
);

-- Anti-doublon insensible à la casse (une même adresse ne s'inscrit qu'une fois).
create unique index if not exists newsletter_subscribers_email_lower_key
  on public.newsletter_subscribers (lower(email));

-- Sécurité (cf. règles RLS 2026-07-29) : RLS activée + révocation de tout accès
-- direct anon/authenticated. Seul le service_role (edge) écrit, en bypass RLS.
-- Aucune policy de lecture pour l'instant : la table n'est lisible que par
-- service_role (pas d'admin UI). En ajouter une (via is_admin()) le jour où on
-- expose une page d'administration des inscrits.
alter table public.newsletter_subscribers enable row level security;
revoke all on public.newsletter_subscribers from anon, authenticated;
