-- =============================================================================
-- Les XP des membres — côté coach, côté club, côté bar (24/09/2026).
-- Maquette v2 (artifact YDW71DpnUpiPxWdoFqEESB) validée par Thomas : « × 5,
-- plafond 750 par mois (= un extra, donc achat de quelque chose), go pour les
-- 6 blocs ». Principe gravé : les XP restent un indicateur de régularité — ils
-- n'ajoutent AUCUN chiffre à la lecture prot / eau / kcal du journal.
--
--  1. La coach LIT les XP de ses clientes (policy = sous-requête sur clients).
--  2. `_record_client_xp_interne(client_id, action…)` : le cœur de
--     `record_client_xp`, appelable par client_id depuis d'autres fonctions
--     (pointage, geste coach). Nouvelles actions : club_visite +5 (1/jour),
--     club_10_visites +50, club_carte_finie +50 (par carte), coach_bravo +10,
--     coach_defi +20, coach_club +10 (un geste coach par jour et par membre).
--     Quand un niveau est franchi, la base le dit elle-même à l'edge
--     `client-app-level-up-notify` (push coach) — avant, seul le front le
--     signalait, et l'edge écrivait dans `coach_reminders` que rien ne lit.
--  3. `bbc_add_visit` donne les XP du club.
--  4. `xp_donner_coach(client, raison, mot)` + trigger → edge `xp-don-notifier`
--     (« Thomas t'a donné 20 XP · défi tenu »).
--  5. `xp_apercu_coach()` (SECURITY INVOKER) : niveau, total, gains 7 j, date
--     de montée — un seul appel pour la liste, la fiche, le Matin, Contacter.
--  6. `journal_semaine_coach` rend aussi kcal et heure par ligne (le repas en
--     détail, bloc 6).
--  7. Le pont vers le Shake Bar : `xp_versements_bar` (ce qui a été versé et
--     ce qui attend), `xp_a_verser_bar(lundi)` (service_role : la liste du
--     lundi, × 5, plafond 750 XP bar par mois, bonus de niveau compris),
--     cron `xp-vers-le-bar` le lundi 5 h 10 UTC (7 h 10 Paris l'été).
--  8. Les 5 « a atteint le niveau » de `coach_reminders` jamais vus : clos.
-- =============================================================================

-- ── 0. Colonnes : le geste d'une coach porte son nom et son mot ─────────────
alter table public.client_xp_events
  add column if not exists coach_id uuid,
  add column if not exists mot text;
comment on column public.client_xp_events.coach_id is 'Renseigné quand une coach a DONNÉ ces XP (bravo, défi tenu, geste du club).';
comment on column public.client_xp_events.mot is 'Le mot qui accompagne un geste coach (facultatif, 280 caractères).';

-- ── 1. La coach lit les XP des clientes qu'elle voit (jamais ::uuid) ────────
drop policy if exists client_xp_events_coach_lit on public.client_xp_events;
create policy client_xp_events_coach_lit on public.client_xp_events
  for select to authenticated
  using (exists (select 1 from public.clients c where c.id::text = client_xp_events.client_id));

-- ── 2. Le niveau (miroir de CLIENT_XP_LEVELS, actions.ts) ───────────────────
create or replace function public._xp_niveau(p_total integer)
returns smallint language sql immutable as $$
  select (case when p_total >= 1500 then 5 when p_total >= 700 then 4
               when p_total >= 300 then 3 when p_total >= 100 then 2 else 1 end)::smallint
$$;
revoke all on function public._xp_niveau(integer) from anon;

-- ── 3. Le pont vers le bar : la table d'abord (le cœur l'alimente) ──────────
create table if not exists public.xp_versements_bar (
  id           uuid primary key default gen_random_uuid(),
  client_id    text not null,
  -- 'semaine' : les XP coaching de la semaine × 5 · 'niveau_2'… : le bonus d'un niveau franchi
  motif        text not null,
  semaine      date,                       -- le lundi de la semaine versée (motif 'semaine')
  xp_coaching  integer not null default 0, -- ce qu'elle a gagné chez nous
  xp_bar       integer not null default 0, -- ce qui est parti au bar (après × 5 et plafond)
  statut       text not null default 'a_verser'
               check (statut in ('a_verser', 'verse', 'sans_compte', 'plafond', 'erreur')),
  bar_user_id  uuid,
  detail       text,
  cree_le      timestamptz not null default now(),
  verse_le     timestamptz
);
create index if not exists xp_versements_bar_client_idx on public.xp_versements_bar (client_id, cree_le desc);
create unique index if not exists xp_versements_bar_semaine_uq on public.xp_versements_bar (client_id, semaine) where motif = 'semaine';
alter table public.xp_versements_bar enable row level security;
revoke all on public.xp_versements_bar from anon, authenticated;
grant select on public.xp_versements_bar to authenticated;
drop policy if exists xp_versements_bar_coach_lit on public.xp_versements_bar;
create policy xp_versements_bar_coach_lit on public.xp_versements_bar
  for select to authenticated
  using (exists (select 1 from public.clients c where c.id::text = xp_versements_bar.client_id));
comment on table public.xp_versements_bar is
  'Le pont vers le Shake Bar : chaque lundi, les XP coaching de la semaine × 5 (plafond 750 XP bar par mois, bonus de niveau compris) partent sur le compte du bar (même e-mail). Écrit par l''edge xp-vers-le-bar et par _record_client_xp_interne (bonus).';

-- ── 4. Le cœur : par client_id ──────────────────────────────────────────────
create or replace function public._record_client_xp_interne(
  p_client_id text,
  p_action_key text,
  p_suffixe text default null,
  p_coach uuid default null,
  p_mot text default null
) returns jsonb
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_xp int := 0;
  v_dedup_key text;
  v_today text := to_char(now() at time zone 'Europe/Paris', 'YYYY-MM-DD');
  v_week  text := to_char(now() at time zone 'Europe/Paris', 'IYYY-"W"IW');
  v_inserted_id uuid;
  v_avant int := 0;
  v_total int := 0;
  v_niv_avant smallint;
  v_niv_apres smallint;
  v_bonus int;
begin
  if p_client_id is null then
    return jsonb_build_object('error', 'invalid_client');
  end if;

  case p_action_key
    -- 1× à vie
    when 'first_login'         then v_xp := 50;  v_dedup_key := 'first_login';
    when 'install_pwa'         then v_xp := 50;  v_dedup_key := 'install_pwa';
    when 'sandbox_completed'   then v_xp := 100; v_dedup_key := 'sandbox_completed';
    when 'tutorial_completed'  then v_xp := 30;  v_dedup_key := 'tutorial_completed';
    when 'silhouette_complete' then v_xp := 50;  v_dedup_key := 'silhouette_complete';
    when 'telegram_joined'     then v_xp := 30;  v_dedup_key := 'telegram_joined';
    when 'anniversary_1m'      then v_xp := 200; v_dedup_key := 'anniversary_1m';
    when 'anniversary_3m'      then v_xp := 500; v_dedup_key := 'anniversary_3m';
    when 'anniversary_6m'      then v_xp := 800; v_dedup_key := 'anniversary_6m';
    when 'google_review'       then v_xp := 200; v_dedup_key := 'google_review';
    when 'tab_agenda'          then v_xp := 5;   v_dedup_key := 'tab_agenda';
    when 'tab_pv'              then v_xp := 5;   v_dedup_key := 'tab_pv';
    when 'tab_evolution'       then v_xp := 5;   v_dedup_key := 'tab_evolution';
    when 'tab_conseils'        then v_xp := 5;   v_dedup_key := 'tab_conseils';
    when 'message_sent'        then v_xp := 15;  v_dedup_key := 'message_sent';
    -- 1× par jour
    when 'mood_checkin'        then v_xp := 5;   v_dedup_key := 'mood_checkin_' || v_today;
    when 'journal_note'        then v_xp := 5;   v_dedup_key := 'journal_note_' || v_today;
    when 'journal_proteines'   then v_xp := 5;   v_dedup_key := 'journal_proteines_' || v_today;
    when 'journal_eau'         then v_xp := 5;   v_dedup_key := 'journal_eau_' || v_today;
    when 'journal_complete'    then v_xp := 5;   v_dedup_key := 'journal_complete_' || v_today;
    when 'journal_actif'       then v_xp := 5;   v_dedup_key := 'journal_actif_' || v_today;
    -- Le club (24/09) : un pointage = +5 (1× par jour), la 10e visite = +50, une carte finie = +50
    when 'club_visite'         then v_xp := 5;   v_dedup_key := 'club_visite_' || v_today;
    when 'club_10_visites'     then v_xp := 50;  v_dedup_key := 'club_10_visites';
    when 'club_carte_finie'    then v_xp := 50;  v_dedup_key := 'club_carte_' || coalesce(p_suffixe, v_today);
    -- Le geste d'une coach (24/09) : une seule fois par jour, quelle que soit la raison
    when 'coach_bravo'         then v_xp := 10;  v_dedup_key := 'coach_don_' || v_today;
    when 'coach_defi'          then v_xp := 20;  v_dedup_key := 'coach_don_' || v_today;
    when 'coach_club'          then v_xp := 10;  v_dedup_key := 'coach_don_' || v_today;
    -- 1× par semaine
    when 'measurement_added'   then v_xp := 10;  v_dedup_key := 'measurement_added_' || v_week;
    when 'weekly_weigh_in'     then v_xp := 20;  v_dedup_key := 'weigh_in_' || v_week;
    -- 1× par an
    when 'happy_birthday'      then v_xp := 100; v_dedup_key := 'happy_birthday_' || to_char(now() at time zone 'Europe/Paris', 'YYYY');
    -- sans plafond
    when 'photo_uploaded'      then v_xp := 50;  v_dedup_key := 'photo_' || extract(epoch from now())::text;
    -- VIP
    when 'vip_sandbox_completed'  then v_xp := 20;   v_dedup_key := 'vip_sandbox_completed';
    when 'vip_intentions_filled'  then v_xp := 30;   v_dedup_key := 'vip_intentions_filled';
    when 'vip_first_referral'     then v_xp := 100;  v_dedup_key := 'vip_first_referral';
    when 'vip_silver_reached'     then v_xp := 200;  v_dedup_key := 'vip_silver_reached';
    when 'vip_gold_reached'       then v_xp := 500;  v_dedup_key := 'vip_gold_reached';
    when 'vip_ambassador_reached' then v_xp := 1000; v_dedup_key := 'vip_ambassador_reached';
    else
      return jsonb_build_object('error', 'unknown_action', 'action_key', p_action_key);
  end case;

  select coalesce(sum(xp_amount), 0)::int into v_avant
    from public.client_xp_events where client_id = p_client_id;

  insert into public.client_xp_events (client_id, action_key, xp_amount, dedup_key, coach_id, mot)
  values (p_client_id, p_action_key, v_xp, v_dedup_key, p_coach, nullif(left(trim(coalesce(p_mot, '')), 280), ''))
  on conflict (client_id, dedup_key) do nothing
  returning id into v_inserted_id;

  if v_inserted_id is null then
    return jsonb_build_object('gained_xp', 0, 'total_xp', v_avant, 'action_key', p_action_key, 'already_gained', true);
  end if;

  v_total := v_avant + v_xp;
  v_niv_avant := public._xp_niveau(v_avant);
  v_niv_apres := public._xp_niveau(v_total);

  if v_niv_apres > v_niv_avant then
    -- Le bonus du bar pour ce niveau : +250 · +500 · +750 · +750 (dans le plafond mensuel).
    v_bonus := case v_niv_apres when 2 then 250 when 3 then 500 else 750 end;
    insert into public.xp_versements_bar (client_id, motif, xp_coaching, xp_bar, statut, detail)
    values (p_client_id, 'niveau_' || v_niv_apres, 0, v_bonus, 'a_verser', 'Niveau ' || v_niv_apres || ' atteint');

    -- La coach est prévenue par l'edge (push) — jamais bloquant.
    begin
      perform net.http_post(
        url := (select decrypted_secret from vault.decrypted_secrets where name = 'supabase_url')
               || '/functions/v1/client-app-level-up-notify',
        headers := jsonb_build_object(
          'Authorization', 'Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name = 'service_role_key'),
          'Content-Type', 'application/json'),
        body := jsonb_build_object('client_id', p_client_id, 'level', v_niv_apres, 'total_xp', v_total),
        timeout_milliseconds := 5000
      );
    exception when others then
      raise notice '_record_client_xp_interne level-up notify: %', SQLERRM;
    end;
  end if;

  return jsonb_build_object(
    'gained_xp', v_xp, 'total_xp', v_total, 'action_key', p_action_key, 'already_gained', false,
    'level_up', v_niv_apres > v_niv_avant, 'level', v_niv_apres
  );
end;
$$;
revoke all on function public._record_client_xp_interne(text, text, text, uuid, text) from anon, authenticated;

-- `record_client_xp(jeton, action)` garde sa signature et sa réponse : il résout le jeton, le cœur fait le reste.
create or replace function public.record_client_xp(p_token text, p_action_key text)
returns jsonb
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_client_id text;
begin
  v_client_id := public._resolve_client_id_from_token(p_token);
  if v_client_id is null then
    return jsonb_build_object('error', 'invalid_token');
  end if;
  return public._record_client_xp_interne(v_client_id, p_action_key);
end;
$$;

-- ── 5. Le pointage donne des XP ─────────────────────────────────────────────
create or replace function public.bbc_add_visit(p_client_id uuid)
returns json
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_agit uuid;
  v_name text;
  v_card record;
  v_used integer := 0;
  v_total integer;
  v_total_toutes integer;
  v_recent boolean;
  v_premiere boolean := false;
  v_xp jsonb := null;
begin
  select first_name into v_name from public.clients where id = p_client_id;
  v_agit := public.bbc_agir_pour(p_client_id);

  select * into v_card from public.member_cards
  where client_id = p_client_id and closed_at is null
    and (expires_at is null or expires_at > now())
  order by started_at desc limit 1;

  select exists (
    select 1 from public.club_visits
    where client_id = p_client_id and coach_user_id = v_agit
      and visited_at > now() - interval '10 minutes'
  ) into v_recent;

  if v_card.id is not null then
    select count(*) = 0 into v_premiere from public.club_visits where card_id = v_card.id;
  end if;

  if not v_recent then
    insert into public.club_visits (client_id, coach_user_id, card_id)
    values (p_client_id, v_agit, v_card.id);

    -- Son petit-déjeuner du club dans son journal, tout de suite (23/09).
    perform public._journal_prerempli_club(p_client_id, (now() at time zone 'Europe/Paris')::date);

    -- Une visite, des XP (24/09) : +5 le jour même, +50 à la 10e visite, +50 quand la carte se finit.
    v_xp := public._record_client_xp_interne(p_client_id::text, 'club_visite');
    select count(*) into v_total_toutes from public.club_visits where client_id = p_client_id;
    if v_total_toutes >= 10 then
      perform public._record_client_xp_interne(p_client_id::text, 'club_10_visites');
    end if;

    if v_card.id is not null then
      if v_premiere then
        update public.member_cards
          set started_at = now(),
              expires_at = case
                when expires_at is null then null
                else now() + (expires_at - started_at)
              end
        where id = v_card.id;
      end if;

      select count(*) into v_used from public.club_visits where card_id = v_card.id;
      if v_used >= v_card.card_type then
        update public.member_cards set closed_at = now() where id = v_card.id;
        perform public._record_client_xp_interne(p_client_id::text, 'club_carte_finie', v_card.id::text);
      end if;
    end if;
  end if;

  if v_card.id is not null then
    select count(*) into v_used from public.club_visits where card_id = v_card.id;
  end if;

  select count(*) into v_total from public.club_visits
  where client_id = p_client_id and coach_user_id = v_agit;

  return json_build_object(
    'client_name', coalesce(v_name, 'membre'),
    'total_visits', v_total,
    'card_type', v_card.card_type,
    'card_used', v_used,
    'card_remaining', case when v_card.id is null then null else greatest(v_card.card_type - v_used, 0) end,
    'already_counted', v_recent,
    'xp_gained', coalesce((v_xp->>'gained_xp')::int, 0)
  );
end;
$$;

-- ── 6. Le geste d'une coach : +XP, une fois par jour et par membre ──────────
create or replace function public.xp_donner_coach(p_client uuid, p_raison text, p_mot text default null)
returns jsonb
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_moi uuid := auth.uid();
  v_action text;
  r jsonb;
begin
  if v_moi is null then
    raise exception 'non authentifie';
  end if;
  -- Même règle que la fiche : la cliente est à moi, ou je suis admin.
  if not exists (
    select 1 from public.clients c
     where c.id = p_client and (public.is_admin() or c.distributor_id = v_moi)
  ) then
    raise exception 'non autorise';
  end if;

  v_action := case p_raison
    when 'bravo' then 'coach_bravo'
    when 'defi'  then 'coach_defi'
    when 'club'  then 'coach_club'
    else null end;
  if v_action is null then
    raise exception 'raison inconnue';
  end if;

  r := public._record_client_xp_interne(p_client::text, v_action, null, v_moi, p_mot);
  if coalesce((r->>'already_gained')::boolean, false) then
    return jsonb_build_object('error', 'deja_aujourdhui', 'total_xp', r->'total_xp');
  end if;
  return r;
end;
$$;
revoke all on function public.xp_donner_coach(uuid, text, text) from anon;

-- Le mot part en notification à la membre : trigger → edge `xp-don-notifier` (même motif que la remarque du journal).
create or replace function public._xp_notifier_don()
returns trigger
language plpgsql
security definer
set search_path = public, extensions
as $$
begin
  perform net.http_post(
    url := (select decrypted_secret from vault.decrypted_secrets where name = 'supabase_url')
           || '/functions/v1/xp-don-notifier',
    headers := jsonb_build_object(
      'Authorization', 'Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name = 'service_role_key'),
      'Content-Type', 'application/json'),
    body := jsonb_build_object('event_id', NEW.id),
    timeout_milliseconds := 5000
  );
  return NEW;
exception when others then
  raise notice '_xp_notifier_don: %', SQLERRM;
  return NEW;
end;
$$;
drop trigger if exists xp_don_notifier on public.client_xp_events;
create trigger xp_don_notifier
  after insert on public.client_xp_events
  for each row when (NEW.coach_id is not null)
  execute function public._xp_notifier_don();

-- ── 7. L'aperçu de la coach : niveau, total, gains 7 j, montée ──────────────
create or replace function public.xp_apercu_coach()
returns table (
  client_id  uuid,
  total      integer,
  niveau     smallint,
  gains_7j   integer,
  dernier    date,      -- dernier gain
  monte_le   date       -- le jour où le niveau actuel a été atteint (null au niveau 1)
)
language sql
stable
security invoker
set search_path = public, extensions
as $$
  with mes as (
    select c.id::text as cid from public.clients c
  ),
  ev as (
    select e.client_id, e.xp_amount, (e.created_at at time zone 'Europe/Paris')::date as jour,
           sum(e.xp_amount) over (partition by e.client_id order by e.created_at, e.id) as cumul
      from public.client_xp_events e
      join mes on mes.cid = e.client_id
  ),
  tot as (
    select client_id,
           sum(xp_amount)::int as total,
           sum(xp_amount) filter (where jour >= (now() at time zone 'Europe/Paris')::date - 6)::int as gains_7j,
           max(jour) as dernier
      from ev group by client_id
  ),
  seuil as (
    select t.*, public._xp_niveau(t.total) as niveau,
           (case public._xp_niveau(t.total) when 5 then 1500 when 4 then 700 when 3 then 300 when 2 then 100 else 0 end) as s
      from tot t
  )
  select s.client_id::uuid, s.total, s.niveau, coalesce(s.gains_7j, 0), s.dernier,
         case when s.s = 0 then null
              else (select min(e.jour) from ev e where e.client_id = s.client_id and e.cumul >= s.s) end
    from seuil s
$$;
revoke all on function public.xp_apercu_coach() from anon;

-- ── 8. Le repas en détail : kcal et heure par ligne ─────────────────────────
create or replace function public.journal_semaine_coach(p_client_id uuid)
returns jsonb
language plpgsql
stable
set search_path = public, extensions
as $$
declare
  v_auj   date := (now() at time zone 'Europe/Paris')::date;
  v_poids numeric;
  v_coef  numeric;
  v_kcal  boolean;
begin
  -- Le RLS de `clients` décide : une coach qui ne voit pas la cliente ne voit pas son journal.
  if not exists (select 1 from public.clients c where c.id = p_client_id) then
    raise exception 'non autorise';
  end if;
  select replace(a.body_scan->>'weight', ',', '.')::numeric into v_poids
    from public.assessments a
   where a.client_id = p_client_id
     and (a.body_scan->>'weight') ~ '^[0-9]+([.,][0-9]+)?$'
     and replace(a.body_scan->>'weight', ',', '.')::numeric > 0
   order by a.date desc nulls last, a.created_at desc
   limit 1;
  select r.coef_proteines, r.kcal_visibles into v_coef, v_kcal from public.journal_reglages r where r.client_id = p_client_id;
  return jsonb_build_object(
    'aujourdhui', v_auj,
    'objectifs', public._journal_objectifs(v_poids, coalesce(v_coef, 1.2)),
    'kcal_visibles', coalesce(v_kcal, true),
    'jours', (
      select jsonb_agg(jsonb_build_object(
               'jour', d.jour,
               'verres', coalesce(j.verres, 0),
               'boisson_club', coalesce(j.boisson_club, false),
               'activite', j.activite,
               'humeur', j.humeur,
               'lignes', coalesce((
                  select jsonb_agg(jsonb_build_object(
                           'creneau', l.creneau, 'libelle', l.libelle, 'grammes', l.grammes,
                           'quantite', l.quantite, 'prot_g', l.prot_g, 'origine', l.origine,
                           'estime', l.aliment is null,
                           -- Le repas en détail (24/09) : les kcal de la ligne et l'heure où elle l'a notée.
                           'kcal', public._journal_kcal_ligne(l.aliment, l.grammes, l.quantite, l.kcal_100g),
                           'heure', l.cree_le)
                         order by l.cree_le)
                    from public.journal_lignes l
                   where l.client_id = p_client_id and l.jour = d.jour), '[]'::jsonb))
             order by d.jour)
        from (select (v_auj - g)::date as jour from generate_series(6, 0, -1) g) d
        left join public.journal_jours j on j.client_id = p_client_id and j.jour = d.jour),
    'remarque', (
      select jsonb_build_object('texte', r.texte, 'changements', r.changements, 'le', r.cree_le)
        from public.journal_remarques r
       where r.client_id = p_client_id
       order by r.cree_le desc limit 1)
  );
end;
$$;

-- ── 9. Le lundi : ce qui part au bar (service_role seulement) ───────────────
-- × 5, plafond 750 XP bar par mois (bonus de niveau compris) : « un extra,
-- donc achat de quelque chose » (Thomas, 24/09). Rend une ligne par cliente
-- ayant gagné quelque chose la semaine passée ou un bonus en attente.
create or replace function public.xp_a_verser_bar(p_lundi date default null)
returns table (
  client_id     text,
  email         text,
  prenom        text,
  semaine       date,
  xp_coaching   integer,
  bonus_ids     uuid[],
  bonus_xp      integer,
  deja_ce_mois  integer,
  a_verser      integer
)
language sql
stable
security definer
set search_path = public, extensions
as $$
  with params as (
    select coalesce(p_lundi, date_trunc('week', (now() at time zone 'Europe/Paris')::date - 7)::date) as lundi
  ),
  gains as (
    select e.client_id, sum(e.xp_amount)::int as xp
      from public.client_xp_events e, params p
     where (e.created_at at time zone 'Europe/Paris')::date between p.lundi and p.lundi + 6
       and e.dedup_key not like 'bar_%'
     group by e.client_id
  ),
  bonus as (
    select v.client_id, array_agg(v.id) as ids, sum(v.xp_bar)::int as xp
      from public.xp_versements_bar v
     where v.statut = 'a_verser' and v.motif like 'niveau_%'
     group by v.client_id
  ),
  deja as (
    select v.client_id, sum(v.xp_bar)::int as xp
      from public.xp_versements_bar v
     where v.statut = 'verse'
       and date_trunc('month', v.verse_le at time zone 'Europe/Paris') = date_trunc('month', now() at time zone 'Europe/Paris')
     group by v.client_id
  ),
  tout as (
    select coalesce(g.client_id, b.client_id) as client_id,
           coalesce(g.xp, 0) as xp, b.ids, coalesce(b.xp, 0) as bxp
      from gains g full join bonus b on b.client_id = g.client_id
  )
  select t.client_id, c.email, c.first_name, p.lundi, t.xp, t.ids, t.bxp,
         coalesce(d.xp, 0),
         greatest(0, least(t.xp * 5 + t.bxp, 750 - coalesce(d.xp, 0)))
    from tout t
    cross join params p
    join public.clients c on c.id::text = t.client_id
    left join deja d on d.client_id = t.client_id
   where not exists (select 1 from public.xp_versements_bar v where v.client_id = t.client_id and v.motif = 'semaine' and v.semaine = p.lundi)
     and (t.xp > 0 or t.bxp > 0)
$$;
revoke all on function public.xp_a_verser_bar(date) from anon, authenticated;

-- Ce que la membre voit de ses versements (jeton) : le dernier, le total du mois, le plafond.
create or replace function public.xp_bar_resume_membre(p_token text)
returns jsonb
language sql
stable
security definer
set search_path = public, extensions
as $$
  with moi as (select public._resolve_client_id_from_token(p_token) as cid)
  select jsonb_build_object(
    'dernier', (select jsonb_build_object('xp_bar', v.xp_bar, 'le', v.verse_le, 'motif', v.motif)
                  from public.xp_versements_bar v, moi where v.client_id = moi.cid and v.statut = 'verse'
                 order by v.verse_le desc limit 1),
    'ce_mois', (select coalesce(sum(v.xp_bar), 0) from public.xp_versements_bar v, moi
                 where v.client_id = moi.cid and v.statut = 'verse'
                   and date_trunc('month', v.verse_le at time zone 'Europe/Paris') = date_trunc('month', now() at time zone 'Europe/Paris')),
    'plafond', 750,
    'sans_compte', exists (select 1 from public.xp_versements_bar v, moi where v.client_id = moi.cid and v.statut = 'sans_compte' and v.cree_le > now() - interval '35 days')
  ) from moi where moi.cid is not null
$$;

-- ── 10. Le cron du lundi (5 h 10 UTC = 7 h 10 Paris l'été ; jamais la minute 0) ──
select cron.unschedule(jobid) from cron.job where jobname = 'xp-vers-le-bar';
select cron.schedule('xp-vers-le-bar', '10 5 * * 1', $cmd$
  select net.http_post(
    url := 'https://gqxnndwrdbghxflwmfxy.supabase.co/functions/v1/xp-vers-le-bar',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name = 'service_role_key')
    ),
    body := '{"mode":"verser"}'::jsonb,
    timeout_milliseconds := 60000
  );
$cmd$);

-- ── 11. Les montées de niveau écrites dans le vide : closes ─────────────────
update public.coach_reminders
   set status = 'done', done_at = now(),
       note = coalesce(note, '') || ' · clos le 24/09/2026 : la montée de niveau arrive désormais en notification et sur le Matin.'
 where label like '% a atteint le niveau %' and status = 'pending';
