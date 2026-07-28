// =============================================================================
// bbcScripts — source unique des scripts verbatim BBC (chantier BBC).
// Partagée par la vue Scripts et le flow « envoyer un cobaye » du Cockpit.
// Verrouillés par défaut (règle : on ne modifie pas le cœur du message).
// Source : Notion Formation BBC (verbatim officiel).
//
// ⚠️ « On ne modifie pas le message » ne veut pas dire « on fige les jours ».
// Un script qui annonce un jour de rituel doit le LIRE dans les réglages du
// club : sinon le coach invite pour lundi pendant que les rappels automatiques
// partent le mardi. Le verbatim reste intact, seule la cadence est variable.
// =============================================================================

import type { ClubSettings } from "../../../types/domain";

export interface BbcScript {
  cat: string;
  accent: "lime" | "teal" | "coral";
  title: string;
  src: string;
  /**
   * Corps du message ; `who` = prénom injecté (défaut « [prénom] »).
   * `cfg` = les réglages du club, pour les scripts qui citent un jour de rituel.
   * Sans elle, le script annonçait « lundi ou jeudi » en dur pendant que les
   * rappels automatiques partaient sur le jour RÉGLÉ : le coach invitait un
   * soir, l'app convoquait un autre.
   */
  body: (who: string, cfg?: ClubSettings) => string;
  /** true = proposé dans le flow « envoyer un cobaye » du Cockpit. */
  outreach?: boolean;
}

/**
 * Les jours d'un rituel, tels que RÉGLÉS dans Réglages → rituels.
 * Repli volontairement vague plutôt que faux : mieux vaut « en soirée » qu'un
 * jour inventé que le membre ne retrouvera pas au bout du lien.
 */
function joursRituel(cfg: ClubSettings | undefined, key: string): string {
  const d = cfg?.calls?.[key]?.days;
  if (!d?.length) return "en soirée";
  if (d.length === 1) return d[0];
  return `${d.slice(0, -1).join(", ")} ou ${d[d.length - 1]}`;
}

