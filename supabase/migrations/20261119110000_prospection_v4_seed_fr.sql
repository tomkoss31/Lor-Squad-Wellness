-- =============================================================================
-- Chantier #3 V4 — Seed FR (2026-05-19)
--
-- Marché FR = référence de copy pour les 5 autres marchés. Source : brief
-- "Kit prospection complet" Thomas (10 sections).
--
-- Couvre :
--   - mindset_blocks  : 3 vérités + 5 erreurs
--   - metrics         : funnel 100→1 + pipeline cibles + 3 KPI hebdo
--   - profile_flags   : green/red × 4 profils
--   - sources         : sources alternatives (FB / IRL / reco / inbound) + advice hashtags
--   - hashtags        : catégorisation des existants + nouveaux weight-men + cross hints
--   - scripts M1      : weight-men FR (4 plateformes)
--   - reply_tree      : M2 (positive/vague/negative/question) + M3 (hot/lukewarm) × 4 profils
--   - objections      : 8 objections types
--   - followups       : post-appel J0/J+2/J+5/J+30 + client J0/J+7/J+30 + réactivation J+30
--   - closing         : signaux d'achat + 3 scripts
--   - special_cases   : réactivation 3-6m + ghost + demande recommandation
--   - storytelling    : structure 4 temps + 2 exemples + 4 règles
--   - routines        : routine 30min + routine 1h + checklist 7 items
--
-- Tous les INSERT sont guard-és (count=0) ou idempotents (on conflict do nothing
-- via unique). Re-run safe.
-- =============================================================================

begin;

-- ============================================================================
-- 1. MINDSET BLOCKS
-- ============================================================================
do $$ begin if (select count(*) from public.prospection_mindset_blocks where market_code='fr') = 0 then
  insert into public.prospection_mindset_blocks (market_code, kind, title, body, position) values
    ('fr','truth','Ce n''est pas un jeu de volume aveugle, c''est un jeu de tri.',
     E'Ton travail n''est pas de convaincre. Ton travail est de trouver les bonnes personnes au bon moment. Si tu envoies 100 messages pour convaincre 100 personnes, tu vas épuiser ta motivation en 1 semaine. Si tu envoies 100 messages pour identifier les 5 qui sont prêtes, tu construis un business durable.',
     1),
    ('fr','truth','Plus tu es détendu, plus tu attires.',
     E'Un prospect sent immédiatement si tu transpires le "il faut absolument que je te recrute". Le détachement attire. La pression repousse. Si tu as besoin de cette vente pour payer ton loyer, ça se voit dans tes messages.',
     2),
    ('fr','truth','Le silence n''est pas un rejet personnel.',
     E'80 % de tes messages n''auront pas de réponse. Ça ne veut pas dire que tu es nul. Ça veut dire que les gens sont occupés, que ce n''est pas le bon moment, ou qu''ils ne sont pas la bonne cible. Continue.',
     3),
    ('fr','error','Pitcher dès le M1.',
     E'Tu perds 90 % des prospects en une phrase. Le M1 n''a qu''un objectif : obtenir une réponse. Pas vendre.',
     1),
    ('fr','error','Envoyer le même message à 50 personnes.',
     E'Le copier-coller se sent à 100 m. Personnalise au moins le [détail vu sur son profil]. Si tu n''as pas trouvé un détail précis à mentionner, c''est que ce n''est pas un bon prospect — passe au suivant.',
     2),
    ('fr','error','Relancer J+1, puis J+2, puis J+3.',
     E'Tu passes du coach au harceleur en 48 h. Une seule relance, à J+3, jamais plus.',
     3),
    ('fr','error','Argumenter sur les "non".',
     E'Un "non" bien fermé revient parfois 6 mois plus tard. Un "non" mal géré ne revient jamais.',
     4),
    ('fr','error','Mentir sur la nature du business.',
     E'Si on te demande "c''est un MLM ?", la réponse honnête est oui. Mentir détruit ta crédibilité pour toujours.',
     5);
end if; end$$;

-- ============================================================================
-- 2. METRICS — funnel 100→1 + pipeline cibles + 3 KPI hebdo
-- ============================================================================
do $$ begin if (select count(*) from public.prospection_metrics where market_code='fr') = 0 then
  insert into public.prospection_metrics (market_code, kind, label, value_min, value_max, value_unit, hint, position) values
    -- Funnel réaliste (Section 1)
    ('fr','funnel_step','Messages M1 envoyés',                       100,  100,  'messages',  'Base de calcul pour un débutant',              1),
    ('fr','funnel_step','Réponses reçues',                             15,   25,  'réponses',  'Taux 15-25 % si M1 bien personnalisé',          2),
    ('fr','funnel_step','Conversations qualifiées (M2-M3)',             5,   10,  'convs',     '5 à 10 dialogues vraiment engagés',             3),
    ('fr','funnel_step','Rendez-vous pris',                             1,    3,  'RDV',       'Cible Zoom/visio découverte',                  4),
    ('fr','funnel_step','Nouveaux clients',                             0,    1,  'clients',   'Pour ton premier client : 100-200 M1',         5),
    -- Pipeline cibles (Section 10)
    ('fr','pipeline_target','M1 envoyés en attente de réponse',        50,  100,  'messages',  'À tenir constant en stock',                    1),
    ('fr','pipeline_target','Conversations actives (M2-M3)',            10,   20,  'convs',     'Tu jongles entre celles-là',                   2),
    ('fr','pipeline_target','RDV pris dans les 7 jours',                 2,    5,  'RDV',       'Si moins, augmente le volume M1',              3),
    ('fr','pipeline_target','Clients en cours de closing',                1,    3,  'leads',     'Tes finalistes',                                4),
    -- 3 KPI hebdo
    ('fr','weekly_kpi','Nombre de M1 envoyés',                        null, null, 'count',     'Mesure ton effort. Sous 50/sem = pas assez.',  1),
    ('fr','weekly_kpi','Taux de réponse',                             null, null, 'pct',       'Sous 15 % = revois la qualité de tes M1.',     2),
    ('fr','weekly_kpi','Taux de conversion RDV → client',             null, null, 'pct',       'Sous 20 % = revois ton closing.',              3);
end if; end$$;

