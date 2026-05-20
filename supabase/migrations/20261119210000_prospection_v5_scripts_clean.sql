-- =============================================================================
-- Chantier #3 V5 — Seed scripts CLEAN (2026-05-20)
--
-- Remplace TOUS les scripts existants par le seed définitif Thomas
-- (« 3 corrections cœur » : zéro pitch en M1, zéro "sans pression",
-- zéro demande de Zoom en M1, finir sur question ouverte qualifiante).
--
-- Audit avait montré 67 scripts défectueux (pitch en M1, formules MLM)
-- + bug du guard count()=0 qui skippait 10 scripts FR sur la précédente
-- migration. Reset complet ici.
--
-- Spec finale :
--   - 6 marchés × 4 profils × 5 plateformes M1 = 120
--   - + business × linkedin × 6 marchés = 6
--   - = 126 scripts position=1 (kind=first_contact)
--   - + relances J+3 (position=2, kind=j3_followup) :
--     · weight-women + weight-men = relance "poids" identique
--     · sport, business = relances dédiées
--     · stockée avec platform='insta' (utilisable Insta/FB/WhatsApp)
--     · 4 profils × 6 marchés = 24 scripts position=2
--   - = TOTAL 150 scripts.
--
-- Telegram exclu volontairement. LinkedIn uniquement sur business.
-- ES + PT marqués needs_native_review (à valider par natif avant prod).
-- =============================================================================

begin;

-- ─── 1. Schema : colonne needs_native_review + extension contrainte CHECK ──
alter table public.prospection_scripts
  add column if not exists needs_native_review boolean not null default false;

comment on column public.prospection_scripts.needs_native_review is
  'Chantier #3 V5 — true si le script doit être relu par un natif avant exposition prod. ES + PT ont besoin de validation par natif (registre mexicain / 100 % brésilien).';

-- ─── 2. Wipe existant + contrainte unique (market × profile × platform × position) ─
delete from public.prospection_scripts;

alter table public.prospection_scripts
  drop constraint if exists prospection_scripts_unique_combo;
alter table public.prospection_scripts
  add constraint prospection_scripts_unique_combo
  unique (market_code, profile_slug, platform, position);

-- ─── 3. Helpers : function de upsert plus lisible ─────────────────────────
-- (utilisée pour les INSERT ON CONFLICT DO UPDATE)
-- Pour rester idempotent et permettre re-run sans erreur.

-- ============================================================================
-- INSERTS M1 (position=1, kind=first_contact)
-- ============================================================================

-- ─── 🇫🇷 FRANCE ───────────────────────────────────────────────────────────
insert into public.prospection_scripts
  (market_code, profile_slug, platform, position, kind, label, language_label, body, body_fr, tip, needs_native_review) values

-- FR weight-women
('fr','weight-women','insta',1,'first_contact','Instagram DM · Premier contact','🇫🇷 Français',
 E'Salut [prénom] 👋 Je suis tombée sur ton profil et [détail vu sur son profil] m''a parlé. On a des points communs côté healthy. Tu es plutôt sur un objectif perte de poids, énergie au quotidien, ou les deux en ce moment ?',
 null,
 E'Personnalise [détail vu sur son profil]. Pas de lien dans le 1er message (filtre spam).', false),

('fr','weight-women','fb',1,'first_contact','Facebook Messenger · Premier contact','🇫🇷 Français',
 E'Bonjour [prénom], j''ai vu ton message dans le groupe [nom groupe], ça m''a parlé — je suis passée par là aussi. Tu en es où dans ta démarche en ce moment ?',
 null,
 E'FB Messenger = ton plus posé que Instagram. Groupes wellness = mine d''or.', false),

('fr','weight-women','whatsapp',1,'first_contact','WhatsApp · Contact direct','🇫🇷 Français',
 E'Coucou [prénom] 😊 C''est [ton prénom], on s''est croisées via [contexte]. Tu m''avais parlé de ton envie de te sentir mieux — tu en es où là-dessus aujourd''hui ?',
 null,
 E'WhatsApp = pour ceux qui t''ont déjà donné leur numéro. Plus chaud, plus direct.', false),

('fr','weight-women','sms',1,'first_contact','SMS · Court & posé','🇫🇷 Français',
 E'Salut [prénom], c''est [ton prénom]. Je passe par SMS pour ne pas te perdre dans les DM. On avait échangé sur [contexte] — tu en es où sur ton objectif forme en ce moment ?',
 null,
 E'SMS FR : court, sans emoji, ton posé. Effet "vraie personne" pas marketing.', false),

('fr','weight-women','tiktok',1,'first_contact','TikTok · DM post-vidéo','🇫🇷 Français',
 E'Salut [prénom] ! Ta vidéo sur [détail] m''a parlé. Tu es dans une démarche de remise en forme en ce moment, ou c''est plus pour le fun ?',
 null,
 E'TikTok = ton léger, référence directe à la vidéo vue.', false),

-- FR weight-men
('fr','weight-men','insta',1,'first_contact','Instagram DM · Premier contact','🇫🇷 Français',
 E'Salut [prénom], j''ai vu ton post sur [détail vu sur son profil]. Curieux de savoir — tu es plutôt sur un objectif perte de gras, prise de masse propre, ou retrouver de l''énergie au quotidien ?',
 null,
 E'Vocabulaire perf/énergie/récup. ZÉRO "bien-être" ou "douceur" → ça les éjecte direct.', false),

('fr','weight-men','fb',1,'first_contact','Facebook Messenger · Premier contact','🇫🇷 Français',
 E'Bonjour [prénom], vu ton post dans [nom du groupe] sur [détail]. Tu cherches un truc précis en ce moment, ou tu testes des trucs au feeling ?',
 null,
 E'FB Messenger = ton plus posé qu''Insta. Groupes "remise en forme homme" = mine d''or.', false),

('fr','weight-men','whatsapp',1,'first_contact','WhatsApp · Contact direct','🇫🇷 Français',
 E'Salut [prénom], c''est [ton prénom], on s''est croisés via [contexte]. Tu m''avais parlé de [détail — perte de poids / énergie / sport]. Tu en es où ?',
 null,
 E'WhatsApp = lead chaud déjà rencontré. Direct mais pas agressif.', false),

('fr','weight-men','sms',1,'first_contact','SMS · Court & posé','🇫🇷 Français',
 E'Salut [prénom], c''est [ton prénom]. On avait parlé de [contexte]. Tu en es où sur ton objectif forme en ce moment ?',
 null,
 E'SMS = court, sans emoji, ton viril posé. Effet "vraie personne".', false),

('fr','weight-men','tiktok',1,'first_contact','TikTok · DM post-vidéo','🇫🇷 Français',
 E'Salut [prénom], ta vidéo sur [détail] est carrée. T''es sur quel objectif en ce moment — perte de gras, prise de masse propre, ou retrouver de l''énergie ?',
 null,
 E'TikTok homme = punchy + question concrète. Vocabulaire perf.', false),

-- FR sport
('fr','sport','insta',1,'first_contact','Instagram DM · Premier contact','🇫🇷 Français',
 E'Salut [prénom] 💪 Ton post sur [détail spécifique] a attiré mon œil, surtout [point précis]. Tu gères comment ton alim autour de tes sorties en ce moment ?',
 null,
 E'Pour les sportifs, parler PERF avant tout. Pas de poids/régime.', false),

('fr','sport','fb',1,'first_contact','Facebook Messenger · Premier contact','🇫🇷 Français',
 E'Bonjour [prénom], vu ton partage dans [nom du groupe] sur [détail]. Tu prépares un truc en particulier en ce moment — course, défi, ou plutôt du fond ?',
 null,
 E'FB sport = groupes course/triathlon/running. Ton entre passionnés.', false),

('fr','sport','whatsapp',1,'first_contact','WhatsApp · Contact direct','🇫🇷 Français',
 E'Salut [prénom], c''est [ton prénom], on s''était croisés via [contexte]. Tu m''avais parlé de [détail — objectif / course]. Tu en es où ?',
 null,
 E'WhatsApp FR sport : préciser le contexte de connexion avant tout.', false),

('fr','sport','sms',1,'first_contact','SMS · Court & posé','🇫🇷 Français',
 E'Salut [prénom], c''est [ton prénom]. On avait parlé de ton objectif sportif. Tu es toujours dessus en ce moment ?',
 null,
 E'SMS sport = court, factuel, entre gens qui se respectent.', false),

('fr','sport','tiktok',1,'first_contact','TikTok · DM post-vidéo','🇫🇷 Français',
 E'Salut [prénom], vu ta vidéo sur [détail], beau boulot. Tu as une stratégie nutrition autour de tes séances, ou tu y vas au feeling ?',
 null,
 E'TikTok sport = reconnaissance technique + question feeling/structure.', false),

-- FR business
('fr','business','insta',1,'first_contact','Instagram DM · Premier contact','🇫🇷 Français',
 E'Salut [prénom], ton [détail] a attiré mon œil, surtout [point précis]. Tu fais ça depuis combien de temps ? Je suis toujours curieux du parcours des gens qui construisent leur propre truc.',
 null,
 E'Business = JAMAIS pitcher en M1. Curiosité sincère sur le parcours.', false),

('fr','business','fb',1,'first_contact','Facebook Messenger · Premier contact','🇫🇷 Français',
 E'Bonjour [prénom], vu ton post dans [nom du groupe] sur [détail], ça m''a parlé — je suis dans une démarche similaire. Tu travailles sur quoi en ce moment ?',
 null,
 E'FB business = groupes entrepreneurs/repreneurs. Terrain commun d''abord.', false),

('fr','business','whatsapp',1,'first_contact','WhatsApp · Contact direct','🇫🇷 Français',
 E'Salut [prénom], c''est [ton prénom], on s''était croisés via [contexte]. Pour être franc, je te recontacte parce que je construis quelque chose en ce moment et ton profil m''a fait penser à toi. Tu es ouvert à découvrir de nouveaux projets, ou tu es 100% focus sur ton activité actuelle ?',
 null,
 E'WhatsApp business : transparence (pas de pitch caché), filtre par une vraie question.', false),

