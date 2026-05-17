-- =============================================================================
-- Chantier #3 — FULL (2026-05-17 nuit, après "tu bâcles" Thomas).
--
-- Ramène TOUT ce qui était dans le brainstorm Égypte chantier #3 :
--   - Étape "Brief méthodo" : GoPro 3 points + posture + erreurs à éviter
--   - Étape "Cibler" enrichie : suggestions de lieux IRL par profil
--   - Tracking : table prospection_attempts (étape 3.7) + RLS coach perso
--   - Stats simples : RPC pour agrégat 7 derniers jours
-- =============================================================================

begin;

-- ─── 1. Briefs méthodo par profil ──────────────────────────────────────────
alter table public.prospection_profiles
  add column if not exists gopro_steps text[] not null default '{}',
  add column if not exists posture text,
  add column if not exists mistakes text[] not null default '{}',
  add column if not exists local_venues_hint text,
  add column if not exists recommended_platforms text[] not null default '{}';

comment on column public.prospection_profiles.gopro_steps is
  'Chantier #3 V3 — Méthode GoPro résumée en 3 points pour ce profil. Affiché étape Brief.';
comment on column public.prospection_profiles.posture is
  'Chantier #3 V3 — Posture à adopter (indirecte, qualifiante) pour ce profil.';
comment on column public.prospection_profiles.mistakes is
  'Chantier #3 V3 — 3 erreurs à éviter en prospection sur ce profil.';
comment on column public.prospection_profiles.local_venues_hint is
  'Chantier #3 V3 — Suggestions de lieux IRL où croiser ce profil (étape Cibler).';
comment on column public.prospection_profiles.recommended_platforms is
  'Chantier #3 V3 — Plateformes recommandées pour ce profil (insta/fb/linkedin/whatsapp/tiktok).';

-- Population brief méthodo par profil
update public.prospection_profiles set
  gopro_steps = array[
    'Sois Posée : pas pressée, pas vendeuse. Tu écoutes plus que tu parles.',
    'Sois Indirecte : qualifie son envie avant de proposer quoi que ce soit.',
    'Sois Authentique : raconte ton propre déclic, pas un argumentaire.'
  ],
  posture = E'Tu n''es pas une marque qui démarche. Tu es une femme/un homme qui a trouvé une approche qui marche pour la perte de poids et qui partage avec ceux à qui ça pourrait servir. Tu qualifies AVANT de proposer. Si la personne ne te dit pas explicitement "je veux perdre du poids", tu ne pitches PAS.',
  mistakes = array[
    'Pitcher dès le 1er message ("Salut, je vends Herbalife, ça t''intéresse ?") → grillé direct.',
    'Demander de "voir son profil" ou de l''ajouter en ami sans contexte → flag spam.',
    'Insister à J+1 puis J+2 puis J+3 → harcèlement perçu. Une seule relance soft à J+3 max.'
  ],
  local_venues_hint = E'IRL : salles de sport (cours collectifs, pas musculation), marchés bio, magasins healthy, parcs de jogging matin, sorties de crèches, écoles maternelles. Online : groupes Facebook "perte de poids [ville]", commentaires comptes coachs nutrition.',
  recommended_platforms = array['insta', 'fb', 'whatsapp']
where slug = 'weight';

update public.prospection_profiles set
  gopro_steps = array[
    'Parle PERFORMANCE et RÉCUPÉRATION, jamais perte de poids ni régime.',
    'Reconnais sa pratique : précise le sport, le niveau, le détail spécifique de son post.',
    'Pose une question ouverte sur sa nutrition actuelle — laisse-le se livrer.'
  ],
  posture = E'Tu accompagnes des sportifs amateurs sur la nutrition adaptée à leur discipline. Tu connais ton sujet (récup post-effort, fenêtre métabolique, protéines, hydratation). Tu n''es PAS une coach minceur qui se déguise — c''est un autre métier. Ton angle : "souvent ce qui débloque la perf, c''est ce qu''on mange après l''entraînement".',
  mistakes = array[
    'Mentionner perte de poids → le sportif décroche, c''est pas son problème.',
    'Étaler un palmarès Herbalife → il s''en fout, il veut du concret nutrition.',
    'Proposer un programme "minceur" → mismatch total, propose un protocole RÉCUP/PERF.'
  ],
  local_venues_hint = E'IRL : box CrossFit, clubs de running, salles d''escalade, triathlon clubs, courses populaires (départ + arrivée), grandes surfaces sport. Online : Strava clubs, Garmin Connect, comptes Insta de coachs préparation physique.',
  recommended_platforms = array['insta', 'whatsapp', 'fb']
where slug = 'sport';

