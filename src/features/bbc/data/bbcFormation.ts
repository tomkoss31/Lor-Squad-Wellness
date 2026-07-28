// =============================================================================
// bbcFormation — le contenu de la Formation BBC : l'échelle des 5 marches,
// les 10 modules et le lexique du club.
//
// POUR QUI EST ÉCRIT CET ÉCRAN (décision Thomas, recette 2026-07-28) :
// pour un COACH, à partir de la marche « coach stagiaire ». Un membre n'a pas
// accès à l'app coach — il a sa PWA. Tout le contenu s'adresse donc à quelqu'un
// qui va FAIRE VIVRE le club, pas à quelqu'un qui le consomme.
//
// ⚠️ QUATRE RÈGLES D'ÉCRITURE, apprises de deux recettes client :
//
//  1. L'ORDRE SUIT LA PROGRESSION D'UN DÉBUTANT, PAS LE SOMMAIRE DU PLAYBOOK.
//     Le module 1 ouvrait sur « la machine à royalties » : les 5 sources de
//     revenus, le Club 100, 20 000 PV. C'est le Playbook dans son ordre
//     d'origine, écrit pour former un futur PROPRIÉTAIRE. Retour de Thomas :
//     « si un membre donc une personne à 25 % arrive ici tu lui parles en 1 de
//     royalties… ». On commence donc par le club VU DU MEMBRE — ce que le
//     stagiaire va faire vivre tous les matins — et le modèle économique passe
//     en 09, pour qui vise son propre club.
//
//  2. LE CONTENU NE PRÉSUME JAMAIS DE LA MARCHE DU LECTEUR. Tout se rédige à la
//     3e personne (« le stagiaire… »), jamais « tu es ici / c'est ta marche
//     actuelle ». Avant, la marche 2 portait « tu es ici » DANS SA DONNÉE : le
//     propriétaire d'un club lisait donc qu'il était débutant, et aucune
//     détection de rôle n'aurait pu rattraper ça sans réécrire les phrases.
//     Le « tu es ici » est posé par la VUE, sur la marche réellement détectée.
//
//  3. AUCUNE VALEUR RÉGLABLE EN DUR. Jours et heures des rituels, barème des
//     cœurs, prix et validité des cartes, horaires d'ouverture : tout ça vit
//     dans `clubs.settings` et s'édite dans Réglages. Écrit en dur ici, le coach
//     annonce mardi à ses membres pendant que les rappels automatiques partent
//     le mercredi — et il promet une remise que son club n'applique pas. D'où
//     `configPoints`, calculé à la lecture.
//
//  4. ON N'INVENTE PAS CE QU'ON N'A PAS, ET ON DIT QUAND DEUX SOURCES SE
//     CONTREDISENT. Un déroulé absent se dit franchement dans `todo`, il ne se
//     promet pas dans un sous-titre. Un module qui annonce « les 11 étapes »
//     sans les lister est pire qu'un module qui dit « à figer ».
//
// SOURCES DE CE FICHIER (relecture complète 2026-07-28) :
//  · Google Drive de Thomas, dossier La Base — documents officiels du modèle :
//    « Checklist des 11 étapes », « Checklist évaluation bien-être »,
//    « Checklist bilan 10ème visite », « Checklist démarrage nouveau membre »,
//    « Checklist activation du nouveau Coach Stagiaire », « Checklist 20
//    compétences du Coach Stagiaire », « Checklist activation du Junior
//    Partenaire », « Checklist 8 compétences du Junior Partenaire »,
//    « Règlement du club », « Journal Nutritionnel », « Checklist modèle Club
//    Petit Déjeuner », « Présentation appel ambassadeur », « Présentation
//    Atelier Cœur », « Parcours du Club de Nutrition ».
//  · Hub Notion « LIVE — Breakfast Budget Clubs » (Playbook), pour ce que le
//    Drive ne couvre pas — signalé au cas par cas quand les deux divergent.
// =============================================================================

import type { ClubSettings } from "../../../types/domain";
import { BILAN10_STEPS } from "../BbcBilan10";
import { PRELAUNCH_TASKS, PRELAUNCH_WEEKS } from "./bbcPrelaunch";
import type { BbcRole } from "../useBbcRole";

// ── L'échelle des rôles ────────────────────────────────────────────────────
//
// L'échelle ne coche plus des cases. Thomas, en recette : « j'ai croisé les
// levels ??? chacun dit quoi finalement l'intérêt (c'est joli bien fait mais
// comment c'est éducatif) ». Une marche barrée « faite » parce qu'il est
// propriétaire n'apprend rien à personne — lui compris, qui n'est jamais passé
// par « membre ».
//
// Chaque marche répond donc à DEUX questions et pas une de plus :
//   · `apport` — ce qu'elle apporte à celui qui y est. C'est le « pourquoi
//     j'irais ».
//   · `acces`  — comment on y entre, concrètement. C'est le « par où ».
// Le reste (position du lecteur, mise en avant) est posé par la vue.

export interface BbcRoleRung {
  role: BbcRole;
  label: string;
  /** Ce que la marche APPORTE à celui qui y est. */
  apport: string;
  /** Comment on y accède, concrètement. */
  acces: string;
  /** Ce qu'est cette marche, pour tout le monde. */
  description: string;
  /** Précision affichée UNIQUEMENT à un lecteur déjà plus haut sur l'échelle. */
  vuDenHaut?: string;
  /** Ce que fait quelqu'un de cette marche, tous les jours. Sert au module 10. */
  checklist: string[];
  /**
   * true = marche qui NE SE VIT PAS dans l'app coach. Elle reste sur l'échelle
   * parce qu'on ne comprend pas le métier sans elle, mais ce n'est pas un
   * palier à franchir ici. Sans ce drapeau, un propriétaire de club se
   * demandait pourquoi « Membre » lui était présenté comme une étape de son
   * parcours.
   */
  horsAppCoach?: boolean;
  /** Ce qui n'est pas tranché sur cette marche (cf. règle 4 de l'entête). */
  todo?: string;
}

