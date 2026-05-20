-- =============================================================================
-- Chantier #3 V4 — Seed PT (2026-05-19)
--
-- Marché PT = Brésil (priorité, top 5 mondial Herbalife) + Portugal.
-- Ton TRÈS chaleureux, "a gente" obligatoire (jamais "nós" formel), WhatsApp
-- OBLIGATOIRE après le 1er contact Insta. "Papo" = conversation décontractée.
-- =============================================================================

begin;

-- 1. MINDSET ─────────────────────────────────────────────────────────────────
do $$ begin if (select count(*) from public.prospection_mindset_blocks where market_code='pt') = 0 then
  insert into public.prospection_mindset_blocks (market_code, kind, title, body, position) values
    ('pt','truth','Não é jogo de volume cego, é jogo de triagem.',
     E'Seu trabalho não é convencer. Seu trabalho é achar as pessoas certas no momento certo. Se você manda 100 mensagens pra convencer 100 pessoas, esgota a motivação em uma semana. Se manda 100 mensagens pra identificar as 5 que estão prontas, constrói um negócio durável.', 1),
    ('pt','truth','Quanto mais relaxado/a, mais atrai.',
     E'O prospect sente na hora se você transpira o "preciso recrutar". Desapego atrai. Pressão repele. Se você precisa dessa venda pra pagar o aluguel, dá pra ver nas mensagens.', 2),
    ('pt','truth','O silêncio não é rejeição pessoal.',
     E'80 % das mensagens não vão ter resposta. Não significa que você é ruim. Significa que as pessoas estão ocupadas, não é o momento, ou não são o público certo. Continua.', 3),
    ('pt','error','Pitchar logo no primeiro recado.',
     E'Você perde 90 % dos prospects numa frase. O primeiro recado tem um objetivo só: pegar resposta. Não vender.', 1),
    ('pt','error','Mandar a mesma mensagem pra 50 pessoas.',
     E'Copy-paste se sente a quilômetros. Personaliza no mínimo [detalhe do perfil]. Se não acha detalhe preciso, não é bom prospect — passa pro próximo.', 2),
    ('pt','error','Insistir em D+1, D+2, D+3.',
     E'Você vira de coach a stalker em 48 h. Um seguimento só, no D+3, nunca mais.', 3),
    ('pt','error','Argumentar nos "não".',
     E'Um "não" bem fechado às vezes volta 6 meses depois. Um "não" mal manejado nunca volta.', 4),
    ('pt','error','Mentir sobre o negócio.',
     E'Se te perguntam "é MLM?", a resposta honesta é sim. Mentir destrói sua credibilidade pra sempre.', 5);
end if; end$$;

-- 2. METRICS ─────────────────────────────────────────────────────────────────
do $$ begin if (select count(*) from public.prospection_metrics where market_code='pt') = 0 then
  insert into public.prospection_metrics (market_code, kind, label, value_min, value_max, value_unit, hint, position) values
    ('pt','funnel_step','M1 enviadas',                       100, 100, 'msgs',     'Baseline iniciante', 1),
    ('pt','funnel_step','Respostas recebidas',                15,  25, 'respostas','15-25 % se bem personalizado', 2),
    ('pt','funnel_step','Conversas qualificadas',              5,  10, 'convs',    '5-10 diálogos engajados', 3),
    ('pt','funnel_step','Calls / Zoom agendados',              1,   3, 'calls',    'Descoberta', 4),
    ('pt','funnel_step','Novos clientes',                      0,   1, 'clientes', 'Primeiro cliente: 100-200 M1', 5),
    ('pt','pipeline_target','M1 enviadas aguardando',  50, 100, 'msgs',   'Mantém estoque constante', 1),
    ('pt','pipeline_target','Conversas ativas',        10,  20, 'convs',  'Você malabarismo essas', 2),
    ('pt','pipeline_target','Calls próximos 7 dias',    2,   5, 'calls',  'Se menos, aumenta M1', 3),
    ('pt','pipeline_target','Clientes em fechamento',   1,   3, 'leads',  'Seus finalistas', 4),
    ('pt','weekly_kpi','M1 enviadas',           null, null, 'count', 'Mede seu esforço. Abaixo de 50/sem = pouco.', 1),
    ('pt','weekly_kpi','Taxa de resposta',      null, null, 'pct',   'Abaixo de 15 % = revê qualidade M1.', 2),
    ('pt','weekly_kpi','Conversão call→cliente',null, null, 'pct',   'Abaixo de 20 % = revê fechamento.', 3);
end if; end$$;

