-- =============================================================================
-- Chantier #3 V4 — Seed ES (2026-05-19)
--
-- Marché ES = LatAm (Mexique en priorité, Argentine, Colombie) + Espagne.
-- Ton chaleureux, "platica" plutôt que "conversación", WhatsApp DOMINANT.
-- Tutoiement systématique. Adaptation des hashtags niche, exemples
-- storytelling reformulés en pesos/euros mentaux.
-- =============================================================================

begin;

-- 1. MINDSET ─────────────────────────────────────────────────────────────────
do $$ begin if (select count(*) from public.prospection_mindset_blocks where market_code='es') = 0 then
  insert into public.prospection_mindset_blocks (market_code, kind, title, body, position) values
    ('es','truth','No es un juego de volumen ciego, es un juego de filtro.',
     E'Tu trabajo no es convencer. Tu trabajo es encontrar a las personas adecuadas en el momento adecuado. Si mandas 100 mensajes para convencer a 100 personas, te agotas en una semana. Si mandas 100 mensajes para identificar las 5 que están listas, construyes un negocio duradero.', 1),
    ('es','truth','Mientras más relajado/a, más atraes.',
     E'Un prospecto siente al instante si transpiras la necesidad de "reclutarlo". El desapego atrae. La presión repele. Si necesitas esa venta para pagar la renta, se nota en tus mensajes.', 2),
    ('es','truth','El silencio no es rechazo personal.',
     E'80% de tus mensajes no tendrán respuesta. Eso no significa que seas malo/a. Significa que la gente está ocupada, no es el momento, o no es el público adecuado. Sigue.', 3),
    ('es','error','Pitchear desde el primer mensaje.',
     E'Pierdes 90% de los prospectos en una frase. El primer mensaje solo tiene un objetivo: obtener una respuesta. No vender.', 1),
    ('es','error','Mandar el mismo mensaje a 50 personas.',
     E'El copy-paste se nota a kilómetros. Personaliza al menos [detalle visto en su perfil]. Si no encuentras un detalle preciso, no es un buen prospecto — pasa al siguiente.', 2),
    ('es','error','Insistir D+1, D+2, D+3.',
     E'Pasas de coach a acosador/a en 48 h. Un solo seguimiento, en D+3, nunca más.', 3),
    ('es','error','Argumentar sobre los "no".',
     E'Un "no" bien cerrado a veces regresa 6 meses después. Un "no" mal manejado nunca regresa.', 4),
    ('es','error','Mentir sobre el negocio.',
     E'Si te preguntan "¿es MLM?", la respuesta honesta es sí. Mentir destruye tu credibilidad para siempre.', 5);
end if; end$$;

-- 2. METRICS ─────────────────────────────────────────────────────────────────
do $$ begin if (select count(*) from public.prospection_metrics where market_code='es') = 0 then
  insert into public.prospection_metrics (market_code, kind, label, value_min, value_max, value_unit, hint, position) values
    ('es','funnel_step','Mensajes M1 enviados',          100, 100, 'mensajes', 'Base para principiante', 1),
    ('es','funnel_step','Respuestas recibidas',           15,  25, 'respuestas','15-25 % si bien personalizado', 2),
    ('es','funnel_step','Conversaciones calificadas',      5,  10, 'convs',    '5-10 diálogos realmente activos', 3),
    ('es','funnel_step','Citas / Zoom agendadas',          1,   3, 'citas',    'Llamada de descubrimiento', 4),
    ('es','funnel_step','Nuevos clientes',                 0,   1, 'clientes', 'Primer cliente: 100-200 M1', 5),
    ('es','pipeline_target','M1 enviados esperando respuesta',  50, 100, 'mensajes', 'Mantén el stock constante', 1),
    ('es','pipeline_target','Conversaciones activas',           10,  20, 'convs',    'Tu malabarismo del día', 2),
    ('es','pipeline_target','Citas en próximos 7 días',          2,   5, 'citas',    'Si menos, aumenta volumen M1', 3),
    ('es','pipeline_target','Clientes en cierre',                1,   3, 'leads',    'Tus finalistas', 4),
    ('es','weekly_kpi','Cantidad de M1 enviados', null, null, 'count', 'Mide tu esfuerzo. Bajo 50/sem = poco.', 1),
    ('es','weekly_kpi','Tasa de respuesta',       null, null, 'pct',   'Bajo 15 % = revisa la calidad de M1.', 2),
    ('es','weekly_kpi','Conversión cita→cliente', null, null, 'pct',   'Bajo 20 % = revisa tu cierre.', 3);
end if; end$$;

