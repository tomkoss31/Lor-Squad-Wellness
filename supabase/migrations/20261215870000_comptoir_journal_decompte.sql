-- =============================================================================
-- Le comptoir du club — lot 5 : « le journal qui décompte » (26/09/2026).
-- « go lot 4 et 5 d'affilée » de Thomas. Maquette v3 (SHZYSBaqfgWVqdMncgrcPG),
-- écran 3 « Son journal décompte » : un jour sans club, son journal propose
-- « Shake F1 · tes sachets du club », elle confirme d'un toucher, et l'app sait
-- qu'il lui reste un sachet de moins. Les upgrades vendus au pointage (F3, une dose
-- de PDM, fibre, Beta) s'ajoutent au petit-déj de son journal.
--
-- LA RÈGLE (Thomas, maquette) : « Chez elle, l'app propose et elle confirme. Seul le
-- pointage au club remplit à sa place. Si elle ne note rien, l'app compte un sachet
-- par jour sans club. » Le calcul vit dans le front (src/features/bbc/caisse/
-- maison.ts, pur et testé) : la base rend les faits, dont ce qu'ELLE a noté.
--
-- CE QUE FAIT CE FICHIER (additif ; trois fonctions des lots 1-2 remplacées)
--   1. club_carte.aliment : l'aliment du journal d'un upgrade (F3 → f3, PDM une dose
--      → pdmdemi, Fibre pomme 2554 → multifibres, Beta 0267 → betaheart). Le
--      collagène, la créatine, la fibre orange-goji et le grand thé-aloé ne sont pas
--      au catalogue du journal : rien n'est ajouté pour eux.
--   2. journal_lignes.vente_id : la vente du comptoir qui a posé la ligne, pour
--      l'enlever si la vente est annulée.
--   3. _club_maison_donnees : + `notes`, par jour, les shakes F1 et le PDM qu'elle a
--      notés ELLE-MÊME (origine membre ou noaly) — jamais le pré-rempli du club.
--      Même table de doses que `notesDesLignes` (maison.ts) : les deux vont ensemble.
--   4. journal_a_la_maison(jeton) : son stock pour SON journal (fonction à jeton,
--      comme journal_jour) — ce qu'elle a emporté, ses jours au club, ses notes, et
--      les horaires du club. Rien d'autre : ni prix, ni vendeuse.
--   5. club_vendre : après la vente, les upgrades qui ont un aliment entrent dans
--      son journal du jour, au petit-déj, origine « club ». Jamais bloquant.
--   6. club_vente_annuler : enlève aussi ces lignes. Jamais bloquant.
-- =============================================================================

-- ── 1. L'aliment du journal d'un upgrade ────────────────────────────────────
alter table public.club_carte add column if not exists aliment text
  references public.journal_aliments (cle) on delete set null;

comment on column public.club_carte.aliment is
  'L''aliment du journal (journal_aliments.cle) qu''un upgrade ajoute au petit-déj de la membre, le jour de la vente. Null : rien n''est ajouté.';

update public.club_carte k
   set aliment = m.aliment
  from (values ('0242', 'f3'), ('2600', 'pdmdemi'), ('2554', 'multifibres'), ('0267', 'betaheart')) as m(ref, aliment)
 where k.sorte = 'upgrade'
   and k.ref_herbalife = m.ref
   and k.aliment is null
   and exists (select 1 from public.journal_aliments a where a.cle = m.aliment);

-- ── 2. La vente qui a posé une ligne du journal ─────────────────────────────
alter table public.journal_lignes add column if not exists vente_id uuid
  references public.club_ventes (id) on delete set null;
create index if not exists journal_lignes_vente_idx on public.journal_lignes (vente_id) where vente_id is not null;

comment on column public.journal_lignes.vente_id is
  'La vente du comptoir (club_ventes) qui a ajouté cette ligne (un upgrade du pointage). Annuler la vente l''enlève.';

