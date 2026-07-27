-- Extrait publiable d'un témoignage (2026-07-17).
--
-- POURQUOI : certains témoignages contiennent des allégations de SANTÉ
-- (« diabète naissant », « ma glycémie chute », « plus de migraines »,
-- « cellulite »). Publier ça sur une page qui vend = attribuer à un aliment la
-- propriété de traiter une maladie → interdit (Règlement UE 1924/2006), et
-- c'est le COACH qui porte la responsabilité, pas la cliente.
--
-- On ne réécrit JAMAIS `content` : ce sont les mots de la cliente, c'est la
-- trace de ce qu'elle a soumis. `public_excerpt` porte la version publiable
-- (obtenue uniquement par COUPE, jamais par ajout de mots).
-- L'affichage public lit `coalesce(public_excerpt, content)`.
alter table public.client_testimonials
  add column if not exists public_excerpt text;

comment on column public.client_testimonials.public_excerpt is
  'Extrait publiable (coupe des allégations santé). NULL = publier content tel quel. Ne jamais réécrire content.';