-- 3. PROFILE FLAGS ───────────────────────────────────────────────────────────
do $$ begin if (select count(*) from public.prospection_profile_flags where market_code='pt') = 0 then
  insert into public.prospection_profile_flags (market_code, profile_slug, flag_type, text, position) values
    ('pt','weight-women','green','Atividade recente (post < 2 semanas)', 1),
    ('pt','weight-women','green','Posts pessoais com engagement', 2),
    ('pt','weight-women','green','Bio clara com intenção', 3),
    ('pt','weight-women','green','Sem coach concorrente na mesma niche', 4),
    ('pt','weight-women','red','Perfil privado sem contexto', 1),
    ('pt','weight-women','red','Conta 100 % business / loja / afiliação', 2),
    ('pt','weight-women','red','Sem post há 6+ meses', 3),
    ('pt','weight-women','red','Milhares de seguidores baixo engagement (fake)', 4),
    ('pt','weight-men','green','Atividade recente (post < 2 semanas)', 1),
    ('pt','weight-men','green','Posts esporte, performance, energia, vida pro intensa', 2),
    ('pt','weight-men','green','Bio menciona objetivo claro (cutting, bulk, energia)', 3),
    ('pt','weight-men','green','Sem coach concorrente', 4),
    ('pt','weight-men','red','Perfil privado sem contexto', 1),
    ('pt','weight-men','red','Bio centrada em aparência pura (modelo, shoots)', 2),
    ('pt','weight-men','red','Sem post há 6+ meses', 3),
    ('pt','weight-men','red','Influencer academia saturado', 4),
    ('pt','sport','green','Ativo/a na prática (post treino recente)', 1),
    ('pt','sport','green','Menciona objetivos precisos (prova, PR, temporada)', 2),
    ('pt','sport','green','Engagement genuíno', 3),
    ('pt','sport','green','Não patrocinado / não coacheado', 4),
    ('pt','sport','red','Conta pro-atleta com patrocínios', 1),
    ('pt','sport','red','Sem post há 6+ meses', 2),
    ('pt','sport','red','"Shopping fitness" sem prática real', 3),
    ('pt','sport','red','Bio já diz "coach nutrição esportiva"', 4),
    ('pt','business','green','Atividade recente, posts pessoais', 1),
    ('pt','business','green','Bio clara com profissão ou status empreendedor', 2),
    ('pt','business','green','Engagement real (comentários construídos)', 3),
    ('pt','business','green','Não top distri de MLM concorrente', 4),
    ('pt','business','red','Bio = só link afiliação MLM concorrente', 1),
    ('pt','business','red','Muitos followers / zero engagement (fake)', 2),
    ('pt','business','red','Sem foto / sem post pessoal', 3),
    ('pt','business','red','Stories saturadas de pitches', 4);
end if; end$$;

-- 4. SOURCES ─────────────────────────────────────────────────────────────────
do $$ begin if (select count(*) from public.prospection_sources where market_code='pt') = 0 then
  insert into public.prospection_sources (market_code, profile_slug, kind, label, detail, position) values
    ('pt', null, 'hashtag_advanced','Ratio ideal dos posts Insta',
     E'60 % valor · 30 % pessoal · 10 % CTA. Erro clássico: só fotos de produtos/resultados. Te seguem por VOCÊ.', 1),
    ('pt', null, 'hashtag_advanced','Método scan perfil 30 segundos',
     E'Antes de M1, verifica: (1) atividade recente · (2) engagement genuíno · (3) bio com intenção · (4) sem coach concorrente.', 2),
    ('pt','weight-women','fb_groups','Grupos FB locais bem-estar',
     'Procura: "emagrecer [cidade]", "mãe saudável", "reeducação alimentar". Aporta valor ANTES de DM.', 1),
    ('pt','weight-women','irl','Saída de creche / escola',
     'Mães 30-45, horário 8h30/16h30, tom natural acolhedor. Sem pitch direto, criar vínculo.', 1),
    ('pt','weight-women','irl','Academias (aulas coletivas)',
     'Pilates, yoga, body pump. Evita área de musculação pesada.', 2),
    ('pt','weight-women','recommendations','Rede pessoal + clientes atuais',
     'Sua melhor fonte de prospects qualificados. Ver §8.', 1),
    ('pt','weight-women','inbound_content','Conteúdo Insta/TikTok emagrecimento',
     'Depoimentos, "o que eu queria ter sabido", receitas. Leads entrantes 3× mais quentes.', 1),
    ('pt','weight-men','fb_groups','Grupos FB "voltar à forma homem [cidade]"',
     'Posts sobre ganho de massa, cutting, energia. Valor antes de DM.', 1),
    ('pt','weight-men','irl','Academias, CrossFit, esportes coletivos',
     'Futebol, basquete, padel. 7-9h ou 19-21h. Tom natural direto.', 1),
    ('pt','weight-men','recommendations','Rede pro + clientes homens',
     'Indicação = canal #1 nesse target.', 1),
    ('pt','weight-men','inbound_content','Conteúdo performance / recovery / energia',
     'Evita "bem-estar suave" → target mulher. Fala performance, sono, massa magra.', 1),
    ('pt','sport','fb_groups','Grupos corrida / triatlo / CrossFit locais',
     'Posts "como vocês gerenciam nutrição nas saídas longas?". Aporta valor.', 1),
    ('pt','sport','irl','Box CrossFit, clubes corrida, triatlo',
     'Presença física = credibilidade. Engaja após sessão.', 1),
    ('pt','sport','recommendations','Coaches prepa física, fisios, médicos esporte',
     'Parcerias cruzadas. Win-win cliente.', 1),
    ('pt','sport','inbound_content','Conteúdo nutrição pré/peri/pós esforço',
     'Strava clubs, contas de coaches. Atletas amadores moram lá.', 1),
    ('pt','business','fb_groups','Grupos "side hustle", "empreendedor [cidade]"',
     'Moderação mais leve que Insta. Valor business antes do pitch.', 1),
    ('pt','business','irl','BNI, coworking, meetups empreendedor',
     'Networking. Sem vibe MLM — tom de par.', 1),
    ('pt','business','recommendations','Rede pro existente, ex-colegas',
     'Boca a boca segue sendo o canal mais crível.', 1),
    ('pt','business','inbound_content','Conteúdo mindset, independência, jornada pessoal',
     'Evita "fica rico", prioriza "essa é minha jornada".', 1);
