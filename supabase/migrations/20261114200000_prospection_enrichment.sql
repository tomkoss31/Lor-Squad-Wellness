-- =============================================================================
-- Chantier #3 — Enrichissement Prospection cold (2026-05-17, après seed initial)
--
-- Demande Thomas : "met le paquet sur les textes les # pour trouver les
-- meilleurs" + "ajoute la possibilité de voir la traduction en Français
-- des textes des autres langues".
--
-- Apports :
--   1. Colonne `prospection_scripts.body_fr` : traduction française du
--      body (NULL pour les scripts déjà en FR). Permet au coach français
--      de comprendre ce qu'il copie-colle en langue étrangère.
--   2. Traduction FR de tous les 23 scripts non-FR existants.
--   3. +12 scripts pour combos manquantes (sport/whatsapp ES/PT/TR/HI,
--      business/whatsapp TR/HI/FR, sport/whatsapp EN/FR, weight/sms FR/EN,
--      sport/fb ES).
--   4. +72 hashtags supplémentaires (passe à ~10 par combo).
-- =============================================================================

begin;

-- ─── Section 1 : add column body_fr ─────────
alter table public.prospection_scripts
  add column if not exists body_fr text;

comment on column public.prospection_scripts.body_fr is
  'Chantier #3 V2 — Traduction française du body (pour les scripts non-FR). Permet au coach français de comprendre ce qu''il copie-colle. NULL pour les scripts déjà en FR.';

-- ─── Section 2 : traduction FR de tous les scripts non-FR existants ─────────

update public.prospection_scripts set body_fr = E'Hey [prénom] 👋 Je suis tombé sur ton profil et j''ai trouvé ton énergie vraiment cool. Je suis coach bien-être, j''accompagne des personnes qui veulent reprendre la main sur leur forme sans régime extrême. Si un jour ça te parle, je peux te partager comment je bosse — zéro pression. Bonne journée à toi ✨'
where market_code='en' and profile_slug='weight' and platform='insta' and position=1;

update public.prospection_scripts set body_fr = E'Hey [prénom] 🙂 Je voulais pas que tu te perdes dans mes DM. Petit suivi de mon message précédent — je sais que la vie va vite. Si jamais tu veux qu''on échange sur ta forme ou tes objectifs bien-être, je suis dispo. Sinon pas de souci, je te souhaite une belle journée 🌿'
where market_code='en' and profile_slug='weight' and platform='insta' and position=2;

update public.prospection_scripts set body_fr = E'Hey [prénom] ! 😊 [Contact en commun] m''a parlé de toi en disant que tu cherchais à te remettre en forme. Je suis coach bien-être, j''accompagne des personnes sur la nutrition et l''énergie au quotidien. Si tu veux qu''on en discute autour d''un café (ou en visio), dis-moi ✨'
where market_code='en' and profile_slug='weight' and platform='whatsapp' and position=1;

update public.prospection_scripts set body_fr = E'Hey [prénom] 💪 Ton profil m''a fait sourire, on voit que t''es à fond dans ton sport. Je bosse avec pas mal d''athlètes amateurs sur la nutrition et la récup — souvent c''est ce qui débloque les perfs. Si un jour t''as envie d''échanger là-dessus, fais-moi signe 🙌'
where market_code='en' and profile_slug='sport' and platform='insta' and position=1;

update public.prospection_scripts set body_fr = E'Hey [prénom], j''ai vu que t''étais dans [entrepreneuriat / ton secteur]. J''accompagne des personnes qui veulent développer une activité bien-être en complément, avec une vraie liberté de temps. Pas du tout le délire MLM agressif — c''est posé, on en parle si ça t''intéresse. Bonne journée ✨'
where market_code='en' and profile_slug='business' and platform='insta' and position=1;

update public.prospection_scripts set body_fr = E'Bonjour [prénom], ton parcours dans [leur domaine] m''a intéressé. Je développe un projet bien-être avec une approche entrepreneuriale et je cherche des profils sérieux pour échanger. Si tu es ouvert à un appel découverte (15 min, sans engagement), dis-moi. Au plaisir.'
where market_code='en' and profile_slug='business' and platform='linkedin' and position=1;