-- ============================================================================
-- 3. PROFILE FLAGS — green/red × 4 profils
-- ============================================================================
do $$ begin if (select count(*) from public.prospection_profile_flags where market_code='fr') = 0 then
  -- weight-women
  insert into public.prospection_profile_flags (market_code, profile_slug, flag_type, text, position) values
    ('fr','weight-women','green','Activité récente (post de moins de 2 semaines)', 1),
    ('fr','weight-women','green','Posts personnels avec engagement (commentaires, likes)', 2),
    ('fr','weight-women','green','Bio claire avec une intention (objectif, métier, passion)', 3),
    ('fr','weight-women','green','Pas déjà coach concurrent dans la même niche', 4),
    ('fr','weight-women','red','Profil privé sans contexte', 1),
    ('fr','weight-women','red','Compte 100 % business / shop / affiliations', 2),
    ('fr','weight-women','red','Aucun post depuis 6+ mois', 3),
    ('fr','weight-women','red','Compte avec des milliers d''abonnés mais peu d''engagement (faux comptes)', 4),
    -- weight-men
    ('fr','weight-men','green','Activité récente (post de moins de 2 semaines)', 1),
    ('fr','weight-men','green','Posts sport, performance, énergie, vie pro intense', 2),
    ('fr','weight-men','green','Bio mentionne un objectif (remise en forme, perte de gras, prise de masse)', 3),
    ('fr','weight-men','green','Pas déjà coach concurrent dans la même niche', 4),
    ('fr','weight-men','red','Profil privé sans contexte', 1),
    ('fr','weight-men','red','Bio centrée sur l''apparence pure (modèle, shoot photo)', 2),
    ('fr','weight-men','red','Aucun post depuis 6+ mois', 3),
    ('fr','weight-men','red','Compte gym influenceur saturé de coachs concurrents', 4),
    -- sport
    ('fr','sport','green','Active sur sa pratique (post sortie, course, séance < 2 sem)', 1),
    ('fr','sport','green','Mentionne objectifs précis (race, perf, PR)', 2),
    ('fr','sport','green','Engagement réel (commentaires sportifs, pas vide)', 3),
    ('fr','sport','green','Pas sponsorisé / pas déjà coaché par concurrent', 4),
    ('fr','sport','red','Compte pro-athlète avec sponsors visibles', 1),
    ('fr','sport','red','Aucun post depuis 6+ mois', 2),
    ('fr','sport','red','Profil "shopping fitness" sans pratique réelle', 3),
    ('fr','sport','red','Bio déjà "coach nutrition sport" concurrent', 4),
    -- business
    ('fr','business','green','Activité récente, posts personnels (parcours, journée)', 1),
    ('fr','business','green','Bio claire avec métier ou statut entrepreneur', 2),
    ('fr','business','green','Engagement vrai (commentaires construits, pas emoji)', 3),
    ('fr','business','green','Pas déjà top distri MLM concurrent', 4),
    ('fr','business','red','Bio = uniquement lien d''affiliation MLM concurrent', 1),
    ('fr','business','red','Compte millier abonnés / zéro engagement (faux compte)', 2),
    ('fr','business','red','Aucune photo / aucun post personnel', 3),
    ('fr','business','red','Stories saturées de pitches business (déjà cramé par d''autres)', 4);
end if; end$$;

-- ============================================================================
-- 4. SOURCES — alternatives aux hashtags
-- ============================================================================
do $$ begin if (select count(*) from public.prospection_sources where market_code='fr') = 0 then
  -- Transverse (profile_slug NULL) : ratio Insta + scan profil
  insert into public.prospection_sources (market_code, profile_slug, kind, label, detail, position) values
    ('fr', null, 'hashtag_advanced',
     'Ratio idéal de tes posts Insta',
     E'60 % valeur (conseils, éducation, tips concrets) · 30 % personnel (parcours, journée, famille, échecs) · 10 % appel à l''action (témoignages, "DM-moi si…").\nErreur classique : poster uniquement des photos de produits ou résultats clients. Personne ne te suit pour ça. Les gens te suivent pour TOI.',
     1),
    ('fr', null, 'hashtag_advanced',
     'Méthode scan profil 30 secondes',
     E'Avant d''envoyer un M1, vérifie 4 points : (1) activité récente — post < 2 semaines · (2) engagement réel — commentaires authentiques · (3) bio avec intention claire · (4) pas déjà coaché par un concurrent.',
     2),
    -- weight-women : groupes FB + IRL + reco + inbound
    ('fr','weight-women','fb_groups','Groupes Facebook locaux wellness',
     'Cherche : "perte de poids [ville]", "maman healthy", "réequilibrage alimentaire". Réponds avec valeur AVANT de DM en privé.', 1),
    ('fr','weight-women','irl','Sortie de crèches, écoles maternelles',
     'Mamans 30-45 ans, créneau 8h30/16h30, ton naturel et bienveillant. Pas de pitch direct, juste créer du lien.', 1),
    ('fr','weight-women','irl','Salles de sport (cours collectifs)',
     'Pilates, yoga, body pump. Évite les sections muscu pure (cible autre).', 2),
    ('fr','weight-women','irl','Marchés bio, magasins healthy',
     'Personnes déjà sensibilisées à l''alimentation. Engager sur un produit qu''elles achètent.', 3),
    ('fr','weight-women','recommendations','Réseau personnel + clientes actuelles',
     'Tes meilleures sources de prospects qualifiés. Cf. section "Demande de recommandation" §8.', 1),
    ('fr','weight-women','inbound_content','Contenu Insta/TikTok perte de poids',
     'Témoignages clientes, "ce que j''aurais aimé savoir", recettes équilibrées. Les leads entrants sont 3× plus chauds.', 1),
    -- weight-men
    ('fr','weight-men','fb_groups','Groupes Facebook "remise en forme homme [ville]"',
     'Posts sur prise de masse, perte de gras, énergie au boulot. Engage avec valeur avant DM.', 1),
    ('fr','weight-men','irl','Salles de muscu, CrossFit, clubs sport collectif',
     'Foot, basket, padel. Créneau 7h-9h ou 19h-21h. Ton naturel et direct.', 1),
    ('fr','weight-men','irl','Événements pro, afterworks, coworkings',
     'Hommes 30-50 ans actifs pro qui veulent ne pas que le corps lâche.', 2),
    ('fr','weight-men','recommendations','Réseau pro + clients hommes existants',
     'Recommandation = canal #1 sur cette cible (cercle masculin plus fermé).', 1),
    ('fr','weight-men','inbound_content','Contenu performance / récup / énergie au boulot',
     'Évite les "perte de poids douce" → cible femmes. Parle perf, sommeil, prise de masse.', 1),
    -- sport
    ('fr','sport','fb_groups','Groupes course à pied / triathlon / CrossFit locaux',
     'Cherche posts "comment vous gérez la nutrition d''une sortie longue ?". Apporte de la valeur.', 1),
    ('fr','sport','irl','Box CrossFit, clubs running, triathlon, escalade',
     'Présence physique = crédibilité instantanée. Échange après une séance.', 1),
    ('fr','sport','irl','Courses populaires (départ + arrivée)',
     'Marathon, semi, trail. Les coureurs sont accessibles avant/après l''effort.', 2),
    ('fr','sport','recommendations','Coachs prépa physique, kinés, médecins du sport',
     'Partenariats croisés possibles. Win-win client.', 1),
    ('fr','sport','inbound_content','Contenu nutrition pré/per/post-effort, récup',
     'Strava clubs, comptes coachs prépa physique. Sportifs amateurs y traînent.', 1),
    -- business
    ('fr','business','fb_groups','Groupes "side hustle", "entrepreneur [ville]"',
     'Modération moins agressive qu''Insta. Apporte valeur business avant pitch.', 1),
    ('fr','business','irl','BNI, French Tech, espaces coworking',
     'Réseautage entrepreneurial. Pas le délire MLM, ton pair.', 1),
    ('fr','business','irl','Conférences entrepreneuriat (Marseille, Lyon, Bordeaux)',
     'Profils ambitieux, ouverts aux opportunités.', 2),
    ('fr','business','recommendations','Réseau pro existant, anciens collègues',
     'Le bouche-à-oreille reste le canal le plus crédible pour le business.', 1),
    ('fr','business','inbound_content','Contenu mindset, indépendance, parcours perso',
     'Évite "deviens riche", privilégie "voilà mon parcours". Storytelling §9.', 1);