end if; end$$;

-- 5. HASHTAGS ────────────────────────────────────────────────────────────────
update public.prospection_hashtags set category = 'mainstream'
  where market_code = 'pt' and hashtag in (
    '#emagrecer','#perdadepeso','#vidasaudavelbrasil','#reeducacaoalimentar',
    '#academiabrasil','#fitnessbrasil','#esportebrasil',
    '#empreendedorbrasil','#liberdadefinanceira','#empreendedorismo'
  );

update public.prospection_hashtags set category = 'niche'
  where market_code = 'pt' and hashtag in (
    '#mamaesaudavel','#transformacao','#vidasaudavel2026','#bemestarfeminino','#emagrecersaudavel','#alimentacaoconsciente',
    '#crossfitbr','#correrbrasil','#nutricaoesportiva','#recuperacaomuscular','#atletaamador','#performanceesportiva',
    '#negociodecasa','#sidehustlebrasil','#empreendedoradigital','#liberdadefinanceira2026','#maeempreendedora','#negociowellness'
  );

update public.prospection_hashtags set
  category = 'cross',
  crossover_hint = 'Cruzar com #mamaesaudavel ou #pos-parto para nicho mães.'
  where market_code = 'pt' and profile_slug = 'weight-women' and hashtag = '#emagrecer';

update public.prospection_hashtags set
  category = 'cross',
  crossover_hint = 'Cruzar com hashtag cidade (#saopaulo #rio) para target local.'
  where market_code = 'pt' and profile_slug = 'sport' and hashtag = '#correrbrasil';

insert into public.prospection_hashtags (market_code, profile_slug, hashtag, category, crossover_hint, position) values
  ('pt','weight-men','#homemfit','mainstream',null,1),
  ('pt','weight-men','#ganhardemassa','mainstream',null,2),
  ('pt','weight-men','#perderbarriga','mainstream',null,3),
  ('pt','weight-men','#dadbodbrasil','niche',null,4),
  ('pt','weight-men','#paifit','niche',null,5),
  ('pt','weight-men','#fitness40homens','niche',null,6),
  ('pt','weight-men','#recompcorporal','niche',null,7),
  ('pt','weight-men','#homemocupado','cross','Cruzar com hashtag profissão/idade (#paientepreneur, #ceobr) para target 30-50 ativo.',8)
on conflict (market_code, profile_slug, hashtag) do nothing;

-- 6. SCRIPTS M1 weight-men ───────────────────────────────────────────────────
do $$ begin if (select count(*) from public.prospection_scripts where market_code='pt' and profile_slug='weight-men') = 0 then
  insert into public.prospection_scripts (market_code, profile_slug, platform, body, body_fr, tip, position, kind, label, language_label) values
    ('pt','weight-men','insta',
     E'Oi [nome]!\n\nVi seu post sobre [detalhe do perfil]. Trabalho com homens em nutrição e voltar à forma — principalmente cutting, energia e recovery quando você junta trampo intenso e treino.\n\nPergunta rápida: você tá mais focado em cutting, ganho limpo de massa, ou só recuperar energia no dia a dia?',
     E'Vu ton post. Coaching nutrition hommes : cutting, énergie, récup. Tu es plutôt cut, bulk propre, ou retrouver de l''énergie ?',
     'BR ton direct mas chaleureux. "Trampo" = boulot, mot oral.',
     1, 'first_contact', 'Instagram DM · Primeiro contato', '🇧🇷 Português (BR)'),
    ('pt','weight-men','whatsapp',
     E'Oi [nome]! Sou [seu nome], a gente se conheceu no [contexto]. Você me falou de [cutting / energia / treino]. Como tá indo?',
     E'Salut, on s''est connus via [contexte]. Tu m''avais parlé de [détail]. Tu en es où ?',
     'BR WhatsApp OBLIGATOIRE après Insta. "A gente" pas "nós".',
     1, 'first_contact', 'WhatsApp · Contato direto', '🇧🇷 Português (BR)'),
    ('pt','weight-men','fb',
     E'Oi [nome], vi seu post no [grupo] sobre [detalhe]. Sou coach nutrição em [cidade], trabalho com homens 30-50 voltando à forma — principalmente quem junta trampo pesado e não quer o corpo ceder.\n\nVocê tá onde? Procurando algo específico ou testando?',
     E'Coach nutrition à [ville], hommes 30-50 sur la remise en forme. Tu en es où ?',
     'BR FB Messenger plus posé. Groupes "voltar à forma" mine d''or.',
     1, 'first_contact', 'Facebook Messenger · Primeiro contato', '🇧🇷 Português (BR)'),
    ('pt','weight-men','sms',
     E'Oi [nome], é [seu nome]. A gente tinha falado de [contexto]. Se você ainda tá com a ideia de [objetivo], me fala, podemos bater papo essa semana.',
     E'Salut, c''est [ton prénom]. On avait parlé de [contexte]. Si tu es toujours sur [objectif], dis-moi.',
     'BR SMS court. "Bater papo" = converser casualement.',
     1, 'first_contact', 'SMS · Curto & posado', '🇧🇷 Português (BR)');