('fr','business','sms',1,'first_contact','SMS · Court & posé','🇫🇷 Français',
 E'Salut [prénom], c''est [ton prénom]. Je te contacte pour une raison précise — ton profil m''a fait penser à un projet sur lequel je bosse. C''est un sujet qui pourrait t''intéresser, ou pas du tout ?',
 null,
 E'SMS business = direct, donne tout de suite la porte de sortie.', false),

('fr','business','tiktok',1,'first_contact','TikTok · DM post-vidéo','🇫🇷 Français',
 E'Salut [prénom], vu ta vidéo sur [détail], ça m''a parlé. Tu travailles sur quoi en ce moment à côté de ça ?',
 null,
 E'TikTok business = curiosité, surtout pas de pitch projet.', false),

('fr','business','linkedin',1,'first_contact','LinkedIn · Premier contact','🇫🇷 Français',
 E'Bonjour [prénom], votre parcours dans [leur secteur] a retenu mon attention, en particulier [point précis]. J''échange en ce moment avec des profils qui construisent quelque chose par eux-mêmes. Qu''est-ce qui vous occupe le plus professionnellement en ce moment ?',
 null,
 E'LinkedIn = ton corporate, vouvoiement, structure claire. PAS de pitch ni de Zoom en 1er message.', false);

-- ─── 🇬🇧 INTERNATIONAL (English) ──────────────────────────────────────────
insert into public.prospection_scripts
  (market_code, profile_slug, platform, position, kind, label, language_label, body, body_fr, tip, needs_native_review) values

-- EN weight-women
('en','weight-women','insta',1,'first_contact','Instagram DM · First contact','🇬🇧 English',
 E'Hey [name] 👋 Came across your profile and [detail] really stood out. Right now are you more focused on losing weight, getting your energy back, or both?',
 E'Salut [name] 👋 Je suis tombée sur ton profil et [detail] ressort vraiment. Là tu es plutôt perte de poids, retrouver l''énergie, ou les deux ?',
 E'EN works for US, UK, intl Insta profiles. Keep it casual.', false),

('en','weight-women','fb',1,'first_contact','Facebook Messenger · First contact','🇬🇧 English',
 E'Hi [name], saw your post in [group name] about [detail] — it really resonated, I''ve been through that too. Where are you at with it right now?',
 E'Salut [name], vu ton post dans [groupe] sur [detail] — ça m''a parlé, je suis passée par là. Tu en es où ?',
 E'FB Messenger plus posé qu''Insta. Wellness groups = goldmine.', false),

('en','weight-women','whatsapp',1,'first_contact','WhatsApp · Direct contact','🇬🇧 English',
 E'Hi [name] 😊 It''s [your name], we connected through [context]. You''d mentioned wanting to feel better — how''s that going for you now?',
 E'Salut [name] 😊 C''est [your name], on s''était connectées via [contexte]. Tu m''avais parlé de te sentir mieux — ça avance ?',
 E'EN WhatsApp = leads tièdes via reco ou contact donné.', false),

('en','weight-women','sms',1,'first_contact','SMS · Short & grounded','🇬🇧 English',
 E'Hi [name], it''s [your name]. Texting so we don''t lose each other in the DMs. We''d talked about [context] — where are you at with your fitness goal right now?',
 E'Salut [name], c''est [your name]. Je texte pour ne pas se perdre dans les DM. On avait parlé de [contexte] — tu en es où sur ton objectif forme ?',
 E'SMS EN : court, sans emoji, ton posé. Effet "vraie personne".', false),

('en','weight-women','tiktok',1,'first_contact','TikTok · Post-video DM','🇬🇧 English',
 E'Hi [name]! Your video on [detail] really spoke to me. Are you on a fitness journey right now, or more just for fun?',
 E'Salut [name] ! Ta vidéo sur [detail] m''a parlé. Tu es dans une démarche fitness, ou plus pour le fun ?',
 E'TikTok = ton léger.', false),

-- EN weight-men
('en','weight-men','insta',1,'first_contact','Instagram DM · First contact','🇬🇧 English',
 E'Hey [name], saw your post on [detail]. Quick question — are you more into fat loss, clean muscle gain, or just getting your daily energy back?',
 E'Salut [name], vu ton post sur [detail]. Petite question — tu es plutôt fat loss, prise de muscle propre, ou retrouver ton énergie ?',
 E'Vocabulaire perf/énergie/récup. Évite "wellness" et "feel good" qui éjectent les mecs.', false),

('en','weight-men','fb',1,'first_contact','Facebook Messenger · First contact','🇬🇧 English',
 E'Hi [name], saw your post in [group name] about [detail]. Are you working toward something specific right now, or just experimenting?',
 E'Salut [name], vu ton post dans [groupe] sur [detail]. Tu vises un objectif précis, ou tu expérimentes ?',
 E'FB Messenger = ton plus posé. Groupes "men''s fitness" mine d''or.', false),

('en','weight-men','whatsapp',1,'first_contact','WhatsApp · Direct contact','🇬🇧 English',
 E'Hi [name], it''s [your name], we met through [context]. You''d mentioned [detail]. Where are you at with it now?',
 E'Salut [name], c''est [your name], on s''est rencontrés via [contexte]. Tu m''avais parlé de [detail]. Tu en es où ?',
 E'WhatsApp = lead chaud déjà rencontré. Direct mais pas agressif.', false),

('en','weight-men','sms',1,'first_contact','SMS · Short & grounded','🇬🇧 English',
 E'Hi [name], it''s [your name]. We''d talked about [context]. Where are you at with your fitness goal now?',
 E'Salut [name], c''est [your name]. On avait parlé de [contexte]. Tu en es où ?',
 E'SMS = court, sans emoji, ton viril posé.', false),

('en','weight-men','tiktok',1,'first_contact','TikTok · Post-video DM','🇬🇧 English',
 E'Hi [name], saw your video on [detail], solid work. What''s the goal right now — fat loss, energy, something else?',
 E'Salut [name], vu ta vidéo sur [detail], du bon boulot. L''objectif c''est quoi — fat loss, énergie, autre ?',
 E'TikTok homme = punchy + question concrète.', false),

-- EN sport
('en','sport','insta',1,'first_contact','Instagram DM · First contact','🇬🇧 English',
 E'Hey [name] 💪 Your post on [detail] caught my eye, especially [point précis]. How do you manage your nutrition around your training right now?',
 E'Salut [name] 💪 Ton post sur [detail] a attiré mon œil, surtout [point précis]. Tu gères comment ta nutrition autour de l''entraînement ?',
 E'Talk performance, never weight loss.', false),

('en','sport','fb',1,'first_contact','Facebook Messenger · First contact','🇬🇧 English',
 E'Hi [name], saw your post in [group name] about [detail]. Are you prepping for something specific — a race, a goal, or general fitness?',
 E'Salut [name], vu ton post dans [groupe] sur [detail]. Tu prépares un truc précis — course, objectif, forme générale ?',
 E'FB sport = groupes running/triathlon.', false),

('en','sport','whatsapp',1,'first_contact','WhatsApp · Direct contact','🇬🇧 English',
 E'Hi [name], it''s [your name], we met through [context]. You''d mentioned [detail]. Where are you at now?',
 E'Salut [name], c''est [your name], on s''est rencontrés via [contexte]. Tu m''avais parlé de [detail]. Tu en es où ?',
 E'WhatsApp EN sport : context first.', false),

('en','sport','sms',1,'first_contact','SMS · Short & grounded','🇬🇧 English',
 E'Hi [name], it''s [your name]. We''d talked about your sport goal. Still on it right now?',
 E'Salut [name], c''est [your name]. On avait parlé de ton objectif sportif. Toujours dessus ?',
 E'SMS court, factuel.', false),

('en','sport','tiktok',1,'first_contact','TikTok · Post-video DM','🇬🇧 English',
 E'Hi [name], saw your video on [detail], impressive. Do you have a nutrition strategy around your training, or do you just go by feel?',
 E'Salut [name], vu ta vidéo sur [detail], impressionnant. Tu as une stratégie nutrition, ou tu y vas au feeling ?',
 E'TikTok sport = reconnaissance technique.', false),

-- EN business
('en','business','insta',1,'first_contact','Instagram DM · First contact','🇬🇧 English',
 E'Hey [name], your [detail] caught my eye, especially [point précis]. How long have you been doing this? I''m always curious about the path of people building something of their own.',
 E'Salut [name], ton [detail] a attiré mon œil, surtout [point précis]. Tu fais ça depuis combien de temps ? Le parcours des gens qui construisent leur propre truc m''intéresse toujours.',
 E'Business = jamais de pitch en M1. Curiosité sincère.', false),

('en','business','fb',1,'first_contact','Facebook Messenger · First contact','🇬🇧 English',
 E'Hi [name], saw your post in [group name] about [detail] — really related, I''m on a similar path. What are you working on right now?',
 E'Salut [name], vu ton post dans [groupe] sur [detail] — je me suis reconnu, voie similaire. Tu bosses sur quoi ?',
 E'FB business = terrain commun.', false),

('en','business','whatsapp',1,'first_contact','WhatsApp · Direct contact','🇬🇧 English',
 E'Hi [name], it''s [your name], we connected through [context]. I''ll be upfront — I''m building something right now and your profile made me think of you. Are you open to exploring new projects, or fully focused on your current thing?',
 E'Salut [name], c''est [your name], on s''était connectés via [contexte]. Je serai franc — je construis quelque chose et ton profil m''a fait penser à toi. Tu es ouvert à de nouveaux projets, ou 100% focus sur ton activité ?',
 E'WhatsApp business : transparence + filtre.', false),

('en','business','sms',1,'first_contact','SMS · Short & grounded','🇬🇧 English',
 E'Hi [name], it''s [your name]. Reaching out for a specific reason — your profile reminded me of a project I''m working on. Could be of interest, or not your thing at all?',
 E'Salut [name], c''est [your name]. Je te contacte pour une raison précise — ton profil m''a rappelé un projet sur lequel je bosse. Ça pourrait t''intéresser, ou pas du tout ton truc ?',
 E'SMS business = direct, porte de sortie.', false),

