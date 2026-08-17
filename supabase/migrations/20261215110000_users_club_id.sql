-- =============================================================================
-- Où travaille un coach — `users.club_id`
--
-- LE MANQUE, constaté le 17/08 : Mélanie a créé une membre BBC (Gwendoline)
-- et Thomas ne la voyait nulle part. Deux causes, dont celle-ci.
--
-- Un club n'a qu'un `owner_user_id`, et il n'existe AUCUNE notion
-- d'appartenance. `setClientEbeBbc` cherchait donc le club par
-- `owner_user_id = moi` : « La Base Nutrition » appartenant à Thomas, la
-- recherche ne renvoyait rien pour Mélanie et le rattachement était sauté —
-- sans la moindre erreur. Sa membre s'est retrouvée sans `clients.club_id`.
--
-- Ce que ça coûtait à la membre, et personne ne pouvait le voir : l'edge
-- `client-app-data` ne lit les réglages du club QUE si `client.club_id` existe
-- (index.ts:302). Sans lui, son application n'a ni jours de rituel, ni lien
-- Zoom, ni barème des cœurs, ni prix des cartes. Elle marche, et elle est vide.
--
-- ⚠️ Ce n'est PAS un droit d'accès. Le contrôle réel reste la RLS
-- (`clients select own or admin`), inchangée. Cette colonne dit seulement
-- « à quel comptoir cette personne travaille », pour que le rattachement d'un
-- membre à son club cesse de dépendre du fait de POSSÉDER le club.
-- =============================================================================

alter table public.users
  add column if not exists club_id uuid references public.clubs(id) on delete set null;

comment on column public.users.club_id is
  'Le club où ce coach travaille. Sert à rattacher un nouveau membre BBC au bon club quand le coach n''en est pas le proprietaire. N''accorde AUCUN droit : le controle d''acces reste la RLS.';

-- Le propriétaire travaille évidemment dans son club. Idempotent, et sans
-- effet sur qui a déjà une valeur.
update public.users u
   set club_id = c.id
  from public.clubs c
 where c.owner_user_id = u.id
   and c.active
   and u.club_id is null;

-- Tant qu'il n'existe qu'UN club actif, les autres admins y travaillent aussi
-- (décision Thomas, 17/08 : « mélanie = thomas = la base »). La garde sur le
-- compte de clubs fait que cette règle s'éteint d'elle-même le jour où un
-- second club existe — à ce moment-là, le rattachement devient un choix
-- explicite et non plus une déduction.
update public.users u
   set club_id = (select c.id from public.clubs c where c.active limit 1)
 where u.club_id is null
   and u.role = 'admin'
   and u.active
   and (select count(*) from public.clubs where active) = 1;