export const BBC_ROLES: BbcRoleRung[] = [
  {
    role: "membre",
    label: "Membre",
    horsAppCoach: true,
    apport:
      "Un coach à lui, sa pesée quotidienne, son petit-déjeuner (aloé, thé, shake), son plan de repas et un suivi tous les matins.",
    acces:
      "Une évaluation bien-être, puis une carte de visites. L'admission se fait sur invitation personnelle : le club n'est pas ouvert au public.",
    description:
      "Le point de départ du modèle — et la seule marche qui ne se vit pas dans cette app : le membre a sa propre appli. Elle est ici parce qu'un coach ne peut pas vendre une expérience qu'il n'a pas comprise du côté où on la reçoit. C'est l'objet du module 01.",
    checklist: [
      "venir le matin",
      "se peser et noter son résultat",
      "remplir son journal nutritionnel",
      "recommander ses proches (ses cœurs)",
    ],
  },
  {
    role: "stagiaire",
    label: "Coach stagiaire",
    apport:
      "Il gagne sur la vente au détail, il apprend au comptoir avec un coach confirmé à côté de lui, et il fait ses 10 premières évaluations sur des volontaires — pas sur de vrais membres.",
    acces:
      "Un entretien de 20 min avec le propriétaire du club (pourquoi · heures disponibles · revenu visé), puis la signature de l'accord et d'un plan à 90 jours. Engagement : au moins 1 service complet 7h-11h par semaine (ou 2 demi-services), et la Coach Académie du mercredi soir.",
    description:
      "Le stagiaire passe de l'autre côté du comptoir. Son plan à 90 jours tient en deux chiffres : 10 nouveaux membres et 3 coachs stagiaires. Il n'est pas salarié du club — il gagne sur ce qu'il vend, et il fournit son propre stock.",
    checklist: [
      "20 messages cobayes par jour",
      "tenir son service au bar",
      "ses 10 évaluations d'entraînement",
      "les 11 étapes, le journal, le bilan des 10",
      "la Coach Académie chaque mercredi",
    ],
  },
  {
    role: "junior",
    label: "Junior partner",
    apport:
      "Il apprend à PILOTER un club, pas seulement à y coacher : le loyer, le point mort, les stocks, les statistiques, le planning. Et il encadre les stagiaires.",
    acces:
      "Un entretien de 20 min avec le propriétaire, puis un rythme tenu : 4 services complets 7h-11h par semaine, 5 nouveaux membres par semaine, et 10 clients en première ligne sous 90 jours — sinon il redevient coach stagiaire.",
    description:
      "La marche où l'on apprend les chiffres. Le programme de mentorat tient en 8 compétences : finances (« combien de cartes pour couvrir mon loyer ? »), tracker du club, administratif, stocks, plan de prospection 90 jours, suivi des bénéfices, tracker du parcours, et prendre la parole en formation. Il fournit son propre stock, pour lui et ses stagiaires.",
    vuDenHaut: "Côté propriétaire : c'est toi qui mènes cet entretien et qui poses la marche.",
    checklist: [
      "ses 10 clients en première ligne",
      "4 services complets par semaine",
      "connaître son point mort au euro près",
      "suivre ses stagiaires",
      "le Huddle Junior, 2 fois par mois minimum",
    ],
    todo:
      "Deux sources divergent sur l'entrée : le Drive (« Checklist activation du Junior Partenaire ») dit entretien de 20 min et 10 clients en première ligne sous 90 jours ; le Playbook Notion disait entretien d'1h30 et engagement de 3 à 9 mois. C'est la version du Drive qui est affichée ici — à trancher avec Thomas.",
  },
  {
    role: "proprietaire",
    label: "Propriétaire",
    apport:
      "Son club, son chiffre : les cartes de membre et la vente au détail. Et le terrain de formation qui fabrique les coachs suivants.",
    acces:
      "Les 6 semaines de pré-lancement, non négociables : 200 messages cobayes, 20 évaluations d'entraînement, et 30 membres inscrits le jour de l'ouverture.",
    description:
      "Le propriétaire ouvre son propre club. Le pré-lancement n'est pas une formalité : c'est ce qui sépare un club qui vit d'un club qui ferme au bout de six mois. Le détail se déroule au module 08.",
    checklist: [
      "les rituels tiennent",
      "le bilan des 10 se fait",
      "la marge du bar est à jour",
      "le pré-lancement du suivant est lancé",
    ],
  },
  {
    role: "rollout",
    label: "Roll out",
    apport:
      "Des royalties sur une organisation, au lieu d'un chiffre qu'il fait lui-même. Il fait tourner le modèle, plus le club.",
    acces:
      "Ses filleuls ouvrent leurs propres clubs. Rien à cocher : ça se constate.",
    description:
      "Le sommet de l'échelle : l'équipe duplique. L'objectif du modèle, c'est le Club 100 répété — pas un distributeur qui grossit tout seul.",
    checklist: [
      "ses propriétaires ouvrent sans lui",
      "il protège la lignée",
      "il fait tourner le modèle, plus le club",
    ],
    todo:
      "Le Drive ne documente aucune marche « roll out » sous ce nom : elle vient du Playbook BBC. Les prérequis exacts (combien de clubs ouverts, sur quelle profondeur) restent à figer avec Thomas.",
  },
];

// ── Les modules ────────────────────────────────────────────────────────────

export interface BbcFormationModule {
  /**
   * Identifiant STABLE, jamais affiché. La progression (`bbc_formation_progress`)
   * est enregistrée là-dessus et PAS sur le numéro : renuméroter les modules ne
   * doit plus jamais orpheliner ce qu'un coach a coché. C'est exactement ce que
   * la réorganisation de 2026-07-28 aurait cassé si la clé était restée « 00 ».
   */
  key: string;
  /** Le numéro AFFICHÉ. Peut changer à chaque réorganisation, sans conséquence. */
  n: string;
  title: string;
  /** La punchline de la fiche. */
  subtitle: string;
  /**
   * Le résumé de contenu affiché dans la LISTE. Il vit ici et pas dans la vue :
   * les deux textes existaient en double et avaient déjà divergé (la liste
   * promettait « les 11 étapes, 80/20 », la fiche ne contenait ni l'un ni
   * l'autre). Le lecteur cliquait sur une promesse et tombait sur autre chose.
   */
  listLabel: string;
  /** Marche minimale qui débloque le module — le verrou se lit à côté du
   *  contenu qu'il protège, plus dans un tableau parallèle de la vue. */
  minRole: BbcRole;
  summary: string;
  points: string[];
  /** Points dépendant de la config du club (cf. règle 3 de l'entête). */
  configPoints?: (s: ClubSettings) => string[];
  /**
   * Les mots du lexique utiles à CE module. Le lexique a quitté le bas de la
   * page (12 cartes empilées que personne ne lisait) pour son propre onglet ;
   * ces renvois sont ce qui l'empêche de devenir un cul-de-sac. Chaque entrée
   * doit exister dans `buildGlossary` — sinon la puce ne s'affiche pas.
   */
  lexique?: string[];
  /** Ce qui manque encore, dit franchement (cf. règle 4 de l'entête). */
  todo?: string;
}

