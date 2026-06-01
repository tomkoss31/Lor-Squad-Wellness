-- =============================================================================
-- Chantier #8 fix (2026-06-01) — Distinguer échec d'envoi vs vrai bounce.
--
-- Contexte : dispatch-newsletter marquait TOUT échec synchrone (y compris un
-- rate-limit 429 Resend) comme `bounced_at`. Résultat : des emails valides
-- (distri qui utilisent l'app) apparaissaient en "bounce" alors qu'ils
-- avaient juste été throttlés. Cf. incident envoi "preparation-ete-2026".
--
-- Fix : on ajoute `send_error` pour stocker la raison d'un échec d'envoi
-- synchrone. `bounced_at` est désormais réservé aux VRAIS bounces remontés
-- par le webhook Resend (email.bounced / email.complained).
--
-- Idempotent : ok à rejouer.
-- =============================================================================

alter table public.newsletter_recipients
  add column if not exists send_error text;

comment on column public.newsletter_recipients.send_error is
  'Raison d''un échec d''envoi SYNCHRONE (ex: rate_limit 429 Resend, adresse
   rejetée à l''appel API). NULL = envoi accepté par Resend.
   À NE PAS confondre avec bounced_at (vrai bounce asynchrone via webhook).';