end if; end$$;

-- ============================================================================
-- 5. HASHTAGS — catégorisation existants FR + nouveaux weight-men + cross hints
-- ============================================================================

-- 5a. Catégorisation des hashtags FR existants (weight-women, sport, business)
update public.prospection_hashtags set category = 'mainstream', crossover_hint = null
  where market_code = 'fr' and hashtag in (
    '#pertedepoidsfr','#regimefr','#bienetrefr','#alimentationsaine','#reequilibragealimentaire',
    '#sportfr','#runningfr','#musculationfr','#fitfrance',
    '#entrepreneurfr','#libertefinanciere','#sidehustle','#developpementpersonnel','#entreprendrefr'
  );

update public.prospection_hashtags set category = 'niche', crossover_hint = null
  where market_code = 'fr' and hashtag in (
    '#mamanquisebouge','#objectifperteepoids','#perteDePoidsSaine','#bienEtreFeminin','#nutritionConsciente','#cuisinesaine',
    '#crossfitfrance','#triathlonfr','#prepaPhysique','#nutritionSportive','#recupSportive','#performanceAmateur',
    '#mompreneur','#entrepreneurBienEtre','#sidehustleFR','#mompreneurFR','#liberteFinanciereFR'
  );

-- Hashtags "cross" = à croiser avec un second pour atteindre la niche.
update public.prospection_hashtags set
  category = 'cross',
  crossover_hint = 'À croiser avec #mamanquisebouge ou #sansgluten pour cibler maman healthy.'
  where market_code = 'fr' and profile_slug = 'weight-women' and hashtag = '#pertedepoidsfr';

update public.prospection_hashtags set
  category = 'cross',
  crossover_hint = 'À croiser avec un hashtag ville (#paris #lyon #marseille) pour cibler local.'
  where market_code = 'fr' and profile_slug = 'sport' and hashtag = '#runningfr';

update public.prospection_hashtags set
  category = 'cross',
  crossover_hint = 'À croiser avec un hashtag thématique (sport, parentalité, métier) pour sortir du bruit MLM saturé.'
  where market_code = 'fr' and profile_slug = 'business' and hashtag = '#sidehustle';

-- 5b. Hashtags FR pour weight-men (nouveaux)
insert into public.prospection_hashtags (market_code, profile_slug, hashtag, category, crossover_hint, position) values
  ('fr','weight-men','#remiseenforme','mainstream',null,1),
  ('fr','weight-men','#prisedemasse','mainstream',null,2),
  ('fr','weight-men','#perdredupoidshomme','mainstream',null,3),
  ('fr','weight-men','#dadbod','niche',null,4),
  ('fr','weight-men','#papasportif','niche',null,5),
  ('fr','weight-men','#fitness40','niche',null,6),
  ('fr','weight-men','#objectifsete','niche',null,7),
  ('fr','weight-men','#remiseenforme40','niche',null,8),
  ('fr','weight-men','#hommeenforme','cross','À croiser avec un hashtag boulot/dad (#papaentrepreneur, #cadresupérieur) pour la cible 30-50 ans active pro.',9),
  ('fr','weight-men','#perdredupoidshomme','cross','À croiser avec #nutrition ou #musculation pour cibler le coté technique perf.',10)
on conflict (market_code, profile_slug, hashtag) do nothing;

