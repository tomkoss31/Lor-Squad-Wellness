-- =============================================================================
-- Journal nutritionnel — bloc B, 9 : les kcal, discrètes (maquette
-- Jt3RNaarpnav5XRGzhrTwz, validée par Thomas le 21/09/2026 : « 4 oui masque »).
--
--   • En gris sous les protéines de chaque repas et en total du jour ; jamais sur
--     l'accueil ni dans l'anneau, jamais d'objectif : le journal reste celui des
--     protéines et de l'eau. Calculées à la LECTURE (`_journal_kcal_ligne`) :
--     un aliment du catalogue prend ses kcal officielles ; un plat estimé par
--     Noaly, l'estimation qu'elle en a faite (`journal_lignes.kcal_100g`).
--   • La coach peut les MASQUER pour une membre (`journal_reglages.kcal_visibles`,
--     `journal_regler_kcal`) : pour certaines personnes, compter les calories fait
--     plus de mal que de bien. Visibles par défaut.
--   • Le catalogue : 14 aliments sans énergie publiée dans CIQUAL 2020 reçoivent
--     leurs kcal CALCULÉES comme CIQUAL (règlement UE 1169/2011, annexe XIV :
--     glucides 4, polyols 2,4, protéines 4, lipides 9, alcool 7, acides organiques
--     3, fibres 2) à partir de leurs nutriments CIQUAL — formule vérifiée sur les
--     48 aliments du catalogue dont l'énergie est publiée (écart max 4 kcal).
--     Restent SANS kcal, faute de source : le croque-monsieur (CIQUAL n'a ni ses
--     glucides ni ses fibres), les chips protéinées BBQ et crème & oignon et le
--     Rebuild Strength (chiffres du club, sans étiquette).
-- Les fonctions modifiées sont recopiées À L'IDENTIQUE des versions en ligne
-- (empreintes vérifiées le 21/09), seules les lignes « kcal » changent.
-- =============================================================================

alter table public.journal_lignes add column if not exists kcal_100g numeric(6,1);
alter table public.journal_lignes drop constraint if exists journal_lignes_kcal_100g_plausible;
alter table public.journal_lignes add constraint journal_lignes_kcal_100g_plausible
  check (kcal_100g is null or kcal_100g between 0 and 900);

alter table public.journal_reglages add column if not exists kcal_visibles boolean not null default true;

update public.journal_aliments a
   set kcal_100g = v.kcal,
       source = a.source || ' · kcal calculées (règl. UE 1169/2011) depuis les nutriments CIQUAL'
  from (values
  ('yaourt_grec', 113.1),
  ('chevre_frais', 252.7),
  ('ricotta', 158.3),
  ('epinards', 21.5),
  ('salade', 13.5),
  ('pomme', 53.8),
  ('poire', 58.3),
  ('raisin', 69.4),
  ('amandes', 599.9),
  ('noix', 699.8),
  ('noisettes', 621.5),
  ('beurre_cacahuete', 635.7),
  ('chocolat_noir', 526.3),
  ('biscuit', 448.6)
  ) as v(cle, kcal)
 where a.cle = v.cle and a.kcal_100g is null and a.kcal_portion is null;

-- Les kcal d'une ligne : celles du catalogue, ou l'estimation de Noaly.
create or replace function public._journal_kcal_ligne(p_aliment text, p_grammes numeric, p_quantite integer, p_kcal_100g numeric)
returns integer language sql stable security definer set search_path = public, extensions as $$
  select case
    when p_aliment is null then
      case when p_kcal_100g is not null and p_grammes is not null then round(p_kcal_100g * p_grammes / 100)::int end
    else (select case
                   when a.kcal_portion is not null then round(a.kcal_portion * greatest(1, coalesce(p_quantite, 1)))::int
                   when a.kcal_100g is not null and p_grammes is not null then round(a.kcal_100g * p_grammes / 100)::int
                 end
            from public.journal_aliments a where a.cle = p_aliment)
  end;
$$;
revoke all on function public._journal_kcal_ligne(text, numeric, integer, numeric) from public, anon, authenticated;

