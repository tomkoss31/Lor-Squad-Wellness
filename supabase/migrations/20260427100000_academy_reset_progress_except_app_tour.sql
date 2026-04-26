-- =============================================================================
-- Chantier Academy refonte premium (2026-04-27)
--
-- Reset de la progression Academy pour permettre aux users de retester
-- toutes les sections refaites. Garde la trace mais remet last_step a 0
-- et vide les timestamps de completion / skip globaux.
--
-- Vide aussi les dismissals du popup pour qu il re-apparaisse demain.
--
-- IMPORTANT : tour_key='academy' est bien le seul tour existant — pas
-- d isolation possible par section (la progression Academy est globale,
-- avec last_step = index de la prochaine section a faire).
-- =============================================================================

begin;

update public.user_tour_progress
set last_step = 0,
    completed_at = null,
    skipped_at = null,
    started_at = now(),
    updated_at = now()
where tour_key = 'academy';

delete from public.user_tour_reminder_dismissals
where tour_key = 'academy';

commit;
