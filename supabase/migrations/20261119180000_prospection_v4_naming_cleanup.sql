-- =============================================================================
-- Chantier #3 V4 — Cleanup naming "M1 / M2 / M3" (2026-05-19)
--
-- Le hub V4 utilise un naming user-friendly ("Premier message" / "Sa réponse").
-- Cette migration purge les occurrences de "M1" / "M2 / M3" qui restent dans
-- le copy seedé (principalement dans la routine et certains tips).
-- =============================================================================

begin;

-- prospection_routines : "5 messages M1" → "5 premiers messages"
--                        "M2 / M3" → "tes conversations en cours"
update public.prospection_routines
   set title = replace(title, 'messages M1', 'premiers messages'),
       detail = replace(replace(detail, 'M2 / M3', 'tes conversations en cours'), 'messages M1', 'premiers messages')
 where (title like '%M1%' or detail like '%M1%' or detail like '%M2%');

-- prospection_scripts : tip "M1" → "premier message"
update public.prospection_scripts
   set tip = replace(tip, 'M1', 'premier message')
 where tip like '%M1%';

-- prospection_followups : warning "J+5" reste mais nettoie si "M1" mentionné
update public.prospection_followups
   set body = replace(body, 'M1', 'premier message'),
       body_fr = case when body_fr is not null then replace(body_fr, 'M1', 'premier message') else null end
 where body like '%M1%' or (body_fr is not null and body_fr like '%M1%');

commit;