('en','business','tiktok',1,'first_contact','TikTok · Post-video DM','🇬🇧 English',
 E'Hi [name], really liked your video on [detail]. Alongside that, what are you working on these days?',
 E'Salut [name], ta vidéo sur [detail] m''a plu. À côté de ça, tu bosses sur quoi ?',
 E'TikTok business = curiosité.', false),

('en','business','linkedin',1,'first_contact','LinkedIn · First contact','🇬🇧 English',
 E'Hi [name], your background in [their field] caught my eye, especially [point précis]. I enjoy connecting with people building something of their own. What are you most focused on professionally these days?',
 E'Bonjour [name], votre parcours dans [secteur] a retenu mon attention, surtout [point précis]. J''aime échanger avec des gens qui construisent par eux-mêmes. Sur quoi vous concentrez-vous professionnellement ?',
 E'LinkedIn EN = ton corporate. Structure courte. PAS de Zoom en M1.', false);

-- ─── 🇲🇽 LATAM + ESPAGNE (Español, needs_native_review=true) ──────────────
insert into public.prospection_scripts
  (market_code, profile_slug, platform, position, kind, label, language_label, body, body_fr, tip, needs_native_review) values

-- ES weight-women
('es','weight-women','insta',1,'first_contact','Instagram DM · Primer contacto','🇲🇽 Español',
 E'¡Hola [nombre]! 👋 Vi tu perfil y [detalle] me encantó. Ahora mismo, ¿estás más enfocada en bajar de peso, recuperar energía, o las dos cosas?',
 E'Salut [nombre] 👋 J''ai vu ton profil et [détail] m''a plu. Là tu es plutôt perte de poids, énergie, ou les deux ?',
 E'Mexique, Colombie, Argentine, Espagne. Style proche du français.', true),

('es','weight-women','fb',1,'first_contact','Facebook Messenger · Primer contacto','🇲🇽 Español',
 E'Hola [nombre], vi tu publicación en [nombre grupo] sobre [detalle], me llegó — yo también pasé por ahí. ¿Cómo vas con eso ahora?',
 E'Salut [nombre], vu ton post dans [groupe] sur [détail], ça m''a touchée — je suis passée par là. Tu en es où ?',
 E'FB Messenger LatAm más posado. Grupos "bajar de peso" mina de oro.', true),

('es','weight-women','whatsapp',1,'first_contact','WhatsApp · Contacto directo','🇲🇽 Español',
 E'¡Hola [nombre]! 😊 Soy [tu nombre], nos conocimos por [contexto]. Me habías comentado que querías sentirte mejor — ¿cómo vas con eso ahora?',
 E'Salut [nombre] 😊 C''est [tu nombre], on s''était connectées via [contexte]. Tu m''avais dit vouloir te sentir mieux — ça avance ?',
 E'WhatsApp ULTRA dominant en LatAm. Privilégie ce canal.', true),

('es','weight-women','sms',1,'first_contact','SMS · Corto y posado','🇲🇽 Español',
 E'Hola [nombre], soy [tu nombre]. Te escribo por SMS para no perdernos en los DM. Habíamos hablado de [contexto] — ¿cómo vas con tu meta de forma ahora?',
 E'Salut [nombre], c''est [tu nombre]. J''écris par SMS pour ne pas se perdre dans les DM. On avait parlé de [contexte] — tu en es où ?',
 E'SMS LatAm court.', true),

('es','weight-women','tiktok',1,'first_contact','TikTok · DM post-video','🇲🇽 Español',
 E'¡Hola [nombre]! Tu video sobre [detalle] me encantó. ¿Estás en un proceso de ponerte en forma ahora, o más por diversión?',
 E'Salut [nombre] ! Ta vidéo sur [détail] m''a plu. Tu es dans une démarche de remise en forme, ou plus pour le fun ?',
 E'TikTok = ton léger.', true),

-- ES weight-men
('es','weight-men','insta',1,'first_contact','Instagram DM · Primer contacto','🇲🇽 Español',
 E'Hola [nombre], vi tu post sobre [detalle]. Una pregunta rápida — ¿estás más en perder grasa, ganar músculo limpio, o recuperar tu energía del día a día?',
 E'Salut [nombre], vu ton post sur [détail]. Petite question — tu es plutôt perte de gras, muscle propre, ou retrouver ton énergie ?',
 E'ES Mexique/LatAm. Ton naturel. Evita "bienestar" con hombres.', true),

('es','weight-men','fb',1,'first_contact','Facebook Messenger · Primer contacto','🇲🇽 Español',
 E'Hola [nombre], vi tu publicación en [nombre grupo] sobre [detalle]. ¿Estás trabajando hacia algo específico ahora, o experimentando?',
 E'Salut [nombre], vu ton post dans [groupe] sur [détail]. Tu vises un objectif précis, ou tu expérimentes ?',
 E'FB Messenger LatAm. Grupos "ponerse en forma" mina de oro.', true),

('es','weight-men','whatsapp',1,'first_contact','WhatsApp · Contacto directo','🇲🇽 Español',
 E'Hola [nombre], soy [tu nombre], nos conocimos por [contexto]. Me habías comentado sobre [detalle]. ¿Cómo vas con eso ahora?',
 E'Salut [nombre], c''est [tu nombre], on s''est connus via [contexte]. Tu m''avais parlé de [détail]. Tu en es où ?',
 E'WhatsApp dominante LatAm. Tono directo, sin emojis exagerados.', true),

('es','weight-men','sms',1,'first_contact','SMS · Corto y posado','🇲🇽 Español',
 E'Hola [nombre], soy [tu nombre]. Habíamos hablado de [contexto]. ¿Cómo vas con tu meta de forma ahora?',
 E'Salut [nombre], c''est [tu nombre]. On avait parlé de [contexte]. Tu en es où ?',
 E'SMS LatAm.', true),

('es','weight-men','tiktok',1,'first_contact','TikTok · DM post-video','🇲🇽 Español',
 E'Hola [nombre], vi tu video sobre [detalle], buen trabajo. ¿Cuál es la meta ahora — perder grasa, energía, otra cosa?',
 E'Salut [nombre], vu ta vidéo sur [détail], beau boulot. L''objectif c''est quoi — perte de gras, énergie, autre ?',
 E'TikTok homme = punchy.', true),

-- ES sport
('es','sport','insta',1,'first_contact','Instagram DM · Primer contacto','🇲🇽 Español',
 E'¡Hola [nombre]! 💪 Tu publicación sobre [detalle] me llamó la atención, sobre todo [point précis]. ¿Cómo manejas tu nutrición alrededor de tus entrenamientos ahora?',
 E'Salut [nombre] 💪 Ton post sur [détail] a attiré mon œil, surtout [point précis]. Tu gères comment ta nutrition autour de l''entraînement ?',
 E'LatAm sportifs = WhatsApp et Insta. Ton chaleureux. Hablar de performance.', true),

('es','sport','fb',1,'first_contact','Facebook Messenger · Primer contacto','🇲🇽 Español',
 E'Hola [nombre], vi tu publicación en [nombre grupo] sobre [detalle]. ¿Te estás preparando para algo específico — una carrera, una meta, o condición general?',
 E'Salut [nombre], vu ton post dans [groupe] sur [détail]. Tu prépares un truc précis — course, objectif, forme générale ?',
 E'FB ES sport : ton chaleureux, plus posé qu''Insta.', true),

('es','sport','whatsapp',1,'first_contact','WhatsApp · Contacto directo','🇲🇽 Español',
 E'Hola [nombre], soy [tu nombre], nos conocimos por [contexto]. Me habías comentado sobre [detalle]. ¿Cómo vas ahora?',
 E'Salut [nombre], c''est [tu nombre], on s''est connus via [contexte]. Tu m''avais parlé de [détail]. Tu en es où ?',
 E'WhatsApp ES sport : referenciar contexto común antes de proponer.', true),

('es','sport','sms',1,'first_contact','SMS · Corto y posado','🇲🇽 Español',
 E'Hola [nombre], soy [tu nombre]. Habíamos hablado de tu meta deportiva. ¿Sigues con eso ahora?',
 E'Salut [nombre], c''est [tu nombre]. On avait parlé de ton objectif sportif. Toujours dessus ?',
 E'SMS court.', true),

('es','sport','tiktok',1,'first_contact','TikTok · DM post-video','🇲🇽 Español',
 E'Hola [nombre], vi tu video sobre [detalle], impresionante. ¿Tienes una estrategia de nutrición alrededor del entrenamiento, o vas por instinto?',
 E'Salut [nombre], vu ta vidéo sur [détail], impressionnant. Tu as une stratégie nutrition, ou tu y vas à l''instinct ?',
 E'TikTok sport = reconnaissance technique.', true),

-- ES business
('es','business','insta',1,'first_contact','Instagram DM · Primer contacto','🇲🇽 Español',
 E'Hola [nombre], tu [detalle] me llamó la atención, sobre todo [point précis]. ¿Cuánto tiempo llevas en esto? Siempre me interesa el camino de quienes construyen algo propio.',
 E'Salut [nombre], ton [détail] a attiré mon œil, surtout [point précis]. Tu fais ça depuis combien de temps ? Le parcours des gens qui construisent leur propre truc m''intéresse toujours.',
 E'Business = jamais de pitch en M1. Curiosidad sincera.', true),

('es','business','fb',1,'first_contact','Facebook Messenger · Primer contacto','🇲🇽 Español',
 E'Hola [nombre], vi tu publicación en [nombre grupo] sobre [detalle], me identifiqué — voy por un camino similar. ¿En qué estás trabajando ahora?',
 E'Salut [nombre], vu ton post dans [groupe] sur [détail], je me suis reconnu — voie similaire. Tu bosses sur quoi ?',
 E'FB business = terrain commun.', true),

('es','business','whatsapp',1,'first_contact','WhatsApp · Contacto directo','🇲🇽 Español',
 E'Hola [nombre], soy [tu nombre], nos conectamos por [contexto]. Seré directo — estoy construyendo algo ahora y tu perfil me hizo pensar en ti. ¿Estás abierto a explorar nuevos proyectos, o totalmente enfocado en lo tuyo?',
 E'Salut [nombre], c''est [tu nombre], on s''était connectés via [contexte]. Je serai direct — je construis quelque chose et ton profil m''a fait penser à toi. Ouvert à de nouveaux projets, ou 100% focus sur ton activité ?',
 E'WhatsApp business : transparencia + filtro por pregunta.', true),

