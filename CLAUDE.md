# Lor'Squad Wellness / La Base 360 — Notes d'architecture

Les règles et les pièges vécus, pour ne pas reproduire les régressions passées. Relire
« Repères » avant tout chantier. L'histoire des chantiers (roadmaps, mémos, specs d'origine)
est dans `docs/CLAUDE_ARCHIVE_2026-09-18.md` — elle ne fait pas foi sur l'état du code.

---

## 🧭 Repères — à lire en premier (18/09/2026)

### Les branches (la vérité, corrigée le 18/09 — l'ancien texte disait `claude/focused-pike`)
- **`main` = PRODUCTION** (Vercel `www.labase360.fr`, Mélanie + l'équipe + les clientes).
- **`dev/thomas-test` = DEV** (Thomas seul, preview Vercel séparée).
- Une feature = `feat/x` **depuis `dev/thomas-test`**, testée sur la preview, puis
  **cherry-pick sur `main`** (jamais de merge dev → main : dev porte des essais).
- Un fix urgent = `fix/x` depuis `main`, poussé sur `main`, puis reporté sur dev.
- **Comparer prod et dev par CONTENU** (`git diff --stat origin/main <branche> -- <fichiers>`),
  jamais par numéro de commit : cherry-pick et squash changent les SHA.
- **La base Supabase est UNIQUE** : une migration touche la prod immédiatement.
- Avant tout push sur `main` : `npx tsc -b --noEmit` (incident du 27/05/2026 : build
  Vercel cassé sur une erreur TS non vue en local).

### Les six mondes de l'app (carte du 17/09, 158 routes dans `src/App.tsx`)
| Monde | Entrée | À savoir |
|---|---|---|
| A · App coach standard | `AppLayout` (connecté) | ~85 routes ; menus filtrés par rôle × niveau d'app × zones BBC |
| B · Mode BBC (le club) | `features/bbc/BbcApp.tsx` — **remplace tout l'écran** | Thomas, Mélanie, Romane y sont par défaut (`users.club_model='bbc'`). **L'adresse décide** (`bbcRoutes.ts`) : `/`, `/co-pilote` → cockpit ; `/agenda*` → agenda ; `/messages*` → messages ; **tout le reste (dont `/crm`) → l'app standard** avec « ← Retour au club » |
| C · App de la cliente (PWA) | `/client/:token` (`ClientAppPage`) | jeton, pas de JWT ; données UNIQUEMENT via l'edge `client-app-data` |
| D · Tunnels publics | `/bilan-online`, `/point-de-depart`, `/rdv`, `/rejoindre`… (~45 routes) | tout écrit via des edge functions en `service_role` |
| E · Site du club | `/club*`, `/reserver*`, `/r/:jeton` | domaine `labase-nutrition.com` (voir « trois domaines ») |
| F · Admin | `admin/*`, `/users`, `/team`, `/analytics` | admin only |

### Un mot de Thomas = deux écrans possibles (BBC ou standard). Déterminer lequel AVANT d'ouvrir un fichier.
| Il dit… | BBC | Standard |
|---|---|---|
| « l'agenda » | `features/bbc/agenda/BbcAgenda.tsx` (+ `agendaClub.ts` = la logique) | **le même** : `pages/AgendaPage.tsx` (30 l.) monte `AgendaDuClubStandard` → `BbcAgenda`. « Mon agenda » (3 725 l.) a disparu le 18/09 |
| « le CRM », « mes leads » | n'existe PAS en BBC (cède la place au standard) | `pages/CrmPage.tsx` + `hooks/useCrmLeads.ts` + `components/crm/` |
| « mes membres » | `features/bbc/views/BbcCrm.tsx` (oui, le fichier s'appelle Crm) | — |
| « la fiche client » | la fiche dépliée dans `BbcCrm` : 3 volets Visites & carte · Son corps · Prochaine étape (`prochaineEtape.ts`) | `pages/ClientDetailPage.tsx` (5 onglets) |
| « contacter », « les 20 contacts » | `features/bbc/views/BbcContacter.tsx` + `contacter.ts` (les 6 règles, pures) + table `bbc_contacts` | `pages/CrmPage.tsx` |
| « le bilan » | `features/bbc/BbcNewMemberSheet.tsx` (« Nouvelle évaluation ») | `pages/NewAssessmentPage.tsx` (le plus gros fichier) |
| « ce matin », « l'accueil » | « Le matin », `features/bbc/views/BbcMatin.tsx` (l'adresse `/co-pilote` dit encore « cockpit ») | `features/copilote/v5/CoPiloteV5Page.tsx` (« Co-pilote ») |
| « les réglages » | `features/bbc/views/BbcReglages.tsx` | `pages/ParametresPage.tsx` |
| « le menu » | `BbcApp.tsx` (`BARRE` = 4 onglets + ＋, `PLUS` = le reste) | `components/layout/AppLayout.tsx` + `MobileDrawer` + `BottomNav` ; visibilité `config/appVisibility.ts` |

### Réflexes qui évitent de perdre une heure
1. **Vérifier qu'un fichier est IMPORTÉ avant de le corriger.** Le 17/09, 74 fichiers du
   dépôt n'étaient atteints par rien depuis `main.tsx` (ancien Co-pilote, Club VIP cliente…) ;
   supprimés le 18/09. Un nom cité dans un commentaire ou un doc n'est pas une preuve.
2. **Mesurer avant de trancher** : une action horodatée en base, jamais une impression ni un
   compteur de connexions.
3. Les fiches de chantier (docs/, mémoire) décrivent l'intention au cadrage, pas l'état livré :
   **vérifier dans le code**.

### Décisions de Thomas à ne pas rouvrir
- Supabase reste en plan **Free** (16/09/2026) — ne pas reproposer le Pro.
- Les PV mensuels de chacun sont lisibles par tous les coachs connectés : **voulu** (18/09).
- Pas de duplication de Bizworks dans l'app : un seul champ « PV Bizworks du mois » (livré).
- Barre latérale en SVG, pas d'emojis (20/05).
- Les annonces `app_announcements` sont **facultatives** : on les propose, on ne les impose pas.
- Envers l'équipe (mails, modes d'emploi) : **on propose un outil, on n'impose rien**, jamais de date butoir.
- Le bouton **« proposer aussi hors horaires (8 h – 18 h) »** de « Caler un RDV » est **gardé**
  (18/09) : les coachs calent de vrais suivis le soir. Les horaires du club sont la proposition
  par défaut, jamais une interdiction — ne pas reproposer de le retirer.

