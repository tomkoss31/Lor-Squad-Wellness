-- =============================================================================
-- `users.last_access_at` mentait — jusqu'à 62 jours de retard (01/09/2026)
--
-- CE QUI SE PASSAIT
-- La colonne n'était écrite qu'à UN seul endroit : `loginWithSupabaseCredentials`
-- (supabaseService.ts), c'est-à-dire quand quelqu'un tape son email et son mot
-- de passe. Or l'app est une PWA à session persistante : une fois connecté, on
-- ne repasse plus JAMAIS par ce formulaire — Supabase restaure la session depuis
-- le stockage du navigateur. La colonne gelait donc à la date de la dernière
-- saisie de mot de passe, parfois des mois plus tôt.
--
-- MESURÉ LE 01/09 (dernier accès déclaré vs bilan réellement créé) :
--   Sohyer Clément .... (vide)  vs 29/08 · 3 bilans en 30 jours
--   Alexis Bourgoin ... 29/06   vs 30/08   → 62 jours de retard
--   ZANARDI Sébastien . 15/06   vs 21/07   → 36 jours
--   Maria catalano .... 26/07   vs 17/08   → 22 jours
--   Manon MARTIN ...... 10/08   vs 30/08   → 20 jours
-- On ne crée pas un bilan sans ouvrir l'app.
--
-- ⚠️ POURQUOI ÇA COMPTE PLUS QUE ÇA N'EN A L'AIR
-- C'est la colonne qu'on regarde pour répondre à « qui utilise encore l'app ? ».
-- Elle a servi à décider du ménage d'août (features masquées, crons coupés) et
-- elle allait servir à trancher le sort du bandeau « Ton démarrage ». Une
-- décision de suppression prise sur ce chiffre supprime des choses vivantes.
--
-- ── 1. LE CORRECTIF : une fonction appelée à CHAQUE ouverture ───────────────
-- Le garde-fou de fréquence est CÔTÉ BASE, pas côté navigateur : une horloge
-- de client se règle, se vide, se duplique entre appareils. Ici, deux appels
-- dans la même heure ne produisent qu'une écriture.
-- =============================================================================

create or replace function public.touch_last_access()
returns void
language sql
security definer
set search_path = public, extensions
as $$
  update public.users
     set last_access_at = now()
   where id = (select auth.uid())
     -- Une écriture par heure au maximum. Sans ce filtre, chaque ouverture de
     -- l'app produirait un UPDATE sur `users` — table lue par tout le monde.
     and (last_access_at is null or last_access_at < now() - interval '1 hour');
$$;

comment on function public.touch_last_access() is
  'Marque « cette personne vient d''ouvrir l''app ». Appelée au démarrage quand une session existe. N''écrit qu''une fois par heure et seulement sur SA PROPRE ligne (auth.uid()). Remplace l''écriture unique à la connexion par mot de passe, qui gelait la colonne pendant des mois sur une PWA à session persistante.';

-- `security definer` sans droits ouverts : cf. règle 5 de l'audit du 29/07.
revoke all on function public.touch_last_access() from public;
grant execute on function public.touch_last_access() to authenticated;

-- ── 2. RATTRAPAGE DE L'HISTORIQUE ───────────────────────────────────────────
--
-- On reconstruit un PLANCHER — « cette personne était forcément là au moins à
-- cette date » — à partir d'actions qui exigent d'être connecté : créer une
-- fiche cliente, enregistrer un bilan. Ce n'est pas l'heure exacte d'une
-- connexion, et c'est assumé : c'est une borne basse, toujours plus juste que
-- la valeur actuelle.
--
-- `greatest(...)` : la valeur ne peut que MONTER. On ne réécrit jamais un
-- dernier accès vers le passé.
-- =============================================================================

with activite as (
  select c.distributor_id as user_id, max(x.quand) as vue_le
    from public.clients c
    join lateral (
      select c.created_at as quand
      union all
      select max(a.created_at) from public.assessments a where a.client_id = c.id
    ) x on x.quand is not null
   where c.distributor_id is not null
   group by c.distributor_id
)
update public.users u
   set last_access_at = greatest(coalesce(u.last_access_at, 'epoch'::timestamptz), a.vue_le)
  from activite a
 where a.user_id = u.id
   and (u.last_access_at is null or u.last_access_at < a.vue_le);