-- ============================================================================
-- 6. SCRIPTS M1 — weight-men FR (4 plateformes)
-- ============================================================================
do $$ begin if (select count(*) from public.prospection_scripts where market_code='fr' and profile_slug='weight-men') = 0 then
  insert into public.prospection_scripts (market_code, profile_slug, platform, body, tip, position, kind, label, language_label) values
    ('fr','weight-men','insta',
     E'Salut [prénom],\n\nJ''ai vu ton post sur [détail vu sur son profil]. Je bosse avec des hommes sur la nutrition et la remise en forme — surtout sur la perte de gras, l''énergie et la récup quand on combine boulot intense et sport.\n\nCurieux de savoir : tu es plus sur un objectif perte de gras, prise de masse propre, ou juste retrouver de l''énergie au quotidien ?',
     'Vocabulaire perf/énergie/récup. ZÉRO "bien-être" ou "douceur" → ça les éjecte direct.',
     1, 'first_contact', 'Instagram DM · Premier contact', '🇫🇷 Français'),
    ('fr','weight-men','fb',
     E'Bonjour [prénom],\n\nVu ton post dans [nom du groupe] sur [détail]. Je suis coach nutrition à [ville], je bosse pas mal avec des hommes 30-50 ans sur la remise en forme — surtout ceux qui ont un boulot prenant et qui veulent pas que le corps lâche.\n\nTu en es où toi ? Tu cherches un truc précis ou tu testes des trucs au feeling ?',
     'FB Messenger = ton plus posé qu''Insta. Groupes "remise en forme homme" = mine d''or.',
     1, 'first_contact', 'Facebook Messenger · Premier contact', '🇫🇷 Français'),
    ('fr','weight-men','whatsapp',
     E'Salut [prénom],\n\nC''est [ton prénom], on s''est croisés via [contexte]. Tu m''avais parlé de [détail — perte de poids / énergie / sport]. Tu en es où ?',
     'WhatsApp = lead chaud déjà rencontré. Direct mais pas agressif.',
     1, 'first_contact', 'WhatsApp · Contact direct', '🇫🇷 Français'),
    ('fr','weight-men','sms',
     E'Salut [prénom], c''est [ton prénom]. On avait parlé de [contexte]. Si tu es toujours sur l''idée de [objectif], dis-moi, on peut en discuter cette semaine.',
     'SMS = court, sans emoji, ton viril posé. Effet "vraie personne".',
     1, 'first_contact', 'SMS · Court & posé', '🇫🇷 Français');
end if; end$$;

