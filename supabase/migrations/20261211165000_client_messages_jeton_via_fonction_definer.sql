-- =============================================================================
-- Correctif immédiat de la migration précédente (« le public doit montrer un
-- jeton »), écrite quelques minutes plus tôt.
--
-- ⚠️ CE FICHIER A ÉTÉ RETROUVÉ DANS LA BASE, PAS DANS LE DÉPÔT (01/09/2026).
-- La migration avait été appliquée directement en production et son SQL n'a
-- jamais été committé : le dépôt ne décrivait donc plus complètement la base,
-- et une reconstruction depuis zéro aurait produit une messagerie publique
-- cassée. Le texte ci-dessous vient de `schema_migrations.statements`.
--
-- ── CE QUI S'ÉTAIT PASSÉ ────────────────────────────────────────────────────
-- La policy vérifiait le jeton avec un EXISTS direct sur `client_recaps` et
-- `client_evolution_reports`. Mais un EXISTS dans une policy s'exécute avec les
-- droits de L'APPELANT : `anon` ne peut PAS lire ces deux tables (leurs
-- policies `*_public_read` ont été retirées le 29/07 et remplacées par des
-- fonctions `security definer` à jeton). L'EXISTS renvoyait donc toujours faux,
-- et les DEUX pages publiques étaient bloquées.
--
-- C'est exactement le piège du 29/07 sous une autre forme : on ne peut pas lire
-- une table protégée depuis une policy destinée à un rôle non authentifié. Il
-- faut passer par une fonction `security definer`.
-- =============================================================================

create or replace function public.jeton_public_messagerie_valide(
  p_report_token uuid,
  p_client_id text
)
returns boolean
language sql
stable
security definer
set search_path to 'public'
as $function$
  -- Contourne la RLS de `client_recaps` / `client_evolution_reports`, que
  -- `anon` ne peut pas lire. Ne renvoie qu'un booléen : aucune donnée ne sort.
  select exists (
      select 1 from public.client_evolution_reports r
       where p_report_token is not null and r.token = p_report_token
    )
    or exists (
      select 1 from public.client_recaps c
       where c.token::text = p_client_id
    );
$function$;

comment on function public.jeton_public_messagerie_valide(uuid, text) is
  'Le message vient-il d''une page publique munie d''un vrai jeton (recap ou rapport d''évolution) ? Utilisée par la policy INSERT de client_messages. Renvoie un booléen, jamais de donnée.';

revoke all on function public.jeton_public_messagerie_valide(uuid, text) from public;
grant execute on function public.jeton_public_messagerie_valide(uuid, text) to anon, authenticated;

drop policy if exists msg_public_insert on public.client_messages;

create policy msg_public_insert
  on public.client_messages
  for insert
  to public
  with check (
    sender = 'client'
    and public.jeton_public_messagerie_valide(report_token, client_id)
  );
