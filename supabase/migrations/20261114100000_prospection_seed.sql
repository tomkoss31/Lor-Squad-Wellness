-- =============================================================================
-- Chantier #3 — Seed initial du module Prospection cold (2026-05-17)
--
-- Données extraites du mockup `docs/mockups/prospection-internationale.html`
-- (validé Thomas) :
--   - 6 marchés (FR, EN, ES, PT, TR, HI)
--   - 3 profils (weight, sport, business)
--   - 99 hashtags
--   - 31 scripts de premier contact (variables [prénom]/[name] intactes)
--
-- Tous les INSERT sont idempotents (on conflict do nothing pour markets/
-- profiles, ou unique constraint pour hashtags). Si Thomas édite ensuite
-- un script via l'admin, l'édition n'est pas écrasée par re-run.
-- =============================================================================

begin;

-- ─── Markets ────────────────────────────────────────────────────────────────
insert into public.prospection_markets (code, flag, label, description, position) values
  ('fr', '🇫🇷', 'France',              'Origine · 67M',     1),
  ('en', '🇬🇧', 'International',       'EN · 1.5 Md',       2),
  ('es', '🇲🇽', 'LatAm + Espagne',     'ES · 500M',         3),
  ('pt', '🇧🇷', 'Brésil + Portugal',   'PT · 280M',         4),
  ('tr', '🇹🇷', 'Turquie + DE',        'TR · 90M',          5),
  ('hi', '🇮🇳', 'Inde',                'HI/EN · 1.4 Md',    6)
on conflict (code) do update
  set flag = excluded.flag, label = excluded.label,
      description = excluded.description, position = excluded.position,
      updated_at = now();

-- ─── Profiles ───────────────────────────────────────────────────────────────
insert into public.prospection_profiles (slug, emoji, label, description, position) values
  ('weight',   '⚖️',  'Perte de poids', 'Le plus large',    1),
  ('sport',    '🏃',  'Sportif',        'Perf · récup',     2),
  ('business', '💼',  'Business',       'Opportunité',      3)
on conflict (slug) do update
  set emoji = excluded.emoji, label = excluded.label,
      description = excluded.description, position = excluded.position,
      updated_at = now();

