-- =============================================================================
-- Le comptoir du club — lot 2 : « à la maison » (26/09/2026).
-- « go lot 2 » de Thomas. Maquette v3 (SHZYSBaqfgWVqdMncgrcPG) : « À la maison ·
-- depuis vendredi » sur sa fiche, « Club fermé dimanche, elle revient lundi » +
-- de quoi tenir + le pack 6 jours au pointage, « son F1 arrive au bout » dans
-- Contacter. Réflexion : docs/REFLEXION_MONETISATION_2026-09.md.
--
-- LA RÈGLE (Thomas, maquette) : « si elle ne note rien, l'app compte un sachet
-- par jour sans club ». Le calcul vit dans le front (src/features/bbc/caisse/
-- maison.ts, pur et testé) : la base ne rend que les FAITS — ce qu'elle a
-- emporté (en doses, par jour) et les jours où elle est venue au club.
-- Seulement ce qui dure (F1, PDM, thé, aloé : colonne `maison` de la carte) ;
-- barres et chips restent dans le chiffre, pas à la maison.
--
-- CE QUE FAIT CE FICHIER (additif ; trois fonctions du lot 1 remplacées)
--   1. _club_horaires(club)          : les horaires du club (settings.discovery),
--      pour savoir quels jours il est fermé — même source que le tunnel public.
--   2. _club_maison_donnees(club, membre) : ses achats « à la maison » des 60
--      derniers jours (doses par jour) et ses jours de visite depuis.
--   3. club_maison(membre)           : ce qui précède pour UNE membre (sa fiche)
--      ou tout le club (Contacter), avec les horaires.
--   4. club_caisse                   : rend en plus les horaires, SA maison et la
--      colonne `maison` de chaque produit (de quoi tenir, le pack 6 jours).
--   5. club_vendre                   : fige `maison` dans chaque ligne vendue,
--      comme le prix — une carte modifiée demain ne réécrit pas le passé.
-- =============================================================================

-- ── 1. Les horaires du club ─────────────────────────────────────────────────
create or replace function public._club_horaires(p_club uuid)
returns jsonb
language sql
stable
security definer
set search_path = public, extensions
as $$
  select jsonb_build_object(
           'hours', c.settings -> 'discovery' -> 'hours',
           'hours_by_date', c.settings -> 'discovery' -> 'hours_by_date',
           'holidays', c.settings -> 'discovery' -> 'holidays')
    from public.clubs c
   where c.id = p_club;
$$;
revoke all on function public._club_horaires(uuid) from public, anon, authenticated;

-- ── 2. Les faits : ce qu'elle a emporté, et ses jours au club ───────────────
-- Les doses d'une ligne = `maison` figée dans la vente (lot 2), sinon celle de
-- la carte (ventes du lot 1) × la quantité. Jours à l'heure de Paris.
create or replace function public._club_maison_donnees(p_club uuid, p_client uuid)
returns jsonb
language sql
stable
security definer
set search_path = public, extensions
as $$
  with lignes as (
    select v.client_id,
           (v.created_at at time zone 'Europe/Paris')::date as jour,
           coalesce(l -> 'maison', k.maison) as maison,
           greatest(coalesce((l ->> 'qte')::integer, 1), 1) as qte
      from public.club_ventes v
      cross join lateral jsonb_array_elements(v.lignes) l
      left join public.club_carte k on k.id = (l ->> 'carte_id')::uuid
     where v.club_id = p_club
       and v.annulee_at is null
       and v.client_id is not null
       and (p_client is null or v.client_id = p_client)
       and v.created_at > now() - interval '60 days'
  ),
  doses as (
    select client_id, jour, d.key as sorte, sum(d.value::numeric * qte) as n
      from lignes
      cross join lateral jsonb_each_text(maison) d
     where maison is not null and jsonb_typeof(maison) = 'object'
       and d.key in ('f1', 'pdm', 'the', 'aloe')
     group by 1, 2, 3
  ),
  achats as (
    select client_id, jour, jsonb_object_agg(sorte, n) as doses
      from doses
     where n > 0
     group by 1, 2
  ),
  membres as (
    select client_id, min(jour) as debut from achats group by 1
  )
  select coalesce(jsonb_agg(jsonb_build_object(
           'client_id', m.client_id,
           'achats', (select jsonb_agg(jsonb_build_object('jour', a.jour, 'doses', a.doses) order by a.jour)
                        from achats a where a.client_id = m.client_id),
           'visites', coalesce((
             select jsonb_agg(distinct (cv.visited_at at time zone 'Europe/Paris')::date)
               from public.club_visits cv
              where cv.client_id = m.client_id
                and cv.visited_at >= (m.debut::timestamp at time zone 'Europe/Paris')), '[]'::jsonb)
         )), '[]'::jsonb)
    from membres m;
$$;
revoke all on function public._club_maison_donnees(uuid, uuid) from public, anon, authenticated;

-- ── 3. « À la maison » : une membre (sa fiche) ou tout le club (Contacter) ──
create or replace function public.club_maison(p_client uuid default null)
returns jsonb
language plpgsql
stable
security definer
set search_path = public, extensions
as $$
declare
  v_club uuid := public.bbc_mon_club();
begin
  if (select auth.uid()) is null then
    raise exception 'non autorise';
  end if;
  if v_club is null then
    return jsonb_build_object('horaires', null, 'membres', '[]'::jsonb);
  end if;
  if p_client is not null and not public._club_membre_du_club(p_client, v_club) then
    return jsonb_build_object('horaires', public._club_horaires(v_club), 'membres', '[]'::jsonb);
  end if;
  return jsonb_build_object(
    'horaires', public._club_horaires(v_club),
    'membres', public._club_maison_donnees(v_club, p_client));
