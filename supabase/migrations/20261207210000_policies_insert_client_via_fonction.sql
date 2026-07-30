-- =============================================================================
-- Recommandations et demandes de changement de RDV bloquées (2026-07-30).
--
-- Troisième conséquence de la fermeture de `client_app_public_read`.
--
-- Ces deux policies d'INSERT validaient le compte client par une sous-requête
-- INLINE :
--
--   referral_via_valid_app_account    (client_referrals)
--   rdv_request_via_valid_app_account (rdv_change_requests)
--     with check ( exists (select 1 from client_app_accounts
--                          where client_id = … and coach_id = …
--                            and expires_at > now()) )
--
-- Or **une sous-requête dans une policy est soumise au RLS de la table
-- interrogée**, évaluée avec les droits de l'appelant. Tant que
-- `client_app_public_read` existait, un visiteur anonyme voyait toutes les
-- lignes non expirées et le `exists` répondait vrai. En fermant cette policy
-- (à raison : elle exposait 52 jetons), j'ai rendu ces lignes invisibles à
-- `anon` → le `exists` répond faux → **insertion refusée**.
--
-- Concrètement, depuis le 2026-07-29, depuis son espace un client ne pouvait
-- plus :
--   · recommander un proche          (ClientAppPage.tsx:562)
--   · demander à déplacer son RDV    (ClientAppPage.tsx:586)
--
-- LE FIX : la même vérification, mais dans une fonction `security definer` qui
-- contourne le RLS. La règle métier ne change pas d'un iota — il faut toujours
-- un compte client valide, non expiré, appartenant à ce coach. Seule la
-- visibilité change : la fonction voit la ligne, l'appelant non.
--
-- C'est exactement la règle 7 de CLAUDE.md § Sécurité : jamais de sous-requête
-- inline dans une policy, toujours une fonction `security definer`.
--
-- Toutes les colonnes concernées sont en `text` des deux côtés (vérifié) : pas
-- de cast, donc pas de risque d'erreur de type.
-- =============================================================================

create or replace function public.client_app_account_is_valid(
  p_client_id text,
  p_coach_id  text
)
returns boolean
language sql
stable
security definer
set search_path = public, extensions
as $$
  select exists (
    select 1
      from public.client_app_accounts a
     where a.client_id = p_client_id
       and a.coach_id  = p_coach_id
       and a.expires_at > now()
  );
$$;

comment on function public.client_app_account_is_valid(text, text) is
  'Vrai si un compte espace client valide et non expiré lie ce client à ce coach. Utilisée par les policies d''INSERT de client_referrals et rdv_change_requests : `security definer` pour ne pas dépendre du droit de LECTURE de l''appelant sur client_app_accounts (une sous-requête inline dans une policy est soumise au RLS de la table interrogée).';

-- Joignable sans compte : le client de la PWA n'a pas de JWT.
-- Ne renvoie qu'un booléen, jamais de donnée.
grant execute on function public.client_app_account_is_valid(text, text) to anon, authenticated;

-- ── Recommandations depuis l'espace client ──────────────────────────────────
drop policy if exists referral_via_valid_app_account on public.client_referrals;
create policy referral_via_valid_app_account on public.client_referrals
  for insert to anon, authenticated
  with check ( public.client_app_account_is_valid(from_client_id, coach_id) );

-- ── Demandes de changement de RDV ───────────────────────────────────────────
drop policy if exists rdv_request_via_valid_app_account on public.rdv_change_requests;
create policy rdv_request_via_valid_app_account on public.rdv_change_requests
  for insert to anon, authenticated
  with check ( public.client_app_account_is_valid(client_id, coach_id) );