-- 3. PROFILE FLAGS ───────────────────────────────────────────────────────────
do $$ begin if (select count(*) from public.prospection_profile_flags where market_code='es') = 0 then
  insert into public.prospection_profile_flags (market_code, profile_slug, flag_type, text, position) values
    ('es','weight-women','green','Actividad reciente (post < 2 semanas)', 1),
    ('es','weight-women','green','Posts personales con engagement', 2),
    ('es','weight-women','green','Bio clara con intención', 3),
    ('es','weight-women','green','No tiene coach competidor en la misma niche', 4),
    ('es','weight-women','red','Perfil privado sin contexto', 1),
    ('es','weight-women','red','Cuenta 100 % business / tienda / afiliación', 2),
    ('es','weight-women','red','Sin post hace 6+ meses', 3),
    ('es','weight-women','red','Miles de seguidores con bajo engagement (fake)', 4),
    ('es','weight-men','green','Actividad reciente (post < 2 semanas)', 1),
    ('es','weight-men','green','Posts deporte, performance, energía, vida pro intensa', 2),
    ('es','weight-men','green','Bio menciona objetivo claro (perder grasa, ganar masa, energía)', 3),
    ('es','weight-men','green','No tiene coach competidor', 4),
    ('es','weight-men','red','Perfil privado sin contexto', 1),
    ('es','weight-men','red','Bio centrada en apariencia pura (modelo, shoots)', 2),
    ('es','weight-men','red','Sin post hace 6+ meses', 3),
    ('es','weight-men','red','Influencer gym saturado de coaches', 4),
    ('es','sport','green','Activo/a en su práctica (post entrenamiento reciente)', 1),
    ('es','sport','green','Menciona objetivos precisos (carrera, PR, temporada)', 2),
    ('es','sport','green','Engagement genuino en sus posts', 3),
    ('es','sport','green','No patrocinado / no ya coacheado', 4),
    ('es','sport','red','Cuenta pro-atleta con patrocinios', 1),
    ('es','sport','red','Sin post hace 6+ meses', 2),
    ('es','sport','red','Perfil "shopping fitness" sin práctica real', 3),
    ('es','sport','red','Bio ya dice "coach nutrición deportiva"', 4),
    ('es','business','green','Actividad reciente, posts personales', 1),
    ('es','business','green','Bio clara con profesión o estatus emprendedor', 2),
    ('es','business','green','Engagement real (comentarios construidos)', 3),
    ('es','business','green','No ya top distri de MLM competidor', 4),
    ('es','business','red','Bio = solo link afiliación MLM competidor', 1),
    ('es','business','red','Muchos followers / cero engagement (fake)', 2),
    ('es','business','red','Sin foto / sin post personal', 3),
    ('es','business','red','Stories saturadas de pitches business', 4);
end if; end$$;

-- 4. SOURCES ─────────────────────────────────────────────────────────────────
do $$ begin if (select count(*) from public.prospection_sources where market_code='es') = 0 then
  insert into public.prospection_sources (market_code, profile_slug, kind, label, detail, position) values
    ('es', null, 'hashtag_advanced',
     'Ratio ideal de tus posts Insta',
     E'60 % valor (consejos, educación, tips) · 30 % personal (camino, día a día, familia, fracasos) · 10 % CTA (testimonios, "DM si…").\nError típico: solo fotos de productos o resultados. La gente te sigue por TI.', 1),
    ('es', null, 'hashtag_advanced',
     'Método scan perfil 30 segundos',
     E'Antes de mandar M1, verifica 4 puntos: (1) actividad reciente · (2) engagement genuino · (3) bio con intención clara · (4) sin coach competidor.', 2),
    ('es','weight-women','fb_groups','Grupos Facebook locales bienestar',
     'Busca: "bajar de peso [ciudad]", "mamá saludable", "alimentación consciente". Aporta valor ANTES de DM.', 1),
    ('es','weight-women','irl','Salidas de guardería / escuela',
     'Mamás 30-45, horarios 8:30/16:30, tono natural cálido. Sin pitch directo, crear lazos.', 1),
    ('es','weight-women','irl','Gimnasios (clases grupales)',
     'Pilates, yoga, body pump. Evita la zona pesas (otro target).', 2),
    ('es','weight-women','recommendations','Red personal + clientas actuales',
     'Tu mejor fuente de prospectos calificados. Ver §8.', 1),
    ('es','weight-women','inbound_content','Contenido Insta/TikTok bajar de peso',
     'Testimonios, "lo que hubiera querido saber", recetas. Leads entrantes 3× más calientes.', 1),
    ('es','weight-men','fb_groups','Grupos FB "ponerme en forma hombre [ciudad]"',
     'Posts sobre ganar masa, perder grasa, energía. Aporta valor antes de DM.', 1),
    ('es','weight-men','irl','Gimnasios, CrossFit, deportes en equipo',
     'Fútbol, basket, padel. 7-9h o 19-21h. Tono natural directo.', 1),
    ('es','weight-men','recommendations','Red profesional + clientes hombres',
     'Recomendación = canal #1 en este target.', 1),
    ('es','weight-men','inbound_content','Contenido performance / recuperación / energía',
     'Evita "bienestar suave" → cliente mujer. Habla performance, sueño, masa magra.', 1),
    ('es','sport','fb_groups','Grupos running / triatlón / CrossFit locales',
     'Posts tipo "¿cómo manejan la nutrición en salidas largas?". Aporta valor.', 1),
    ('es','sport','irl','Box CrossFit, clubes running, triatlón',
     'Presencia física = credibilidad. Conecta tras una sesión.', 1),
    ('es','sport','recommendations','Coaches prepa física, kinesiólogos, médicos deporte',
     'Partnerships cruzados posibles. Win-win cliente.', 1),
    ('es','sport','inbound_content','Contenido nutrición pre/per/post esfuerzo',
     'Strava clubs, cuentas coaches. Deportistas amateurs ahí están.', 1),
    ('es','business','fb_groups','Grupos "side hustle", "emprendedor [ciudad]"',
     'Moderación más suave que Insta. Valor business antes del pitch.', 1),
    ('es','business','irl','BNI, espacios coworking, meetups emprendedores',
     'Networking emprendedor. Sin onda MLM — tono pares.', 1),
    ('es','business','recommendations','Red pro existente, ex-colegas',
     'Boca a boca sigue siendo el canal más creíble.', 1),
    ('es','business','inbound_content','Contenido mindset, independencia, camino personal',
     'Evita "vuélvete rico", prioriza "este es mi camino".', 1);
end if; end$$;