update public.prospection_scripts set body_fr = E'Salut [prénom] ! 👋 Je suis tombée sur ton profil et j''ai trouvé ton énergie super inspirante. Je suis coach bien-être et j''accompagne des personnes qui veulent retrouver la forme sans régime extrême. Si un jour ça t''intéresse d''en parler, fais-moi signe — sans pression ✨'
where market_code='es' and profile_slug='weight' and platform='insta' and position=1;

update public.prospection_scripts set body_fr = E'Salut [prénom] ! 😊 Je suis [ton prénom], on s''est connectés sur [contexte]. Je voulais juste te dire bonjour comme il faut. Je bosse dans le coaching bien-être — si jamais tu veux qu''on échange sur tes objectifs forme, je suis là. Bonne journée 🌿'
where market_code='es' and profile_slug='weight' and platform='whatsapp' and position=1;

update public.prospection_scripts set body_fr = E'Salut [prénom] ! 💪 Ton profil m''a fait sourire, on voit que t''es à fond dans ton sport. J''accompagne pas mal de sportifs sur la nutrition et la récup — c''est souvent là que ça se joue niveau perfs. Si tu veux qu''on en parle un jour, fais-moi signe 🙌'
where market_code='es' and profile_slug='sport' and platform='insta' and position=1;

update public.prospection_scripts set body_fr = E'Bonjour [prénom], j''ai vu que tu t''intéressais à [entrepreneuriat / ton secteur]. Je développe un projet bien-être avec une vraie dimension business et je cherche à échanger avec des profils sérieux. Pas de pitch agressif — juste un appel posé si ça te parle. Belle journée ✨'
where market_code='es' and profile_slug='business' and platform='insta' and position=1;

update public.prospection_scripts set body_fr = E'Salut [prénom] ! 😊 Je suis [ton prénom], on s''est connectés sur [contexte]. Je voulais qu''on prenne le temps de se reparler comme il faut. Je développe un projet bien-être avec une dimension entrepreneuriale — si t''es curieux, on cale un appel quand tu veux.'
where market_code='es' and profile_slug='business' and platform='whatsapp' and position=1;

update public.prospection_scripts set body_fr = E'Salut [prénom] ! 👋 Je suis [ton prénom], j''ai vu ton profil et j''ai trouvé ton énergie cool. Je suis coach bien-être, j''accompagne des personnes qui veulent reprendre la main sur leur forme sans tomber dans les régimes restrictifs. Si ça te parle un jour, fais-moi signe ✨'
where market_code='pt' and profile_slug='weight' and platform='insta' and position=1;

update public.prospection_scripts set body_fr = E'Salut [prénom] ! 😊 Je suis [ton prénom], on s''est connus sur [contexte]. Je voulais te dire bonjour comme il faut. Je bosse dans le coaching bien-être — si t''as envie d''échanger sur tes objectifs forme, je suis là, zéro pression. Bonne journée 🌿'
where market_code='pt' and profile_slug='weight' and platform='whatsapp' and position=1;

update public.prospection_scripts set body_fr = E'Salut [prénom] ! 💪 J''ai adoré ton contenu training, on voit que t''es vraiment investi. J''accompagne pas mal de sportifs sur la nutrition et la récup — c''est souvent ce qui fait passer un cap niveau perfs. Si t''as envie qu''on en parle, fais-moi signe 🙌'
where market_code='pt' and profile_slug='sport' and platform='insta' and position=1;

update public.prospection_scripts set body_fr = E'Salut [prénom], j''ai vu que t''étais dans [entrepreneuriat / ton secteur]. Je développe un projet bien-être avec une vraie dimension business et je cherche des profils sérieux pour échanger. Si ça te parle, on cale un appel posé. Belle journée ✨'
where market_code='pt' and profile_slug='business' and platform='insta' and position=1;

update public.prospection_scripts set body_fr = E'Salut [prénom] ! 😊 Je suis [ton prénom], on avait échangé sur [contexte]. Je voulais reprendre contact comme il faut. Je développe un projet bien-être avec une dimension entrepreneuriale — si t''es curieux, on prend 15 min en visio quand tu veux.'
where market_code='pt' and profile_slug='business' and platform='whatsapp' and position=1;

