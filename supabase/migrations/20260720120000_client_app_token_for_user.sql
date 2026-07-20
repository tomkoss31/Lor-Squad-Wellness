-- Chantier PWA client v2 (2026-07) — Login réel.
--
-- Le client peut se connecter par email + mot de passe (compte auth.users créé
-- via /bienvenue ou qualif). Après signInWithPassword, le front a besoin du
-- token PWA (client_app_accounts.token) pour ouvrir /client/:token.
--
-- Cette RPC SECURITY DEFINER renvoie le token du compte lié à auth.uid()
-- (sans exposer la table client_app_accounts par une policy permissive).
-- Retourne NULL si l'utilisateur courant n'a pas de fiche client app.

create or replace function public.get_my_client_app_token()
returns text
language sql
security definer
set search_path = public
as $$
  select token::text
  from public.client_app_accounts
  where auth_user_id = auth.uid()
  order by created_at desc
  limit 1
$$;

revoke all on function public.get_my_client_app_token() from public;
grant execute on function public.get_my_client_app_token() to authenticated;