create or replace function public._journal_habituels(p_client uuid, p_jour date)
returns jsonb language sql stable security definer set search_path = public, extensions as $$
  with l as (
    select jl.creneau, jl.jour, jl.aliment, jl.libelle, jl.grammes, jl.quantite, jl.prot_100g, jl.kcal_100g, jl.prot_g, jl.cree_le,
           coalesce(jl.aliment, '~' || lower(btrim(jl.libelle))) as cle_h
      from public.journal_lignes jl
     where jl.client_id = p_client
       and jl.jour between p_jour - 14 and p_jour - 1
       and jl.origine in ('membre', 'noaly')
       -- un aliment retiré du catalogue ne se repropose pas
       and (jl.aliment is null or exists (select 1 from public.journal_aliments a where a.cle = jl.aliment and a.actif))
  ),
  frequents as (
    select creneau, cle_h, count(distinct jour) as jours, max(cree_le) as dernier
      from l
     group by creneau, cle_h
    having count(distinct jour) >= 2
  ),
  -- sa quantité la plus fréquente pour chaque habituel (à égalité, la plus récente)
  quantites as (
    select distinct on (creneau, cle_h) creneau, cle_h, aliment, btrim(libelle) as libelle, grammes, quantite, prot_100g, kcal_100g, prot_g
      from (select l.*, count(*) over (partition by creneau, cle_h, grammes, quantite) as n from l) x
     order by creneau, cle_h, n desc, cree_le desc
  ),
  classes as (
    select q.creneau, q.aliment, q.libelle, q.grammes, q.quantite, q.prot_100g, q.kcal_100g, q.prot_g, f.jours,
           row_number() over (partition by f.creneau order by f.jours desc, f.dernier desc) as rang
      from frequents f
      join quantites q on q.creneau = f.creneau and q.cle_h = f.cle_h
  )
  select coalesce(jsonb_object_agg(creneau, liste), '{}'::jsonb)
    from (select creneau,
                 jsonb_agg(jsonb_build_object(
                   'aliment', aliment, 'libelle', libelle, 'grammes', grammes, 'quantite', quantite,
                   'prot_100g', prot_100g, 'kcal_100g', kcal_100g, 'prot_g', prot_g, 'jours', jours) order by rang) as liste
            from classes
           where rang <= 4
           group by creneau) t;
$$;

create or replace function public._journal_etat(p_client uuid, p_jour date)
returns jsonb language sql stable security definer set search_path = public, extensions as $$
  select jsonb_build_object(
    'jour', p_jour,
    'aujourdhui', (now() at time zone 'Europe/Paris')::date,
    'objectifs', public._journal_objectifs_client(p_client),
    'kcal_visibles', coalesce((select r.kcal_visibles from public.journal_reglages r where r.client_id = p_client), true),
    'lignes', coalesce((
      select jsonb_agg(jsonb_build_object(
               'id', l.id, 'creneau', l.creneau, 'aliment', l.aliment, 'libelle', l.libelle,
               'grammes', l.grammes, 'quantite', l.quantite, 'prot_g', l.prot_g, 'prot_100g', l.prot_100g,
               'origine', l.origine, 'kcal_100g', l.kcal_100g,
               'kcal', public._journal_kcal_ligne(l.aliment, l.grammes, l.quantite, l.kcal_100g))
             order by l.cree_le)
        from public.journal_lignes l where l.client_id = p_client and l.jour = p_jour), '[]'::jsonb),
    'veille', coalesce((
      select jsonb_agg(jsonb_build_object(
               'creneau', l.creneau, 'aliment', l.aliment, 'libelle', l.libelle,
               'grammes', l.grammes, 'quantite', l.quantite, 'prot_g', l.prot_g, 'prot_100g', l.prot_100g)
             order by l.cree_le)
        from public.journal_lignes l where l.client_id = p_client and l.jour = p_jour - 1), '[]'::jsonb),
    'habituels', public._journal_habituels(p_client, p_jour),
    'verres', coalesce((select j.verres from public.journal_jours j where j.client_id = p_client and j.jour = p_jour), 0),
    'boisson_club', coalesce((select j.boisson_club from public.journal_jours j where j.client_id = p_client and j.jour = p_jour), false),
    'activite', (select j.activite from public.journal_jours j where j.client_id = p_client and j.jour = p_jour),
    'humeur', (select j.humeur from public.journal_jours j where j.client_id = p_client and j.jour = p_jour),
    'remarque', (
      select jsonb_build_object('texte', r.texte, 'changements', r.changements, 'le', r.cree_le,
                                'coach', nullif(split_part(btrim(coalesce(u.name, '')), ' ', 1), ''))
        from public.journal_remarques r
        left join public.users u on u.id = r.coach_user_id
       where r.client_id = p_client
       order by r.cree_le desc limit 1),
    'xp_total', (select coalesce(sum(e.xp_amount), 0)::int from public.client_xp_events e where e.client_id = p_client::text)
  );
