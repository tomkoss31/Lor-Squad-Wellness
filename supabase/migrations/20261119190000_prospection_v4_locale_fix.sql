-- =============================================================================
-- Chantier #3 V4 — Locale fix (2026-05-19)
--
-- Le coach FR doit voir tout le contenu d'INFO (mindset, drapeaux, sources,
-- métriques, routines, storytelling) en français — peu importe le marché
-- sélectionné. Seuls les SCRIPTS À ENVOYER (M1, réponses, objections,
-- post-appel, closing, cas spéciaux) restent en langue native du marché.
--
-- Mon seed initial (étape 3) avait écrit les tables "info" en langue native
-- pour les 5 marchés non-FR. Ce script corrige en clonant le contenu FR
-- vers les 5 autres marchés sur les tables info uniquement.
--
-- Hashtags : restent en natif (recherche réseaux sociaux).
-- Scripts : restent en natif + body_fr déjà présent (toggle UI).
--
-- Stratégie : DELETE non-FR + INSERT depuis FR avec UPDATE market_code.
-- =============================================================================

begin;

-- ─── 1. Mindset blocks ─────────────────────────────────────────────────────
delete from public.prospection_mindset_blocks where market_code <> 'fr';

insert into public.prospection_mindset_blocks (market_code, kind, title, body, position)
select mc.code, mb.kind, mb.title, mb.body, mb.position
  from public.prospection_mindset_blocks mb
 cross join (values ('en'), ('es'), ('pt'), ('tr'), ('hi')) as mc(code)
 where mb.market_code = 'fr';

-- ─── 2. Profile flags ──────────────────────────────────────────────────────
delete from public.prospection_profile_flags where market_code <> 'fr';

insert into public.prospection_profile_flags (market_code, profile_slug, flag_type, text, position)
select mc.code, pf.profile_slug, pf.flag_type, pf.text, pf.position
  from public.prospection_profile_flags pf
 cross join (values ('en'), ('es'), ('pt'), ('tr'), ('hi')) as mc(code)
 where pf.market_code = 'fr';

-- ─── 3. Sources alternatives ───────────────────────────────────────────────
delete from public.prospection_sources where market_code <> 'fr';

insert into public.prospection_sources (market_code, profile_slug, kind, label, detail, position)
select mc.code, src.profile_slug, src.kind, src.label, src.detail, src.position
  from public.prospection_sources src
 cross join (values ('en'), ('es'), ('pt'), ('tr'), ('hi')) as mc(code)
 where src.market_code = 'fr';

-- ─── 4. Metrics ────────────────────────────────────────────────────────────
delete from public.prospection_metrics where market_code <> 'fr';

insert into public.prospection_metrics (market_code, kind, label, value_min, value_max, value_unit, hint, position)
select mc.code, m.kind, m.label, m.value_min, m.value_max, m.value_unit, m.hint, m.position
  from public.prospection_metrics m
 cross join (values ('en'), ('es'), ('pt'), ('tr'), ('hi')) as mc(code)
 where m.market_code = 'fr';

-- ─── 5. Routines ───────────────────────────────────────────────────────────
delete from public.prospection_routines where market_code <> 'fr';

insert into public.prospection_routines (market_code, kind, title, detail, duration_minutes, position)
select mc.code, r.kind, r.title, r.detail, r.duration_minutes, r.position
  from public.prospection_routines r
 cross join (values ('en'), ('es'), ('pt'), ('tr'), ('hi')) as mc(code)
 where r.market_code = 'fr';

-- ─── 6. Storytelling ───────────────────────────────────────────────────────
-- Note : storytelling existe déjà en FR sur tous les marchés via mon seed
-- initial, mais on s'assure en re-clonant proprement.
delete from public.prospection_storytelling where market_code <> 'fr';

insert into public.prospection_storytelling (market_code, profile_slug, kind, title, body, position)
select mc.code, s.profile_slug, s.kind, s.title, s.body, s.position
  from public.prospection_storytelling s
 cross join (values ('en'), ('es'), ('pt'), ('tr'), ('hi')) as mc(code)
 where s.market_code = 'fr';

commit;
