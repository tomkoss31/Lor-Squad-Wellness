-- =============================================================================
-- DIAGNOSTIC NOTIFICATIONS PUSH — à coller dans Supabase Studio → SQL Editor
-- Lis chaque bloc de haut en bas. Le commentaire dit quoi conclure.
-- =============================================================================

-- ── 1. Les réglages DB requis par les crons sont-ils posés ? ────────────────
-- Si l'une des deux lignes est VIDE ou erreur → c'est LA cause. Les crons
-- partent mais appellent une URL nulle. Fix : voir bloc 6 en bas.
select
  current_setting('app.settings.supabase_url', true)      as supabase_url_setting,
  case when current_setting('app.settings.service_role_key', true) is null
       then '❌ ABSENT'
       else '✅ présent (' || left(current_setting('app.settings.service_role_key', true), 8) || '…)'
  end                                                      as service_role_key_setting;

-- ── 2. Les 4 crons existent-ils réellement ? ────────────────────────────────
-- Tu dois voir : morning-suivis-digest, rdv-imminent-notifier,
-- daily-actions-notifier-18, daily-actions-notifier-19. Si la liste est vide
-- → migrations cron jamais poussées en prod.
select jobid, jobname, schedule, active
from cron.job
order by jobname;

-- ── 3. Les crons s'exécutent-ils SANS erreur ? (historique récent) ──────────
-- Regarde la colonne status. 'failed' = les settings du bloc 1 manquent, ou
-- l'edge function renvoie une erreur. 'succeeded' = l'appel HTTP est parti OK.
select j.jobname, r.status, r.return_message, r.start_time
from cron.job_run_details r
join cron.job j on j.jobid = r.jobid
where r.start_time > now() - interval '2 days'
order by r.start_time desc
limit 30;

-- ── 4. As-TU une subscription push enregistrée ? ────────────────────────────
-- Remplace 'thomas' si besoin. Si 0 ligne → tu n'as jamais activé les notifs
-- sur ton téléphone (ou pas en PWA installée sur iPhone). Maillon A cassé.
select ps.user_id, u.name, left(ps.endpoint, 40) || '…' as endpoint, ps.user_name, ps.updated_at
from push_subscriptions ps
left join users u on u.id::text = ps.user_id
order by ps.updated_at desc;

-- ── 5. Tes préférences notif sont-elles activées ? ──────────────────────────
-- Toutes doivent être true. Si une est false → ce canal-là est coupé.
select id, name,
       notif_messages, notif_rdv_imminent, notif_morning_digest, notif_daily_actions
from users
where role in ('admin','referent','distributor')
order by name;

-- ── 6. FIX si bloc 1 montre des réglages absents ────────────────────────────
-- DÉCOMMENTE et remplace <SERVICE_ROLE_KEY> par la clé trouvée dans
-- Dashboard → Settings → API → service_role (secret). Puis exécute. Une seule
-- fois. Les crons utiliseront ces valeurs à partir du prochain tick.
--
-- ALTER DATABASE postgres SET "app.settings.supabase_url"     = 'https://gqxnndwrdbghxflwmfxy.supabase.co';
-- ALTER DATABASE postgres SET "app.settings.service_role_key" = '<SERVICE_ROLE_KEY>';
--
-- ⚠️ Après ce ALTER, il faut une nouvelle session pour que current_setting le
-- voie. pg_cron ouvre une session neuve à chaque tick, donc ça prend effet au
-- prochain run automatiquement. Pour re-tester tout de suite, relance le
-- bloc 1 depuis un NOUVEL onglet SQL Editor.
