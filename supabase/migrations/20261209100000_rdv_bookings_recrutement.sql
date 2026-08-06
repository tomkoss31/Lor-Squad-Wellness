-- =============================================================================
-- rdv_bookings — marqueur « recrutement » (2026-08-06)
--
-- Le tunnel /club/rejoindre/rdv (candidat « ouvrir un club ») réutilise l'edge
-- book-rdv et la table rdv_bookings, exactement comme les RDV bilan. Pour que le
-- coach distingue un CANDIDAT ÉQUIPE d'un PROSPECT bilan, on ajoute :
--   - booking_type : 'bilan' (défaut = tout l'existant) | 'recrutement'
--   - metadata     : réponses PRO du candidat (motivation, timing, tél, ville, note)
--
-- Additif & réversible. Toutes les lignes existantes prennent 'bilan' → aucun
-- impact sur le funnel /rdv ni sur /reserver (les lignes club sont déjà
-- distinguées par club_id, elles restent 'bilan' + club_id, ce qui est correct).
--
-- ⚠️ ORDRE DE DÉPLOIEMENT (base Supabase PARTAGÉE dev+prod) : appliquer CETTE
--    migration AVANT de redéployer l'edge book-rdv. L'edge reste rétro-compatible :
--    le chemin bilan n'écrit PAS ces colonnes (insert inchangé), donc l'ancienne
--    edge continue de tourner même si la migration est déjà passée.
-- =============================================================================

begin;

alter table public.rdv_bookings
  add column if not exists booking_type text not null default 'bilan',
  add column if not exists metadata jsonb;

alter table public.rdv_bookings
  drop constraint if exists rdv_bookings_booking_type_chk;
alter table public.rdv_bookings
  add  constraint rdv_bookings_booking_type_chk
  check (booking_type in ('bilan', 'recrutement'));

commit;