-- ============================================================================
-- 7. REPLY TREE — M2 (4 branches) + M3 (2 branches) × 4 profils
-- ============================================================================
do $$ begin if (select count(*) from public.prospection_reply_tree where market_code='fr') = 0 then
  -- ── weight-women ──────────────────────────────────────────────────────────
  insert into public.prospection_reply_tree (market_code, profile_slug, level, branch, body, tip, position) values
    ('fr','weight-women','M2','positive',
     E'Top que tu me dises, [prénom] 🙏\n\nPour mieux te répondre — c''est un objectif que tu as depuis longtemps ou c''est venu récemment ? Et tu as déjà testé des choses qui n''ont pas marché ?\n\nJe te pose ces questions parce que selon où tu en es, je peux te partager des trucs concrets, ou pas du tout. Ça dépend vraiment de toi.',
     'On creuse, on qualifie. Pas de pitch tant qu''elle n''a pas raconté son histoire.',1),
    ('fr','weight-women','M2','vague',
     E'Je te comprends, [prénom]. C''est souvent comme ça — on sent qu''on veut changer quelque chose, sans savoir quoi exactement.\n\nAutre angle : qu''est-ce qui te dérange le plus aujourd''hui ? Le chiffre sur la balance, comment tu te sens dans tes vêtements, ton énergie, ton rapport à la nourriture ? Il y a souvent un point qui revient.',
     'Une question fermée qui ouvre. Le "point qui revient" la fait choisir.',1),
    ('fr','weight-women','M2','negative',
     E'Pas de souci [prénom], merci d''avoir pris le temps de répondre 🙏\n\nBelle continuation. Si un jour ça change, reviens vers moi sans hésiter. Sinon, profite bien !',
     'Fermeture propre. Pas d''argumentation, pas d''insistance.',1),
    ('fr','weight-women','M2','question',
     E'Bonne question.\n\nEn gros, j''accompagne en nutrition — pas de régime restrictif. On travaille sur l''équilibre alimentaire, l''énergie et les habitudes qui tiennent dans le temps. Je bosse avec des produits naturels en complément quand c''est pertinent.\n\nMais avant de t''en dire plus, dis-moi où tu en es. C''est ça qui va déterminer si ce que je fais peut t''aider.',
     'Réponds court, puis recentre sur SA situation.',1),
    ('fr','weight-women','M3','hot',
     E'Merci [prénom] de me partager tout ça, c''est précieux 🙏\n\nCe que tu décris, je le vois souvent. La bonne nouvelle, c''est que c''est gérable avec la bonne approche.\n\nJe préfère pas tout balancer par écrit. On prend 15-20 min en visio cette semaine ? Je te montre concrètement comment je travaille, et toi tu vois si ça te parle. Zéro engagement.\n\nTu préfères [jour 1] ou [jour 2] ?',
     'Closing visio avec choix entre 2 dates = beaucoup plus de RDV qu''un "tu es dispo quand ?".',1),
    ('fr','weight-women','M3','lukewarm',
     E'Pas de souci [prénom], je veux pas te forcer la main.\n\nJe te laisse mon contact. Si à un moment ça résonne pour toi, tu me fais signe. Et si tu veux un truc concret à tester d''ici là, dis-moi, je te partage volontiers.',
     'Tu lâches sans fermer. Offre un échantillon de valeur pour garder la porte ouverte.',1),
    -- ── weight-men ────────────────────────────────────────────────────────────
    ('fr','weight-men','M2','positive',
     E'Top que tu sois cash, [prénom] 💪\n\nDis-m''en plus : tu fais combien de séances par semaine, et c''est quoi qui te bloque actuellement ? Récup, énergie en fin de journée, prise de gras malgré l''entraînement, sommeil ?\n\nSelon où ça coince, je te dis pas la même chose.',
     'Vocabulaire perf + bloquant concret. Le mec se livre quand on parle "blocages" précis.',1),
    ('fr','weight-men','M2','vague',
     E'OK [prénom], je te comprends.\n\nQuestion plus directe : tu arrives à enchaîner les semaines sans baisse d''énergie, ou il y a des moments où tu sens que tu tires sur la corde ?\n\nLa plupart des mecs que je croise se gèrent "bien"… jusqu''à toucher un mur (fatigue, prise de gras, blessure). Si t''es dans le 1er cas, tant mieux. Sinon, on peut creuser.',
     'Pas de "douceur". Une phrase qui pique légèrement = il répond.',1),
    ('fr','weight-men','M2','negative',
     E'Pas de souci [prénom], je voulais te poser la question, pas te forcer la main 🙏\n\nBonne continuation sur tes entraînements. Si la nutrition devient un sujet un jour, reviens vers moi.',
     'Fermeture propre, virile. Pas de "belle journée" mielleux.',1),
    ('fr','weight-men','M2','question',
     E'Bonne question.\n\nConcrètement, j''accompagne des hommes sur la nutrition — perf, récup, prise de masse propre ou perte de gras selon l''objectif. Je bosse avec des protéines, des produits ciblés (créatine, BCAA) en complément d''une alim solide.\n\nAvant de t''en dire plus — dis-moi ce qui te bloque ou ce que tu cherches à améliorer. Ça orientera ma réponse.',
     'Précis et technique, vocabulaire qu''il comprend.',1),
    ('fr','weight-men','M3','hot',
     E'Ce que tu décris est classique, [prénom], et il y a moyen de débloquer là-dessus.\n\nPlutôt qu''un pavé par écrit — on prend 20 min en visio ? Je te montre comment j''analyse une alim sportive masculine, tu vois si ça te parle. Zéro engagement, je te vends rien d''office.\n\nTu préfères [jour 1] ou [jour 2] ?',
     'Visio courte, pas d''engagement. Le mec adhère sur "20 min" pas sur "1h".',1),
    ('fr','weight-men','M3','lukewarm',
     E'Pas de souci [prénom], je te laisse digérer.\n\nSi tu veux que je te partage 2-3 trucs concrets sur [son point bloquant] sans passer par un appel, dis-moi, je t''envoie. Sinon, bonne suite, et on se recroise quand tu veux.',
     'Offre concrète (3 tips) garde le lead chaud. Pas de "à la prochaine" mou.',1),
    -- ── sport ─────────────────────────────────────────────────────────────────
    ('fr','sport','M2','positive',
     E'Top [prénom] 💪\n\nDis-m''en plus : quel volume hebdo tu fais actuellement, et c''est quoi le truc qui te gêne le plus ? Récup entre séances, énergie en fin de sortie longue, problèmes digestifs en course, sommeil, autre chose ?\n\nJe te demande pas pour rien — selon le point bloquant, je vais pas te dire la même chose.',
     'Le sportif aime être traité en sportif. Volume + point bloquant = il se livre.',1),
    ('fr','sport','M2','vague',
     E'Cool si ça roule, [prénom].\n\nJuste par curiosité : tu arrives à enchaîner les semaines sans baisse, ou il y a des moments où tu sens que tu tires sur la corde ? La plupart des sportifs que je croise se gèrent "bien"... jusqu''à toucher un mur.\n\nSi jamais ça arrive ou si tu veux optimiser, je suis là.',
     'Le "mur" est universel chez les sportifs amateurs. Ça résonne.',1),
    ('fr','sport','M2','negative',
     E'Pas de souci [prénom], je voulais te poser la question, pas te forcer la main 🙏\n\nBonne continuation sur tes entraînements. Si la nutrition devient un sujet un jour, reviens vers moi.',
     'Fermeture propre, ton sportif.',1),
    ('fr','sport','M2','question',
     E'Bonne question.\n\nConcrètement, j''accompagne des sportifs sur la nutrition : avant / pendant / après l''effort, récup entre séances, gestion de l''énergie sur les longues distances. Je bosse avec des produits ciblés (protéines, électrolytes, vitamines) en complément d''une alim solide.\n\nAvant de t''en dire plus — dis-moi ce qui te bloque ou ce que tu cherches à améliorer. Ça orientera ma réponse.',
     'Technique sport, pas "perte de poids".',1),
    ('fr','sport','M3','hot',
     E'Ce que tu décris est classique, [prénom], et il y a moyen de pas mal débloquer là-dessus.\n\nPlutôt qu''un pavé par écrit — on prend 20 min en visio ? Je te montre comment j''analyse une alim sportive, tu vois si ça te parle. Zéro engagement, je te vends rien d''office.\n\nTu préfères [jour 1] ou [jour 2] ?',
     'Visio 20 min, choix de date. Le sportif adhère au format court.',1),
    ('fr','sport','M3','lukewarm',
     E'Pas de souci [prénom], je te laisse digérer.\n\nSi tu veux que je te partage 2-3 trucs concrets sur [son point bloquant] sans passer par un appel, dis-moi, je t''envoie. Sinon, bonne suite, et on se recroise quand tu veux.',
     'Tips concrets = il revient plus facilement.',1),
    -- ── business ──────────────────────────────────────────────────────────────
    ('fr','business','M2','positive',
     E'Cool [prénom], merci d''être ouvert/e à en parler 🙏\n\nPour faire simple : on est sur du wellness (nutrition, bien-être). Je travaille avec une équipe internationale. Le modèle me permet de construire un revenu en parallèle de [ton activité].\n\nAvant de t''expliquer en détail — qu''est-ce qui te motive à explorer ça en ce moment ? Tu as un objectif précis (revenu complémentaire, indépendance, reconversion), ou c''est plutôt de la curiosité ?',
     'Cadre clair + question qualifiante. Tu mesures la motivation avant d''investir du temps.',1),
    ('fr','business','M2','vague',
     E'Question légitime [prénom].\n\nJe vais être franc/he : c''est un modèle où tu développes une activité en distribution de produits wellness, avec une équipe qui te forme. Il y a un investissement de départ, et ça se développe selon le temps que tu y mets.\n\nTu vois le tableau ? Si c''est pas ton truc, tu peux me le dire direct — je préfère un "non" clair qu''un faux "oui". Si c''est encore une option, on peut en parler plus précisément.',
     'Transparence radicale = crédibilité. Le "non clair" est plus précieux qu''un faux "oui".',1),
    ('fr','business','M2','negative',
     E'Pas de souci [prénom], merci d''avoir répondu franchement 🙏\n\nJ''avais bien tagué dans ma tête que c''était peut-être pas ton truc, c''est totalement OK. Bonne continuation, et si un jour la conversation a du sens, elle se fera naturellement.',
     'Fermeture chaleureuse mais nette. Le prospect revient parfois 6 mois plus tard.',1),
    ('fr','business','M2','question',
     E'Tu vas droit au but, j''aime ça [prénom].\n\nJe travaille avec [nom de l''entreprise] sur la partie nutrition / wellness. L''entreprise existe depuis [X années] et est présente dans [Y pays].\n\nMais le produit, c''est qu''une moitié du sujet. L''autre moitié, c''est le modèle de distribution. C''est plus simple à expliquer en visio si tu es ouvert/e. Si tu as déjà une opinion arrêtée sur ce type de modèle, dis-moi — on perdra pas de temps ni l''un ni l''autre.',
     'Transparence + filtre. Pas de tour autour du pot.',1),
    ('fr','business','M3','hot',
     E'Ce que tu me dis est exactement ce que je voulais entendre, [prénom] — tu as l''air vraiment au clair sur ce que tu cherches.\n\nPour aller plus loin, on prend 30 min en visio ? Je te présente le modèle proprement : l''entreprise, les produits, la rémunération, et ce que ça demande comme temps et investissement. Tu poses toutes tes questions. Après, on voit ensemble.\n\nPas de pitch déguisé, pas de fausse urgence. Juste de l''info concrète. Tu préfères [jour 1] ou [jour 2] ?',
     'Visio 30 min (pas 1h, pas 15 min). Format business sérieux.',1),
    ('fr','business','M3','lukewarm',
     E'Je sens que c''est pas le bon timing, [prénom], pas de souci.\n\nJe te laisse mon contact. Si à un moment tu te dis "tiens je vais creuser cette histoire", reviens vers moi. Si c''est jamais le cas, no problem.',
     'Posé, pas d''insistance. Le business prospect revient 6-12 mois plus tard quand son contexte change.',1);
