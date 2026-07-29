-- =============================================================================
-- `get_pv_action_plan` plantait à chaque appel (2026-07-29).
--
-- Trouvé en testant les fonctions après le durcissement du `search_path` —
-- rien à voir avec ce chantier, le bug préexistait.
--
--   ERROR: operator does not exist: text = uuid
--
-- DEUX comparaisons entre types incompatibles, toutes deux sur la même table :
--   · `lm.client_id = cli."id"`        → client_messages.client_id      (text)
--                                        comparé à clients.id            (uuid)
--   · `msg.distributor_id = p_user_id` → client_messages.distributor_id (text)
--                                        comparé au paramètre            (uuid)
--
-- `client_messages` stocke ses deux identifiants en `text`, héritage du même
-- écart de typage que `client_app_accounts.client_id` (cf. CLAUDE.md, § « Règles
-- RLS — cast cross-type »).
--
-- ON CASTE L'UUID VERS LE TEXTE, jamais l'inverse. Un `::uuid` posé sur une
-- colonne texte plante dès qu'UNE seule ligne contient une valeur non conforme,
-- et fait tomber toute la requête — c'est la leçon de l'incident RLS du
-- 2026-04-25.
--
-- CONSÉQUENCE DU BUG : la RPC alimente le « Plan d'action PV » du Co-pilote V5
-- (via `usePvActionPlan`). Elle échouait à chaque appel, donc la carte ne s'est
-- probablement jamais affichée depuis sa mise en service.
--
-- MÉTHODE : on ne réécrit pas les 6 776 caractères de la fonction à la main —
-- on relit sa définition, on y applique deux remplacements ciblés, et on la
-- recrée. Tout le reste du corps est garanti identique, au caractère près.
-- =============================================================================

do $$
declare
  def text;
  avant int;
begin
  select pg_get_functiondef(p.oid) into def
    from pg_proc p join pg_namespace n on n.oid = p.pronamespace
   where n.nspname = 'public' and p.proname = 'get_pv_action_plan'
   limit 1;

  if def is null then
    raise notice 'get_pv_action_plan absente — rien à corriger';
    return;
  end if;

  avant := length(def);

  def := replace(def, 'lm.client_id = cli."id"',        'lm.client_id = cli."id"::text');
  def := replace(def, 'msg.distributor_id = p_user_id', 'msg.distributor_id = p_user_id::text');

  -- Garde-fou : si aucun des deux motifs n'a été trouvé, la fonction a changé
  -- depuis l'audit — mieux vaut échouer bruyamment que recréer à l'identique.
  if length(def) = avant then
    raise exception 'Aucun des deux motifs attendus trouvé dans get_pv_action_plan — a-t-elle été réécrite ?';
  end if;

  execute def;
end $$;