### En attente de Thomas (ne pas coder sans lui)
- URLs YouTube des tutos (#6 : `src/data/tutorials.ts`, `TutorialLink` — infra gardée exprès, non câblée).
- Le sort des fonctionnalités jamais servies (prospection froide, `/qualif`, appels BBC, partage public,
  Noaly…) : voir l'audit du 17/09 (mémoire `carte_app_02`), lot 3.
- i18n 6 langues : aucun code amorcé.

---

## 📅 L'agenda unique — un seul agenda pour les deux apps (18/09/2026)

Audit (artifact RmsMFUAFHGDKWq5ShuHEXC) puis maquette validée par Thomas (R5zURMgduTWUSKKQzrpYuY) :
« Mon agenda » (3 725 l. + 2 763 l. de briques, 9 doublons avec le club) s'est fondu dans
**l'agenda du club**, `BbcAgenda`, qui sert maintenant les deux apps et toute l'équipe.
- **Jour · Semaine · Mois** — les trois métiers (je cale · je lis · la charge). La « Liste » du
  standard était un fil CRM de 139 entrées, pas un agenda ; la Semaine du club EST une liste.
- **Un suivi de cliente se qualifie** comme un prospect (`QualifierRdvClubSheet`, source `suivi`) :
  Venue → son bilan (`/clients/:id/follow-up/new`, ou `BbcBilan10` pour une fin de carte) ·
  Venue c'est fait (`completed`) · Déplacer (chez SA coach, `caler_rdv_club(p_table='suivi')`) ·
  Pas venue (replanifiée 3/7/15 j, même heure, pas de SMS) · Sa fiche complète.
  Base : `agenda_du_club()` rend `client_id` (migration `20261215540000`).
- **Passerelles vers le bilan standard** : `urlBilanStandard(rdv)` — `?prospectId=` pour un
  rendez-vous de l'agenda, `?prenom=&nom=&tel=&email=` pour une réservation du site
  (`NewAssessmentPage` lit les deux). Branchées en BBC (`BbcApp`) ET côté standard
  (`AgendaDuClubStandard`).
- **Sans club**, une coach voit les siens : `coachs_du_club()` la rend seule, et
  `est_coach_de_mon_club(soi)` est vrai. Ne pas « corriger » ce cas.
- **Supprimés** : `features/agenda/{AgendaDayList,AgendaWeekGrid,AgendaMonthGrid,
  AgendaJourPleinEcran,CalerChezUnCoach,ClientRdvSheet,useClubShifts,visibiliteRdvClub,
  creneauxLibres}`, `components/agenda/QualifierRdvProspect`, `services/sb/creneauxCoach`,
  `BasculeAgenda`. Restent : `features/agenda/calendarEvents.ts` (palette, durées, couleur de
  repli — importé par le club et Paramètres) et `components/agenda/QualifierRdvSheet` (CRM,
  atelier). Le filtre « Protocole » (29 lignes / 60 j) et les statistiques du haut n'ont pas
  été repris : ce sont des informations de fiche et de CRM.
- Les liens `/agenda?tab=…` des notifications ouvrent l'agenda ; les paramètres sont ignorés.
- **La prochaine pesée d'une membre** (22/09) : fiche du club → « Prochaine étape » → « Caler sa
  prochaine pesée » (membre sans carte active) → `CalerRdvSheet` en mode `membre` → RPC
  `caler_suivi_membre` = un SUIVI de SA fiche chez SA coach, type « Pesée ». ⚠️ `follow_ups.client_id`
  est UNIQUE : une cliente n'a qu'un prochain suivi, la pesée le REMPLACE (la feuille le dit).
  Jamais par « ＋ → Caler un RDV » : il crée un rendez-vous de PROSPECT (table `prospects`), et à la
  venue l'app proposerait une nouvelle fiche. « Venue · faire sa pesée » ouvre sa fiche du club.
- **Qui est prévenu d'un rendez-vous** (22/09, « le choix est au coach ») : la cloche 🔔 de l'agenda
  → `users.notif_agenda` = `miens` (défaut, l'ancien comportement : ce qu'une autre cale dans MON
  agenda ; les admins, les réservations du site) · `club` (tout ce qui se cale, et le site) · `aucun`.
  La base choisit (`agenda_a_prevenir`, appelé par `prevenirCoach`) ; `book-club-discovery` filtre
  pareil. La personne qui a rendez-vous garde TOUJOURS sa confirmation et ses rappels.
- **Déplacer / Annuler, sur chaque rendez-vous** (22/09, maquette E6bR9Sko1R4mGaDgFD2W9n validée,
  migration `20261215720000`) : deux gestes en haut de la feuille d'un RDV à venir, sous la question
  d'un RDV passé ; un RDV tranché ne bouge plus (`peutChanger`). Une **réservation du site se
  DÉPLACE** par `coach_reschedule_club_booking` (celle du CRM, ouverte aux coachs du club : revérifie
  la capacité ET que la coach est libre → `busy`, change de coach si besoin, relance les rappels mail
  ET SMS) — avant, l'agenda la RECRÉAIT et l'ancienne restait avec son rappel (Sandrine M., 2/10 →
  7/10). Case « prévenir par mail » cochée par défaut → `notify-club-booking-moved`. **Annuler** =
  `annuler_rdv_club` : prospect `cancelled`, résa `canceled`, suivi `dismissed` (+ `clients.next_follow_up`,
  NOT NULL, ramené à son dernier bilan 9 h, sinon « sa pesée : mardi » resterait) ; rien n'est envoyé
  (décision 11/08) et les rappels ne lisent que les RDV vivants. Droits = ceux de `qualifier_rdv_club`.
- **La fiche standard** (22/09, le cas de Gwen) : « PLANIFIER → » ouvre TOUJOURS la fenêtre du RDV
  (il partait sur « Vue complète » quand la fiche était « à jour ») ; une cliente en **suivi libre**
  montre son RDV calé à la main (`getClientActiveFollowUp` : `scheduled` à venir, jamais une relance).
- Le mode d'emploi (`mail-agenda-club`, `GuideAgendaSheet`) dit « menu Agenda » et décrit la
  question d'un suivi. **Thomas veut le renvoyer aux coachs** pour le nouvel agenda.

---

## ☕ Le club en cinq onglets — mode BBC (livraisons A·B·C, 18/09/2026)

Construit sur la journée de Thomas (« l'app est trop compliquée, même pour moi »), maquette v7
validée, chiffrage accepté (« il faut tout faire »). Branche `feat/club-5-onglets` → dev.
- **La barre** : Matin · Agenda · ＋ · Contacter · Membres ; le ＋ (bosse CSS, `bbc-tokens.css`)
  ouvre les trois gestes du comptoir : Pointer (vue `club`), Caler (`CalerRdvSheet`), Nouvelle
  évaluation (`BbcNewMemberSheet`). Tout le reste est derrière **⋯ Plus** (`PLUS`), inchangé.
- **« Contacter aujourd'hui »** (le trou : « je ne contacte pas assez de monde », 20/jour) :
  `contacter.ts` remplit la liste avec 6 règles PURES et testées — lead nouveau · relance due ·
  9e visite / carte finie · absente ≥ 6 j (`bbc_dernieres_visites()`, hook `useBbcSignaux`) ·
  régulière ≥ 3 semaines sans cœur (« lui demander une amie ») · à 1 cœur du palier. Chaque
  « et alors ? » écrit une ligne dans **`bbc_contacts`** (`useContactsDuJour`) : compteur
  personnel, « déjà fait » partagé par le club (si Mélanie a appelé Camille, Thomas ne la voit
  plus), clé stable `lead:…` / `membre:<id>:<raison>`. Feuille : tel / WhatsApp / copier /
  **✨ Noaly propose** (même edge `noaly`, mode `crm_message`, que la fiche lead du CRM).
- **Le matin** (`BbcMatin`) : ton prochain RDV en gros → **Venue / Pas venue** ouvrent
  `QualifierRdvClubSheet` sur place (`etapeInitiale`) ; « elle prend sa carte de membre » →
  `BbcNewMemberSheet` pré-remplie → **`ApresCreation`** (« Et ensuite ? » : son 1er pointage,
  `bbc_add_visit`) — après TOUTE création de fiche, aussi depuis le ＋ et depuis l'agenda
  (`BbcAgenda` remonte `onMembreCree`). Un RDV de source `suivi` se pointe, il ne se qualifie pas.
- **Passerelles vers le standard** (jamais une 2e implémentation) : « Sa fiche complète » →
  `/clients/:id` ; « elle démarre en suivi classique » → `/assessments/new?prospectId=` (source
  `prospect`) ; « Sa fiche de lead » → `/crm/leads/:key` ; « L'app complète » → mode Classic.
- **Supprimés** : `BbcCobayeSheet`, `useBbcCobayes`, `agenda/RdvDuJour` (Cobayes du jour : 7
  envois en 2 mois). La table `outreach_messages` n'est plus lue par le front — **à trancher
  avec Thomas** avant de la supprimer.
- **Garde-fou** `__tests__/gardeVisuelle.test.ts` : aucun `fontSize < 11` ni `minHeight < 44`
  (bloc cliquable) hors budget → les nouveaux fichiers sont à 11 / 44 minimum.
- ⚠️ Recette sur iPhone/iPad par Thomas avant tout cherry-pick sur `main`.

---

### Les créneaux proposés suivent les horaires du club (18/09/2026)

`creneauxLibres` ne connaît que `PROPOSITION` (8 h–18 h, **tous les jours**). Elle ne doit
plus être appelée directement pour proposer un rendez-vous : passer par
**`creneauxDuJour(occupes, cle, duree, maintenant, reglages, horsHoraires)`**, qui applique
`horairesDuJour` — la règle EXACTE du tunnel public (`get_club_discovery_availability`) :
jour dans `holidays` → rien · jour sans horaire (dimanche à Verdun) → rien · sinon les plages
de `hours` / `hours_by_date`, plusieurs par jour. Verdun : 8 h–15 h en semaine (+ 16 h–18 h
mardi, 16 h–17 h vendredi), samedi 8 h 30–11 h, dimanche fermé, 20 jours fériés.
Sans horaires réglés → repli 8 h–18 h, on ne bloque personne. Le bouton « hors horaires »
de `CalerRdvSheet` rouvre 8 h–18 h : les coachs calent de vrais suivis le soir.
⚠️ `CalerRdvSheet` a besoin de `reglages` — `BbcAgenda` les a déjà, `BbcApp` les prend sur
`club.settings.discovery`. Sans la prop, la feuille reproposerait le dimanche en silence.

### L'heure doit être vivante (18/09/2026)

`Date.now()` lu au montage ne bouge plus : la tablette du comptoir et l'onglet de Thomas
restent ouverts la nuit, et « aujourd'hui » restait sur la veille (« ton prochain rendez-vous »
montrait 14 h 30 à 16 h 51). Tout écran qui affiche « aujourd'hui » ou une durée relative
utilise **`useMaintenant()`** (`features/bbc/agenda/useMaintenant.ts`) : battement d'une minute
+ rattrapage sur `visibilitychange` / `focus` (iOS gèle les minuteurs d'un onglet caché).
Un rendez-vous terminé reste en tête du « Matin » **une heure** (fenêtre de qualification).

---

## 🥗 Le journal nutritionnel (lots 1 à 3, 21/09/2026)

Maquette v7 validée par Thomas (artifact 6yR2eSaMs5BNZ1uRwfT7kf), puis **v8** (KFJaEaKqMuQNatZop4xztg :
« ok pour V8 et l'ensemble des demandes »). L'onglet **« Journal » remplace « Conseils »** dans les
DEUX espaces membre (`BbcClientApp` format `bbc`, `PwaClientApp` format `std`) ; `?tab=conseils`
mène au journal. Côté coach : 4e volet de la fiche BBC (`BbcCrm`) et section repliable de l'onglet
« Mesures » de `ClientDetailPage` (pas de 6e onglet). Code : `src/features/journal/`.
- **L'accueil (v8)** : la carte **« Mon journal »** (`JournalAccueil`) remplace le gros bloc du
  poids dans les deux espaces — anneau des protéines, eau en un geste, « Noter mon déjeuner »
  selon l'heure (`creneauANoter`) ; le poids reste en UNE ligne dessous. Les feuilles sont celles
  de l'onglet (une seule implémentation, ouverte depuis deux endroits).
- **Noaly = le rose du site en BBC** (`--ls-bbc-noaly*`, bbc-tokens.css, `--pink #F5178F` de
  ClubLandingPage.css) : bouton ROND au centre de la barre dans une bosse de verre (`.bbc-mnav`,
  même bosse que le ＋ coach), sa fenêtre (`MemberNoaly`), « Écris ton repas », « Le mot de Noaly ».
  L'orange reste la couleur des gestes de la membre. **Barre BBC à 4 onglets** : Accueil · Journal ·
  Noaly · Évolution · Messages — les Cœurs s'ouvrent depuis leur carte de l'accueil (bouton
  « ‹ Accueil »), `?tab=coeurs` marche toujours. En standard, Noaly garde ses couleurs La Base 360.
- ⚠️ **Piège vécu** : une animation CSS en `both` qui finit sur `translateY(0)` garde une
  transformation, et un élément transformé devient le repère des `position: fixed` qu'il contient.
  Les feuilles ouvertes depuis l'Accueil standard se posaient en bas de la PAGE. L'Accueil
  standard est en `lbRise … backwards` ; ne pas remettre `both`.
- ⚠️ **Le shake du club se pose AU POINTAGE depuis le 23/09** (migration `20261215750000`) :
  `bbc_add_visit` appelle `_journal_prerempli_club`. Avant, le pré-rempli n'était écrit que quand la
  MEMBRE ouvrait son journal (`journal_jour`) — Thomas pointait Audrey à 8 h 03, regardait son journal
  et le voyait VIDE, et la case « passée au club » de l'aperçu coach ne s'allumait presque jamais.
  La fonction ne fait rien deux fois (garde `club_prerempli`) : retiré par la membre = reste retiré.
- **« Mon journal » d'une coach** (`MonJournalCoach`, monté SEULEMENT dans `BbcApp` — le rond en haut
  à droite, à gauche des « ⋯ ») : elle relie SA fiche de membre une fois (`journal_coach_mes_fiches`
  → `journal_coach_relier`). ⚠️ Vécu le 23/09 avec Maria, coach ET membre : « Pas encore de fiche à ton
  nom » alors qu'elle a 6 bilans. Trois causes empilées, toutes corrigées (migration `20261215760000`) :
  sa fiche appartient à **Mélanie** (au club, une coach est inscrite par une AUTRE) → on accepte
  maintenant une membre de SON club (`est_coach_de_mon_club` sur la coach qui la suit) ; sa fiche n'a
  **pas d'email** ; et son prénom de fiche est « Maria Rosa » quand son compte dit « Maria » → on compare
  le PREMIER prénom des deux côtés. Une fiche déjà reliée à un autre compte revient avec `prise = true` :
  affichée sans bouton, et l'écran ne propose PLUS « Faire mon évaluation » dans ce cas — ça créait un
  doublon. Sans club, `est_coach_de_mon_club(soi)` est vrai : une coach seule retrouve ses clientes.
- **Règles de Thomas, dans le code** : protéines = poids du DERNIER bilan pesé × coefficient
  réglé par la coach (1,2 · 1,4 · 1,5 · 2 — `journal_reglages`) ; eau = 1 L / 30 kg ; la
  boisson du club (40 cl) et le shake du club sont pré-remplis au pointage (une fois) ; le shake
  n'existe qu'en COMBO (jamais « F1 seul ») ; encas : Herbalife d'abord puis fromage blanc, skyr.
- **Chercher un produit** (23/09) : la recherche lit le nom ET la colonne **`synonymes`**
  (`chercher`, `journalCalculs`) — Thomas tapait « formule 3 » et ne trouvait pas « Formula 3 », qui
  était pourtant au catalogue. ⚠️ Un aliment sans **rang** (`rangs = {}`) n'apparaît dans AUCUNE
  suggestion : il n'existe que par la recherche. C'était le cas de F3 et Beta Heart, corrigé.
  Le catalogue est gardé en sessionStorage (`ls-journal-aliments-v2`) : **changer la clé** à chaque
  nouvelle colonne, sinon les anciens onglets cherchent sans elle. Ajoutés le 23/09 aux valeurs des
  étiquettes Herbalife FR : Boisson multi-fibres (2554), Thé instantané (178K), Aloe concentré (0006).
  ⚠️ `journal_aliments_une_seule_mesure` : un aliment se mesure à la PORTION ou aux 100 g, jamais les
  deux (mettre `prot_100g`/`kcal_100g` à null pour un produit à la dose).
- **Passe visuelle du 24/09** (Chrome, prod, les 6 écrans en clair ET en sombre) : un seul vrai défaut —
  en standard et côté coach, **`--jr-eau` valait le teal des protéines** : les deux barres du « 7 derniers
  jours » de `JournalCoach` étaient de la même couleur et la légende ne disait rien. L'eau est maintenant un
  bleu **dérivé des jetons de la maison** (`color-mix(teal 55 %, violet)`, jamais un hex : il suit le clair
  et le sombre). Au club, orange/teal étaient déjà distincts. Dans la foulée : les « légumes » de l'assiette
  idéale prennent `--jr-m2` (sauge au club, teal en standard) au lieu du jeton de l'eau, et `resume()` ne
  met plus un produit en minuscule (« formula 3 » → « Formula 3 » : un nom avec chiffre ou majuscule
  interne garde la sienne). Vu et laissé : les libellés de la barre de la PWA standard sont à 9 px
  (« Noaly » compris) — c'est tout le système `client-pwa`, pas le journal.
  **Puis quatre retouches, maquette 5PbECr4zhbgDUTkvY3S6D5 validée (« 1 ok, 2 ok, 3 ok, 4 ok, go ! »)** :
  ① côté coach, les 7 jours se touchent — le jour choisi est plein avec une pointe vers le détail, le détail
  porte « ‹ lundi · Mardi 22 · mercredi › », et à l'ouverture c'est le DERNIER jour noté (pas un aujourd'hui
  vide) ; ② le badge « Herbalife » disparaît sous le titre HERBALIFE de la feuille Ajouter (`badge={false}`),
  il reste dans la recherche, les habituels et les lignes du jour ; ③ la barre du bas de la PWA standard
  passe de 9 à 11 px (`PwaClientApp`, les deux `fontSize`), le reste de `client-pwa` n'est pas touché ;
  ④ « déjà noté · +1 » : dans Ajouter, un produit à la portion déjà noté à ce repas est teinté (`.deja`) et
  « +1 » passe SA ligne à × n+1 par `journal_modifier` (jamais une 2e ligne) — un aliment au poids est
  seulement signalé, une 2e quantité reste un vrai choix. Vérifié sur le journal de Thomas (ligne de test
  ajoutée puis retirée).
- **Catalogue** `journal_aliments` : 95 aliments CIQUAL 2020 (source par ligne) + skyr
  (étiquettes) + 18 Herbalife FR + chiffres du club. Les protéines d'une ligne sont calculées
  par le SERVEUR puis figées. Ordre des suggestions : colonne `rangs` par créneau.
- **Sécurité** : la membre passe par des fonctions à jeton (`journal_jour`, `journal_ajouter`…,
  security definer) ; la coach par SON RLS (`journal_semaine_coach` invoker, policies =
  sous-requête sur `clients`). Les `_journal_*` internes sont fermées à anon/authenticated.
- **XP** : 4 défis du jour +5 (+5 « très active »), plafond 1×/jour dans `record_client_xp`
  (miroir UI : `client-xp/actions.ts`). Jamais de gros montants : Légende en 2 semaines sinon.
- **L'humeur** : `client_mood_log` avait été supprimée alors que l'Accueil standard l'appelait
  (l'humeur n'était plus enregistrée). `record_client_mood` / `get_client_mood_today` écrivent
  maintenant dans `journal_jours` : l'humeur de l'Accueil ET du journal = la même donnée.
- **Noaly dans le journal** (lot 2, migrations `20261215570000` + `20261215580000`) — la photo
  attendra (Thomas). Edge **`journal-noaly`** (Claude **Sonnet 5**, sans réflexion, effort bas) :
  `lire_repas` transforme un repas écrit en lignes. Un aliment DU CATALOGUE garde ses chiffres
  officiels (l'IA ne choisit que l'aliment et la quantité) ; ce que le catalogue ne connaît pas
  (burrata, pizza au thon…) est **ESTIMÉ** par l'IA (Thomas : « une pizza thon vs une pizza
  artichaut… autant utiliser l'IA pour être juste ») → ligne sans `aliment`, avec `prot_100g`
  (0 à 90, contrôlé en base) : elle se corrige au poids et le total suit ; affichée « estimé par
  Noaly ». Des poids de repère fixes dans le prompt (demi-pizza 225 g…) pour des estimations
  stables. `journal_ajouter_lot` écrit tout ou rien (origine `noaly`). `conseil` rédige « le mot de
  Noaly » à partir du plan calculé par l'app (**selon l'heure** : à 16 h, plus d'encas du matin),
  gardé sur la journée (`journal_jours.conseil_noaly` + `conseil_empreinte`) ; en panne → les
  conseils calculés. Plafonds 25 repas / 8 conseils par 24 h, traces `ai_usage_log`
  (`journal_repas` ≈ 0,2 c€ cache chaud, `journal_conseil` ≈ 0,3 c€).
- **Le rappel de 20 h** (lot 3, cron `journal-rappel` `16 18,19 * * *` UTC, migration
  `20261215590000`, texte validé v8) : edge **`journal-rappel`**, seulement à celles qui ont noté
  dans les 7 jours d'avant et rien ce jour-là (pré-rempli du club exclu ; eau ou sport noté =
  déjà noté) ; tri `journal_rappel_cibles()` (rend des jetons : service_role seulement),
  anti-doublon `journal_rappels_envoyes`, `{dry_run:true}` pour compter sans envoyer. Le lien
  `?tab=journal` est lu par les deux espaces (le standard ignorait `?tab=` jusqu'au 21/09).
- **Bloc A** (21/09, migration `20261215600000`) : la remarque de la coach part en notification
  (« Thomas t'a laissé un mot dans ton journal » : trigger `journal_remarque_notifier` → edge
  **`journal-remarque-notifier`**, lien `?tab=journal`) ; le chat de Noaly (`noaly`, mode
  `client_chat`) lit le journal du jour, SEULEMENT si la personne a noté dans les 7 jours (sinon rien
  ne change) ; la coach voit « (estimé par Noaly) » (`estime` dans `journal_semaine_coach`) ;
  `journal_estimations_frequentes(jours)` (admins) liste les plats que Noaly estime le plus, à
  ajouter au catalogue avec une valeur OFFICIELLE : maïs doux ajouté (CIQUAL 20066) ; la burrata
  n'est pas dans CIQUAL 2020, elle reste estimée. ⚠️ `noaly` en ligne (v20) porte ce code de
  DEV : un déploiement de `noaly` depuis `main` l'effacerait (sans gravité tant que le journal
  n'est pas en prod) → le reporter avec le cherry-pick. Au passage : l'accueil membre BBC n'a
  plus d'emojis (SVG), les teintes vert-jaune des vues coach BBC sont passées à l'orange, et la
  feuille Noaly suit enfin le thème clair (elle redéclarait `.bbc-mode`, donc les jetons sombres).
- **Bloc B** (21/09, migrations `20261215610000` → `640000`, maquette Jt3RNaarpnav5XRGzhrTwz validée :
  « 1 OK, 2 OK, 3 ok pour 3 jours, 4 oui masque ») :
  **6 « Tes habituels »** en tête d'« Ajouter » (`_journal_habituels` : noté ≥ 2 jours sur 14 à ce
  repas, SA quantité, 4 max ; un toucher = noté ; un plat estimé revient sans rappeler Noaly ; ce
  qui est déjà noté n'est pas reproposé) · **9 les kcal**, en gris sous les protéines et en total
  du jour, jamais sur l'accueil ni en objectif (`_journal_kcal_ligne`, calculées à la lecture ;
  `journal_lignes.kcal_100g` = estimation de Noaly) ; la coach les masque membre par membre
  (`journal_reglages.kcal_visibles`, `journal_regler_kcal`) ; 14 aliments sans énergie publiée
  dans CIQUAL 2020 ont leurs kcal calculées par la formule UE 1169/2011 (vérifiée sur 48 aliments,
  écart max 4 kcal) ; restent SANS kcal, faute de source : croque-monsieur, les 2 chips
  protéinées, Rebuild Strength · **8 « elle a lâché son journal »**, 7e règle de Contacter
  (`journal_signaux_club`, RLS de la coach : ≥ 5 jours notés sur 7 puis 3 à 14 jours de silence ;
  « pas venue » passe devant ; relancée une fois, elle ne revient pas tant qu'elle n'a pas repris) ·
  **7 « Ta semaine »** (`journal_semaine`, `JournalSemaine.tsx`) : en tête le dimanche soir et le
  lundi, en bas sinon ; UNE chose à travailler, calculée ; notification dimanche 19 h 10 (cron
  `journal-semaine` `10 17,18 * * 0`, edge `journal-rappel` mode « semaine », ≥ 3 jours notés,
  anti-doublon `journal_semaines_envoyees`, lien `?tab=journal&semaine=1`).
- Idée de Thomas, à discuter (rien de codé) : le plan de la semaine par mail le vendredi soir —
  bilan, plan, 5 recettes, liste de courses (mémoire `project_journal_plan_semaine_mail`).
- **En prod depuis le 22/09** (main `04d0703f`, sans recette iPhone : Thomas le présentait le matin même).
- Le mail de lancement aux **membres du club** : `docs/campagnes/journal-nutritionnel/mail-membres-bbc.html`,
  en brouillon dans /admin/campagnes (voir le README du dossier). Visuels en tableaux HTML, pas en PNG.
- **Le mail aux clientes La Base 360** (en suivi) : `docs/campagnes/journal-nutritionnel/mail-membres-labase360.html`
  (teal, au vous), envoyé le 24/09 par Thomas (campagne « Journal nutritionnel — clientes La Base 360 », 39
  destinataires). Celui du club a reçu un encart « Du nouveau » (non renvoyé).
- Reste à faire : la photo ; le mail aux nouveaux clients.
- **Vu du coach, en standard** (22/09, maquette XpS9uerQY6M627Zg9vXS99 : « on essaie, on verra ») :
  sur la fiche, le journal est EN TÊTE de « Mesures » et ouvert par défaut ; sur le Co-pilote, la carte
  « Le journal de tes clientes » (sous le RDV du jour) mène à **`/co-pilote/journal`**
  (`JournalApercuPage`) : toute la liste de `visibleClients` + recherche, EN TÊTE et en couleur celles
  qui notent vraiment (7 jours), un toucher → SON journal (`JournalCoach`, le même que la fiche ;
  `?client=<id>`). La base n'ajoute que l'état du journal : **`journal_apercu_coach()`** (SECURITY
  INVOKER, le RLS décide). « Elle a noté » = la règle du rappel de 20 h (repas `membre`/`noaly`, eau,
  sport ; le pré-rempli du club seul = case teal ; une ligne de la coach ne compte pas) ; la moyenne de
  protéines ne porte que sur les jours à REPAS (un jour « eau seulement » la ferait chuter). Un seul
  appel partagé carte + écran, gardé 2 min, clé = personne + jour de Paris (`useJournalApercu`).
  Logique pure et testée : `apercuJournal.ts`. `/co-pilote/journal` n'est pas capté par le mode BBC.
- **« Plus vivant »** (24/09, maquette ForqHsP3stVu45NSEvPnZZ : « c'est quand même plus dans l'esprit de l'app,
  go fais-le ») — Thomas trouvait la liste et le récap « fadasses » (tout olive, et « 46 g » ne disait pas si
  c'est bien). **La couleur porte le sens** : teal atteint (≥ 90 %) · ambre à moitié (50-90) · corail décroche
  (< 50 %, ou rien depuis 3 jours ; la journée EN COURS n'est jamais corail) · bleu l'eau · hachures = « le
  club seul ». Jetons par maison dans `journal.css` : `--jr-ok`, `--jr-mid`, `--jr-club`, `--jr-bandeau` —
  au club, « atteint » est le **sauge** (l'orange est l'identité, le teal est l'eau).
  **La liste** : bande de 3 chiffres (le tiennent · % des jours à l'objectif protéines · eau), filtres
  (À féliciter / Sous l'objectif / Décroche ; sans bilan pesé = « neutre », dans aucun filtre), et par
  cliente un liseré, l'anneau des jours notés, les barres jour par jour, « NN % de l'objectif », l'eau.
  La base : `journal_apercu_coach()` rend en plus `prot_jours`, `eau_jours`, `obj_prot`, `obj_eau`
  (migration `20261215820000`, objectifs = `_journal_objectifs`, déjà ouverte à `authenticated`).
  **Le récap** (`JournalCoach`, même composant partout) : un en-tête `jr-rc` à trois cadrans (protéines, eau,
  jours notés ; nom + niveau + « chez X » seulement sur /co-pilote/journal), la semaine en grandes barres,
  « À retenir » en couleur (`Retenir.ton`), et **« Ses objectifs » replié en bas** (`<details>`).
  **Une seule règle de calcul** pour la liste (`resumeApercu`) et le récap (`recapCoach`) : les jours FINIS
  où ELLE a noté (`aNote` : repas `membre`/`noaly`, eau, sport — le pré-rempli du club seul n'en est pas un),
  aujourd'hui seulement s'il n'y a rien d'autre ; `aRetenir` suit la même. Les deux écrans disent le même chiffre.
  ⚠️ **`.jr-hero` est la classe de l'en-tête du journal DE LA MEMBRE** (`JournalMembre`) : la première version
  du récap la réutilisait et aurait repeint l'écran des membres. Toute nouvelle classe `jr-*` : chercher
  d'abord si elle existe (`grep` dans `src/`).

---

## 🏅 Les XP des membres — voir, donner, le club, le bar (24/09/2026)

Maquette v2 (artifact YDW71DpnUpiPxWdoFqEESB) validée par Thomas : « × 5, plafond 750 par mois (= un extra,
donc achat de quelque chose), go pour les 6 blocs ». **Principe gravé** : les XP sont un indicateur de
régularité et un jeu — ils n'ajoutent AUCUN chiffre à la lecture prot / eau / kcal du journal (chez la membre :
la pastille et la barre déjà là ; chez la coach : une pastille sur les listes, une ligne dans la fiche).
Migration `20261215780000_xp_membres.sql` (un seul lot), code `src/features/client-xp/`.
- **Le cœur** : `_record_client_xp_interne(client_id, action, suffixe, coach, mot)` — `record_client_xp(jeton, action)`
  ne fait plus que résoudre le jeton. Nouvelles actions : `club_visite` +5 (1/jour), `club_10_visites` +50,
  `club_carte_finie` +50 (par carte, suffixe = id de la carte), `coach_bravo` +10 · `coach_defi` +20 ·
  `coach_club` +10 (clé `coach_don_<jour>` : UN geste coach par jour et par membre). Les montants vivent
  en SQL ET dans `actions.ts`. Le niveau (`_xp_niveau` : 100/300/700/1500) se compare avant/après : une
  montée pose un bonus bar (`xp_versements_bar`, motif `niveau_n`) et appelle l'edge de niveau.
- **Voir** : `xp_apercu_coach()` (SECURITY INVOKER — le RLS de `clients` décide, policy `client_xp_events_coach_lit`
  = sous-requête sur clients, jamais `::uuid`) → `useXpApercu` (un appel, 2 min de cache, `invaliderXpApercu()`
  après un don). `NiveauPastille` (jetons `.jr[data-format]`, jamais de hex — `ClientXpStatsCard` réécrite
  avec), `XpNiveauxCarte` sur le Matin (club) et le Co-pilote (`XpNiveauxCoPilote`) : montées de ≤ 7 j,
  « rien gagné depuis 14 j ». Pastille dans « Membres » (BbcCrm) et « Dossiers clients » dès le niveau 2.
- **Ça remonte** : la montée → `client-app-level-up-notify` (jeton de la membre OU `client_id` + service_role
  depuis la base) → **push à la coach** (« Joel passe Champion·ne 🥇 », dédupée cliente + niveau). ⚠️ Avant,
  l'edge écrivait dans `coach_reminders` qu'AUCUN écran ne lit : 5 montées (août → 22/09) jamais vues, closes
  par la migration. 8e règle de `contacter.ts` : `niveau` (montée ≤ 7 j, clé `membre:<id>:niveau<n>`).
- **Donner** : `xp_donner_coach(client, raison, mot)` (admin ou sa cliente : même règle que la fiche) →
  `DonnerXpSheet` (fiche club, volet Visites & carte ; fiche standard, carte XP). Trigger `xp_don_notifier`
  → edge `xp-don-notifier` → push membre « Thomas t'a donné 20 XP · défi tenu » + son mot.
- **Le club** : `bbc_add_visit` donne les XP après l'insertion de la visite (rend `xp_gained`, affiché
  « +1 visite ✓ · +5 XP »). Les Cœurs ne changent pas : deux monnaies (parrainage / régularité).
- **Le bar** (`xp-vers-le-bar`, cron `10 5 * * 1` UTC) : le bar (`labase-shakesbar`, SON Supabase) a déjà
  comptes par e-mail, QR scanné au comptoir, catalogue (extra 750 · boisson 1 500 · combo gaufre 2 200 ·
  cadeau du mois 3 800) et l'API `profile?action=credit-xp-manual` (Bearer = ADMIN_PASSWORD du bar). On
  VERSE, on n'invente rien : chaque lundi `xp_a_verser_bar()` (service_role) = XP coaching de la semaine × 5
  + bonus de niveau (250 / 500 / 750 / 750), **plafond 750 XP bar par mois** (bonus compris ; le surplus
  d'un bonus est perdu, la semaine au-delà du plafond est notée `plafond`), compte trouvé par e-mail
  (`ilike`), sans compte → `sans_compte` (son espace lui propose d'en créer un). Mode `solde` (jeton membre
  ou JWT coach) → « Tes XP au bar » (`XpBarMembre` sous les défis, `XpBarCoach` dans la fiche).
  ⚠️ **Secrets à poser par Thomas** : `BAR_SUPABASE_URL`, `BAR_SERVICE_KEY`, `BAR_API_URL`, `BAR_ADMIN_PASSWORD`
  — sans eux, `verser` ne fait rien et le dit ; `{"mode":"verser","dry_run":true}` compte sans créditer.
  Les cadeaux du bar sont des 2-pour-1 ou des suppléments : un cadeau = une venue + un achat.
  ⚠️ **L'e-mail ne suffit pas toujours** (premier dry_run, 24/09) : Virgile et Océane ont un compte au bar sous une
  AUTRE adresse. `clients.bar_user_id` (migration `20261215790000`) = l'id de son profil au bar, lu AVANT l'e-mail ;
  posé à la main en SQL pour l'instant. Pour retrouver un compte : `{"mode":"chercher","q":"prénom"}` (service_role,
  e-mails masqués) — le prénom seul ne suffit pas (trois Océane au bar). Les secrets sont posés depuis le 24/09.
- ⚠️ **Piège vécu le 24/09 (le journal coach tombé ~1 h en prod)** : `journal_semaine_coach` est SECURITY
  INVOKER — elle s'exécute avec les droits de la COACH. Lui faire appeler une `_journal_*` interne (fermée à
  `authenticated`) donne « permission denied » et TOUT le journal coach affiche « Ça n'a pas marché ». Réparé
  par `grant execute … _journal_kcal_ligne … to authenticated` (migration `20261215800000` : calcul pur sur le
  catalogue public). **Avant d'appeler une fonction depuis une fonction INVOKER, vérifier
  `has_function_privilege('authenticated', …)`.**
- **Le repas en détail** (bloc 6) : `journal_semaine_coach` rend `kcal` et `heure` par ligne ; dans
  `JournalCoach`, chaque repas est un bouton → `FeuilleRepasCoach` (lecture), « Un mot sur ce repas »
  pré-remplit la remarque.
- **Sans compte au bar, rien n'est perdu** (migration `20261215810000`) : une semaine `sans_compte` garde son
  `xp_bar` 60 jours et repart dans `xp_a_verser_bar` dès que le compte existe ; `xp_bar_resume_membre` rend
  `en_attente` → « X XP t'attendent au bar » dans son espace (`XpBarMembre`), avec le lien de la **roue**
  (`https://commande.labase-nutrition.com/jeu` : un tirage, puis la création du compte au bar sur place).
  Mails d'invitation (au vous, un par maison, jamais signés d'un prénom : « L'équipe La Base 360 » en teal
  pour le coaching, « Votre équipe du Breakfast Club » en orange pour le club) :
  `docs/campagnes/bar-roue/`, envoyés le 24/09 (17 clientes en coaching, 4 membres du club) ; la liste des
  destinataires est notée dans Notion (brouillon privé de Thomas).
- Reste « après » (Thomas) : le challenge de la semaine (objectif + top 3, lot du bar).

---

## 🧾 Le comptoir du club — lot 1 : la caisse au pointage (26/09/2026)

Maquette v3 validée (artifact SHZYSBaqfgWVqdMncgrcPG), « go lot 1 » de Thomas. Toute la réflexion, les règles
et les lots 2 à 5 : `docs/REFLEXION_MONETISATION_2026-09.md`. Code : `src/features/bbc/caisse/`.
- **Qui encaisse quoi (règle de Thomas)** : la carte de visites = le club (le propriétaire l'encaisse). Tout ce
  qui s'ajoute — upgrades (grand thé-aloé, suppléments) ET à emporter — vient des pots de la coach EN CAISSE,
  achetés avec sa remise, payé sur SON terminal : elle garde sa marge, rien à reverser. **L'app n'encaisse rien,
  elle enregistre** (« Payé sur mon terminal »). Un seul prix par produit pour tout le club, fixé par le propriétaire.
- **Base** (migration `20261215830000`, 100 % additive) : `club_carte` (les 34 lignes du tableau du 26/09 + le
  grand thé-aloé 2,60 €) et `club_ventes` (lignes FIGÉES au prix du jour, `vendeur_id` = la coach en caisse) —
  **à part** de `pv_transactions` / `pv_client_products` : rien n'est compté deux fois (PV, Rentabilité). Lecture
  par le RLS (club de `bbc_mon_club()`, sa vendeuse, admin) ; écriture par 5 fonctions definer seulement :
  `club_caisse`, `club_vendre` (**les prix sont relus en base**, le navigateur n'envoie que `{carte_id, qte}`),
  `club_achats`, `club_vente_annuler` (le jour même, heure de Paris : vendeuse, propriétaire ou admin),
  `club_carte_enregistrer` (propriétaire ou admin ; on ne supprime jamais, on retire du tableau).
- **Qui vend à qui** : toute coach du club à toute membre du club (`_club_membre_du_club`, plus large que
  `bbc_agir_pour` : la stagiaire en caisse sert tout le club, c'est voulu).
- **Les écrans** : `CaisseSheet` (« Elle prend quelque chose ? ») s'ouvre après un « +1 » RÉUSSI dans Pointer
  (`BbcClub`) et sur les puces du Matin — jamais après un doublon des 10 min, ni en atelier, ni après un scan QR
  (à la tablette, c'est la membre qui est face à l'écran) ; « Ses habituels » (avec sa dernière quantité), puis
  « Les plus demandés », les upgrades en une rangée, tout le tableau à un toucher, « Rien aujourd'hui ».
  `AchatsMembre` : fiche du club, volet « Visites & carte » (ses achats, « Annuler » en deux temps, « Lui vendre
  quelque chose »). `CarteReglages` : Réglages → « la carte du comptoir » (chaque changement s'enregistre seul,
  rien à voir avec « Enregistrer les réglages » qui écrit `clubs.settings`).
- Colonnes posées pour la suite, lues par aucun écran : `ref_herbalife` + `portions` (coût et PV, lots 3-4),
  `maison` (doses mises « à la maison », lot 2).
- **En prod depuis le 26/09** (recette de Thomas sur iPhone : la caisse et « Ses achats » chargés ; aucune vente
  validée en recette, la vente n'a été essayée qu'en base — la première vraie vente se fera au club).

### Lot 2 : « à la maison » (26/09/2026)

« go lot 2 ». Migration `20261215840000` (remplace `club_caisse` et `club_vendre`, ajoute `club_maison`,
`_club_maison_donnees`, `_club_horaires`). Logique pure et testée : `caisse/maison.ts`.
- **La règle (maquette v3)** : « si elle ne note rien, l'app compte un sachet par jour sans club ». Un jour sans
  pointage retire une dose de chaque produit qu'elle a (F1, PDM, thé, aloé), jamais sous zéro ; aujourd'hui ne
  retire rien. Barres et chips ne vont PAS à la maison (colonne `maison` nulle). La base ne rend que les faits
  (`_club_maison_donnees` : ses doses emportées par jour sur 60 j + ses jours de visite) ; `club_vendre` fige
  désormais `maison` dans chaque ligne, comme le prix.
- **Les jours fermés** viennent des horaires du tunnel public (`horairesDuJour`, rendus par `club_caisse` et
  `club_maison`) ; sans horaires réglés, l'app ne dit JAMAIS « fermé ». Verdun : dimanche + fériés.
- **À la caisse** : la veille d'une fermeture, « Club fermé dimanche, elle revient lundi. » + ce qu'elle a chez
  elle + « De quoi tenir : 1 × Formula 1, 1 × PDM » et un bouton « Ajouter » (jamais pré-rempli) — un F1 par jour
  fermé, le PDM et le thé seulement si elle en a déjà emporté, jamais l'aloé. **Le pack 6 jours** est proposé quand
  le panier a 4 F1 ou plus en sachets et que le pack ne coûte pas plus de 40 % de son prix en plus (« Pack 6 jours
  avec PDM : 1 F1 et 6 thés en plus pour 11,50 € », « Passer au pack » remplace les sachets).
- **Sur sa fiche** (tête de « Ses achats ») : « À la maison · depuis vendredi », « 3 sur 5 » par produit, ses
  derniers jours (au club / chez elle), « De quoi tenir encore 3 jours sans club ».
- **9e règle de Contacter** `f1_bout` : elle a emporté du F1 depuis moins de 30 jours, il lui en reste 1 ou 0, le
  club ferme demain ou après-demain, et elle n'est pas passée aujourd'hui (la caisse le lui a déjà proposé). Clé
  `membre:<id>:f1bout:<jour fermé>`. Données : 3e appel de `useBbcSignaux` (`club_maison()`, tout le club).
- Le journal qui décompte (« shake noté ») : voir le lot 5. Les barres ne vont toujours pas « à la maison ».
- **En prod depuis le 26/09** (« go main » de Thomas ; aucune vente en base à ce moment-là : « À la maison » se
  verra à la première vente de F1 / PDM / Thermo au club).

### Lot 3 : « Ma caisse » (26/09/2026)

« go lot 3 ». Migration `20261215850000` (colonne `club_carte.recette`, fonction `club_ma_caisse(mois)`). Calcul
pur et testé : `caisse/gains.ts` ; écran `caisse/MaCaisse.tsx`, dans « ⋯ Plus » (téléphone : `BbcPlus` ;
ordinateur : `PLUS` de `BbcApp`).
- **La règle (Thomas)** : sur une unité, gagné = prix du club − prix public de l'unité × (1 − sa remise). Sa
  remise vient de `users.current_rank` (`tierPctForRank` : 25 · 35 · 42, et 50 pour tout Supervisor et au-dessus).
- **Prix public et PV d'une unité** : sa référence et ses portions (`herbalifeCatalog` ; le collagène 076K vient de
  `pvCatalog`), sinon ses doses × la recette du club (`RECETTE_CLUB`) — `recette` pour le grand thé-aloé (1 thé +
  1 aloé) et le shake à emporter (F1 + PDM), `maison` pour les packs —, sinon INCONNU (accessoires, barre
  chocolat-citron, chips crème-oignons) : dans le vendu, jamais dans le gagné, et l'écran le dit.
- **L'écran** : le gagné du jour en gros (et le vendu, les PV), ses membres du jour, son mois (vendu, gagné, PV),
  puis la jauge vers le rang suivant — la même que sa fiche (`useDistributorQualifications` +
  `rankProgressionFromWindows`), absente à 50 %. Elle ne voit QUE ses ventes (`vendeur_id` = elle) ; le club
  entier et l'écart de remise du propriétaire, c'est le lot 4.
- **En prod depuis le 26/09** (« go main » de Thomas, sans recette sur la preview : la première vraie vente
  au club remplira l'écran).

### Lot 4 : « Ce mois-ci au club » (26/09/2026)

« go lot 4 et 5 d'affilée ». Migration `20261215860000` (`club_rentabilite(mois)`, propriétaire et admins
seulement : `_club_proprio`, rien pour les autres). Section `caisse/RentabiliteDuMois.tsx` EN TÊTE de
« Rentabilité » (`BbcClub100`, pas de nouvel écran) ; calcul pur dans `gains.ts` (`rentabiliteDuMois`).
- **Ce qui reste au club** (avant loyer et charges) = cartes de visites du mois (`member_cards` créées dans le mois ;
  une carte sans `price_eur` prend le tarif `clubs.settings.cards` et l'écran le dit) − produits servis (visites
  du mois × le coût d'une visite de la recette, calculé juste en dessous) + « vos ventes » (le gagné du propriétaire
  et des admins sur leurs ventes au comptoir) + les écarts Herbalife estimés.
- **L'écart d'une coach** = ses PV vendus au comptoir × (50 % − sa remise) × 1,78 € (`PV_TO_EUR_RATIO`) : ce que
  Herbalife verse à la lignée, le vrai montant arrive dans Bizworks. Une coach à 50 % qui n'est pas propriétaire
  (Maria) ne donne pas d'écart. Sans coût de visite (recette incomplète), pas de « reste » affiché.

### Lot 5 : « le journal qui décompte » (26/09/2026)

« go lot 4 et 5 d'affilée ». Maquette v3, écran 3. Migration `20261215870000` : colonnes `club_carte.aliment` et
`journal_lignes.vente_id`, fonction à jeton `journal_a_la_maison`, et `_club_maison_donnees`, `club_vendre`,
`club_vente_annuler` remplacées. Logique pure et testée : `caisse/maison.ts` (`notesDesLignes`, `avecLeJournal`,
`sachetsDuJour`, `pastillesStock`, `phraseSachets`, `clubFerme`).
- **La règle (maquette)** : « Chez elle, l'app propose et elle confirme. Seul le pointage au club remplit à sa
  place. Si elle ne note rien, l'app compte un sachet par jour sans club. » Un jour où elle a noté un shake F1
  (origine `membre` ou `noaly`, jamais le pré-rempli du club), son journal fait foi pour le F1 ET le PDM :
  f1demi = 1 F1 + 1 dose, f1plein = 1 F1 + 2 doses, f1lait / f1soja = 1 F1 seul, pdmdemi / pdmplein = 1 / 2
  doses. Sinon la règle, et le PDM noté à part s'y ajoute. Thé et aloé : la règle seule. ⚠️ **Cette table de
  doses existe DEUX fois** : `notes` dans `_club_maison_donnees` (SQL) et `DANS_SES_SACHETS` (`maison.ts`) —
  changer l'une, c'est changer l'autre.
- **Chez elle** (espace membre du club seulement, format `bbc` ; l'espace standard n'appelle rien) : dans
  « Mes repas » de l'onglet Journal, « À la maison · 4 sachets F1 · 5 doses PDM » (+ « club fermé aujourd'hui ») ;
  le petit-déj vide dit « Shake F1 · tes sachets du club » ; dans « Ajouter » (petit-déj), le shake de ses sachets
  passe EN TÊTE des habituels — F1 + ½ PDM si elle a du PDM chez elle, sinon F1 + lait — tant qu'elle n'est pas
  pointée ce jour-là et qu'aucun shake F1 n'y est noté (le même habituel et un « Pareil qu'hier » qui ne ferait que
  ce shake ne sont pas reproposés). Un toucher = `journal_ajouter` (origine `membre`) : noté ET un sachet de moins,
  « Noté. Il te reste 3 sachets de F1 à la maison. » Même proposition depuis « Noter mon petit-déj » de l'accueil
  (`JournalAccueil` ne lit le stock que si le petit-déj reste à noter). Le compteur suit le journal ouvert sans
  rappeler la base (`avecLeJournal`). Données : `journal/useALaMaison.ts` → `journal_a_la_maison(jeton)` (comme
  `journal_jour` : ce qu'elle a emporté, ses visites, ses notes, les horaires du club ; ni prix, ni vendeuse).
- **Les upgrades du pointage entrent dans son journal** : `club_vendre` ajoute au petit-déj du jour, origine
  `club`, les upgrades qui ont un `aliment` (F3 → f3, PDM « une dose » → pdmdemi, Fibre pomme → multifibres,
  Beta → betaheart ; rien pour le collagène, la créatine, la fibre orange-goji ni le grand thé-aloé, absents du
  catalogue du journal). `vente_id` : annuler la vente les enlève. Jamais bloquant : un refus du journal
  n'empêche pas la vente. Un produit ajouté à la carte n'a pas d'aliment (aucun écran pour le régler).
- **Sur sa fiche** : la puce d'un jour où elle a noté son shake dit « shake noté » (sauge), plus « chez elle ».
- Le toast du journal (`.jr-toast`) passe sur deux lignes quand il ne tient pas (`width: max-content`,
  `max-width: calc(100vw - 32px)`) : en `nowrap`, « +5 XP · … Il te reste 3 sachets… » sortait de l'écran.

---

## 🔀 Workflow dev / prod

Voir « Repères » en tête de fichier : `main` = prod, `dev/thomas-test` = dev, `feat/x` depuis dev,
**cherry-pick** vers `main`, base Supabase unique. Détail : `docs/DEV_WORKFLOW.md`.
Supabase : projet unique lié (`supabase link`) ; migrations par `apply_migration` (MCP) **puis**
enregistrement de la version du FICHIER (cf. « Migrations »), edge functions par
`supabase functions deploy <name>` (envoie le fichier du DISQUE : comparer au code en ligne avant et après).

---

## ⚠️ Build vérifié avant tout push sur `main`

```bash
npx tsc -b --noEmit
```

Une erreur TS → on corrige avant de pousser. Un build Vercel cassé ne déploie pas (la prod
reste sur l'ancienne version) mais le commit fautif est dans l'historique et il faut un hotfix
dans la panique — vécu le 27/05/2026 (`6d07ccf` → hotfix `5a92fbd`). Sur `dev/thomas-test`
et `feat/*`, des erreurs TS temporaires sont tolérées.

---

## ⚠️ Migrations — le registre et le dépôt ne parlent pas le même langage

> **Réparé le 2026-09-01 : 48 fichiers enregistrés, 0 écart restant.**
> **Re-réparé le 2026-09-18 : 10 fichiers de septembre (310000→390000 + 20260903120000)
> appliqués par MCP sous l'horodatage du jour, jamais enregistrés sous leur numéro de
> fichier. Deux portaient même un NOM plus long dans le registre — retrouvés par le nom,
> vérifiés en base (policy, signature de fonction), puis enregistrés. 0 écart.**
> ⚠️ Le contrôle par empreinte ci-dessous est à refaire après CHAQUE chantier qui applique
> une migration par MCP : `apply_migration` puis l'insert de la version du fichier, toujours.
> Le `max(version)` ne veut RIEN dire ici — voir pourquoi plus bas.

### La cause, et elle n'est pas « on a oublié d'enregistrer »

Le dépôt numérote ses migrations sur une **suite choisie à la main**
(`202612xxxxxxxx`). Or `apply_migration` (MCP) et l'éditeur SQL du dashboard
enregistrent la migration sous **l'horodatage du jour où elle est appliquée**.
La même migration existe donc sous DEUX identités :

| Fichier du dépôt | Entrée du registre |
|---|---|
| `20261211180000_menage_12_08_coupe_le_cron_des_rappels_coach.sql` | `20260812085348` · même nom |
| `20261215270000_rdv_a_conclure_online_bilans.sql` | `20260831210712` · même nom |

D'où l'état trouvé le 01/09 : **133 entrées sans fichier** ET **48 fichiers sans
entrée** — les mêmes migrations, comptées deux fois de deux façons.

### Le danger, précisément

`db push` compare les **versions des FICHIERS** au registre. Un fichier dont la
version manque est **rejoué**. Ce qui attendait ici :
`20260801120000_club_discovery_hours_preopening` aurait **remis les horaires du
club à 09:00–14:00** alors qu'ils valent 08:00–15:00 depuis l'ouverture.
Silencieux, et en plein tunnel de réservation.

### Le contrôle qui fait foi (pas `max(version)`)

`max(version)` affichait `20261211170000` alors que des migrations d'août
étaient enregistrées : la suite du dépôt et l'horodatage réel se croisent. Ce
qu'il faut comparer, ce sont les **ensembles**, par empreinte :

```bash
ls supabase/migrations/*.sql | sed 's|.*/||' | cut -c1-14 | sort | paste -sd, - | tr -d '
' | md5sum
```

```sql
-- doit rendre 0
with fichiers(v) as (select unnest(string_to_array('<la liste ci-dessus>', ',')))
select count(*) from fichiers f
  left join supabase_migrations.schema_migrations m on m.version = f.v
 where m.version is null;
```

### La règle qui a évité une catastrophe

**Vérifier chaque migration EN BASE avant de la marquer appliquée** — l'objet
qu'elle crée existe-t-il vraiment ? Marquer une migration non appliquée efface
du vrai travail en silence.

Trois pièges rencontrés en le faisant :
1. **Une chaîne de `create or replace`** (quatre migrations qui remplacent la
   même fonction) : l'existence ne prouve rien. Chercher un marqueur propre à
   la DERNIÈRE version dans `pg_get_functiondef`.
2. **Les migrations qui ne créent rien** (un `update`, un `cron.alter_job`) : se
   vérifient sur la donnée. Attention à écrire la bonne assertion — j'ai
   d'abord testé « le cron est absent » alors que la migration le **désactive**,
   et j'ai conclu à tort qu'elle n'était pas passée.
3. **Une donnée modifiée depuis** : les horaires du club ne correspondaient plus
   à la migration. Preuve trouvée ailleurs — seules deux migrations écrivent
   `duration_min`/`slot_step_min`, et la base porte les valeurs de celle-ci.

### Le dépôt ne décrivait pas toute la base

`client_messages_jeton_via_fonction_definer` était appliquée en production sans
aucun fichier. Récupérée depuis `schema_migrations.statements` et recommittée
(`20261211165000`). **Toute migration appliquée par MCP doit aussi exister en
fichier**, sinon une reconstruction depuis zéro produit une base incomplète —
ici, la messagerie publique aurait été cassée.

### Reste connu, sans danger

Une entrée `20261211150000` porte un nom dont le fichier est numéroté
`20261211160000` (décalage d'un cran). Inoffensif : un rejeu exige un FICHIER
dont la version manque, jamais l'inverse.

Vérifier aussi les **doublons de numéro** quand plusieurs branches créent des
migrations le même jour (le numéro est la clé primaire du registre) :

```bash
ls supabase/migrations/*.sql | sed 's|.*/||' | cut -c1-14 | sort | uniq -d
```

---

---

## 🖥 Infrastructure — la prod tient sur une `t4g.nano` (incident du 2026-07-29)

**Panne de 2 h 45 un mardi matin : plus personne ne pouvait se connecter.**

### Le diagnostic, dans l'ordre où il faut le refaire

1. **Ne jamais se fier au voyant du tableau de bord** : le projet affichait
   `ACTIVE_HEALTHY` alors que Postgres était mort. Symptômes réels : `522
   Cloudflare` sur `/auth` et `/rest`, port 5432 muet, requête admin en timeout.
2. **Postgres cesse d'écrire ses logs au moment du gel** — il ne laisse rien
   derrière lui. En revanche **`cron.job_run_details` survit au redémarrage** et
   contient l'historique à la seconde. Y chercher `job startup timeout` :
   c'est la signature. Ce n'est pas une lenteur, c'est un **refus d'allouer**.
3. **Lire le bon indicateur.** La vignette « CPU » compte l'**IOwait** — le
   processeur qui *attend le disque*, pas qui calcule. L'indicateur qui prédit
   la panne est **Memory commitment** (Reports → Database) : à 90 %, Linux
   refuse toute nouvelle allocation et plus aucun processus ne démarre.

### La cause

`t4g.nano` = **0,5 Go de RAM**, CPU à crédits. Postgres y réserve d'office
224 Mo de `shared_buffers`, plus ~6 Mo par connexion × ~30 connexions : il ne
reste **rien**, la machine bascule 257 Mo dans le **swap**, et le swap c'est du
disque → IOwait → tout s'effondre.

**Couper des tâches ne remonte PAS le plafond mémoire.** Seul un passage au
plan payant (Micro, 1 Go) le fait — le plan gratuit est verrouillé sur Nano.
⚠️ Facturation **par organisation** : `Shakes&drinks` (Shake Bar) partage la
même org. Un plan payant interdit le Nano, donc **les deux** projets passent en
Micro → ~35 $/mois, pas 25.

### Les tâches automatiques : 676 → 221 lancements/jour

- **`max_worker_processes` = 6.** Sept tâches calées sur `0 * * * *` se
  disputaient 6 emplacements, déjà partagés avec `pg_net` et la réplication →
  empilement → gel. **Ne JAMAIS reprogrammer une tâche sur la minute `0`** :
  elles sont désormais étalées (`5,35`, `8,38`, `15,45`, `25`, `40`, `50`…).
- Coupées : `client-app-data-warmup` (278 lancements/jour qui échouaient tous
  sur `invalid input syntax for type uuid`), `bbc-call-reminder`
  (**à rebrancher à l'ouverture du club**), `daily-actions-notifier-18/19`.
- **`cron.job_run_details` n'est JAMAIS purgée par Supabase** — 32 000 lignes /
  28 Mo au moment de l'incident. Depuis le 18/09/2026 : tâche `purge-journal-cron`
  (03:35, garde **7 jours depuis le 22/09** — 30 h ont suffi à rejouer le diagnostic du 22/09).

### Le 22/09/2026 : trois gels en 20 h, et ce que ce n'est PAS

Hier 19 h, ce matin 5 h 35 → 8 h 32, cet après-midi 14 h 05 → 14 h 37 (Restart project). Mesuré 10 min
après le redémarrage : 426 Mo de RAM, 5 Mo libres, **swap déjà 321 Mo, Committed_AS 1,42 Go pour une
limite de 1,29 Go (110 %)**. Base = **46 Mo** ; connexions normales (PostgREST 11 au repos) ; tâches 5-7/h
à 0,1 s ; journal 2-5 ms par appel. → C'est la pile Supabase elle-même qui ne tient pas dans le Nano,
pas l'app : le remède est le **Micro (1 Go)**, rien d'autre. Ce qui fait basculer : le tableau de bord
Supabase (sa liste d'extensions : **21 s** pour une requête), `get_advisors`, et les migrations (chaque
DDL fait relire toute la structure à PostgREST : plusieurs secondes). **Sur le Nano : pas de
`get_advisors`, pages Database/Advisors du tableau de bord fermées, migrations regroupées.**
Le 22/09 : Shakes&drinks déplacé dans sa propre organisation gratuite (le Pro ne coûte que 25 $),
21 fonctions SQL mortes et 4 fonctions serveur sans appelant supprimées (migration `20261215730000`).

---

---

## 💾 Sauvegardes — ce qu'il ne faut plus jamais refaire (2026-07-29)

La sauvegarde quotidienne (`.github/workflows/backup.yml` → `npm run backup`,
artefact GitHub 90 j, récap en issue le dimanche) était **partielle et
silencieusement cassée** : 14 tables sur 118, sans les comptes de connexion,
et elle échouait depuis des mois sur `activity_logs` — **une table supprimée** —
derrière un récap « ✅ OK ». Corrigée : **117 ensembles, 7 909 enregistrements**.

**Les trois règles :**
1. **Jamais de liste de tables écrite à la main.** Le script appelle
   `public.backup_table_list()` : toute table créée demain est couverte.
2. **Toujours paginer.** `select('*')` se tronque en silence au-delà de la
   limite API.
3. **Échec bruyant.** Toute table en erreur → `process.exit(1)` → issue
   « ❌ SAUVEGARDE ÉCHOUÉE ». Une sauvegarde qui rassure à tort est pire que pas
   de sauvegarde.

⚠️ **Le plan gratuit ne fait AUCUNE sauvegarde Supabase** (« Last backup: No
backups »). Ce script est le seul filet. Non couverts, assumés : les fichiers
binaires du stockage (inventoriés seulement) et l'ordre de restauration
vis-à-vis des clés étrangères.

---

---

## 🔒 Sécurité — les 7 règles issues de l’audit du 2026-07-29

> **À relire avant toute création de table ou de policy.** Cet audit a trouvé
> **deux failles critiques** en une journée, l'app tournant depuis 6 mois. Les
> deux venaient du même angle mort : on écrit des policies sans jamais vérifier
> ce qu'elles laissent réellement passer.

### 1. Une condition qui ne teste ni identité ni jeton n'est PAS une sécurité

La faille la plus grave venait de ceci :

```sql
-- ❌ CE QUI ÉTAIT EN PROD — 52 jetons clients lisibles par n'importe qui
create policy client_app_public_read on client_app_accounts
  for select to public using (expires_at > now());
```

`expires_at > now()` **filtre des lignes, mais n'identifie personne**. Toute
ligne non expirée était donc lisible par tout le monde. Un `GET
/rest/v1/client_app_accounts?select=token` renvoyait les 52 jetons — chacun
ouvrant `/client/:token`, soit le dossier santé complet d'un client.

**Traquer** : toute policy `to public` dont le `qual` ne mentionne ni
`auth.uid()`, ni `is_admin()`, ni `can_access_owner()`, ni un jeton. Les seules
exceptions légitimes sont les tables de **capture publique** (`prospect_leads`,
`online_bilans` en INSERT) et `newsletters` (`status='sent' AND is_public`).

### 2. `USING (true)` sur le rôle `public` = porte ouverte sur Internet

```sql
-- ❌ CE QUI ÉTAIT EN PROD sur assessments : 774 bilans effaçables par un inconnu
create policy assessment_delete on assessments for delete using (true);
```

Le rôle `public` inclut `anon`. Combiné aux GRANT larges par défaut de Supabase,
ça donnait la suppression à n'importe quel visiteur.

### 3. Le RLS ne doit pas être la seule barrière

`anon` est désormais **en lecture seule sur les 113 tables** (DELETE/UPDATE
révoqués, TRUNCATE aussi — il contourne le RLS par nature). Sans ça, une seule
policy permissive posée par erreur rouvre tout en silence. **Ne jamais
re-`grant` DELETE/UPDATE à `anon`** : l'app client passe par les edge functions
en `service_role`, les coachs sont `authenticated`.

**Depuis le 18/09/2026 (lot 1 de l'audit), INSERT aussi révoqué pour `anon`**
(migration `20261215490000`) : il ne peut plus écrire que dans `client_messages`,
`client_referrals` et `rdv_change_requests` — les écritures à jeton de l'app
cliente. Une nouvelle table où l'app cliente écrirait en direct doit recevoir son
`grant insert … to anon` explicitement, sinon l'écriture échoue en « permission
denied ». Même migration : plus d'INSERT public sur `prospect_leads` /
`online_bilans` (tout passe par les edge), consentements visibles seulement si on
voit la cliente, purge nocturne de `cron.job_run_details` (14 j).

### 4. Ne jamais conclure à une faille (ni à son absence) sur un code HTTP

Un `DELETE` sur une ligne inexistante renvoie **204 même quand le RLS
l'interdit** — « zéro ligne touchée » ≠ « autorisé ». Cette erreur m'a fait
annoncer une faille sur `clients` et `follow_ups` qui n'existait pas.

```sql
-- ✅ Le seul test qui fait foi
select policyname, cmd, roles, qual from pg_policies
 where schemaname='public' and tablename = '<table>';
```

### 5. `security definer` sans `search_path` = élévation de privilèges

Une fonction privilégiée sans chemin figé prend celui de l'appelant, qui peut y
glisser un faux objet homonyme. **Toute nouvelle fonction `security definer`
doit porter `set search_path = public, extensions`.**

### 6. Une policy peut être une faille ET un support fonctionnel

**La leçon la plus coûteuse de l'audit.** Les policies `*_public_read` sur
`client_app_accounts` / `client_recaps` / `client_evolution_reports` exposaient
52 jetons — il fallait les retirer. Mais elles étaient AUSSI la seule chose qui
laissait quatre chemins publics lire leur propre ligne :

```
ClientAppPage.tsx:453/456/460   cascade de snapshot -> écran « Lien introuvable »
ClientAppPage.tsx:472/490       onboarded_at, baseline_at
RecapPage.tsx:35/54             /recap/:token, lecture ET écriture des recos
EvolutionReportPage.tsx:58      rapport d'évolution
supabaseService.ts:653          login client par email/mot de passe
```

Résultat : **l'espace client est resté mort 24 h pour les 52 clients**, et deux
pages publiques avec lui.

**Le protocole, avant de retirer une policy `to public` :**
1. `grep` les **DEUX** styles de guillemets — `from("t")` ET `from('t')`. Mon
   grep n'en cherchait qu'un et a raté quatre appels.
2. **Ouvrir chaque appel.** J'avais bien vu `supabaseService.ts` dans les
   résultats, mais j'ai conclu « c'est côté coach » d'après le NOM du fichier.
   Ce fichier contient aussi le login client.
3. **Charger la page dans un navigateur.** Un `HTTP 200` sur une SPA ne prouve
   rien — la coquille répond toujours 200. Seul le rendu fait foi.

**Le remplacement correct** : une policy RLS ne peut pas savoir si l'appelant a
filtré par jeton (elle ne voit que des lignes), donc « public + `expires_at` »
est **forcément** énumérable. Il faut une fonction `security definer` qui EXIGE
le jeton en paramètre et ne renvoie que la ligne correspondante — motif déjà en
place pour `get_client_messages_by_token` et une dizaine d'autres. Ajoutées le
2026-07-30 : `get_client_app_account_by_token`, `get_client_recap_by_token`,
`get_client_evolution_report_by_token`, `set_client_recap_referrals_by_token`,
`get_my_client_app_token`.

### 7. Jamais de sous-requête sur une table dans sa propre policy

La transformation des 187 policies en `(select auth.uid())` a introduit une
**récursion infinie sur `users`** : une policy UPDATE contenant
`EXISTS (SELECT 1 FROM users …)` se re-déclenche à chaque ligne relue. Toute
écriture sur `users` plantait (`infinite recursion detected in policy`).
Passer par une fonction `security definer` — `is_admin()` — qui contourne le RLS.

### Le réflexe, après toute migration touchant une table ou une policy

```
get_advisors(type: "security")   → chercher rls_policy_always_true,
                                   rls_disabled_in_public, function_search_path_mutable
```

⚠️ Piège vécu : une table créée à la volée (même temporaire) arrive **sans RLS**
et est aussitôt lisible par `anon`. Toujours `enable row level security` +
`revoke all ... from anon, authenticated` dans la foulée.

**Non corrigé, et assumé** : ~240 fonctions `security definer` restent
exécutables par `anon`/`authenticated`. C'est **voulu** — l'app client PWA
s'authentifie **par jeton, pas par JWT**, donc ces fonctions doivent être
joignables et se protègent en interne (vérifié : elles répondent « access
denied »). Ne pas « corriger » cette alerte sans repenser l'authentification
client.

---

---

## Règles RLS — cast cross-type

**Jamais `::uuid`** dans une policy permissive. Si besoin de comparer
`client_app_accounts.client_id` (text) avec `clients.id` (uuid) :

```sql
-- ✅ OK : cast sécurisé
WHERE clients.id::text = caa.client_id

-- ❌ DANGER : cast qui peut throw sur une row foireuse
WHERE caa.client_id::uuid = clients.id
```

Raison : Postgres évalue TOUS les policies permissifs en OR. Si UNE
seule ligne de `client_app_accounts` contient un `client_id` pas
UUID-valide, le cast plante et le SELECT entier remonte l'erreur.

---

---

## Architecture data app client (2026-04-26)

### Principe

L'app client (`ClientAppPage` + `ClientHomeTab` + `ClientProductsTab`) ne
fait **JAMAIS** de SELECT direct sur Supabase pour les tables sensibles
(`clients`, `follow_ups`, `pv_client_products`). Elle passe par l'Edge
Function **`client-app-data`** qui :

1. Valide le token client contre `client_app_accounts.token` (uuid unique)
2. Fait les SELECT en `service_role` → bypass RLS propre et auditable
3. Renvoie un payload normalisé (ISO 8601 pour les dates)

### Flow

```
[ Navigateur client ]
    ↓ GET /functions/v1/client-app-data?token=<uuid>
    ↓ Authorization: Bearer <anon_key>
[ Edge Function ]
    ↓ SELECT client_id FROM client_app_accounts WHERE token = ?
    ↓ parallel SELECT:
    ↓   - clients (current_program, notes)
    ↓   - follow_ups (due_date, status, type)
    ↓   - pv_client_products (active=true)
    ↓ JSON response, Cache-Control: 30s
[ Hook useClientLiveData ]
    ↓ fetch initial au mount
    ↓ refetch on window focus (debounce 5s anti-spam Safari ↔ PWA)
[ ClientAppPage merge ]
    ↓ liveData > snapshot (priorité live sur figé)
    ↓ setData avec overrides program_title + next_follow_up
[ Components ]
    ↓ ClientHomeTab (data.program_title, data.next_follow_up)
    ↓ ClientProductsTab (liveProducts prop)
```

### Fallback snapshot

Si l'edge function plante ou timeout, le front fallback silencieusement
sur les snapshots `client_app_accounts.*` (program_title, next_follow_up).
L'expérience reste fluide même en cas de panne réseau.

Pour `pv_client_products`, le fallback affiche un empty state (pas de
snapshot de produits disponible dans `client_app_accounts`).

### Règle RLS (leçon du 25/04/2026)

❌ **NE JAMAIS créer de policy RLS permissive** sur `clients`,
`follow_ups`, `pv_client_products` pour permettre au client app de lire
ses données directement. Raison : `client_app_accounts.client_id` est
`text` alors que `clients.id` est `uuid`. Un cast `::uuid` dans une
policy permissive plante à l'évaluation si une seule row de
`client_app_accounts` contient un `client_id` non-UUID valide → **toute
la table clients devient illisible**, même pour les coachs admin.

Toute évolution data côté client app passe par l'edge function.

### Comment ajouter une nouvelle donnée visible par le client

1. Ajouter le SELECT dans `supabase/functions/client-app-data/index.ts`
2. Étendre le type `ClientLiveData` dans `src/hooks/useClientLiveData.ts`
3. Lire la nouvelle donnée dans le composant qui en a besoin (via
   `liveData.*` ou via le merge si on veut aussi un fallback snapshot)
4. Ajouter un fallback snapshot si la donnée est critique (sinon empty
   state acceptable)
5. **NE JAMAIS créer de SELECT direct** dans ClientAppPage /
   ClientHomeTab / ClientProductsTab

### Déploiement

```bash
supabase functions deploy client-app-data --no-verify-jwt
```

`--no-verify-jwt` parce que le client app n'a pas de JWT Supabase
(auto-login custom via token UUID). L'auth se fait DANS la function
par le lookup `client_app_accounts.token`.

---

---

## Garde-fou front — fetch silent fail

Le hook `lastFetchError` dans `AppContext` (côté coach, pas client) est
un garde-fou installé le 25/04/2026 après la frayeur RLS. Si un fetch
principal plante silencieusement, un bandeau rouge apparaît en haut de
l'app coach avec le message Supabase exact. **NE PAS retirer.**

---

---

## Règle datetime — `timestamptz` partout (depuis 29/04/2026)

**Toutes les colonnes datetime des tables métier sont en `timestamptz`.**
Migration de référence : `20260429160000_datetime_to_timestamptz.sql`
(convertit `clients.next_follow_up`, `assessments.next_follow_up`,
`follow_ups.due_date` en supposant que les valeurs existantes étaient
en heure Paris).

Front : toujours envoyer un ISO 8601 avec offset (`new Date(...).toISOString()`
produit du `Z`). La fonction utilitaire `serializeDateTimeForStorage`
dans `src/lib/calculations.ts` gère ça.

❌ **NE JAMAIS créer une nouvelle colonne datetime en `timestamp`** (sans
tz). Postgres l'interprète comme heure locale serveur, ce qui drift
selon le DST et le navigateur. `timestamptz` toujours.

---

---

## 🌐 Les trois domaines — `labase-nutrition.com` n'est PAS un vieux domaine

| Domaine | Sert | Racine |
|---|---|---|
| `www.labase360.fr` | l'app coaching (prod) | l'app, derrière login |
| `www.labase-nutrition.com` | **le site du Breakfast Club** | → `/club` (302, `vercel.json`) |
| `commande.labase-nutrition.com` | le Shake Bar | (hors app — cf. `CONTEST_URL`) |

Les trois pointent aujourd'hui vers **le même déploiement Vercel**. C'est
`vercel.json` qui aiguille par `host`, et `api/club-meta.ts` qui sert déjà les
bonnes méta Open Graph des pages `/club*` et `/reserver*` (rewrite bot-only,
même motif que `coach-meta`).

### Les deux pièges de la redirection racine (2026-08-13)

1. **Ne pas la supprimer** en croyant « libérer » le domaine. La route `/` est
   derrière `ProtectedRoute` et renvoie vers `/co-pilote` : sans redirection,
   un visiteur du site club atterrit sur **l'écran de connexion de l'app
   coach**. Elle doit pointer vers `/club`, pas disparaître.
   *(Elle visait `/reserver` jusqu'au 2026-08-13 — vestige de l'époque où la
   vitrine n'existait pas et où le domaine servait de raccourci vers le tunnel
   de réservation.)*

2. **Ne jamais la passer en 301 vers `labase360.fr`.** Une branche l'a proposé
   en traitant ce domaine comme un ancien à faire mourir. Un 301 est mis en
   cache **durablement par les navigateurs** : le site club resterait
   inaccessible pour tous ceux qui l'ont visité, même après correction. Le 302
   se retire, le 301 non.

⚠️ **`vercel.json` n'accepte aucune clé hors schéma** — pas de `_comment`, pas
de commentaire JS. Une propriété inconnue dans un `redirect` fait échouer le
déploiement. Toute explication va ici, pas dans le fichier.

Reste à faire quand le site club aura son domaine : `index.html` porte **un
seul jeu de méta** (titre, favicon, image de partage, manifeste PWA), codé en
dur sur La Base 360. Les assets Breakfast existent (`public/brand/breakfast-club/`)
mais ne sont pas câblés par domaine — seules les pages `/club*` ont leurs méta
via `club-meta`.

**Les liens d'espace membre `/client/<jeton>`** (22/09) ont les leurs : `api/client-meta` (edge, robots
seulement via `vercel.json`) → habillage Breakfast Club pour une membre du club (`apercu_espace_membre`,
lit `clients.ebe_bbc`, ne rend que `club`/`app`), La Base 360 sinon ; `noindex`, jamais de nom.
⚠️ **Telegram et WhatsApp gardent une image d'aperçu en mémoire d'après son ADRESSE** : l'image
`og-image-1200x630.png` avait gardé l'ancien logo chez eux alors que la prod servait le nouveau. Changer
d'image = changer d'adresse (`?v=2` depuis le 22/09). Un aperçu déjà vu se rafraîchit sur Telegram avec
@WebpageBot.

**L'installation de l'espace membre (« Sur l'écran d'accueil »)** : `api/client-manifest?token=` (edge) sert le
manifeste d'UNE cliente (start_url = id = `/client/<jeton>`, scope `/client/`) ; un petit script d'index.html le
pose AVANT tout, `ClientAppPage` le repose et rend le manifeste coach au démontage. ⚠️ **Jamais de manifeste en
`blob:`** : Android le lit, l'iPhone NON — il retombait sur le manifeste coach (`start_url: /login`) et l'icône de
Gwen ouvrait la page de connexion (22/09, du 16/06 au 22/09 sur iPhone). Installée de travers : supprimer
l'icône, rouvrir le même lien dans Safari, refaire « Sur l'écran d'accueil ».

**Le lien d'accès refait — `/bienvenue?token=`** (22/09, maquette 7pdf4sTkQoHob1axp76vfP, Thomas : « il est top ») :
1 · **Découvrir** — « La Base, ce sont trois maisons » avec les VRAIS logos (`TroisMaisons`) : La Base Nutrition
« pour ton coaching », The Breakfast Club « ton club petit-déjeuner », La Base Shakes & Drinks « les boissons
énergisantes et les smoothies protéinés » ; SA maison en tête et en couleur (orange du club pour une membre,
teal pour une cliente en coaching) · 2 · **Mot de passe** — son identifiant affiché (email masqué) ; sans email
en fiche, un champ et une phrase (plus de pop-up) · 3 · **Installer — dans SON espace**, jamais sur /bienvenue :
là, le manifeste est celui du COACH (`start_url /login`), l'icône posée s'ouvrait sur la connexion. /bienvenue
envoie par un VRAI chargement (`window.location.replace`) vers `/client/<jeton>?welcome=1&installer=1` →
`InstallerEspace` (iPhone / Android en 3 gestes, l'icône qu'elle va voir, « ouvre dans Safari » si le lien s'est
ouvert dans Telegram/Messenger), 6 s d'attente au plus pour savoir si c'est une membre. **Une membre du club
installe « Mon club »** (le médaillon sur fond noir, `public/brand/breakfast-club/apple-touch-icon-180` + `pwa-*`) :
Android par `api/client-manifest` (qui lit `apercu_espace_membre`, 2,5 s au plus, sinon La Base 360), iPhone
par l'apple-touch-icon et le titre d'app que `ClientAppPage` change pour elle. `validate-invitation-token`
rend `club` (ebe_bbc) et `email_masque`. Code : `src/components/bienvenue/` (styles `bienvenue.css`, jetons
`--bv-*` propres à la page). Le logo du bar vient du dépôt du Shake Bar (`Documents/code/labase-shakesbar`) et de
Thomas : `public/brand/shakes-drinks/` (WebP). Retirés : `ExplainerModal` (pop-up) et `MagicLinkFallback` (le
lien WhatsApp de secours : l'espace installé s'ouvre par son jeton, sans connexion).

**L'entrée, au même langage** (22/09, maquette Fbk2bRMgzC4bMLYAm91nLM, « bon travail, bravo ») — `/welcome`,
`/login`, `/forgot-password`, `/reset-password` habillées comme /bienvenue (jetons `--bv-*`, `bienvenue.css`) :
l'accueil présente les trois maisons avec leur geste (`MaisonsEntree gestes` : coaching → `/decouvrir`, club →
`/club`, bar → commande.labase-nutrition.com) + UN bouton « Me connecter » — /login sert la cliente, la membre ET
la coach. ⚠️ `/decouvrir` = la découverte du COACHING La Base, pas le Breakfast Club. Ordinateur (≥ 900 px) :
deux colonnes (`.bv-entree` : maisons à gauche, geste à droite) ; téléphone : une colonne, la connexion n'y montre
que les trois logos en petit (`FamilleLogos`). Logique inchangée : « Content de te revoir » / « Pas {prénom} ? »
(dernier email et prénom sur l'appareil), redirection selon le rôle, `send-password-reset`, la détection du lien
de reset (3 formats, 4,5 s d'attente). Retirés de /welcome : `ProfileCard`, `ClientModal` (la pop-up « As-tu un
lien ? », devenue une phrase), `components/welcome/ProspectFormModal` (jamais ouvert).

---

---

## ⚠️ Configs racine : la source est le `.ts` (27/07/2026)

`tailwind.config.ts` et `vite.config.ts` sont les **seules** sources ; les `.js` / `.d.ts`
correspondants ne sont ni générés ni committés (`tsconfig.node.json` en `noEmit`, noms dans
`.gitignore`). **Ne jamais éditer `tailwind.config.js`** : Tailwind le résout AVANT le `.ts`
et un `.js` qui traîne masque la source en silence (vécu de mai à juillet 2026 : palette
`lb360` ajoutée au `.js` seul, effacée à chaque build ; le code n'utilise que les variables
CSS `var(--lb360-*)` de `globals.css`).

---

## 🎚 Niveau d'app — `users.app_level` (chantier Simplification, 2026-07-27)

> **À lire avant d'ajouter ou de masquer quoi que ce soit dans un menu.**

Constat prod : un distri avait ~45 destinations atteignables depuis les menus,
alors que Mélanie (65 clients, 405 bilans, la 2e plus active) n'utilise que
bilan / clients / agenda / CRM. Décision Thomas : **on ne supprime rien, on
rend visible selon la personne.**

- `users.app_level` = `essentiel` (défaut de tout le monde) | `complet`
- **Thomas seul en `complet`** au départ ; il ouvre au cas par cas depuis
  `/users` → panneau membre déplié → « Niveau d'app ».
- Un coach peut demander l'accès depuis le cockpit La Base Académie →
  table `app_level_requests` → bannière en haut de `/users`. **Pas de push.**

### Les 3 règles à ne jamais casser

1. **Ça masque un MENU, jamais une route ni une donnée.** Une URL tapée à la
   main, un lien de push, une annonce, un deep-link Co-pilote : tout continue
   de marcher pour tout le monde. Donc aucun lien existant ne casse.
2. **Ce n'est pas de la sécurité.** Le contrôle d'accès réel = RLS + rôle.
   Ne jamais protéger quelque chose de sensible avec ce système.
3. **Le niveau est indépendant du rôle.** Mélanie est admin ET en essentiel :
   elle garde « Mon équipe » (admin) mais pas les outils avancés. Les deux
   filtres se composent.

### Où ça se règle

**`src/config/appVisibility.ts`** — carte UNIQUE feature → niveau. C'est le
seul fichier à toucher pour faire (ré)apparaître une entrée de menu.
Côté React, tout passe par `useAppLevel().can("clé")` — ne jamais lire
`currentUser.appLevel` en direct.

Un garde-fou SQL (`users_guard_app_level`) empêche l'auto-promotion : la policy
`users_update_self` laisse chacun modifier sa propre ligne, donc sans trigger
n'importe qui pouvait se passer en `complet`.

### Ce qui est passé en `complet` (= Thomas only)

`Mon développement`, `FLEX` (0 check-in en base), `Ma Liste 100` (13 contacts,
100 % Thomas), `Cahier de bord`, `Simulateur EBE`, `Routine du jour`
(9 cochages en tout — reste joignable par sa notif de 20h).

⚠ **Piège vécu** : le CTA « + Nouveau bilan » de la sidebar était ancré sur la
présence de l'item `/developpement`. Masquer celui-ci faisait disparaître le
bouton principal de l'app. **Ne jamais ancrer un élément d'UI sur la présence
d'un item de menu filtrable** — cf. `newBilanAnchorPath` dans `AppLayout`.

### Diète notifications (même chantier)

26 crons → 15 (27/07), puis les 15 tâches inactives ont été **supprimées** le 18/09/2026
(migration `20261215500000`, leurs commandes y sont en commentaire) : il reste 13 tâches,
dont `bbc-call-reminder` gardée inactive pour l'ouverture des appels du soir. Mesure avant coupe : ~3 push/jour/coach, dont 2
venaient de FLEX. **Toute feature qu'on masque doit aussi arrêter de notifier.**

---

---

## 🧭 Navigation — la règle anti-dérive (B9, 13/06/2026)

À relire avant d'ajouter **toute** entrée de menu, onglet ou page :
- **Une feature = un seul endroit.** Le reste n'est qu'un *raccourci* (deep-link), jamais une 2e implémentation.
- **Max 5 onglets par page.** Au-delà → regrouper (fiche client 7→5 ; Paramètres via un onglet « Admin »).
- **2 hubs, pas plus** : « Mon business » (faire / piloter) et « Mon développement » (apprendre). Ne pas mélanger.
- **Avant d'ajouter une entrée**, vérifier qu'elle n'existe pas déjà ailleurs → raccourci, pas doublon.
- **Deep-links robustes** : mapper `?tab=<slug>` via une table slug → clé (`ClientDetailPage`
  `TAB_SLUG_TO_INDEX`, `ParametresPage` `LEGACY_ADMIN_SLUGS`) pour qu'une re-indexation ne casse
  pas les vieux liens (Co-pilote, Agenda, push).
- Sidebar standard (7-9 items selon rôle) : Co-pilote · Dossiers clients · CRM · Agenda · Messagerie ·
  Mon business · Mon équipe (admin) · Mon développement (niveau complet) · Paramètres. Une nouvelle
  feature éducative = une card dans `DeveloppementHubPage.tsx::CARDS[]`, pas une entrée de menu.
- ⛔ **Depuis le 17/09/2026 : aucune fusion de menus avant la carte de la section ET la décision de Thomas**
  (« l'app est trop compliquée, même pour moi » — mais la maquette « 4 écrans » a été jugée trop radicale).

---

## 🎨 Thèmes — trois jeux de tokens, jamais de couleur en dur

1. **App coach interne** (`src/styles/globals.css`) : `:root` = Dark Premium (gold `#C9A84C`, teal
   `#2DD4BF`), `html.theme-light` = Light Premium. **Règle absolue** : dans un `.tsx` interne,
   uniquement `var(--ls-*)` — jamais de `#HEX`. Fonds tintés : `color-mix(in srgb, var(--ls-gold) X%, transparent)`.
2. **Mode BBC** : `src/styles/bbc-tokens.css` (crème / orange du Breakfast Club). `.bbc-main` est en
   `overflow-x: clip` pour que `position: sticky` marche ; en thème clair, les champs sont re-forcés
   aux tokens BBC.
3. **Pages publiques V2** (`public-tokens.ts` + `public-shell.css`, `<PublicShell defaultTheme="dark">`) :
   tokens `--ink/--cream/--teal/--violet/--coral/--gold`, toggle persisté `ls-public-theme`, fonts Sora +
   Inter + Syne. Indépendant du thème coach. `BusinessPage` a son propre namespace `--biz-*` (voulu).

Animations en CSS pur (pas de framer-motion), `@media (prefers-reduced-motion: reduce)` pour couper,
emojis en `aria-hidden`. Audit couleurs en dur : `grep -r "#[0-9A-F]" src/`. Trois thèmes futurs
(ocean / sunset / forest) sont prêts en commentaire en bas de `globals.css`.

---

## 📣 Quand une feature est livrée

1. Le code est en prod (`main`).
2. Si l'usage n'est pas évident : une fiche dans le hub `/developpement` (ou un mode d'emploi
   envoyable, cf. `mail-agenda-club`).
3. Une annonce `app_announcements` est **facultative** (décision Thomas : « l'équipe ne les lit
   pas ») — on la propose, on ne l'impose pas. Si oui : insert `(title, body, emoji, accent,
   link_path, link_label, audience, published_at)` ; la cloche, le popup (1×/jour/annonce via
   `localStorage.ls-spotlight-shown-<id>`) et `/developpement/nouveautes` sont câblés
   (`AnnouncementBell`, `AnnouncementSpotlight`, `NouveautesPage`).

---

## 🧾 Règles PV / programmes — à lire avant toute modif PV
### Programmes / produits (audit du 16/07/2026)
- **Source de vérité programme = `PROGRAM_CHOICES`** (`src/data/programs.ts`), la SEULE liste qui contient « À l'unité » (`unit`). `PROGRAMS_LEGACY` **exclut `unit`** (ligne 198) : ne JAMAIS l'utiliser pour résoudre le programme retenu d'un bilan. C'était la cause d'un bug majeur (programme vide → 0 produit → fiche + Co-pilote + PV cassés).
- **`resolvePvProgram` ne doit JAMAIS replier sur un programme à routine non vide.** Le repli est `unit` (`includedProductIds: []`). Avant il repliait sur Starter → tout titre inconnu (« À l'unité », « Programme a confirmer », « », « Libre ») injectait 3 produits **fantômes** (aloe-vera + the-51g + formula-1) → PV et rentabilité faux sur des clients qui n'avaient rien pris.
- **Le catalogue PV est DUPLIQUÉ** : `src/data/pvCatalog.ts` (front) et `api/update-assessment.ts` (Vercel, ne peut pas importer le front). Toute modif de l'un doit être répercutée sur l'autre.
- `clients.pv_program_id` contient **2 espaces d'id mélangés** en base (PV `premium` ET legacy `p-premium`) → les alias `p-*` dans `pvProgramOptions` sont **obligatoires**, ne pas les retirer.
- **Règle métier (Thomas)** : produits retenus au ticket ⇒ le client démarre (statut `active`, produits créés), même sans « démarré » coché à l'étape 12.
- **Ne jamais purger `pv_client_products` sans pouvoir les reconstruire** (`api/update-assessment.ts`) — l'ancien code supprimait tout puis sautait le re-seed = perte de données silencieuse.

### Paliers, fenêtres glissantes, qualifications
Voir **`docs/HERBALIFE_PALIERS_REGLES.md`** (paliers, fenêtres glissantes, qualifications) — à lire AVANT toute modif sur le calcul PV / rentabilité / FLEX margins. Récupéré en prod le 2026-06-03 (était piégé sur une branche morte).

---

## 🧠 PV et Bizworks — ce que l'app compte, et ce qu'elle ne comptera jamais

**Bizworks** (l'app Herbalife) est la source de vérité des PV. **L'app ne tracke que les
commandes passées via une fiche client** (`pv_client_products`) : elle sous-estime toujours
(conso perso, club, ventes hors fiche, downline). **Décision Thomas (05/05/2026)** : ne PAS
dupliquer Bizworks. Solution livrée : un champ admin « PV Bizworks ce mois »
(`users.monthly_pv_override`, RPC `set_user_pv_override`, UI `PvOverrideBlock` /
`PvBizworksBlock`) qui override la jauge du Co-pilote.

**Source unique de mise à jour des PV (14/06/2026)** = onglet « PV équipe » de `/rentabilite`
(`RentabilityPvTeamTab`, deep-link `?tab=pv-equipe`) : override Bizworks par distri de l'app +
PV des distri hors-app (`manual_pv_entries`, lus par `useManualPvEntries`). Les autres
endroits (fiche distri, drill-down équipe, Paramètres › Équipe) sont des **raccourcis**.
Aucune logique de calcul (`herbalifeFormulas.ts`, `docs/HERBALIFE_PALIERS_REGLES.md`) n'a
été touchée par cette réorganisation. Plan d'action PV du matin : RPC `get_pv_action_plan` +
hook `usePvActionPlan` (Co-pilote).

---

## 💳 Encaissement — Square et Stripe, chacun son compte

- **Modèle (décision Thomas, 15/06/2026)** : chaque distri encaisse avec **SON PROPRE compte**
  Square ou Stripe. L'argent va 100 % chez lui, **jamais sur un compte plateforme** : pas de
  Stripe Connect, pas de commission. Onboarding = il colle sa clé dans **Mon business →
  Encaissement** (`/encaissement`, `PaymentSettingsCard`).
- Edges : `create-payment-link` (caisse depuis la page Résultat Bilan, prix côté serveur) ·
  `confirm-stripe-payment` (au retour, revérifie la session avec la clé DU distri — aucun
  webhook à configurer chez lui) · `square-payment-webhook` (signature HMAC) ·
  `create-manual-payment-link` (montant libre : Mon panier, fin de bilan, étape 11 —
  **Square OU Stripe** selon la config ; fix du 16/07 : était Stripe-only) ·
  `stripe-manual-reconcile` (cron, confirme les liens manuels en attente).
- Tables : `coach_payment_settings`, `bilan_orders` (migration `20261202080000`).
- Config Square de Thomas dupliquée à Mélanie (2 admins, même compte).
- Non fait, assumé : le flow « clôture panier au comptoir POS » de la vision d'origine.

---

## 📣 Campagnes email — les 3 types de contenu (2026-08-19)

Page admin `/admin/campagnes` (+ `/admin/campagnes/:id`), via **Paramètres →
Admin**, admin only. Tables : `campaigns`, `campaign_recipients` (tracking PAR
personne), `email_suppressions` (liste de suppression GLOBALE et définitive).

### Les 3 types (`campaigns.type`)

| Type | Contenu | Rendu |
|---|---|---|
| `rich` | `body_json` — hero + blocs + offre + bouton | `compileCampaignHtml()` : identité **La Base 360** (header sombre, dégradé teal→violet) |
| `plain` | `body_text` — une lettre | `compilePlainText()` : texte brut |
| `html` | `body_html` — **gabarit libre** | `compileCustomHtml()` : le HTML part tel quel |

**Pourquoi le type `html` existe** : les types `rich`/`plain` **échappent tout
le contenu** (`esc()` dans `campaign-html.ts`) et imposent le gabarit maison.
Impossible d'envoyer un email à une autre identité (ex. la lettre Breakfast
Club crème/orange de l'ouverture du 7 septembre). Les contournements coûtaient
plus cher que le mode : envoyer hors de l'app aurait perdu le tracking **et**
l'exclusion des désabonnés — manquement RGPD sur plusieurs centaines de
personnes.

### Les deux jetons du mode `html`

- `{prénom}` (accolades **SIMPLES**, pas doubles) → remplacé par le prénom du
  destinataire. Sans prénom, « Bonjour {prénom}, » devient « Bonjour, » proprement.
  ⚠️ `{{Prénom}}` ne marche PAS : la regex matche l'intérieur et laisse les
  accolades externes → « Bonjour {Marie}, » chez le destinataire.
- `{lien_desabonnement}` → l'URL de désinscription. **S'il est absent, un pied
  de page est injecté d'office avant `</body>`** : on ne peut pas envoyer une
  campagne sans porte de sortie, même en cas d'oubli.

### Ce qui reste garanti quel que soit le type

Exclusion `email_suppressions` au moment de l'envoi · en-têtes
`List-Unsubscribe` + `List-Unsubscribe-Post` (désabo 1-clic, exigé par Gmail
pour les envois de masse) · envoi par lot **résumable** (`MAX_PER_CALL = 120`,
seuls les `sent_at IS NULL` sont repris → pas de double envoi) · tracking par
destinataire alimenté par le webhook Resend.

### Pièges vérifiés en production

- **Le bouton « 🧪 Tester » n'envoie AUCUN mail** — c'est un dry-run qui compile
  un échantillon et compte les destinataires. Pour voir le rendu réel : créer
  une campagne avec sa seule adresse et l'envoyer pour de vrai.
- **L'envoi tourne dans le NAVIGATEUR** (l'UI rappelle l'edge jusqu'à
  `remaining = 0`). Fermer l'onglet interrompt l'envoi en cours de liste ;
  re-cliquer sur Envoyer reprend proprement.
- **Quota Resend — PLAN PRO depuis le 2026-08-25.** Le plafond de 100 mails/jour
  de l'offre gratuite **n'existe plus** : une campagne n'a plus à être bridée à
  50/jour, et il n'y a plus de risque qu'un envoi de masse mange la confirmation
  de RDV d'un client. ⚠️ **Cette ligne disait le contraire jusqu'au 25/08** — si
  un raisonnement s'appuie sur « on n'a que 100 mails », il est périmé.
  Reste à surveiller : le quota MENSUEL du plan et la limite de requêtes par
  seconde (les envois en lot restent séquentiels, cf. `MAX_PER_CALL = 120`).
- `campaigns.status` doit valoir `sent` pour que l'écran Résultats s'affiche.
  Si un envoi est interrompu, la campagne reste en `sending` : les stats
  arrivent bien en base mais l'UI n'affiche rien.
- Les pourcentages se calculent sur `delivered_count` : tant qu'aucun event
  `delivered` n'est arrivé, les taux affichent « — ».

### Appeler `campaign-send` sans session (scripts, tests)

La fonction exige un JWT **admin**. Pour la déclencher hors navigateur :
`POST /auth/v1/admin/generate_link` (service_role, `{type:'magiclink', email:<admin>}`)
— ⚠️ **les champs sont à la RACINE de la réponse, pas sous `properties`** —
puis `POST /auth/v1/verify` avec `{type:'magiclink', token_hash:<hashed_token>}`
→ `access_token`. **Révoquer ensuite** via `POST /auth/v1/logout`.

---

---

## 🎉 Page remerciement post-bilan (27/04/2026)

`/clients/:clientId/bilan-termine?token=<client_recaps.token>&firstName=<prénom>` (`BilanTermineePage`
→ `ThankYouStep`), affichée après « Enregistrer et terminer le bilan » : QR code (fond blanc dans les
2 thèmes, scannabilité), partage WhatsApp / SMS / Telegram, parrainage, avis Google (URL réelle dans
`ThankYouStep.tsx`), retour fiche. Params URL-encodés ; si absents (refresh), repli `AppContext.getClientById`
+ `window.location.origin`. `ClientAccessModal` reste utilisée hors de ce flow (bouton « Envoyer l'accès »).

---

## ⚡ Edge Functions — les 76 (au 22/09/2026)

| Function | Déclenchement | Rôle |
|---|---|---|
| `campaign-send` | fetch front (admin, JWT) | Envoi d'une campagne par lot — dry-run / send. `verify_jwt=false` (contrôle admin DANS la fonction) |
| `campaign-unsubscribe` | GET (page) + POST (1-clic Gmail) | Désabonnement → alimente `email_suppressions` |
| `client-app-data` | fetch front (app client) | Migration RLS → service_role |
| `client-app-mark-onboarded` | fetch front (app client) | Marque PWA onboardé |
| `client-anniversary-check` | cron `4 7 * * *` (9 h 04 Paris) | Points XP de la cliente : anniversaire +50, 1 / 3 / 6 mois depuis son 1er bilan +50 / +100 / +150. En erreur 500 chaque matin de mai au 21/09 (RPC `exec_anniversary_query` absente) : réparée le 21/09, points adoucis, 0 point jamais donné avant |
| `generate-auto-login-token` | fetch front (coach) | Lien magique app client |
| `consume-auto-login-token` | fetch front (app client) | Auto-login PWA |
| `generate-distributor-invite-token` | fetch front (coach) | Invite distri |
| `consume-distributor-invite-token` | fetch front (onboarding distri) | Signup distri |
| `validate-distributor-invite-token` | fetch front (onboarding distri) | Check validité |
| `validate-invitation-token` | fetch front (`/bienvenue`) | Check validité ; rend aussi `club` (ebe_bbc) et `email_masque` depuis le 22/09 (la page refaite). verify_jwt (clé publique) |
| `consume-invitation-token` | fetch front (onboarding client) | Signup client |
| `submit-prospect-lead` | fetch front (form Welcome) | Création lead anon |
| `submit-online-bilan` | fetch front (form bilan online) | Création Lead chantier #1 |
| `submit-testimonial` | fetch front (form public) | Création témoignage modéré |
| `get-testimonial-context` | fetch front (form public) | Pré-remplit contexte témoignage |
| `send-push` | fetch front + Edge interne | Envoi Web Push |
| `rdv-imminent-notifier` | cron `8 5-18 * * *` UTC (1×/heure, 7 h–20 h Paris l'été, depuis le 21/09 ; toutes les 30 min avant) | « RDV dans 1 h » au coach (fenêtre 30–90 min devant : à l'heure, rien n'est raté) |
| `new-message-notifier` | trigger Postgres | Notif nouveau message client |
| `new-coach-message-notifier` | trigger Postgres | Notif coach → client |
| `formation-validation-notifier` | trigger / fetch | Notif validation module |
| `dispatch-newsletter` | fetch front (admin, `AdminNewsletterEditPage`) | Envoi d'une newsletter : test à l'admin, ou à tous selon l'audience ; lien de désinscription signé par destinataire (`%%DESABO%%`) |
| `client-app-set-baseline` | fetch front (app client) | Point de départ poids/mensurations à l'onboarding (chantier poids couche 2) |
| `noaly` | fetch front (coach + client + bilan) | IA Noaly multi-modes (crm_message / coach_chat / client_chat / bilan_analysis). `client_chat` lit le journal du jour depuis le 21/09 (si la personne le tient) |
| `get-online-bilan-results` | fetch front (page publique) | Données page premium /resultat-bilan/:token (no-verify-jwt) |
| `create-payment-link` | fetch front (page publique) | Caisse directe : Square quick_pay OU Stripe Checkout Session (compte du distri), prix serveur (no-verify-jwt) |
| `square-payment-webhook` | webhook Square | payment.updated → bilan_orders paid + push coach (auth = signature HMAC) |
| `confirm-stripe-payment` | fetch front (page publique, retour caisse) | Vérifie la Checkout Session via la clé secrète DU distri → bilan_orders paid + push coach. Pas de webhook à configurer côté distri (no-verify-jwt) |
| `create-manual-payment-link` | fetch front (coach authentifié) | Lien « montant libre » hors bilan (Mon panier + fin bilan physique ThankYouStep + ticket programme étape 11 via `InlinePaymentButton`). **Square OU Stripe** selon config du distri (fix 2026-07-16 : était Stripe-only → « pas activé » pour les coachs Square). Auth = JWT distri (verify_jwt par défaut), credentials côté serveur |
| `qualif-bootstrap` | fetch front (page publique /qualif/:token) | Chantier Qualif : mode "status" (lecture, vérifie `bilan_orders` payé côté serveur) / "register" (crée fiche self-serve = clients + assessment + client_app_accounts + auth.users + client_qualif_onboarding + client_consents, IDEMPOTENT via `online_bilans.converted_to_client_id`). (no-verify-jwt) |
| `qualif-update` | fetch front (page publique /qualif/:token) | Chantier Qualif : avance le parcours (modes flavor/skip_flavor/app_opened/telegram/complete). Écrit `client_qualif_onboarding` (dont `flavor_choices` jsonb F1+Thé+Aloé). Mode flavor → push coach « 🥤 X a choisi ses saveurs ». (no-verify-jwt) |
| `client-rdv-reminder` | cron `5,35 4-20 * * *` UTC (toutes les 30 min, 6 h–22 h 35 Paris l'été, depuis le 21/09 ; 24 h/24 avant) | Rappel RDV AU CLIENT / PROSPECT, 3 sources : (1) `follow_ups` client PWA → push 2h avant + push/email veille 18h (anti-doublon `client_rdv_reminders_sent`) ; (2) `rdv_bookings` prospect funnel public → email veille 18h (anti-doublon `rdv_bookings.reminder_email_sent_at`) ; (3) `prospects` = RDV ajoutés À LA MAIN dans l'Agenda → email veille 18h si email renseigné (anti-doublon `prospects.reminder_email_sent_at`, ajouté 2026-07-25). ⚠️ le bloc follow_ups est sous garde `if (rows.length>0)` — les blocs prospects tournent MÊME sans suivi client (avant : return anticipé les court-circuitait) |
| `bbc-call-reminder` | cron */10 | **Mode BBC** — séquence de rappels des rituels : midi le jour J / −30 min / −15 min → push MEMBRE ; +30 min après → push COACH (« patate chaude », suivi 10 min). Anti-doublon `club_call_reminders_sent` (registration_id + kind). Ne notifie pas le +30 si le suivi est déjà marqué fait. Les 3 push membre mènent à sa PWA, et le −15 min ouvre le lien Zoom réglé dans `clubs.settings.links`. |
| `book-rdv` | fetch front (page publique /rdv) | Réservation RDV funnel : résout coach par slug, re-check anti-doublon, insert `rdv_bookings`, notif push coach (no-verify-jwt) |
| `send-password-reset` | fetch front (/forgot-password) | Mot de passe oublié via Resend : `admin.generateLink(recovery)` + envoi Resend (contourne le mailer Supabase bridé « limite atteinte »). Anti-énumération + throttle IP/email. Template `_shared/email.ts`. (no-verify-jwt) |
| `client-rdv-ics` | fetch front (PWA client) | Le prochain RDV du client en fichier `.ics` (Apple Calendrier, Outlook…). ⚠️ **Fonction serveur et pas `data:` URI** : iOS ignore l'attribut `download` sur data:/blob:, et c'est pire en PWA installée — une vraie URL en `text/calendar` est la seule chose qu'iOS, Android et le bureau traitent pareil. La date est **relue en base** via le jeton, donc un RDV déplacé donne le bon fichier. `METHOD:PUBLISH` (pas REQUEST : ce n'est pas une invitation à accepter) et UID stable (recliquer met à jour au lieu de créer un doublon). (no-verify-jwt) |
| `newsletter-unsubscribe` | lien dans les mails + Gmail 1-clic | Désinscription newsletter. Le lien porte l'**adresse SIGNÉE** (HMAC, `_shared/unsubToken.ts`) : la newsletter part à 4 publics et son HTML est bâti une seule fois, donc pas d'id de destinataire à mettre dedans — mais une adresse en clair ferait un bouton « désabonne n'importe qui ». Écrit dans `email_suppressions` (liste COMMUNE aux campagnes) + `newsletter_subscribers.unsubscribed_at`. (no-verify-jwt) |
| `audience-collect` | fetch front (site public, par paquets) | Compteurs d'audience : normalise le chemin contre une **liste blanche** (un chemin inconnu → `/autre`, sinon un bot créerait une ligne par URL inventée), résout le coach par slug, appelle la RPC `audience_bump`. Répond toujours 200 : une mesure ratée ne doit jamais gêner le visiteur. ⚠️ La liste `CHEMINS` est **dupliquée** dans `src/lib/audience.ts` — un test compare les deux fichiers. (no-verify-jwt) |
| `mail-acces-coach` | fetch front (admin, bouton dans /users) | « Ton acces a change » : previent quelqu'un qui monte coach que son compte a evolue, et surtout que **ses identifiants ne changent pas** (c'est le moment ou l'on croit devoir recreer un compte). Lit `users.email` — l'adresse de CONNEXION, jamais `clients.email` : les deux divergent en vrai (Thomas se connecte avec une adresse et sa fiche en porte une autre). Aucun mot de passe ni lien magique dans le mail. **Un bouton, jamais un automatisme** : la promotion se fait en deux gestes, un envoi accroche au premier annoncerait « coach BBC » a quelqu'un qui ne l'est pas encore. verify_jwt + controle admin dans la fonction |
| `mail-agenda-club` | fetch front (responsable du club, bouton dans le « ? » de L'agenda) | « L'agenda du club, en 4 gestes » : le mode d'emploi de l'agenda partagé, envoyé à UNE coach du club (`users.email`). **À la demande et renvoyable** — Thomas, 17/09 : « doit et peut être envoyé à plusieurs reprises pour les nouveaux » — donc un bouton, pas une campagne ni un automatisme. Droits : admin OU propriétaire du club, et la destinataire doit être de ce club. Identité Breakfast Club (crème) ; visuels = mini-écrans en tableaux HTML (s'affichent images bloquées, aucun vrai nom de lead) ; légende = coachs réels du club + `calendar_color`. ⚠️ Le TON : on PROPOSE un outil (« pas une obligation »), jamais « on arrête TimeTree » ni date butoir ; rien ne date le texte. verify_jwt + contrôle des droits dans la fonction |
| `auth-email-hook` | Supabase Send Email Hook | Route TOUS les mails auth (signup/invite/magiclink/recovery/email_change/reauthentication) vers Resend + template `_shared/email.ts`. Signature standardwebhooks (`SEND_EMAIL_HOOK_SECRET`). À activer côté dashboard (Auth → Hooks). (no-verify-jwt) |
| `book-club-discovery` | fetch front (site du club, `/reserver`) | Réservation d'un RDV découverte au club : créneau + capacité (`get_club_discovery_availability`), insert `rdv_bookings`, push coach (no-verify-jwt) |
| `manage-club-booking` | lien dans le mail de confirmation | Le prospect gère SON rendez-vous (déplacer / annuler) |
| `notify-club-booking-moved` | fetch front (CRM + L'agenda du club, case « prévenir par mail ») | Prévient la personne que SON rendez-vous a bougé. verify_jwt ; droits = admin OU coach du club du RDV (`est_coach_de_mon_club` appelé avec SON jeton), depuis le 22/09 (v11 ; admins seulement avant) |
| `rdv-accepted-notify` | fetch front | « C'est confirmé » au prospect (11/08/2026) |
| `rdv-confirm-client` | fetch front | Mail de confirmation au CLIENT de suivi quand le RDV est posé |
| `club-mail-apres-rdv` | fetch front (qualification d'un RDV club) | Le mail d'après-RDV : « vous démarrez » / « vous n'avez pas pu venir » — idempotent (edge v7, 16/09) |
| `club-mail-creneau-manquant` | cron `2,32 5-21 * * *` UTC (toutes les 30 min, 7 h–23 h 30 Paris l'été, depuis le 21/09 ; toutes les 10 min avant) | Rattrape la plus grosse fuite de l'entonnoir : mail à qui n'a pas fini sa réservation (lectures avec relance anti-Nano, `_shared/reessais.ts`) |
| `make-lead-entrant` | Make (webhook du formulaire Meta) | LE tuyau Meta → app : crée le lead, SMS automatique + liens personnels. **Ne PAS supprimer** même si le front ne la cite pas |
| `lead-clic` | lien dans les SMS / mails | « Qui a cliqué sur son lien ? » : trace le clic puis redirige |
| `lead-relaunch-send` | outil interne, aucun appel front | Relance des leads dormants par email (Resend). À trancher (lot 3) |
| `crm-repondre-lead` | fetch front (CRM) | Répondre à UNE personne depuis le CRM, à l'identité de la coach |
| `request-callback` | fetch (site public) | « Fais-toi rappeler par Thomas » (18/07/2026) |
| `submit-newsletter` | fetch (site du club, pied de page) | Inscription à la newsletter publique du site club |
| `send-colis-welcome-email` | fetch (funnel `/colis`) | Mail de remerciement du funnel colis (08/07/2026) |
| `update-colis-lead-action` | fetch (funnel `/colis`) | Affine le choix final du funnel colis |
| `client-app-save-measurement` | fetch (PWA cliente) | PWA v2 (07/2026) : enregistre une session de mensurations de la cliente |
| `client-app-level-up-notify` | fetch (PWA cliente, jeton) + la base (`_record_client_xp_interne`, service_role, `client_id`) | La cliente passe un niveau → **push à la coach** (24/09 ; avant : une ligne dans `coach_reminders` que rien ne lisait) |
| `xp-don-notifier` | trigger Postgres (`client_xp_events`, coach_id non nul) | Le geste coach « +XP » en notification à la membre, avec son mot (24/09). Service_role seulement ; `{dry_run:true}` |
| `xp-vers-le-bar` | cron `10 5 * * 1` UTC (mode `verser`) + fetch (mode `solde`, jeton membre ou JWT coach) | Le pont vers le Shake Bar (24/09) : verse les XP coaching × 5 (plafond 750/mois) sur le compte du bar par e-mail via l'API du bar ; `solde` = ses XP au bar et le prochain cadeau. Secrets `BAR_*` à poser |
| `journal-noaly` | fetch (espace membre, jeton) | Journal nutritionnel (21/09) : `lire_repas` (repas écrit → lignes du catalogue, ou estimées par Noaly hors catalogue avec protéines ET kcal pour 100 g, Sonnet 5) et `conseil` (« le mot de Noaly », gardé sur la journée). verify_jwt=false, jeton vérifié dedans |
| `journal-rappel` | cron `16 18,19 * * *` UTC (20 h 16 Paris) + cron `journal-semaine` `10 17,18 * * 0` (dimanche 19 h 10) | Journal : notification de 20 h si rien n'est noté ce jour-là ; mode « semaine » : « ta semaine en 3 chiffres » le dimanche (≥ 3 jours notés). Service_role seulement ; `{dry_run:true}` compte sans envoyer |
| `journal-remarque-notifier` | trigger Postgres (`journal_remarques`, AFTER INSERT) | Journal : la remarque de la coach en notification (« Thomas t'a laissé un mot dans ton journal »). Relit tout en base à partir de `remarque_id` ; service_role seulement ; `{dry_run:true}` montre la notification sans l'envoyer |
| `create-club-card-payment` | fetch (site du club) | Le site du club vend ses cartes de visites (paiement) |
| `create-shop-checkout` | fetch (boutique HL SKIN) | Checkout de la boutique (10/07/2026) |
| `confirm-shop-payment` | fetch (boutique HL SKIN) | Confirmation du paiement boutique, sans webhook |
| `shop-welcome-lead` | fetch (boutique HL SKIN) | Popup bienvenue boutique → lead |
| `shop-relance-notifier` | cron 1×/jour 09:40 UTC (horaire jusqu'au 18/09) | Relances boutique HL SKIN (0 commande depuis le 07/08) |
| `stripe-manual-reconcile` | cron 1×/jour 6 h 50 UTC (8 h 50 Paris, depuis le 21/09 ; 4×/jour avant) | Confirme les paiements Stripe « manuels » (liens montant libre) en attente |
| `test-twilio-sms` | outil, à la main | Envoi SMS manuel via Twilio (envois ponctuels pilotés) — jamais depuis l'app |
| `crm-relance-notifier` | cron 07:10 UTC | Push « tu as des relances à faire » (relances CRM dues ou en retard) |
| `notify-referral-converted` | trigger / fetch | Notif au coach quand une recommandation (parrainage) se convertit |
| `resend-webhook` | webhook Resend | Événements mail (delivered / opened / clicked / bounced) → campagnes + newsletters (compteur atomique `increment_newsletter_counter`) |
| `track-newsletter-view` | pixel / lien dans la newsletter | Compteur de vues de la newsletter |
| `upload-newsletter-image` | fetch front (admin newsletter) | Upload d'image vers Storage pour l'éditeur de newsletter |
| `upload-newsletter-og` | fetch front (admin newsletter) | Image Open Graph de la newsletter publique (html2canvas → Storage) |
| `pv-month-end-reminder` | plus de cron depuis le 18/09 (supprimé) | Rappel PV de fin de mois — feature masquée (niveau complet), fonction gardée |
| `rank-threshold-notifier` | plus de cron depuis le 18/09 (supprimé) | Notif « seuil de rang approché / atteint » — masquée, fonction gardée |

> **80 fonctions au 21/09/2026** (+ `journal-noaly`, `journal-rappel` et `journal-remarque-notifier` ; `request-testimonial` supprimée le 21/09 avec sa tâche de 10 h — 0 témoignage en 2 mois — et la tâche `business-plan-reminder` aussi — 0 plan business jamais envoyé ; puis `morning-suivis-digest` (« pas besoin ») et `formation-relay-to-admin` (0 formation en attente) supprimées avec leurs tâches, `stripe-manual-reconcile` passée à 1 fois par jour ; le partage public `/partage/:token` et ses 2 fonctions ont été
> supprimés le 18/09, décision Thomas) — la table ci-dessus les liste toutes (`ls supabase/functions`
> fait foi ; toute nouvelle fonction = une ligne ici). **En ligne = dépôt = 76 depuis le 22/09** : les
> 7 fonctions FANTÔMES (en ligne sans aucun code, appelées par rien) ont été supprimées le 21/09 —
> `admin-cancel-campaign`, `admin-resend-rdv-confirm`, `coach-reminder-notifier`, `daily-actions-notifier`,
> `flex-notifier`, `passive-supervisor-data`, `tmp-shop-upload` — puis, le 22/09 (Thomas : « fais au mieux »),
> 4 fonctions sans aucun appelant : `send-newsletter-email` (mail de test SANS contrôle d'accès),
> `club-mail-relance-dormants` (outil ponctuel du 25/08, aucun contrôle d'accès), `coach-tips-dispatcher`,
> `client-app-confirm-calendar` (code et `config.toml` retirés ; le code reste dans l'historique git).
> Contrôle : comparer `supabase functions list` à `ls supabase/functions`. Ne sont appelées par rien dans
> l'app, et c'est voulu : `make-lead-entrant` (Make), `test-twilio-sms` (outil), `lead-relaunch-send` (outil,
> protégé par un secret).