update public.prospection_scripts set body_fr = E'Salut [prénom] 👋 J''ai vu ton profil et j''ai trouvé ton énergie cool. Je suis coach bien-être, j''accompagne des personnes qui veulent retrouver la forme sans régime extrême. Si ça te parle un jour, fais-moi signe — zéro pression ✨'
where market_code='tr' and profile_slug='weight' and platform='insta' and position=1;

update public.prospection_scripts set body_fr = E'Salut [prénom] ! 😊 Je suis [ton prénom], on s''est connectés sur [contexte]. Je voulais te dire bonjour comme il faut. Je bosse dans le coaching bien-être — si t''as envie d''en discuter, je suis dispo. Bonne journée 🌿'
where market_code='tr' and profile_slug='weight' and platform='whatsapp' and position=1;

update public.prospection_scripts set body_fr = E'Salut [prénom] 💪 Ton profil est top, on voit que t''es à fond dans ton sport. J''accompagne pas mal de sportifs sur la nutrition et la récup — c''est souvent là que ça se joue. Si tu veux qu''on en parle, fais-moi signe 🙌'
where market_code='tr' and profile_slug='sport' and platform='insta' and position=1;

update public.prospection_scripts set body_fr = E'Salut [prénom], j''ai vu ton profil et ton parcours m''intéresse. Je développe un projet bien-être avec une vraie dimension entrepreneuriale et je cherche des profils sérieux pour échanger. Si ça te parle, on cale un appel. Belle journée ✨'
where market_code='tr' and profile_slug='business' and platform='insta' and position=1;

update public.prospection_scripts set body_fr = E'Salut [prénom] 👋 Je suis [ton prénom], j''ai vu ton profil. Je suis coach bien-être, j''accompagne des personnes qui veulent retrouver la forme sans régime extrême. Si ça te parle un jour, fais-moi signe — sans pression ✨'
where market_code='hi' and profile_slug='weight' and platform='insta' and position=1;

update public.prospection_scripts set body_fr = E'Salut [prénom] ! 😊 Je suis [ton prénom], on s''est connectés sur [contexte]. Je voulais te dire bonjour comme il faut. Je bosse dans le coaching bien-être — si t''as envie d''échanger sur tes objectifs, je suis là. Bonne journée 🌿'
where market_code='hi' and profile_slug='weight' and platform='whatsapp' and position=1;

update public.prospection_scripts set body_fr = E'Hey [prénom] 💪 J''ai adoré ton contenu training. J''accompagne pas mal de sportifs sur la nutrition et la récup — c''est souvent ce qui débloque les perfs. Si t''as envie qu''on en parle, fais-moi signe 🙌'
where market_code='hi' and profile_slug='sport' and platform='insta' and position=1;

update public.prospection_scripts set body_fr = E'Salut [prénom], j''ai vu ton profil et ton travail m''intéresse. Je développe un projet bien-être avec une dimension entrepreneuriale et je cherche des profils sérieux pour échanger. Si ça te parle, on cale un appel posé. Belle journée ✨'
where market_code='hi' and profile_slug='business' and platform='insta' and position=1;