/** Jours + heure d'un rituel, tels que RÉGLÉS par le club. */
function cadence(s: ClubSettings, key: string, label: string): string {
  const cfg = s.calls?.[key];
  const jours = cfg?.days?.length ? cfg.days.join(" & ") : null;
  const heure = cfg?.time ? cfg.time.replace(":", "h") : null;
  if (!jours || !heure) {
    return "Cadence : les jours et l'heure se règlent dans Réglages → rituels. Ne les annonce pas de tête — ton club a peut-être choisi autre chose, et les rappels automatiques partiront sur SA valeur, pas sur la tienne.";
  }
  return `Cadence dans TON club : ${label} le ${jours} à ${heure}. Ça se change dans Réglages → rituels, et les rappels automatiques suivent.`;
}

/**
 * Les cartes de membre TELLES QUE RÉGLÉES par le club.
 *
 * Le règlement officiel affiche 85 € / 10 visites et 185 € / 30 visites, mais
 * ce prix est le premier que chaque club ajuste — et un coach qui annonce de
 * mémoire un tarif que sa caisse n'applique pas crée un litige au comptoir.
 */
function cartes(s: ClubSettings): string {
  const entrees = Object.entries(s.cards ?? {})
    .filter(([, cfg]) => cfg && (cfg.price != null || cfg.days != null))
    .sort(([a], [z]) => Number(a) - Number(z));
  if (entrees.length === 0) {
    return "Les cartes de membre (nombre de visites, prix, durée de validité) se règlent dans Réglages. Tant qu'elles ne sont pas saisies, n'annonce aucun tarif de tête : c'est le premier chiffre que chaque club ajuste.";
  }
  const lignes = entrees
    .map(([type, cfg]) => {
      const prix = cfg.price != null ? `${cfg.price} €` : "prix à régler";
      const jours = cfg.days ? `, à utiliser en ${cfg.days} jours` : "";
      return `${type} visites = ${prix}${jours}`;
    })
    .join(" · ");
  return `Les cartes RÉGLÉES dans ton club : ${lignes}. Ça se change dans Réglages — c'est ce tarif-là que tu annonces, pas celui d'un autre club.`;
}

/** Les horaires du club, tels que réglés (le modèle dit 7h-11h, chaque club adapte). */
function horaires(s: ClubSettings): string {
  return s.open_hours
    ? `Les horaires de TON club : ${s.open_hours}. Le modèle de référence ouvre de 7h à 11h — c'est un club du matin, pas un bar de journée.`
    : "Les horaires d'ouverture se règlent dans Réglages. Le modèle de référence ouvre de 7h à 11h : c'est un club du matin, pas un bar de journée.";
}

const BILAN10 = BILAN10_STEPS.map((s, i) => `${i + 1}. ${s.label} — ${s.hint}`);

/**
 * Les 11 étapes d'une visite au club — le rail que le membre suit à CHACUNE de
 * ses venues. Source : « Checklist des 11 étapes » (Drive).
 *
 * Cette liste répond au `todo` que le module Évaluation traînait depuis des
 * mois (« les 11 étapes du Notion 02 »). Découverte de la relecture : les 11
 * étapes ne sont pas un déroulé de l'évaluation, c'est le TOUR DU CLUB qu'on
 * fait faire au nouveau membre pendant son évaluation, puis qu'il refait seul
 * tous les matins. Elles ont donc leur place au module 01, côté membre.
 *
 * Les récompenses cœurs annoncées à l'étape 4 ne sont volontairement PAS
 * chiffrées ici : elles sortent de `clubs.settings.hearts_bareme` (règle 3).
 */
const ONZE_ETAPES = [
  "1. S'enregistrer en arrivant.",
  "2. Prendre son dossier.",
  "3. Noter la date sur sa carte de membre.",
  "4. Se peser et noter le résultat sur son tracker — on explique POURQUOI on se pèse tous les jours : pour se responsabiliser, pas pour se juger.",
  "5. Mettre à jour le tableau des scores avec le résultat du jour.",
  "6. Boisson aloé (avec son shaker) — ce qu'elle apporte : moins de ballonnements, un système digestif nettoyé.",
  "7. Coaching à table, sur le journal nutritionnel. C'est LE moment de coaching de la visite.",
  "8. Boisson thé — relance le métabolisme, aide à brûler les graisses, donne de l'énergie.",
  "9. Shake (avec son shaker) — un repas minute dans un verre : protéines, fibres, vitamines, minéraux.",
  "10. À emporter — pendant les 10 premières visites on sert des sachets ; l'engagement prouvé, on passe aux boîtes, plus économiques sur la durée.",
  "11. Avant de partir, ranger son dossier : c'est le signal que la visite est finie.",
];

/** Une ligne par semaine, écrite depuis le parcours qu'on fait RÉELLEMENT
 *  cocher dans Pré-lancement : c'est la même chose, pas une 2e version. */
// (Pas de .toLowerCase() sur les libellés : ça écrasait « jour J » en « jour j ».)
const PRELANCEMENT = PRELAUNCH_WEEKS.map((w) => {
  const taches = PRELAUNCH_TASKS.filter((t) => t.week === w.week)
    .map((t) => `${t.title}${t.gate ? " (non négociable)" : ""}`)
    .join(" · ");
  return `${w.title.replace("Semaine ", "Sem ")} : ${taches}.`;
});

const PORTES = PRELAUNCH_TASKS.filter((t) => t.gate);

