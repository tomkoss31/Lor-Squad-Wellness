-- =============================================================================
-- Alerte coach sur panier abandonné (incident notif 2026-08-07).
--
-- La distri n'était prévenue de RIEN : ni d'une commande payée (corrigé dans
-- confirm-shop-payment), ni d'un panier abandonné. `relance_email_sent_at`
-- existe déjà mais trace la relance envoyée AU CLIENT — il faut un drapeau
-- distinct, sinon l'échec de l'un masque silencieusement l'autre.
-- =============================================================================

alter table public.shop_orders
  add column if not exists coach_abandon_alert_sent_at timestamptz;

comment on column public.shop_orders.coach_abandon_alert_sent_at is
  'Date d''envoi de l''alerte « panier abandonné » À LA COACH (anti-doublon). '
  'Distinct de relance_email_sent_at qui trace la relance envoyée au client.';

-- Les crons balaient par statut + drapeau nul : index partiel sur ce chemin.
create index if not exists shop_orders_pending_coach_alert_idx
  on public.shop_orders (created_at)
  where status = 'pending' and coach_abandon_alert_sent_at is null;