-- ─── Hashtags (99 lignes) ───────────────────────────────────────────────────
insert into public.prospection_hashtags (market_code, profile_slug, hashtag, position) values
  -- FR weight
  ('fr','weight','#pertedepoidsfr',1),('fr','weight','#regimefr',2),('fr','weight','#mamanquisebouge',3),
  ('fr','weight','#bienetrefr',4),('fr','weight','#alimentationsaine',5),('fr','weight','#objectifperteepoids',6),
  ('fr','weight','#reequilibragealimentaire',7),
  -- FR sport
  ('fr','sport','#sportfr',1),('fr','sport','#crossfitfrance',2),('fr','sport','#runningfr',3),
  ('fr','sport','#musculationfr',4),('fr','sport','#triathlonfr',5),('fr','sport','#fitfrance',6),
  -- FR business
  ('fr','business','#entrepreneurfr',1),('fr','business','#libertefinanciere',2),('fr','business','#sidehustle',3),
  ('fr','business','#mompreneur',4),('fr','business','#developpementpersonnel',5),('fr','business','#entreprendrefr',6),
  -- EN weight
  ('en','weight','#weightlossjourney',1),('en','weight','#fitmom',2),('en','weight','#healthylifestyle',3),
  ('en','weight','#caloriedeficit',4),('en','weight','#weightlosstransformation',5),('en','weight','#fitover40',6),
  -- EN sport
  ('en','sport','#fitnessmotivation',1),('en','sport','#gymlife',2),('en','sport','#crossfit',3),
  ('en','sport','#trailrunning',4),('en','sport','#endurancesports',5),('en','sport','#sportperformance',6),
  -- EN business
  ('en','business','#entrepreneurmindset',1),('en','business','#sidehustleEN',2),('en','business','#financialfreedom',3),
  ('en','business','#workfromhome',4),('en','business','#mompreneurEN',5),('en','business','#digitalnomad',6),
  -- ES weight
  ('es','weight','#perderpeso',1),('es','weight','#bajardepesomexico',2),('es','weight','#mamasaludable',3),
  ('es','weight','#vidasana',4),('es','weight','#nutricionsaludable',5),('es','weight','#transformacioncorporal',6),
  -- ES sport
  ('es','sport','#fitnessmexico',1),('es','sport','#deportemexico',2),('es','sport','#crossfitmx',3),
  ('es','sport','#runningmexico',4),('es','sport','#entrenamiento',5),
  -- ES business
  ('es','business','#emprendedormexico',1),('es','business','#libertadfinanciera',2),('es','business','#negociodesdacasa',3),
  ('es','business','#mompreneurmx',4),('es','business','#emprenderonline',5),
  -- PT weight
  ('pt','weight','#emagrecer',1),('pt','weight','#perdadepeso',2),('pt','weight','#mamaesaudavel',3),
  ('pt','weight','#vidasaudavelbrasil',4),('pt','weight','#reeducacaoalimentar',5),('pt','weight','#transformacao',6),
  -- PT sport
  ('pt','sport','#crossfitbr',1),('pt','sport','#correrbrasil',2),('pt','sport','#academiabrasil',3),
  ('pt','sport','#fitnessbrasil',4),('pt','sport','#esportebrasil',5),
  -- PT business
  ('pt','business','#empreendedorbrasil',1),('pt','business','#liberdadefinanceira',2),('pt','business','#negociodecasa',3),
  ('pt','business','#empreendedorismo',4),('pt','business','#sidehustlebrasil',5),
  -- TR weight
  ('tr','weight','#kiloverme',1),('tr','weight','#sağlıklıyaşam',2),('tr','weight','#sporyaşam',3),
  ('tr','weight','#fitanne',4),('tr','weight','#beslenme',5),('tr','weight','#diyet',6),
  -- TR sport
  ('tr','sport','#fitnessturkiye',1),('tr','sport','#sporturkiye',2),('tr','sport','#crossfitturkiye',3),('tr','sport','#kosu',4),
  -- TR business
  ('tr','business','#girisimciturkiye',1),('tr','business','#evdenis',2),('tr','business','#finansalozgurluk',3),('tr','business','#kadingirisimci',4),
  -- HI weight
  ('hi','weight','#weightlossindia',1),('hi','weight','#fitmomindia',2),('hi','weight','#healthylifestyleindia',3),
  ('hi','weight','#desifitness',4),('hi','weight','#indianfitness',5),('hi','weight','#weightlossjourneyindia',6),
  -- HI sport
  ('hi','sport','#fitnessindia',1),('hi','sport','#gymindia',2),('hi','sport','#bodybuildingindia',3),
  ('hi','sport','#runnersindia',4),('hi','sport','#crossfitindia',5),
  -- HI business
  ('hi','business','#entrepreneurindia',1),('hi','business','#sidehustleindia',2),('hi','business','#financialfreedomindia',3),
  ('hi','business','#workfromhomeindia',4),('hi','business','#womenentrepreneur',5)
on conflict (market_code, profile_slug, hashtag) do nothing;