export const BBC_FORMATION_MODULES: BbcFormationModule[] = [
  {
    key: "club-membre",
    n: "01",
    title: "Le club vu du membre",
    subtitle: "ce que vit la personne — avant d'apprendre à le lui vendre",
    listLabel: "l'adhésion, les 11 étapes d'une visite, le journal",
    minRole: "stagiaire",
    summary:
      "Un stagiaire fait vivre cette expérience tous les matins. Tant qu'il ne l'a pas comprise du côté où on la reçoit, il ne peut pas la raconter — et encore moins la vendre.",
    points: [
      "Un club de nutrition n'est ni un magasin, ni un restaurant : c'est un lieu où des gens qui ont le même objectif se retrouvent le matin et se soutiennent. L'admission se fait sur invitation personnelle — ce n'est pas ouvert au public.",
      "Ce que le membre achète, c'est une CARTE DE VISITES, pas un carton de produits. Elle lui donne : un coach bien-être à lui, ses scans et pesées, un plan de repas, le suivi, les activités du club, et son petit-déjeuner tous les matins (aloé, thé, shake).",
      "Période de lancement : les 2 premières semaines, 4 à 5 visites par semaine. C'est là que l'habitude se prend, ou ne se prend pas. La phrase à retenir : « on n'est pas un club hebdomadaire ».",
      "LES 11 ÉTAPES — le rail que le membre suit à chacune de ses visites. Tu les lui fais découvrir pendant son évaluation, puis il les refait seul :",
      ...ONZE_ETAPES,
      "Le journal nutritionnel et ses 4 nombres magiques, notés chaque jour : protéines (g) · eau (L) · exercice (min) · « je me sens » (de −5 « terrible » à +5 « fantastique »). Les 2 calculs qu'il apprend : protéines = masse musculaire (kg) × 2, ou poids × 1,2 à 1,4 ; eau = 0,03 L par kg de poids.",
      "Le dossier qu'on lui monte à son démarrage : liste des collations · journal nutritionnel · tracker de résultats · règlement du club · son évaluation · sa carte de membre · son reçu. Plus un kit de bienvenue : un shaker et une collation offerte.",
      "Quelques règles qu'il signe, et qu'un coach doit connaître par cœur : la carte expire après 30 jours sans venir · 10 visites à utiliser en 30 jours, 30 visites en 90 jours · non remboursable, non transférable · pas de commande Herbalife ailleurs · ni religion ni politique au club · 1 € par gros mot.",
      "Et à la 10ᵉ visite, il a rendez-vous : le bilan (module 05). Ce n'est pas une surprise, on le lui annonce dès le premier jour.",
    ],
    configPoints: (s) => [cartes(s), horaires(s)],
    lexique: ["carte de membre", "les 11 étapes", "journal nutritionnel", "période de lancement", "membre", "tableau des scores"],
  },
  {
    key: "invitation",
    n: "02",
    title: "L'invitation",
    subtitle: "pas d'invitation = pas de business",
    listLabel: "marché chaud / froid, les ratios, le message cobaye",
    minRole: "stagiaire",
    summary:
      "Ton identité : « je suis coach bien-être ». Ce à quoi tu invites : « une évaluation bien-être gratuite, d'une valeur de 50 € ». Reste simple, ne surcharge personne.",
    points: [
      "Ratios : temps complet = 1 h par jour = 20 contacts · temps choisi = 30 min = 10 contacts.",
      "Ta liste d'abord : famille, amis, collègues, clubs, hobbies. Sans préjuger de qui serait intéressé — on écrit jusqu'à 100 noms. (Pour un pré-lancement de club, la cible monte à 200 : module 08.)",
      "Le message cobaye, c'est LA porte d'entrée d'un stagiaire : il l'envoie à 20-30 personnes pour décrocher ses 10 évaluations d'entraînement. Le verbatim est dans Ressources → Scripts & liens, et le compteur du jour est sur le Cockpit.",
      "Marché chaud : le message cobaye, les recommandations, la soirée dégustation (« information nutrition »), les réseaux.",
      "Marché froid : stands, boîtes à contact, badge, « 2 questions » en magasin, événements locaux, supermarchés, kermesses.",
      "⚠️ Règle Herbalife, pas une option : une sollicitation commerciale (mail, SMS, réseaux) ne s'envoie qu'à quelqu'un qui a donné son accord, ou qui est déjà client. Une demande d'arrêt se respecte immédiatement.",
      "La math du rythme : 3 nouveaux membres par semaine, c'est un coach à temps plein ; 5 par semaine, c'est ce qu'on demande à un junior partner. (Côté Herbalife ça se traduit en rangs — World Team, GET. C'est une AUTRE échelle que les 5 marches du club, cf. lexique.)",
      "Mindset 90 jours : ce que tu fais maintenant apparaît dans 90 jours. Juillet/août/septembre → résultats octobre/novembre/décembre.",
    ],
    lexique: ["cobaye", "évaluation bien-être (EBE)", "liste de 100 · liste de 200", "soirée dégustation", "World Team · GET"],
    todo:
      "Le nombre de messages cobayes pour décrocher 10 évaluations n'est pas stable dans les sources : la « Checklist activation du nouveau Coach Stagiaire » dit 20, la présentation Atelier Cœur dit 30 dans sa slide « que faire ensuite ». Les deux sont affichés en fourchette — à trancher avec Thomas.",
  },
  {
    key: "ebe",
    n: "03",
    title: "L'évaluation bien-être (EBE)",
    subtitle: "la porte d'entrée · 100 % des membres passent par là",
    listLabel: "le déroulé complet, la règle des 80/20, l'échelle de 1 à 10",
    minRole: "stagiaire",
    summary:
      "45 min (+ 15 de marge). La connexion est la partie la plus importante. Intention : s'ils viennent, ils s'inscrivent.",
    points: [
      "LE DÉROULÉ, dans l'ordre — c'est la check-list officielle, pas une variante :",
      "1. Accueillir l'invité et lui remettre le questionnaire d'évaluation à remplir.",
      "2. Pendant qu'il remplit : mesurer sa taille et lui servir un verre d'aloé.",
      "3. Scan corporel.",
      "4. Ses objectifs, ses raisons, et l'échelle de 1 à 10.",
      "5. La présentation de l'évaluation — rester SIMPLE.",
      "6. Le tour des 11 étapes du club (module 01).",
      "7. Encaisser la carte de membre.",
      "8. Réserver sa première visite, pour les mesures et les photos de départ.",
      "9. L'ajouter au groupe des membres et au tableau des scores — avec son accord.",
      "La règle des 80/20 : il parle 80 % du temps, toi 20 %. Si tu parles plus que lui, tu as raté la connexion — et c'est elle qui décide de tout le reste.",
      "Les chiffres de la balance : rester simple. Trois suffisent (poids, masse grasse, masse musculaire) ; en sortir douze noie la personne au lieu de la convaincre.",
      "La question qui qualifie : « sur une échelle de 1 à 10, à quel point es-tu prêt(e) à changer tes habitudes au quotidien ? » → 8 ou plus, on démarre tout de suite. En dessous, on creuse le moment ou la clarté de l'objectif.",
      "Le choix qu'on lui pose, à la fin : « tu veux démarrer sur 10 ou sur 30 visites ? » Puis on encaisse et on programme la visite de démarrage si ce n'est pas le jour même.",
      "Les recommandations, dans la foulée et au mot près : « maintenant que tu vas devenir membre du club, tu peux offrir une évaluation bien-être et un scan corporel gratuits, d'une valeur de 50 €. À qui voudrais-tu l'offrir ? » — PAUSE, ET SOURIS — « qui d'autre ? » On écrit les noms.",
    ],
    configPoints: (s) => [cartes(s)],
    lexique: ["évaluation bien-être (EBE)", "bilan", "Tanita", "cœur", "carte de membre"],
    todo:
      "Le contenu de la présentation projetée pendant l'évaluation (« Présentation évaluation bien-être », Drive) n'est pas repris ici : c'est un support visuel de 40+ slides, pas un déroulé. Le rendez-vous se mène avec la check-list ci-dessus.",
  },
  {
    key: "suivi",
    n: "04",
    title: "Le suivi et les résultats",
    subtitle: "ce qui fait rester les membres",
    listLabel: "le journal, l'ardoise, le tableau des scores",
    minRole: "stagiaire",
    summary:
      "Chaque visite = pesée + petit-déjeuner + mini-coaching sur le journal. C'est la régularité qui crée les résultats… et les histoires qu'on raconte ensuite.",
    points: [
      "Le coaching à table (étape 7 des 11), c'est le cœur du suivi quotidien : on ouvre son journal et on commente UN repère. 30 secondes, pas un cours magistral.",
      "Au démarrage, tu planifies AVEC lui ses 4 à 5 premières visites et tu les notes dans son journal. Tu calcules aussi le nombre de sachets de shake, de thé et de collations dont il a besoin jusqu'à sa prochaine venue — sinon il décroche entre deux visites.",
      "Les 2 premières semaines, 4 à 5 visites : c'est là que l'habitude se prend, ou ne se prend pas.",
      "Quand un membre décroche : il saute 3 matins → tu écris le 3ᵉ jour, pas le 10ᵉ.",
      "Objectifs et victoires hors balance : énergie, sommeil, vêtements qui retombent bien. Pas que le poids — c'est souvent ce qui le fait rester quand la balance stagne.",
      "Ardoise et tableau des scores : rendre la progression visible DANS le club, pas seulement dans son téléphone. Le tableau se met à jour tous les jours (étape 5).",
      "Partage sur les réseaux (avant/après, ressenti, avec son accord), puis tu suis les likes et les commentaires : chacun est une invitation possible à une évaluation gratuite.",
    ],
    lexique: ["journal nutritionnel", "tableau des scores", "ardoise", "les 11 étapes"],
  },
  {
    key: "bilan10",
    n: "05",
    title: "Le bilan des 10 visites",
    subtitle: "le rendez-vous charnière",
    listLabel: "les 9 étapes du rendez-vous de la 10ᵉ visite",
    minRole: "stagiaire",
    summary:
      "À la 10ᵉ visite, LE rendez-vous qui transforme un membre en partenaire. 9 étapes, dans l'ordre.",
    points: [
      "La check-list, dans l'ordre — c'est la MÊME que celle de l'écran « bilan des 10 », pas une variante :",
      ...BILAN10,
      "Le scan se REFAIT en entier : mesures et photos comprises. Sans point de comparaison complet, le membre ne voit que le chiffre de la balance — et la balance ment souvent au bout de 2 semaines.",
      "Le passage aux formats maison : Aloé, Thé, Formula 1 et PDM au minimum. Plus de sachets. Argument à connaître : la PDM dans le shake évite les fringales et améliore les résultats.",
      "Attention au vocabulaire : dans les documents officiels ce rendez-vous s'appelle aussi « bilan des 2 semaines ». C'est le même : 10 visites à 4-5 par semaine, ça tombe au bout de deux semaines.",
      "À la fin, tu l'inscris à l'Appel Ambassadeur depuis « Les appels ». Les 3 rappels partent tout seuls (midi le jour J · 30 min avant · 15 min avant, avec le lien Zoom du club) : tu n'as rien à programmer.",
      "Toi, tu reçois un rappel 30 min APRÈS l'appel : c'est la patate chaude, tu as 10 minutes pour écrire.",
      "Script d'invitation : « dans le cadre de tes prochaines étapes, je t'inscris à notre Appel Ambassadeur. Pas besoin de micro, tu écoutes. »",
      "Pas de panique s'il ne vient pas la 1ʳᵉ fois : on le remet dans la boucle au prochain entretien.",
    ],
    lexique: ["bilan", "patate chaude", "appel ambassadeur", "carte de membre"],
  },
  {
    key: "appel-ambassadeur",
    n: "06",
    title: "L'appel ambassadeur",
    subtitle: "ce qui décide si ton club est un bar ou une fabrique de coachs",
    listLabel: "les 4 options A/B/C/D et la patate chaude",
    minRole: "stagiaire",
    summary:
      "On présente 4 options, on laisse écouter, et on trie dans les 10 minutes qui suivent. Avec l'Atelier Cœurs, c'est ce qui empêche un club de rester un simple comptoir.",
    points: [
      "Les 4 options, telles qu'elles s'affichent à l'écran pendant l'appel : A — client satisfait · B — ambassadeur, commander avec une remise · C — coach stagiaire, revenu à temps choisi ou complet · D — propriétaire de club, changement de carrière.",
      "Elles se lisent comme l'échelle des marches, à gauche : A reste membre, C entre dans le club comme coach, D vise son propre club.",
      "Comment on devient ambassadeur, concrètement : aider au moins 2 personnes à démarrer leur programme avec son coach. En échange, une remise qui démarre à 25 % sur toute la gamme, puis des points de fidélité qui la font monter au fil de l'année.",
      "Qui est sur l'appel : des invités qui découvrent · des clients qui viennent de finir leurs 2 semaines de lancement · des ambassadeurs déjà remisés · des coachs. Le ton s'adresse aux quatre à la fois — on ne fait pas un appel « recrutement ».",
      "La règle de la patate chaude : 10 min après l'appel, tu écris à la personne (avec le visuel A/B/C/D) tant qu'elle est encore dans l'énergie. Passé une nuit, le taux de réponse s'effondre.",
      "Règle ambassadeur, à rappeler sans exception : il commande pour lui et sa famille — PERSONNE D'AUTRE.",
    ],
    configPoints: (s) => [cadence(s, "appel_ambassadeur", "l'Appel Ambassadeur")],
    lexique: ["appel ambassadeur", "ambassadeur", "patate chaude", "coach stagiaire"],
    todo:
      "L'ancienne version de ce module associait les options C et D à un « Quick Start » et décalait D d'un cran (D = coach stagiaire). C'est corrigé d'après la présentation officielle, où D = propriétaire de club. Le « Quick Start » n'apparaît nulle part dans le Drive : si c'est une étape réelle de l'équipe, elle reste à documenter.",
  },
  {
    key: "atelier-coeurs",
    n: "07",
    title: "L'atelier cœurs",
    subtitle: "aider un membre à trouver ses 2 cœurs",
    listLabel: "recommandations : relation + résultat = cœur",
    minRole: "stagiaire",
    summary:
      "Le moteur des recommandations. Avec l'Appel Ambassadeur, c'est ce qui fabrique les coachs.",
    points: [
      "La formule : relation + résultat = recommandation. S'il manque l'un des deux, il n'y a pas de cœur.",
      "Qui est dans la salle : les membres qui veulent leur remise et cherchent leurs 2 premiers cœurs · les nouveaux stagiaires qui cherchent leurs 5 à 10 premiers clients · les coachs confirmés qui cherchent les 10 suivants. On parle aux trois.",
      "Le brainstorm « qui connais-tu ? » : famille, amis, collègues, clubs, hobbies. Sans préjuger de personne — on écrit jusqu'à 100 noms avant de trier.",
      "On demande à chaque étape, et jamais « ça t'intéresse ? » mais « qui connais-tu ? ».",
      "Les 4 piliers rappelés à chaque atelier : son résultat produit (partager son histoire) · sa base de clients · son équipe · sa formation. Le raccourci qui les résume : prendre les produits, porter la marque, parler aux gens.",
      "Attention au vocabulaire : le barème récompense LE MEMBRE, pas toi. Ton rôle à toi, c'est de valider le cœur quand la personne a démarré (onglet Cœurs).",
    ],
    configPoints: (s) => {
      const b = s.hearts_bareme ?? {};
      const paliers = Object.keys(b)
        .sort((a, z) => Number(a) - Number(z))
        .map((k) => `${k} cœurs = ${b[k]}`)
        .join(" · ");
      return [
        paliers
          ? `Le barème RÉGLÉ dans ton club : ${paliers}. Ça se change dans Réglages → cœurs — ne promets pas un chiffre de mémoire.`
          : "Le barème des paliers se règle dans Réglages → cœurs. Tant qu'il n'est pas renseigné, ne promets aucun chiffre à un membre.",
        cadence(s, "atelier_coeurs", "l'Atelier Cœurs"),
      ];
    },
    lexique: ["cœur", "ambassadeur", "atelier des cœurs", "liste de 100 · liste de 200"],
  },
  {
    key: "prelancement",
    n: "08",
    title: "Les 6 semaines de pré-lancement",
    subtitle: "le plan avant d'ouvrir son club · non négociable",
    listLabel: "le plan des 6 semaines avant d'ouvrir",
    minRole: "junior",
    summary:
      "Objectif final : ouvrir avec 30 nouveaux membres et un agenda déjà rempli d'évaluations.",
    points: [
      ...PRELANCEMENT,
      `Les ${PORTES.length} non négociables, celles qui décident si le club est prêt : ${PORTES.map((t) => t.title).join(" · ")}.`,
      "Le détail se coche semaine par semaine dans Ressources → Pré-lancement. C'est le même parcours, pas une 2ᵉ version : si un chiffre diffère entre les deux écrans, c'est un bug, signale-le.",
    ],
    lexique: ["cobaye", "liste de 100 · liste de 200", "évaluation bien-être (EBE)"],
  },
  {
    key: "modele-eco",
    n: "09",
    title: "Le modèle économique",
    subtitle: "à lire quand on vise son propre club — pas avant",
    listLabel: "le Club 100, les 5 revenus, les chiffres d'un club",
    minRole: "junior",
    summary:
      "Comment un club de petit-déjeuner devient une machine à royalties plutôt qu'un comptoir de vente. Ce module était en tête de formation : il est ici parce qu'il ne sert à rien tant qu'on n'a pas fait tourner un bar.",
    points: [
      "Les chiffres du modèle de référence (source : « Checklist modèle Club Petit Déjeuner ») : démarrage 3 000 à 3 500 € · 50 à 100 m² (boutique, bureau ou salle) · 450 à 750 €/mois de charges · ouverture 7h-11h.",
      "Emplacements conseillés : à côté des écoles, des supermarchés, des hôpitaux, des bureaux, des zones d'habitation. Le membre vient AVANT sa journée — s'il doit faire un détour, il ne vient pas tous les jours.",
      "La capacité d'un club : 100 membres, dont environ 40 % passent chaque jour — soit à peu près 40 visites par matin. C'est ce chiffre-là qui dimensionne tout le reste.",
      "Le Club 100 : 100 membres actifs · 3 superviseurs actifs (les junior partners) · 9 coachs stagiaires · ~13 superviseurs au total ≈ 20 000 PV d'organisation.",
      "L'échelle qui en découle : 1 club ≈ 20 000 PV. Viser 50 000 PV, c'est donc 2 à 3 clubs — pas 30 distributeurs éparpillés. C'est toute la différence entre dupliquer et recruter.",
      "Les 5 sources de revenus : vente au détail · vente en gros · royalties · bonus mensuel · bonus annuel.",
      "Le plan de carrière, 5 marches : Membre → Coach stagiaire → Junior partner → Propriétaire → Roll out. Compter environ 2 ans pour le parcours complet.",
      "⚠️ À ne pas confondre : le plan de remises Herbalife (25 → 35 → 42 → 50 %) est un AUTRE escalier, qui mesure le volume, pas le rôle dans le club. Ses seuils bougent d'une année à l'autre — ils vivent dans les règles Herbalife officielles, jamais recopiés ici.",
      "Et surtout : ces chiffres sont ceux du MODÈLE. Ton vrai chiffre se calcule dans Mon club → Rentabilité, qui te demande ton loyer et ta recette au lieu de les deviner.",
    ],
    lexique: ["PV · Club 100", "World Team · GET", "propriétaire de club", "junior partner"],
  },
  {
    key: "checklists",
    n: "10",
    title: "Les check-lists par rôle",
    subtitle: "qui fait quoi quand l'équipe grandit",
    listLabel: "ce que fait chaque marche, tous les jours",
    minRole: "junior",
    summary:
      "Le quotidien de chaque marche, du membre au roll out. Et les deux règles qui protègent tout le modèle.",
    points: [
      ...BBC_ROLES.map((r) => `${r.label} : ${r.checklist.join(" · ")}.`),
      "La réunion d'opportunité maison (le HOM) disparaît du modèle BBC → remplacée par l'Appel Ambassadeur et l'Atelier Cœurs.",
      "La règle qui gouverne tout : on ne modifie rien — mêmes prix, mêmes horaires, mêmes scripts, mêmes formulaires. Chaque « amélioration » perso casse la duplication.",
      "La deuxième règle : protéger la lignée (qui a amené la personne au club) et se parler entre coachs proches avant d'agir sur un membre qui n'est pas le sien.",
    ],
    lexique: ["coach stagiaire", "junior partner", "propriétaire de club", "HOM"],
    todo:
      "Ces check-lists sont une synthèse de ce que le Drive dit ailleurs (activation stagiaire, 20 compétences, activation junior, 8 compétences). Elles n'existent pas telles quelles dans un document unique — à relire avec Thomas avant d'en faire une référence opposable à quelqu'un.",
  },
];