-- 5. HASHTAGS ────────────────────────────────────────────────────────────────
update public.prospection_hashtags set category = 'mainstream'
  where market_code = 'es' and hashtag in (
    '#perderpeso','#vidasana','#nutricionsaludable',
    '#fitnessmexico','#deportemexico','#entrenamiento',
    '#emprendedormexico','#libertadfinanciera','#emprenderonline'
  );

update public.prospection_hashtags set category = 'niche'
  where market_code = 'es' and hashtag in (
    '#bajardepesomexico','#mamasaludable','#transformacioncorporal','#bienestarintegral','#vidasaludable2026','#nutricionconsciente','#mujersaludable',
    '#crossfitmx','#runningmexico','#nutriciondeportiva','#recuperacionmuscular','#atletaamateur','#rendimientodeportivo',
    '#negociodesdacasa','#mompreneurmx','#emprendedoradigital','#mompreneur','#negociowellness'
  );

update public.prospection_hashtags set
  category = 'cross',
  crossover_hint = 'Cruzar con #mamasaludable o #postparto para nicho mamás.'
  where market_code = 'es' and profile_slug = 'weight-women' and hashtag = '#perderpeso';

update public.prospection_hashtags set
  category = 'cross',
  crossover_hint = 'Cruzar con hashtag ciudad (#cdmx #buenosaires #madrid) para target local.'
  where market_code = 'es' and profile_slug = 'sport' and hashtag = '#runningmexico';

insert into public.prospection_hashtags (market_code, profile_slug, hashtag, category, crossover_hint, position) values
  ('es','weight-men','#hombresenforma','mainstream',null,1),
  ('es','weight-men','#ganarmasamuscular','mainstream',null,2),
  ('es','weight-men','#perderGrasaCorporal','niche',null,3),
  ('es','weight-men','#fitness40hombres','niche',null,4),
  ('es','weight-men','#papafit','niche',null,5),
  ('es','weight-men','#dadbodmx','niche',null,6),
  ('es','weight-men','#recompcorporal','niche',null,7),
  ('es','weight-men','#hombreocupado','cross','Cruzar con hashtag profesión/edad (#padre40, #emprendedor) para target 30-50 activo pro.',8)
on conflict (market_code, profile_slug, hashtag) do nothing;

-- 6. SCRIPTS M1 weight-men ───────────────────────────────────────────────────
do $$ begin if (select count(*) from public.prospection_scripts where market_code='es' and profile_slug='weight-men') = 0 then
  insert into public.prospection_scripts (market_code, profile_slug, platform, body, body_fr, tip, position, kind, label, language_label) values
    ('es','weight-men','insta',
     E'¡Hola [nombre]!\n\nVi tu post sobre [detalle del perfil]. Trabajo con hombres en nutrición y volver a la forma — sobre todo pérdida de grasa, energía y recuperación cuando combinas chamba intensa y deporte.\n\nPregunta rápida: ¿estás más en pérdida de grasa, ganancia de masa limpia, o solo recuperar energía día a día?',
     E'Vu ton post sur [détail]. Coaching nutrition hommes : perte de gras, énergie, récup quand boulot + sport. Tu es plutôt perte de gras, prise de masse propre, ou retrouver de l''énergie ?',
     'ES Mexique/LatAm. "Chamba" = boulot, ton natural. Evita "bienestar".',
     1, 'first_contact', 'Instagram DM · Primer contacto', '🇲🇽 Español'),
    ('es','weight-men','whatsapp',
     E'¡Hola [nombre]! Soy [tu nombre], nos conectamos por [contexto]. Me hablaste de [pérdida de grasa / energía / deporte]. ¿Cómo vas con eso?',
     E'Salut, on s''est connectés via [contexte]. Tu m''avais parlé de [détail]. Tu en es où ?',
     'WhatsApp dominante LatAm. Tono directo, sin emojis exagerados.',
     1, 'first_contact', 'WhatsApp · Contacto directo', '🇲🇽 Español'),
    ('es','weight-men','fb',
     E'Hola [nombre], vi tu post en [nombre grupo] sobre [detalle]. Soy coach nutrición en [ciudad], trabajo con hombres 30-50 en volver a la forma — sobre todo los que combinan chamba demandante y no quieren que el cuerpo aguante mal.\n\n¿Dónde estás tú? ¿Buscas algo preciso o probando cosas al azar?',
     E'Coach nutrition à [ville], je bosse avec des hommes 30-50 sur la remise en forme — surtout boulot prenant + corps qui ne lâche pas. Tu en es où ?',
     'FB Messenger LatAm. Más posado, grupos "ponerse en forma" mina de oro.',
     1, 'first_contact', 'Facebook Messenger · Primer contacto', '🇲🇽 Español'),
    ('es','weight-men','sms',
     E'Hola [nombre], soy [tu nombre]. Habíamos hablado de [contexto]. Si sigues con la idea de [objetivo], dime, podemos platicar esta semana.',
     E'Salut [prénom], c''est [ton prénom]. On avait parlé de [contexte]. Si tu es toujours sur [objectif], dis-moi.',
     'SMS LatAm. "Platicar" = parler de façon décontractée, mot clé culturel.',
     1, 'first_contact', 'SMS · Corto y posado', '🇲🇽 Español');
end if; end$$;

