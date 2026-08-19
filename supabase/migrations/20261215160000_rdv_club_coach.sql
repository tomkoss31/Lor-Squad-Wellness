-- =============================================================================
-- Un rendez-vous du club appartient à quelqu'un.
--
-- Symptôme (Mélanie, 19/08) : « j'ai confirmé le RDV de Marie Rose, il n'est
-- pas dans mon agenda ». Elle a raison, et la confirmation n'y est pour rien.
--
-- LA CAUSE : `AgendaPage.tsx` rattachait tous les RDV découverte au
-- PROPRIÉTAIRE du club — Thomas — parce que le commentaire disait vrai :
-- « elles n'ont pas de coach ». Mesuré le 19/08 : les 20 réservations venues du
-- club ont `coach_user_id` à NULL. Les deux seules qui en ont un viennent du
-- tunnel `/rdv/<prénom>`, pas du club.
-- Et le filtre d'agenda (`isInScope`) exclut tout ce qui n'est pas soi quand le
-- sélecteur est sur « Moi ». Donc Mélanie ne voyait AUCUN rendez-vous du club,
-- confirmé ou non. Celle qui décroche et qui confirme n'héritait de rien.
--
-- C'est la même racine que l'attribution des leads du 16/08 : le tunnel du club
-- n'a pas de propriétaire, parce qu'un club n'est pas un coach.
--
-- ── LA DÉCISION (Thomas, 19/08) ────────────────────────────────────────────
-- « Tous les leads ACTUELS — je dis bien actuels, c'est-à-dire jusqu'à nouvel
--  ordre de ma part — doivent être sur l'agenda de Mélanie. »
--
-- D'où un RÉGLAGE et non une valeur en dur : `discovery.default_coach_user_id`.
-- « Jusqu'à nouvel ordre » se change alors par un UPDATE, sans redéploiement.
-- =============================================================================

update public.clubs
   set settings = jsonb_set(
         settings, '{discovery,default_coach_user_id}',
         to_jsonb('6e552738-3fe5-4cdb-a4c8-15c5d7dca036'::text)  -- Mélanie
       )
 where slug = 'verdun';

-- Rattrapage : les réservations du club qui n'appartenaient à personne.
-- On ne touche PAS à celles qui ont déjà un coach (tunnel /rdv/<prénom>) :
-- elles sont attribuées à juste titre.
update public.rdv_bookings b
   set coach_user_id = (
         select (c.settings->'discovery'->>'default_coach_user_id')::uuid
           from public.clubs c where c.id = b.club_id
       )
 where b.club_id is not null
   and b.coach_user_id is null;

-- Et si le CRM a déjà dit à qui était ce lead, c'est LUI qui gagne : la
-- personne à qui on a confié le contact passe avant le réglage par défaut.
-- Rapprochement par email — seule clé commune, il n'y a pas de lead_id sur
-- rdv_bookings.
update public.rdv_bookings b
   set coach_user_id = l.assigned_to_user_id
  from (
    select distinct on (lower(trim(email))) lower(trim(email)) as mail,
           assigned_to_user_id, created_at
      from public.prospect_leads
     where email is not null and assigned_to_user_id is not null
     order by lower(trim(email)), created_at desc
  ) l
 where b.club_id is not null
   and b.contact is not null
   and lower(trim(b.contact)) = l.mail
   and b.coach_user_id is distinct from l.assigned_to_user_id;