('es','business','sms',1,'first_contact','SMS · Corto y posado','🇲🇽 Español',
 E'Hola [nombre], soy [tu nombre]. Te escribo por una razón específica — tu perfil me recordó un proyecto en el que trabajo. ¿Podría interesarte, o no es lo tuyo?',
 E'Salut [nombre], c''est [tu nombre]. J''écris pour une raison précise — ton profil m''a rappelé un projet sur lequel je bosse. Ça pourrait t''intéresser, ou pas ton truc ?',
 E'SMS business = direct.', true),

('es','business','tiktok',1,'first_contact','TikTok · DM post-video','🇲🇽 Español',
 E'Hola [nombre], me gustó mucho tu video sobre [detalle]. Además de eso, ¿en qué estás trabajando ahora?',
 E'Salut [nombre], ta vidéo sur [détail] m''a plu. À côté de ça, tu bosses sur quoi ?',
 E'TikTok business = curiosité.', true),

('es','business','linkedin',1,'first_contact','LinkedIn · Primer contacto','🇲🇽 Español',
 E'Hola [nombre], su trayectoria en [su sector] me llamó la atención, especialmente [point précis]. Disfruto conectar con personas que construyen algo propio. ¿En qué está más enfocado profesionalmente en este momento?',
 E'Bonjour [nombre], votre parcours dans [secteur] a retenu mon attention, surtout [point précis]. J''aime échanger avec des gens qui construisent par eux-mêmes. Sur quoi vous concentrez-vous professionnellement ?',
 E'LinkedIn = ton corporate, "usted".', true);

-- ─── 🇧🇷 BRÉSIL + PORTUGAL (Português, needs_native_review=true) ──────────
insert into public.prospection_scripts
  (market_code, profile_slug, platform, position, kind, label, language_label, body, body_fr, tip, needs_native_review) values

-- PT weight-women
('pt','weight-women','insta',1,'first_contact','Instagram DM · Primeiro contato','🇧🇷 Português (BR)',
 E'Oi [nome]! 👋 Vi seu perfil e [detalhe] me chamou atenção. Agora você tá mais focada em emagrecer, recuperar energia, ou os dois?',
 E'Salut [nome] 👋 Vu ton profil et [détail] m''a marquée. Là tu es plutôt perte de poids, énergie, ou les deux ?',
 E'Brésil = top 5 mondial Herbalife. Ton chaleureux obligatoire.', true),

('pt','weight-women','fb',1,'first_contact','Facebook Messenger · Primeiro contato','🇧🇷 Português (BR)',
 E'Oi [nome], vi seu post no [nome grupo] sobre [detalhe], me tocou — também já passei por isso. Como você tá com isso agora?',
 E'Salut [nome], vu ton post dans [groupe] sur [détail], ça m''a touchée — je suis passée par là. Tu en es où ?',
 E'FB Messenger BR plus posé. Grupos "emagrecimento" mina de ouro.', true),

('pt','weight-women','whatsapp',1,'first_contact','WhatsApp · Contato direto','🇧🇷 Português (BR)',
 E'Oi [nome]! 😊 Sou a [seu nome], a gente se conectou pelo [contexto]. Você tinha comentado que queria se sentir melhor — como tá indo isso?',
 E'Salut [nome] 😊 C''est [seu nome], on s''était connectées via [contexte]. Tu m''avais dit vouloir te sentir mieux — ça avance ?',
 E'Brésil = WhatsApp obligatoire, langage très chaleureux et personnel.', true),

('pt','weight-women','sms',1,'first_contact','SMS · Curto e posado','🇧🇷 Português (BR)',
 E'Oi [nome], é a [seu nome]. Tô mandando SMS pra gente não se perder nas DM. A gente tinha falado sobre [contexto] — como você tá com sua meta de forma agora?',
 E'Salut [nome], c''est [seu nome]. J''écris en SMS pour ne pas se perdre dans les DM. On avait parlé de [contexte] — tu en es où ?',
 E'BR SMS court. "Bater papo" = converser casualement.', true),

('pt','weight-women','tiktok',1,'first_contact','TikTok · DM pós-vídeo','🇧🇷 Português (BR)',
 E'Oi [nome]! Seu vídeo sobre [detalhe] me chamou atenção. Você tá num processo de entrar em forma agora, ou mais por diversão?',
 E'Salut [nome] ! Ta vidéo sur [détail] m''a marquée. Tu es dans une démarche de remise en forme, ou plus pour le fun ?',
 E'TikTok = ton léger.', true),

-- PT weight-men
('pt','weight-men','insta',1,'first_contact','Instagram DM · Primeiro contato','🇧🇷 Português (BR)',
 E'Oi [nome], vi seu post sobre [detalhe]. Pergunta rápida — você tá mais em perder gordura, ganhar músculo limpo, ou recuperar sua energia do dia a dia?',
 E'Salut [nome], vu ton post sur [détail]. Petite question — tu es plutôt perte de gras, muscle propre, ou retrouver ton énergie ?',
 E'BR ton direct mais chaleureux. "Trampo" = boulot, mot oral.', true),

('pt','weight-men','fb',1,'first_contact','Facebook Messenger · Primeiro contato','🇧🇷 Português (BR)',
 E'Oi [nome], vi seu post no [nome grupo] sobre [detalhe]. Você tá trabalhando em algo específico agora, ou experimentando?',
 E'Salut [nome], vu ton post dans [groupe] sur [détail]. Tu vises un objectif précis, ou tu expérimentes ?',
 E'BR FB Messenger plus posé. Grupos "voltar à forma" mina de ouro.', true),

('pt','weight-men','whatsapp',1,'first_contact','WhatsApp · Contato direto','🇧🇷 Português (BR)',
 E'Oi [nome], sou o [seu nome], a gente se conheceu pelo [contexto]. Você tinha comentado sobre [detalhe]. Como tá indo isso agora?',
 E'Salut [nome], c''est [seu nome], on s''est connus via [contexte]. Tu m''avais parlé de [détail]. Tu en es où ?',
 E'BR WhatsApp OBLIGATOIRE après Insta. "A gente" pas "nós".', true),

('pt','weight-men','sms',1,'first_contact','SMS · Curto e posado','🇧🇷 Português (BR)',
 E'Oi [nome], é o [seu nome]. A gente tinha falado sobre [contexto]. Como você tá com sua meta de forma agora?',
 E'Salut [nome], c''est [seu nome]. On avait parlé de [contexte]. Tu en es où ?',
 E'BR SMS court. "Bater papo" = converser.', true),

('pt','weight-men','tiktok',1,'first_contact','TikTok · DM pós-vídeo','🇧🇷 Português (BR)',
 E'Oi [nome], vi seu vídeo sobre [detalhe], mandou bem. Qual a meta agora — perder gordura, energia, outra coisa?',
 E'Salut [nome], vu ta vidéo sur [détail], bien joué. L''objectif c''est quoi — perte de gras, énergie, autre ?',
 E'TikTok homme = punchy.', true),

-- PT sport
('pt','sport','insta',1,'first_contact','Instagram DM · Primeiro contato','🇧🇷 Português (BR)',
 E'Oi [nome]! 💪 Seu post sobre [detalhe] me chamou atenção, principalmente [point précis]. Como você gerencia sua nutrição em volta dos treinos agora?',
 E'Salut [nome] 💪 Ton post sur [détail] a attiré mon œil, surtout [point précis]. Tu gères comment ta nutrition autour de l''entraînement ?',
 E'Brésil sport = très visuel. Mentionner contenu spécifique.', true),

('pt','sport','fb',1,'first_contact','Facebook Messenger · Primeiro contato','🇧🇷 Português (BR)',
 E'Oi [nome], vi seu post no [nome grupo] sobre [detalhe]. Você tá se preparando pra algo específico — uma prova, uma meta, ou condição geral?',
 E'Salut [nome], vu ton post dans [groupe] sur [détail]. Tu prépares un truc précis — course, objectif, forme générale ?',
 E'FB sport BR = grupos corrida/triathlon.', true),

('pt','sport','whatsapp',1,'first_contact','WhatsApp · Contato direto','🇧🇷 Português (BR)',
 E'Oi [nome], sou o [seu nome], a gente se conheceu pelo [contexto]. Você tinha comentado sobre [detalhe]. Como tá agora?',
 E'Salut [nome], c''est [seu nome], on s''est connus via [contexte]. Tu m''avais parlé de [détail]. Tu en es où ?',
 E'WhatsApp PT sport : poser le contexte commun avant tout.', true),

('pt','sport','sms',1,'first_contact','SMS · Curto e posado','🇧🇷 Português (BR)',
 E'Oi [nome], é o [seu nome]. A gente tinha falado da sua meta esportiva. Ainda tá nela agora?',
 E'Salut [nome], c''est [seu nome]. On avait parlé de ton objectif sportif. Toujours dessus ?',
 E'BR SMS court.', true),

('pt','sport','tiktok',1,'first_contact','TikTok · DM pós-vídeo','🇧🇷 Português (BR)',
 E'Oi [nome], vi seu vídeo sobre [detalhe], impressionante. Você tem uma estratégia de nutrição em volta do treino, ou vai no feeling?',
 E'Salut [nome], vu ta vidéo sur [détail], impressionnant. Tu as une stratégie nutrition, ou tu y vas au feeling ?',
 E'TikTok sport = reconnaissance technique.', true),

-- PT business
('pt','business','insta',1,'first_contact','Instagram DM · Primeiro contato','🇧🇷 Português (BR)',
 E'Oi [nome], seu [detalhe] me chamou atenção, principalmente [point précis]. Faz quanto tempo que você tá nisso? Sempre me interessa a trajetória de quem constrói algo próprio.',
 E'Salut [nome], ton [détail] a attiré mon œil, surtout [point précis]. Tu fais ça depuis combien de temps ? Le parcours des gens qui construisent leur propre truc m''intéresse toujours.',
 E'Business = jamais de pitch en M1. "Papo" = conversa descontraída.', true),