-- ─── Section 3 : nouveaux scripts pour combos manquantes ─────────
-- Insertion idempotente : on saute si déjà présent au même (market,
-- profile, platform, position).
do $$
begin
  insert into public.prospection_scripts (market_code, profile_slug, platform, body, body_fr, tip, position)
  select * from (values
    ('es'::text,'sport'::text,'whatsapp'::text,
     E'¡Hola [nombre]! 💪 Soy [tu nombre], nos conectamos por [contexto]. Vi que entrenas fuerte y quería contarte: acompaño a deportistas amateurs en nutrición y recuperación, suele ser ahí donde se desbloquean los progresos. Si te apetece que charlemos un día, sin compromiso, dime 🙌',
     E'Salut [prénom] ! 💪 Je suis [ton prénom], on s''est connectés sur [contexte]. J''ai vu que tu t''entraînes dur et je voulais te dire : j''accompagne des sportifs amateurs sur la nutrition et la récup, c''est souvent là que ça débloque. Si tu veux qu''on en parle, fais-moi signe 🙌',
     'WhatsApp ES sport : référencer un contexte commun avant de proposer.', 1),
    ('es','sport','fb',
     E'¡Hola [nombre]! 💪 Vi tu perfil y tu energía deportiva me llamó la atención. Soy coach de bienestar, trabajo bastante con deportistas amateurs sobre nutrición y recuperación. Si un día te apetece intercambiar, sin presión, aquí estoy ✨',
     E'Salut [prénom] ! 💪 J''ai vu ton profil et ton énergie sportive m''a marqué. Je suis coach bien-être, je bosse pas mal avec des sportifs amateurs sur la nutrition et la récup. Si un jour t''as envie d''échanger, sans pression, je suis là ✨',
     'FB ES sport : ton chaleureux, contact pro plus posé qu''Insta.', 1),
    ('pt','sport','whatsapp',
     E'Oi [nome]! 💪 Sou [seu nome], a gente se conheceu em [contexto]. Vi que você treina firme e quis te dizer: acompanho atletas amadores em nutrição e recuperação, é geralmente ali que o progresso destrava. Se quiser conversar um dia, sem compromisso, me avisa 🙌',
     E'Salut [prénom] ! 💪 Je suis [ton prénom], on s''est connus sur [contexte]. J''ai vu que tu t''entraînes dur et je voulais te dire : j''accompagne des athlètes amateurs sur la nutrition et la récup, c''est souvent là que ça débloque. Si tu veux qu''on en parle un jour, fais-moi signe 🙌',
     'WhatsApp PT sport : poser le contexte commun avant tout.', 1),
    ('tr','business','whatsapp',
     E'Selam [isim]! 😊 Ben [adın], [bağlam] üzerinden tanışmıştık. Tekrar düzgün bir şekilde merhaba demek istedim. Wellness alanında ciddi bir girişim projesi yürütüyorum ve ciddi profillerle konuşmak istiyorum. İlgini çekerse, baskısız bir şekilde 15 dakikalık bir görüşme ayarlayabiliriz.',
     E'Salut [prénom] ! 😊 Je suis [ton prénom], on s''est connus via [contexte]. Je voulais reprendre contact comme il faut. Je développe un projet sérieux dans le bien-être avec une dimension entrepreneuriale et je cherche à échanger avec des profils sérieux. Si ça t''intéresse, on cale 15 min sans pression.',
     'WhatsApp TR business : ton respectueux, le "ciddi" (sérieux) rassure.', 1),
    ('tr','sport','whatsapp',
     E'Selam [isim]! 💪 Ben [adın], [bağlam] üzerinden tanışmıştık. Profilinde antrenmanlarına çok yatırım yaptığını gördüm. Amatör sporculara beslenme ve toparlanma konusunda eşlik ediyorum — performans genelde orada açılıyor. Konuşmak istersen, baskı yok, haber ver 🙌',
     E'Salut [prénom] ! 💪 Je suis [ton prénom], on s''est connus via [contexte]. J''ai vu que tu t''investis à fond dans ton entraînement. J''accompagne des sportifs amateurs sur la nutrition et la récup — les perfs se débloquent souvent là. Si tu veux qu''on échange, fais-moi signe 🙌',
     'WhatsApp TR sport : poser le contexte avant la proposition.', 1),
    ('hi','sport','whatsapp',
     E'Hi [name]! 💪 Main [your name], hum [context] pe connect hue the. Aapki training dekh ke laga ki aap kaafi serious ho. Main amateur athletes ke saath nutrition aur recovery pe kaam karta hu — yahi pe usually performance unlock hoti hai. Agar baat karna chaho, bina pressure, batao 🙌',
     E'Salut [prénom] ! 💪 Je suis [ton prénom], on s''est connectés sur [contexte]. J''ai vu que t''es vraiment sérieux dans ton training. J''accompagne des sportifs amateurs sur la nutrition et la récup — c''est souvent là que les perfs se débloquent. Si tu veux qu''on en parle, sans pression, dis-moi 🙌',
     'WhatsApp HI sport : Hinglish naturel (mélange anglais-hindi des DM réels).', 1),
    ('hi','business','whatsapp',
     E'Hi [name]! 😊 Main [your name], hum [context] pe mile the. Properly hi bolne ke liye message kar raha hu. Main wellness me ek serious entrepreneurial project develop kar raha hu aur serious profiles ke saath baat karna chahta hu. Agar interest ho, 15 min ka call kar sakte hai, no pressure.',
     E'Salut [prénom] ! 😊 Je suis [ton prénom], on s''est connus sur [contexte]. Je voulais te dire bonjour comme il faut. Je développe un projet sérieux dans le bien-être avec une dimension entrepreneuriale et je cherche des profils sérieux pour échanger. Si ça t''intéresse, on cale 15 min, sans pression.',
     'WhatsApp HI business : Hinglish posé, "serious" rassure sur le projet.', 1),
    ('fr','weight','sms',
     E'Salut [prénom], c''est [ton prénom]. Je voulais pas te perdre dans les DM Insta donc je passe par SMS. Je suis coach bien-être, on avait échangé sur [contexte]. Si t''as toujours envie qu''on en discute, dis-moi. Sinon pas de souci, belle journée.',
     NULL,
     'SMS FR : court, sans emoji, ton posé. Effet "vraie personne" pas marketing.', 1),
    ('en','weight','sms',
     E'Hi [name], this is [your name]. I didn''t want to lose you in Insta DMs so I''m sending a quick text. I''m a wellness coach, we connected on [context]. If you''re still up for a chat, let me know. Otherwise no worries, have a great day.',
     E'Salut [prénom], c''est [ton prénom]. Je voulais pas te perdre dans les DM Insta donc je passe par SMS. Je suis coach bien-être, on avait échangé sur [contexte]. Si t''as toujours envie qu''on discute, dis-moi. Sinon pas de souci, belle journée.',
     'SMS EN : court, sans emoji, ton posé. Effet "vraie personne".', 1),
    ('fr','sport','whatsapp',
     E'Salut [prénom] ! 💪 Je suis [ton prénom], on s''est connectés via [contexte]. J''ai vu que tu t''investis à fond dans ton sport et je voulais te dire : j''accompagne pas mal de sportifs amateurs sur la nutrition et la récup, c''est souvent là que les perfs se débloquent. Si t''as envie qu''on en parle un jour, fais-moi signe 🙌',
     NULL,
     'WhatsApp FR sport : préciser le contexte de connexion avant de proposer.', 1),
    ('en','sport','whatsapp',
     E'Hey [name]! 💪 I''m [your name], we connected through [context]. Saw you''re really putting in the work training-wise. I coach quite a few amateur athletes on nutrition and recovery — that''s usually where performance unlocks. If you''re up for a chat one day, no pressure, let me know 🙌',
     E'Hey [prénom] ! 💪 Je suis [ton prénom], on s''est connectés via [contexte]. J''ai vu que tu t''entraînes vraiment dur. J''accompagne pas mal de sportifs amateurs sur la nutrition et la récup — c''est souvent là que les perfs se débloquent. Si tu veux qu''on en parle, sans pression, fais-moi signe 🙌',
     'WhatsApp EN sport : context first, puis valeur nutrition/récup.', 1),
    ('fr','business','whatsapp',
     E'Salut [prénom] ! 😊 Je suis [ton prénom], on avait échangé sur [contexte]. Je voulais reprendre contact comme il faut. Je développe un projet sérieux dans le bien-être avec une vraie dimension entrepreneuriale et je cherche à échanger avec des profils sérieux. Si t''es ouvert, on cale 15 min en visio quand tu veux — sans engagement.',
     NULL,
     'WhatsApp FR business : poser le sérieux du projet, rassurer sur le "sans engagement".', 1)
  ) as new_scripts(market_code, profile_slug, platform, body, body_fr, tip, position)
  where not exists (
    select 1 from public.prospection_scripts s
    where s.market_code = new_scripts.market_code
      and s.profile_slug = new_scripts.profile_slug
      and s.platform = new_scripts.platform
      and s.position = new_scripts.position
  );
