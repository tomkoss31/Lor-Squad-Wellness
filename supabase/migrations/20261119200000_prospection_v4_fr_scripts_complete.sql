-- =============================================================================
-- Chantier #3 V4 — Scripts FR complets (2026-05-19)
--
-- Le seed FR initial a couvert :
--   - weight-women : insta, fb, whatsapp (3 scripts)
--   - weight-men   : insta, fb, whatsapp, sms (4 scripts)
--   - sport        : insta uniquement
--   - business     : insta + linkedin
--
-- Manque pour avoir une couverture pro complète :
--   - sport     : fb, whatsapp, sms, tiktok (4 scripts)
--   - business  : fb, whatsapp, sms, tiktok (4 scripts)
--   - weight-women : sms, tiktok (2 scripts)
--   - weight-men   : tiktok (1 script)
--   = 11 nouveaux scripts FR
--
-- Plus : ajout de TikTok comme plateforme valide (CHECK constraint).
-- =============================================================================

begin;

-- ─── 1. Étendre CHECK platform pour inclure TikTok ─────────────────────────
alter table public.prospection_scripts
  drop constraint if exists prospection_scripts_platform_check;
alter table public.prospection_scripts
  add constraint prospection_scripts_platform_check
  check (platform in ('insta', 'fb', 'whatsapp', 'telegram', 'linkedin', 'sms', 'tiktok'));

-- ─── 2. Scripts FR pour sport (fb, whatsapp, sms, tiktok) ──────────────────
do $$ begin if (select count(*) from public.prospection_scripts
                where market_code='fr' and profile_slug='sport' and platform in ('fb','whatsapp','sms','tiktok')) = 0 then
  insert into public.prospection_scripts
    (market_code, profile_slug, platform, body, tip, position, kind, label, language_label) values
    ('fr','sport','fb',
     E'Bonjour [prénom],\n\nVu ton post dans [nom du groupe] sur [détail course / sortie / séance]. Je suis coach nutrition à [ville], j''accompagne des sportifs amateurs sur la récup et la performance — surtout ceux qui combinent boulot et entraînements intenses.\n\nTu prépares un truc en particulier en ce moment ? Course, défi, ou plus du fond ?',
     'FB Messenger sport = groupes course/triathlon/CrossFit. Ton posé, mention course concrète.',
     1, 'first_contact', 'Facebook · groupe course/triathlon', '🇫🇷 Français'),

    ('fr','sport','whatsapp',
     E'Salut [prénom],\n\nC''est [ton prénom], on s''est croisés via [contexte — club / course / coach commun]. Tu m''avais parlé de [détail — ton objectif / point bloquant]. Tu en es où ?',
     'WhatsApp sport = lead chaud déjà rencontré IRL. Réf au contexte de rencontre.',
     1, 'first_contact', 'WhatsApp · contact tiède', '🇫🇷 Français'),

    ('fr','sport','sms',
     E'Salut [prénom], c''est [ton prénom]. On avait parlé de [contexte sportif]. Si tu es toujours sur ton objectif [course / perf / récup], dis-moi, on cale 15 min cette semaine. Sinon bonne continuation dans l''entraînement.',
     'SMS sport = court, viril, sans emoji. Pas de bla bla.',
     1, 'first_contact', 'SMS · court & posé', '🇫🇷 Français'),

    ('fr','sport','tiktok',
     E'Hey [prénom] 🔥\n\nTa vidéo sur [détail séance / record / progression] est dingue. Je suis nutritionniste sportive, j''ai aidé pas mal de coureurs/cyclistes à débloquer leur palier — sans régime extrême.\n\nT''as une seconde pour me dire sur quoi tu bosses en ce moment ?',
     'TikTok = hook fort + emoji + question rapide. Cible jeunes sportifs amateurs.',
     1, 'first_contact', 'TikTok · DM post-vidéo', '🇫🇷 Français');
end if; end$$;