('pt','business','fb',1,'first_contact','Facebook Messenger · Primeiro contato','🇧🇷 Português (BR)',
 E'Oi [nome], vi seu post no [nome grupo] sobre [detalhe], me identifiquei — tô num caminho parecido. No que você tá trabalhando agora?',
 E'Salut [nome], vu ton post dans [groupe] sur [détail], je me suis reconnu — voie similaire. Tu bosses sur quoi ?',
 E'FB business = terrain commun.', true),

('pt','business','whatsapp',1,'first_contact','WhatsApp · Contato direto','🇧🇷 Português (BR)',
 E'Oi [nome], sou o [seu nome], a gente se conectou pelo [contexto]. Vou ser direto — tô construindo algo agora e seu perfil me fez pensar em você. Você tá aberto a explorar novos projetos, ou totalmente focado no seu negócio atual?',
 E'Salut [nome], c''est [seu nome], on s''était connectés via [contexte]. Je serai direct — je construis quelque chose et ton profil m''a fait penser à toi. Ouvert à de nouveaux projets, ou 100% focus sur ton activité ?',
 E'Brésil ultra-personnel. Toujours "a gente". Transparence + filtre.', true),

('pt','business','sms',1,'first_contact','SMS · Curto e posado','🇧🇷 Português (BR)',
 E'Oi [nome], é o [seu nome]. Tô escrevendo por um motivo específico — seu perfil me lembrou um projeto em que tô trabalhando. Pode te interessar, ou não é a sua praia?',
 E'Salut [nome], c''est [seu nome]. J''écris pour une raison précise — ton profil m''a rappelé un projet sur lequel je bosse. Ça pourrait t''intéresser, ou pas ton truc ?',
 E'SMS business = direct. "Não é a sua praia" = pas ton truc (idiome BR).', true),

('pt','business','tiktok',1,'first_contact','TikTok · DM pós-vídeo','🇧🇷 Português (BR)',
 E'Oi [nome], curti muito seu vídeo sobre [detalhe]. Além disso, no que você tá trabalhando agora?',
 E'Salut [nome], ta vidéo sur [détail] m''a plu. À côté de ça, tu bosses sur quoi ?',
 E'TikTok business = curiosité.', true),

('pt','business','linkedin',1,'first_contact','LinkedIn · Primeiro contato','🇧🇷 Português (BR)',
 E'Olá [nome], sua trajetória em [seu setor] me chamou atenção, principalmente [point précis]. Gosto de me conectar com pessoas que constroem algo próprio. No que você está mais focado profissionalmente nesse momento?',
 E'Bonjour [nome], votre parcours dans [secteur] a retenu mon attention, surtout [point précis]. J''aime échanger avec des gens qui construisent par eux-mêmes. Sur quoi vous concentrez-vous professionnellement ?',
 E'LinkedIn BR = ton corporate, "olá" plus formel que "oi".', true);

-- ─── 🇹🇷 TURQUIE + DE (Türkçe) ────────────────────────────────────────────
insert into public.prospection_scripts
  (market_code, profile_slug, platform, position, kind, label, language_label, body, body_fr, tip, needs_native_review) values

-- TR weight-women
('tr','weight-women','insta',1,'first_contact','Instagram DM · İlk iletişim','🇹🇷 Türkçe',
 E'Selam [isim] 👋 Profiline denk geldim, [detay] çok hoşuma gitti. Şu an daha çok kilo vermek mi, enerji kazanmak mı, yoksa ikisi birden mi senin için öncelik?',
 E'Salut [name] 👋 Je suis tombée sur ton profil, [detay] m''a beaucoup plu. En ce moment c''est plutôt perdre du poids, gagner en énergie, ou les deux ta priorité ?',
 E'Turquie marché chaud Herbalife. Aussi diaspora turque en Allemagne (5M).', false),

('tr','weight-women','fb',1,'first_contact','Facebook Messenger · İlk iletişim','🇹🇷 Türkçe',
 E'Merhaba [isim], [grup adı] grubundaki [detay] paylaşımını gördüm, bana da dokundu — ben de o yollardan geçtim. Şu an bu konuda neredesin?',
 E'Bonjour [name], vu ton post dans [groupe] sur [detay], ça m''a touchée — je suis passée par là. Tu en es où sur ce sujet ?',
 E'FB Messenger plus posé. Groupes "kilo verme / sağlıklı yaşam" mine d''or.', false),

('tr','weight-women','whatsapp',1,'first_contact','WhatsApp · Doğrudan iletişim','🇹🇷 Türkçe',
 E'Merhaba [isim] 😊 Ben [adın], [bağlam] üzerinden tanışmıştık. Daha iyi hissetme isteğinden bahsetmiştin — şu an o konuda neredesin?',
 E'Coucou [name] 😊 C''est [your name], on s''était connues via [contexte]. Tu m''avais parlé de ton envie de te sentir mieux — tu en es où ?',
 E'Turquie : WhatsApp dominant. Style direct mais chaleureux.', false),

('tr','weight-women','sms',1,'first_contact','SMS · Kısa ve sakin','🇹🇷 Türkçe',
 E'Selam [isim], ben [adın]. DM''de kaybolmamak için SMS''ten yazıyorum. [bağlam] üzerine konuşmuştuk — form hedefinde şu an neredesin?',
 E'Salut [name], c''est [your name]. J''écris par SMS pour ne pas se perdre dans les DM. On avait parlé de [contexte] — tu en es où sur ton objectif forme ?',
 E'TR SMS kısa, emoji yok. "Gerçek bir kişi" hissi.', false),

('tr','weight-women','tiktok',1,'first_contact','TikTok · Video sonrası DM','🇹🇷 Türkçe',
 E'Selam [isim]! [detay] videon hoşuma gitti. Şu an forma girme sürecinde misin, yoksa daha çok keyfine mi yapıyorsun?',
 E'Salut [name] ! Ta vidéo sur [detay] m''a plu. Tu es dans une démarche de remise en forme, ou plus pour le plaisir ?',
 E'TikTok TR = ton léger, référence à la vidéo.', false),

-- TR weight-men
('tr','weight-men','insta',1,'first_contact','Instagram DM · İlk iletişim','🇹🇷 Türkçe',
 E'Selam [isim], [detay] paylaşımını gördüm. Merak ettim — şu an daha çok yağ yakmak mı, temiz kas kazanmak mı, yoksa günlük enerjini geri kazanmak mı istiyorsun?',
 E'Salut [name], vu ton post sur [detay]. Curieux — tu veux plutôt brûler du gras, prendre du muscle propre, ou retrouver ton énergie ?',
 E'TR ton direct mais respectueux. Évite le ton "yumuşak/doux".', false),

('tr','weight-men','fb',1,'first_contact','Facebook Messenger · İlk iletişim','🇹🇷 Türkçe',
 E'Merhaba [isim], [grup adı] grubundaki [detay] paylaşımını gördüm. Şu an belli bir hedefin mi var, yoksa deneme yanılma mı yapıyorsun?',
 E'Bonjour [name], vu ton post dans [groupe] sur [detay]. Tu as un objectif précis, ou tu tâtonnes ?',
 E'TR FB Messenger plus posé. "Forma girme erkek" grupları mine d''or.', false),

('tr','weight-men','whatsapp',1,'first_contact','WhatsApp · Doğrudan iletişim','🇹🇷 Türkçe',
 E'Selam [isim], ben [adın], [bağlam] üzerinden tanışmıştık. [detay] hakkında konuşmuştun. Şu an neredesin bu konuda?',
 E'Salut [name], c''est [your name], on s''était connus via [contexte]. Tu m''avais parlé de [detay]. Tu en es où ?',
 E'TR WhatsApp dominant après contact initial. Ton direct.', false),

('tr','weight-men','sms',1,'first_contact','SMS · Kısa ve sakin','🇹🇷 Türkçe',
 E'Selam [isim], ben [adın]. [bağlam] üzerine konuşmuştuk. Form hedefinde şu an neredesin?',
 E'Salut [name], c''est [your name]. On avait parlé de [contexte]. Tu en es où sur ton objectif forme ?',
 E'TR SMS court, sans emoji.', false),

('tr','weight-men','tiktok',1,'first_contact','TikTok · Video sonrası DM','🇹🇷 Türkçe',
 E'Selam [isim], [detay] videonu gördüm, güzel iş. Şu an hedefin ne — yağ yakmak mı, enerji mi, başka bir şey mi?',
 E'Salut [name], vu ta vidéo sur [detay], beau boulot. Ton objectif c''est quoi — brûler du gras, l''énergie, autre chose ?',
 E'TikTok homme = punchy, question concrète.', false),

-- TR sport
('tr','sport','insta',1,'first_contact','Instagram DM · İlk iletişim','🇹🇷 Türkçe',
 E'Selam [isim] 💪 [detay] paylaşımın dikkatimi çekti, özellikle [point précis]. Antrenmanların çevresinde beslenmeni şu an nasıl yönetiyorsun?',
 E'Salut [name] 💪 Ton post sur [detay] a attiré mon œil, surtout [point précis]. Tu gères comment ta nutrition autour de tes entraînements ?',
 E'Sport = parler PERF, jamais kilo/régime. Diaspora DE idem.', false),

('tr','sport','fb',1,'first_contact','Facebook Messenger · İlk iletişim','🇹🇷 Türkçe',
 E'Merhaba [isim], [grup adı] grubundaki [detay] paylaşımını gördüm. Şu an özel bir şeye mi hazırlanıyorsun — yarış, hedef, yoksa genel kondisyon mu?',
 E'Bonjour [name], vu ton post dans [groupe] sur [detay]. Tu prépares un truc en particulier — course, objectif, ou condition générale ?',
 E'FB sport = groupes koşu/triatlon. Ton entre passionnés.', false),

('tr','sport','whatsapp',1,'first_contact','WhatsApp · Doğrudan iletişim','🇹🇷 Türkçe',
 E'Selam [isim], ben [adın], [bağlam] üzerinden tanışmıştık. [detay] hakkında konuşmuştun. Şu an neredesin?',
 E'Salut [name], c''est [your name], on s''était connus via [contexte]. Tu m''avais parlé de [detay]. Tu en es où ?',
 E'WhatsApp TR sport : poser le contexte avant tout.', false),

