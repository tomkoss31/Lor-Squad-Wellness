-- =============================================================================
-- Chantier #3 V4 — Refonte structure prospection internationale (2026-05-19)
--
-- Aligne le schéma sur le brief "Kit prospection complet" 10 sections :
--   1. Mindset & posture                  → prospection_mindset_blocks
--   2. Trouver les bons prospects         → prospection_profile_flags + sources
--                                           + hashtags.category/crossover_hint
--   3. Messages M1 multi-plateforme       → (existant) prospection_scripts
--   4. Arbres réponses M2/M3              → prospection_reply_tree
--   5. Objections classiques (8)          → prospection_objections
--   6. Séquence post-appel + suivi client → prospection_followups
--   7. Closing                            → prospection_closing
--   8. Cas spéciaux                       → prospection_special_cases
--   9. Storytelling                       → prospection_storytelling
--  10. Routine quotidienne + checklist    → prospection_routines
--      + métriques réalistes              → prospection_metrics
--
-- Plus :
--   - Split du profil 'weight' (mixte) en 'weight-women' + 'weight-men' :
--     hashtags et scripts FR existants (ton actuel proche femmes) sont
--     rebasculés vers 'weight-women'. 'weight-men' partira vide et sera
--     peuplé par la migration de seed FR.
--   - users.prospection_onboarded_at : permet l'UI hybride (tunnel
--     onboarding 1ère visite + hub permanent ensuite).
--
-- Toutes les nouvelles tables suivent le pattern RLS du module :
-- lecture publique anon+authenticated (active=true), écriture admin via
-- public.is_admin().
-- =============================================================================

begin;

-- ============================================================================
-- SECTION A — Split du profil 'weight' → 'weight-women' + 'weight-men'
-- ============================================================================

-- 1. Insertion des 2 nouveaux profils (le brief méthodo `weight` actuel
--    sera rebasculé en 'weight-women' juste après).
insert into public.prospection_profiles
  (slug, emoji, label, description, position,
   gopro_steps, posture, mistakes, local_venues_hint, recommended_platforms,
   hashtag_advice)
select
  'weight-women', '⚖️', 'Perte de poids · Femmes',
  'Cible la plus large, ton chaleureux',
  1,
  gopro_steps, posture, mistakes, local_venues_hint, recommended_platforms,
  hashtag_advice
from public.prospection_profiles where slug = 'weight'
on conflict (slug) do nothing;

insert into public.prospection_profiles
  (slug, emoji, label, description, position,
   gopro_steps, posture, mistakes, local_venues_hint, recommended_platforms,
   hashtag_advice)
values (
  'weight-men', '💪', 'Perte de poids · Hommes',
  'Vocabulaire performance, énergie, récup',
  2,
  array[
    'Parle PERFORMANCE, ÉNERGIE et RÉCUP — jamais "bien-être", "douceur" ou "féminin".',
    'Reconnais sa situation : boulot intense + sport + famille. Pas le temps pour des régimes.',
    'Pose une question ouverte sur son objectif (perte de gras / prise de masse propre / énergie).'
  ],
  E'Tu accompagnes des hommes 30-50 ans qui combinent vie pro prenante et sport, et qui veulent que le corps ne lâche pas. Tu connais leurs codes (récup, énergie, perte de gras vs prise de masse propre, sommeil). Tu n''es PAS une coach minceur déguisée — le vocabulaire change tout. Ton angle : "remise en forme durable sans régime".',
  array[
    'Utiliser le vocabulaire "perte de poids féminin" (bien-être, douceur) → il décroche immédiatement.',
    'Proposer un "régime" → grillé. Préfère "rééquilibrage" ou "remise en forme".',
    'Insister sur l''apparence → un homme bouge pour la performance et l''énergie, pas pour rentrer dans un jean.'
  ],
  E'IRL : salles de muscu/CrossFit, clubs de sport collectif, courses populaires, événements pro (afterworks), espaces de coworking, courses père-fils. Online : groupes Facebook "remise en forme homme [ville]", commentaires comptes coachs muscu, Strava clubs masculins.',
  array['insta', 'whatsapp', 'fb', 'linkedin'],
  'Croise un hashtag remise en forme + un hashtag lifestyle (ex : #remiseenforme + #papasportif). Évite les hashtags trop féminins. Les comptes 30-50 ans actifs sur Insta sont plus rares mais plus engagés.'
)
on conflict (slug) do nothing;