end if; end$$;

-- 7. REPLY TREE ──────────────────────────────────────────────────────────────
do $$ begin if (select count(*) from public.prospection_reply_tree where market_code='pt') = 0 then
  insert into public.prospection_reply_tree (market_code, profile_slug, level, branch, body, body_fr, tip, position) values
    ('pt','weight-women','M2','positive',
     E'Top você me contar, [nome] 🙏\n\nPra te responder melhor — é um objetivo que tem há muito tempo ou surgiu agora? E já testou coisas que não rolaram?\n\nTô perguntando porque dependendo de onde tá, compartilho coisas concretas ou nada. Depende de você.',
     E'Top. Objectif récent ou de longue date ?', 'On creuse.', 1),
    ('pt','weight-women','M2','vague',
     E'Te entendo, [nome]. Rola muito assim — você sente que algo tem que mudar, mas não sabe o quê.\n\nOutro ângulo: o que mais te incomoda hoje? O número da balança, como você se sente nas roupas, sua energia, sua relação com a comida? Geralmente tem um ponto que se destaca.',
     E'Quel est LE point qui te dérange ?', 'Question fermée qui ouvre.', 1),
    ('pt','weight-women','M2','negative',
     E'Sem problema [nome], obrigado/a por reservar tempo pra responder 🙏\n\nBoa continuação. Se algum dia mudar, me chama. Aproveita!',
     E'Pas de souci, belle continuation.', 'Fermeture propre.', 1),
    ('pt','weight-women','M2','question',
     E'Boa pergunta.\n\nResumindo, acompanho em nutrição — sem dieta restritiva. Trabalhamos equilíbrio, energia e hábitos duradouros. Uso produtos naturais como complemento quando faz sentido.\n\nMas antes de te contar mais, me fala onde você tá. É isso que vai dizer se o que faço pode te ajudar.',
     E'Coaching nutrition pas régime.', 'Réponse courte puis recentre.', 1),
    ('pt','weight-women','M3','hot',
     E'Obrigado/a por dividir tudo isso, [nome], é precioso 🙏\n\nO que você descreve, vejo muito. Boa notícia: dá pra resolver com a abordagem certa.\n\nPrefiro não jogar tudo escrito. 15-20 min de Zoom essa semana? Te mostro como trabalho, você decide se cola. Zero compromisso.\n\n[dia 1] ou [dia 2]?',
     E'Visio 15-20 min, zéro engagement, choix.', 'Choix de date.', 1),
    ('pt','weight-women','M3','lukewarm',
     E'Sem problema [nome], não quero forçar.\n\nTe deixo meu contato. Quando bater, me chama. E se quiser algo concreto pra testar enquanto isso, me fala, compartilho.',
     E'Je laisse mon contact + tip concret.', 'Échantillon de valeur.', 1),
    ('pt','weight-men','M2','positive',
     E'Top você ir direto ao ponto, [nome] 💪\n\nMe conta mais: quantas sessões por semana, e o que tá te travando? Recovery, energia no fim do dia, ganho de gordura mesmo treinando, sono?\n\nDependendo de onde trava, não falo a mesma coisa.',
     E'Top cash. Combien de séances ? Qu''est-ce qui bloque ?', 'Vocabulaire perf.', 1),
    ('pt','weight-men','M2','vague',
     E'OK [nome], te capto.\n\nPergunta mais direta: consegue emendar semanas sem queda de energia, ou tem momentos que sente que tá puxando a corda?\n\nA maioria dos caras que vejo se vira "bem"... até bater no muro. Se tá no primeiro caso, ótimo. Se não, dá pra cavar.',
     E'Tu enchaînes ou tu tires sur la corde ?', 'Pique légère.', 1),
    ('pt','weight-men','M2','negative',
     E'Sem problema [nome], queria fazer a pergunta, não forçar 🙏\n\nBoa continuação nos treinos.',
     E'Pas de souci. Bonne continuation.', 'Fermeture virile.', 1),
    ('pt','weight-men','M2','question',
     E'Boa pergunta.\n\nConcretamente, acompanho homens em nutrição — performance, recovery, bulk limpo ou cutting conforme o objetivo. Trabalho com proteínas, suplementos targeted (creatina, BCAAs) como complemento de uma alim sólida.\n\nMe fala o que te trava ou o que quer melhorar.',
     E'Coaching nutrition hommes : perf, récup, bulk ou cut.', 'Technique.', 1),
    ('pt','weight-men','M3','hot',
     E'O que você descreve é clássico [nome], dá pra destravar bastante.\n\nMelhor que parede de texto — 20 min de Zoom? Te mostro como analiso alim esportiva masculina. Zero compromisso, não te vendo nada de oficio.\n\n[dia 1] ou [dia 2]?',
     E'Visio 20 min.', 'Format court.', 1),
    ('pt','weight-men','M3','lukewarm',
     E'Sem problema [nome], digere com calma.\n\nSe quiser que eu compartilhe 2-3 coisas concretas sobre [seu travamento] sem passar por call, me fala. Senão, nos cruzamos quando quiser.',
     E'2-3 tips concrets.', 'Tips concrets.', 1),
    ('pt','sport','M2','positive',
     E'Top [nome] 💪\n\nMe conta mais: qual seu volume semanal, e o que mais te incomoda? Recovery entre sessões, energia no fim de saídas longas, problemas digestivos em prova, sono?',
     E'Top. Volume hebdo, point bloquant ?', 'Le sportif aime être traité en sportif.', 1),
    ('pt','sport','M2','vague',
     E'Maneiro se tá rolando, [nome].\n\nCuriosidade: você emenda semanas sem queda, ou tem momentos que tá puxando a corda? Maioria se vira "bem"... até o muro.',
     E'Sympa si ça roule. Mais le mur arrive à tous.', 'Universal.', 1),
    ('pt','sport','M2','negative',
     E'Sem problema [nome] 🙏 Boa continuação nos treinos.',
     E'Pas de souci.', 'Fermeture propre.', 1),
    ('pt','sport','M2','question',
     E'Boa pergunta. Acompanho atletas em nutrição: pré/peri/pós-esforço, recovery, energia em longas distâncias. Produtos targeted como complemento. Me fala o que te trava.',
     E'Nutrition sport.', 'Technique.', 1),
    ('pt','sport','M3','hot',
     E'Clássico [nome], dá pra destravar muito. 20 min de Zoom? Zero compromisso. [dia 1] ou [dia 2]?',
     E'Visio 20 min.', 'Format court.', 1),
    ('pt','sport','M3','lukewarm',
     E'Sem problema, digere. 2-3 tips concretos sobre [travamento] sem call se quiser.',
     E'Tips.', 'Concrets.', 1),
    ('pt','business','M2','positive',
     E'Maneiro [nome], obrigado/a por se abrir 🙏\n\nResumindo: é em wellness (nutrição, bem-estar). Trabalho com equipe internacional. O modelo me permite construir uma renda paralela à [sua atividade].\n\nAntes de entrar em detalhe — o que te empurra a explorar isso agora? Objetivo preciso (renda extra, independência, reconversão), ou curiosidade?',
     E'Cadre + question qualifiante.', 'Mesure motivation.', 1),
    ('pt','business','M2','vague',
     E'Pergunta legítima [nome].\n\nVou ser franco/a: é um modelo onde você desenvolve uma atividade de distribuição de produtos wellness, com uma equipe que te forma. Tem investimento inicial, e cresce conforme o tempo que você mete.\n\nPegou o quadro? Se não é seu lance, me fala direto.',
     E'Transparence radicale.', 'Crédibilité.', 1),
    ('pt','business','M2','negative',
     E'Sem problema [nome], obrigado/a por responder franco 🙏\n\nEu já tinha marcado na cabeça que talvez não fosse seu lance. Se um dia a conversa fizer sentido, vai acontecer natural.',
     E'Fermeture chaleureuse mais nette.', 'Prospect revient parfois.', 1),
    ('pt','business','M2','question',
     E'Vai direto ao ponto, gosto [nome].\n\nTrabalho com [empresa] na parte nutrição/wellness. A empresa existe há [X anos] e tá em [Y países].\n\nMas o produto é só metade. A outra metade é o modelo de distribuição. Mais simples explicar em Zoom. Se já tem opinião fechada, me fala — não perde tempo.',
     E'Transparence + filtre.', 'Pas de tour autour du pot.', 1),
    ('pt','business','M3','hot',
     E'O que você me fala é exatamente o que eu queria ouvir [nome] — você parece claro/a no que busca.\n\nPra ir mais longe, 30 min de Zoom? Te apresento o modelo direito: empresa, produtos, remuneração, tempo e investimento exigidos. Você pergunta tudo. Depois a gente vê.\n\nSem pitch escondido, sem urgência falsa. [dia 1] ou [dia 2]?',
     E'Visio 30 min, transparence totale.', 'Format business sérieux.', 1),
    ('pt','business','M3','lukewarm',
     E'Sinto que não é o timing [nome], sem problema.\n\nTe deixo meu contato. Quando bater "vou cavar essa história", me chama.',
     E'Posé.', 'Prospect revient.', 1);
