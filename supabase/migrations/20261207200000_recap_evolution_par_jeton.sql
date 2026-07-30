-- =============================================================================
-- RÉPARATION — deux pages publiques cassées par la passe de sécurité du 29/07.
--
-- CE QUE J'AI CASSÉ. En retirant `recap_public_read` et `report_public_read`
-- (à raison : sans elles, `GET /rest/v1/client_app_accounts?select=token`
-- renvoyait les 52 jetons clients), j'ai coupé la seule chose qui laissait deux
-- pages PUBLIQUES lire leur ligne :
--
--   src/pages/RecapPage.tsx:35            .from('client_recaps').select('*').eq('token', …)
--   src/pages/RecapPage.tsx:54            .from('client_recaps').update({ referrals }).eq('token', …)
--   src/pages/EvolutionReportPage.tsx:58  .from('client_evolution_reports').select('*').eq('token', …)
--
-- Vérifié en réel avec un vrai jeton et la clé publique : 0 ligne renvoyée.
-- Ces pages étaient donc mortes depuis le 29/07. Le `PATCH` des parrainages
-- répondait `204` — le même faux signal que d'habitude : « zéro ligne touchée »,
-- pas « écrit ».
--
-- POURQUOI JE NE L'AI PAS VU : mon grep ne cherchait que `from("table")` en
-- guillemets DOUBLES, et ces pages écrivent en guillemets SIMPLES. J'ai ensuite
-- conclu « ces lectures sont côté coach » d'après les NOMS de fichiers, sans
-- ouvrir les appels. Deux erreurs qui se sont additionnées.
--
-- LE FIX, sans rouvrir la faille. Une policy RLS ne peut pas savoir si
-- l'appelant a filtré par jeton — elle ne voit que des lignes. C'est pour ça
-- qu'une policy « publique + expires_at » était forcément énumérable. On passe
-- donc par des fonctions privilégiées qui EXIGENT le jeton en paramètre et ne
-- renvoient que la ligne correspondante : sans le jeton, rien. C'est exactement
-- le motif déjà en place pour `get_client_messages_by_token`,
-- `get_client_vip_status_by_token` et les huit autres.
--
-- `p_token text` avec comparaison `token::text = p_token` : on caste l'UUID
-- vers le texte, jamais l'inverse (cf. CLAUDE.md § Règles RLS — cast
-- cross-type). Un `::uuid` sur une entrée libre plante sur la moindre valeur
-- non conforme, et un visiteur peut mettre n'importe quoi dans l'URL.
-- =============================================================================

-- ── Lecture du récap de bilan (page /recap/:token) ──────────────────────────
create or replace function public.get_client_recap_by_token(p_token text)
returns setof public.client_recaps
language sql
stable
security definer
set search_path = public, extensions
as $$
  select * from public.client_recaps
   where token::text = p_token
     and (expires_at is null or expires_at > now())
   limit 1;
$$;

comment on function public.get_client_recap_by_token(text) is
  'Récap de bilan par jeton, pour la page publique /recap/:token. Ne renvoie QUE la ligne du jeton fourni : aucune énumération possible. Remplace la policy recap_public_read qui exposait toutes les lignes non expirées.';

-- ── Lecture du rapport d'évolution (page publique) ──────────────────────────
create or replace function public.get_client_evolution_report_by_token(p_token text)
returns setof public.client_evolution_reports
language sql
stable
security definer
set search_path = public, extensions
as $$
  select * from public.client_evolution_reports
   where token::text = p_token
     and (expires_at is null or expires_at > now())
   limit 1;
$$;

comment on function public.get_client_evolution_report_by_token(text) is
  'Rapport d''évolution par jeton, pour sa page publique. Ne renvoie QUE la ligne du jeton fourni.';

-- ── Écriture des recommandations depuis /recap/:token ───────────────────────
-- Le client saisit les prénoms de ses proches sur la page récap. Seule cette
-- colonne est modifiable, et seulement sur la ligne du jeton fourni.
create or replace function public.set_client_recap_referrals_by_token(
  p_token text,
  p_referrals jsonb
)
returns boolean
language plpgsql
volatile
security definer
set search_path = public, extensions
as $$
declare
  v_touche int;
begin
  update public.client_recaps
     set referrals = p_referrals
   where token::text = p_token
     and (expires_at is null or expires_at > now());

  get diagnostics v_touche = row_count;
  return v_touche > 0;   -- false = jeton inconnu ou expiré, l'appelant peut réagir
end;
$$;

comment on function public.set_client_recap_referrals_by_token(text, jsonb) is
  'Enregistre les recommandations saisies sur /recap/:token. N''écrit QUE la colonne referrals, QUE sur la ligne du jeton. Renvoie false si le jeton est inconnu ou expiré.';

-- Ces trois fonctions doivent être joignables sans compte : les pages sont
-- publiques et le client n'a pas de JWT. La protection est le jeton lui-même.
grant execute on function public.get_client_recap_by_token(text)              to anon, authenticated;
grant execute on function public.get_client_evolution_report_by_token(text)   to anon, authenticated;
grant execute on function public.set_client_recap_referrals_by_token(text, jsonb) to anon, authenticated;
