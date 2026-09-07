-- =============================================================================
-- Un membre dont la fiche a changé de main garde ses droits (07/09)
--
-- LE CONSTAT. Romane ne pouvait plus donner un seul cœur. Elle a été promue
-- coache : le distributeur de sa fiche est devenu ELLE-MÊME, alors que son
-- compte d'application est resté rattaché à Mélanie. La règle comparait les
-- deux, voyait qu'ils différaient, et refusait — sans un mot, l'insertion
-- tombait sur la policy. Rien à l'écran ne disait pourquoi.
--
-- Or les cœurs sont le moteur du BBC. Perdre ce droit à cause d'une promotion,
-- c'est punir exactement les gens qui font marcher le système.
--
-- CE QUI NE CHANGE PAS : il faut toujours un compte d'application RÉEL et NON
-- EXPIRÉ pour ce membre. On n'ouvre rien à quelqu'un qui n'a pas d'accès.
--
-- CE QUI CHANGE : le coach auquel le geste est attribué peut être soit celui du
-- compte d'application, soit le distributeur ACTUEL de la fiche. Les deux sont
-- des rattachements légitimes du même membre ; exiger qu'ils coïncident revient
-- à interdire toute réattribution de fiche.
--
-- ⚠️ Cette fonction garde DEUX portes — `client_referrals` (les cœurs) et
-- `rdv_change_requests` (un membre qui demande à déplacer son rendez-vous). La
-- correction vaut pour les deux, et c'est voulu : dans les deux cas il s'agit
-- d'un membre qui agit depuis son app, et une réattribution de fiche ne doit
-- pas plus lui retirer l'un que l'autre.
--
-- Mesuré avant / après sur les 12 membres du club : 6 bloqués → 0.
-- (Les 5 autres l'étaient faute de compte d'application ; ils en ont reçu un,
--  identique à ce que crée `consume-invitation-token`.)
-- =============================================================================

create or replace function public.client_app_account_is_valid(
  p_client_id text,
  p_coach_id  text
)
returns boolean
language sql
stable
security definer
set search_path to 'public', 'extensions'
as $function$
  select exists (
    select 1
      from public.client_app_accounts a
      left join public.clients c on c.id::text = a.client_id
     where a.client_id = p_client_id
       and a.expires_at > now()
       and (
         -- le coach du compte d'application…
         a.coach_id = p_coach_id
         -- …ou celui qui suit la fiche aujourd'hui.
         or c.distributor_id::text = p_coach_id
       )
  );
$function$;

comment on function public.client_app_account_is_valid is
  'Vrai si ce membre a un compte d''application valide et que le coach vise est soit celui du compte, soit le distributeur actuel de sa fiche. Le second cas existe parce qu''une fiche change de main (promotion, reattribution) sans que le compte d''app soit regenere — cf. Romane, 07/09.';