export function getFormationModule(n: string): BbcFormationModule | undefined {
  return BBC_FORMATION_MODULES.find((m) => m.n === n);
}

/**
 * Tous les points d'un module, config du club comprise.
 *
 * On appelle `configPoints` MÊME sans réglages (`{}`) : sans ça, un coach qui
 * n'a pas encore de club ne verrait plus du tout la ligne « cadence » ni la
 * ligne « barème » — le module perdrait son information au lieu de renvoyer
 * vers Réglages. Chaque `configPoints` sait dire « c'est réglé par ton club »
 * quand il n'a rien à lire.
 */
export function getModulePoints(m: BbcFormationModule, settings: ClubSettings | null): string[] {
  return m.configPoints ? [...m.points, ...m.configPoints(settings ?? {})] : m.points;
}

// ── Le lexique du club ─────────────────────────────────────────────────────
//
// Écrit pour un COACH : ces mots ne se lisent que depuis l'environnement coach.
// Les paliers de cœurs récompensent LE MEMBRE — servir « ta remise de 25 % » à
// un coach, c'est lui parler avec les mots d'un membre.
//
// Le lexique vivait empilé en bas de la page Formation, 12 cartes que personne
// ne dépliait. Il a maintenant son onglet (Ressources → Lexique), avec une
// recherche et une fiche par terme ; les modules y renvoient via `lexique`.