end if; end$$;

-- ============================================================================
-- 8. OBJECTIONS — 8 types
-- ============================================================================
insert into public.prospection_objections (market_code, slug, title, meaning, bad_response, good_response, warning, position) values
  ('fr','cest-cher','C''est cher',
   'Soit elle ne voit pas la valeur, soit elle ne peut pas / ne veut pas mettre cette somme là-dessus.',
   'Minimiser ("c''est le prix d''un café par jour"), ou rajouter une remise dès la première objection.',
   E'Je comprends [prénom]. Cher par rapport à quoi ? Et qu''est-ce qui ferait que ça vaut le coup à tes yeux ?\n\nJe te demande pas pour te convaincre — c''est juste que selon ta réponse, soit c''est pas le bon moment, soit on peut voir si y''a une formule plus adaptée.',
   null, 1),
  ('fr','pas-le-temps','J''ai pas le temps',
   'Soit pas de priorité, soit elle a peur que ça lui prenne plus de temps qu''elle n''a.',
   E'"Mais c''est rapide !" — réponse paresseuse qui ne traite pas l''objection.',
   E'C''est juste, et c''est souvent parce qu''on prend pas le temps que les choses bougent pas.\n\nSi je te dis "on attend 3 mois et tu me redis", c''est ouvert ou c''est un non ferme ? Pas de mauvaise réponse, je veux juste savoir où on en est.',
   null, 2),
  ('fr','herbalife-mlm','C''est de l''Herbalife / MLM / un système pyramidal ?',
   'Elle a peur de se faire avoir, ou elle a un mauvais souvenir (proche déçu).',
   'Nier, dire "non c''est différent", esquiver.',
   E'Oui c''est [marque], et oui c''est une distribution multi-niveaux. Pas un système pyramidal au sens illégal du terme — la différence c''est qu''il y a un vrai produit consommé par des clients finaux.\n\nIl y a des choses vraies et des choses fausses qui circulent sur ce type de modèle. Si tu me dis ce qui te bloque précisément, je te réponds franchement.',
   'Mentir détruit ta crédibilité pour toujours. La transparence est la seule réponse.', 3),
  ('fr','deja-essaye','J''ai déjà essayé X et ça n''a pas marché',
   'Elle est déçue, méfiante, et veut être rassurée que ce ne sera pas la même chose.',
   E'"Ah mais c''est pas pareil !" — sans expliquer pourquoi.',
   E'Je t''entends [prénom]. Qu''est-ce qui s''est passé concrètement ? Parce que selon où ça a coincé — motivation, méthode, accompagnement, produit — je peux te dire si tu vas retomber dans le même piège ou pas. Pas de promesse magique, juste de l''honnêteté.',
   null, 4),
  ('fr','en-parler-conjoint','Je dois en parler à mon mari / ma femme',
   'Soit décision de couple légitime, soit excuse pour fuir poliment.',
   E'"Mais c''est ta décision !" (paternaliste), ou "Tu n''as pas besoin de son accord !"',
   E'Bien sûr, c''est sain d''en parler. Tu veux que je te prépare un résumé clair à lui montrer, ou tu préfères lui expliquer toi-même ? Et concrètement, on se redit quoi quand ?',
   'Demander "on se redit quoi quand" oblige à fixer une date. Sans date, "je dois en parler à X" = 90 % de non.', 5),
  ('fr','je-reflechis','Je vais réfléchir',
   '90 % du temps = "non" poli. 10 % = vraiment besoin de réfléchir.',
   E'"Prends ton temps !" → tu la perds définitivement.',
   E'OK [prénom] — c''est plutôt un "oui mais j''ai besoin de digérer", ou un "non mais je veux pas te le dire en face" ?\n\nLes deux sont OK pour moi, je préfère savoir. Si c''est un non, on s''épargne du temps tous les deux. Si c''est un oui qui mûrit, on cale une date pour se redire ça.',
   null, 6),
  ('fr','trop-beau','C''est trop beau pour être vrai',
   'Méfiance saine. Bon signe en réalité.',
   'Surenchérir sur les promesses pour rassurer (effet inverse).',
   E'Tu as raison de te méfier. C''est pas magique. Il y a du travail derrière, ça marche pas pour tout le monde, et les résultats dépendent vraiment de toi.\n\nSi tu veux je te raconte aussi les côtés moins glamour : ce que ça demande, où les gens lâchent, pourquoi certains échouent. Plus utile que les belles histoires.',
   null, 7),
  ('fr','combien-tu-gagnes','Combien tu gagnes toi ?',
   'Elle veut une preuve concrète, pas un baratin.',
   'Sortir des chiffres mirobolants, ou esquiver.',
   E'Je te dis honnêtement : je suis sur [X €/mois] en [Y mois/années] d''activité. Pour être transparent/e, mes premiers mois c''était [Z €]. C''est progressif et ça dépend du temps que tu y mets et de qui tu t''entoures.\n\nSi tu veux je te montre les chiffres officiels de l''entreprise (revenus moyens des distributeurs, c''est public et obligatoire).',
   'N''invente JAMAIS de chiffres. Les revenus moyens des MLM sont publics et obligatoirement publiés. Mentir là-dessus est une faute professionnelle.', 8),
  ('fr','ton-interet','Mais toi tu vas gagner si je m''inscris',
   'Elle veut être sûre que tu lui parles pour son bien, pas seulement pour ta commission.',
   'Nier ou minimiser ton intérêt — perçu comme malhonnête.',
   E'Oui c''est vrai, et autant être clair là-dessus. Je gagne quand quelqu''un que j''ai parrainé fait du chiffre — donc en réalité, j''ai zéro intérêt à parrainer quelqu''un qui ne va pas le faire. C''est plus du boulot pour rien.\n\nMon intérêt c''est de bosser avec des gens qui sont vraiment alignés. Si c''est pas toi, c''est pas grave, on perd notre temps tous les deux.',
   null, 9)
