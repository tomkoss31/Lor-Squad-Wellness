-- =============================================================================
-- Restore Academy completed pour Thomas + Melanie (2026-04-30)
--
-- Note Thomas : 'j'avais termine l'Academy mais j'ai gagne 50 pts en
-- relancant 1 onglet (= last_step a 1, completed_at reset). Je voudrais
-- pas refaire toute l'Academy pour recuperer mes 400 pts.'
--
-- Solution : pour les admins (Thomas + Melanie), on force completed_at
-- a maintenant si pas deja rempli, et last_step = 8. Apres ce fix :
-- la RPC get_user_xp v3 (avec 'if completed_at IS NOT NULL → 400 XP')
-- retournera bien 400 pts Academy.
--
-- N'affecte PAS les vrais distri (qui doivent faire l'Academy normalement).
-- =============================================================================

begin;

-- Insert ou update pour les admins (Thomas, Melanie)
insert into public.user_tour_progress (user_id, tour_key, last_step, completed_at, started_at, updated_at)
select
  u.id,
  'academy',
  8,
  coalesce(
    (select completed_at from public.user_tour_progress where user_id = u.id and tour_key = 'academy'),
    now()
  ),
  coalesce(
    (select started_at from public.user_tour_progress where user_id = u.id and tour_key = 'academy'),
    now()
  ),
  now()
from public.users u
where u.role = 'admin'
on conflict (user_id, tour_key) do update set
  last_step = greatest(coalesce(public.user_tour_progress.last_step, 0), 8),
  completed_at = coalesce(public.user_tour_progress.completed_at, now()),
  skipped_at = null,
  updated_at = now();

commit;
