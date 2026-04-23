-- Chantier Recommandations nutritionnelles (2026-04-25).
-- Ajoute 2 colonnes numériques sur assessments pour persister les
-- recommandations eau + protéines calculées depuis le poids + objectif.
-- Colonnes nullable : non-bloquant pour les bilans existants, le
-- backfill ci-dessous comble les valeurs historiques.
--
-- Idempotent. Pas de RLS à ajouter (les policies assessments existantes
-- couvrent déjà SELECT/INSERT/UPDATE via can_access_owner).

-- ─── Ajout colonnes ──────────────────────────────────────────────────
alter table public.assessments
  add column if not exists water_target_l numeric(4,1),
  add column if not exists protein_target_g numeric(5,1);

comment on column public.assessments.water_target_l is
  'Litres d''eau recommandés/jour — calcul 33 mL/kg clampé 2-4 L.';
comment on column public.assessments.protein_target_g is
  'Protéines cible g/jour — multiplicateur selon objective (1.4-2.0 g/kg).';

-- ─── Backfill rétroactif ─────────────────────────────────────────────
-- Lit body_scan->'weight' (jsonb) + assessments.objective pour
-- reconstruire les valeurs cible. Seules les rows avec un poids > 0 et
-- des colonnes cible NULL sont mises à jour (idempotent).
update public.assessments a
set
  water_target_l = greatest(
    2.0,
    least(
      4.0,
      round(((a.body_scan->>'weight')::numeric * 0.033)::numeric, 1)
    )
  ),
  protein_target_g = round(
    (a.body_scan->>'weight')::numeric * case a.objective
      when 'sport' then 2.0
      when 'weight-loss' then 1.8
      else 1.6
    end
  )
where
  (a.water_target_l is null or a.protein_target_g is null)
  and (a.body_scan ? 'weight')
  and ((a.body_scan->>'weight')::numeric > 0);
