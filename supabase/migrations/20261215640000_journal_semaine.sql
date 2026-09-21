-- =============================================================================
-- Journal nutritionnel — bloc B, 7 : « Ta semaine » (maquette
-- Jt3RNaarpnav5XRGzhrTwz, validée par Thomas le 21/09/2026 : « 2 OK »).
--
--   • `journal_semaine(jeton, lundi)` : ses 7 jours (lundi → dimanche) pour la
--     carte « Ta semaine » et son bilan — protéines du jour, jour noté par elle
--     (le shake pré-rempli au club ne suffit pas), eau atteinte, repas remplis.
--     Par défaut la semaine en cours ; le lundi, celle qui vient de finir.
--   • La notification du dimanche, 19 h 10 à Paris (minute 10 : libre à ces
--     heures-là, jamais la minute 0 — incident Nano du 29/07) : une fois, à
--     celles qui ont noté au moins 3 jours dans la semaine et ont un abonnement.
--     « Camille, ta semaine en 3 chiffres — 5 jours notés · 74 g de protéines par
--     jour · l'eau 3 jours sur 7. » L'edge est `journal-rappel` (mode « semaine »),
--     tri `journal_semaine_cibles()`, anti-doublon `journal_semaines_envoyees`.
-- =============================================================================

create or replace function public.journal_semaine(p_token text, p_lundi date default null)
returns jsonb language plpgsql stable security definer set search_path = public, extensions as $$
declare
  v_client uuid := public._journal_client(p_token);
  v_auj    date := (now() at time zone 'Europe/Paris')::date;
  v_lundi  date;
  v_obj    jsonb := public._journal_objectifs_client(v_client);
  v_eau    numeric := coalesce((v_obj->>'eau_l')::numeric, 2);
begin
  -- La semaine en cours ; le lundi, celle qui vient de finir.
  v_lundi := coalesce(p_lundi, date_trunc('week', v_auj)::date - case when extract(isodow from v_auj) = 1 then 7 else 0 end);
  if extract(isodow from v_lundi) <> 1 or v_lundi > v_auj or v_lundi < v_auj - 35 then
    raise exception 'semaine hors du journal';
  end if;
  return jsonb_build_object(
    'lundi', v_lundi,
    'aujourdhui', v_auj,
    'objectifs', v_obj,
    'jours', (
      select jsonb_agg(jsonb_build_object(
               'jour', d.jour,
               'prot', coalesce((select round(sum(l.prot_g), 1) from public.journal_lignes l
                                  where l.client_id = v_client and l.jour = d.jour), 0),
               'note', exists (select 1 from public.journal_lignes l
                                where l.client_id = v_client and l.jour = d.jour and l.origine in ('membre', 'noaly')),
               'eau_ok', coalesce((select j.verres * 0.25 + case when j.boisson_club then 0.4 else 0 end >= v_eau - 0.05
                                     from public.journal_jours j where j.client_id = v_client and j.jour = d.jour), false),
               -- les repas remplis, club compris : le shake du matin EST son petit-déjeuner
               'creneaux', coalesce((select jsonb_agg(distinct l.creneau) from public.journal_lignes l
                                      where l.client_id = v_client and l.jour = d.jour), '[]'::jsonb))
             order by d.jour)
        from (select (v_lundi + g)::date as jour from generate_series(0, 6) g) d)
  );
end;
$$;
revoke all on function public.journal_semaine(text, date) from public;
grant execute on function public.journal_semaine(text, date) to anon, authenticated;

-- ─── La notification du dimanche ─────────────────────────────────────────────
create table if not exists public.journal_semaines_envoyees (
  client_id uuid not null references public.clients(id) on delete cascade,
  lundi     date not null,
  envoye_le timestamptz not null default now(),
  primary key (client_id, lundi)
);
alter table public.journal_semaines_envoyees enable row level security;
revoke all on public.journal_semaines_envoyees from anon, authenticated;
-- Aucune policy : seul le robot (service_role) lit et écrit cette table.

-- Qui reçoit « ta semaine en 3 chiffres » ce dimanche, avec ses 3 chiffres.
-- Rend le JETON de l'espace membre (le lien) : jamais exécutable par anon ni authenticated.
create or replace function public.journal_semaine_cibles()
returns table (client_id uuid, jeton uuid, prenom text, lundi date, jours_notes integer, moy_prot integer, jours_eau integer)
language sql stable security definer set search_path = public, extensions as $$
  with sem as (
    select date_trunc('week', (now() at time zone 'Europe/Paris')::date)::date as lundi,
           (now() at time zone 'Europe/Paris')::date as auj
  ),
  jours as (
    select l.client_id, l.jour
      from public.journal_lignes l, sem
     where l.jour between sem.lundi and sem.auj and l.origine in ('membre', 'noaly')
     group by l.client_id, l.jour
  ),
  stats as (
    select j.client_id, count(*)::int as jours_notes,
           round(avg((select sum(x.prot_g) from public.journal_lignes x
                       where x.client_id = j.client_id and x.jour = j.jour)))::int as moy_prot
      from jours j
     group by j.client_id
    having count(*) >= 3
  )
  select c.id, acc.token, coalesce(nullif(btrim(c.first_name), ''), acc.client_first_name), sem.lundi,
         s.jours_notes, s.moy_prot,
         (select count(*)::int from public.journal_jours jj
           where jj.client_id = c.id and jj.jour between sem.lundi and sem.auj
             and jj.verres * 0.25 + case when jj.boisson_club then 0.4 else 0 end
                 >= coalesce((public._journal_objectifs_client(c.id)->>'eau_l')::numeric, 2) - 0.05)
    from stats s
    cross join sem
    join public.clients c on c.id = s.client_id
    join lateral (
      select a.token, a.client_first_name
        from public.client_app_accounts a
       where a.client_id = c.id::text              -- text vs uuid : le cast sûr (CLAUDE.md)
         and (a.expires_at is null or a.expires_at > now())
       order by a.created_at desc
       limit 1) acc on true
   where exists (select 1 from public.client_push_subscriptions p where p.client_id = c.id)
     and not exists (select 1 from public.journal_semaines_envoyees e where e.client_id = c.id and e.lundi = sem.lundi);
$$;
revoke all on function public.journal_semaine_cibles() from public, anon, authenticated;
grant execute on function public.journal_semaine_cibles() to service_role;

-- Dimanche 19 h 10 à Paris, été comme hiver : deux passages UTC (17 h 10 et
-- 18 h 10), la fonction ne travaille qu'à 19 h Paris un dimanche.
select cron.unschedule(jobid) from cron.job where jobname = 'journal-semaine';

select cron.schedule(
  'journal-semaine',
  '10 17,18 * * 0',
  $$
  select net.http_post(
    url := 'https://gqxnndwrdbghxflwmfxy.supabase.co/functions/v1/journal-rappel',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name = 'service_role_key')
    ),
    body := '{"mode":"semaine"}'::jsonb,
    timeout_milliseconds := 30000
  );
  $$
);
