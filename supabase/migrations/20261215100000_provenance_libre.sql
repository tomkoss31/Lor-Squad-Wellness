-- =============================================================================
-- « Quelqu'un d'autre » — le prénom qui n'est pas dans l'équipe.
--
-- Le manque (Mélanie, 16/08) : la question posée après la réservation propose
-- la liste des prénoms de l'ÉQUIPE. Or la moitié des recommandations viennent
-- d'ailleurs — une adhérente du club, une amie, une collègue. Aujourd'hui ces
-- gens-là n'ont aucune case : `provenance_user_id` est une clé étrangère vers
-- `users`, donc un prénom hors équipe n'a physiquement nulle part où aller, et
-- détourner l'identifiant d'une distributrice écrirait un mensonge sur la fiche
-- (« rapporté par Mandy » alors que ce n'est pas elle).
--
-- ⚠️ SUITE (Thomas + Mélanie, 17/08) : la liste de prénoms d'équipe a été
-- retirée du tunnel pour de bon — « ils ne sont que deux ». Cette colonne n'est
-- donc plus un complément, c'est le SEUL endroit où un prénom cité peut
-- atterrir depuis `/reserver`. `provenance_user_id` reste en base et reste
-- gérée par la fonction (une saisie coach, un futur écran), mais le tunnel ne
-- l'alimente plus : il n'envoie jamais `p_qui`.
--
-- La question a aussi CHANGÉ D'ÉCRAN le 17/08 — elle est passée de la
-- confirmation au choix du créneau, avec le bouton « Confirmer » sous elle.
-- Mesuré sur deux jours : 11 personnes laissent leurs coordonnées, 5 arrivent
-- au créneau, UNE SEULE atteignait la confirmation. La fenêtre d'un jour
-- ci-dessous s'en trouve inchangée : la réponse part toujours juste après que
-- la réservation est acquise.
--
-- ⚠️ Toujours une INFORMATION, jamais un cœur. Rien n'est écrit dans
-- `client_referrals`, aucun cœur n'est créé, aucun propriétaire de lead ne
-- change. Un cœur ne compte que si la personne DÉMARRE, et c'est le coach qui
-- le pose, plus tard, à la main — exactement comme aujourd'hui.
-- =============================================================================

-- ── 1. Où on range le prénom écrit à la main ────────────────────────────────
-- Du texte libre, et pas une clé étrangère : c'est précisément le cas « cette
-- personne n'est pas dans l'équipe ». Aucune contrainte d'unicité non plus —
-- deux orthographes du même prénom sont une réalité qu'on assume, l'écran le
-- signale au coach plutôt que de la refuser à la personne qui répond.
alter table public.prospect_leads
  add column if not exists provenance_libre text;

comment on column public.prospect_leads.provenance_libre is
  'Prénom TAPÉ À LA MAIN quand la personne citée n''est pas dans l''équipe (adhérente, amie). Information seulement : ne crée aucun cœur, ne donne aucun droit, ne change pas le propriétaire du lead. Exclusif de provenance_user_id.';

-- Pas d''index : contrairement à `provenance_user_id`, cette colonne ne sert
-- pas à compter (« combien Mandy a rapporté »), seulement à afficher la ligne
-- du lead qu'on est déjà en train de lire.

-- ── 2. La fonction qui pose la réponse, avec le prénom libre en plus ────────
-- ⚠️ On DÉTRUIT l'ancienne signature avant de recréer. Ajouter un quatrième
-- paramètre à valeur par défaut sans supprimer l'ancienne fonction laisserait
-- DEUX candidates en base : un appel PostgREST à trois paramètres nommés
-- deviendrait ambigu (« function is not unique »), et comme le tunnel avale ses
-- échecs en silence (la question ne doit jamais gêner quelqu'un qui vient de
-- réserver), PLUS AUCUNE provenance ne serait enregistrée, sans le moindre
-- signe à l'écran.
--
-- La compatibilité des appels existants est préservée par le `default null` :
-- un `noter_provenance_lead(p_lead_id, p_canal, p_qui)` — le front déjà
-- déployé, tant que le nouveau bundle n'est pas servi — continue de résoudre
-- vers cette fonction et se comporte exactement comme avant.
drop function if exists public.noter_provenance_lead(uuid, text, uuid);

create or replace function public.noter_provenance_lead(
  p_lead_id uuid,
  p_canal   text,
  p_qui     uuid default null,
  p_libre   text default null
)
returns text
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_cree_le timestamptz;
  v_deja    text;
  v_libre   text;
begin
  -- Vocabulaire fermé, inchangé : une valeur inventée ne doit pas entrer en
  -- base, sinon les compteurs racontent n'importe quoi (leçon `message_type`,
  -- 08/06). « Quelqu'un d'autre » n'est PAS un cinquième canal — c'est un
  -- « qui » alternatif à l'intérieur du flyer et du bouche-à-oreille.
  if p_canal is null or p_canal not in ('flyer', 'parle', 'reseaux', 'autre') then
    return 'canal_invalide';
  end if;

  -- ── Nettoyage du texte libre ──────────────────────────────────────────────
  -- Cette fonction est exécutable par `anon` : ce qui arrive ici est tapé par
  -- un inconnu, sur un téléphone, et sera affiché tel quel dans la liste CRM du
  -- coach. On borne AVANT d'écrire, pas seulement à l'écran.
  --   · les caractères de contrôle deviennent des espaces — un saut de ligne
  --     casserait la ligne de liste, qui tient sur une seule ligne ;
  --   · les espaces multiples sont réduits ;
  --   · 80 caractères maximum, recoupés proprement ;
  --   · vide après nettoyage ⇒ NULL, jamais une chaîne vide en base.
  v_libre := regexp_replace(coalesce(p_libre, ''), '[[:cntrl:]]+', ' ', 'g');
  v_libre := btrim(regexp_replace(v_libre, '\s+', ' ', 'g'));
  v_libre := nullif(btrim(left(v_libre, 80)), '');

  -- Un prénom n'a de sens que pour un flyer ou du bouche-à-oreille : personne
  -- ne distribue Instagram. Ailleurs, on l'ignore purement et simplement.
  if p_canal not in ('flyer', 'parle') then
    v_libre := null;
  end if;

  -- Exclusifs : si les deux arrivent, l'identifiant d'équipe gagne. C'est le
  -- plus fiable des deux (il désigne un compte réel, pas une orthographe), et
  -- garder les deux ferait deux réponses à une question qui n'en admet qu'une.
  if p_qui is not null then
    v_libre := null;
  end if;

  select created_at, provenance_canal into v_cree_le, v_deja
    from public.prospect_leads
   where id = p_lead_id;

  if not found then return 'introuvable'; end if;

  -- Une seule réponse par lead : la fonction est publique (le tunnel n'a pas de
  -- session), donc elle ne doit pas pouvoir réécrire indéfiniment une fiche.
  -- ⚠️ Conséquence pour l'appelant : le prénom libre doit partir dans le MÊME
  -- et unique appel que le canal. Un second appel repartirait avec
  -- « deja_repondu » et le prénom serait perdu, silencieusement.
  if v_deja is not null then return 'deja_repondu'; end if;

  -- Et seulement dans la foulée de la réservation. Passé un jour, plus personne
  -- n'est légitimement dans le tunnel en train de réserver.
  if v_cree_le < now() - interval '1 day' then return 'trop_tard'; end if;

  update public.prospect_leads
     set provenance_canal   = p_canal,
         provenance_user_id = case when p_canal in ('flyer', 'parle') then p_qui else null end,
         provenance_libre   = v_libre,
         provenance_at      = now()
   where id = p_lead_id;

  return 'ok';
end $$;

-- Le `drop` ci-dessus a emporté le droit d'exécution avec l'ancienne fonction :
-- sans ce grant, le tunnel public perdrait la question entière.
grant execute on function public.noter_provenance_lead(uuid, text, uuid, text) to anon, authenticated;