end if; end$$;

-- 8. OBJECTIONS ──────────────────────────────────────────────────────────────
insert into public.prospection_objections (market_code, slug, title, meaning, bad_response, good_response, good_response_fr, warning, position) values
  ('pt','cest-cher','Tá caro',
   'Ou não vê o valor, ou não pode/quer botar essa grana nisso.',
   'Minimizar ("é o preço de um café"), ou dar desconto na primeira objeção.',
   E'Entendo [nome]. Caro comparado com o quê? E o que faria valer a pena pra você?\n\nNão tô perguntando pra te convencer — dependendo da resposta, ou não é o momento, ou a gente vê uma fórmula mais adaptada.',
   E'Cher par rapport à quoi ? Pas pour convaincre, juste pour savoir.', null, 1),
  ('pt','pas-le-temps','Não tenho tempo',
   'Ou não é prioridade, ou medo que tome mais tempo do que tem.',
   E'"Mas é rápido!" — preguiça que não responde a objeção.',
   E'Justo, e geralmente é porque a gente não tira tempo que as coisas não se mexem.\n\nSe te disser "esperamos 3 meses e você me fala", tá aberto ou é um não firme?',
   E'On attend 3 mois et tu me redis : ouvert ou non ferme ?', null, 2),
  ('pt','herbalife-mlm','É Herbalife / MLM / pirâmide?',
   'Medo de cair em golpe, ou má experiência (parente decepcionado).',
   'Negar, dizer "não é diferente", esquivar.',
   E'Sim é [marca], e sim é distribuição multinível. Não é pirâmide no sentido ilegal — a diferença é que existe produto real consumido por clientes finais.\n\nCirculam coisas verdadeiras e falsas sobre esse modelo. Me fala o que te trava exatamente, respondo franco.',
   E'Oui c''est [marque], distribution multi-niveaux.',
   'Mentir détruit ta crédibilité pour toujours.', 3),
  ('pt','deja-essaye','Já tentei X e não rolou',
   'Decepcionada, desconfiada, quer garantia de que não vai ser igual.',
   E'"Ah mas é diferente!" — sem explicar.',
   E'Te ouço [nome]. O que rolou concretamente? Dependendo de onde travou — motivação, método, acompanhamento, produto — te falo se vai cair na mesma cilada. Sem promessa mágica.',
   E'Qu''est-ce qui s''est passé concrètement ?', null, 4),
  ('pt','en-parler-conjoint','Tenho que falar com meu marido / minha esposa',
   'Ou decisão de casal legítima, ou desculpa pra fugir.',
   E'"Mas é decisão sua!" ou "Você não precisa do aval dele/dela!"',
   E'Claro, saudável conversar. Quer que eu prepare um resumo claro pra mostrar, ou prefere explicar você? E concretamente, quando a gente se fala de novo?',
   E'Tu veux un résumé clair ? On se redit quoi quand ?',
   'Le "quand" oblige à fixer date.', 5),
  ('pt','je-reflechis','Vou pensar',
   '90 % = "não" educado. 10 % = realmente precisa pensar.',
   E'"Vai com calma!" → perde definitivo.',
   E'OK [nome] — é mais "sim mas preciso digerir", ou "não mas não quero falar na sua cara"?\n\nOs dois tão OK, só quero saber. Se for não, poupa tempo dos dois.',
   E'"Oui mais je digère" ou "non mais je veux pas le dire" ?', null, 6),
  ('pt','trop-beau','Bom demais pra ser verdade',
   'Desconfiança saudável. Bom sinal na real.',
   'Aumentar as promessas pra tranquilizar (efeito inverso).',
   E'Tem razão de desconfiar. Não é mágico. Tem trabalho atrás, não funciona pra todos, resultados dependem de você.\n\nSe quiser conto também os lados menos glamurosos: o que exige, onde as pessoas largam.',
   E'T''as raison de te méfier. Pas magique.', null, 7),
  ('pt','combien-tu-gagnes','Quanto você ganha?',
   'Quer prova concreta, não lero-lero.',
   'Soltar números fantásticos, ou esquivar.',
   E'Te falo honesto: tô em [X R$/mês] depois de [Y meses/anos]. Pra ser transparente, meus primeiros meses eram [Z R$]. Progressivo e depende do tempo que mete e de quem se cerca.\n\nSe quiser te mostro os números oficiais da empresa (renda média dos distribuidores, é público e obrigatório).',
   E'Je suis à [X/mois] après [Y]. Earnings disclosure publique.',
   'NUNCA inventar cifras.', 8),
  ('pt','ton-interet','Mas você vai ganhar se eu entrar',
   'Quer ter certeza que você fala pelo bem dela, não só pela comissão.',
   'Negar ou minimizar seu interesse.',
   E'Sim é verdade, e melhor deixar claro. Eu ganho quando alguém que eu apadrinho produz — então tenho zero interesse em apadrinhar alguém que não vai. É mais trabalho à toa.\n\nMeu interesse é trabalhar com gente alinhada. Se não for você, sem problema, perdemos tempo os dois.',
   E'Oui c''est vrai. Je gagne quand quelqu''un que j''ai parrainé fait du chiffre.', null, 9)