on conflict (market_code, slug) do nothing;

-- ============================================================================
-- 9. FOLLOWUPS — post-appel + suivi client + réactivation
-- ============================================================================
do $$ begin if (select count(*) from public.prospection_followups where market_code='fr') = 0 then
  insert into public.prospection_followups (market_code, kind, day_offset, title, body, warning, position) values
    -- Post-appel
    ('fr','post_call', 0, 'J0 — Juste après l''appel (dans l''heure)',
     E'Merci [prénom] pour cet échange ! Comme convenu, je te laisse digérer.\n\nPetit récap de ce qu''on s''est dit :\n1. [point clé 1]\n2. [point clé 2]\n3. [point clé 3]\n\nSi tu as des questions d''ici demain, écris-moi. Bonne soirée 🙏',
     null, 1),
    ('fr','post_call', 2, 'J+2 — Premier check',
     E'Hey [prénom], j''espère que tu vas bien ! Tu as eu le temps de poser tes questions ou de réfléchir ?\n\nDis-moi où tu en es, même si c''est un non — c''est plus utile pour moi qu''un silence.',
     null, 2),
    ('fr','post_call', 5, 'J+5 — Dernier message (maximum)',
     E'Salut [prénom], dernier message de ma part pour pas te poursuivre 🙏\n\nSi tu es toujours pas sûr/e, ou si tu préfères qu''on en reparle plus tard, dis-le moi. Sinon je laisse de côté et on se recroisera quand tu seras prêt/e.',
     'Si pas de réponse au J+5, tu ARRÊTES. Tu ne relances plus.', 3),
    ('fr','post_call', 30, 'J+30 — Réactivation (un mois après)',
     E'Hey [prénom], ça fait un mois, je voulais juste prendre des nouvelles 😊\n\nTu en es où sur [son objectif] ? Pas de pitch derrière, juste curieux/curieuse.',
     null, 4),
    -- Suivi client
    ('fr','client_onboarding', 0, 'J0 — Jour de l''achat',
     E'Coucou [prénom] ! Bienvenue dans l''aventure 💪 Je t''envoie tout pour le démarrage. On se cale un appel [jour] pour voir comment tu prends en main les produits, ça te va ?',
     null, 1),
    ('fr','client_onboarding', 7, 'J+7 — Première semaine',
     E'Hey [prénom], première semaine passée ! Comment ça se passe ? Tu as réussi à intégrer [habitude principale] ? Dis-moi ce qui marche et ce qui coince.',
     null, 2),
    ('fr','client_onboarding', 30, 'J+30 — Premier mois',
     E'Coucou [prénom], déjà un mois 🎉 On fait un bilan ? Je veux qu''on regarde ensemble ce qui a bougé et ce qu''on ajuste pour le mois 2. Tu préfères quand cette semaine ?',
     null, 3),
    -- Réactivation prospect ancien
    ('fr','reactivation_old', 90, 'J+90 (3 mois) — Ancien prospect',
     E'Hey [prénom], ça fait un moment !\n\nJe tombe sur ton profil et je me demandais où tu en es de [son objectif d''il y a X mois]. Pas de pitch, juste curieux/curieuse.',
     'Utiliser uniquement avec des prospects qui avaient montré un intérêt initial (pas un "non" net).', 1);
end if; end$$;

-- ============================================================================
-- 10. CLOSING — signaux d'achat + 3 scripts
-- ============================================================================
do $$ begin if (select count(*) from public.prospection_closing where market_code='fr') = 0 then
  insert into public.prospection_closing (market_code, kind, title, body, position) values
    -- Signaux d'achat
    ('fr','signal','Elle pose des questions précises sur le prix, le démarrage, le délai','Elle se projette concrètement dans l''achat.',1),
    ('fr','signal','Elle parle au futur','"Quand je serai cliente…", "si je commence en septembre…" — projection mentale.',2),
    ('fr','signal','Elle mentionne d''autres personnes','"Ça pourrait aussi aider ma sœur" — elle valide tellement qu''elle imagine recommander.',3),
    ('fr','signal','Elle est d''accord avec ton diagnostic','"C''est exactement ça mon problème" — alignement maximum.',4),
    ('fr','signal','Elle te demande de répéter / clarifier','Signe qu''elle veut être sûre avant de s''engager.',5),
    -- Scripts
    ('fr','propose','Proposer le passage à l''achat',
     E'OK [prénom], on a fait le tour. De ce que je vois, tu es alignée sur [le besoin] et tu vois bien comment ça peut t''aider.\n\nTu veux qu''on démarre cette semaine ? Je t''envoie le récap par écrit, je t''explique comment on commande ton kit / programme, et on cale un point dans 10 jours pour faire le premier bilan.',
     1),
    ('fr','hesitation','Si elle hésite au moment du closing',
     E'Je sens que tu hésites, [prénom]. C''est sur quoi exactement ? Le prix, le timing, ou autre chose ?\n\nDis-moi ce qui bloque, on regarde ensemble. Si c''est pas le bon moment, c''est pas grave, on attend que ça le soit.',
     1),
    ('fr','final_no','Encaisser un non final',
     E'Je comprends [prénom], merci de me le dire clairement. Si un jour ça change, reviens vers moi sans souci.\n\nBonne continuation sur tes projets 🙏',
     1);
end if; end$$;

-- ============================================================================
-- 11. SPECIAL CASES — réactivation, ghost, demande recommandation
-- ============================================================================
do $$ begin if (select count(*) from public.prospection_special_cases where market_code='fr') = 0 then
  insert into public.prospection_special_cases (market_code, kind, title, body, position) values
    ('fr','reactivation_3_6m','Réactiver un ancien prospect (3-6 mois après)',
     E'Hey [prénom], ça fait un moment !\n\nJe tombe sur ton profil et je me demandais où tu en es de [son objectif d''il y a X mois]. Pas de pitch, juste curieux/curieuse.',
     1),
    ('fr','ghost_after_exchange','Si elle te ghoste après plusieurs échanges',
     E'[prénom], je voulais pas insister mais j''aimerais comprendre où tu en es.\n\nSi c''est un non, c''est un non, et c''est OK. Dis-le moi simplement, ça m''évite de me poser des questions, et tu n''auras plus de relance.',
     1),
    ('fr','referral_request','Demande de recommandation (après résultats)',
     E'Hey [prénom], j''espère que tu vois des résultats sur [son objectif]. Je voulais te demander un truc.\n\nSi tu connais 1 ou 2 personnes dans ton entourage qui galèrent sur le même sujet que toi à l''époque — est-ce que tu serais OK pour me les présenter ? Pas de pression, seulement si ça te paraît naturel.',
     1);