update public.prospection_profiles set
  gopro_steps = array[
    'Positionne-toi entrepreneur d''abord : ton activité Herbalife est un side-business, pas un MLM 24/7.',
    'Parle revenus complémentaires, liberté géographique, équipe internationale.',
    'Propose un appel découverte 15-20 min, pas une réunion d''opportunité de 1h.'
  ],
  posture = E'Tu construis un business en parallèle de ta vie pro et tu cherches des profils ambitieux pour bâtir une équipe. Tu n''es PAS recruteur d''un réseau opaque — tu es un pair entrepreneur. Sur LinkedIn : ton corporate, vouvoiement, structure courte. Sur Insta : ton complice. Rassure : "à côté de ma vie pro", "sans engagement", "appel découverte 15 min".',
  mistakes = array[
    'Mentionner Herbalife dès le 1er message → biais MLM ancré, perte du prospect.',
    'Promettre des chiffres précis ("tu peux gagner 3000€/mois") → légal-out + crédibilité grillée.',
    'Inviter à une réunion d''opportunité Zoom de 1h → personne ne vient. Préfère un 1-to-1 15 min.'
  ],
  local_venues_hint = E'IRL : événements business locaux, BNI, French Tech, espaces coworking, conférences entrepreneuriat (Marseille, Lyon, Bordeaux). Online : commentaires posts entrepreneurs Insta, groupes Facebook "side hustle", LinkedIn (recherche par poste + secteur).',
  recommended_platforms = array['insta', 'linkedin', 'whatsapp']
where slug = 'business';

-- ─── 2. Table prospection_attempts (tracking V2 réintégré) ─────────────────
create table if not exists public.prospection_attempts (
  id                       uuid primary key default gen_random_uuid(),
  coach_id                 uuid not null references public.users(id) on delete cascade,
  market_code              text not null references public.prospection_markets(code) on delete restrict,
  profile_slug             text not null references public.prospection_profiles(slug) on delete restrict,
  platform                 text not null check (platform in ('insta', 'fb', 'whatsapp', 'telegram', 'linkedin', 'sms', 'tiktok')),
  target_label             text,
  target_handle            text,
  first_message_sent_at    timestamptz not null default now(),
  response_status          text not null default 'pending'
    check (response_status in ('pending', 'positive', 'curious', 'negative', 'no_response')),
  converted_to_lead_id     uuid,
  note                     text,
  created_at               timestamptz not null default now(),
  updated_at               timestamptz not null default now()
);

create index if not exists idx_prospection_attempts_coach_date
  on public.prospection_attempts (coach_id, first_message_sent_at desc);

comment on table public.prospection_attempts is
  'Chantier #3 — Tracking des sessions de prospection cold par coach. Permet stats simples (envois 7 derniers jours, taux de réponse, conversion en Lead).';

alter table public.prospection_attempts enable row level security;

drop policy if exists "prospection_attempts_owner_select" on public.prospection_attempts;
drop policy if exists "prospection_attempts_owner_insert" on public.prospection_attempts;
drop policy if exists "prospection_attempts_owner_update" on public.prospection_attempts;
drop policy if exists "prospection_attempts_owner_delete" on public.prospection_attempts;
drop policy if exists "prospection_attempts_admin_all"   on public.prospection_attempts;

-- Le coach voit/édite uniquement ses propres attempts.
create policy "prospection_attempts_owner_select"
  on public.prospection_attempts for select to authenticated
  using (coach_id = auth.uid());

create policy "prospection_attempts_owner_insert"
  on public.prospection_attempts for insert to authenticated
  with check (coach_id = auth.uid());

create policy "prospection_attempts_owner_update"
  on public.prospection_attempts for update to authenticated
  using (coach_id = auth.uid()) with check (coach_id = auth.uid());

create policy "prospection_attempts_owner_delete"
  on public.prospection_attempts for delete to authenticated
  using (coach_id = auth.uid());

-- Admin voit tout (pour debug / stats globales).
create policy "prospection_attempts_admin_all"
  on public.prospection_attempts for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- ─── 3. RPC stats simples (7 derniers jours pour le coach courant) ─────────
create or replace function public.get_prospection_stats(p_user_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_total_7d        integer;
  v_responses_7d    integer;
  v_positive_7d     integer;
  v_conversions_7d  integer;
  v_total_30d       integer;
begin
  if p_user_id is null then
    return null;
  end if;

  select
    count(*) filter (where first_message_sent_at >= now() - interval '7 days'),
    count(*) filter (where first_message_sent_at >= now() - interval '7 days'
                       and response_status in ('positive','curious','negative')),
    count(*) filter (where first_message_sent_at >= now() - interval '7 days'
                       and response_status = 'positive'),
    count(*) filter (where first_message_sent_at >= now() - interval '7 days'
                       and converted_to_lead_id is not null),
    count(*) filter (where first_message_sent_at >= now() - interval '30 days')
  into v_total_7d, v_responses_7d, v_positive_7d, v_conversions_7d, v_total_30d
  from public.prospection_attempts
  where coach_id = p_user_id;

  return jsonb_build_object(
    'total_7d',       coalesce(v_total_7d, 0),
    'responses_7d',   coalesce(v_responses_7d, 0),
    'positive_7d',    coalesce(v_positive_7d, 0),
    'conversions_7d', coalesce(v_conversions_7d, 0),
    'total_30d',      coalesce(v_total_30d, 0)
  );
end;
$$;

grant execute on function public.get_prospection_stats(uuid) to authenticated;

comment on function public.get_prospection_stats(uuid) is
  'Chantier #3 — Stats prospection cold du coach (7 et 30 derniers jours).';

commit;
