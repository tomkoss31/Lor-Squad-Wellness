-- =============================================================================
-- Hotfix import clients (2026-04-21) — réparation des questionnaires
-- incomplets sur les assessments importés via SQL brut.
--
-- Contexte : 2 clientes (Isabelle Tondeur, Christelle Brico) ont été
-- importées hier. Leur `assessments.questionnaire` n'a pas les sous-clés
-- tableau (recommendations, selectedProductIds, detectedNeedIds) que le
-- code app suppose toujours initialisées à []. Résultat : crash
-- "Cannot read properties of undefined (reading 'length')" sur la page
-- Nouveau body scan.
--
-- Le code a été durci en parallèle (commit 0462e53) pour ne plus crasher
-- même si les données sont cassées. Cette migration REMET les données
-- propres pour les anciens + futurs imports.
--
-- À EXÉCUTER DANS SUPABASE STUDIO → SQL EDITOR (une seule fois).
-- =============================================================================

begin;

-- ─── 1. Normalise questionnaire.recommendations ─────────────────────────────
-- Si la clé est absente OU null, on force [].
update public.assessments
set questionnaire = questionnaire
  || jsonb_build_object('recommendations', '[]'::jsonb)
where jsonb_typeof(questionnaire) = 'object'
  and (
    not questionnaire ? 'recommendations'
    or jsonb_typeof(questionnaire -> 'recommendations') <> 'array'
  );

-- ─── 2. Normalise questionnaire.selectedProductIds ──────────────────────────
update public.assessments
set questionnaire = questionnaire
  || jsonb_build_object('selectedProductIds', '[]'::jsonb)
where jsonb_typeof(questionnaire) = 'object'
  and (
    not questionnaire ? 'selectedProductIds'
    or jsonb_typeof(questionnaire -> 'selectedProductIds') <> 'array'
  );

-- ─── 3. Normalise questionnaire.detectedNeedIds ─────────────────────────────
update public.assessments
set questionnaire = questionnaire
  || jsonb_build_object('detectedNeedIds', '[]'::jsonb)
where jsonb_typeof(questionnaire) = 'object'
  and (
    not questionnaire ? 'detectedNeedIds'
    or jsonb_typeof(questionnaire -> 'detectedNeedIds') <> 'array'
  );

-- ─── 3bis. Normalise assessments.body_scan (objet complet) ─────────────────
-- Si body_scan est null OU un objet incomplet, on met au moins les 8 clés à 0.
-- Le code app suppose ces clés présentes (weight, bodyFat, muscleMass,
-- hydration, boneMass, visceralFat, bmr, metabolicAge).
update public.assessments
set body_scan = coalesce(body_scan, '{}'::jsonb)
  || jsonb_build_object(
    'weight', coalesce((body_scan ->> 'weight')::numeric, 0),
    'bodyFat', coalesce((body_scan ->> 'bodyFat')::numeric, 0),
    'muscleMass', coalesce((body_scan ->> 'muscleMass')::numeric, 0),
    'hydration', coalesce((body_scan ->> 'hydration')::numeric, 0),
    'boneMass', coalesce((body_scan ->> 'boneMass')::numeric, 0),
    'visceralFat', coalesce((body_scan ->> 'visceralFat')::numeric, 0),
    'bmr', coalesce((body_scan ->> 'bmr')::numeric, 0),
    'metabolicAge', coalesce((body_scan ->> 'metabolicAge')::numeric, 0)
  )
where body_scan is null
   or jsonb_typeof(body_scan) <> 'object'
   or not (body_scan ? 'weight')
   or not (body_scan ? 'bodyFat')
   or not (body_scan ? 'muscleMass')
   or not (body_scan ? 'hydration')
   or not (body_scan ? 'boneMass')
   or not (body_scan ? 'visceralFat')
   or not (body_scan ? 'bmr')
   or not (body_scan ? 'metabolicAge');

-- ─── 4. pedagogical_focus au niveau assessment ──────────────────────────────
-- La colonne a un default '[]' mais un import brut peut avoir mis null.
update public.assessments
set pedagogical_focus = '[]'::jsonb
where pedagogical_focus is null
   or jsonb_typeof(pedagogical_focus) <> 'array';

-- ─── 5. Bonus : cas où questionnaire entier est null ────────────────────────
-- La colonne est "not null" mais par sécurité si une ancienne migration a
-- laissé passer du null, on met un objet minimal.
update public.assessments
set questionnaire = jsonb_build_object(
  'recommendations', '[]'::jsonb,
  'selectedProductIds', '[]'::jsonb,
  'detectedNeedIds', '[]'::jsonb,
  'recommendationsContacted', false
)
where questionnaire is null
   or jsonb_typeof(questionnaire) <> 'object';

-- ─── 6. Check post-run ──────────────────────────────────────────────────────
-- Retourne le nombre d'assessments réparés pour chaque critère, doit afficher
-- 0 partout en ré-exécution.
do $$
declare
  bad_recos int;
  bad_products int;
  bad_needs int;
  bad_focus int;
begin
  select count(*) into bad_recos from public.assessments
    where not (questionnaire ? 'recommendations')
       or jsonb_typeof(questionnaire -> 'recommendations') <> 'array';
  select count(*) into bad_products from public.assessments
    where not (questionnaire ? 'selectedProductIds')
       or jsonb_typeof(questionnaire -> 'selectedProductIds') <> 'array';
  select count(*) into bad_needs from public.assessments
    where not (questionnaire ? 'detectedNeedIds')
       or jsonb_typeof(questionnaire -> 'detectedNeedIds') <> 'array';
  select count(*) into bad_focus from public.assessments
    where pedagogical_focus is null
       or jsonb_typeof(pedagogical_focus) <> 'array';

  raise notice 'Après repair : bad_recos=%, bad_products=%, bad_needs=%, bad_focus=%',
    bad_recos, bad_products, bad_needs, bad_focus;
end $$;

commit;
