-- =============================================================================
-- Chantier #3 V5 — Réponses M2/M3 + Objections CLEAN (2026-05-20)
--
-- Suite logique du seed M1 v5 clean. Mêmes principes :
--   - Zéro pitch tant que le prospect n'a pas exprimé un besoin
--   - Un "non" bien fermé > un non mal géré (jamais d'insistance)
--   - M3 et objections génériques par langue (pas par plateforme)
--
-- Volume : 96 M2 + 48 M3 + 24 objections = 168 entrées.
--
-- Structure :
--   - M2 (4 branches : positive / vague / negative / question)
--     · weight-women + weight-men partagent contenu "perte de poids"
--     · sport et business ont leur contenu propre
--     · 4 profils × 4 branches × 6 langues = 96 entrées
--   - M3 (2 chemins : hot / lukewarm) — génériques tous profils
--     · 4 profils × 2 chemins × 6 langues = 48 entrées (dupliqué par profil)
--   - Objections (4 slugs : cest-cher, pas-le-temps, herbalife-mlm, je-reflechis)
--     · 4 × 6 langues = 24 entrées
--     · upsert via ON CONFLICT (market_code, slug)
--
-- ES + PT marqués needs_native_review = true.
-- =============================================================================

begin;

-- ─── 1. Schema : colonne needs_native_review + contrainte unique reply_tree ─

alter table public.prospection_reply_tree
  add column if not exists needs_native_review boolean not null default false;

alter table public.prospection_objections
  add column if not exists needs_native_review boolean not null default false;

comment on column public.prospection_reply_tree.needs_native_review is
  'V5 — true si le script doit être relu par natif avant prod (ES, PT).';
comment on column public.prospection_objections.needs_native_review is
  'V5 — true si la réponse doit être relue par natif (ES, PT).';

alter table public.prospection_reply_tree
  drop constraint if exists prospection_reply_tree_unique_combo;
alter table public.prospection_reply_tree
  add constraint prospection_reply_tree_unique_combo
  unique (market_code, profile_slug, level, branch, position);

-- ─── 2. Wipe existant ─────────────────────────────────────────────────────
delete from public.prospection_reply_tree;
delete from public.prospection_objections
  where slug in ('cest-cher', 'pas-le-temps', 'herbalife-mlm', 'je-reflechis');

-- ============================================================================
-- M2 — Arbre 4 branches (positive / vague / negative / question)
-- ============================================================================

-- ─── 🇫🇷 FR M2 ────────────────────────────────────────────────────────────
insert into public.prospection_reply_tree
  (market_code, profile_slug, level, branch, body, body_fr, tip, position, needs_native_review) values

-- FR poids (weight-women + weight-men même message)
('fr','weight-women','M2','positive',
 E'Top que tu me dises [prénom] 🙏 Pour mieux te répondre — c''est un objectif que tu as depuis longtemps ou c''est venu récemment ? Et tu as déjà testé des choses qui n''ont pas marché ?',
 null, null, 1, false),
('fr','weight-women','M2','vague',
 E'Je te comprends, c''est souvent comme ça — on sent qu''on veut changer sans savoir quoi exactement. Qu''est-ce qui te dérange le plus aujourd''hui : le chiffre sur la balance, comment tu te sens dans tes vêtements, ton énergie ?',
 null, null, 1, false),
('fr','weight-women','M2','negative',
 E'Pas de souci [prénom], merci d''avoir pris le temps de répondre 🙏 Belle continuation, et si un jour ça change reviens vers moi sans hésiter !',
 null, null, 1, false),
('fr','weight-women','M2','question',
 E'Bonne question ! En gros j''accompagne en nutrition — pas de régime restrictif, on travaille l''équilibre et les habitudes qui tiennent. Mais avant de t''en dire plus, dis-moi où tu en es toi — c''est ça qui détermine si je peux t''aider.',
 null, null, 1, false),

('fr','weight-men','M2','positive',
 E'Top que tu me dises [prénom] 🙏 Pour mieux te répondre — c''est un objectif que tu as depuis longtemps ou c''est venu récemment ? Et tu as déjà testé des choses qui n''ont pas marché ?',
 null, null, 1, false),
('fr','weight-men','M2','vague',
 E'Je te comprends, c''est souvent comme ça — on sent qu''on veut changer sans savoir quoi exactement. Qu''est-ce qui te dérange le plus aujourd''hui : le chiffre sur la balance, comment tu te sens dans tes vêtements, ton énergie ?',
 null, null, 1, false),
('fr','weight-men','M2','negative',
 E'Pas de souci [prénom], merci d''avoir pris le temps de répondre 🙏 Belle continuation, et si un jour ça change reviens vers moi sans hésiter !',
 null, null, 1, false),
('fr','weight-men','M2','question',
 E'Bonne question ! En gros j''accompagne en nutrition — pas de régime restrictif, on travaille l''équilibre et les habitudes qui tiennent. Mais avant de t''en dire plus, dis-moi où tu en es toi — c''est ça qui détermine si je peux t''aider.',
 null, null, 1, false),

-- FR sport
('fr','sport','M2','positive',
 E'Top 💪 Dis-m''en plus : quel volume hebdo en ce moment, et c''est quoi le truc qui te gêne le plus — récup entre séances, énergie en fin de sortie, soucis digestifs en course ?',
 null, null, 1, false),
('fr','sport','M2','vague',
 E'Cool si ça roule ! Juste par curiosité — tu enchaînes les semaines sans baisse, ou il y a des moments où tu sens que tu tires sur la corde ? Beaucoup se gèrent "bien" jusqu''à toucher un mur.',
 null, null, 1, false),
('fr','sport','M2','negative',
 E'Pas de souci, je voulais juste poser la question 🙏 Bonne continuation sur tes entraînements, et si la nutrition devient un sujet un jour, reviens vers moi.',
 null, null, 1, false),
('fr','sport','M2','question',
 E'Concrètement j''accompagne des sportifs sur la nutrition : avant/pendant/après l''effort, récup, énergie sur les longues. Mais dis-moi d''abord ce que tu cherches à améliorer — ça orientera ma réponse.',
 null, null, 1, false),

-- FR business
('fr','business','M2','positive',
 E'Cool, merci d''être ouvert 🙏 Pour faire simple : c''est du wellness, équipe internationale, un revenu en parallèle de ton activité. Avant de détailler — qu''est-ce qui te motive à explorer ça : revenu complémentaire, indépendance, ou curiosité ?',
 null, null, 1, false),
('fr','business','M2','vague',
 E'Question légitime. Franchement : c''est un modèle de distribution de produits wellness, avec une équipe qui forme. Il y a un investissement de départ, ça se développe selon le temps mis. Tu vois le tableau ? Si c''est pas ton truc dis-le, je préfère un non clair.',
 null, null, 1, false),
('fr','business','M2','negative',
 E'Pas de souci, merci d''avoir répondu franchement 🙏 J''avais tagué dans ma tête que c''était peut-être pas ton truc, c''est OK. Bonne continuation, et si un jour ça a du sens, ça se fera naturellement.',
 null, null, 1, false),
('fr','business','M2','question',
 E'Tu vas droit au but, j''aime ça. Je bosse avec [entreprise] sur le wellness. Le produit c''est une moitié, l''autre c''est le modèle de distribution. Plus simple à expliquer en visio si t''es ouvert. Si t''as déjà un avis tranché sur ce type de modèle, dis-moi, on perd pas de temps.',
 null, null, 1, false);

-- ─── 🇬🇧 EN M2 ────────────────────────────────────────────────────────────
insert into public.prospection_reply_tree
  (market_code, profile_slug, level, branch, body, body_fr, tip, position, needs_native_review) values

('en','weight-women','M2','positive',
 E'Glad you told me [name] 🙏 To point you right — is this a long-time goal or something recent? And have you tried things that didn''t work?',
 E'Top que tu me dises [prénom] 🙏 Pour mieux te répondre — c''est un objectif que tu as depuis longtemps ou c''est venu récemment ? Et tu as déjà testé des choses qui n''ont pas marché ?',
 null, 1, false),
('en','weight-women','M2','vague',
 E'I get it, it''s often like that — you feel you want to change without knowing exactly what. What bothers you most right now: the scale, how you feel in your clothes, your energy?',
 E'Je te comprends, c''est souvent comme ça — on sent qu''on veut changer sans savoir quoi exactement. Qu''est-ce qui te dérange le plus aujourd''hui : le chiffre sur la balance, comment tu te sens dans tes vêtements, ton énergie ?',
 null, 1, false),
('en','weight-women','M2','negative',
 E'No worries [name], thanks for taking the time to reply 🙏 All the best, and if that ever changes, reach out anytime!',
 E'Pas de souci [prénom], merci d''avoir pris le temps de répondre 🙏 Belle continuation, et si un jour ça change reviens vers moi sans hésiter !',
 null, 1, false),
('en','weight-women','M2','question',
 E'Good question! Basically I help with nutrition — no crash diets, we work on balance and habits that stick. But before I say more, tell me where you''re at — that''s what decides if I can actually help.',
 E'Bonne question ! En gros j''accompagne en nutrition — pas de régime restrictif, on travaille l''équilibre et les habitudes qui tiennent. Mais avant de t''en dire plus, dis-moi où tu en es toi — c''est ça qui détermine si je peux t''aider.',
 null, 1, false),

('en','weight-men','M2','positive',
 E'Glad you told me [name] 🙏 To point you right — is this a long-time goal or something recent? And have you tried things that didn''t work?',
 E'Top que tu me dises [prénom] 🙏 Pour mieux te répondre — c''est un objectif que tu as depuis longtemps ou c''est venu récemment ? Et tu as déjà testé des choses qui n''ont pas marché ?',
 null, 1, false),
('en','weight-men','M2','vague',
 E'I get it, it''s often like that — you feel you want to change without knowing exactly what. What bothers you most right now: the scale, how you feel in your clothes, your energy?',
 E'Je te comprends, c''est souvent comme ça — on sent qu''on veut changer sans savoir quoi exactement. Qu''est-ce qui te dérange le plus aujourd''hui : le chiffre sur la balance, comment tu te sens dans tes vêtements, ton énergie ?',
 null, 1, false),
('en','weight-men','M2','negative',
 E'No worries [name], thanks for taking the time to reply 🙏 All the best, and if that ever changes, reach out anytime!',
 E'Pas de souci [prénom], merci d''avoir pris le temps de répondre 🙏 Belle continuation, et si un jour ça change reviens vers moi sans hésiter !',
 null, 1, false),
('en','weight-men','M2','question',
 E'Good question! Basically I help with nutrition — no crash diets, we work on balance and habits that stick. But before I say more, tell me where you''re at — that''s what decides if I can actually help.',
 E'Bonne question ! En gros j''accompagne en nutrition — pas de régime restrictif, on travaille l''équilibre et les habitudes qui tiennent. Mais avant de t''en dire plus, dis-moi où tu en es toi — c''est ça qui détermine si je peux t''aider.',
 null, 1, false),

('en','sport','M2','positive',
 E'Nice 💪 Tell me more: what''s your weekly volume right now, and what bugs you most — recovery between sessions, energy late in a run, gut issues during races?',
 E'Top 💪 Dis-m''en plus : quel volume hebdo en ce moment, et c''est quoi le truc qui te gêne le plus — récup entre séances, énergie en fin de sortie, soucis digestifs en course ?',
 null, 1, false),
('en','sport','M2','vague',
 E'Cool if it''s flowing! Just curious — do you string weeks together without a dip, or are there moments you feel you''re pushing it? Most manage "fine"... until they hit a wall.',
 E'Cool si ça roule ! Juste par curiosité — tu enchaînes les semaines sans baisse, ou il y a des moments où tu sens que tu tires sur la corde ? Beaucoup se gèrent "bien" jusqu''à toucher un mur.',
 null, 1, false),
('en','sport','M2','negative',
 E'No worries, just wanted to ask 🙏 Keep it up with your training, and if nutrition ever becomes a topic, reach out.',
 E'Pas de souci, je voulais juste poser la question 🙏 Bonne continuation sur tes entraînements, et si la nutrition devient un sujet un jour, reviens vers moi.',
 null, 1, false),
('en','sport','M2','question',
 E'Basically I work with athletes on nutrition: before/during/after effort, recovery, energy on long sessions. But tell me first what you want to improve — that''ll guide my answer.',
 E'Concrètement j''accompagne des sportifs sur la nutrition : avant/pendant/après l''effort, récup, énergie sur les longues. Mais dis-moi d''abord ce que tu cherches à améliorer — ça orientera ma réponse.',
 null, 1, false),

('en','business','M2','positive',
 E'Cool, thanks for being open 🙏 Simply put: it''s wellness, international team, income alongside your current thing. Before details — what''s driving you to explore this: extra income, independence, or curiosity?',
 E'Cool, merci d''être ouvert 🙏 Pour faire simple : c''est du wellness, équipe internationale, un revenu en parallèle de ton activité. Avant de détailler — qu''est-ce qui te motive à explorer ça : revenu complémentaire, indépendance, ou curiosité ?',
 null, 1, false),
('en','business','M2','vague',
 E'Fair question. Honestly: it''s a wellness product distribution model, with a team that trains you. There''s an upfront investment, it grows with the time you put in. See the picture? If it''s not your thing, say so — I prefer a clear no.',
 E'Question légitime. Franchement : c''est un modèle de distribution de produits wellness, avec une équipe qui forme. Il y a un investissement de départ, ça se développe selon le temps mis. Tu vois le tableau ? Si c''est pas ton truc dis-le, je préfère un non clair.',
 null, 1, false),
('en','business','M2','negative',
 E'No worries, thanks for the honest reply 🙏 I''d figured it might not be your thing, that''s totally fine. All the best, and if it ever makes sense down the line, it''ll happen naturally.',
 E'Pas de souci, merci d''avoir répondu franchement 🙏 J''avais tagué dans ma tête que c''était peut-être pas ton truc, c''est OK. Bonne continuation, et si un jour ça a du sens, ça se fera naturellement.',
 null, 1, false),
('en','business','M2','question',
 E'Straight to the point, I like it. I work with [company] in wellness. The product is one half, the other is the distribution model. Easier to explain over a call if you''re open. If you already have a firm opinion on this type of model, tell me — no time wasted either way.',
 E'Tu vas droit au but, j''aime ça. Je bosse avec [entreprise] sur le wellness. Le produit c''est une moitié, l''autre c''est le modèle de distribution. Plus simple à expliquer en visio si t''es ouvert. Si t''as déjà un avis tranché sur ce type de modèle, dis-moi, on perd pas de temps.',
 null, 1, false);

-- ─── 🇲🇽 ES M2 (needs_native_review=true) ─────────────────────────────────
insert into public.prospection_reply_tree
  (market_code, profile_slug, level, branch, body, body_fr, tip, position, needs_native_review) values

('es','weight-women','M2','positive',
 E'Me alegra que me lo digas [nombre] 🙏 Para orientarte bien — ¿es una meta que tienes desde hace tiempo o algo reciente? ¿Ya probaste cosas que no funcionaron?',
 E'Top que tu me dises [prénom] 🙏 Pour mieux te répondre — c''est un objectif que tu as depuis longtemps ou c''est venu récemment ? Et tu as déjà testé des choses qui n''ont pas marché ?',
 null, 1, true),
('es','weight-women','M2','vague',
 E'Te entiendo, suele pasar — sientes que quieres cambiar sin saber qué exactamente. ¿Qué te molesta más ahora: el número en la báscula, cómo te sientes con la ropa, tu energía?',
 E'Je te comprends, c''est souvent comme ça — on sent qu''on veut changer sans savoir quoi exactement. Qu''est-ce qui te dérange le plus aujourd''hui : le chiffre sur la balance, comment tu te sens dans tes vêtements, ton énergie ?',
 null, 1, true),
('es','weight-women','M2','negative',
 E'Sin problema [nombre], gracias por tomarte el tiempo de responder 🙏 Que te vaya muy bien, y si algún día cambia, escríbeme cuando quieras.',
 E'Pas de souci [prénom], merci d''avoir pris le temps de répondre 🙏 Belle continuation, et si un jour ça change reviens vers moi sans hésiter !',
 null, 1, true),
('es','weight-women','M2','question',
 E'¡Buena pregunta! Básicamente acompaño en nutrición — sin dietas extremas, trabajamos el equilibrio y los hábitos que duran. Pero antes de contarte más, dime dónde estás tú — eso decide si puedo ayudarte.',
 E'Bonne question ! En gros j''accompagne en nutrition — pas de régime restrictif, on travaille l''équilibre et les habitudes qui tiennent. Mais avant de t''en dire plus, dis-moi où tu en es toi — c''est ça qui détermine si je peux t''aider.',
 null, 1, true),

('es','weight-men','M2','positive',
 E'Me alegra que me lo digas [nombre] 🙏 Para orientarte bien — ¿es una meta que tienes desde hace tiempo o algo reciente? ¿Ya probaste cosas que no funcionaron?',
 E'Top que tu me dises [prénom] 🙏 Pour mieux te répondre — c''est un objectif que tu as depuis longtemps ou c''est venu récemment ? Et tu as déjà testé des choses qui n''ont pas marché ?',
 null, 1, true),
('es','weight-men','M2','vague',
 E'Te entiendo, suele pasar — sientes que quieres cambiar sin saber qué exactamente. ¿Qué te molesta más ahora: el número en la báscula, cómo te sientes con la ropa, tu energía?',
 E'Je te comprends, c''est souvent comme ça — on sent qu''on veut changer sans savoir quoi exactement. Qu''est-ce qui te dérange le plus aujourd''hui : le chiffre sur la balance, comment tu te sens dans tes vêtements, ton énergie ?',
 null, 1, true),
('es','weight-men','M2','negative',
 E'Sin problema [nombre], gracias por tomarte el tiempo de responder 🙏 Que te vaya muy bien, y si algún día cambia, escríbeme cuando quieras.',
 E'Pas de souci [prénom], merci d''avoir pris le temps de répondre 🙏 Belle continuation, et si un jour ça change reviens vers moi sans hésiter !',
 null, 1, true),
('es','weight-men','M2','question',
 E'¡Buena pregunta! Básicamente acompaño en nutrición — sin dietas extremas, trabajamos el equilibrio y los hábitos que duran. Pero antes de contarte más, dime dónde estás tú — eso decide si puedo ayudarte.',
 E'Bonne question ! En gros j''accompagne en nutrition — pas de régime restrictif, on travaille l''équilibre et les habitudes qui tiennent. Mais avant de t''en dire plus, dis-moi où tu en es toi — c''est ça qui détermine si je peux t''aider.',
 null, 1, true),

('es','sport','M2','positive',
 E'¡Genial! 💪 Cuéntame más: ¿qué volumen semanal llevas ahora, y qué es lo que más te cuesta — recuperación entre sesiones, energía al final de una salida, problemas digestivos en carrera?',
 E'Top 💪 Dis-m''en plus : quel volume hebdo en ce moment, et c''est quoi le truc qui te gêne le plus — récup entre séances, énergie en fin de sortie, soucis digestifs en course ?',
 null, 1, true),
('es','sport','M2','vague',
 E'¡Bien si todo fluye! Solo por curiosidad — ¿encadenas semanas sin bajón, o hay momentos en que sientes que estás forzando? Muchos se manejan "bien"... hasta que chocan con un muro.',
 E'Cool si ça roule ! Juste par curiosité — tu enchaînes les semaines sans baisse, ou il y a des moments où tu sens que tu tires sur la corde ? Beaucoup se gèrent "bien" jusqu''à toucher un mur.',
 null, 1, true),
('es','sport','M2','negative',
 E'Sin problema, solo quería preguntar 🙏 Sigue así con tus entrenamientos, y si la nutrición se vuelve un tema algún día, escríbeme.',
 E'Pas de souci, je voulais juste poser la question 🙏 Bonne continuation sur tes entraînements, et si la nutrition devient un sujet un jour, reviens vers moi.',
 null, 1, true),
('es','sport','M2','question',
 E'Básicamente acompaño a deportistas en nutrición: antes/durante/después del esfuerzo, recuperación, energía en las largas. Pero dime primero qué quieres mejorar — eso orienta mi respuesta.',
 E'Concrètement j''accompagne des sportifs sur la nutrition : avant/pendant/après l''effort, récup, énergie sur les longues. Mais dis-moi d''abord ce que tu cherches à améliorer — ça orientera ma réponse.',
 null, 1, true),

('es','business','M2','positive',
 E'Genial, gracias por estar abierto 🙏 En simple: es wellness, equipo internacional, un ingreso en paralelo a lo tuyo. Antes de detallar — ¿qué te motiva a explorarlo: ingreso extra, independencia, o curiosidad?',
 E'Cool, merci d''être ouvert 🙏 Pour faire simple : c''est du wellness, équipe internationale, un revenu en parallèle de ton activité. Avant de détailler — qu''est-ce qui te motive à explorer ça : revenu complémentaire, indépendance, ou curiosité ?',
 null, 1, true),
('es','business','M2','vague',
 E'Pregunta válida. Honestamente: es un modelo de distribución de productos wellness, con un equipo que te forma. Hay una inversión inicial, crece según el tiempo que le metes. ¿Ves el panorama? Si no es lo tuyo, dilo — prefiero un no claro.',
 E'Question légitime. Franchement : c''est un modèle de distribution de produits wellness, avec une équipe qui forme. Il y a un investissement de départ, ça se développe selon le temps mis. Tu vois le tableau ? Si c''est pas ton truc dis-le, je préfère un non clair.',
 null, 1, true),
('es','business','M2','negative',
 E'Sin problema, gracias por responder con franqueza 🙏 Ya intuía que quizá no era lo tuyo, está perfecto. Que te vaya bien, y si algún día tiene sentido, se dará natural.',
 E'Pas de souci, merci d''avoir répondu franchement 🙏 J''avais tagué dans ma tête que c''était peut-être pas ton truc, c''est OK. Bonne continuation, et si un jour ça a du sens, ça se fera naturellement.',
 null, 1, true),
('es','business','M2','question',
 E'Vas al grano, me gusta. Trabajo con [marca] en wellness. El producto es una mitad, la otra es el modelo de distribución. Más fácil de explicar en una llamada si estás abierto. Si ya tienes una opinión firme sobre este tipo de modelo, dime — no perdemos tiempo.',
 E'Tu vas droit au but, j''aime ça. Je bosse avec [entreprise] sur le wellness. Le produit c''est une moitié, l''autre c''est le modèle de distribution. Plus simple à expliquer en visio si t''es ouvert. Si t''as déjà un avis tranché sur ce type de modèle, dis-moi, on perd pas de temps.',
 null, 1, true);

-- ─── 🇧🇷 PT M2 (needs_native_review=true) ─────────────────────────────────
insert into public.prospection_reply_tree
  (market_code, profile_slug, level, branch, body, body_fr, tip, position, needs_native_review) values

('pt','weight-women','M2','positive',
 E'Que bom que você me falou [nome] 🙏 Pra te orientar direito — é uma meta antiga ou algo recente? E você já testou coisas que não deram certo?',
 E'Top que tu me dises [prénom] 🙏 Pour mieux te répondre — c''est un objectif que tu as depuis longtemps ou c''est venu récemment ? Et tu as déjà testé des choses qui n''ont pas marché ?',
 null, 1, true),
('pt','weight-women','M2','vague',
 E'Te entendo, costuma ser assim — você sente que quer mudar sem saber exatamente o quê. O que mais te incomoda agora: o número na balança, como você se sente na roupa, sua energia?',
 E'Je te comprends, c''est souvent comme ça — on sent qu''on veut changer sans savoir quoi exactement. Qu''est-ce qui te dérange le plus aujourd''hui : le chiffre sur la balance, comment tu te sens dans tes vêtements, ton énergie ?',
 null, 1, true),
('pt','weight-women','M2','negative',
 E'Sem problema [nome], obrigado por reservar um tempo pra responder 🙏 Tudo de bom, e se um dia mudar, me chama quando quiser!',
 E'Pas de souci [prénom], merci d''avoir pris le temps de répondre 🙏 Belle continuation, et si un jour ça change reviens vers moi sans hésiter !',
 null, 1, true),
('pt','weight-women','M2','question',
 E'Boa pergunta! Basicamente acompanho na nutrição — sem dieta extrema, a gente trabalha equilíbrio e hábitos que duram. Mas antes de falar mais, me diz onde você está — é isso que decide se posso te ajudar.',
 E'Bonne question ! En gros j''accompagne en nutrition — pas de régime restrictif, on travaille l''équilibre et les habitudes qui tiennent. Mais avant de t''en dire plus, dis-moi où tu en es toi — c''est ça qui détermine si je peux t''aider.',
 null, 1, true),

('pt','weight-men','M2','positive',
 E'Que bom que você me falou [nome] 🙏 Pra te orientar direito — é uma meta antiga ou algo recente? E você já testou coisas que não deram certo?',
 E'Top que tu me dises [prénom] 🙏 Pour mieux te répondre — c''est un objectif que tu as depuis longtemps ou c''est venu récemment ? Et tu as déjà testé des choses qui n''ont pas marché ?',
 null, 1, true),
('pt','weight-men','M2','vague',
 E'Te entendo, costuma ser assim — você sente que quer mudar sem saber exatamente o quê. O que mais te incomoda agora: o número na balança, como você se sente na roupa, sua energia?',
 E'Je te comprends, c''est souvent comme ça — on sent qu''on veut changer sans savoir quoi exactement. Qu''est-ce qui te dérange le plus aujourd''hui : le chiffre sur la balance, comment tu te sens dans tes vêtements, ton énergie ?',
 null, 1, true),
('pt','weight-men','M2','negative',
 E'Sem problema [nome], obrigado por reservar um tempo pra responder 🙏 Tudo de bom, e se um dia mudar, me chama quando quiser!',
 E'Pas de souci [prénom], merci d''avoir pris le temps de répondre 🙏 Belle continuation, et si un jour ça change reviens vers moi sans hésiter !',
 null, 1, true),
('pt','weight-men','M2','question',
 E'Boa pergunta! Basicamente acompanho na nutrição — sem dieta extrema, a gente trabalha equilíbrio e hábitos que duram. Mas antes de falar mais, me diz onde você está — é isso que decide se posso te ajudar.',
 E'Bonne question ! En gros j''accompagne en nutrition — pas de régime restrictif, on travaille l''équilibre et les habitudes qui tiennent. Mais avant de t''en dire plus, dis-moi où tu en es toi — c''est ça qui détermine si je peux t''aider.',
 null, 1, true),

('pt','sport','M2','positive',
 E'Massa! 💪 Me conta mais: qual seu volume semanal agora, e o que mais te incomoda — recuperação entre treinos, energia no fim de um treino longo, problemas digestivos na prova?',
 E'Top 💪 Dis-m''en plus : quel volume hebdo en ce moment, et c''est quoi le truc qui te gêne le plus — récup entre séances, énergie en fin de sortie, soucis digestifs en course ?',
 null, 1, true),
('pt','sport','M2','vague',
 E'Bom se tá fluindo! Só por curiosidade — você emenda as semanas sem queda, ou tem momentos que sente que tá forçando? Muita gente se vira "bem"... até bater num muro.',
 E'Cool si ça roule ! Juste par curiosité — tu enchaînes les semaines sans baisse, ou il y a des moments où tu sens que tu tires sur la corde ? Beaucoup se gèrent "bien" jusqu''à toucher un mur.',
 null, 1, true),
('pt','sport','M2','negative',
 E'Sem problema, só queria perguntar 🙏 Continua firme nos treinos, e se nutrição virar um assunto um dia, me chama.',
 E'Pas de souci, je voulais juste poser la question 🙏 Bonne continuation sur tes entraînements, et si la nutrition devient un sujet un jour, reviens vers moi.',
 null, 1, true),
('pt','sport','M2','question',
 E'Basicamente acompanho atletas na nutrição: antes/durante/depois do esforço, recuperação, energia nos longos. Mas me diz primeiro o que você quer melhorar — isso orienta minha resposta.',
 E'Concrètement j''accompagne des sportifs sur la nutrition : avant/pendant/après l''effort, récup, énergie sur les longues. Mais dis-moi d''abord ce que tu cherches à améliorer — ça orientera ma réponse.',
 null, 1, true),

('pt','business','M2','positive',
 E'Massa, obrigado por estar aberto 🙏 Resumindo: é wellness, equipe internacional, uma renda em paralelo ao que você faz. Antes de detalhar — o que te motiva a explorar isso: renda extra, independência, ou curiosidade?',
 E'Cool, merci d''être ouvert 🙏 Pour faire simple : c''est du wellness, équipe internationale, un revenu en parallèle de ton activité. Avant de détailler — qu''est-ce qui te motive à explorer ça : revenu complémentaire, indépendance, ou curiosité ?',
 null, 1, true),
('pt','business','M2','vague',
 E'Pergunta justa. Sinceramente: é um modelo de distribuição de produtos wellness, com uma equipe que te treina. Tem um investimento inicial, cresce conforme o tempo que você dedica. Vê o quadro? Se não é a sua praia, fala — prefiro um não claro.',
 E'Question légitime. Franchement : c''est un modèle de distribution de produits wellness, avec une équipe qui forme. Il y a un investissement de départ, ça se développe selon le temps mis. Tu vois le tableau ? Si c''est pas ton truc dis-le, je préfère un non clair.',
 null, 1, true),
('pt','business','M2','negative',
 E'Sem problema, obrigado por responder com franqueza 🙏 Já imaginava que talvez não fosse a sua praia, tá tudo certo. Tudo de bom, e se um dia fizer sentido, vai acontecer natural.',
 E'Pas de souci, merci d''avoir répondu franchement 🙏 J''avais tagué dans ma tête que c''était peut-être pas ton truc, c''est OK. Bonne continuation, et si un jour ça a du sens, ça se fera naturellement.',
 null, 1, true),
('pt','business','M2','question',
 E'Direto ao ponto, gosto disso. Trabalho com [empresa] em wellness. O produto é uma metade, a outra é o modelo de distribuição. Mais fácil explicar numa call se você estiver aberto. Se já tem uma opinião fechada sobre esse tipo de modelo, me fala — não perdemos tempo.',
 E'Tu vas droit au but, j''aime ça. Je bosse avec [entreprise] sur le wellness. Le produit c''est une moitié, l''autre c''est le modèle de distribution. Plus simple à expliquer en visio si t''es ouvert. Si t''as déjà un avis tranché sur ce type de modèle, dis-moi, on perd pas de temps.',
 null, 1, true);

-- ─── 🇹🇷 TR M2 ────────────────────────────────────────────────────────────
insert into public.prospection_reply_tree
  (market_code, profile_slug, level, branch, body, body_fr, tip, position, needs_native_review) values

('tr','weight-women','M2','positive',
 E'Söylemen çok iyi oldu [isim] 🙏 Sana doğru yönlendirebilmek için — bu uzun zamandır olan bir hedef mi, yoksa yeni mi ortaya çıktı? Daha önce işe yaramayan şeyler denedin mi?',
 E'Top que tu me dises [prénom] 🙏 Pour mieux te répondre — c''est un objectif que tu as depuis longtemps ou c''est venu récemment ? Et tu as déjà testé des choses qui n''ont pas marché ?',
 null, 1, false),
('tr','weight-women','M2','vague',
 E'Seni anlıyorum, çoğu zaman böyle olur — değişmek istediğini hissedersin ama tam olarak neyi bilemezsin. Şu an seni en çok ne rahatsız ediyor: tartıdaki rakam mı, kıyafetlerin içinde nasıl hissettiğin mi, enerjin mi?',
 E'Je te comprends, c''est souvent comme ça — on sent qu''on veut changer sans savoir quoi exactement. Qu''est-ce qui te dérange le plus aujourd''hui : le chiffre sur la balance, comment tu te sens dans tes vêtements, ton énergie ?',
 null, 1, false),
('tr','weight-women','M2','negative',
 E'Sorun değil [isim], cevap vermeye zaman ayırdığın için teşekkürler 🙏 Yolun açık olsun, bir gün değişirse çekinmeden bana yaz!',
 E'Pas de souci [prénom], merci d''avoir pris le temps de répondre 🙏 Belle continuation, et si un jour ça change reviens vers moi sans hésiter !',
 null, 1, false),
('tr','weight-women','M2','question',
 E'Güzel soru! Temelde beslenme konusunda eşlik ediyorum — aşırı diyet yok, dengeyi ve kalıcı alışkanlıkları çalışıyoruz. Ama daha fazlasını anlatmadan önce, sen nerede olduğunu söyle — sana yardım edebilir miyim onu belirleyen bu.',
 E'Bonne question ! En gros j''accompagne en nutrition — pas de régime restrictif, on travaille l''équilibre et les habitudes qui tiennent. Mais avant de t''en dire plus, dis-moi où tu en es toi — c''est ça qui détermine si je peux t''aider.',
 null, 1, false),

('tr','weight-men','M2','positive',
 E'Söylemen çok iyi oldu [isim] 🙏 Sana doğru yönlendirebilmek için — bu uzun zamandır olan bir hedef mi, yoksa yeni mi ortaya çıktı? Daha önce işe yaramayan şeyler denedin mi?',
 E'Top que tu me dises [prénom] 🙏 Pour mieux te répondre — c''est un objectif que tu as depuis longtemps ou c''est venu récemment ? Et tu as déjà testé des choses qui n''ont pas marché ?',
 null, 1, false),
('tr','weight-men','M2','vague',
 E'Seni anlıyorum, çoğu zaman böyle olur — değişmek istediğini hissedersin ama tam olarak neyi bilemezsin. Şu an seni en çok ne rahatsız ediyor: tartıdaki rakam mı, kıyafetlerin içinde nasıl hissettiğin mi, enerjin mi?',
 E'Je te comprends, c''est souvent comme ça — on sent qu''on veut changer sans savoir quoi exactement. Qu''est-ce qui te dérange le plus aujourd''hui : le chiffre sur la balance, comment tu te sens dans tes vêtements, ton énergie ?',
 null, 1, false),
('tr','weight-men','M2','negative',
 E'Sorun değil [isim], cevap vermeye zaman ayırdığın için teşekkürler 🙏 Yolun açık olsun, bir gün değişirse çekinmeden bana yaz!',
 E'Pas de souci [prénom], merci d''avoir pris le temps de répondre 🙏 Belle continuation, et si un jour ça change reviens vers moi sans hésiter !',
 null, 1, false),
('tr','weight-men','M2','question',
 E'Güzel soru! Temelde beslenme konusunda eşlik ediyorum — aşırı diyet yok, dengeyi ve kalıcı alışkanlıkları çalışıyoruz. Ama daha fazlasını anlatmadan önce, sen nerede olduğunu söyle — sana yardım edebilir miyim onu belirleyen bu.',
 E'Bonne question ! En gros j''accompagne en nutrition — pas de régime restrictif, on travaille l''équilibre et les habitudes qui tiennent. Mais avant de t''en dire plus, dis-moi où tu en es toi — c''est ça qui détermine si je peux t''aider.',
 null, 1, false),

('tr','sport','M2','positive',
 E'Süper 💪 Biraz daha anlat: şu an haftalık hacmin ne, ve seni en çok zorlayan ne — seanslar arası toparlanma mı, uzun koşunun sonunda enerji mi, yarışta sindirim sorunları mı?',
 E'Top 💪 Dis-m''en plus : quel volume hebdo en ce moment, et c''est quoi le truc qui te gêne le plus — récup entre séances, énergie en fin de sortie, soucis digestifs en course ?',
 null, 1, false),
('tr','sport','M2','vague',
 E'İyiyse ne güzel! Sırf merak — haftaları düşüşsüz art arda getirebiliyor musun, yoksa zorladığını hissettiğin anlar oluyor mu? Çoğu kişi bir duvara toslayana kadar "iyi" idare eder.',
 E'Cool si ça roule ! Juste par curiosité — tu enchaînes les semaines sans baisse, ou il y a des moments où tu sens que tu tires sur la corde ? Beaucoup se gèrent "bien" jusqu''à toucher un mur.',
 null, 1, false),
('tr','sport','M2','negative',
 E'Sorun değil, sadece sormak istedim 🙏 Antrenmanlarında başarılar, beslenme bir gün konu olursa bana dön.',
 E'Pas de souci, je voulais juste poser la question 🙏 Bonne continuation sur tes entraînements, et si la nutrition devient un sujet un jour, reviens vers moi.',
 null, 1, false),
('tr','sport','M2','question',
 E'Temelde sporculara beslenme konusunda eşlik ediyorum: efor öncesi/sırası/sonrası, toparlanma, uzun mesafede enerji. Ama önce neyi geliştirmek istediğini söyle — cevabımı o belirler.',
 E'Concrètement j''accompagne des sportifs sur la nutrition : avant/pendant/après l''effort, récup, énergie sur les longues. Mais dis-moi d''abord ce que tu cherches à améliorer — ça orientera ma réponse.',
 null, 1, false),

('tr','business','M2','positive',
 E'Süper, açık olduğun için teşekkürler 🙏 Kısaca: wellness, uluslararası ekip, kendi işinin yanında bir gelir. Detaya girmeden — bunu keşfetmene ne motive ediyor: ek gelir mi, bağımsızlık mı, merak mı?',
 E'Cool, merci d''être ouvert 🙏 Pour faire simple : c''est du wellness, équipe internationale, un revenu en parallèle de ton activité. Avant de détailler — qu''est-ce qui te motive à explorer ça : revenu complémentaire, indépendance, ou curiosité ?',
 null, 1, false),
('tr','business','M2','vague',
 E'Haklı soru. Açıkçası: wellness ürünleri dağıtım modeli, seni eğiten bir ekiple. Başlangıç yatırımı var, harcadığın zamana göre büyüyor. Tabloyu görüyor musun? Senlik değilse söyle — net bir hayırı tercih ederim.',
 E'Question légitime. Franchement : c''est un modèle de distribution de produits wellness, avec une équipe qui forme. Il y a un investissement de départ, ça se développe selon le temps mis. Tu vois le tableau ? Si c''est pas ton truc dis-le, je préfère un non clair.',
 null, 1, false),
('tr','business','M2','negative',
 E'Sorun değil, açık yürekli cevap verdiğin için teşekkürler 🙏 Belki senlik olmayabilir diye düşünmüştüm, gayet normal. Yolun açık olsun, bir gün anlamlı gelirse doğal olarak olur.',
 E'Pas de souci, merci d''avoir répondu franchement 🙏 J''avais tagué dans ma tête que c''était peut-être pas ton truc, c''est OK. Bonne continuation, et si un jour ça a du sens, ça se fera naturellement.',
 null, 1, false),
('tr','business','M2','question',
 E'Sadede geliyorsun, sevdim. Wellness alanında [şirket] ile çalışıyorum. Ürün bir yarısı, diğer yarısı dağıtım modeli. Açıksan görüntülü konuşmada anlatmak daha kolay. Bu tür modeller hakkında net bir görüşün varsa söyle — ikimiz de zaman kaybetmeyiz.',
 E'Tu vas droit au but, j''aime ça. Je bosse avec [entreprise] sur le wellness. Le produit c''est une moitié, l''autre c''est le modèle de distribution. Plus simple à expliquer en visio si t''es ouvert. Si t''as déjà un avis tranché sur ce type de modèle, dis-moi, on perd pas de temps.',
 null, 1, false);

-- ─── 🇮🇳 HI M2 ────────────────────────────────────────────────────────────
insert into public.prospection_reply_tree
  (market_code, profile_slug, level, branch, body, body_fr, tip, position, needs_native_review) values

('hi','weight-women','M2','positive',
 E'Achha laga ki tune bataya [name] 🙏 Theek se guide karne ke liye — ye purana goal hai ya recent? Aur tune pehle kuch try kiya jo kaam nahi aaya?',
 E'Top que tu me dises [prénom] 🙏 Pour mieux te répondre — c''est un objectif que tu as depuis longtemps ou c''est venu récemment ? Et tu as déjà testé des choses qui n''ont pas marché ?',
 null, 1, false),
('hi','weight-women','M2','vague',
 E'Main samajhta hu, aksar aisa hi hota hai — change chahte ho par pata nahi exactly kya. Abhi sabse zyada kya bother karta hai: weighing scale ka number, kapdo mein kaisa feel hota hai, ya energy?',
 E'Je te comprends, c''est souvent comme ça — on sent qu''on veut changer sans savoir quoi exactement. Qu''est-ce qui te dérange le plus aujourd''hui : le chiffre sur la balance, comment tu te sens dans tes vêtements, ton énergie ?',
 null, 1, false),
('hi','weight-women','M2','negative',
 E'Koi baat nahi [name], reply karne ke liye time nikalne ka shukriya 🙏 All the best, aur kabhi change ho to bina hichkichaye mujhe likhna!',
 E'Pas de souci [prénom], merci d''avoir pris le temps de répondre 🙏 Belle continuation, et si un jour ça change reviens vers moi sans hésiter !',
 null, 1, false),
('hi','weight-women','M2','question',
 E'Achha sawaal! Basically main nutrition pe help karta hu — koi crash diet nahi, balance aur lasting habits pe kaam karte hai. Par aur batane se pehle, tu bata tu kahaan hai — wahi decide karta hai ki main help kar sakta hu ya nahi.',
 E'Bonne question ! En gros j''accompagne en nutrition — pas de régime restrictif, on travaille l''équilibre et les habitudes qui tiennent. Mais avant de t''en dire plus, dis-moi où tu en es toi — c''est ça qui détermine si je peux t''aider.',
 null, 1, false),

('hi','weight-men','M2','positive',
 E'Achha laga ki tune bataya [name] 🙏 Theek se guide karne ke liye — ye purana goal hai ya recent? Aur tune pehle kuch try kiya jo kaam nahi aaya?',
 E'Top que tu me dises [prénom] 🙏 Pour mieux te répondre — c''est un objectif que tu as depuis longtemps ou c''est venu récemment ? Et tu as déjà testé des choses qui n''ont pas marché ?',
 null, 1, false),
('hi','weight-men','M2','vague',
 E'Main samajhta hu, aksar aisa hi hota hai — change chahte ho par pata nahi exactly kya. Abhi sabse zyada kya bother karta hai: weighing scale ka number, kapdo mein kaisa feel hota hai, ya energy?',
 E'Je te comprends, c''est souvent comme ça — on sent qu''on veut changer sans savoir quoi exactement. Qu''est-ce qui te dérange le plus aujourd''hui : le chiffre sur la balance, comment tu te sens dans tes vêtements, ton énergie ?',
 null, 1, false),
('hi','weight-men','M2','negative',
 E'Koi baat nahi [name], reply karne ke liye time nikalne ka shukriya 🙏 All the best, aur kabhi change ho to bina hichkichaye mujhe likhna!',
 E'Pas de souci [prénom], merci d''avoir pris le temps de répondre 🙏 Belle continuation, et si un jour ça change reviens vers moi sans hésiter !',
 null, 1, false),
('hi','weight-men','M2','question',
 E'Achha sawaal! Basically main nutrition pe help karta hu — koi crash diet nahi, balance aur lasting habits pe kaam karte hai. Par aur batane se pehle, tu bata tu kahaan hai — wahi decide karta hai ki main help kar sakta hu ya nahi.',
 E'Bonne question ! En gros j''accompagne en nutrition — pas de régime restrictif, on travaille l''équilibre et les habitudes qui tiennent. Mais avant de t''en dire plus, dis-moi où tu en es toi — c''est ça qui détermine si je peux t''aider.',
 null, 1, false),

('hi','sport','M2','positive',
 E'Badhiya 💪 Aur batao: abhi weekly volume kya hai, aur sabse zyada kya pareshan karta hai — sessions ke beech recovery, lambi run ke end mein energy, ya race mein gut issues?',
 E'Top 💪 Dis-m''en plus : quel volume hebdo en ce moment, et c''est quoi le truc qui te gêne le plus — récup entre séances, énergie en fin de sortie, soucis digestifs en course ?',
 null, 1, false),
('hi','sport','M2','vague',
 E'Achha hai agar sab chal raha hai! Bas curiosity — weeks bina dip ke chalti hai, ya kabhi lagta hai over kar rahe ho? Zyadatar log "theek" manage karte hai... jab tak wall nahi aata.',
 E'Cool si ça roule ! Juste par curiosité — tu enchaînes les semaines sans baisse, ou il y a des moments où tu sens que tu tires sur la corde ? Beaucoup se gèrent "bien" jusqu''à toucher un mur.',
 null, 1, false),
('hi','sport','M2','negative',
 E'Koi baat nahi, bas poochna tha 🙏 Training mein lage raho, aur nutrition kabhi topic bane to mujhe likhna.',
 E'Pas de souci, je voulais juste poser la question 🙏 Bonne continuation sur tes entraînements, et si la nutrition devient un sujet un jour, reviens vers moi.',
 null, 1, false),
('hi','sport','M2','question',
 E'Basically main athletes ko nutrition pe help karta hu: effort se pehle/dauraan/baad, recovery, long sessions mein energy. Par pehle bata kya improve karna chahta hai — wahi meri reply guide karega.',
 E'Concrètement j''accompagne des sportifs sur la nutrition : avant/pendant/après l''effort, récup, énergie sur les longues. Mais dis-moi d''abord ce que tu cherches à améliorer — ça orientera ma réponse.',
 null, 1, false),

('hi','business','M2','positive',
 E'Cool, open hone ke liye shukriya 🙏 Simple mein: ye wellness hai, international team, tere kaam ke saath-saath ek income. Detail se pehle — isse explore karne ke liye kya motivate karta hai: extra income, independence, ya curiosity?',
 E'Cool, merci d''être ouvert 🙏 Pour faire simple : c''est du wellness, équipe internationale, un revenu en parallèle de ton activité. Avant de détailler — qu''est-ce qui te motive à explorer ça : revenu complémentaire, indépendance, ou curiosité ?',
 null, 1, false),
('hi','business','M2','vague',
 E'Sahi sawaal. Honestly: ye ek wellness product distribution model hai, ek team ke saath jo train karti hai. Ek starting investment hai, jitna time doge utna badhta hai. Picture samajh aaya? Agar tera type nahi hai to bata de — main clear na prefer karta hu.',
 E'Question légitime. Franchement : c''est un modèle de distribution de produits wellness, avec une équipe qui forme. Il y a un investissement de départ, ça se développe selon le temps mis. Tu vois le tableau ? Si c''est pas ton truc dis-le, je préfère un non clair.',
 null, 1, false),
('hi','business','M2','negative',
 E'Koi baat nahi, honestly reply karne ke liye shukriya 🙏 Mujhe laga tha shayad tera type na ho, bilkul theek hai. All the best, aur kabhi sense bane to naturally ho jaayega.',
 E'Pas de souci, merci d''avoir répondu franchement 🙏 J''avais tagué dans ma tête que c''était peut-être pas ton truc, c''est OK. Bonne continuation, et si un jour ça a du sens, ça se fera naturellement.',
 null, 1, false),
('hi','business','M2','question',
 E'Seedhe point pe, achha laga. Main [company] ke saath wellness mein kaam karta hu. Product ek half hai, dusra distribution model. Call pe samjhana easy hai agar tu open hai. Agar is type ke model pe already firm opinion hai to bata de — dono ka time bachega.',
 E'Tu vas droit au but, j''aime ça. Je bosse avec [entreprise] sur le wellness. Le produit c''est une moitié, l''autre c''est le modèle de distribution. Plus simple à expliquer en visio si t''es ouvert. Si t''as déjà un avis tranché sur ce type de modèle, dis-moi, on perd pas de temps.',
 null, 1, false);

-- ============================================================================
-- M3 — Suite de conversation (hot / lukewarm) — générique tous profils
-- ============================================================================
-- Thomas : "M3 et objections sont génériques par langue (pas par plateforme)".
-- Comme la table a profile_slug NOT NULL, on duplique le contenu pour les 4
-- profils par marché. Total : 4 profils × 2 chemins × 6 langues = 48.

do $$
declare
  prof text;
  profiles text[] := array['weight-women','weight-men','sport','business'];
begin
  foreach prof in array profiles loop
    -- FR
    insert into public.prospection_reply_tree (market_code, profile_slug, level, branch, body, body_fr, position, needs_native_review) values
    ('fr', prof, 'M3', 'hot',
     E'Ce que tu décris, je le vois souvent et c''est gérable avec la bonne approche. Je préfère pas tout balancer par écrit — on prend 15-20 min en visio cette semaine ? Je te montre comment je bosse, tu vois si ça te parle. Tu préfères [jour 1] ou [jour 2] ?',
     null, 1, false),
    ('fr', prof, 'M3', 'lukewarm',
     E'Pas de souci, je veux pas te forcer la main. Je te laisse mon contact — si à un moment ça résonne, tu me fais signe. Et si tu veux un truc concret à tester d''ici là, dis-moi.',
     null, 1, false);

    -- EN
    insert into public.prospection_reply_tree (market_code, profile_slug, level, branch, body, body_fr, position, needs_native_review) values
    ('en', prof, 'M3', 'hot',
     E'What you''re describing is common and very workable with the right approach. I''d rather not dump it all in writing — fancy 15-20 min on a call this week? I''ll show you how I work, you see if it clicks. [Day 1] or [Day 2]?',
     E'Ce que tu décris, je le vois souvent et c''est gérable avec la bonne approche. Je préfère pas tout balancer par écrit — on prend 15-20 min en visio cette semaine ? Je te montre comment je bosse, tu vois si ça te parle. Tu préfères [jour 1] ou [jour 2] ?',
     1, false),
    ('en', prof, 'M3', 'lukewarm',
     E'No worries, I won''t push. I''ll leave you my contact — if it ever resonates, reach out. And if you want something concrete to try in the meantime, just say.',
     E'Pas de souci, je veux pas te forcer la main. Je te laisse mon contact — si à un moment ça résonne, tu me fais signe. Et si tu veux un truc concret à tester d''ici là, dis-moi.',
     1, false);

    -- ES (needs_native_review)
    insert into public.prospection_reply_tree (market_code, profile_slug, level, branch, body, body_fr, position, needs_native_review) values
    ('es', prof, 'M3', 'hot',
     E'Lo que describes lo veo seguido y es muy manejable con el enfoque correcto. Prefiero no soltarlo todo por escrito — ¿15-20 min en una llamada esta semana? Te muestro cómo trabajo, ves si te late. ¿[Día 1] o [Día 2]?',
     E'Ce que tu décris, je le vois souvent et c''est gérable avec la bonne approche. Je préfère pas tout balancer par écrit — on prend 15-20 min en visio cette semaine ? Je te montre comment je bosse, tu vois si ça te parle. Tu préfères [jour 1] ou [jour 2] ?',
     1, true),
    ('es', prof, 'M3', 'lukewarm',
     E'Sin problema, no te quiero presionar. Te dejo mi contacto — si en algún momento te resuena, escríbeme. Y si quieres algo concreto para probar mientras, dime.',
     E'Pas de souci, je veux pas te forcer la main. Je te laisse mon contact — si à un moment ça résonne, tu me fais signe. Et si tu veux un truc concret à tester d''ici là, dis-moi.',
     1, true);

    -- PT (needs_native_review)
    insert into public.prospection_reply_tree (market_code, profile_slug, level, branch, body, body_fr, position, needs_native_review) values
    ('pt', prof, 'M3', 'hot',
     E'O que você descreve eu vejo direto e dá pra resolver com a abordagem certa. Prefiro não jogar tudo por escrito — que tal 15-20 min numa call essa semana? Te mostro como trabalho, você vê se faz sentido. [Dia 1] ou [Dia 2]?',
     E'Ce que tu décris, je le vois souvent et c''est gérable avec la bonne approche. Je préfère pas tout balancer par écrit — on prend 15-20 min en visio cette semaine ? Je te montre comment je bosse, tu vois si ça te parle. Tu préfères [jour 1] ou [jour 2] ?',
     1, true),
    ('pt', prof, 'M3', 'lukewarm',
     E'Sem problema, não quero te pressionar. Te deixo meu contato — se em algum momento fizer sentido, me chama. E se quiser algo concreto pra testar enquanto isso, é só falar.',
     E'Pas de souci, je veux pas te forcer la main. Je te laisse mon contact — si à un moment ça résonne, tu me fais signe. Et si tu veux un truc concret à tester d''ici là, dis-moi.',
     1, true);

    -- TR
    insert into public.prospection_reply_tree (market_code, profile_slug, level, branch, body, body_fr, position, needs_native_review) values
    ('tr', prof, 'M3', 'hot',
     E'Anlattığın şey sık görülür ve doğru yaklaşımla gayet çözülebilir. Hepsini yazılı dökmek istemem — bu hafta 15-20 dakika görüntülü konuşalım mı? Nasıl çalıştığımı gösteririm, sana uyuyor mu görürsün. [Gün 1] mi [Gün 2] mi?',
     E'Ce que tu décris, je le vois souvent et c''est gérable avec la bonne approche. Je préfère pas tout balancer par écrit — on prend 15-20 min en visio cette semaine ? Je te montre comment je bosse, tu vois si ça te parle. Tu préfères [jour 1] ou [jour 2] ?',
     1, false),
    ('tr', prof, 'M3', 'lukewarm',
     E'Sorun değil, zorlamak istemem. İletişimimi bırakıyorum — bir noktada içine sinerse haber ver. O zamana kadar test edecek somut bir şey istersen, söyle.',
     E'Pas de souci, je veux pas te forcer la main. Je te laisse mon contact — si à un moment ça résonne, tu me fais signe. Et si tu veux un truc concret à tester d''ici là, dis-moi.',
     1, false);

    -- HI
    insert into public.prospection_reply_tree (market_code, profile_slug, level, branch, body, body_fr, position, needs_native_review) values
    ('hi', prof, 'M3', 'hot',
     E'Jo tu describe kar raha hai wo common hai aur sahi approach se manageable hai. Sab likhke nahi dena chahta — is hafte 15-20 min call karein? Dikhata hu kaise kaam karta hu, tu dekh le click karta hai ya nahi. [Din 1] ya [Din 2]?',
     E'Ce que tu décris, je le vois souvent et c''est gérable avec la bonne approche. Je préfère pas tout balancer par écrit — on prend 15-20 min en visio cette semaine ? Je te montre comment je bosse, tu vois si ça te parle. Tu préfères [jour 1] ou [jour 2] ?',
     1, false),
    ('hi', prof, 'M3', 'lukewarm',
     E'Koi baat nahi, force nahi karunga. Apna contact chhod raha hu — kabhi resonate kare to bata dena. Aur tab tak kuch concrete try karna ho to bol dena.',
     E'Pas de souci, je veux pas te forcer la main. Je te laisse mon contact — si à un moment ça résonne, tu me fais signe. Et si tu veux un truc concret à tester d''ici là, dis-moi.',
     1, false);
  end loop;
end$$;

-- ============================================================================
-- OBJECTIONS — 4 slugs × 6 marchés = 24 entrées
-- ============================================================================

insert into public.prospection_objections
  (market_code, slug, title, meaning, bad_response, good_response, good_response_fr, warning, position, needs_native_review) values

-- ─── FR ───────────────────────────────────────────────────────────────────
('fr','cest-cher','C''est cher',
 E'Le prospect n''a pas vu la valeur, ou n''a pas le budget mental pour ça.',
 E'Sortir une remise dans la seconde / minimiser ("c''est le prix d''un café").',
 E'Je comprends. Cher par rapport à quoi ? Et qu''est-ce qui ferait que ça vaut le coup à tes yeux ? Selon ta réponse, soit c''est pas le moment, soit on voit une formule plus adaptée.',
 null, null, 1, false),

('fr','pas-le-temps','J''ai pas le temps',
 E'Pas une vraie priorité, ou peur que ça lui prenne plus de temps qu''il en a.',
 E'"Mais c''est rapide !" sans rien d''autre.',
 E'C''est juste, et souvent c''est parce qu''on prend pas le temps que rien bouge. Si je te dis "on attend 3 mois et tu me redis", c''est ouvert ou c''est un non ferme ? Pas de mauvaise réponse.',
 null, null, 2, false),

('fr','herbalife-mlm','C''est un MLM / système pyramidal ?',
 E'Méfiance saine — il a peut-être un proche déçu, ou une image négative ancrée.',
 E'Nier, esquiver, dire "non c''est différent" sans expliquer.',
 E'Oui c''est [entreprise], et oui c''est de la distribution multi-niveaux. Pas un système pyramidal illégal — la différence c''est qu''il y a un vrai produit consommé par des clients. Il y a du vrai et du faux qui circule là-dessus. Dis-moi ce qui te bloque précisément, je réponds franchement.',
 null,
 E'Mentir détruit ta crédibilité pour toujours. Transparence radicale.', 3, false),

('fr','je-reflechis','Je vais réfléchir',
 E'90 % du temps c''est un "non" poli. 10 % c''est un vrai besoin de digérer.',
 E'"Prends ton temps !" (tu la perds définitivement).',
 E'OK — c''est plutôt "oui mais j''ai besoin de digérer", ou "non mais je veux pas te le dire en face" ? Les deux sont OK, je préfère savoir. Si c''est non, on s''épargne du temps. Si c''est oui qui mûrit, on cale une date.',
 null, null, 4, false),

-- ─── EN ───────────────────────────────────────────────────────────────────
('en','cest-cher','It''s expensive',
 E'The prospect doesn''t see the value, or doesn''t have the mental budget for it.',
 E'Drop a discount on the spot / downplay ("it''s the price of a coffee").',
 E'I get it. Expensive compared to what? And what would make it worth it for you? Depending on your answer, either it''s not the moment, or we look at a better-fitting option.',
 E'Je comprends. Cher par rapport à quoi ? Et qu''est-ce qui ferait que ça vaut le coup à tes yeux ? Selon ta réponse, soit c''est pas le moment, soit on voit une formule plus adaptée.',
 null, 1, false),

('en','pas-le-temps','I don''t have time',
 E'Not a real priority, or fear it''ll take more time than they have.',
 E'"But it''s quick!" with nothing else.',
 E'Fair, and often it''s precisely because we don''t make time that nothing changes. If I say "let''s wait 3 months and you tell me", is that open or a firm no? No wrong answer.',
 E'C''est juste, et souvent c''est parce qu''on prend pas le temps que rien bouge. Si je te dis "on attend 3 mois et tu me redis", c''est ouvert ou c''est un non ferme ? Pas de mauvaise réponse.',
 null, 2, false),

('en','herbalife-mlm','Is this an MLM / pyramid scheme?',
 E'Healthy suspicion — they may know a disappointed friend, or have a negative image of this.',
 E'Deny, deflect, say "no it''s different" without explaining.',
 E'Yes it''s [company], and yes it''s multi-level distribution. Not an illegal pyramid — the difference is there''s a real product consumed by actual customers. There''s truth and myth around this. Tell me exactly what worries you, I''ll answer straight.',
 E'Oui c''est [entreprise], et oui c''est de la distribution multi-niveaux. Pas un système pyramidal illégal — la différence c''est qu''il y a un vrai produit consommé par des clients. Il y a du vrai et du faux qui circule là-dessus. Dis-moi ce qui te bloque précisément, je réponds franchement.',
 E'Lying destroys your credibility forever. Radical transparency.', 3, false),

('en','je-reflechis','I''ll think about it',
 E'90% of the time it''s a polite "no". 10% it''s a real need to digest.',
 E'"Take your time!" (you lose them for good).',
 E'OK — is it more "yes but I need to digest", or "no but I don''t want to say it to your face"? Both are fine, I''d rather know. If it''s no, we save time. If it''s a maturing yes, let''s set a date.',
 E'OK — c''est plutôt "oui mais j''ai besoin de digérer", ou "non mais je veux pas te le dire en face" ? Les deux sont OK, je préfère savoir. Si c''est non, on s''épargne du temps. Si c''est oui qui mûrit, on cale une date.',
 null, 4, false),

-- ─── ES (needs_native_review=true) ────────────────────────────────────────
('es','cest-cher','Está caro',
 E'El prospecto no vio el valor, o no tiene el presupuesto mental para eso.',
 E'Soltar un descuento al instante / minimizar ("es el precio de un café").',
 E'Te entiendo. ¿Caro comparado con qué? ¿Y qué haría que valiera la pena para ti? Según tu respuesta, o no es el momento, o vemos una opción más adecuada.',
 E'Je comprends. Cher par rapport à quoi ? Et qu''est-ce qui ferait que ça vaut le coup à tes yeux ? Selon ta réponse, soit c''est pas le moment, soit on voit une formule plus adaptée.',
 null, 1, true),

('es','pas-le-temps','No tengo tiempo',
 E'No es una prioridad real, o miedo a que tome más tiempo del que tiene.',
 E'"¡Pero es rápido!" sin nada más.',
 E'Es justo, y muchas veces es porque no nos hacemos el tiempo que nada cambia. Si te digo "esperamos 3 meses y me dices", ¿es abierto o un no rotundo? No hay mala respuesta.',
 E'C''est juste, et souvent c''est parce qu''on prend pas le temps que rien bouge. Si je te dis "on attend 3 mois et tu me redis", c''est ouvert ou c''est un non ferme ? Pas de mauvaise réponse.',
 null, 2, true),

('es','herbalife-mlm','¿Es un MLM / esquema piramidal?',
 E'Desconfianza sana — quizás conoce a alguien decepcionado, o tiene una imagen negativa.',
 E'Negar, esquivar, decir "no es diferente" sin explicar.',
 E'Sí, es [marca], y sí, es distribución multinivel. No un esquema piramidal ilegal — la diferencia es que hay un producto real consumido por clientes. Hay verdades y mitos sobre esto. Dime qué te frena exactamente, te respondo con franqueza.',
 E'Oui c''est [entreprise], et oui c''est de la distribution multi-niveaux. Pas un système pyramidal illégal — la différence c''est qu''il y a un vrai produit consommé par des clients. Il y a du vrai et du faux qui circule là-dessus. Dis-moi ce qui te bloque précisément, je réponds franchement.',
 E'Mentir destruye tu credibilidad para siempre. Transparencia radical.', 3, true),

('es','je-reflechis','Lo voy a pensar',
 E'90 % del tiempo es un "no" educado. 10 % es real necesidad de digerir.',
 E'"¡Tómate tu tiempo!" (lo pierdes para siempre).',
 E'OK — ¿es más "sí pero necesito digerirlo", o "no pero no quiero decírtelo de frente"? Las dos están bien, prefiero saber. Si es no, ahorramos tiempo. Si es un sí que madura, fijamos fecha.',
 E'OK — c''est plutôt "oui mais j''ai besoin de digérer", ou "non mais je veux pas te le dire en face" ? Les deux sont OK, je préfère savoir. Si c''est non, on s''épargne du temps. Si c''est oui qui mûrit, on cale une date.',
 null, 4, true),

-- ─── PT (needs_native_review=true) ────────────────────────────────────────
('pt','cest-cher','Tá caro',
 E'O prospect não viu o valor, ou não tem o orçamento mental pra isso.',
 E'Soltar um desconto na hora / minimizar ("é o preço de um café").',
 E'Entendo. Caro comparado com o quê? E o que faria valer a pena pra você? Dependendo da resposta, ou não é o momento, ou vemos uma opção mais adequada.',
 E'Je comprends. Cher par rapport à quoi ? Et qu''est-ce qui ferait que ça vaut le coup à tes yeux ? Selon ta réponse, soit c''est pas le moment, soit on voit une formule plus adaptée.',
 null, 1, true),

('pt','pas-le-temps','Não tenho tempo',
 E'Não é uma prioridade real, ou medo de que tome mais tempo do que tem.',
 E'"Mas é rápido!" sem mais nada.',
 E'É justo, e muitas vezes é porque a gente não arruma tempo que nada muda. Se eu disser "espera 3 meses e você me diz", é aberto ou um não firme? Não tem resposta errada.',
 E'C''est juste, et souvent c''est parce qu''on prend pas le temps que rien bouge. Si je te dis "on attend 3 mois et tu me redis", c''est ouvert ou c''est un non ferme ? Pas de mauvaise réponse.',
 null, 2, true),

('pt','herbalife-mlm','É um MLM / esquema piramidal?',
 E'Desconfiança saudável — talvez conheça alguém decepcionado, ou tenha uma imagem negativa.',
 E'Negar, esquivar, dizer "não é diferente" sem explicar.',
 E'Sim, é [empresa], e sim, é distribuição multinível. Não é pirâmide ilegal — a diferença é que tem um produto real consumido por clientes. Tem verdade e mito nisso. Me diz exatamente o que te trava, respondo na lata.',
 E'Oui c''est [entreprise], et oui c''est de la distribution multi-niveaux. Pas un système pyramidal illégal — la différence c''est qu''il y a un vrai produit consommé par des clients. Il y a du vrai et du faux qui circule là-dessus. Dis-moi ce qui te bloque précisément, je réponds franchement.',
 E'Mentir destrói sua credibilidade pra sempre. Transparência radical.', 3, true),

('pt','je-reflechis','Vou pensar',
 E'90 % das vezes é um "não" educado. 10 % é real necessidade de digerir.',
 E'"Pega seu tempo!" (perde pra sempre).',
 E'OK — é mais "sim mas preciso digerir", ou "não mas não quero falar na sua cara"? Os dois tão de boa, prefiro saber. Se for não, economizamos tempo. Se for um sim amadurecendo, marcamos uma data.',
 E'OK — c''est plutôt "oui mais j''ai besoin de digérer", ou "non mais je veux pas te le dire en face" ? Les deux sont OK, je préfère savoir. Si c''est non, on s''épargne du temps. Si c''est oui qui mûrit, on cale une date.',
 null, 4, true),

-- ─── TR ───────────────────────────────────────────────────────────────────
('tr','cest-cher','Pahalı',
 E'Prospect değeri görmedi, ya da bunun için mental bütçesi yok.',
 E'Anında indirim çıkarmak / önemsizleştirmek ("bir kahve fiyatı").',
 E'Anlıyorum. Neye göre pahalı? Ve senin gözünde neyi değer kılardı? Cevabına göre ya zamanı değil, ya da daha uygun bir seçeneğe bakarız.',
 E'Je comprends. Cher par rapport à quoi ? Et qu''est-ce qui ferait que ça vaut le coup à tes yeux ? Selon ta réponse, soit c''est pas le moment, soit on voit une formule plus adaptée.',
 null, 1, false),

('tr','pas-le-temps','Vaktim yok',
 E'Gerçek bir öncelik değil, ya da olduğundan fazla zaman alacağından korkuyor.',
 E'"Ama hızlı!" başka bir şey demeden.',
 E'Haklısın, ve çoğu zaman tam da zaman ayırmadığımız için hiçbir şey değişmez. "3 ay bekleyelim, sonra söyle" desem, açık mı yoksa kesin bir hayır mı? Yanlış cevap yok.',
 E'C''est juste, et souvent c''est parce qu''on prend pas le temps que rien bouge. Si je te dis "on attend 3 mois et tu me redis", c''est ouvert ou c''est un non ferme ? Pas de mauvaise réponse.',
 null, 2, false),

('tr','herbalife-mlm','Bu MLM / piramit şeması mı?',
 E'Sağlıklı şüphe — belki hayal kırıklığına uğramış birini tanıyor, ya da olumsuz bir imgesi var.',
 E'Reddetmek, kaçınmak, açıklamadan "hayır farklı" demek.',
 E'Evet [şirket], ve evet çok katlı dağıtım. Yasadışı bir piramit değil — fark, gerçek müşteriler tarafından tüketilen gerçek bir ürün olması. Bu konuda doğru da var yanlış da. Tam olarak neyin seni durdurduğunu söyle, dürüstçe cevaplarım.',
 E'Oui c''est [entreprise], et oui c''est de la distribution multi-niveaux. Pas un système pyramidal illégal — la différence c''est qu''il y a un vrai produit consommé par des clients. Il y a du vrai et du faux qui circule là-dessus. Dis-moi ce qui te bloque précisément, je réponds franchement.',
 E'Yalan söylemek itibarını sonsuza dek yok eder. Radikal şeffaflık.', 3, false),

('tr','je-reflechis','Düşüneceğim',
 E'%90 zaman kibar bir "hayır". %10 gerçek sindirme ihtiyacı.',
 E'"Zaman al!" (sonsuza kadar kaybedersin).',
 E'Tamam — bu "evet ama sindirmem lazım" mı, yoksa "hayır ama yüzüne söylemek istemiyorum" mu? İkisi de olur, bilmeyi tercih ederim. Hayırsa zaman kazanırız. Olgunlaşan bir evetse bir tarih belirleriz.',
 E'OK — c''est plutôt "oui mais j''ai besoin de digérer", ou "non mais je veux pas te le dire en face" ? Les deux sont OK, je préfère savoir. Si c''est non, on s''épargne du temps. Si c''est oui qui mûrit, on cale une date.',
 null, 4, false),

-- ─── HI ───────────────────────────────────────────────────────────────────
('hi','cest-cher','Mehenga hai',
 E'Prospect ne value nahi dekhi, ya iske liye mental budget nahi hai.',
 E'Turant discount nikalna / minimize karna ("ek coffee ka price").',
 E'Samajhta hu. Kiske comparison mein mehenga? Aur kya cheez ise tere liye worth banaegi? Tere jawab pe — ya to ye sahi time nahi, ya hum better option dekhte hai.',
 E'Je comprends. Cher par rapport à quoi ? Et qu''est-ce qui ferait que ça vaut le coup à tes yeux ? Selon ta réponse, soit c''est pas le moment, soit on voit une formule plus adaptée.',
 null, 1, false),

('hi','pas-le-temps','Time nahi hai',
 E'Real priority nahi hai, ya darr hai ki zyada time legi.',
 E'"Par ye fast hai!" aur kuch nahi.',
 E'Sahi hai, aur aksar isiliye kuch nahi badalta kyunki hum time nahi nikalte. Agar main kahu "3 mahine ruko phir batao", to wo open hai ya firm no? Koi galat jawab nahi.',
 E'C''est juste, et souvent c''est parce qu''on prend pas le temps que rien bouge. Si je te dis "on attend 3 mois et tu me redis", c''est ouvert ou c''est un non ferme ? Pas de mauvaise réponse.',
 null, 2, false),

('hi','herbalife-mlm','Ye MLM / pyramid scheme hai?',
 E'Healthy suspicion — shayad disappointed dost ko jaante hai, ya negative image hai.',
 E'Deny karna, kaatna, "no it''s different" bina explain.',
 E'Haan ye [company] hai, aur haan multi-level distribution hai. Illegal pyramid nahi — fark ye hai ki ek real product hai jo actual customers consume karte hai. Iske baare mein sach bhi hai aur myth bhi. Bata exactly kya rok raha hai, main seedha jawab dunga.',
 E'Oui c''est [entreprise], et oui c''est de la distribution multi-niveaux. Pas un système pyramidal illégal — la différence c''est qu''il y a un vrai produit consommé par des clients. Il y a du vrai et du faux qui circule là-dessus. Dis-moi ce qui te bloque précisément, je réponds franchement.',
 E'Jhooth bolne se credibility hamesha ke liye khatam. Radical transparency.', 3, false),

('hi','je-reflechis','Sochta hu',
 E'90% time ye polite "no" hai. 10% real need to digest.',
 E'"Time le!" (hamesha ke liye kho diya).',
 E'OK — ye zyada "haan par digest karna hai", ya "nahi par face pe nahi bolna chahta"? Dono theek hai, main jaanna prefer karunga. Agar no hai to time bachta hai. Agar maturing yes hai to ek date fix karte hai.',
 E'OK — c''est plutôt "oui mais j''ai besoin de digérer", ou "non mais je veux pas te le dire en face" ? Les deux sont OK, je préfère savoir. Si c''est non, on s''épargne du temps. Si c''est oui qui mûrit, on cale une date.',
 null, 4, false);

commit;

-- =============================================================================
-- VÉRIFICATION POST-SEED (à exécuter manuellement après push)
-- =============================================================================
-- SELECT market_code, level, branch, COUNT(*) FROM prospection_reply_tree
--  GROUP BY market_code, level, branch ORDER BY market_code, level, branch;
-- Attendu : 144 entrées (96 M2 + 48 M3).
--
-- SELECT market_code, slug, title FROM prospection_objections
--  ORDER BY market_code, slug;
-- Attendu : 24 lignes (4 slugs × 6 marchés).