-- 7. REPLY TREE ──────────────────────────────────────────────────────────────
do $$ begin if (select count(*) from public.prospection_reply_tree where market_code='es') = 0 then
  insert into public.prospection_reply_tree (market_code, profile_slug, level, branch, body, body_fr, tip, position) values
    -- weight-women
    ('es','weight-women','M2','positive',
     E'Qué bueno que me compartas eso, [nombre] 🙏\n\nPara darte mejor respuesta — ¿es un objetivo que tienes desde hace tiempo o salió hace poco? ¿Has intentado cosas que no funcionaron?\n\nTe pregunto porque según donde estés, te comparto cosas concretas o nada. Depende de ti.',
     E'Top que tu partages. Objectif récent ou de longue date ? Tu as déjà testé ? Selon ta réponse je partage du concret ou pas.',
     'On creuse avant de pitcher.', 1),
    ('es','weight-women','M2','vague',
     E'Te entiendo, [nombre]. Pasa seguido — sientes que algo tiene que cambiar sin saber qué exactamente.\n\nOtro ángulo: ¿qué te molesta más hoy? ¿El número en la balanza, cómo te sientes en tu ropa, tu energía, tu relación con la comida? Suele haber un punto que destaca.',
     E'Je te comprends. Quel est LE point qui te dérange : balance, vêtements, énergie, rapport bouffe ?',
     'Question fermée qui ouvre.', 1),
    ('es','weight-women','M2','negative',
     E'Sin problema [nombre], gracias por tomarte el tiempo de responder 🙏\n\nQue te vaya bien. Si algún día cambia, escríbeme sin pena. ¡Disfruta!',
     E'Pas de souci, merci d''avoir répondu. Belle continuation.',
     'Fermeture propre.', 1),
    ('es','weight-women','M2','question',
     E'Buena pregunta.\n\nEn corto, acompaño en nutrición — sin dietas restrictivas. Trabajamos equilibrio alimentario, energía y hábitos duraderos. Uso productos naturales como complemento cuando sirve.\n\nPero antes de contarte más, dime dónde estás tú. Eso es lo que va a decir si lo que hago te puede ayudar.',
     E'Coaching nutrition pas régime, équilibre + énergie + habitudes, produits naturels en complément.',
     'Réponse courte puis recentre.', 1),
    ('es','weight-women','M3','hot',
     E'Gracias por compartir todo eso, [nombre], es valioso 🙏\n\nLo que describes lo veo seguido. La buena noticia: se maneja con el enfoque correcto.\n\nPrefiero no soltar todo por escrito. ¿15-20 min en Zoom esta semana? Te muestro cómo trabajo y tú decides si te late. Cero compromiso.\n\n¿Prefieres [día 1] o [día 2]?',
     E'Visio 15-20 min, zéro engagement, choix de jour.',
     'Choix entre 2 dates.', 1),
    ('es','weight-women','M3','lukewarm',
     E'Sin problema [nombre], no quiero presionarte.\n\nTe dejo mi contacto. Si en algún momento te late, me escribes. Y si quieres algo concreto para probar mientras tanto, dime, te comparto.',
     E'Pas de souci, je te laisse mon contact + offre tip concret.',
     'Échantillon de valeur.', 1),
    -- weight-men
    ('es','weight-men','M2','positive',
     E'Qué bueno que vayas al grano, [nombre] 💪\n\nCuéntame más: ¿cuántas sesiones por semana, y qué te bloquea realmente? Recuperación, energía al final del día, ganar grasa a pesar de entrenar, sueño?\n\nSegún donde se traba, no te digo lo mismo.',
     E'Top cash. Combien de séances, c''est quoi qui bloque ?',
     'Vocabulaire perf + blocage précis.', 1),
    ('es','weight-men','M2','vague',
     E'OK [nombre], te capto.\n\nPregunta más directa: ¿logras encadenar semanas sin caída de energía, o hay momentos donde sientes que jalas de la cuerda?\n\nLa mayoría de los hombres que veo se manejan "bien"... hasta que pegan en la pared. Si estás en el primer caso, perfecto. Si no, podemos profundizar.',
     E'Tu enchaînes ou tu tires sur la corde ? La plupart se gèrent "bien"... jusqu''au mur.',
     'Pique légère.', 1),
    ('es','weight-men','M2','negative',
     E'Sin problema [nombre], quería hacerte la pregunta, no presionarte 🙏\n\nQue te vaya bien con tus entrenamientos. Si la nutrición se vuelve un tema un día, escríbeme.',
     E'Pas de souci, je voulais poser la question. Bonne continuation.',
     'Fermeture virile.', 1),
    ('es','weight-men','M2','question',
     E'Buena pregunta.\n\nConcretamente, acompaño hombres en nutrición — performance, recuperación, masa limpia o pérdida de grasa según objetivo. Trabajo con proteínas, suplementos targeted (creatina, BCAAs) como complemento.\n\nAntes de contarte más — dime qué te bloquea o qué quieres mejorar.',
     E'Coaching nutrition hommes : perf, récup, masse ou cut, protéines + supplements.',
     'Technique précis.', 1),
    ('es','weight-men','M3','hot',
     E'Lo que describes es clásico, [nombre], y hay forma de destrabarlo.\n\nMejor que un montón de texto — ¿20 min en Zoom? Te muestro cómo analizo la alim deportiva masculina, tú decides si te late. Cero compromiso, no te vendo nada de oficio.\n\n¿[día 1] o [día 2]?',
     E'Visio 20 min, choix de jour.',
     'Format court.', 1),
    ('es','weight-men','M3','lukewarm',
     E'Sin problema [nombre], tómate tu tiempo.\n\nSi quieres que te comparta 2-3 cosas concretas sobre [su bloqueo] sin pasar por una llamada, dime. Si no, todo bien, nos volvemos a cruzar cuando quieras.',
     E'Offre 2-3 tips concrets.',
     'Tips concrets.', 1),
    -- sport
    ('es','sport','M2','positive',
     E'Top [nombre] 💪\n\nCuéntame más: ¿cuál es tu volumen semanal, y qué es lo que más te molesta? ¿Recuperación entre sesiones, energía al final de salidas largas, problemas digestivos en carrera, sueño?\n\nSegún el bloqueo, no te digo lo mismo.',
     E'Top. Volume hebdo ? Point bloquant ?',
     'Le sportif aime être traité en sportif.', 1),
    ('es','sport','M2','vague',
     E'Qué bueno si rueda, [nombre].\n\nSolo por curiosidad: ¿logras encadenar semanas sin caída, o hay momentos donde sientes que jalas la cuerda? La mayoría se manejan "bien"... hasta la pared.\n\nSi pasa o si quieres optimizar, aquí estoy.',
     E'Si ça roule top, mais le mur arrive à tous.',
     'Universal.', 1),
    ('es','sport','M2','negative',
     E'Sin problema [nombre], quería preguntarte, no presionarte 🙏\n\nQue te vaya bien entrenando.',
     E'Pas de souci. Bonne continuation.',
     'Fermeture propre.', 1),
    ('es','sport','M2','question',
     E'Buena pregunta. Acompaño deportistas en nutrición: pre/per/post-esfuerzo, recuperación, energía en distancias largas. Productos targeted como complemento.\n\nDime qué te bloquea para orientar mi respuesta.',
     E'Nutrition sport, périodisation, produits ciblés. Dis-moi ce qui te bloque.',
     'Technique sport.', 1),
    ('es','sport','M3','hot',
     E'Lo que describes es clásico [nombre], hay mucho que destrabar.\n\n¿20 min en Zoom? Te muestro cómo analizo alim deportiva. Cero compromiso. ¿[día 1] o [día 2]?',
     E'Visio 20 min, choix jour.',
     'Format court.', 1),
    ('es','sport','M3','lukewarm',
     E'Sin problema, tómate tu tiempo. Si quieres 2-3 tips concretos sobre [bloqueo] sin llamada, dime.',
     E'2-3 tips concrets.',
     'Tips concrets.', 1),
    -- business
    ('es','business','M2','positive',
     E'Cool [nombre], gracias por abrirte 🙏\n\nEn corto: es en wellness (nutrición, bienestar). Trabajo con un equipo internacional. El modelo me permite construir un ingreso al lado de [tu actividad].\n\nAntes de entrar en detalle — ¿qué te empuja a explorarlo ahora? ¿Objetivo preciso (ingreso extra, independencia, reconversión), o curiosidad?',
     E'Cadre clair + question qualifiante.',
     'Mesure motivation.', 1),
    ('es','business','M2','vague',
     E'Pregunta legítima [nombre].\n\nVoy a ser franco/a: es un modelo donde desarrollas una actividad de distribución de productos wellness, con un equipo que te forma. Hay inversión inicial, y crece según el tiempo que metas.\n\n¿Captas el panorama? Si no es lo tuyo, dímelo directo — prefiero un "no" claro a un "sí" falso.',
     E'Transparence radicale.',
     'Crédibilité.', 1),
    ('es','business','M2','negative',
     E'Sin problema [nombre], gracias por responder franco 🙏\n\nTenía en mi cabeza que tal vez no era lo tuyo, total OK. Si un día la conversación tiene sentido, llegará natural.',
     E'Fermeture chaleureuse mais nette.',
     'Le prospect revient parfois.', 1),
    ('es','business','M2','question',
     E'Vas al grano, me gusta [nombre].\n\nTrabajo con [empresa] en la parte nutrición/wellness. La empresa existe hace [X años] y está en [Y países].\n\nPero el producto es solo la mitad. La otra mitad es el modelo de distribución. Más simple explicarlo en Zoom. Si ya tienes opinión cerrada sobre este tipo de modelo, dime — no perdemos tiempo.',
     E'Transparence + filtre.',
     'Pas de tour autour du pot.', 1),
    ('es','business','M3','hot',
     E'Lo que me dices es exactamente lo que quería escuchar [nombre] — suenas claro/a en lo que buscas.\n\nPara ir más lejos, ¿30 min en Zoom? Te presento el modelo bien: empresa, productos, remuneración, lo que requiere tiempo e inversión. Preguntas todo. Después vemos.\n\nSin pitch escondido, sin urgencia falsa. ¿[día 1] o [día 2]?',
     E'Visio 30 min, présentation complète, transparence.',
     'Format business sérieux.', 1),
    ('es','business','M3','lukewarm',
     E'Siento que no es el timing [nombre], sin problema.\n\nTe dejo mi contacto. Cuando te diga "voy a investigar esa onda", escríbeme. Si nunca, no problem.',
     E'Posé, pas d''insistance.',
     'Le prospect revient parfois.', 1);
