-- =============================================================================
-- Journal nutritionnel — Noaly estime ce que le catalogue ne connaît pas
-- (21/09/2026, Thomas : « une pizza thon vs une pizza juste avec artichaut…
-- salade maïs tomate burrata, salade maïs tomate aiguillettes de poulet, c'est
-- des détails qui changent l'effet ; comme l'IA est connectée, autant l'utiliser
-- pour être juste sur les repas »).
--
-- Jusqu'ici une ligne du journal pointait TOUJOURS vers le catalogue. Désormais :
--   • un aliment du catalogue garde ses chiffres officiels (CIQUAL, étiquettes
--     Herbalife) — c'est le premier choix de Noaly ;
--   • sinon (burrata, maïs, pizza au thon…), Noaly l'estime : la ligne n'a pas
--     d'aliment, elle porte son nom, son poids et ses protéines POUR 100 g
--     (prot_100g) — on peut donc corriger le poids et le total suit.
-- Ces lignes sont signalées « estimé par Noaly » dans l'app.
-- =============================================================================

alter table public.journal_lignes alter column aliment drop not null;
alter table public.journal_lignes add column if not exists prot_100g numeric(5,2);
alter table public.journal_lignes drop constraint if exists journal_lignes_aliment_ou_estimation;
alter table public.journal_lignes add constraint journal_lignes_aliment_ou_estimation
  check (aliment is not null or (prot_100g is not null and grammes is not null));
alter table public.journal_lignes drop constraint if exists journal_lignes_prot_100g_plausible;
alter table public.journal_lignes add constraint journal_lignes_prot_100g_plausible
  check (prot_100g is null or prot_100g between 0 and 90);

-- La journée rend aussi prot_100g (corriger le poids d'une ligne estimée).
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

-- Le lot : une ligne du catalogue ({aliment, grammes | quantite}) OU une ligne
-- estimée par Noaly ({libelle, grammes, prot_100g}).
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
    end if;
    insert into public.journal_lignes (client_id, jour, creneau, aliment, libelle, grammes, quantite, prot_g, prot_100g, origine)
    values (v_client, v_jour, p_creneau, case when v_p100 is null then a.cle end, v_nom, v_g, v_q, v_prot, v_p100, 'noaly');
  end loop;
  v_gains := public._journal_defis(p_token, v_client);
  return public._journal_etat(v_client, v_jour) || jsonb_build_object('gains', v_gains);
end;
$$;
grant execute on function public.journal_ajouter_lot(text, date, text, jsonb) to anon, authenticated;

-- Corriger une ligne estimée : seul son poids change, ses protéines suivent.
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
       set aliment = a.cle, libelle = a.nom, grammes = v_g, quantite = v_q, prot_g = v_prot, prot_100g = null
     where id = p_ligne;
  end if;
  v_gains := public._journal_defis(p_token, v_client);
  return public._journal_etat(v_client, l.jour) || jsonb_build_object('gains', v_gains);
end;
$$;

-- « Pareil qu'hier » recopie aussi les lignes estimées (avec leur base pour 100 g).
create or replace function public.journal_reprendre_veille(p_token text, p_jour date, p_creneau text)
returns jsonb language plpgsql security definer set search_path = public, extensions as $$
declare v_client uuid := public._journal_client(p_token); v_jour date := public._journal_jour(p_jour); v_gains jsonb;
begin
  if p_creneau is null or p_creneau not in ('pdj','enc1','dej','enc2','din','aut') then
    raise exception 'creneau inconnu'; end if;
  insert into public.journal_lignes (client_id, jour, creneau, aliment, libelle, grammes, quantite, prot_g, prot_100g, origine)
  select v_client, v_jour, l.creneau, l.aliment, l.libelle, l.grammes, l.quantite, l.prot_g, l.prot_100g, 'membre'
    from public.journal_lignes l
   where l.client_id = v_client and l.jour = v_jour - 1 and l.creneau = p_creneau
   order by l.cree_le;
  v_gains := public._journal_defis(p_token, v_client);
  return public._journal_etat(v_client, v_jour) || jsonb_build_object('gains', v_gains);
end;
$$;
