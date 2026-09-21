-- =============================================================================
-- Journal nutritionnel — bloc A (21/09/2026, Thomas : « je suis ok pour tout…
-- commence par A »).
--
--   A1 · la remarque de la coach arrive en notification chez la membre
--        (« Thomas t'a laissé un mot dans ton journal ») : déclencheur sur
--        journal_remarques → edge `journal-remarque-notifier`. Même motif que
--        les notifications de la messagerie : secrets lus dans Vault, et un
--        appel raté n'empêche JAMAIS la remarque d'être enregistrée.
--   A3 · la coach voit quelles lignes Noaly a ESTIMÉES (un plat hors
--        catalogue, sans valeur officielle) : `estime` dans journal_semaine_coach.
--   A4 · les plats que Noaly estime le plus souvent, pour les ajouter au
--        catalogue avec des valeurs officielles : journal_estimations_frequentes
--        (admins). Premier ajout : le maïs doux (CIQUAL 20066). La burrata n'est
--        PAS dans CIQUAL 2020 : elle reste estimée, faute de valeur officielle.
--
-- A2 (le journal du jour dans le chat de Noaly) est dans l'edge `noaly` : rien
-- à changer ici, `_journal_objectifs_client` est déjà exécutable par service_role.
-- =============================================================================

-- ─── A1 · la remarque part en notification ───────────────────────────────────
create or replace function public._journal_notifier_remarque()
returns trigger language plpgsql security definer set search_path = public, extensions as $fn$
begin
  perform net.http_post(
    url := (select decrypted_secret from vault.decrypted_secrets where name = 'supabase_url')
           || '/functions/v1/journal-remarque-notifier',
    headers := jsonb_build_object(
      'Authorization', 'Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name = 'service_role_key'),
      'Content-Type', 'application/json'),
    -- Rien d'autre que l'identifiant : l'edge relit la remarque en base.
    body := jsonb_build_object('remarque_id', NEW.id),
    timeout_milliseconds := 5000
  );
  return NEW;
exception when others then
  raise notice '_journal_notifier_remarque: %', SQLERRM;
  return NEW;
end;
$fn$;
revoke all on function public._journal_notifier_remarque() from public, anon, authenticated;

drop trigger if exists journal_remarque_notifier on public.journal_remarques;
create trigger journal_remarque_notifier
  after insert on public.journal_remarques
  for each row execute function public._journal_notifier_remarque();

-- ─── A3 · « estimé » dans la semaine vue par la coach ────────────────────────
-- Recopie À L'IDENTIQUE de la version en ligne (lue le 21/09), une seule
-- différence : `estime` par ligne (aliment absent = plat estimé par Noaly).
create or replace function public.journal_semaine_coach(p_client_id uuid)
returns jsonb language plpgsql stable security invoker set search_path = public, extensions as $$
declare
  v_auj   date := (now() at time zone 'Europe/Paris')::date;
  v_poids numeric;
  v_coef  numeric;
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
  select r.coef_proteines into v_coef from public.journal_reglages r where r.client_id = p_client_id;
  return jsonb_build_object(
    'aujourdhui', v_auj,
    'objectifs', public._journal_objectifs(v_poids, coalesce(v_coef, 1.2)),
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
                           'estime', l.aliment is null)
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

-- ─── A4 · ce que Noaly estime le plus souvent (admins) ───────────────────────
-- Un plat qui revient souvent mérite une valeur officielle dans le catalogue :
-- Noaly le prendra alors en premier choix, et la ligne ne sera plus « estimée ».
create or replace function public.journal_estimations_frequentes(p_jours integer default 30)
returns table (plat text, fois bigint, membres bigint, prot_100g_moyen numeric, grammes_moyen numeric, dernier_jour date)
language plpgsql stable security definer set search_path = public, extensions as $$
begin
  if not public.is_admin() then raise exception 'reserve aux admins'; end if;
  return query
    select lower(btrim(l.libelle)),
           count(*),
           count(distinct l.client_id),
           round(avg(l.prot_100g), 1),
           round(avg(l.grammes)),
           max(l.jour)
      from public.journal_lignes l
     where l.aliment is null
       and l.jour >= (now() at time zone 'Europe/Paris')::date - greatest(1, least(coalesce(p_jours, 30), 365))
     group by lower(btrim(l.libelle))
     order by count(*) desc, max(l.jour) desc
     limit 50;
end;
$$;
revoke all on function public.journal_estimations_frequentes(integer) from public, anon;
grant execute on function public.journal_estimations_frequentes(integer) to authenticated;

insert into public.journal_aliments (cle, nom, famille, herbalife, prot_portion, kcal_portion, prot_100g, kcal_100g, portions, unite, indice, rangs, source)
values ('mais_doux', 'Maïs doux (boîte), égoutté', null, false, null, null, 2.82, 106.0, '{50,100,150}', null, null, '{}'::jsonb,
        'CIQUAL 2020 · 20066 · Maïs doux, appertisé, égoutté')
on conflict (cle) do nothing;
