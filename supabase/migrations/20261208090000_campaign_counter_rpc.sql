-- =============================================================================
-- increment_campaign_counter — incrément ATOMIQUE des compteurs de campagne.
-- Chantier Campagnes, étape 6 (2026-08).
--
-- Miroir de increment_newsletter_counter (migration 20261130000000). Sous les
-- webhooks concurrents de Resend, un lecture-modification perdrait des events ;
-- l'incrément SQL est atomique.
--
-- Colonne en WHITELIST (CASE) : on n'autorise QUE les compteurs prévus, jamais
-- un nom de colonne libre venu du webhook.
-- =============================================================================

create or replace function public.increment_campaign_counter(
  p_campaign_id uuid,
  p_column text
)
returns void
language plpgsql
security definer
set search_path = public, extensions
as $$
begin
  update public.campaigns
     set delivered_count    = delivered_count    + (case when p_column = 'delivered_count'    then 1 else 0 end),
         opened_count       = opened_count       + (case when p_column = 'opened_count'       then 1 else 0 end),
         clicked_count      = clicked_count      + (case when p_column = 'clicked_count'      then 1 else 0 end),
         bounced_count      = bounced_count      + (case when p_column = 'bounced_count'      then 1 else 0 end),
         unsubscribed_count = unsubscribed_count + (case when p_column = 'unsubscribed_count' then 1 else 0 end)
   where id = p_campaign_id;
end;
$$;

comment on function public.increment_campaign_counter(uuid, text) is
  'Incrément atomique d''un compteur de campagne (delivered/opened/clicked/bounced/unsubscribed). Whitelist de colonnes. Appelée par resend-webhook et campaign-unsubscribe (service_role).';

-- Appelée par des edge functions en service_role uniquement (webhook, désabo).
revoke execute on function public.increment_campaign_counter(uuid, text) from anon, authenticated;