end$$;

-- ─── Section 4 : enrichissement hashtags (~72 en plus) ─────────
insert into public.prospection_hashtags (market_code, profile_slug, hashtag, position) values
  -- FR weight
  ('fr','weight','#perteDePoidsSaine', 8),('fr','weight','#bienEtreFeminin', 9),
  ('fr','weight','#nutritionConsciente', 10),('fr','weight','#cuisinesaine', 11),
  -- FR sport
  ('fr','sport','#prepaPhysique', 8),('fr','sport','#nutritionSportive', 9),
  ('fr','sport','#recupSportive', 10),('fr','sport','#performanceAmateur', 11),
  -- FR business
  ('fr','business','#entrepreneurBienEtre', 8),('fr','business','#sidehustleFR', 9),
  ('fr','business','#mompreneurFR', 10),('fr','business','#liberteFinanciereFR', 11),
  -- EN weight
  ('en','weight','#healthyweightloss', 8),('en','weight','#mindfuleating', 9),
  ('en','weight','#wellnessjourney2026', 10),('en','weight','#sustainablehealth', 11),
  -- EN sport
  ('en','sport','#athletenutrition', 8),('en','sport','#recoveryday', 9),
  ('en','sport','#amateurathlete', 10),('en','sport','#fuelyourbody', 11),
  -- EN business
  ('en','business','#wellnesspreneur', 8),('en','business','#sidehustlelife', 9),
  ('en','business','#workfromanywhere', 10),('en','business','#mompreneurlife', 11),
  -- ES weight
  ('es','weight','#bienestarintegral', 8),('es','weight','#vidasaludable2026', 9),
  ('es','weight','#nutricionconsciente', 10),('es','weight','#mujersaludable', 11),
  -- ES sport
  ('es','sport','#nutriciondeportiva', 8),('es','sport','#recuperacionmuscular', 9),
  ('es','sport','#atletaamateur', 10),('es','sport','#rendimientodeportivo', 11),
  -- ES business
  ('es','business','#emprendedoradigital', 8),('es','business','#libertadfinanciera', 9),
  ('es','business','#mompreneur', 10),('es','business','#negociowellness', 11),
  -- PT weight
  ('pt','weight','#vidasaudavel2026', 8),('pt','weight','#bemestarfeminino', 9),
  ('pt','weight','#emagrecersaudavel', 10),('pt','weight','#alimentacaoconsciente', 11),
  -- PT sport
  ('pt','sport','#nutricaoesportiva', 8),('pt','sport','#recuperacaomuscular', 9),
  ('pt','sport','#atletaamador', 10),('pt','sport','#performanceesportiva', 11),
  -- PT business
  ('pt','business','#empreendedoradigital', 8),('pt','business','#liberdadefinanceira2026', 9),
  ('pt','business','#maeempreendedora', 10),('pt','business','#negociowellness', 11),
  -- TR weight
  ('tr','weight','#saglikliyasam2026', 8),('tr','weight','#dengelibeslenme', 9),
  ('tr','weight','#kadinsagligi', 10),('tr','weight','#saglikliKilo', 11),
  -- TR sport
  ('tr','sport','#sporbeslenmesi', 8),('tr','sport','#kasGelisimi', 9),
  ('tr','sport','#toparlanma', 10),('tr','sport','#amatorsporcu', 11),
  -- TR business
  ('tr','business','#dijitalGirisimci', 8),('tr','business','#finansalOzgurluk', 9),
  ('tr','business','#evdenisTR', 10),('tr','business','#wellnessGirisim', 11),
  -- HI weight
  ('hi','weight','#healthylifestyleindia2026', 8),('hi','weight','#indianwellness', 9),
  ('hi','weight','#desimomwellness', 10),('hi','weight','#mindfulindia', 11),
  -- HI sport
  ('hi','sport','#indianathlete', 8),('hi','sport','#sportsnutritionindia', 9),
  ('hi','sport','#fitindia2026', 10),('hi','sport','#recoveryindia', 11),
  -- HI business
  ('hi','business','#indianentrepreneur2026', 8),('hi','business','#sidehustleindia2026', 9),
  ('hi','business','#womenentrepreneurindia', 10),('hi','business','#wellnessbusinessindia', 11)
on conflict (market_code, profile_slug, hashtag) do nothing;

commit;
