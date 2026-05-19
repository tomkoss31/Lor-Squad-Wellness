-- =============================================================================
-- Chantier #3 V4 — Seed EN (2026-05-19)
--
-- Adaptation EN du seed FR. Marché EN = anglo-saxons (US, UK, intl). Ton
-- casual, plus direct, "no pressure" récurrent. Plateformes : Insta + LinkedIn
-- + WhatsApp (moins dominant qu'en LatAm/Asie).
--
-- body_fr renseigné sur les tables qui le supportent (reply_tree, objections,
-- followups, closing, special_cases) pour que le coach FR comprenne ce qu'il
-- copie-colle.
-- =============================================================================

begin;

-- ============================================================================
-- 1. MINDSET BLOCKS
-- ============================================================================
do $$ begin if (select count(*) from public.prospection_mindset_blocks where market_code='en') = 0 then
  insert into public.prospection_mindset_blocks (market_code, kind, title, body, position) values
    ('en','truth','It''s not a volume game, it''s a sorting game.',
     E'Your job isn''t to convince. Your job is to find the right people at the right time. If you send 100 messages trying to convince 100 people, you''ll burn out in a week. If you send 100 messages to identify the 5 who are ready, you build a sustainable business.',
     1),
    ('en','truth','The more relaxed you are, the more you attract.',
     E'A prospect can sense if you''re desperate to "recruit" them. Detachment attracts. Pressure repels. If you need this sale to pay rent, it shows in your messages.',
     2),
    ('en','truth','Silence isn''t personal rejection.',
     E'80% of your messages won''t get a reply. That doesn''t mean you''re bad at this. It means people are busy, it''s not the right time, or they''re not the right target. Keep going.',
     3),
    ('en','error','Pitching in the first message.',
     E'You lose 90% of prospects in one sentence. The first message has one goal only: get a reply. Not sell.',
     1),
    ('en','error','Sending the same message to 50 people.',
     E'Copy-paste is obvious from a mile away. Always personalize at least [detail from their profile]. If you can''t find a precise detail to mention, they''re not a good prospect — move on.',
     2),
    ('en','error','Following up at D+1, D+2, D+3.',
     E'You move from coach to harasser in 48 hours. One follow-up only, at D+3, never more.',
     3),
    ('en','error','Arguing on "no"s.',
     E'A clean "no" sometimes comes back 6 months later. A badly handled "no" never comes back.',
     4),
    ('en','error','Lying about the business model.',
     E'If someone asks "is it MLM?", the honest answer is yes. Lying destroys your credibility forever.',
     5);
end if; end$$;

-- ============================================================================
-- 2. METRICS
-- ============================================================================
do $$ begin if (select count(*) from public.prospection_metrics where market_code='en') = 0 then
  insert into public.prospection_metrics (market_code, kind, label, value_min, value_max, value_unit, hint, position) values
    ('en','funnel_step','M1 messages sent',                  100, 100, 'messages', 'Baseline for a beginner', 1),
    ('en','funnel_step','Replies received',                   15,  25, 'replies',  '15-25% if well personalized', 2),
    ('en','funnel_step','Qualified conversations (M2-M3)',     5,  10, 'convs',    '5-10 truly engaged dialogues', 3),
    ('en','funnel_step','Calls / Zooms booked',                1,   3, 'calls',    'Discovery call target', 4),
    ('en','funnel_step','New clients',                         0,   1, 'clients',  'First client: budget 100-200 M1', 5),
    ('en','pipeline_target','M1 sent awaiting reply',          50, 100, 'messages', 'Keep this stock steady', 1),
    ('en','pipeline_target','Active conversations (M2-M3)',    10,  20, 'convs',    'You juggle these', 2),
    ('en','pipeline_target','Calls booked next 7 days',         2,   5, 'calls',    'If less, increase M1 volume', 3),
    ('en','pipeline_target','Clients in closing',               1,   3, 'leads',    'Your finalists', 4),
    ('en','weekly_kpi','Number of M1 sent',     null, null, 'count', 'Measures your effort. Under 50/week = not enough.', 1),
    ('en','weekly_kpi','Reply rate',            null, null, 'pct',   'Under 15% = revisit M1 quality.', 2),
    ('en','weekly_kpi','Call→client conversion',null, null, 'pct',   'Under 20% = revisit your closing.', 3);
end if; end$$;

-- ============================================================================
-- 3. PROFILE FLAGS
-- ============================================================================
do $$ begin if (select count(*) from public.prospection_profile_flags where market_code='en') = 0 then
  insert into public.prospection_profile_flags (market_code, profile_slug, flag_type, text, position) values
    ('en','weight-women','green','Recent activity (post < 2 weeks)', 1),
    ('en','weight-women','green','Personal posts with engagement (comments, likes)', 2),
    ('en','weight-women','green','Clear bio with intent (goal, job, passion)', 3),
    ('en','weight-women','green','No competing coach in the same niche', 4),
    ('en','weight-women','red','Private profile with no context', 1),
    ('en','weight-women','red','100% business / shop / affiliation account', 2),
    ('en','weight-women','red','No post in 6+ months', 3),
    ('en','weight-women','red','Thousands of followers but low engagement (fake)', 4),
    ('en','weight-men','green','Recent activity (post < 2 weeks)', 1),
    ('en','weight-men','green','Sport, performance, energy, intense work life posts', 2),
    ('en','weight-men','green','Bio mentions a clear goal (cut, bulk, energy)', 3),
    ('en','weight-men','green','No competing coach in the same niche', 4),
    ('en','weight-men','red','Private profile with no context', 1),
    ('en','weight-men','red','Bio centered purely on looks (model, shoots)', 2),
    ('en','weight-men','red','No post in 6+ months', 3),
    ('en','weight-men','red','Saturated gym influencer profile', 4),
    ('en','sport','green','Active on their practice (recent training post)', 1),
    ('en','sport','green','Mentions precise goals (race, PR, season target)', 2),
    ('en','sport','green','Genuine engagement on posts', 3),
    ('en','sport','green','Not sponsored / not already coached', 4),
    ('en','sport','red','Pro athlete account with sponsors', 1),
    ('en','sport','red','No post in 6+ months', 2),
    ('en','sport','red','"Fitness shopping" profile with no actual practice', 3),
    ('en','sport','red','Bio already says "sports nutrition coach"', 4),
    ('en','business','green','Recent activity, personal posts (journey, day-in-life)', 1),
    ('en','business','green','Clear bio with profession or entrepreneur status', 2),
    ('en','business','green','Real engagement (substantive comments)', 3),
    ('en','business','green','Not already top distributor of a competing MLM', 4),
    ('en','business','red','Bio = only competing MLM affiliate link', 1),
    ('en','business','red','High follower / zero engagement (fake)', 2),
    ('en','business','red','No personal photo / no personal post', 3),
    ('en','business','red','Stories saturated with business pitches', 4);
end if; end$$;

-- ============================================================================
-- 4. SOURCES
-- ============================================================================
do $$ begin if (select count(*) from public.prospection_sources where market_code='en') = 0 then
  insert into public.prospection_sources (market_code, profile_slug, kind, label, detail, position) values
    ('en', null, 'hashtag_advanced',
     'Ideal Insta post ratio',
     E'60% value (tips, education, hacks) · 30% personal (journey, daily life, family, failures) · 10% CTA (testimonials, "DM me if…").\nCommon mistake: only posting product photos or client results. Nobody follows you for that. People follow you for YOU.', 1),
    ('en', null, 'hashtag_advanced',
     '30-second profile scan method',
     E'Before sending an M1, check 4 things: (1) recent activity — post < 2 weeks · (2) genuine engagement · (3) bio with clear intent · (4) not already coached by a competitor.', 2),
    ('en','weight-women','fb_groups','Local wellness Facebook groups',
     'Search: "weight loss [city]", "healthy moms", "intuitive eating". Add value FIRST, DM privately later.', 1),
    ('en','weight-women','irl','School / nursery pickup',
     'Moms 30-45, 8:30am / 4:30pm slots, natural friendly tone. No direct pitch, just create rapport.', 1),
    ('en','weight-women','irl','Gyms (group classes)',
     'Yoga, pilates, body pump. Skip the heavy weights section (different target).', 2),
    ('en','weight-women','recommendations','Personal network + current clients',
     'Your best source of qualified leads. See §8 "Referral request".', 1),
    ('en','weight-women','inbound_content','Insta/TikTok weight loss content',
     'Client testimonials, "what I wish I knew", balanced recipes. Inbound leads are 3× warmer.', 1),
    ('en','weight-men','fb_groups','Local "men''s fitness [city]" groups',
     'Posts about cutting, bulking, energy. Engage with value before DM.', 1),
    ('en','weight-men','irl','Gyms, CrossFit boxes, team sports clubs',
     'Football, basketball, padel. 7-9am or 7-9pm slots. Natural direct tone.', 1),
    ('en','weight-men','recommendations','Professional network + male clients',
     'Referrals = #1 channel here (men''s circles are more closed).', 1),
    ('en','weight-men','inbound_content','Performance / recovery / work-energy content',
     'Avoid "gentle weight loss" angle → targets women. Speak performance, sleep, lean mass.', 1),
    ('en','sport','fb_groups','Local running / triathlon / CrossFit groups',
     'Look for posts like "how do you handle nutrition on long runs?". Add value.', 1),
    ('en','sport','irl','CrossFit boxes, running clubs, triathlon clubs',
     'Physical presence = instant credibility. Engage after a session.', 1),
    ('en','sport','recommendations','S&C coaches, physios, sports doctors',
     'Cross-referral partnerships possible. Win-win for the athlete.', 1),
    ('en','sport','inbound_content','Pre/peri/post-workout nutrition, recovery content',
     'Strava clubs, S&C coach accounts. Amateur athletes hang out there.', 1),
    ('en','business','fb_groups','"Side hustle", "entrepreneur [city]" groups',
     'Lighter moderation than Insta. Add business value before pitching.', 1),
    ('en','business','irl','BNI, coworking spaces, entrepreneur meetups',
     'Entrepreneurial networking. Don''t do MLM vibes — peer tone.', 1),
    ('en','business','recommendations','Existing pro network, former colleagues',
     'Word-of-mouth is still the most credible channel for business.', 1),
    ('en','business','inbound_content','Mindset, independence, personal journey content',
     'Avoid "get rich" angle, prioritize "here''s my journey". Storytelling §9.', 1);
end if; end$$;

-- ============================================================================
-- 5. HASHTAGS — categorization existants + new weight-men
-- ============================================================================
update public.prospection_hashtags set category = 'mainstream'
  where market_code = 'en' and hashtag in (
    '#weightlossjourney','#healthylifestyle','#caloriedeficit',
    '#fitnessmotivation','#gymlife','#crossfit',
    '#entrepreneurmindset','#financialfreedom','#workfromhome'
  );

update public.prospection_hashtags set category = 'niche'
  where market_code = 'en' and hashtag in (
    '#fitmom','#weightlosstransformation','#fitover40','#healthyweightloss','#mindfuleating','#sustainablehealth',
    '#trailrunning','#endurancesports','#sportperformance','#athletenutrition','#recoveryday','#amateurathlete','#fuelyourbody',
    '#sidehustleEN','#mompreneurEN','#digitalnomad','#wellnesspreneur','#sidehustlelife','#mompreneurlife'
  );

update public.prospection_hashtags set
  category = 'cross',
  crossover_hint = 'Cross with #fitmom or #postpartum to reach the moms niche.'
  where market_code = 'en' and profile_slug = 'weight-women' and hashtag = '#weightlossjourney';

update public.prospection_hashtags set
  category = 'cross',
  crossover_hint = 'Cross with a city hashtag (#nyc #london #la) to target local.'
  where market_code = 'en' and profile_slug = 'sport' and hashtag = '#trailrunning';

insert into public.prospection_hashtags (market_code, profile_slug, hashtag, category, crossover_hint, position) values
  ('en','weight-men','#dadbod','niche',null,1),
  ('en','weight-men','#fitover40men','niche',null,2),
  ('en','weight-men','#leanbulk','niche',null,3),
  ('en','weight-men','#cuttingseason','niche',null,4),
  ('en','weight-men','#dadgains','niche',null,5),
  ('en','weight-men','#mensfitness','mainstream',null,6),
  ('en','weight-men','#bodyrecomp','niche',null,7),
  ('en','weight-men','#weightlossformen','mainstream',null,8),
  ('en','weight-men','#busydadfit','cross','Cross with a work/career hashtag (#corporatedad, #ceolife) for 30-50 working male target.',9)
on conflict (market_code, profile_slug, hashtag) do nothing;

-- ============================================================================
-- 6. SCRIPTS M1 — weight-men EN
-- ============================================================================
do $$ begin if (select count(*) from public.prospection_scripts where market_code='en' and profile_slug='weight-men') = 0 then
  insert into public.prospection_scripts (market_code, profile_slug, platform, body, body_fr, tip, position, kind, label, language_label) values
    ('en','weight-men','insta',
     E'Hey [name],\n\nSaw your post about [detail from profile]. I work with guys on nutrition and getting back in shape — mostly fat loss, energy and recovery when juggling intense work and training.\n\nQuick question — are you more on the fat loss side, lean bulk, or just trying to get your energy back day-to-day?',
     E'Salut [prénom], j''ai vu ton post sur [détail]. Je bosse avec des hommes sur la nutrition et la remise en forme — surtout perte de gras, énergie, récup quand on combine boulot intense et sport. Tu es plutôt perte de gras, prise de masse propre, ou retrouver de l''énergie ?',
     'Vocabulaire perf/énergie/récup. Évite "wellness" et "feel good" qui éjectent les mecs.',
     1, 'first_contact', 'Instagram DM · First contact', '🇬🇧 English'),
    ('en','weight-men','fb',
     E'Hi [name],\n\nSaw your post in [group name] about [detail]. I''m a nutrition coach in [city], I work with 30-50 men on getting back in shape — particularly those balancing a demanding job and not wanting their body to crash.\n\nWhere are you at? Looking for something specific or just experimenting?',
     E'Bonjour [prénom], j''ai vu ton post dans [groupe]. Je suis coach nutrition à [ville], je bosse avec des hommes 30-50 ans sur la remise en forme — surtout ceux qui combinent un boulot prenant et ne veulent pas que le corps lâche. Tu en es où ?',
     'FB Messenger = ton plus posé qu''Insta. Groupes "men''s fitness" = mine d''or.',
     1, 'first_contact', 'Facebook Messenger · First contact', '🇬🇧 English'),
    ('en','weight-men','whatsapp',
     E'Hey [name], it''s [your name], we crossed paths via [context]. You mentioned [detail — fat loss / energy / training]. Where are you at with it?',
     E'Salut [prénom], c''est [ton prénom], on s''est croisés via [contexte]. Tu m''avais parlé de [détail — perte de gras / énergie / sport]. Tu en es où ?',
     'WhatsApp = lead chaud déjà rencontré. Direct mais pas agressif.',
     1, 'first_contact', 'WhatsApp · Direct contact', '🇬🇧 English'),
    ('en','weight-men','sms',
     E'Hey [name], it''s [your name]. We talked about [context]. If you''re still on the idea of [goal], let me know — happy to chat this week.',
     E'Salut [prénom], c''est [ton prénom]. On avait parlé de [contexte]. Si tu es toujours sur [objectif], dis-moi, on peut discuter cette semaine.',
     'SMS = court, sans emoji, ton viril posé. Effet "vraie personne".',
     1, 'first_contact', 'SMS · Short & grounded', '🇬🇧 English');
end if; end$$;

-- ============================================================================
-- 7. REPLY TREE
-- ============================================================================
do $$ begin if (select count(*) from public.prospection_reply_tree where market_code='en') = 0 then
  insert into public.prospection_reply_tree (market_code, profile_slug, level, branch, body, body_fr, tip, position) values
    -- weight-women
    ('en','weight-women','M2','positive',
     E'Glad you''re sharing, [name] 🙏\n\nTo give you a useful answer — is this something you''ve been wanting for a while, or did it pop up recently? And have you tried things that didn''t work?\n\nReason I ask: depending on where you are, I''ll either share concrete things or not at all. Really depends on you.',
     E'Top que tu me dises [prénom]. C''est un objectif récent ou de longue date ? T''as déjà testé des choses qui n''ont pas marché ? Selon ta réponse je te partage des trucs concrets ou pas.',
     'Creuser avant de pitcher.', 1),
    ('en','weight-women','M2','vague',
     E'I get it [name]. It often goes like this — you sense something needs to change without knowing exactly what.\n\nDifferent angle: what bothers you the most right now? The scale, how you feel in your clothes, your energy, your relationship with food? Usually one point stands out.',
     E'Je te comprends. Quel est LE point qui te dérange le plus : balance, vêtements, énergie, rapport bouffe ?',
     'Question fermée qui ouvre.', 1),
    ('en','weight-women','M2','negative',
     E'No problem [name], thanks for taking the time to reply 🙏\n\nAll the best. If anything changes one day, reach out without hesitation. Otherwise, enjoy!',
     E'Pas de souci [prénom], merci d''avoir répondu. Belle continuation, reviens vers moi si ça change un jour.',
     'Fermeture propre.', 1),
    ('en','weight-women','M2','question',
     E'Good question.\n\nIn a nutshell, I coach on nutrition — no restrictive diet. We work on balanced eating, energy, and habits that last. I use natural products as complement when relevant.\n\nBut before I say more, tell me where you''re at. That''s what will tell us if what I do can help you.',
     E'Bonne question. En gros, coaching nutrition pas régime, équilibre + énergie + habitudes durables, produits naturels en complément. Mais dis-moi d''abord où tu en es.',
     'Réponse courte puis recentre.', 1),
    ('en','weight-women','M3','hot',
     E'Thank you for sharing all of this, [name], it''s valuable 🙏\n\nWhat you describe, I see often. The good news: it''s manageable with the right approach.\n\nI''d rather not dump everything in writing. 15-20 mins on Zoom this week? I''ll show you concretely how I work, you decide if it speaks to you. Zero commitment.\n\nWould you prefer [day 1] or [day 2]?',
     E'Closing visio 15-20 min, zéro engagement, choix entre 2 jours.',
     'Choix entre 2 dates = +RDV.', 1),
    ('en','weight-women','M3','lukewarm',
     E'No worries [name], I don''t want to push you.\n\nI''ll leave you my contact. Whenever it resonates, just reach out. And if you want something concrete to try in the meantime, let me know, happy to share.',
     E'Pas de souci, je te laisse mon contact + offre un tip concret pour garder la porte ouverte.',
     'Échantillon de valeur garde le lead chaud.', 1),
    -- weight-men
    ('en','weight-men','M2','positive',
     E'Glad you''re cutting to the chase, [name] 💪\n\nTell me more: how many training sessions per week, and what''s actually blocking you right now? Recovery, end-of-day energy, fat gain despite training, sleep?\n\nDifferent answer depending on where it''s stuck.',
     E'Top que tu sois cash. Combien de séances/sem ? C''est quoi qui bloque ? Récup, énergie, gras malgré le training, sommeil ?',
     'Vocabulaire perf + blocages précis.', 1),
    ('en','weight-men','M2','vague',
     E'OK [name], I get you.\n\nMore direct question: can you stack weeks without an energy crash, or are there moments you feel you''re pushing the rope?\n\nMost guys I meet "manage fine"... until they hit a wall (fatigue, fat gain, injury). If you''re in the first camp, great. If not, we can dig.',
     E'Question plus directe : t''enchaînes les semaines ou tu tires sur la corde ? La plupart se gèrent "bien"... jusqu''au mur.',
     'Pas de "douceur". Pique légère = il répond.', 1),
    ('en','weight-men','M2','negative',
     E'No worries [name], wanted to ask the question, not push you 🙏\n\nAll the best with your training. If nutrition ever becomes a topic, reach out.',
     E'Pas de souci, je voulais poser la question pas te forcer. Bonne continuation.',
     'Fermeture virile.', 1),
    ('en','weight-men','M2','question',
     E'Good question.\n\nConcretely, I coach men on nutrition — performance, recovery, lean bulk or fat loss depending on the goal. I work with protein, targeted supplements (creatine, BCAAs) as complement to solid food intake.\n\nBefore I say more — tell me what''s blocking you or what you want to improve. That''ll guide my answer.',
     E'Coaching nutrition perf/récup/lean bulk ou cut, protéines + supplements ciblés. Dis-moi d''abord ce qui te bloque.',
     'Technique précise, vocabulaire qu''il comprend.', 1),
    ('en','weight-men','M3','hot',
     E'What you describe is classic, [name], and there''s room to unlock things.\n\nRather than a wall of text — 20 mins on Zoom? I''ll walk you through how I analyze men''s nutrition, you decide if it lands. Zero commitment, no automatic sell.\n\n[day 1] or [day 2]?',
     E'Visio 20 min, zéro engagement, choix entre 2 jours.',
     'Format court adopté.', 1),
    ('en','weight-men','M3','lukewarm',
     E'No problem [name], take your time.\n\nIf you want me to share 2-3 concrete things on [their blocker] without a call, let me know, I''ll send. Otherwise, all the best, and we''ll reconnect whenever.',
     E'Offre 2-3 tips concrets sur son point bloquant, sinon à la prochaine.',
     'Tips concrets gardent le lead.', 1),
    -- sport
    ('en','sport','M2','positive',
     E'Awesome [name] 💪\n\nTell me more: what''s your weekly volume, and what''s the thing that bugs you most? Recovery between sessions, energy at the end of long sessions, GI issues during races, sleep, something else?\n\nI''m not asking for nothing — depending on the blocker I won''t say the same thing.',
     E'Top. Volume hebdo ? Point bloquant : récup, énergie en fin de sortie, digestion en course, sommeil ?',
     'Le sportif aime être traité en sportif.', 1),
    ('en','sport','M2','vague',
     E'Cool if it''s rolling, [name].\n\nJust curious: can you stack weeks without dips, or are there moments you feel you''re pushing the rope? Most athletes I meet manage "fine"... until they hit a wall.\n\nIf it happens or if you want to optimize, I''m here.',
     E'Sympa si ça roule. Tu enchaînes ou tu tires sur la corde ? Le "mur" arrive à tous.',
     'Le "mur" est universel chez les sportifs amateurs.', 1),
    ('en','sport','M2','negative',
     E'No worries [name], wanted to ask, not push 🙏\n\nAll the best with training. If nutrition becomes a topic, reach out.',
     E'Pas de souci, je voulais poser la question. Bonne continuation.',
     'Fermeture propre.', 1),
    ('en','sport','M2','question',
     E'Good question.\n\nConcretely, I coach athletes on nutrition: pre/peri/post-effort, recovery between sessions, energy on long distances. I work with targeted products (protein, electrolytes, vitamins) as complement.\n\nBefore I say more — tell me what''s blocking you or what you want to improve.',
     E'Coaching nutrition sport, périodisation effort + récup. Dis-moi d''abord ce qui te bloque.',
     'Technique sport, pas perte de poids.', 1),
    ('en','sport','M3','hot',
     E'What you describe is classic, [name], and there''s room to unlock a lot.\n\nRather than walls of text — 20 mins on Zoom? I''ll show you how I analyze sports nutrition, you decide if it lands. Zero commitment, no automatic sell.\n\n[day 1] or [day 2]?',
     E'Visio 20 min, choix de date.',
     'Format court.', 1),
    ('en','sport','M3','lukewarm',
     E'No problem [name], take your time.\n\nIf you want me to share 2-3 concrete things on [their blocker] without a call, let me know. Otherwise we''ll reconnect whenever.',
     E'2-3 tips concrets sur son blocker.',
     'Tips concrets.', 1),
    -- business
    ('en','business','M2','positive',
     E'Cool [name], thanks for being open 🙏\n\nIn short: it''s in wellness (nutrition, well-being). I work with an international team. The model lets me build income alongside [your activity].\n\nBefore I get into details — what''s pushing you to explore this right now? Specific goal (extra income, independence, career change), or curiosity?',
     E'Cadre clair + question qualifiante motivation.',
     'Mesure motivation avant d''investir du temps.', 1),
    ('en','business','M2','vague',
     E'Legit question [name].\n\nI''ll be straight: it''s a model where you build a wellness products distribution activity, with a team that trains you. There''s an upfront investment, and it grows based on time you put in.\n\nGetting the picture? If it''s not your thing, tell me straight — I prefer a clear "no" over a fake "yes". If still an option, we can go deeper.',
     E'Transparence totale. Distribution wellness, équipe qui forme, investissement initial, croissance proportionnelle au temps.',
     'Radical transparence = crédibilité.', 1),
    ('en','business','M2','negative',
     E'No worries [name], thanks for being straight 🙏\n\nI''d tagged in my head it might not be your thing, totally OK. All the best, and if one day the conversation makes sense it''ll happen naturally.',
     E'Fermeture chaleureuse mais nette.',
     'Le prospect revient parfois.', 1),
    ('en','business','M2','question',
     E'You go straight to the point, I like that [name].\n\nI work with [company name] on the nutrition / wellness side. The company has been around for [X years] in [Y countries].\n\nBut the product is only half the story. The other half is the distribution model. Easier to explain on Zoom if you''re open. If you already have a fixed opinion on this type of model, tell me — we won''t waste each other''s time.',
     E'Transparence + filtre rapide.',
     'Pas de tour autour du pot.', 1),
    ('en','business','M3','hot',
     E'What you''re telling me is exactly what I wanted to hear [name] — you sound clear on what you''re looking for.\n\nTo go further, 30 mins on Zoom? I''ll walk you through the model properly: company, products, comp plan, time and investment required. You ask everything. Then we see together.\n\nNo hidden pitch, no fake urgency. Just info. [day 1] or [day 2]?',
     E'Visio 30 min, présentation modèle complète, transparence totale.',
     'Format business sérieux.', 1),
    ('en','business','M3','lukewarm',
     E'I sense it''s not the right timing [name], no worries.\n\nLeaving you my contact. Whenever you think "let me dig into this story", reach out. If never, no problem.',
     E'Posé, pas d''insistance.',
     'Le business prospect revient 6-12 mois plus tard.', 1);
end if; end$$;

-- ============================================================================
-- 8. OBJECTIONS
-- ============================================================================
insert into public.prospection_objections (market_code, slug, title, meaning, bad_response, good_response, good_response_fr, warning, position) values
  ('en','cest-cher','It''s expensive',
   'Either she doesn''t see the value, or she can''t / won''t put that money on this.',
   'Downplay ("it''s the price of a coffee"), or add a discount at the first objection.',
   E'I get you [name]. Expensive compared to what? And what would make it worth it in your eyes?\n\nI''m not asking to convince you — depending on your answer, either it''s not the right time, or we can look at a more suitable format.',
   E'Cher par rapport à quoi ? Qu''est-ce qui le rendrait worth it ? Pas pour convaincre, juste pour savoir.',
   null, 1),
  ('en','pas-le-temps','I don''t have time',
   'Either no priority, or fear it''ll take more time than she has.',
   E'"But it''s quick!" — lazy answer that doesn''t address the objection.',
   E'Fair, and it''s often because we don''t take the time that things don''t move.\n\nIf I told you "let''s wait 3 months and you tell me", is that open or a firm no? No wrong answer, I just want to know where we''re at.',
   E'C''est juste, et souvent c''est parce qu''on prend pas le temps que ça bouge pas. "On attend 3 mois et tu me dis" : ouvert ou non ferme ?',
   null, 2),
  ('en','herbalife-mlm','Is it Herbalife / MLM / a pyramid scheme?',
   'She''s afraid of being scammed, or had a bad experience (disappointed relative).',
   'Deny, say "no it''s different", deflect.',
   E'Yes it''s [brand], and yes it''s multi-level distribution. Not a pyramid in the illegal sense — the difference is there''s a real product consumed by end clients.\n\nThere''s true and false stuff circulating on this kind of model. If you tell me what specifically blocks you, I''ll answer straight.',
   E'Oui c''est [marque], oui distribution multi-niveaux. Pas pyramidal au sens illégal — produit réel + clients finaux. Dis-moi ce qui te bloque précisément.',
   'Mentir détruit ta crédibilité pour toujours.', 3),
  ('en','deja-essaye','I''ve tried X and it didn''t work',
   'She''s disappointed, suspicious, wants reassurance this won''t be the same.',
   E'"Ah but it''s not the same!" — without explaining why.',
   E'I hear you [name]. What actually happened? Depending on where it broke down — motivation, method, support, product — I can tell you if you''ll fall in the same trap or not. No magic promises, just honesty.',
   E'Qu''est-ce qui s''est passé concrètement ? Selon où ça a coincé je te dis si tu vas retomber dans le même piège.',
   null, 4),
  ('en','en-parler-conjoint','I need to talk to my partner',
   'Either legit couple decision, or polite escape.',
   E'"It''s your decision!" (patronizing), or "You don''t need their approval!"',
   E'Of course, healthy to talk it through. Want me to prep a clear summary for them, or do you prefer to explain yourself? And concretely, when do we sync back?',
   E'Bien sûr, sain d''en parler. Tu veux un résumé clair, ou tu expliques toi-même ? On se redit quoi quand ?',
   'Le "on se redit quand" oblige à fixer une date.', 5),
  ('en','je-reflechis','I''ll think about it',
   '90% of the time = polite "no". 10% = actually needs to think.',
   E'"Take your time!" → you lose them definitively.',
   E'OK [name] — is that a "yes but I need to digest", or a "no but I don''t want to say it to your face"?\n\nBoth are fine, I just want to know. If it''s a no, we save each other time. If it''s a yes that''s maturing, we set a date to talk again.',
   E'C''est plutôt "yes mais je digère" ou "no mais je veux pas te le dire en face" ? Les deux sont OK.',
   null, 6),
  ('en','trop-beau','Too good to be true',
   'Healthy suspicion. Actually a good sign.',
   'Doubling down on promises to reassure (backfires).',
   E'You''re right to be suspicious. It''s not magic. There''s work behind it, doesn''t work for everyone, results depend on you.\n\nIf you want I can also share the less glamorous sides: what it takes, where people quit, why some fail. More useful than nice stories.',
   E'T''as raison de te méfier. Pas magique. Je peux aussi te raconter les côtés moins glamour.',
   null, 7),
  ('en','combien-tu-gagnes','How much do you make?',
   'She wants concrete proof, not BS.',
   'Throw out wild numbers, or dodge.',
   E'Straight up: I''m at [$X/month] after [Y months/years]. For transparency, my first months were [$Z]. Progressive and depends on time you put in and who you surround yourself with.\n\nIf you want, I''ll show you the company''s public earnings disclosure (avg distributor income — it''s public and required).',
   E'Je suis à [X$/mois] après [Y]. Premiers mois [Z$]. Public earnings disclosure dispo.',
   'JAMAIS d''invente. Earnings disclosure obligatoirement publique. Mentir = faute pro.', 8),
  ('en','ton-interet','But you''ll make money if I sign up',
   'She wants to be sure you''re talking for her good, not just your commission.',
   'Deny or minimize your stake — perceived as dishonest.',
   E'Yes, true, and let''s be clear about it. I earn when someone I sponsor produces — so I have zero interest in sponsoring someone who won''t. It''s just more work for nothing.\n\nMy interest is to work with aligned people. If that''s not you, no problem, we waste each other''s time.',
   E'Oui c''est vrai. Je gagne quand quelqu''un que j''ai parrainé fait du chiffre — donc zéro intérêt à parrainer qui ne le fera pas.',
   null, 9)
on conflict (market_code, slug) do nothing;

-- ============================================================================
-- 9. FOLLOWUPS
-- ============================================================================
do $$ begin if (select count(*) from public.prospection_followups where market_code='en') = 0 then
  insert into public.prospection_followups (market_code, kind, day_offset, title, body, body_fr, warning, position) values
    ('en','post_call', 0, 'D0 — Right after the call (within the hour)',
     E'Thanks [name] for the chat! As we agreed, I''ll let you digest.\n\nQuick recap of what we said:\n1. [key point 1]\n2. [key point 2]\n3. [key point 3]\n\nAny questions by tomorrow, write me. Have a good evening 🙏',
     E'Merci pour l''échange ! Récap : [point 1] [point 2] [point 3]. Questions d''ici demain, écris-moi.',
     null, 1),
    ('en','post_call', 2, 'D+2 — First check-in',
     E'Hey [name], hope you''re well! Had time to think or ask your questions?\n\nLet me know where you''re at, even if it''s a no — more useful than silence.',
     E'Hey, t''as eu le temps de réfléchir ? Dis-moi où t''en es, même si c''est non.',
     null, 2),
    ('en','post_call', 5, 'D+5 — Final message (max)',
     E'Hi [name], last message from me so I don''t hound you 🙏\n\nIf you''re still not sure, or if you prefer to revisit later, tell me. Otherwise I''ll let it go and we''ll cross paths when you''re ready.',
     E'Dernier message pour pas te poursuivre. Si tu veux reparler plus tard, dis-le. Sinon je laisse.',
     'Si pas de réponse au J+5, tu ARRÊTES. Tu ne relances plus.', 3),
    ('en','post_call', 30, 'D+30 — Reactivation (one month later)',
     E'Hey [name], it''s been a month, just checking in 😊\n\nWhere are you on [their goal]? No pitch, just curious.',
     E'Ça fait un mois, je prends des nouvelles. Où t''en es sur [objectif] ? Pas de pitch.',
     null, 4),
    ('en','client_onboarding', 0, 'D0 — Day of purchase',
     E'Hey [name]! Welcome on board 💪 Sending you everything for the start. Let''s schedule a call on [day] to see how you''re getting used to the products, sound good?',
     E'Bienvenue ! Je t''envoie tout pour le démarrage. On cale un appel [jour] pour le suivi ?',
     null, 1),
    ('en','client_onboarding', 7, 'D+7 — First week',
     E'Hey [name], first week done! How''s it going? Did you manage to integrate [main habit]? Tell me what works and what''s stuck.',
     E'Première semaine ! Tu as réussi à intégrer [habitude] ? Dis-moi ce qui marche et ce qui coince.',
     null, 2),
    ('en','client_onboarding', 30, 'D+30 — First month',
     E'Hey [name], already a month 🎉 Time for a review? Let''s look at what shifted and what we adjust for month 2. When works for you this week?',
     E'Déjà un mois 🎉 On fait un bilan ? Quand cette semaine ?',
     null, 3),
    ('en','reactivation_old', 90, 'D+90 (3 months) — Old prospect',
     E'Hey [name], been a while!\n\nFound your profile again and wondered where you are on [their goal from X months ago]. No pitch, just curious.',
     E'Ça fait un moment ! Je tombe sur ton profil, où t''en es de [objectif] ? Pas de pitch.',
     'Uniquement avec prospects qui avaient montré un intérêt initial (pas un non net).', 1);
end if; end$$;

-- ============================================================================
-- 10. CLOSING
-- ============================================================================
do $$ begin if (select count(*) from public.prospection_closing where market_code='en') = 0 then
  insert into public.prospection_closing (market_code, kind, title, body, body_fr, position) values
    ('en','signal','She asks precise questions about price, start date, timeline','She''s mentally projecting into the purchase.', E'Questions précises = projection mentale.', 1),
    ('en','signal','She speaks in future tense','"When I''m a client...", "if I start in September..." — mental projection.', E'Parle au futur = elle se projette.', 2),
    ('en','signal','She mentions other people','"This could also help my sister" — validating so much she imagines referring.', E'Mentionne d''autres personnes = validation forte.', 3),
    ('en','signal','She agrees with your diagnosis','"That''s exactly my problem" — maximum alignment.', E'D''accord avec ton diagnostic = alignement max.', 4),
    ('en','signal','She asks you to repeat / clarify','Sign she wants to be sure before committing.', E'Demande de répéter = elle veut être sûre.', 5),
    ('en','propose','Proposing the purchase',
     E'OK [name], we''ve covered everything. From what I see, you''re aligned on [the need] and you see how this can help.\n\nWant to start this week? I''ll send the recap in writing, walk you through ordering your kit / program, and we''ll set a check-in 10 days from now for the first review.',
     E'OK, on a fait le tour. On démarre cette semaine ? Récap écrit + commande + check à J+10.',
     1),
    ('en','hesitation','If she hesitates at closing',
     E'I sense you''re hesitating, [name]. What exactly? Price, timing, or something else?\n\nTell me what''s blocking, we''ll look together. If it''s not the right time, fine, we wait until it is.',
     E'Tu hésites — sur quoi ? Prix, timing, autre ? Si pas le bon moment, on attend.',
     1),
    ('en','final_no','Accepting a final no',
     E'I get it [name], thanks for telling me clearly. If anything changes one day, reach out without hesitation.\n\nAll the best with your projects 🙏',
     E'Merci de me le dire clairement. Si ça change un jour, reviens. Belle continuation.',
     1);
end if; end$$;

-- ============================================================================
-- 11. SPECIAL CASES
-- ============================================================================
do $$ begin if (select count(*) from public.prospection_special_cases where market_code='en') = 0 then
  insert into public.prospection_special_cases (market_code, kind, title, body, body_fr, position) values
    ('en','reactivation_3_6m','Reactivate an old prospect (3-6 months later)',
     E'Hey [name], it''s been a while!\n\nFound your profile and wondered where you are on [their goal from X months ago]. No pitch, just curious.',
     E'Ça fait un moment ! Je tombe sur ton profil, où t''en es de [objectif] ? Pas de pitch.',
     1),
    ('en','ghost_after_exchange','If they ghost you after several exchanges',
     E'[name], didn''t want to push but I''d like to understand where you''re at.\n\nIf it''s a no, it''s a no, and that''s OK. Just tell me simply, it saves me wondering, and you won''t hear from me again.',
     E'Si c''est non c''est non, dis-le simplement, plus de relance.',
     1),
    ('en','referral_request','Referral request (after results)',
     E'Hey [name], hope you''re seeing results on [their goal]. Wanted to ask you something.\n\nIf you know 1 or 2 people around you struggling with the same thing you used to — would you be OK introducing me? No pressure, only if it feels natural.',
     E'Si tu connais 1-2 personnes qui galèrent comme toi à l''époque, OK pour me les présenter ? Pas de pression.',
     1);
end if; end$$;

-- ============================================================================
-- 12. STORYTELLING
-- ============================================================================
do $$ begin if (select count(*) from public.prospection_storytelling where market_code='en') = 0 then
  insert into public.prospection_storytelling (market_code, profile_slug, kind, title, body, position) values
    ('en', null, 'structure_step', 'The starting point',
     'Where I was — concrete problem, pain. Be precise: "exhausted all the time", "+25 lbs since pregnancy", not "things were rough".', 1),
    ('en', null, 'structure_step', 'The trigger',
     'What made me move — specific event, ideally with date. "In January 2023, a friend told me about..."', 2),
    ('en', null, 'structure_step', 'The change',
     'What happened — quantified transformation if possible. "In 6 months, -25 lbs" is more credible than "I changed".', 3),
    ('en', null, 'structure_step', 'The why now',
     'Why I''m sharing this today. The sentence that turns a story into a mission.', 4),
    ('en','weight-women','example', 'Example — Weight loss',
     E'For 5 years I was exhausted all the time. Three kids, a demanding job, and 25 lbs extra since my last pregnancy. I''d tried every diet, never worked past 3 months.\n\nIn January 2023, a friend told me about a different approach. Not a diet — a re-education in eating, with support and products that helped me stick with it.\n\nIn 6 months, I lost the 25 lbs, but more than that I got my energy back. And I didn''t gain it back.\n\nToday I share this because I know what it''s like to search everywhere without finding. I''d rather give the keys to those still struggling.', 1),
    ('en','business','example', 'Example — Business',
     E'I was a [profession] for [X years]. Decent salary but zero freedom. Hadn''t seen my kids grow up in 3 years.\n\nIn [month year], I crossed paths with someone who told me about this activity. I took it for a bogus MLM at first, said no.\n\nSix months later, looking at my calendar on a Sunday night, I realized I was the one missing out. I called the person back.\n\nToday, [X months later], I have [concrete result]. And more than that, I run my own time.', 1),
    ('en', null, 'rule', 'Stay honest',
     'If your story is shorter or less glamorous, tell it as-is. Authenticity beats perfection.', 1),
    ('en', null, 'rule', 'No outrageous numbers',
     E'"I made $10K in my first month" = nobody believes you.', 2),
    ('en', null, 'rule', 'Give precise dates',
     E'"In March 2023" is a thousand times more credible than "some time ago".', 3),
    ('en', null, 'rule', 'Own the struggles',
     E'"At first I struggled, wanted to quit after 3 months" reassures your listener.', 4);
end if; end$$;

-- ============================================================================
-- 13. ROUTINES
-- ============================================================================
do $$ begin if (select count(*) from public.prospection_routines where market_code='en') = 0 then
  insert into public.prospection_routines (market_code, kind, title, detail, duration_minutes, position) values
    ('en','routine_30m','Scan profiles',
     'Scan 30-40 profiles, select 15-20 qualified (see green/red flags §2).', 10, 1),
    ('en','routine_30m','Send M1s',
     'Send 15-20 personalized M1s. Max 1 minute per message — if you can''t find a detail to mention, skip.', 15, 2),
    ('en','routine_30m','Reply to conversations',
     'Handle ongoing conversations (M2, M3, call bookings). Priority to hot leads.', 5, 3),
    ('en','routine_1h','M1 prospecting',
     '25-30 personalized messages. Wider targets, more template variations.', 15, 1),
    ('en','routine_1h','Active conversations',
     'Deep work on M2-M3 + call bookings. This is where you build pipeline.', 30, 2),
    ('en','routine_1h','Follow-up & content',
     'Existing client follow-ups, Insta post of the day, D+2/D+5 post-Zoom check-ins.', 15, 3),
    ('en','pre_send_checklist','I''ve personalized [detail from their profile] with something precise (not generic).', null, null, 1),
    ('en','pre_send_checklist','My message doesn''t pitch anything (no product, no Zoom in M1).', null, null, 2),
    ('en','pre_send_checklist','My message ends with an open qualifying question.', null, null, 3),
    ('en','pre_send_checklist','No more than 3 emojis.', null, null, 4),
    ('en','pre_send_checklist','No link in M1 (spam filter).', null, null, 5),
    ('en','pre_send_checklist','The tone is grounded, not rushed.', null, null, 6),
    ('en','pre_send_checklist','If they say no, I have a clean closing message ready.', null, null, 7);
end if; end$$;

commit;