-- ── 3. Les faits « à la maison », + ce qu'elle a noté ───────────────────────
-- Les doses d'un shake noté : f1demi = F1 + ½ sachet de PDM (une dose), f1plein =
-- F1 + un sachet (deux doses), f1lait / f1soja = F1 seul ; pdmdemi / pdmplein = du
-- PDM à part. Ce qu'elle note compte même un jour de club (un shake du soir, chez elle).
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
                and cv.visited_at >= (m.debut::timestamp at time zone 'Europe/Paris')), '[]'::jsonb),
           'notes', coalesce((
             select jsonb_object_agg(to_char(n.jour, 'YYYY-MM-DD'), jsonb_build_object('f1', n.f1, 'pdm', n.pdm))
               from (
                 select jl.jour,
                        sum(case when jl.aliment in ('f1demi', 'f1plein', 'f1lait', 'f1soja') then jl.quantite else 0 end) as f1,
                        sum(jl.quantite * case jl.aliment
                                            when 'f1demi' then 1 when 'pdmdemi' then 1
                                            when 'f1plein' then 2 when 'pdmplein' then 2
                                            else 0 end) as pdm
                   from public.journal_lignes jl
                  where jl.client_id = m.client_id
                    and jl.jour >= m.debut
                    and jl.origine in ('membre', 'noaly')
                    and jl.aliment in ('f1demi', 'f1plein', 'f1lait', 'f1soja', 'pdmdemi', 'pdmplein')
                  group by jl.jour
               ) n), '{}'::jsonb)
         )), '[]'::jsonb)
    from membres m;
$$;
revoke all on function public._club_maison_donnees(uuid, uuid) from public, anon, authenticated;

-- ── 4. « À la maison » dans SON journal (fonction à jeton) ──────────────────
-- Son club : celui de sa fiche, sinon celui de son dernier achat au comptoir.
create or replace function public.journal_a_la_maison(p_token text)
returns jsonb
language plpgsql
stable
security definer
set search_path = public, extensions
as $$
declare
  v_client uuid := public._journal_client(p_token);
  v_club   uuid;
begin
  select coalesce(c.club_id, (
           select v.club_id from public.club_ventes v
            where v.client_id = c.id and v.annulee_at is null
            order by v.created_at desc limit 1))
    into v_club
    from public.clients c
   where c.id = v_client;
  if v_club is null then
    return jsonb_build_object('maison', null, 'horaires', null);
  end if;
  return jsonb_build_object(
    'maison', public._club_maison_donnees(v_club, v_client) -> 0,
    'horaires', public._club_horaires(v_club));
end;
$$;
revoke all on function public.journal_a_la_maison(text) from public;
grant execute on function public.journal_a_la_maison(text) to anon, authenticated;

-- ── 5. La vente : les upgrades entrent dans son journal ─────────────────────
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

  -- Lot 5 : les upgrades servis avec son shake entrent dans son journal du jour.
  -- Le journal est un plus : s'il refuse une ligne, la vente reste enregistrée.
  if p_client is not null then
    begin
      insert into public.journal_lignes (client_id, jour, creneau, aliment, libelle, quantite, prot_g, origine, vente_id)
      select p_client, (now() at time zone 'Europe/Paris')::date, 'pdj', a.cle, a.nom,
             least((l ->> 'qte')::integer, 5), a.prot_portion * least((l ->> 'qte')::integer, 5), 'club', v_id
        from jsonb_array_elements(v_lignes) l
        join public.club_carte k on k.id = (l ->> 'carte_id')::uuid and k.club_id = v_club and k.sorte = 'upgrade'
        join public.journal_aliments a on a.cle = k.aliment and a.actif and a.prot_portion is not null;
    exception when others then
      null;
    end;
  end if;

  return jsonb_build_object('id', v_id, 'total', v_total, 'lignes', v_lignes);
end;
$$;
revoke all on function public.club_vendre(uuid, jsonb) from public, anon;
grant execute on function public.club_vendre(uuid, jsonb) to authenticated;

-- ── 6. Annuler une vente enlève aussi ses lignes du journal ─────────────────
create or replace function public.club_vente_annuler(p_vente uuid)
returns void
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_moi uuid := (select auth.uid());
  v     public.club_ventes%rowtype;
begin
  if v_moi is null then
    raise exception 'non autorise';
  end if;
  select * into v from public.club_ventes where id = p_vente;
  if not found then
    raise exception 'vente introuvable';
  end if;
  if v.annulee_at is not null then
    return;
  end if;
  if not (v.vendeur_id = v_moi or public._club_proprio(v.club_id)) then
    raise exception 'non autorise';
  end if;
  if (v.created_at at time zone 'Europe/Paris')::date <> (now() at time zone 'Europe/Paris')::date then
    raise exception 'trop tard';
  end if;
  update public.club_ventes set annulee_at = now(), annulee_par = v_moi where id = p_vente;
  begin
    delete from public.journal_lignes where vente_id = p_vente;
  exception when others then
    null;
  end;
end;
$$;
revoke all on function public.club_vente_annuler(uuid) from public, anon;
grant execute on function public.club_vente_annuler(uuid) to authenticated;
