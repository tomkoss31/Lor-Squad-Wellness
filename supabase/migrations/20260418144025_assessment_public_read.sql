-- ─────────────────────────────────────────────────────────────────────────────
-- Chantier 6 — Onglet Coaching app client (Option A)
--
-- Objectif : permettre au rôle `anon` (utilisateur public porteur d'un token
-- app client) de lire l'assessment le plus récent du client dont il possède
-- le token, sans jamais exposer les assessments d'autres clients.
--
-- Approche : RPC SECURITY DEFINER `get_client_assessment_by_token(p_token)`.
--   - Le rôle anon n'a PAS de policy SELECT directe sur public.assessments.
--   - La fonction, exécutée avec les droits de son propriétaire, vérifie le
--     token dans public.client_app_accounts et retourne UNIQUEMENT l'assessment
--     correspondant (le plus récent, type initial ou follow-up confondu).
--   - La fonction ne retourne que les colonnes utiles côté coaching :
--     id, date, type, objective, program_title, body_scan, questionnaire.
--
-- Sécurité :
--   - SECURITY DEFINER + `set search_path = public` pour éviter hijack via
--     search_path.
--   - Pas de mutation, pas d'exécution de code externe.
--   - Le rôle anon peut uniquement passer un token ; un mauvais token renvoie
--     zéro ligne (pas d'erreur, pas d'énumération possible).
--
-- Rollback :
--   revoke execute on function public.get_client_assessment_by_token(text) from anon;
--   drop function if exists public.get_client_assessment_by_token(text);
-- ─────────────────────────────────────────────────────────────────────────────

create or replace function public.get_client_assessment_by_token(p_token text)
returns table (
  id text,
  client_id uuid,
  date date,
  type text,
  objective text,
  program_title text,
  body_scan jsonb,
  questionnaire jsonb,
  created_at timestamptz
)
language sql
stable
security definer
set search_path = public
as $$
  select
    a.id,
    a.client_id,
    a.date,
    a.type,
    a.objective,
    a.program_title,
    a.body_scan,
    a.questionnaire,
    a.created_at
  from public.assessments a
  where a.client_id::text = (
    select caa.client_id::text
    from public.client_app_accounts caa
    where caa.token::text = p_token
    limit 1
  )
  order by a.date desc, a.created_at desc
  limit 1;
$$;

comment on function public.get_client_assessment_by_token(text) is
  'Chantier 6 : renvoie le dernier assessment du client identifié par son token app (rôle anon). SECURITY DEFINER — gated par client_app_accounts.';

-- Autoriser anon et authenticated à appeler la RPC
revoke all on function public.get_client_assessment_by_token(text) from public;
grant execute on function public.get_client_assessment_by_token(text) to anon, authenticated;
