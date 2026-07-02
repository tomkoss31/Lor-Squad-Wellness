-- =============================================================================
-- Encaissement dans l'onboarding (2026-07-02).
--
-- Objectif (demande Thomas) : présenter l'encaissement Stripe dès l'onboarding
-- distri. Si le distri ne veut pas configurer, il « passe pour l'instant » →
-- on trace ce refus pour que l'admin voie qui a décliné.
--
-- Modèle minimal : une seule colonne « refusé le ». Le statut affiché se dérive :
--   configuré   = coach_payment_settings.active = true
--   refusé      = payment_onboarding_declined_at non nul (et pas configuré)
--   en attente  = ni l'un ni l'autre
-- (configurer plus tard l'emporte : active=true prime sur declined_at.)
-- =============================================================================

alter table public.users
  add column if not exists payment_onboarding_declined_at timestamptz;

-- Le distri (ou l'admin) pose/retire son propre refus. security definer pour
-- écrire malgré la RLS, mais borné à auth.uid() (chacun sa ligne).
create or replace function public.set_payment_onboarding_declined(p_declined boolean)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.users
    set payment_onboarding_declined_at = case when p_declined then now() else null end
    where id = auth.uid();
end;
$$;

grant execute on function public.set_payment_onboarding_declined(boolean) to authenticated;