$$;

create or replace function public.journal_ajouter_lot(
  p_token text, p_jour date, p_creneau text, p_lignes jsonb)
returns jsonb language plpgsql security definer set search_path = public, extensions as $$
declare
  v_client uuid := public._journal_client(p_token);
  v_jour   date := public._journal_jour(p_jour);
  e        jsonb;
  a        public.journal_aliments%rowtype;
  v_q      int;
  v_g      numeric;
  v_p100   numeric;
  v_k100   numeric;
  v_nom    text;
  v_prot   numeric;
  v_gains  jsonb;
begin
  if p_creneau is null or p_creneau not in ('pdj','enc1','dej','enc2','din','aut') then
    raise exception 'creneau inconnu'; end if;
  if p_lignes is null or jsonb_typeof(p_lignes) <> 'array'
     or jsonb_array_length(p_lignes) not between 1 and 12 then
    raise exception 'lignes invalides'; end if;
  -- Tout ou rien : une ligne fausse annule le lot entier (l'exception défait tout).
  for e in select * from jsonb_array_elements(p_lignes) loop
    if nullif(btrim(coalesce(e->>'aliment', '')), '') is not null then
      select * into a from public.journal_aliments where cle = e->>'aliment' and actif;
      if not found then raise exception 'aliment inconnu'; end if;
      v_p100 := null;
      v_k100 := null;
      v_nom := a.nom;
      if a.prot_portion is not null then
        v_g := null;
        v_q := greatest(1, least(5, coalesce((e->>'quantite')::int, 1)));
        v_prot := a.prot_portion * v_q;
      else
        v_q := 1;
        v_g := round(coalesce((e->>'grammes')::numeric, 0), 1);
        if v_g < 1 or v_g > 2000 then raise exception 'quantite invalide'; end if;
        v_prot := round(a.prot_100g * v_g / 100, 1);
      end if;
    else
      -- Estimée par Noaly : un nom, un poids, des protéines pour 100 g plausibles.
      v_nom := left(btrim(coalesce(e->>'libelle', '')), 80);
      if length(v_nom) < 1 then raise exception 'aliment inconnu'; end if;
      v_q := 1;
      v_g := round(coalesce((e->>'grammes')::numeric, 0), 1);
      if v_g < 1 or v_g > 2000 then raise exception 'quantite invalide'; end if;
      v_p100 := round(coalesce((e->>'prot_100g')::numeric, -1), 2);
      if v_p100 < 0 or v_p100 > 90 then raise exception 'estimation invalide'; end if;
      v_prot := round(v_p100 * v_g / 100, 1);
      -- Ses kcal pour 100 g, estimées aussi (bloc B, 9) : une valeur absente ou
      -- invraisemblable ne fait pas échouer la ligne, elle reste sans kcal.
      v_k100 := case when coalesce(e->>'kcal_100g', '') ~ '^[0-9]+([.][0-9]+)?$'
                      and (e->>'kcal_100g')::numeric <= 900
                     then round((e->>'kcal_100g')::numeric, 1) end;
    end if;
    insert into public.journal_lignes (client_id, jour, creneau, aliment, libelle, grammes, quantite, prot_g, prot_100g, kcal_100g, origine)
    values (v_client, v_jour, p_creneau, case when v_p100 is null then a.cle end, v_nom, v_g, v_q, v_prot, v_p100, v_k100, 'noaly');
  end loop;
  v_gains := public._journal_defis(p_token, v_client);
  return public._journal_etat(v_client, v_jour) || jsonb_build_object('gains', v_gains);
end;
$$;
grant execute on function public.journal_ajouter_lot(text, date, text, jsonb) to anon, authenticated;

create or replace function public.journal_modifier(
  p_token text, p_ligne uuid, p_aliment text default null,
  p_grammes numeric default null, p_quantite integer default null)
returns jsonb language plpgsql security definer set search_path = public, extensions as $$
declare
  v_client uuid := public._journal_client(p_token);
  l        public.journal_lignes%rowtype;
  a        public.journal_aliments%rowtype;
  v_q      int;
  v_g      numeric;
  v_prot   numeric;
  v_gains  jsonb;
begin
  select * into l from public.journal_lignes where id = p_ligne and client_id = v_client;
  if not found then raise exception 'ligne introuvable'; end if;
  perform public._journal_jour(l.jour);
  if coalesce(p_aliment, l.aliment) is null then
    v_g := round(coalesce(p_grammes, l.grammes, 0), 1);
    if v_g < 1 or v_g > 2000 then raise exception 'quantite invalide'; end if;
    update public.journal_lignes
       set grammes = v_g, quantite = 1, prot_g = round(l.prot_100g * v_g / 100, 1)
     where id = p_ligne;
  else
    select * into a from public.journal_aliments where cle = coalesce(p_aliment, l.aliment);
    if not found then raise exception 'aliment inconnu'; end if;
    if a.prot_portion is not null then
      v_g := null;
      v_q := greatest(1, least(5, coalesce(p_quantite, l.quantite, 1)));
      v_prot := a.prot_portion * v_q;
    else
      v_g := round(coalesce(p_grammes, l.grammes, 0), 1);
      if v_g < 1 or v_g > 2000 then raise exception 'quantite invalide'; end if;
      v_q := 1;
      v_prot := round(a.prot_100g * v_g / 100, 1);
    end if;
    update public.journal_lignes
       set aliment = a.cle, libelle = a.nom, grammes = v_g, quantite = v_q, prot_g = v_prot, prot_100g = null, kcal_100g = null
     where id = p_ligne;
  end if;
  v_gains := public._journal_defis(p_token, v_client);
  return public._journal_etat(v_client, l.jour) || jsonb_build_object('gains', v_gains);
end;
$$;

create or replace function public.journal_reprendre_veille(p_token text, p_jour date, p_creneau text)
returns jsonb language plpgsql security definer set search_path = public, extensions as $$
declare v_client uuid := public._journal_client(p_token); v_jour date := public._journal_jour(p_jour); v_gains jsonb;
begin
  if p_creneau is null or p_creneau not in ('pdj','enc1','dej','enc2','din','aut') then
    raise exception 'creneau inconnu'; end if;
  insert into public.journal_lignes (client_id, jour, creneau, aliment, libelle, grammes, quantite, prot_g, prot_100g, kcal_100g, origine)
  select v_client, v_jour, l.creneau, l.aliment, l.libelle, l.grammes, l.quantite, l.prot_g, l.prot_100g, l.kcal_100g, 'membre'
    from public.journal_lignes l
   where l.client_id = v_client and l.jour = v_jour - 1 and l.creneau = p_creneau
   order by l.cree_le;
  v_gains := public._journal_defis(p_token, v_client);
  return public._journal_etat(v_client, v_jour) || jsonb_build_object('gains', v_gains);
end;
$$;

create or replace function public.journal_semaine_coach(p_client_id uuid)
returns jsonb language plpgsql stable security invoker set search_path = public, extensions as $$
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

-- La coach montre ou masque les kcal d'une membre (son RLS décide, comme le coefficient).
create or replace function public.journal_regler_kcal(p_client_id uuid, p_visibles boolean)
returns jsonb language plpgsql security invoker set search_path = public, extensions as $$
begin
  if p_visibles is null then raise exception 'choix manquant'; end if;
  insert into public.journal_reglages (client_id, kcal_visibles, maj_par, maj_le)
  values (p_client_id, p_visibles, (select auth.uid()), now())
  on conflict (client_id) do update
     set kcal_visibles = excluded.kcal_visibles, maj_par = excluded.maj_par, maj_le = now();
  return public.journal_semaine_coach(p_client_id);
end;
$$;
revoke all on function public.journal_regler_kcal(uuid, boolean) from public, anon;
grant execute on function public.journal_regler_kcal(uuid, boolean) to authenticated;