('tr','sport','sms',1,'first_contact','SMS · Kısa ve sakin','🇹🇷 Türkçe',
 E'Selam [isim], ben [adın]. Spor hedefin üzerine konuşmuştuk. Hâlâ onun üzerinde misin?',
 E'Salut [name], c''est [your name]. On avait parlé de ton objectif sportif. Toujours dessus ?',
 E'SMS court, factuel.', false),

('tr','sport','tiktok',1,'first_contact','TikTok · Video sonrası DM','🇹🇷 Türkçe',
 E'Selam [isim], [detay] videonu gördüm, helal olsun. Antrenmanlarının çevresinde bir beslenme stratejin var mı, yoksa içgüdüyle mi gidiyorsun?',
 E'Salut [name], vu ta vidéo sur [detay], chapeau. Tu as une stratégie nutrition autour de l''entraînement, ou tu y vas à l''instinct ?',
 E'"helal olsun" = respect fort entre passionnés. Reconnaissance technique.', false),

-- TR business
('tr','business','insta',1,'first_contact','Instagram DM · İlk iletişim','🇹🇷 Türkçe',
 E'Selam [isim], [detay] dikkatimi çekti, özellikle [point précis]. Ne kadar süredir bu işin içindesin? Kendi yolunu çizen insanların hikayesi hep ilgimi çeker.',
 E'Salut [name], [detay] a attiré mon œil, surtout [point précis]. Tu fais ça depuis combien de temps ? Le parcours des gens qui tracent leur propre voie m''intéresse toujours.',
 E'Business = JAMAIS pitcher en M1. Le pitch direct est le marqueur MLM nº1, surtout sur ce marché.', false),

('tr','business','fb',1,'first_contact','Facebook Messenger · İlk iletişim','🇹🇷 Türkçe',
 E'Merhaba [isim], [grup adı] grubundaki [detay] paylaşımını gördüm, bana da yakın geldi — ben de benzer bir yoldayım. Şu an ne üzerine çalışıyorsun?',
 E'Bonjour [name], vu ton post dans [groupe] sur [detay], ça m''a parlé — je suis sur une voie similaire. Tu travailles sur quoi en ce moment ?',
 E'FB business = terrain commun d''abord, jamais l''offre.', false),

('tr','business','whatsapp',1,'first_contact','WhatsApp · Doğrudan iletişim','🇹🇷 Türkçe',
 E'Selam [isim], ben [adın], [bağlam] üzerinden tanışmıştık. Açık olayım: şu an bir şey kuruyorum ve profilin aklıma seni getirdi. Yeni projelere açık mısın, yoksa şu an tamamen kendi işine mi odaklısın?',
 E'Salut [name], c''est [your name], on s''était connus via [contexte]. Je vais être franc : je construis quelque chose et ton profil m''a fait penser à toi. Tu es ouvert à de nouveaux projets, ou 100% focus sur ton activité ?',
 E'WhatsApp business : transparence + filtre par question. Le "açık olayım" (je suis franc) désarme la méfiance MLM.', false),

('tr','business','sms',1,'first_contact','SMS · Kısa ve sakin','🇹🇷 Türkçe',
 E'Selam [isim], ben [adın]. Belirli bir nedenle yazıyorum — profilin, üzerinde çalıştığım bir projeyi hatırlattı. İlgini çekebilir mi, yoksa hiç mi senlik değil?',
 E'Salut [name], c''est [your name]. J''écris pour une raison précise — ton profil m''a rappelé un projet sur lequel je bosse. Ça pourrait t''intéresser, ou pas du tout ?',
 E'SMS business = direct, porte de sortie immédiate.', false),

('tr','business','tiktok',1,'first_contact','TikTok · Video sonrası DM','🇹🇷 Türkçe',
 E'Selam [isim], [detay] videon hoşuma gitti. Bunun yanında şu an ne üzerine çalışıyorsun?',
 E'Salut [name], ta vidéo sur [detay] m''a plu. À côté de ça, tu travailles sur quoi en ce moment ?',
 E'TikTok business = curiosité, pas de pitch.', false),

('tr','business','linkedin',1,'first_contact','LinkedIn · İlk iletişim','🇹🇷 Türkçe',
 E'Merhaba [isim], [leur secteur] alanındaki yolculuğunuz dikkatimi çekti, özellikle [point précis]. Kendi işini kuran kişilerle görüşmek hoşuma gidiyor. Şu an profesyonel olarak en çok neye odaklısınız?',
 E'Bonjour [name], votre parcours dans [secteur] a retenu mon attention, surtout [point précis]. J''aime échanger avec des gens qui construisent par eux-mêmes. Sur quoi vous concentrez-vous le plus professionnellement ?',
 E'Turquie business : LinkedIn moins utilisé qu''Insta/WhatsApp mais bon pour le corporate. Vouvoiement (siz).', false);

-- ─── 🇮🇳 INDE (Hinglish) ──────────────────────────────────────────────────
insert into public.prospection_scripts
  (market_code, profile_slug, platform, position, kind, label, language_label, body, body_fr, tip, needs_native_review) values

-- HI weight-women
('hi','weight-women','insta',1,'first_contact','Instagram DM · First contact','🇮🇳 Hinglish',
 E'Hi [name] 👋 Tera profile dekha, [detail] kaafi achha laga. Abhi tu zyada weight loss pe focus kar rahi hai, energy pe, ya dono pe?',
 E'Salut [name] 👋 J''ai vu ton profil, [detail] m''a beaucoup plu. Là tu es plutôt focus perte de poids, énergie, ou les deux ?',
 E'Inde : classe moyenne aisée écrit en Hinglish. Évite Devanagari sauf si profil le justifie.', false),

('hi','weight-women','fb',1,'first_contact','Facebook Messenger · First contact','🇮🇳 Hinglish',
 E'Hi [name], [group name] mein tera post dekha [detail] ke baare mein, dil ko chhua — main bhi us phase se guzri hu. Abhi is journey mein tu kahaan hai?',
 E'Salut [name], vu ton post dans [groupe] sur [detail], ça m''a touchée — je suis passée par cette phase. Tu en es où dans ce parcours ?',
 E'FB Inde ton posé. Groupes "weight loss India / healthy living" mine d''or.', false),

('hi','weight-women','whatsapp',1,'first_contact','WhatsApp · Direct contact','🇮🇳 Hinglish',
 E'Hi [name] 😊 Main [your name], hum [context] pe connect hue the. Tune better feel karne ki baat ki thi — abhi us pe kahaan hai tu?',
 E'Salut [name] 😊 C''est [your name], on s''était connectées via [contexte]. Tu m''avais parlé de te sentir mieux — tu en es où ?',
 E'WhatsApp = LE canal nº1 en Inde (700M+ users).', false),

('hi','weight-women','sms',1,'first_contact','SMS · Short & grounded','🇮🇳 Hinglish',
 E'Hi [name], main [your name]. DM mein kho na jaaye isliye SMS kar rahi hu. Hum [context] pe baat kar rahe the — abhi tere fitness goal pe kya scene hai?',
 E'Salut [name], c''est [your name]. J''écris en SMS pour ne pas se perdre dans les DM. On parlait de [contexte] — où en es-tu sur ton objectif forme ?',
 E'SMS Hinglish court, "real person" feel.', false),

('hi','weight-women','tiktok',1,'first_contact','TikTok · Post-video DM','🇮🇳 Hinglish',
 E'Hi [name]! Tera [detail] wala video achha laga. Abhi tu fitness journey pe hai, ya bas masti ke liye?',
 E'Salut [name] ! Ta vidéo sur [detail] m''a plu. Tu es dans une démarche fitness, ou juste pour le fun ?',
 E'TikTok Inde = ton léger, réf à la vidéo.', false),

-- HI weight-men
('hi','weight-men','insta',1,'first_contact','Instagram DM · First contact','🇮🇳 Hinglish',
 E'Hi [name], tera [detail] wala post dekha. Quick question — tu zyada fat loss pe hai, clean muscle gain pe, ya daily energy wapas paane pe?',
 E'Salut [name], vu ton post sur [detail]. Petite question — tu es plutôt fat loss, prise de muscle propre, ou retrouver ton énergie ?',
 E'Hinglish naturel. Anglais technique + hindi conversationnel mélangé.', false),

('hi','weight-men','fb',1,'first_contact','Facebook Messenger · First contact','🇮🇳 Hinglish',
 E'Hi [name], [group name] mein tera [detail] wala post dekha. Abhi koi specific goal pe kaam kar raha hai ya experiment kar raha hai?',
 E'Salut [name], vu ton post dans [groupe] sur [detail]. Tu bosses sur un objectif précis, ou tu expérimentes ?',
 E'FB Messenger Inde ton posé. Groupes "men''s fitness India" mine d''or.', false),

('hi','weight-men','whatsapp',1,'first_contact','WhatsApp · Direct contact','🇮🇳 Hinglish',
 E'Hi [name], main [your name], hum [context] pe mile the. Tune [detail] ki baat ki thi. Abhi us pe kahaan hai?',
 E'Salut [name], c''est [your name], on s''était rencontrés via [contexte]. Tu m''avais parlé de [detail]. Tu en es où ?',
 E'WhatsApp #1 Inde. Hinglish chaleureux.', false),

('hi','weight-men','sms',1,'first_contact','SMS · Short & grounded','🇮🇳 Hinglish',
 E'Hi [name], main [your name]. Hum [context] pe baat kiye the. Abhi tere fitness goal pe kya scene hai?',
 E'Salut [name], c''est [your name]. On parlait de [contexte]. Où en es-tu sur ton objectif forme ?',
 E'SMS Hinglish court.', false),

('hi','weight-men','tiktok',1,'first_contact','TikTok · Post-video DM','🇮🇳 Hinglish',
 E'Hi [name], tera [detail] wala video dekha, badhiya. Abhi goal kya hai — fat loss, energy, ya kuch aur?',
 E'Salut [name], vu ta vidéo sur [detail], bien joué. Ton objectif c''est quoi — fat loss, énergie, ou autre ?',
 E'TikTok homme = punchy.', false),