-- ─── Scripts (31 lignes, idempotents par re-seed contrôlé) ──────────────────
-- Note : on n'ajoute pas de contrainte UNIQUE forte sur (market,profile,
-- platform,position) car un admin pourra ajouter plusieurs scripts pour
-- la même combinaison plus tard. Le seed initial check sur le count.
-- Si la table est déjà peuplée (count > 0), on saute le seed pour ne pas
-- dupliquer en cas de re-run.
do $$
begin
  if (select count(*) from public.prospection_scripts) = 0 then
    insert into public.prospection_scripts (market_code, profile_slug, platform, body, tip, position) values
      ('fr','weight','insta',
       E'Salut [prénom] ! 👋\nJe suis tombée sur ton profil et tes posts m''ont vraiment parlé. Je vois qu''on partage le côté [healthy / sport / mom-life].\n\nPetite question pour mieux comprendre — tu cherches plutôt à perdre du poids, à gagner en énergie, ou les deux ? 🌿',
       'Personnalise [détail vu sur son profil]. Pas de lien dans le 1er message (filtre spam).', 1),
      ('fr','weight','insta',
       E'Hey [prénom] 🙂\nJe voulais pas te perdre dans le flux — tu te poses peut-être la question sans savoir par où commencer ?\n\nSi tu veux, je peux te partager comment je travaille avec mes coachés. Aucune pression, juste pour échanger.',
       'Ne pas en remettre une couche après J+3 si toujours rien.', 2),
      ('fr','weight','fb',
       E'Bonjour [prénom],\nJ''ai vu ton commentaire / post dans le groupe [nom groupe], et ça m''a vraiment touchée.\n\nJe suis coach nutrition à [ville], j''accompagne des personnes sur la perte de poids durable. Tu cherches quoi en ce moment précisément ?',
       'FB Messenger = ton plus posé que Instagram. Groupes wellness = mine d''or.', 1),
      ('fr','weight','whatsapp',
       E'Coucou [prénom] ! 😊\nC''est [ton prénom], on s''est croisées via [contexte]. Tu m''avais parlé de ton envie de [perdre du poids / te sentir mieux].\n\nJ''ai une approche qui marche bien — tu veux qu''on en discute 15 min ?',
       'WhatsApp = pour ceux qui t''ont déjà donné leur numéro. Plus chaud, plus direct.', 1),
      ('fr','sport','insta',
       E'Hello [prénom] 💪\nTon profil m''a fait sourire (le post sur [détail spécifique], top !). Je travaille avec des sportifs sur la nutrition adaptée — récup, performance, prise de masse.\n\nT''es plutôt sur quelle approche en ce moment côté nutrition ?',
       'Pour les sportifs, parler PERF avant tout. Pas de poids/régime.', 1),
      ('fr','sport','insta',
       E'Hey [prénom] 🙂\nDu coup ta nutrition c''est plutôt feeling ou tu suis un plan structuré ? Curieuse de savoir ce qui marche pour toi.',
       'Relance avec question ouverte, pas de pitch.', 2),
      ('fr','business','insta',
       E'Salut [prénom],\nJ''ai vu que tu t''intéresses à [entrepreneuriat / lifestyle libre / finance perso]. Je développe une activité dans le wellness en parallèle de ma vie pro, ça monte vite.\n\nCurieux de voir ce que ça implique ? Aucun engagement, juste pour échanger 15 min en visio.',
       'Pour le business, dire "à côté de ma vie pro" rassure (pas un MLM 100% à plein temps).', 1),
      ('fr','business','linkedin',
       E'Bonjour [prénom],\nVotre parcours dans [son secteur] m''intéresse. Je développe une activité complémentaire dans le wellness avec une équipe internationale, et je cherche des profils ambitieux pour bâtir en France.\n\nUne discussion 20 min en visio cette semaine vous tente ?',
       'LinkedIn = ton corporate. Vouvoiement, structure claire.', 1),
      ('en','weight','insta',
       E'Hey [name] 👋\nCame across your profile and loved your vibe — looks like we share the same passion for [fitness / healthy living / mom-life].\n\nQuick question to get the feel for what you''re up to — are you more focused on losing weight, boosting energy, or both? 🌿',
       'EN works for US, UK, intl Insta profiles. Keep it casual.', 1),
      ('en','weight','insta',
       E'Hey [name] 🙂\nDidn''t want you to get lost in your DMs — maybe you''re asking yourself the same questions but not sure where to start?\n\nHappy to share how I work with my clients. No pressure, just an open chat.',
       'No salesy tone, pure conversation.', 2),
      ('en','weight','whatsapp',
       E'Hey [name]! 😊\n[Mutual contact] told me about you — said you wanted to start something on the [weight loss / health] side.\n\nI work with people on personalized nutrition. Got 15 mins for a quick chat?',
       'EN WhatsApp = pour les leads tièdes via recommandation. Mentionner le contact mutuel.', 1),
      ('en','sport','insta',
       E'Hey [name] 💪\nYour profile cracked me up (loved the post about [specific detail]!). I work with athletes on nutrition — recovery, performance, gains.\n\nWhat''s your current approach on the nutrition side?',
       'Talk performance, never weight loss.', 1),
      ('en','business','insta',
       E'Hey [name],\nSaw you''re into [entrepreneurship / freedom lifestyle / personal dev]. I''m scaling a wellness side-business and it''s been wild — fun, lifestyle, real income.\n\nCurious to see how it works? Zero pressure, just an open chat.',
       'EN business pitch must be short and confident.', 1),
      ('en','business','linkedin',
       E'Hi [name],\nYour background in [their field] caught my eye. I''m scaling a complementary wellness business with an international team, looking for ambitious profiles.\n\nOpen to a 20-min Zoom call this week?',
       'LinkedIn EN = ton corporate. Structure courte et claire.', 1),
      ('es','weight','insta',
       E'¡Hola [nombre]! 👋\nMe topé con tu perfil y me llamó la atención tu vibe. Trabajo con personas en su transformación — bajar de peso, ganar energía.\n\n¿Estás más enfocada en perder peso, sentirte con más energía, o las dos cosas? 🌿',
       'Mexique, Colombie, Argentine, Espagne. Style proche du français.', 1),
      ('es','weight','whatsapp',
       E'¡Hola [nombre]! 😊\nSoy [tu nombre], nos conocimos por [contexto]. Me hablaste de tus ganas de [bajar de peso / sentirte mejor].\n\nTengo un método que funciona — ¿quieres que platiquemos 15 min?',
       'WhatsApp est ULTRA dominant en LatAm. Privilégie ce canal.', 1),
      ('es','sport','insta',
       E'¡Hola [nombre]! 💪\nTu perfil me hizo sonreír (¡el post sobre [detalle específico] genial!). Trabajo con deportistas en nutrición — recuperación, rendimiento, masa muscular.\n\n¿Cómo manejas tu nutrición ahora?',
       'LatAm sportifs = WhatsApp et Insta. Ton chaleureux.', 1),
      ('es','business','insta',
       E'Hola [nombre],\nVi que te interesa el [emprendimiento / libertad financiera / desarrollo personal]. Estoy desarrollando un negocio en wellness con equipo internacional, está creciendo fuerte.\n\n¿Te late ver de qué se trata? Sin compromiso, solo una plática de 15 min.',
       'En LatAm, "plática" = conversation décontractée.', 1),
      ('es','business','whatsapp',
       E'¡Hola [nombre]! 😊\nSoy [tu nombre], nos conectamos por [contexto]. Te conté que estoy construyendo algo en wellness.\n\n¿Tienes 15 min para que te explique? Sin presión.',
       'Mexique business = WhatsApp obligatoire après 1er contact.', 1),
      ('pt','weight','insta',
       E'Oi [nome]! 👋\nSou [seu nome], vi seu perfil e gostei muito da sua vibe. Trabalho com pessoas na transformação — emagrecimento, energia.\n\nVocê tá mais focada em perder peso, ganhar energia, ou os dois? 🌿',
       'Brésil = top 5 mondial Herbalife. Ton chaleureux obligatoire.', 1),
      ('pt','weight','whatsapp',
       E'Oi [nome]! 😊\nSou [seu nome], a gente se conheceu pelo [contexto]. Você me falou que queria [emagrecer / se sentir melhor].\n\nTenho um método que funciona muito bem — quer bater um papo de 15 min?',
       'Brésil = WhatsApp obligatoire, langage très chaleureux et personnel.', 1),
      ('pt','sport','insta',
       E'Oi [nome]! 💪\nAdorei seu conteúdo de treino! Trabalho com atletas em nutrição — recuperação, performance, ganho de massa.\n\nComo você cuida da nutrição atualmente?',
       'Brésil sport = très visuel. Mentionner contenu spécifique.', 1),
      ('pt','business','insta',
       E'Oi [nome],\nVi que você curte [empreendedorismo / liberdade financeira / desenvolvimento pessoal]. Tô construindo um negócio em wellness com equipe internacional, tá crescendo rápido.\n\nCurte ver como funciona? Sem compromisso, só um papo de 15 min.',
       'Brésil = "papo" = conversation décontractée. Ne pas être trop formel.', 1),
      ('pt','business','whatsapp',
       E'Oi [nome]! 😊\nSou [seu nome], a gente conversou no [contexto]. Você ficou curioso sobre o negócio.\n\nTem 15 min essa semana pra eu te explicar? Sem compromisso.',
       'Brésil ultra-personnel. Toujours "a gente" plutôt que "nós".', 1),
      ('tr','weight','insta',
       E'Selam [isim] 👋\nProfilini gördüm, enerjini sevdim! Beslenme danışmanıyım — kilo verme, enerji, vücut form.\n\nSenin önceliğin daha çok kilo vermek mi, enerjik hissetmek mi, yoksa ikisi de mi? 🌿',
       'Turquie marché chaud Herbalife. Aussi diaspora turque en Allemagne (5M).', 1),
      ('tr','weight','whatsapp',
       E'Selam [isim]! 😊\nBen [adın], [bağlam] üzerinden tanışmıştık. Sen bana [kilo verme / enerji] istediğini söylemiştin.\n\n15 dakika konuşalım mı? Test edilmiş bir metodum var.',
       'Turquie : WhatsApp dominant. Style direct mais chaleureux.', 1),
      ('tr','sport','insta',
       E'Selam [isim] 💪\nProfilin harika ([detay] paylaşımına bayıldım!). Sporcularla çalışıyorum — toparlanma, performans, kas kazanımı.\n\nŞu an beslenme tarafında nasıl bir yaklaşımın var?',
       'Pour Allemagne diaspora turque, idem (turc langue maison).', 1),
      ('tr','business','insta',
       E'Selam [isim],\nProfilini gördüm, [girişimcilik / kişisel gelişim / finansal özgürlük] ile ilgilendiğini fark ettim. Uluslararası bir ekiple wellness sektöründe iş büyütüyorum.\n\nZoom''da 20 dakika sohbet eder misin? Hiçbir baskı yok.',
       'Turquie business : LinkedIn moins utilisé, préférer Insta DM ou WhatsApp.', 1),
      ('hi','weight','insta',
       E'Hi [name] 👋\nMain [your name] hu, aapka profile dekha aur achha laga. Main nutrition consultant hu — weight loss, energy boost mein madad karti hu.\n\nAapka focus weight loss pe hai, energy pe hai, ya dono pe? 🌿',
       'Inde : la classe moyenne aisée écrit en Hinglish (Hindi en Latin) sur Insta/WhatsApp. Évite Devanagari sauf si profil le justifie.', 1),
      ('hi','weight','whatsapp',
       E'Hi [name]! 😊\nMain [your name], hum [context] mein mile the. Aapne mujhe bataya tha ki aap [weight loss / better energy] chahti hain.\n\nMera ek tested method hai — 15 min ki call karenge?',
       'WhatsApp est LE canal numéro 1 en Inde (700M+ users).', 1),
      ('hi','sport','insta',
       E'Hey [name] 💪\nLoved your training content! I help athletes with nutrition — recovery, performance, gains. Specially crafted for desi athletes.\n\nWhat''s your current approach on the food/supplements side?',
       'Athlètes indiens lisent EN. Mentionner "desi" rassure sur la culture.', 1),
      ('hi','business','insta',
       E'Hi [name],\nSaw your profile and your work in [their field] looks great. I''m building a wellness business with an international team — solid income, flexible hours.\n\nOpen to a 15-min Zoom call to see how it works? No commitment.',
       'Inde business : anglais corporate. WhatsApp Business très utilisé.', 1);
  end if;
end$$;

commit;
