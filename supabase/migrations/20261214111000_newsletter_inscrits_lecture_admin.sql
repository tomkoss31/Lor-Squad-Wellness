-- =============================================================================
-- Voir les inscrits du site club, sans ouvrir la table.
--
-- `newsletter_subscribers` est verrouillée : RLS actif, aucun droit pour
-- `anon` ni `authenticated`. C'est bien — une liste d'adresses e-mail n'a rien
-- à faire à portée du navigateur. Mais du coup PERSONNE ne peut les voir.
--
-- Plutôt qu'une policy (qui rouvrirait la table à tout `authenticated`), une
-- fonction qui EXIGE d'être admin — le motif déjà utilisé partout ici.
-- =============================================================================

create or replace function public.get_newsletter_subscribers()
returns table (
  id uuid,
  email text,
  source text,
  created_at timestamptz,
  unsubscribed_at timestamptz
)
language plpgsql
security definer
set search_path = public, extensions
as $$
begin
  -- Le contrôle est DANS la fonction : une `security definer` contourne le RLS
  -- par nature, donc c'est ici et nulle part ailleurs que l'accès se décide.
  if not public.is_admin() then
    raise exception 'access denied';
  end if;

  return query
    select s.id, s.email, s.source, s.created_at, s.unsubscribed_at
      from public.newsletter_subscribers s
     order by s.created_at desc
     limit 500;
end;
$$;

revoke all on function public.get_newsletter_subscribers() from public, anon;
grant execute on function public.get_newsletter_subscribers() to authenticated;

comment on function public.get_newsletter_subscribers() is
  'Les inscrits de la newsletter du site club, pour l''écran admin. Admin uniquement — la table elle-même reste fermée.';