-- HI sport
('hi','sport','insta',1,'first_contact','Instagram DM · First contact','🇮🇳 Hinglish',
 E'Hi [name] 💪 Tera [detail] wala post dekha, especially [point précis]. Apne training ke around nutrition abhi kaise manage karta hai?',
 E'Salut [name] 💪 Vu ton post sur [detail], surtout [point précis]. Tu gères comment ta nutrition autour de tes entraînements ?',
 E'Athlètes indiens lisent EN aussi. Mentionner "desi" rassure sur la culture.', false),

('hi','sport','fb',1,'first_contact','Facebook Messenger · First contact','🇮🇳 Hinglish',
 E'Hi [name], [group name] mein tera [detail] wala post dekha. Abhi kisi specific cheez ki tayyari kar raha hai — race, goal, ya general fitness?',
 E'Salut [name], vu ton post dans [groupe] sur [detail]. Tu prépares un truc précis — course, objectif, ou forme générale ?',
 E'FB sport Inde = groupes running/cricket/gym.', false),

('hi','sport','whatsapp',1,'first_contact','WhatsApp · Direct contact','🇮🇳 Hinglish',
 E'Hi [name], main [your name], hum [context] pe mile the. Tune [detail] ki baat ki thi. Abhi kahaan hai us pe?',
 E'Salut [name], c''est [your name], on s''était rencontrés via [contexte]. Tu m''avais parlé de [detail]. Tu en es où ?',
 E'WhatsApp Inde sport : contexte d''abord.', false),

('hi','sport','sms',1,'first_contact','SMS · Short & grounded','🇮🇳 Hinglish',
 E'Hi [name], main [your name]. Tere sport goal pe baat hui thi. Abhi bhi us pe laga hua hai?',
 E'Salut [name], c''est [your name]. On avait parlé de ton objectif sportif. Tu es toujours dessus ?',
 E'SMS court.', false),

('hi','sport','tiktok',1,'first_contact','TikTok · Post-video DM','🇮🇳 Hinglish',
 E'Hi [name], tera [detail] wala video dekha, kamaal. Training ke around koi nutrition strategy hai, ya feeling pe chalta hai?',
 E'Salut [name], vu ta vidéo sur [detail], impressionnant. Tu as une stratégie nutrition autour de l''entraînement, ou tu y vas au feeling ?',
 E'TikTok sport = reconnaissance technique.', false),

-- HI business
('hi','business','insta',1,'first_contact','Instagram DM · First contact','🇮🇳 Hinglish',
 E'Hi [name], tera [detail] dhyaan mein aaya, especially [point précis]. Tu kitne time se ye kar raha hai? Jo log apna khud ka kuch banate hai, unki journey hamesha interest karti hai mujhe.',
 E'Salut [name], ton [detail] a attiré mon attention, surtout [point précis]. Tu fais ça depuis combien de temps ? Le parcours des gens qui construisent leur propre truc m''intéresse toujours.',
 E'Inde = marché ULTRA saturé en DM "wellness opportunity". Le pitch direct est mortel. Curiosité sincère obligatoire.', false),

('hi','business','fb',1,'first_contact','Facebook Messenger · First contact','🇮🇳 Hinglish',
 E'Hi [name], [group name] mein tera [detail] wala post dekha, relate kiya — main bhi similar raah pe hu. Abhi tu kis pe kaam kar raha hai?',
 E'Salut [name], vu ton post dans [groupe] sur [detail], je me suis reconnu — voie similaire. Tu bosses sur quoi en ce moment ?',
 E'FB business = terrain commun d''abord.', false),

('hi','business','whatsapp',1,'first_contact','WhatsApp · Direct contact','🇮🇳 Hinglish',
 E'Hi [name], main [your name], hum [context] pe mile the. Honestly bata du — abhi main kuch build kar raha hu aur tera profile dekh ke tu yaad aaya. Tu naye projects ke liye open hai, ya abhi fully apne kaam pe focused hai?',
 E'Salut [name], c''est [your name], on s''était rencontrés via [contexte]. Pour être franc — je construis quelque chose et ton profil m''a fait penser à toi. Tu es ouvert à de nouveaux projets, ou 100% focus sur ton activité ?',
 E'WhatsApp business : transparence + filtre.', false),

('hi','business','sms',1,'first_contact','SMS · Short & grounded','🇮🇳 Hinglish',
 E'Hi [name], main [your name]. Ek specific reason se likh raha hu — tera profile mujhe ek project ki yaad dilaya jis pe main kaam kar raha hu. Interest ho sakta hai, ya bilkul nahi tera type?',
 E'Salut [name], c''est [your name]. J''écris pour une raison précise — ton profil m''a rappelé un projet sur lequel je bosse. Ça pourrait t''intéresser, ou pas du tout ton genre ?',
 E'SMS business = direct, porte de sortie.', false),

('hi','business','tiktok',1,'first_contact','TikTok · Post-video DM','🇮🇳 Hinglish',
 E'Hi [name], tera [detail] wala video achha laga. Iske saath-saath abhi tu kis pe kaam kar raha hai?',
 E'Salut [name], ta vidéo sur [detail] m''a plu. À côté de ça, tu travailles sur quoi en ce moment ?',
 E'TikTok business = curiosité, pas de pitch.', false),

('hi','business','linkedin',1,'first_contact','LinkedIn · First contact','🇮🇳 Hinglish',
 E'Hi [name], your journey in [their field] caught my attention, especially [point précis]. I enjoy connecting with people who are creating something of their own. What are you most focused on professionally these days?',
 E'Bonjour [name], votre parcours dans [secteur] a retenu mon attention, surtout [point précis]. J''aime échanger avec des gens qui construisent par eux-mêmes. Sur quoi vous concentrez-vous le plus professionnellement ?',
 E'Inde business : anglais corporate sur LinkedIn. Pas de pitch ni Zoom en M1.', false);

-- ============================================================================
-- INSERTS RELANCES J+3 (position=2, kind=j3_followup, platform='insta'=défaut)
-- ============================================================================
-- 4 profils × 6 marchés = 24 relances.
-- weight-women + weight-men = MÊME message ("poids" unisexe).
-- sport et business ont leur propre relance.

insert into public.prospection_scripts
  (market_code, profile_slug, platform, position, kind, label, language_label, body, body_fr, tip, needs_native_review) values

-- ─── FR relances J+3 ─────────────────────────────────────────────────────
('fr','weight-women','insta',2,'j3_followup','Relance J+3 · poids','🇫🇷 Français',
 E'Hey [prénom] 🙂 Je voulais pas te perdre dans le flux. Si le sujet forme / énergie te parle en ce moment, ma porte est ouverte — et si c''est pas le moment, ignore tranquille 🌿',
 null,
 E'Ne pas en remettre une couche après J+3 si toujours rien.', false),

('fr','weight-men','insta',2,'j3_followup','Relance J+3 · poids','🇫🇷 Français',
 E'Hey [prénom] 🙂 Je voulais pas te perdre dans le flux. Si le sujet forme / énergie te parle en ce moment, ma porte est ouverte — et si c''est pas le moment, ignore tranquille 🌿',
 null,
 E'Ne pas en remettre une couche après J+3 si toujours rien.', false),

('fr','sport','insta',2,'j3_followup','Relance J+3 · sport','🇫🇷 Français',
 E'Hey [prénom] 🙂 Du coup, ta nutrition c''est plutôt au feeling ou tu suis un truc structuré ? Curieux de savoir ce qui marche pour toi.',
 null,
 E'Relance avec question ouverte, jamais de pitch.', false),

('fr','business','insta',2,'j3_followup','Relance J+3 · business','🇫🇷 Français',
 E'Hey [prénom], je voulais juste m''assurer que t''avais vu mon message. Si c''est "vu mais pas pour moi", dis-le franchement — c''est plus utile qu''un silence et je te relance pas. Et si c''est juste le timing, je suis là quand tu veux.',
 null,
 E'Relance business = honnête et directe, offre une sortie claire.', false),

-- ─── EN relances J+3 ─────────────────────────────────────────────────────
('en','weight-women','insta',2,'j3_followup','Relance J+3 · poids','🇬🇧 English',
 E'Hey [name] 🙂 Didn''t want you to get lost in the DMs. If health / energy is on your mind right now, my door''s open — and if it''s not the moment, no worries at all 🌿',
 E'Hey [prénom] 🙂 Je voulais pas te perdre dans le flux. Si le sujet forme / énergie te parle en ce moment, ma porte est ouverte — et si c''est pas le moment, ignore tranquille 🌿',
 E'No salesy tone, pure conversation.', false),

('en','weight-men','insta',2,'j3_followup','Relance J+3 · poids','🇬🇧 English',
 E'Hey [name] 🙂 Didn''t want you to get lost in the DMs. If health / energy is on your mind right now, my door''s open — and if it''s not the moment, no worries at all 🌿',
 E'Hey [prénom] 🙂 Je voulais pas te perdre dans le flux. Si le sujet forme / énergie te parle en ce moment, ma porte est ouverte — et si c''est pas le moment, ignore tranquille 🌿',
 E'No salesy tone, pure conversation.', false),

('en','sport','insta',2,'j3_followup','Relance J+3 · sport','🇬🇧 English',
 E'Hey [name] 🙂 So is your nutrition more by feel, or do you follow something structured? Curious what works for you.',
 E'Hey [prénom] 🙂 Du coup, ta nutrition c''est plutôt au feeling ou tu suis un truc structuré ? Curieux de savoir ce qui marche pour toi.',
 E'Open question, never a pitch.', false),

('en','business','insta',2,'j3_followup','Relance J+3 · business','🇬🇧 English',
 E'Hey [name], just wanted to make sure you saw my message. If it''s "saw it, not for me", feel free to say so — more useful than silence and I won''t follow up again. And if it''s just timing, I''m around.',
 E'Hey [prénom], je voulais juste m''assurer que t''avais vu mon message. Si c''est "vu mais pas pour moi", dis-le franchement — c''est plus utile qu''un silence et je te relance pas. Et si c''est juste le timing, je suis là quand tu veux.',
 E'Honest and direct, offers a clean way out.', false),