on conflict (market_code, slug) do nothing;

-- 9. FOLLOWUPS ───────────────────────────────────────────────────────────────
do $$ begin if (select count(*) from public.prospection_followups where market_code='pt') = 0 then
  insert into public.prospection_followups (market_code, kind, day_offset, title, body, body_fr, warning, position) values
    ('pt','post_call', 0, 'D0 — Logo após o call',
     E'Obrigado/a [nome] pelo papo! Como combinamos, te deixo digerir.\n\nRecap rápido:\n1. [ponto 1]\n2. [ponto 2]\n3. [ponto 3]\n\nDúvidas até amanhã, me escreve. Boa noite 🙏',
     E'Merci pour l''échange ! Récap.', null, 1),
    ('pt','post_call', 2, 'D+2 — Primeiro check',
     E'Oi [nome], tudo bem? Teve tempo de pensar ou levantar suas perguntas?\n\nMe fala onde você tá, mesmo que seja não — mais útil que silêncio.',
     E'T''as eu le temps de réfléchir ?', null, 2),
    ('pt','post_call', 5, 'D+5 — Última mensagem',
     E'Oi [nome], última mensagem minha pra não te perseguir 🙏\n\nSe ainda não tá seguro/a, ou prefere retomar mais tarde, me fala. Senão deixo de lado.',
     E'Dernier message.', 'Si pas de réponse au J+5, tu ARRÊTES.', 3),
    ('pt','post_call', 30, 'D+30 — Reativação',
     E'Oi [nome], passou um mês, queria só saber 😊\n\nOnde tá em [seu objetivo]? Sem pitch, só curioso/a.',
     E'Ça fait un mois.', null, 4),
    ('pt','client_onboarding', 0, 'D0 — Dia da compra',
     E'Oi [nome]! Bem-vindo/a à aventura 💪 Te mando tudo pro arranque. A gente cala um call [dia] pra ver como você pega os produtos, beleza?',
     E'Bienvenue !', null, 1),
    ('pt','client_onboarding', 7, 'D+7 — Primeira semana',
     E'Oi [nome], primeira semana fechou! Como tá? Conseguiu integrar [hábito principal]? Me fala o que funciona e o que trava.',
     E'Première semaine !', null, 2),
    ('pt','client_onboarding', 30, 'D+30 — Primeiro mês',
     E'Oi [nome], já um mês 🎉 Faz um balanço com a gente? Quero ver o que mexeu e o que ajustamos pro mês 2.',
     E'Déjà un mois !', null, 3),
    ('pt','reactivation_old', 90, 'D+90 — Prospect antigo',
     E'Oi [nome], faz um tempo!\n\nMe deparei com seu perfil e fiquei curioso/a — onde você tá em [seu objetivo de X meses atrás]? Sem pitch.',
     E'Je tombe sur ton profil.',
     'Apenas com prospects que mostraram interesse inicial.', 1);