export const BBC_SCRIPTS: BbcScript[] = [
  { cat: "Inviter", accent: "lime", title: "Message cobaye · marché chaud", src: "02 — L'invitation", outreach: true,
    body: (w) => `Coucou ${w} 😊 J'ai démarré une nouvelle activité, je me forme pour devenir coach bien-être. Je cherche quelques personnes pour m'entraîner sur mes bilans bien-être gratuits. Est-ce que tu accepterais d'être mon/ma « cobaye » pour un bilan ? 🧡 C'est sans engagement, juste pour m'aider à pratiquer.` },
  { cat: "Inviter", accent: "lime", title: "Message cobaye · pré-lancement", src: "08 — Pré-lancement · verbatim officiel", outreach: true,
    body: (w) => `Hello ${w}, j'espère que toi et ta famille allez bien ? J'espère que ça ne te dérange pas que je te contacte — j'ouvre mon Club de Nutrition et je suis hyper enthousiaste. Je recherche des cobayes pour m'aider à m'entraîner sur mon Évaluation Bien-Être et Scan Corporel. Cette évaluation a une valeur de 50 €, mais je la fais gratuitement pour pouvoir m'entraîner. Est-ce que je peux m'entraîner avec toi ?` },
  { cat: "Inviter", accent: "teal", title: "Le double rendez-vous", src: "02 — L'invitation",
    body: () => `En fait, c'est un rendez-vous double. Est-ce que tu pourrais venir avec un ami ou quelqu'un de ta famille ? Les deux bilans sont gratuits et valent 50 € chacun.` },
  { cat: "Inviter", accent: "teal", title: "Relance sample party manquée", src: "02 — L'invitation", outreach: true,
    body: (w) => `Coucou ${w} 💛 Dommage que tu n'aies pas pu venir à notre sample party hier, c'était top, tu aurais adoré ! J'ai encore quelques places cette semaine pour un bilan bien-être gratuit au club. Dis-moi quand tu es dispo et j'essaie de m'adapter à toi 😉` },
  { cat: "Cœurs & recommandations", accent: "lime", title: "La question qui change tout", src: "05 — Le bilan des 10 visites",
    body: () => `Qui connais-tu qui pourrait en bénéficier ?` },
  { cat: "Cœurs & recommandations", accent: "lime", title: "Demander les recos au bilan", src: "02 / 05",
    body: () => `Est-ce que quelqu'un a remarqué tes résultats ? … Tu veux qu'on lui écrive ensemble, là, maintenant ?` },
  { cat: "Cœurs & recommandations", accent: "teal", title: "Les bons de recommandation", src: "02 — L'invitation",
    body: () => `Tu adores le club ? On va te faire des réductions. Je vais te montrer comment faire profiter tes proches de résultats comme les tiens.` },
  { cat: "Cœurs & recommandations", accent: "teal", title: "DM à qui commente un post", src: "05 — Le bilan des 10 visites", outreach: true,
    body: (w) => `Salut ${w}, merci pour ton commentaire sur le post de mon membre, ça lui fait super plaisir ! Je suis sa coach bien-être au club et j'offre en ce moment des bilans bien-être gratuits pour les objectifs santé, perte de poids, énergie ou performance. Qui connais-tu qui pourrait en bénéficier ?` },
  { cat: "Appel ambassadeur", accent: "lime", title: "Invitation à l'appel", src: "06 — L'appel ambassadeur", outreach: true,
    body: (_w, cfg) => `Vu tes résultats et ton enthousiasme, il y a une prochaine étape pour toi. On a une petite Réunion Ambassadeur en ligne où on explique comment avoir plus de remise, comment te faire rembourser grâce à tes recommandations, et si ça t'intéresse, comment faire un petit complément de revenu. C'est en visio, 30-40 min, tu peux juste écouter. ${joursRituel(cfg, "appel_ambassadeur")} soir — qu'est-ce qui t'arrange le mieux ?` },
  // Les 4 options sont RECOPIÉES de la slide que la personne vient de voir
  // (« Présentation appel ambassadeur », Drive). L'ancienne version décalait C
  // et D d'un cran — elle proposait « un vrai projet » là où l'écran affichait
  // « propriétaire de club » : la personne ne retrouvait pas ses mots.
  { cat: "Appel ambassadeur", accent: "teal", title: "Hot potato · dans les 10 min", src: "06 — L'appel ambassadeur",
    body: (w) => `Hey ${w} 😊 Comment tu as trouvé l'appel ? Qu'est-ce qui t'a le plus parlé ? Parmi les 4 options : A) rester client satisfait · B) ambassadeur, commander avec ta remise · C) coach stagiaire, un revenu à temps choisi · D) ouvrir ton propre club. Tu te reconnais le plus dans laquelle aujourd'hui ?` },
  { cat: "Objections", accent: "coral", title: "Feel · Felt · Found", src: "05 — Le bilan des 10 visites",
    body: () => `Je comprends ce que tu ressens. D'autres ont ressenti exactement la même chose. Et ils ont trouvé que… (puis une solution concrète — ex. transit → ajouter des fibres au plan).` },
  { cat: "Objections", accent: "coral", title: "L'échelle 1 à 10 (évaluation)", src: "03 — L'évaluation bien-être",
    body: () => `Sur une échelle de 1 à 10, dans quelle mesure êtes-vous prêt(e) à commencer à apporter des changements quotidiens ? (8 ou plus → on démarre tout de suite. En dessous, on creuse le moment ou la clarté de l'objectif.)` },
];

export const BBC_SCRIPT_CATS = ["Inviter", "Cœurs & recommandations", "Appel ambassadeur", "Objections"];

export function scriptAccentColor(a: BbcScript["accent"]) {
  return a === "lime" ? "var(--ls-bbc-lime)" : a === "teal" ? "var(--ls-bbc-teal)" : "var(--ls-bbc-coral)";
}
export function scriptAccentBg(a: BbcScript["accent"]) {
  return a === "lime" ? "rgba(197,248,42,.10)" : a === "teal" ? "rgba(45,212,191,.10)" : "rgba(251,113,133,.10)";
}