-- ─── ES relances J+3 ─────────────────────────────────────────────────────
('es','weight-women','insta',2,'j3_followup','Relance J+3 · poids','🇲🇽 Español',
 E'Hey [nombre] 🙂 No quería que se perdiera entre los DM. Si el tema forma / energía te resuena ahora, aquí estoy — y si no es el momento, tranquila 🌿',
 E'Hey [prénom] 🙂 Je voulais pas te perdre dans le flux. Si le sujet forme / énergie te parle en ce moment, ma porte est ouverte — et si c''est pas le moment, ignore tranquille 🌿',
 E'Tono conversacional, sin venta.', true),

('es','weight-men','insta',2,'j3_followup','Relance J+3 · poids','🇲🇽 Español',
 E'Hey [nombre] 🙂 No quería que se perdiera entre los DM. Si el tema forma / energía te resuena ahora, aquí estoy — y si no es el momento, tranquila 🌿',
 E'Hey [prénom] 🙂 Je voulais pas te perdre dans le flux. Si le sujet forme / énergie te parle en ce moment, ma porte est ouverte — et si c''est pas le moment, ignore tranquille 🌿',
 E'Tono conversacional, sin venta.', true),

('es','sport','insta',2,'j3_followup','Relance J+3 · sport','🇲🇽 Español',
 E'Hey [nombre] 🙂 ¿Tu nutrición la llevas más al feeling o sigues algo estructurado? Me da curiosidad saber qué te funciona.',
 E'Hey [prénom] 🙂 Du coup, ta nutrition c''est plutôt au feeling ou tu suis un truc structuré ? Curieux de savoir ce qui marche pour toi.',
 E'Pregunta abierta, sin pitch.', true),

('es','business','insta',2,'j3_followup','Relance J+3 · business','🇲🇽 Español',
 E'Hey [nombre], solo quería asegurarme de que viste mi mensaje. Si es "lo vi, no es para mí", dímelo con confianza — es más útil que el silencio y no insisto más. Y si es solo cuestión de timing, aquí estoy.',
 E'Hey [prénom], je voulais juste m''assurer que t''avais vu mon message. Si c''est "vu mais pas pour moi", dis-le franchement — c''est plus utile qu''un silence et je te relance pas. Et si c''est juste le timing, je suis là quand tu veux.',
 E'Honesto y directo, deja salida limpia.', true),

-- ─── PT relances J+3 ─────────────────────────────────────────────────────
('pt','weight-women','insta',2,'j3_followup','Relance J+3 · poids','🇧🇷 Português (BR)',
 E'Ei [nome] 🙂 Não queria que se perdesse nas DM. Se o assunto forma / energia faz sentido pra você agora, tô aqui — e se não for o momento, sem problema 🌿',
 E'Hey [prénom] 🙂 Je voulais pas te perdre dans le flux. Si le sujet forme / énergie te parle en ce moment, ma porte est ouverte — et si c''est pas le moment, ignore tranquille 🌿',
 E'Tom de conversa, nada de venda.', true),

('pt','weight-men','insta',2,'j3_followup','Relance J+3 · poids','🇧🇷 Português (BR)',
 E'Ei [nome] 🙂 Não queria que se perdesse nas DM. Se o assunto forma / energia faz sentido pra você agora, tô aqui — e se não for o momento, sem problema 🌿',
 E'Hey [prénom] 🙂 Je voulais pas te perdre dans le flux. Si le sujet forme / énergie te parle en ce moment, ma porte est ouverte — et si c''est pas le moment, ignore tranquille 🌿',
 E'Tom de conversa, nada de venda.', true),

('pt','sport','insta',2,'j3_followup','Relance J+3 · sport','🇧🇷 Português (BR)',
 E'Ei [nome] 🙂 Sua nutrição é mais no feeling ou você segue algo estruturado? Fiquei curioso pra saber o que funciona pra você.',
 E'Hey [prénom] 🙂 Du coup, ta nutrition c''est plutôt au feeling ou tu suis un truc structuré ? Curieux de savoir ce qui marche pour toi.',
 E'Pergunta aberta, sem pitch.', true),

('pt','business','insta',2,'j3_followup','Relance J+3 · business','🇧🇷 Português (BR)',
 E'Ei [nome], só queria ter certeza de que você viu minha mensagem. Se for "vi, não é pra mim", pode falar tranquilo — é mais útil que o silêncio e não insisto mais. E se for só timing, tô por aqui.',
 E'Hey [prénom], je voulais juste m''assurer que t''avais vu mon message. Si c''est "vu mais pas pour moi", dis-le franchement — c''est plus utile qu''un silence et je te relance pas. Et si c''est juste le timing, je suis là quand tu veux.',
 E'Honesto e direto, oferece saída limpa.', true),

-- ─── TR relances J+3 ─────────────────────────────────────────────────────
('tr','weight-women','insta',2,'j3_followup','Relance J+3 · poids','🇹🇷 Türkçe',
 E'Selam [isim] 🙂 Akışta kaybolma diye yazdım. Form / enerji konusu şu an sana hitap ediyorsa buradayım — uygun zaman değilse de hiç dert etme 🌿',
 E'Hey [prénom] 🙂 Je voulais pas te perdre dans le flux. Si le sujet forme / énergie te parle en ce moment, ma porte est ouverte — et si c''est pas le moment, ignore tranquille 🌿',
 E'Sohbet tonu, satış yok.', false),

('tr','weight-men','insta',2,'j3_followup','Relance J+3 · poids','🇹🇷 Türkçe',
 E'Selam [isim] 🙂 Akışta kaybolma diye yazdım. Form / enerji konusu şu an sana hitap ediyorsa buradayım — uygun zaman değilse de hiç dert etme 🌿',
 E'Hey [prénom] 🙂 Je voulais pas te perdre dans le flux. Si le sujet forme / énergie te parle en ce moment, ma porte est ouverte — et si c''est pas le moment, ignore tranquille 🌿',
 E'Sohbet tonu, satış yok.', false),

('tr','sport','insta',2,'j3_followup','Relance J+3 · sport','🇹🇷 Türkçe',
 E'Selam [isim] 🙂 Beslenmen daha çok içgüdüsel mi, yoksa yapılandırılmış bir şey mi takip ediyorsun? Sende ne işe yarıyor merak ettim.',
 E'Hey [prénom] 🙂 Du coup, ta nutrition c''est plutôt au feeling ou tu suis un truc structuré ? Curieux de savoir ce qui marche pour toi.',
 E'Açık soru, asla pitch yok.', false),

('tr','business','insta',2,'j3_followup','Relance J+3 · business','🇹🇷 Türkçe',
 E'Selam [isim], mesajımı gördün mü diye emin olmak istedim. "Gördüm ama bana göre değil" ise açıkça söyle — sessizlikten daha faydalı, bir daha rahatsız etmem. Sadece zamanlamaysa, buradayım.',
 E'Hey [prénom], je voulais juste m''assurer que t''avais vu mon message. Si c''est "vu mais pas pour moi", dis-le franchement — c''est plus utile qu''un silence et je te relance pas. Et si c''est juste le timing, je suis là quand tu veux.',
 E'Dürüst ve doğrudan, temiz bir çıkış sunar.', false),

-- ─── HI relances J+3 ─────────────────────────────────────────────────────
('hi','weight-women','insta',2,'j3_followup','Relance J+3 · poids','🇮🇳 Hinglish',
 E'Hey [name] 🙂 Bas yeh ensure karna tha ki tu DM mein kho na jaaye. Agar health / energy abhi tere mind mein hai, main yahaan hu — aur agar abhi sahi time nahi hai, koi baat nahi 🌿',
 E'Hey [prénom] 🙂 Je voulais pas te perdre dans le flux. Si le sujet forme / énergie te parle en ce moment, ma porte est ouverte — et si c''est pas le moment, ignore tranquille 🌿',
 E'Conversation tone, no selling.', false),

('hi','weight-men','insta',2,'j3_followup','Relance J+3 · poids','🇮🇳 Hinglish',
 E'Hey [name] 🙂 Bas yeh ensure karna tha ki tu DM mein kho na jaaye. Agar health / energy abhi tere mind mein hai, main yahaan hu — aur agar abhi sahi time nahi hai, koi baat nahi 🌿',
 E'Hey [prénom] 🙂 Je voulais pas te perdre dans le flux. Si le sujet forme / énergie te parle en ce moment, ma porte est ouverte — et si c''est pas le moment, ignore tranquille 🌿',
 E'Conversation tone, no selling.', false),

('hi','sport','insta',2,'j3_followup','Relance J+3 · sport','🇮🇳 Hinglish',
 E'Hey [name] 🙂 Teri nutrition zyada feeling pe hai ya kuch structured follow karta hai? Curious hu ki tere liye kya kaam karta hai.',
 E'Hey [prénom] 🙂 Du coup, ta nutrition c''est plutôt au feeling ou tu suis un truc structuré ? Curieux de savoir ce qui marche pour toi.',
 E'Open question, no pitch.', false),

('hi','business','insta',2,'j3_followup','Relance J+3 · business','🇮🇳 Hinglish',
 E'Hey [name], bas confirm karna tha ki tune mera message dekha. Agar "dekha but mere liye nahi" hai, seedha bata de — silence se better hai aur main dobara follow up nahi karunga. Aur agar sirf timing ki baat hai, main yahaan hu.',
 E'Hey [prénom], je voulais juste m''assurer que t''avais vu mon message. Si c''est "vu mais pas pour moi", dis-le franchement — c''est plus utile qu''un silence et je te relance pas. Et si c''est juste le timing, je suis là quand tu veux.',
 E'Honest and direct, clean exit.', false);

commit;

-- ============================================================================
-- VÉRIFICATION POST-SEED (à exécuter manuellement après push)
-- ============================================================================
-- SELECT market_code, profile_slug, COUNT(*) AS n
--   FROM public.prospection_scripts
--  GROUP BY market_code, profile_slug
--  ORDER BY market_code, profile_slug;
--
-- Attendu : 6 marchés × 4 profils = 24 lignes.
-- · business : 7 scripts par marché (insta/fb/wa/sms/tiktok M1 + linkedin M1 + relance J+3)
-- · sport / weight-women / weight-men : 6 scripts (5 plateformes M1 + relance)
--
-- Total attendu : (6 + 6 + 6 + 7) × 6 = 150 scripts.