-- 2. Rebascule toutes les références FK 'weight' vers 'weight-women'.
--    Le ton actuel des scripts/hashtags FR est plutôt féminin (cf. "tombée
--    sur ton profil", "elle", #mamanquisebouge), donc rebascule logique.
update public.prospection_hashtags set profile_slug = 'weight-women' where profile_slug = 'weight';
update public.prospection_scripts  set profile_slug = 'weight-women' where profile_slug = 'weight';
update public.prospection_attempts set profile_slug = 'weight-women' where profile_slug = 'weight';

-- 3. Suppression de l'ancien profil 'weight' (vide après bascule).
delete from public.prospection_profiles where slug = 'weight';

-- 4. Repositionnement des profils (weight-women=1, weight-men=2, sport=3, business=4).
update public.prospection_profiles set position = 1 where slug = 'weight-women';
update public.prospection_profiles set position = 2 where slug = 'weight-men';
update public.prospection_profiles set position = 3 where slug = 'sport';
update public.prospection_profiles set position = 4 where slug = 'business';

-- ============================================================================
-- SECTION B — Extensions sur tables existantes
-- ============================================================================

-- B1. Hashtags : catégorie (mainstream/niche/cross) + crossover_hint.
alter table public.prospection_hashtags
  add column if not exists category text not null default 'mainstream'
    check (category in ('mainstream', 'niche', 'cross')),
  add column if not exists crossover_hint text;

comment on column public.prospection_hashtags.category is
  'Chantier #3 V4 — Catégorie du hashtag : mainstream (large), niche (segment précis), cross (croisement de 2 hashtags = signal le plus chaud).';
comment on column public.prospection_hashtags.crossover_hint is
  'Chantier #3 V4 — Pour les hashtags de category=cross, suggestion du second hashtag à croiser (ex pour #pertedepoidsfr : "à croiser avec #mamanquisebouge"). NULL pour mainstream/niche.';

-- B2. users : timestamp d'onboarding prospection pour l'UI hybride.
alter table public.users
  add column if not exists prospection_onboarded_at timestamptz;

comment on column public.users.prospection_onboarded_at is
  'Chantier #3 V4 — Timestamp de fin du tunnel onboarding prospection. NULL = 1ère visite, redirige vers le tunnel 4 steps. Non-NULL = accès direct au hub 10 modules.';

-- ============================================================================
-- SECTION C — 11 nouvelles tables (catalogue prospection v4)
-- ============================================================================
-- Toutes ces tables suivent le même contrat :
--   - (id uuid pk, market_code text fk → prospection_markets, position int, active bool)
--   - timestamps created_at/updated_at
--   - RLS : lecture publique (active=true), écriture admin via is_admin()
-- Le seed sera fait dans une migration séparée par marché.
-- ============================================================================

-- C1. Mindset blocks (vérités + erreurs du débutant)
create table if not exists public.prospection_mindset_blocks (
  id          uuid primary key default gen_random_uuid(),
  market_code text not null references public.prospection_markets(code) on delete cascade,
  kind        text not null check (kind in ('truth', 'error')),
  title       text not null,
  body        text not null,
  position    integer not null default 0,
  active      boolean not null default true,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index if not exists idx_prospection_mindset_blocks_lookup
  on public.prospection_mindset_blocks (market_code, kind, position) where active = true;
comment on table public.prospection_mindset_blocks is
  'Chantier #3 V4 — Section 1 Mindset : 3 vérités à accepter (kind=truth) + 5 erreurs du débutant (kind=error).';

-- C2. Metrics (funnel 100→1, pipeline cibles, KPI semaine)
create table if not exists public.prospection_metrics (
  id          uuid primary key default gen_random_uuid(),
  market_code text not null references public.prospection_markets(code) on delete cascade,
  kind        text not null check (kind in ('funnel_step', 'pipeline_target', 'weekly_kpi')),
  label       text not null,
  value_min   integer,
  value_max   integer,
  value_unit  text,
  hint        text,
  position    integer not null default 0,
  active      boolean not null default true,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index if not exists idx_prospection_metrics_lookup
  on public.prospection_metrics (market_code, kind, position) where active = true;
comment on table public.prospection_metrics is
  'Chantier #3 V4 — Section 1+10 Métriques : funnel réaliste 100 M1→client (kind=funnel_step), pipeline cibles à tenir (kind=pipeline_target), 3 KPI semaine à tracker (kind=weekly_kpi).';

-- C3. Profile flags (green/red, scan 30s)
create table if not exists public.prospection_profile_flags (
  id           uuid primary key default gen_random_uuid(),
  market_code  text not null references public.prospection_markets(code) on delete cascade,
  profile_slug text not null references public.prospection_profiles(slug) on delete cascade,
  flag_type    text not null check (flag_type in ('green', 'red')),
  text         text not null,
  position     integer not null default 0,
  active       boolean not null default true,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
create index if not exists idx_prospection_profile_flags_lookup
  on public.prospection_profile_flags (market_code, profile_slug, flag_type, position) where active = true;
comment on table public.prospection_profile_flags is
  'Chantier #3 V4 — Section 2 Trouver : green flags (envoyer le M1) + red flags (passer son chemin), par marché × profil. Scan 30s du profil prospect.';

-- C4. Sources alternatives (groupes FB, IRL, recommandations, contenu entrant)
create table if not exists public.prospection_sources (
  id           uuid primary key default gen_random_uuid(),
  market_code  text not null references public.prospection_markets(code) on delete cascade,
  profile_slug text references public.prospection_profiles(slug) on delete cascade,
  kind         text not null check (kind in ('hashtag_advanced', 'fb_groups', 'irl', 'recommendations', 'inbound_content')),
  label        text not null,
  detail       text,
  position     integer not null default 0,
  active       boolean not null default true,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
create index if not exists idx_prospection_sources_lookup
  on public.prospection_sources (market_code, kind, position) where active = true;
comment on table public.prospection_sources is
  'Chantier #3 V4 — Section 2 Trouver : sources alternatives aux hashtags (groupes FB, IRL, recommandations, contenu entrant) + tips hashtags avancés (ratio Insta 60/30/10 etc.). profile_slug nullable pour conseils transverses.';

-- C5. Reply tree (M2/M3 arborescents)
create table if not exists public.prospection_reply_tree (
  id           uuid primary key default gen_random_uuid(),
  market_code  text not null references public.prospection_markets(code) on delete cascade,
  profile_slug text not null references public.prospection_profiles(slug) on delete cascade,
  level        text not null check (level in ('M2', 'M3')),
  branch       text not null check (branch in ('positive', 'vague', 'negative', 'question', 'hot', 'lukewarm')),
  body         text not null,
  body_fr      text,
  tip          text,
  position     integer not null default 0,
  active       boolean not null default true,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
create index if not exists idx_prospection_reply_tree_lookup
  on public.prospection_reply_tree (market_code, profile_slug, level, branch, position) where active = true;
comment on table public.prospection_reply_tree is
  'Chantier #3 V4 — Section 4 Arbres réponses : M2 = 4 branches (positive/vague/negative/question), M3 = 2 branches (hot/lukewarm). body_fr = traduction française pour marchés non-FR.';

-- C6. Objections (8 types)
create table if not exists public.prospection_objections (
  id            uuid primary key default gen_random_uuid(),
  market_code   text not null references public.prospection_markets(code) on delete cascade,
  slug          text not null,
  title         text not null,
  meaning       text not null,
  bad_response  text not null,
  good_response text not null,
  good_response_fr text,
  warning       text,
  position      integer not null default 0,
  active        boolean not null default true,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  unique (market_code, slug)
);
create index if not exists idx_prospection_objections_lookup
  on public.prospection_objections (market_code, position) where active = true;
comment on table public.prospection_objections is
  'Chantier #3 V4 — Section 5 Objections : 8 objections types (slug = c-est-cher, pas-le-temps, herbalife-mlm, deja-essaye, en-parler-conjoint, je-reflechis, trop-beau, combien-tu-gagnes, ton-interet). meaning = ce qu''elle veut dire vraiment. bad_response / good_response = patterns. warning = mention légale éventuelle (revenus, etc.).';

-- C7. Followups (séquence post-appel + suivi client)
create table if not exists public.prospection_followups (
  id          uuid primary key default gen_random_uuid(),
  market_code text not null references public.prospection_markets(code) on delete cascade,
  kind        text not null check (kind in ('post_call', 'client_onboarding', 'reactivation_old')),
  day_offset  integer not null,
  title       text not null,
  body        text not null,
  body_fr     text,
  warning     text,
  position    integer not null default 0,
  active      boolean not null default true,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index if not exists idx_prospection_followups_lookup
  on public.prospection_followups (market_code, kind, day_offset) where active = true;
comment on table public.prospection_followups is
  'Chantier #3 V4 — Section 6 Séquences : post-appel (J0/J+2/J+5/J+30) + suivi client onboarding (J0/J+7/J+30) + réactivation prospect ancien (J+90 à J+180).';

-- C8. Closing (signaux d'achat + scripts proposition/hésitation/non final)
create table if not exists public.prospection_closing (
  id          uuid primary key default gen_random_uuid(),
  market_code text not null references public.prospection_markets(code) on delete cascade,
  kind        text not null check (kind in ('signal', 'propose', 'hesitation', 'final_no')),
  title       text,
  body        text not null,
  body_fr     text,
  position    integer not null default 0,
  active      boolean not null default true,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index if not exists idx_prospection_closing_lookup
  on public.prospection_closing (market_code, kind, position) where active = true;
comment on table public.prospection_closing is
  'Chantier #3 V4 — Section 7 Closing : signaux d''achat à reconnaître (kind=signal, title=signal court, body=description) + 3 scripts (propose / hesitation / final_no).';

-- C9. Special cases (réactivation, ghost, demande recommandation)
create table if not exists public.prospection_special_cases (
  id          uuid primary key default gen_random_uuid(),
  market_code text not null references public.prospection_markets(code) on delete cascade,
  kind        text not null check (kind in ('reactivation_3_6m', 'ghost_after_exchange', 'referral_request')),
  title       text not null,
  body        text not null,
  body_fr     text,
  position    integer not null default 0,
  active      boolean not null default true,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index if not exists idx_prospection_special_cases_lookup
  on public.prospection_special_cases (market_code, kind, position) where active = true;
comment on table public.prospection_special_cases is
  'Chantier #3 V4 — Section 8 Cas spéciaux : réactiver un ancien prospect 3-6 mois (reactivation_3_6m), gérer un ghost après plusieurs échanges (ghost_after_exchange), demander une recommandation après résultats (referral_request).';

-- C10. Storytelling (structure 4 temps + exemples + règles)
create table if not exists public.prospection_storytelling (
  id           uuid primary key default gen_random_uuid(),
  market_code  text not null references public.prospection_markets(code) on delete cascade,
  profile_slug text references public.prospection_profiles(slug) on delete cascade,
  kind         text not null check (kind in ('structure_step', 'example', 'rule')),
  title        text not null,
  body         text not null,
  position     integer not null default 0,
  active       boolean not null default true,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
create index if not exists idx_prospection_storytelling_lookup
  on public.prospection_storytelling (market_code, kind, position) where active = true;
comment on table public.prospection_storytelling is
  'Chantier #3 V4 — Section 9 Storytelling : 4 étapes de structure (kind=structure_step), exemples par profil (kind=example, profile_slug requis), règles transversales (kind=rule).';

-- C11. Routines (30min / 1h + checklist 7 items pré-envoi)
create table if not exists public.prospection_routines (
  id          uuid primary key default gen_random_uuid(),
  market_code text not null references public.prospection_markets(code) on delete cascade,
  kind        text not null check (kind in ('routine_30m', 'routine_1h', 'pre_send_checklist')),
  title       text not null,
  detail      text,
  duration_minutes integer,
  position    integer not null default 0,
  active      boolean not null default true,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index if not exists idx_prospection_routines_lookup
  on public.prospection_routines (market_code, kind, position) where active = true;
comment on table public.prospection_routines is
  'Chantier #3 V4 — Section 10 Routine : routine 30min/jour (kind=routine_30m), routine 1h/jour (kind=routine_1h), checklist 7 items avant envoi M1 (kind=pre_send_checklist). duration_minutes uniquement pour routines (pas checklist).';

-- ============================================================================
-- SECTION D — RLS : lecture publique active=true, écriture admin only
-- ============================================================================
-- Pattern identique aux tables existantes du module.

do $$
declare
  t text;
  tables text[] := array[
    'prospection_mindset_blocks',
    'prospection_metrics',
    'prospection_profile_flags',
    'prospection_sources',
    'prospection_reply_tree',
    'prospection_objections',
    'prospection_followups',
    'prospection_closing',
    'prospection_special_cases',
    'prospection_storytelling',
    'prospection_routines'
  ];
begin
  foreach t in array tables loop
    execute format('alter table public.%I enable row level security', t);

    execute format('drop policy if exists "%s_select_public" on public.%I', t, t);
    execute format('drop policy if exists "%s_admin_write"  on public.%I', t, t);

    execute format(
      'create policy "%s_select_public" on public.%I for select to anon, authenticated using (active = true)',
      t, t
    );
    execute format(
      'create policy "%s_admin_write" on public.%I for all to authenticated using (public.is_admin()) with check (public.is_admin())',
      t, t
    );
  end loop;
end$$;

commit;