end if; end$$;

-- 8. OBJECTIONS ──────────────────────────────────────────────────────────────
insert into public.prospection_objections (market_code, slug, title, meaning, bad_response, good_response, good_response_fr, warning, position) values
  ('es','cest-cher','Está caro',
   'O no ve el valor, o no puede / no quiere meter esa lana en eso.',
   'Minimizar ("es el precio de un café"), o dar descuento desde la primera objeción.',
   E'Te capto [nombre]. ¿Caro comparado con qué? ¿Y qué haría que valga la pena para ti?\n\nNo te pregunto para convencerte — según tu respuesta, o no es el momento, o vemos si hay una fórmula más adaptada.',
   E'Cher par rapport à quoi ? Qu''est-ce qui le rendrait worth ?', null, 1),
  ('es','pas-le-temps','No tengo tiempo',
   'O no es prioridad, o miedo de que ocupe más tiempo del que tiene.',
   E'"¡Pero es rápido!" — flojera que no atiende la objeción.',
   E'Es justo, y seguido es porque no tomamos el tiempo que las cosas no se mueven.\n\nSi te digo "esperamos 3 meses y me dices", ¿está abierto o es un no firme? No hay mala respuesta.',
   E'Si on attend 3 mois et tu me redis, c''est ouvert ou non ferme ?', null, 2),
  ('es','herbalife-mlm','¿Es Herbalife / MLM / pirámide?',
   'Miedo de que la estafen, o mala experiencia (pariente decepcionado).',
   'Negar, decir "no es diferente", esquivar.',
   E'Sí es [marca], y sí es distribución multinivel. No es pirámide ilegal — la diferencia es que hay producto real consumido por clientes finales.\n\nCirculan cosas verdaderas y falsas sobre este modelo. Dime qué te bloquea exactamente y te respondo franco.',
   E'Oui c''est [marque], distribution multi-niveaux, pas pyramidal.',
   'Mentir détruit ta crédibilité pour toujours.', 3),
  ('es','deja-essaye','Ya probé X y no funcionó',
   'Decepcionada, desconfiada, quiere asegurarse de que no será lo mismo.',
   E'"¡Pero es diferente!" — sin explicar por qué.',
   E'Te escucho [nombre]. ¿Qué pasó concretamente? Según donde se trabó — motivación, método, acompañamiento, producto — te digo si vas a caer en la misma trampa. Sin promesas mágicas.',
   E'Qu''est-ce qui s''est passé ? Selon où ça a coincé je te dis si tu retombes.', null, 4),
  ('es','en-parler-conjoint','Tengo que hablarlo con mi pareja',
   'O decisión de pareja legítima, o excusa para escapar amable.',
   E'"¡Es tu decisión!" o "¡No necesitas su permiso!"',
   E'Por supuesto, sano hablarlo. ¿Quieres que te prepare un resumen claro para mostrarle, o prefieres explicarle tú? ¿Y concretamente, cuándo nos volvemos a hablar?',
   E'Tu veux un résumé clair ? On se redit quoi quand ?',
   'Le "quand" oblige à fixer date.', 5),
  ('es','je-reflechis','Lo voy a pensar',
   '90 % = "no" educado. 10 % = realmente necesita pensar.',
   E'"¡Tómate tu tiempo!" → la pierdes definitivamente.',
   E'OK [nombre] — ¿es más bien "sí pero necesito digerir", o "no pero no te lo quiero decir en cara"?\n\nLas dos están bien, solo quiero saber. Si es no, nos ahorramos tiempo. Si es sí madurando, calemos fecha.',
   E'"Oui mais je digère" ou "non mais je veux pas te le dire" ?', null, 6),
  ('es','trop-beau','Demasiado bueno para ser cierto',
   'Desconfianza sana. Buena señal en realidad.',
   'Sobrepasar las promesas para tranquilizar (efecto inverso).',
   E'Tienes razón en desconfiar. No es mágico. Hay trabajo detrás, no funciona para todos, los resultados dependen de ti.\n\nSi quieres te cuento también los lados menos glamurosos: lo que requiere, dónde la gente se rinde, por qué algunos fracasan.',
   E'T''as raison de te méfier. Pas magique.', null, 7),
  ('es','combien-tu-gagnes','¿Cuánto ganas tú?',
   'Quiere prueba concreta, no rollo.',
   'Soltar números fantásticos, o esquivar.',
   E'Te digo honesto: estoy en [X $/mes] tras [Y meses/años]. Para ser transparente, mis primeros meses eran [Z $]. Progresivo y depende del tiempo que metas y de con quién te rodeas.\n\nSi quieres te muestro los números oficiales de la empresa (ingresos promedio, son públicos y obligatorios).',
   E'Je suis à [X/mois] après [Y]. Earnings disclosure publique.',
   'NUNCA inventar cifras. Earnings disclosure obligatoria pública.', 8),
  ('es','ton-interet','Pero tú vas a ganar si yo me apunto',
   'Quiere asegurarse de que le hablas por su bien, no solo tu comisión.',
   'Negar o minimizar tu interés — percibido como deshonesto.',
   E'Sí es cierto, y mejor sea claro. Yo gano cuando alguien que apadrino produce — así que tengo cero interés en apadrinar a alguien que no lo va a hacer. Es más trabajo para nada.\n\nMi interés es trabajar con gente alineada. Si no eres tú, no problem, perdemos tiempo los dos.',
   E'Oui c''est vrai. Je gagne quand quelqu''un que j''ai parrainé fait du chiffre.', null, 9)