end if; end$$;

-- ============================================================================
-- 12. STORYTELLING — structure 4 temps + 2 exemples + 4 règles
-- ============================================================================
do $$ begin if (select count(*) from public.prospection_storytelling where market_code='fr') = 0 then
  insert into public.prospection_storytelling (market_code, profile_slug, kind, title, body, position) values
    -- Structure
    ('fr', null, 'structure_step', 'Le point de départ',
     'Où j''en étais — problème concret, douleur. Sois précis : "fatiguée tout le temps", "+12 kg depuis ma grossesse", pas "ça allait pas".', 1),
    ('fr', null, 'structure_step', 'Le déclic',
     'Ce qui m''a fait bouger — événement précis, idéalement avec date. "En janvier 2023, une amie m''a parlé de…"', 2),
    ('fr', null, 'structure_step', 'Le changement',
     'Ce qui s''est passé — transformation chiffrée si possible. "En 6 mois, -12 kg" est plus crédible que "j''ai changé".', 3),
    ('fr', null, 'structure_step', 'Le pourquoi maintenant',
     'Pourquoi je partage ça aujourd''hui. C''est la phrase qui transforme une histoire en mission.', 4),
    -- Exemple weight-women
    ('fr','weight-women','example', 'Exemple — Perte de poids',
     E'Pendant 5 ans j''étais épuisée tout le temps. Trois enfants, un boulot prenant, et 12 kg en trop depuis ma dernière grossesse. J''avais testé tous les régimes, ça marchait jamais plus de 3 mois.\n\nEn janvier 2023, une amie m''a parlé d''une approche différente. Pas un régime — une rééducation alimentaire avec un accompagnement et des produits qui m''ont aidée à tenir.\n\nEn 6 mois, j''ai perdu mes 12 kg, mais surtout j''ai retrouvé de l''énergie. Et je les ai pas repris.\n\nAujourd''hui je partage ça parce que je sais ce que c''est, de chercher partout sans trouver. Je préfère donner les clés à celles qui galèrent encore.', 1),
    -- Exemple business
    ('fr','business','example', 'Exemple — Business',
     E'J''étais [profession] depuis [X ans]. Salaire correct mais zéro liberté. Pas vu mes enfants grandir sur les 3 dernières années.\n\nEn [mois année], j''ai croisé quelqu''un qui m''a parlé de cette activité. Je l''ai pris pour un MLM bidon au début, j''ai dit non.\n\nSix mois plus tard, en regardant mon agenda d''un dimanche soir, j''ai compris que c''était moi qui passais à côté. J''ai rappelé la personne.\n\nAujourd''hui, [X mois plus tard], j''ai [résultat concret]. Et surtout je gère mon temps.', 1),
    -- Règles
    ('fr', null, 'rule', 'Reste honnête',
     'Si ton parcours est plus court ou moins glamour, raconte-le tel quel. L''authenticité bat la perfection.', 1),
    ('fr', null, 'rule', 'Pas de chiffres mirobolants',
     '"J''ai gagné 10 000 € le premier mois" = personne ne te croit.', 2),
    ('fr', null, 'rule', 'Donne des dates précises',
     '"En mars 2023" est mille fois plus crédible que "il y a quelque temps".', 3),
    ('fr', null, 'rule', 'Assume les difficultés',
     '"Au début j''ai galéré, j''ai voulu arrêter au bout de 3 mois" est rassurant pour ton interlocuteur.', 4);
end if; end$$;

-- ============================================================================
-- 13. ROUTINES — 30min + 1h + checklist 7 items
-- ============================================================================
do $$ begin if (select count(*) from public.prospection_routines where market_code='fr') = 0 then
  insert into public.prospection_routines (market_code, kind, title, detail, duration_minutes, position) values
    -- Routine 30 minutes (débutant)
    ('fr','routine_30m','Scanner les profils',
     'Scanner 30-40 profils, en sélectionner 15-20 qualifiés (cf. green/red flags §2).',
     10, 1),
    ('fr','routine_30m','Envoyer les M1',
     'Envoyer 15-20 M1 personnalisés. Max 1 minute par message — si tu n''as pas de détail à mentionner, tu passes.',
     15, 2),
    ('fr','routine_30m','Répondre aux conversations',
     'Traiter les conversations en cours (M2, M3, demandes de RDV). Priorité aux leads chauds.',
     5, 3),
    -- Routine 1 heure (intermédiaire)
    ('fr','routine_1h','Prospection M1',
     '25-30 messages personnalisés. Cible plus large, plus de variations de templates.',
     15, 1),
    ('fr','routine_1h','Conversations actives',
     'Traiter en profondeur les M2-M3 + prises de RDV. C''est ici que tu construis la pipeline.',
     30, 2),
    ('fr','routine_1h','Suivi & contenu',
     'Suivi clients en cours, post du jour Insta, relances post-Zoom J+2/J+5.',
     15, 3),
    -- Checklist pré-envoi 7 items
    ('fr','pre_send_checklist','J''ai personnalisé [détail vu sur son profil] avec un truc précis (pas générique).', null, null, 1),
    ('fr','pre_send_checklist','Mon message ne pitche rien (pas de produit, pas de Zoom dans le M1).', null, null, 2),
    ('fr','pre_send_checklist','Mon message se termine par une question ouverte qualifiante.', null, null, 3),
    ('fr','pre_send_checklist','Pas plus de 3 émojis.', null, null, 4),
    ('fr','pre_send_checklist','Pas de lien dans le M1 (filtre spam).', null, null, 5),
    ('fr','pre_send_checklist','Le ton est posé, pas pressé.', null, null, 6),
    ('fr','pre_send_checklist','Si la personne dit non, j''ai un message de fermeture propre prêt.', null, null, 7);
end if; end$$;

commit;