end if; end$$;

-- 10. CLOSING ────────────────────────────────────────────────────────────────
do $$ begin if (select count(*) from public.prospection_closing where market_code='pt') = 0 then
  insert into public.prospection_closing (market_code, kind, title, body, body_fr, position) values
    ('pt','signal','Faz perguntas precisas sobre preço, arranque, prazo','Se projeta mentalmente na compra.', E'Projection mentale.', 1),
    ('pt','signal','Fala no futuro','"Quando eu for cliente...", "se eu começar em setembro..."', E'Parle au futur.', 2),
    ('pt','signal','Menciona outras pessoas','"Podia ajudar minha irmã também" — validação forte.', E'Mentionne d''autres personnes.', 3),
    ('pt','signal','Concorda com seu diagnóstico','"É exatamente meu problema" — alinhamento máximo.', E'D''accord avec diagnostic.', 4),
    ('pt','signal','Te pede pra repetir / clarificar','Quer ter certeza antes de se comprometer.', E'Veut être sûre.', 5),
    ('pt','propose','Propor a compra',
     E'OK [nome], fechamos tudo. Do que vejo, você tá alinhado/a em [necessidade] e vê como isso pode ajudar.\n\nA gente arranca essa semana? Te mando o recap por escrito, te explico como pedir seu kit / programa, e calamos um check em 10 dias pro primeiro balanço.',
     E'On démarre cette semaine ?', 1),
    ('pt','hesitation','Se hesita no fechamento',
     E'Sinto que você tá hesitando, [nome]. Sobre o quê? Preço, timing, ou outra coisa?\n\nMe fala o que trava, vemos juntos. Se não é o momento, sem problema, esperamos.',
     E'Tu hésites — sur quoi ?', 1),
    ('pt','final_no','Aceitar um não final',
     E'Entendo [nome], obrigado/a por falar direto. Se um dia mudar, me chama.\n\nBoa continuação nos seus projetos 🙏',
     E'Merci de me le dire clairement.', 1);
end if; end$$;

-- 11. SPECIAL CASES ──────────────────────────────────────────────────────────
do $$ begin if (select count(*) from public.prospection_special_cases where market_code='pt') = 0 then
  insert into public.prospection_special_cases (market_code, kind, title, body, body_fr, position) values
    ('pt','reactivation_3_6m','Reativar prospect antigo (3-6 meses)',
     E'Oi [nome], faz um tempão!\n\nMe deparei com seu perfil e fiquei curioso/a sobre onde você tá em [seu objetivo de X meses atrás]. Sem pitch.',
     E'Je tombe sur ton profil. Pas de pitch.', 1),
    ('pt','ghost_after_exchange','Se te ghosteia depois de várias trocas',
     E'[nome], não queria insistir mas queria entender onde você tá.\n\nSe for não, é não, e tudo bem. Me fala simples, evita eu ficar me perguntando, e você não recebe mais mensagem.',
     E'Si c''est non c''est non, dis-le simplement.', 1),
    ('pt','referral_request','Pedido de indicação (após resultados)',
     E'Oi [nome], espero que esteja vendo resultados em [seu objetivo]. Queria te pedir uma coisa.\n\nSe você conhece 1-2 pessoas no seu entorno que batalham com o mesmo tema que você antigamente — topa me apresentar? Sem pressão, só se te parecer natural.',
     E'Si tu connais 1-2 personnes qui galèrent comme toi à l''époque ?', 1);