-- ─── 3. Scripts FR pour business (fb, whatsapp, sms, tiktok) ───────────────
do $$ begin if (select count(*) from public.prospection_scripts
                where market_code='fr' and profile_slug='business' and platform in ('fb','whatsapp','sms','tiktok')) = 0 then
  insert into public.prospection_scripts
    (market_code, profile_slug, platform, body, tip, position, kind, label, language_label) values
    ('fr','business','fb',
     E'Bonjour [prénom],\n\nVu ton post dans [nom du groupe] sur [détail — projet / side-hustle / reconversion]. Je développe une activité wellness en parallèle de [ton activité], et je vois des points communs avec ton parcours.\n\nTu cherches un truc précis en ce moment (revenu complémentaire, indépendance), ou tu testes des idées ?',
     'FB business = groupes "side hustle" / "entrepreneur [ville]". Ton pair, pas vendeur.',
     1, 'first_contact', 'Facebook · groupe entrepreneurs', '🇫🇷 Français'),

    ('fr','business','whatsapp',
     E'Salut [prénom],\n\nC''est [ton prénom], on s''était croisés sur [contexte]. Tu m''avais parlé de [détail — envie de développer autre chose / projet en réflexion]. Tu en es où ?',
     'WhatsApp business = lead chaud post-networking. Réf au contexte concret.',
     1, 'first_contact', 'WhatsApp · contact tiède', '🇫🇷 Français'),

    ('fr','business','sms',
     E'Salut [prénom], c''est [ton prénom]. On avait parlé de [contexte — réunion / café / event]. Si tu es toujours ouvert à explorer une activité complémentaire, dis-moi, on cale 20 min cette semaine.',
     'SMS business = direct, mention du contexte. Pas de pitch dans le SMS.',
     1, 'first_contact', 'SMS · court & posé', '🇫🇷 Français'),

    ('fr','business','tiktok',
     E'Hey [prénom] 💼\n\nTon contenu sur [détail — entrepreneuriat / mindset / liberté financière] est inspirant. Je développe une activité wellness en parallèle de ma vie pro, je connecte avec d''autres entrepreneurs.\n\nT''es ouvert à un échange rapide pour voir si ça peut matcher ?',
     'TikTok business = hook ambition + emoji business + question ouverte. Cible 28-45 ans.',
     1, 'first_contact', 'TikTok · DM post-vidéo', '🇫🇷 Français');
end if; end$$;

-- ─── 4. Scripts FR weight-women (sms + tiktok) ─────────────────────────────
do $$ begin if (select count(*) from public.prospection_scripts
                where market_code='fr' and profile_slug='weight-women' and platform in ('sms','tiktok')) = 0 then
  insert into public.prospection_scripts
    (market_code, profile_slug, platform, body, tip, position, kind, label, language_label) values
    ('fr','weight-women','sms',
     E'Salut [prénom], c''est [ton prénom]. On avait parlé de [contexte]. Si tu es toujours sur l''idée de [perdre du poids / retrouver de l''énergie], dis-moi, on peut en discuter cette semaine. Sans pression.',
     'SMS = court, ton naturel, mention contexte. Effet "vraie personne" pas marketing.',
     1, 'first_contact', 'SMS · court & posé', '🇫🇷 Français'),

    ('fr','weight-women','tiktok',
     E'Hello [prénom] ✨\n\nTa vidéo sur [détail — quotidien maman / parcours / quotidien] m''a touchée. Je suis coach nutrition, j''accompagne des femmes qui veulent retrouver leur énergie et perdre du poids sans régime extrême.\n\nT''as 2 min pour me dire où tu en es ?',
     'TikTok = ton chaleureux + emoji léger + ouverture douce. Cible femmes 28-45.',
     1, 'first_contact', 'TikTok · DM post-vidéo', '🇫🇷 Français');
end if; end$$;

-- ─── 5. Scripts FR weight-men (tiktok) ─────────────────────────────────────
do $$ begin if (select count(*) from public.prospection_scripts
                where market_code='fr' and profile_slug='weight-men' and platform='tiktok') = 0 then
  insert into public.prospection_scripts
    (market_code, profile_slug, platform, body, tip, position, kind, label, language_label) values
    ('fr','weight-men','tiktok',
     E'Hey [prénom] 💪\n\nTa vidéo sur [détail — transformation / training / vie pro] est carrée. Je suis coach nutrition, j''accompagne des mecs sur la perte de gras et l''énergie quand on combine boulot prenant et sport.\n\nT''es sur quel objectif en ce moment — perte de gras, prise de masse propre, ou juste retrouver de l''énergie ?',
     'TikTok homme = punchy + emoji muscle + question concrète. Vocabulaire perf.',
     1, 'first_contact', 'TikTok · DM post-vidéo', '🇫🇷 Français');
end if; end$$;

commit;
