-- =============================================================================
-- Journal nutritionnel — bloc B, 6 : « Tes habituels » en tête d'« Ajouter »
-- (maquette Jt3RNaarpnav5XRGzhrTwz, validée par Thomas le 21/09/2026 :
-- « un toucher = noté », OK).
--
-- Ce qu'elle a noté à CE repas au moins 2 jours sur les 14 d'avant, avec SA
-- quantité la plus fréquente ; 4 au plus par repas, les plus fréquents d'abord.
-- Ses gestes à elle seulement (origine membre ou noaly) : le shake pré-rempli
-- au club n'en est pas un. Un plat estimé par Noaly peut devenir un habituel :
-- il revient avec son estimation (prot_100g), sans rappeler Noaly.
-- =============================================================================

create or replace function public._journal_habituels(p_client uuid, p_jour date)
returns jsonb language sql stable security definer set search_path = public, extensions as $$
  with l as (
    select jl.creneau, jl.jour, jl.aliment, jl.libelle, jl.grammes, jl.quantite, jl.prot_100g, jl.prot_g, jl.cree_le,
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
    select distinct on (creneau, cle_h) creneau, cle_h, aliment, btrim(libelle) as libelle, grammes, quantite, prot_100g, prot_g
      from (select l.*, count(*) over (partition by creneau, cle_h, grammes, quantite) as n from l) x
     order by creneau, cle_h, n desc, cree_le desc
  ),
  classes as (
    select q.creneau, q.aliment, q.libelle, q.grammes, q.quantite, q.prot_100g, q.prot_g, f.jours,
           row_number() over (partition by f.creneau order by f.jours desc, f.dernier desc) as rang
      from frequents f
      join quantites q on q.creneau = f.creneau and q.cle_h = f.cle_h
  )
  select coalesce(jsonb_object_agg(creneau, liste), '{}'::jsonb)
    from (select creneau,
                 jsonb_agg(jsonb_build_object(
                   'aliment', aliment, 'libelle', libelle, 'grammes', grammes, 'quantite', quantite,
                   'prot_100g', prot_100g, 'prot_g', prot_g, 'jours', jours) order by rang) as liste
            from classes
           where rang <= 4
           group by creneau) t;
$$;
revoke all on function public._journal_habituels(uuid, date) from public, anon, authenticated;

-- La journée rend ses habituels. Recopie À L'IDENTIQUE de la version en ligne
-- (20261215580000, empreinte vérifiée le 21/09) + la clé `habituels`.
create or replace function public._journal_etat(p_client uuid, p_jour date)
returns jsonb language sql stable security definer set search_path = public, extensions as $$
  select jsonb_build_object(
    'jour', p_jour,
    'aujourdhui', (now() at time zone 'Europe/Paris')::date,
    'objectifs', public._journal_objectifs_client(p_client),
    'lignes', coalesce((
      select jsonb_agg(jsonb_build_object(
               'id', l.id, 'creneau', l.creneau, 'aliment', l.aliment, 'libelle', l.libelle,
               'grammes', l.grammes, 'quantite', l.quantite, 'prot_g', l.prot_g, 'prot_100g', l.prot_100g,
               'origine', l.origine)
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