end;
$$;
revoke all on function public.club_maison(uuid) from public, anon;
grant execute on function public.club_maison(uuid) to authenticated;

-- ── 4. La caisse : + les horaires, SA maison, la colonne `maison` ───────────
create or replace function public.club_caisse(p_client uuid default null)
returns jsonb
language plpgsql
stable
security definer
set search_path = public, extensions
as $$
declare
  v_moi  uuid := (select auth.uid());
  v_club uuid := public.bbc_mon_club();
  v_membre boolean := false;
begin
  if v_moi is null then
    raise exception 'non autorise';
  end if;
  if v_club is null then
    return jsonb_build_object('club', null, 'modifiable', false, 'carte', '[]'::jsonb,
                              'habituels', '[]'::jsonb, 'meilleures', '[]'::jsonb,
                              'horaires', null, 'maison', null);
  end if;
  if p_client is not null then
    v_membre := public._club_membre_du_club(p_client, v_club);
  end if;

  return jsonb_build_object(
    'club', v_club,
    'modifiable', public._club_proprio(v_club),
    'carte', coalesce((
      select jsonb_agg(jsonb_build_object(
               'id', k.id, 'rubrique', k.rubrique, 'nom', k.nom, 'detail', k.detail,
               'prix', k.prix, 'sorte', k.sorte, 'ordre', k.ordre, 'actif', k.actif,
               'maison', k.maison)
             order by k.rubrique, k.ordre, k.nom)
        from public.club_carte k
       where k.club_id = v_club), '[]'::jsonb),
    'habituels', case when not v_membre then '[]'::jsonb else coalesce((
      select jsonb_agg(jsonb_build_object('carte_id', h.carte_id, 'qte', h.qte) order by h.n desc, h.derniere desc)
        from (
          select (l ->> 'carte_id')::uuid as carte_id,
                 count(*) as n,
                 max(v.created_at) as derniere,
                 (array_agg((l ->> 'qte')::integer order by v.created_at desc))[1] as qte
            from public.club_ventes v
            cross join lateral jsonb_array_elements(v.lignes) l
           where v.client_id = p_client
             and v.club_id = v_club
             and v.annulee_at is null
             and v.created_at > now() - interval '120 days'
           group by 1
           order by count(*) desc, max(v.created_at) desc
           limit 6
        ) h), '[]'::jsonb) end,
    'meilleures', coalesce((
      select jsonb_agg(m.carte_id order by m.q desc)
        from (
          select (l ->> 'carte_id')::uuid as carte_id, sum((l ->> 'qte')::integer) as q
            from public.club_ventes v
            cross join lateral jsonb_array_elements(v.lignes) l
           where v.club_id = v_club
             and v.annulee_at is null
             and v.created_at > now() - interval '60 days'
           group by 1
           order by 2 desc
           limit 8
        ) m), '[]'::jsonb),
    'horaires', public._club_horaires(v_club),
    'maison', case when v_membre then public._club_maison_donnees(v_club, p_client) -> 0 else null end
  );
end;
$$;
revoke all on function public.club_caisse(uuid) from public, anon;
grant execute on function public.club_caisse(uuid) to authenticated;

-- ── 5. La vente : `maison` figée dans chaque ligne ──────────────────────────
create or replace function public.club_vendre(p_client uuid, p_lignes jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_moi    uuid := (select auth.uid());
  v_club   uuid := public.bbc_mon_club();
  v_lignes jsonb := '[]'::jsonb;
  v_total  numeric(10,2) := 0;
  v_nb     integer := 0;
  v_id     uuid;
  r        record;
begin
  if v_moi is null then
    raise exception 'non autorise';
  end if;
  if v_club is null then
    raise exception 'pas de club';
  end if;
  if p_client is not null and not public._club_membre_du_club(p_client, v_club) then
    raise exception 'non autorise';
  end if;
  if p_lignes is null or jsonb_typeof(p_lignes) <> 'array'
     or jsonb_array_length(p_lignes) = 0 or jsonb_array_length(p_lignes) > 60 then
    raise exception 'lignes invalides';
  end if;

  for r in
    select k.id, k.nom, k.detail, k.rubrique, k.sorte, k.prix, k.maison, x.qte, k.actif
      from (
        select (e ->> 'carte_id')::uuid as carte_id, sum((e ->> 'qte')::integer) as qte
          from jsonb_array_elements(p_lignes) e
         group by 1
      ) x
      left join public.club_carte k on k.id = x.carte_id and k.club_id = v_club
  loop
    if r.id is null or not r.actif then
      raise exception 'produit inconnu';
    end if;
    if r.qte is null or r.qte < 1 or r.qte > 99 then
      raise exception 'quantite invalide';
    end if;
    v_lignes := v_lignes || jsonb_build_array(jsonb_build_object(
      'carte_id', r.id, 'nom', r.nom, 'detail', r.detail, 'rubrique', r.rubrique,
      'sorte', r.sorte, 'prix', r.prix, 'qte', r.qte, 'maison', r.maison));
    v_total := v_total + r.prix * r.qte;
    v_nb := v_nb + 1;
  end loop;

  if v_nb = 0 then
    raise exception 'lignes invalides';
  end if;

  insert into public.club_ventes (club_id, client_id, vendeur_id, lignes, total)
  values (v_club, p_client, v_moi, v_lignes, v_total)
  returning id into v_id;

  return jsonb_build_object('id', v_id, 'total', v_total, 'lignes', v_lignes);
end;
$$;
revoke all on function public.club_vendre(uuid, jsonb) from public, anon;
grant execute on function public.club_vendre(uuid, jsonb) to authenticated;