on conflict (market_code, slug) do nothing;

-- 9. FOLLOWUPS ───────────────────────────────────────────────────────────────
do $$ begin if (select count(*) from public.prospection_followups where market_code='es') = 0 then
  insert into public.prospection_followups (market_code, kind, day_offset, title, body, body_fr, warning, position) values
    ('es','post_call', 0, 'D0 — Justo después de la llamada',
     E'¡Gracias [nombre] por el intercambio! Como acordamos, te dejo digerir.\n\nRecap de lo que platicamos:\n1. [punto clave 1]\n2. [punto clave 2]\n3. [punto clave 3]\n\nSi tienes preguntas para mañana, escríbeme. Buena tarde 🙏',
     E'Merci pour l''échange ! Récap. Questions, écris-moi.', null, 1),
    ('es','post_call', 2, 'D+2 — Primer check',
     E'Hey [nombre], ¿cómo vas? ¿Tuviste tiempo de pensar o de plantear tus preguntas?\n\nDime dónde estás, aunque sea un no — más útil que el silencio.',
     E'T''as eu le temps de réfléchir ? Dis-moi où t''en es.', null, 2),
    ('es','post_call', 5, 'D+5 — Último mensaje',
     E'Hola [nombre], último mensaje de mi parte para no perseguirte 🙏\n\nSi aún no estás seguro/a, o prefieres retomar más tarde, dímelo. Si no, lo dejo y nos cruzaremos cuando estés listo/a.',
     E'Dernier message pour pas te poursuivre.',
     'Si pas de réponse au J+5, tu ARRÊTES.', 3),
    ('es','post_call', 30, 'D+30 — Reactivación',
     E'Hey [nombre], pasó un mes, solo quería saber 😊\n\n¿Dónde estás sobre [su objetivo]? Sin pitch, solo curiosidad.',
     E'Ça fait un mois, je prends des nouvelles.', null, 4),
    ('es','client_onboarding', 0, 'D0 — Día de la compra',
     E'¡Bienvenido/a [nombre] a la aventura! 💪 Te mando todo para el arranque. Cale un call para [día] para ver cómo te llevas con los productos, ¿te late?',
     E'Bienvenue ! Je t''envoie tout, on cale un appel.', null, 1),
    ('es','client_onboarding', 7, 'D+7 — Primera semana',
     E'Hey [nombre], ¡pasó la primera semana! ¿Cómo va? ¿Integraste [hábito principal]? Dime qué funciona y qué se traba.',
     E'Première semaine ! Comment ça va ?', null, 2),
    ('es','client_onboarding', 30, 'D+30 — Primer mes',
     E'¡Hey [nombre], ya pasó un mes! 🎉 ¿Hacemos un balance? Quiero ver juntos qué se movió y qué ajustamos para mes 2.',
     E'Déjà un mois 🎉 On fait un bilan ?', null, 3),
    ('es','reactivation_old', 90, 'D+90 — Prospecto antiguo',
     E'Hey [nombre], ¡pasó un buen rato!\n\nMe topé con tu perfil y me preguntaba dónde estás de [su objetivo de hace X meses]. Sin pitch, pura curiosidad.',
     E'Je tombe sur ton profil, où t''en es de [objectif] ?',
     'Solo con prospectos que mostraron interés inicial.', 1);