end if; end$$;

-- 12. STORYTELLING ───────────────────────────────────────────────────────────
do $$ begin if (select count(*) from public.prospection_storytelling where market_code='pt') = 0 then
  insert into public.prospection_storytelling (market_code, profile_slug, kind, title, body, position) values
    ('pt', null, 'structure_step', 'O ponto de partida',
     'Onde eu estava — problema concreto, dor. Seja preciso: "exausta o tempo todo", "+12 kg desde minha gravidez".', 1),
    ('pt', null, 'structure_step', 'O estalo',
     'O que me fez mexer — evento preciso, idealmente com data. "Em janeiro 2023, uma amiga me falou..."', 2),
    ('pt', null, 'structure_step', 'A mudança',
     'O que rolou — transformação quantificada se possível. "Em 6 meses, -12 kg" é mais crível que "eu mudei".', 3),
    ('pt', null, 'structure_step', 'O porquê agora',
     'Por que compartilho isso hoje. A frase que vira história em missão.', 4),
    ('pt','weight-women','example', 'Exemplo — Emagrecimento',
     E'Durante 5 anos eu vivia exausta. Três filhos, trampo pesado, e 12 kg a mais desde minha última gravidez. Tinha testado todas as dietas, nunca durava mais de 3 meses.\n\nEm janeiro 2023, uma amiga me falou de uma abordagem diferente. Não dieta — reeducação alimentar com acompanhamento e produtos que me ajudaram a aguentar.\n\nEm 6 meses, perdi os 12 kg, mas principalmente recuperei energia. E não recuperei os quilos.\n\nHoje compartilho isso porque sei o que é procurar em todo lugar sem achar. Prefiro dar as chaves pras que ainda batalham.', 1),
    ('pt','business','example', 'Exemplo — Business',
     E'Eu era [profissão] há [X anos]. Salário ok mas zero liberdade. Não vi meus filhos crescerem nos últimos 3 anos.\n\nEm [mês ano], cruzei com alguém que me falou dessa atividade. Tomei como MLM bidón no começo, disse não.\n\nSeis meses depois, olhando minha agenda num domingo à noite, entendi que era eu que tava passando ao lado. Liguei de volta pra pessoa.\n\nHoje, [X meses depois], tenho [resultado concreto]. E principalmente gerencio meu tempo.', 1),
    ('pt', null, 'rule', 'Mantém honesto/a',
     'Se sua jornada é mais curta ou menos glamurosa, conta do jeito que é. Autenticidade ganha de perfeição.', 1),
    ('pt', null, 'rule', 'Sem números mirabolantes',
     E'"Ganhei R$ 50 mil no primeiro mês" = ninguém acredita.', 2),
    ('pt', null, 'rule', 'Dá datas precisas',
     E'"Em março 2023" é mil vezes mais crível que "faz um tempo".', 3),
    ('pt', null, 'rule', 'Assume as dificuldades',
     E'"No começo eu sofri, quis largar com 3 meses" tranquiliza seu interlocutor.', 4);
end if; end$$;

-- 13. ROUTINES ───────────────────────────────────────────────────────────────
do $$ begin if (select count(*) from public.prospection_routines where market_code='pt') = 0 then
  insert into public.prospection_routines (market_code, kind, title, detail, duration_minutes, position) values
    ('pt','routine_30m','Escanear perfis',
     'Escaneia 30-40 perfis, seleciona 15-20 qualificados (ver flags §2).', 10, 1),
    ('pt','routine_30m','Mandar M1s',
     'Manda 15-20 M1 personalizados. Máx 1 min/msg — se não acha detalhe preciso, passa.', 15, 2),
    ('pt','routine_30m','Responder conversas',
     'Conversas em curso. Prioridade aos leads quentes.', 5, 3),
    ('pt','routine_1h','Prospecção M1',
     '25-30 mensagens personalizadas. Targets mais amplos.', 15, 1),
    ('pt','routine_1h','Conversas ativas',
     'Trabalho profundo em M2-M3 + agendamento. Aqui você constrói pipeline.', 30, 2),
    ('pt','routine_1h','Seguimento & conteúdo',
     'Seguimentos clientes, post do dia Insta, D+2/D+5 pós-Zoom.', 15, 3),
    ('pt','pre_send_checklist','Personalizei [detalhe do perfil] com algo preciso (não genérico).', null, null, 1),
    ('pt','pre_send_checklist','Minha mensagem não pitcha nada (sem produto, sem Zoom no M1).', null, null, 2),
    ('pt','pre_send_checklist','Minha mensagem termina com pergunta aberta qualificadora.', null, null, 3),
    ('pt','pre_send_checklist','Não mais de 3 emojis.', null, null, 4),
    ('pt','pre_send_checklist','Sem link no M1 (filtro spam).', null, null, 5),
    ('pt','pre_send_checklist','O tom é posado, não apressado.', null, null, 6),
    ('pt','pre_send_checklist','Se a pessoa disser não, tenho mensagem de fechamento limpo pronto.', null, null, 7);
end if; end$$;

commit;
