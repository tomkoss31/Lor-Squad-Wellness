-- Chantier B santé edge functions (2026-06-09) — compteur newsletter atomique.
--
-- resend-webhook incrémentait les compteurs en lecture-modification (select +1
-- update) → race condition sous webhooks Resend concurrents (events open/click
-- perdus ou doublés). Cette RPC fait un UPDATE atomique `col = col + 1`.
--
-- Colonne passée en paramètre mais STRICTEMENT allowlistée (anti-injection) +
-- format(%I) pour quoter l'identifiant. SECURITY DEFINER, réservé service_role
-- (appelée uniquement par l'edge function resend-webhook).

create or replace function public.increment_newsletter_counter(
  p_newsletter_id uuid,
  p_column text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_column not in (
    'email_open_count',
    'email_click_count',
    'bilan_cta_clicks',
    'business_cta_clicks'
  ) then
    raise exception 'increment_newsletter_counter: colonne non autorisée %', p_column;
  end if;

  execute format(
    'update public.newsletters set %1$I = coalesce(%1$I, 0) + 1 where id = $1',
    p_column
  ) using p_newsletter_id;
end;
$$;

comment on function public.increment_newsletter_counter(uuid, text) is
  'Chantier B 2026-06-09 — incrément atomique des compteurs newsletter (open/click/cta) pour resend-webhook. Colonne allowlistée. SECURITY DEFINER.';

grant execute on function public.increment_newsletter_counter(uuid, text) to service_role;