end if; end$$;

-- 10. CLOSING ────────────────────────────────────────────────────────────────
do $$ begin if (select count(*) from public.prospection_closing where market_code='es') = 0 then
  insert into public.prospection_closing (market_code, kind, title, body, body_fr, position) values
    ('es','signal','Pregunta sobre precio, fecha de arranque, plazo','Se proyecta mentalmente en la compra.', E'Projection mentale.', 1),
    ('es','signal','Habla en futuro','"Cuando sea cliente...", "si arranco en septiembre..." — proyección mental.', E'Parle au futur.', 2),
    ('es','signal','Menciona a otras personas','"Podría ayudar a mi hermana" — validando tanto que imagina recomendar.', E'Mentionne d''autres personnes.', 3),
    ('es','signal','Está de acuerdo con tu diagnóstico','"Es exactamente mi problema" — alineación máxima.', E'D''accord avec ton diagnostic.', 4),
    ('es','signal','Te pide repetir / clarificar','Quiere estar segura antes de comprometerse.', E'Veut être sûre.', 5),
    ('es','propose','Proponer la compra',
     E'OK [nombre], cubrimos todo. De lo que veo, estás alineado/a en [la necesidad] y ves cómo te puede ayudar.\n\n¿Arrancamos esta semana? Te mando el recap por escrito, te explico el pedido del kit / programa, y calamos un check en 10 días para el primer balance.',
     E'OK on a tout vu. On démarre cette semaine ? Récap + commande + check J+10.', 1),
    ('es','hesitation','Si duda al cierre',
     E'Siento que dudas, [nombre]. ¿Sobre qué exactamente? ¿Precio, timing, u otra cosa?\n\nDime qué bloquea, lo vemos juntos. Si no es el momento, no problem, esperamos.',
     E'Tu hésites — sur quoi ? Si pas le bon moment, on attend.', 1),
    ('es','final_no','Encajar un no final',
     E'Te capto [nombre], gracias por decirlo claro. Si un día cambia, escríbeme sin pena.\n\nQue te vaya bien con tus proyectos 🙏',
     E'Merci de me le dire clairement. Belle continuation.', 1);
end if; end$$;

-- 11. SPECIAL CASES ──────────────────────────────────────────────────────────
do $$ begin if (select count(*) from public.prospection_special_cases where market_code='es') = 0 then
  insert into public.prospection_special_cases (market_code, kind, title, body, body_fr, position) values
    ('es','reactivation_3_6m','Reactivar prospecto antiguo (3-6 meses)',
     E'Hey [nombre], ¡pasó un rato!\n\nMe topé con tu perfil y me preguntaba dónde estás de [su objetivo de hace X meses]. Sin pitch, pura curiosidad.',
     E'Je tombe sur ton profil, où t''en es ? Pas de pitch.', 1),
    ('es','ghost_after_exchange','Si te ghostea tras varios intercambios',
     E'[nombre], no quería insistir pero me gustaría entender dónde estás.\n\nSi es un no, es un no, y está OK. Dímelo simple, me evita preguntarme, y ya no recibes mensaje.',
     E'Si c''est non c''est non, dis-le simplement.', 1),
    ('es','referral_request','Pedido de recomendación (tras resultados)',
     E'Hey [nombre], espero que veas resultados en [su objetivo]. Quería preguntarte algo.\n\nSi conoces 1-2 personas en tu entorno que batallan con el mismo tema que tú antes — ¿estarías OK con presentármelas? Sin presión, solo si te late natural.',
     E'Si tu connais 1-2 personnes qui galèrent comme toi à l''époque, OK pour me les présenter ?', 1);
