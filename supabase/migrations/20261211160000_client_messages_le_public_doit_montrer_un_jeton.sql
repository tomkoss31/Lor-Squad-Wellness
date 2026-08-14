-- =============================================================================
-- Chantier 6 — fermer le spam anonyme dans la messagerie (2026-08-12)
--
-- Le 11/08, on a empêché un inconnu de se faire passer pour le coach
-- (`sender = 'client'` imposé). Restait ouvert : n'importe qui pouvait encore
-- insérer un message `sender='client'` avec un `client_id` arbitraire — du
-- spam dans la boîte des coachs.
--
-- Je croyais qu'il fallait réécrire les deux pages publiques pour passer par
-- une fonction à jeton. C'ÉTAIT FAUX : les deux pages portent DÉJÀ leur jeton
-- dans la ligne qu'elles insèrent.
--
--   EvolutionReportPage.tsx:88  →  report_token = le jeton du rapport
--   RecapPage.tsx:78            →  client_id    = le jeton du récap
--
-- La policy peut donc l'exiger, sans toucher une seule ligne de front.
--
-- ── LE PIÈGE, RENCONTRÉ ET ÉVITÉ DE JUSTESSE ────────────────────────────────
--
-- Première version : un `EXISTS` direct sur `client_recaps` /
-- `client_evolution_reports` dans le `WITH CHECK`. **Les deux pages publiques
-- se sont retrouvées bloquées.**
--
-- Cause : un EXISTS dans une policy s'exécute avec les droits de L'APPELANT.
-- Or `anon` ne peut PAS lire ces deux tables — leurs policies `*_public_read`
-- ont été retirées le 29/07 justement parce qu'elles laissaient énumérer les
-- jetons. L'EXISTS renvoyait donc toujours faux.
--
-- C'est le piège du 29/07 sous une autre forme : **on ne peut pas lire une
-- table protégée depuis une policy destinée à un rôle non authentifié.**
-- Il faut une fonction `security definer`, qui contourne la RLS et ne renvoie
-- qu'un booléen — aucune donnée ne sort.
--
-- ⚠️ Cast : `token::text` (uuid → texte), qui ne peut JAMAIS échouer. Jamais
-- l'inverse : un `::uuid` sur une colonne texte plante dès qu'une seule ligne
-- n'est pas un uuid valide, et fait tomber toute la table (règle du 29/07).
--
-- ── VÉRIFIÉ, cinq scénarios en transaction annulée ──────────────────────────
--
--   1. anon SANS jeton ......................... BLOQUÉ
--   2. anon avec jeton mais sender='coach' ..... BLOQUÉ
--   3. page /recap, jeton réel ................. PASSE
--   4. page /evolution, jeton réel ............. PASSE
--   5. coach authentifié, sans jeton ........... PASSE (sa propre policy)
--
-- ⚠️ Un test peut mentir : ma première tentative lisait les jetons APRÈS être
-- passée en rôle `anon` — qui ne peut pas les lire. Les jetons étaient donc
-- NULL et TOUT échouait, y compris ce qui marchait. Toujours préparer les
-- données de test AVANT de changer de rôle.
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
  'Le message vient-il d''une page publique munie d''un vrai jeton (récap ou rapport d''évolution) ? Utilisée par la policy INSERT de client_messages. Renvoie un booléen, jamais de donnée.';

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

comment on table public.client_messages is
  'Messagerie coach <-> client. INSERT : les coachs actifs passent par msg_coach_insert ; le public (pages /recap et /evolution, sans session) par msg_public_insert, qui exige sender=''client'' ET un jeton de récap ou de rapport d''évolution RÉELLEMENT existant (2026-08-12). Sans jeton valide, un anonyme ne peut plus rien écrire.';