export interface GlossaryEntry {
  t: string;
  d: string;
}

export function buildGlossary(settings: ClubSettings | null): GlossaryEntry[] {
  const bareme = settings?.hearts_bareme;
  const baremeTxt = bareme
    ? Object.keys(bareme)
        .sort((a, z) => Number(a) - Number(z))
        .map((k) => `${k} = ${bareme[k]}`)
        .join(" · ")
    : "réglé dans Réglages → cœurs";
  const jours = (key: string) => {
    const cfg = settings?.calls?.[key];
    return cfg?.days?.length && cfg.time
      ? `${cfg.days.join(" & ")} à ${cfg.time.replace(":", "h")}`
      : "jour et heure réglés par ton club";
  };
  const cartesTxt = (() => {
    const e = Object.entries(settings?.cards ?? {})
      .filter(([, c]) => c && c.price != null)
      .sort(([a], [z]) => Number(a) - Number(z));
    return e.length ? e.map(([t, c]) => `${t} visites = ${c.price} €`).join(" · ") : "prix réglés dans Réglages";
  })();

  return [
    {
      t: "cobaye",
      d: "une personne à qui tu envoies le message pour une évaluation offerte. 20 messages par jour, c'est le seul chiffre qui compte le premier mois d'un coach qui démarre. Le mot vient du script lui-même : « je me forme, tu accepterais d'être mon cobaye ? »",
    },
    {
      t: "cœur",
      d: `1 personne qu'un MEMBRE fait venir et qui démarre au club. Le barème récompense le membre (${baremeTxt}). Ton rôle à toi : valider le cœur quand la personne a démarré, dans l'onglet Cœurs.`,
    },
    {
      t: "évaluation bien-être (EBE)",
      d: "la porte d'entrée : 100 % des membres passent par là. 45 min, 80 % d'écoute, on qualifie sur l'échelle de 1 à 10. Annoncée comme un service d'une valeur de 50 €, offert.",
    },
    {
      t: "bilan",
      d: "attention, piège : au club, « bilan » désigne le bilan des 10 visites — le rendez-vous charnière de la 10ᵉ visite, 9 étapes, où un membre devient partenaire. Les documents officiels l'appellent aussi « bilan des 2 semaines » : c'est le même rendez-vous. La porte d'entrée, elle, s'appelle l'évaluation (EBE), jamais « bilan ».",
    },
    {
      t: "membre",
      d: "quelqu'un du club. On ne dit pas « client » ici : « client » appartient au vocabulaire de l'app classique. Un membre entre sur invitation personnelle — le club n'est pas ouvert au public.",
    },
    {
      t: "carte de membre",
      d: `ce que le membre achète : un nombre de visites, pas des produits (${cartesTxt}). Elle expire après 30 jours sans venir, elle n'est ni remboursable ni transférable. C'est le produit du club — pas le shake.`,
    },
    {
      t: "les 11 étapes",
      d: "le rail d'une visite, de l'enregistrement au rangement du dossier : peser, tableau des scores, aloé, coaching sur le journal, thé, shake, à emporter. Tu les fais découvrir pendant l'évaluation, le membre les refait seul ensuite. Détail au module 01.",
    },
    {
      t: "journal nutritionnel",
      d: "le carnet du membre, et le support du coaching à table. Ses 4 nombres magiques, notés chaque jour : protéines (g), eau (L), exercice (min), et « je me sens » de −5 à +5. Protéines = masse musculaire × 2 (ou poids × 1,2 à 1,4) ; eau = 0,03 L par kg.",
    },
    {
      t: "période de lancement",
      d: "les 2 premières semaines d'un membre : 4 à 5 visites par semaine. C'est là que l'habitude se prend. La phrase à retenir face à quelqu'un qui veut venir « une fois par semaine » : on n'est pas un club hebdomadaire.",
    },
    {
      t: "tableau des scores",
      d: "l'affichage des résultats dans le club, mis à jour tous les jours (étape 5 des 11). Rendre la progression visible sur un mur, pas seulement dans un téléphone.",
    },
    {
      t: "ardoise",
      d: "l'ardoise de reconnaissance qu'on écrit au bilan des 10 : le résultat du membre, en grand, photographié. C'est le support de partage sur les réseaux — et donc la source des évaluations suivantes.",
    },
    {
      t: "appel ambassadeur",
      d: `le rituel qui trie : on y montre les remises, le remboursement par les recommandations, le complément de revenu. 4 options — A client satisfait · B ambassadeur · C coach stagiaire · D propriétaire de club. ${jours("appel_ambassadeur")}.`,
    },
    {
      t: "atelier des cœurs",
      d: `on y aide un membre à trouver ses 2 cœurs, et les nouveaux stagiaires à trouver leurs 10 premiers clients. Avec l'appel, c'est ce qui fabrique les coachs. ${jours("atelier_coeurs")}.`,
    },
    {
      t: "patate chaude",
      d: "les 10 minutes qui suivent l'Appel Ambassadeur. Tu écris à la personne tant qu'elle est dans l'énergie, avec le visuel A/B/C/D. Passé une nuit, le taux de réponse s'effondre. L'app te rappelle 30 min après l'appel.",
    },
    {
      t: "ambassadeur",
      d: "un membre qui a aidé au moins 2 personnes à démarrer leur programme avec son coach. En échange : une remise qui démarre à 25 % sur toute la gamme. Il commande pour lui et sa famille — personne d'autre.",
    },
    {
      t: "coach stagiaire",
      d: "un coach en formation : il tient un service au bar, envoie ses cobayes et fait ses 10 évaluations d'entraînement. Il entre par un entretien de 20 min et un plan à 90 jours (10 membres, 3 stagiaires). Ce n'est pas un salarié du club. 2ᵉ marche de l'échelle, à gauche.",
    },
    {
      t: "junior partner",
      d: "la marche où l'on apprend les CHIFFRES d'un club : loyer, point mort, stocks, statistiques, planning. Rythme demandé : 4 services complets et 5 nouveaux membres par semaine, 10 clients en première ligne sous 90 jours.",
    },
    {
      t: "propriétaire de club",
      d: "il ouvre son propre club, après 6 semaines de pré-lancement non négociables. Son club devient à son tour le terrain de formation des stagiaires suivants.",
    },
    {
      t: "service",
      d: "un créneau tenu au bar, de 7h à 11h (ou deux demi-services 7h-9h / 9h-11h). C'est l'unité d'engagement du club : 1 par semaine pour un stagiaire, 4 pour un junior partner. Absent, on se fait remplacer soi-même.",
    },
    {
      t: "soirée dégustation",
      d: "l'« information nutrition » : au club ou chez quelqu'un, on fait goûter, on partage des témoignages, et les gens repartent avec un rendez-vous d'évaluation. Un stagiaire en fait 5 minimum pendant sa formation.",
    },
    {
      t: "liste de 100 · liste de 200",
      d: "la liste de tous ceux que tu connais, écrite SANS trier : famille, amis, collègues, clubs, hobbies. 100 noms pour un coach qui démarre ; 200 pour un pré-lancement de club, qui se fait en équipe. C'est la matière première — sans elle, pas d'invitations.",
    },
    {
      t: "Coach Académie",
      d: "la formation hebdomadaire de l'équipe, en visio. Un sujet et un intervenant différents chaque semaine. Non négociable pour un stagiaire : c'est là qu'il acquiert les compétences et rencontre l'équipe.",
    },
    {
      t: "HOM",
      d: "la réunion d'opportunité maison du modèle classique. Elle DISPARAÎT en BBC : remplacée par l'Appel Ambassadeur et l'Atelier Cœurs.",
    },
    {
      t: "Tanita",
      d: "la balance à impédance qui donne les chiffres du corps pendant l'évaluation. Trois chiffres suffisent : poids, masse grasse, masse musculaire.",
    },
    {
      t: "World Team · GET",
      d: "des rangs HERBALIFE, pas des marches du club. Ils mesurent le volume de ton organisation ; l'échelle à gauche mesure ton rôle dans le modèle BBC. Deux échelles différentes, ne les mélange pas.",
    },
    {
      t: "PV · Club 100",
      d: "PV = les points de volume. Un club à maturité ≈ 20 000 PV. Le Club 100 = 100 membres actifs, 3 superviseurs actifs, 9 stagiaires — le modèle à dupliquer plutôt qu'à faire grossir.",
    },
  ];
}