end if; end$$;

-- 12. STORYTELLING ───────────────────────────────────────────────────────────
do $$ begin if (select count(*) from public.prospection_storytelling where market_code='es') = 0 then
  insert into public.prospection_storytelling (market_code, profile_slug, kind, title, body, position) values
    ('es', null, 'structure_step', 'El punto de partida',
     'Dónde estaba — problema concreto, dolor. Sé preciso: "agotada todo el tiempo", "+12 kg desde mi embarazo", no "iba mal".', 1),
    ('es', null, 'structure_step', 'El clic',
     'Lo que me hizo moverme — evento preciso, idealmente con fecha. "En enero 2023, una amiga me habló de..."', 2),
    ('es', null, 'structure_step', 'El cambio',
     'Lo que pasó — transformación cuantificada si posible. "En 6 meses, -12 kg" más creíble que "cambié".', 3),
    ('es', null, 'structure_step', 'El por qué ahora',
     'Por qué comparto esto hoy. La frase que convierte historia en misión.', 4),
    ('es','weight-women','example', 'Ejemplo — Pérdida de peso',
     E'Durante 5 años estaba agotada todo el tiempo. Tres hijos, chamba demandante, y 12 kg de más desde mi último embarazo. Había probado todas las dietas, nunca funcionaba más de 3 meses.\n\nEn enero 2023, una amiga me habló de un enfoque diferente. No una dieta — una reeducación alimentaria con acompañamiento y productos que me ayudaron a aguantar.\n\nEn 6 meses, bajé los 12 kg, pero sobre todo recuperé energía. Y no los volví a subir.\n\nHoy comparto esto porque sé lo que es buscar por todos lados sin encontrar. Prefiero dar las llaves a las que aún batallan.', 1),
    ('es','business','example', 'Ejemplo — Business',
     E'Era [profesión] desde hace [X años]. Salario decente pero cero libertad. No vi crecer a mis hijos en los últimos 3 años.\n\nEn [mes año], crucé con alguien que me habló de esta actividad. La tomé por un MLM bidón al principio, dije no.\n\nSeis meses después, mirando mi agenda un domingo en la noche, entendí que era yo el que me la estaba perdiendo. Llamé de vuelta a la persona.\n\nHoy, [X meses después], tengo [resultado concreto]. Y sobre todo manejo mi tiempo.', 1),
    ('es', null, 'rule', 'Sé honesto/a',
     'Si tu camino es más corto o menos glamuroso, cuéntalo tal cual. La autenticidad le gana a la perfección.', 1),
    ('es', null, 'rule', 'Sin cifras absurdas',
     E'"Gané 10 000 € el primer mes" = nadie te cree.', 2),
    ('es', null, 'rule', 'Da fechas precisas',
     E'"En marzo 2023" es mil veces más creíble que "hace algún tiempo".', 3),
    ('es', null, 'rule', 'Asume las dificultades',
     E'"Al principio batallé, quería tirar la toalla a los 3 meses" tranquiliza a tu interlocutor.', 4);
end if; end$$;

-- 13. ROUTINES ───────────────────────────────────────────────────────────────
do $$ begin if (select count(*) from public.prospection_routines where market_code='es') = 0 then
  insert into public.prospection_routines (market_code, kind, title, detail, duration_minutes, position) values
    ('es','routine_30m','Escanear perfiles',
     'Escanea 30-40 perfiles, selecciona 15-20 calificados (ver flags §2).', 10, 1),
    ('es','routine_30m','Mandar M1s',
     'Manda 15-20 M1 personalizados. Máx 1 min por mensaje — si no encuentras detalle preciso, pasa.', 15, 2),
    ('es','routine_30m','Responder conversaciones',
     'Manejar conversaciones en curso. Prioridad a leads calientes.', 5, 3),
    ('es','routine_1h','Prospección M1',
     '25-30 mensajes personalizados. Targets más amplios, más variaciones.', 15, 1),
    ('es','routine_1h','Conversaciones activas',
     'Trabajo profundo en M2-M3 + agendar citas. Aquí construyes pipeline.', 30, 2),
    ('es','routine_1h','Seguimiento & contenido',
     'Seguimientos clientes, post del día Insta, D+2/D+5 post-Zoom.', 15, 3),
    ('es','pre_send_checklist','Personalicé [detalle de su perfil] con algo preciso (no genérico).', null, null, 1),
    ('es','pre_send_checklist','Mi mensaje no pitchea nada (sin producto, sin Zoom en M1).', null, null, 2),
    ('es','pre_send_checklist','Mi mensaje termina con pregunta abierta calificadora.', null, null, 3),
    ('es','pre_send_checklist','No más de 3 emojis.', null, null, 4),
    ('es','pre_send_checklist','Sin link en el M1 (filtro spam).', null, null, 5),
    ('es','pre_send_checklist','El tono es posado, no apurado.', null, null, 6),
    ('es','pre_send_checklist','Si dice no, tengo mensaje de cierre limpio listo.', null, null, 7);
end if; end$$;

commit;
