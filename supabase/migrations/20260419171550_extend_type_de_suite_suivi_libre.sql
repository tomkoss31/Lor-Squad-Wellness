-- =============================================================================
-- Sujet C — étendre TypeDeSuite avec 'suivi_libre' (2026-04-19)
--
-- Ajoute 'suivi_libre' aux valeurs possibles de assessments.type_de_suite.
-- La contrainte CHECK initiale (migration add_lifecycle_status) autorisait :
--   'rdv_fixe' | 'message_rappel' | 'relance_douce'
-- On la remplace par :
--   'rdv_fixe' | 'message_rappel' | 'relance_douce' | 'suivi_libre'
--
-- À EXÉCUTER DANS SUPABASE STUDIO → SQL EDITOR (non destructif, pas de perte).
-- =============================================================================

-- 1. Trouver et supprimer toute contrainte CHECK existante sur type_de_suite
--    (nommage variable selon comment elle a été créée dans add_lifecycle_status).
do $$
declare
  cons_name text;
begin
  for cons_name in
    select conname
    from pg_constraint
    where conrelid = 'public.assessments'::regclass
      and contype = 'c'
      and pg_get_constraintdef(oid) ilike '%type_de_suite%'
  loop
    execute format('alter table public.assessments drop constraint %I', cons_name);
  end loop;
end $$;

-- 2. Recréer la contrainte avec la nouvelle valeur autorisée.
alter table public.assessments
  add constraint assessments_type_de_suite_check
  check (type_de_suite is null or type_de_suite in ('rdv_fixe', 'message_rappel', 'relance_douce', 'suivi_libre'));

comment on constraint assessments_type_de_suite_check on public.assessments is
  'Sujet C (2026-04-19) : valeurs étendues avec suivi_libre pour client actif hors agenda auto.';
