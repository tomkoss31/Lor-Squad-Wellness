// =============================================================================
// messagesPrets — la boîte à outils, posée là où on écrit.
//
// Le « message prêt » du Co-pilote était figé : un seul texte, à prendre ou à
// laisser. Or on n'écrit pas pareil à quelqu'un qu'on a laissé tomber depuis
// six semaines et à un inconnu qui a laissé son numéro hier.
//
// Trois angles par situation, un tap, le message se réécrit sans quitter
// l'écran. Le premier est celui que l'app propose d'elle-même — les deux
// autres existent parce que le premier ne va pas toujours.
//
// ⚠️ Ces textes partent VRAIMENT chez de vraies personnes. Deux règles :
//   - on ne fait jamais semblant d'avoir une raison d'écrire (« je pensais à
//     toi » quand on relance pour du chiffre, c'est du mensonge tiède) ;
//   - quand on est en tort, on le dit. « Je ne t'ai pas donné suite, désolé »
//     ouvre plus de portes que « je reviens vers toi ».
// =============================================================================

import type { MotifAttente } from "../../hooks/useFileDuJour";
import { messageDeRelance, type CleReponse } from "../crm/qualification";

export interface Angle {
  /** Le libellé du bouton — deux mots maximum, il vit dans une puce. */
  cle: string;
  texte: string;
}

interface Contexte {
  /** Prénom de la personne. */
  prenom: string;
  /** Prénom du coach — jamais « ton coach », on signe. */
  moi: string;
  motif: MotifAttente | "dormant" | "paiement-en-attente";
  /** Sert au ton : on ne s'excuse pas pareil après 3 jours et après 3 mois. */
  jours?: number;
  /** Pour une relance : ce qui s'était passé au contact précédent. */
  derniereReponse?: CleReponse | null;
}

const salut = (p: string) => `Salut ${p} 👋`;
const bonjour = (p: string, moi: string) =>
  `Bonjour ${p} 👋 C'est ${moi} de La Base 360`;

export function anglesPour(c: Contexte): Angle[] {
  const { prenom, moi, motif } = c;

  switch (motif) {
    // Un suivi qu'on avait calé et qu'on n'a pas fait. On est en tort ; le
    // premier angle le reconnaît, parce que c'est ce qui débloque.
    case "suivi-en-retard":
      return [
        {
          cle: "Franc",
          texte: `${salut(prenom)} On devait faire un point ensemble et je n'ai pas donné suite — c'est ma faute, désolé. Où tu en es en ce moment ?`,
        },
        {
          cle: "Un créneau",
          texte: `${salut(prenom)} Je te dois un point ! Je te propose jeudi 18 h, ou samedi matin si ça t'arrange mieux. Lequel je bloque ?`,
        },
        {
          cle: "Léger",
          texte: `${salut(prenom)} Comment tu vas ? Ça fait un moment qu'on ne s'est pas parlé — raconte-moi où tu en es 🙂`,
        },
      ];

    // Quelqu'un a laissé son numéro et personne ne l'a rappelé. Il ne nous
    // connaît pas : on se présente, on rappelle POURQUOI on écrit.
    case "lead":
      return [
        {
          cle: "Comme promis",
          texte: `${bonjour(prenom, moi)} — tu as laissé tes coordonnées, je reviens vers toi comme promis. Tu as un moment cette semaine pour qu'on en parle ? 🌿`,
        },
        {
          cle: "Court",
          texte: `${bonjour(prenom, moi)}. Toujours d'actualité de ton côté ?`,
        },
        {
          cle: "Un créneau",
          texte: `${bonjour(prenom, moi)} — je te propose un bilan offert jeudi 18 h ou samedi matin. Ça te va ?`,
        },
      ];

    // Il a rempli un bilan ENTIER. C'est beaucoup de temps donné : on le
    // reconnaît, et on parle de SES réponses, pas de nous.
    case "bilan-en-ligne":
      return [
        {
          cle: "Son bilan",
          texte: `${bonjour(prenom, moi)}. J'ai bien reçu ton bilan et j'ai regardé tes réponses — je te fais un retour quand tu veux 🙂`,
        },
        {
          cle: "Court",
          texte: `${bonjour(prenom, moi)}. Tu as 10 minutes cette semaine pour qu'on parle de ton bilan ?`,
        },
        {
          cle: "Un créneau",
          texte: `${bonjour(prenom, moi)} — pour ton bilan, je te propose jeudi 18 h ou samedi matin. Lequel t'arrange ?`,
        },
      ];

    // Il a cessé de commander. Il ne demande rien : on ne joue pas l'urgence,
    // et on lui laisse une porte de sortie honnête.
    case "dormant":
      return [
        {
          cle: "Des nouvelles",
          texte: `${salut(prenom)} Ça fait un moment ! Je repensais à ton suivi — où tu en es en ce moment ?`,
        },
        {
          cle: "Franc",
          texte: `${salut(prenom)} Tu n'as rien repris depuis un moment — c'est un choix, ou juste la vie qui passe ? Dis-moi franchement, je m'adapte 🙂`,
        },
        {
          cle: "Une idée",
          texte: `${salut(prenom)} Il y a une nouveauté qui collerait bien à ce que tu faisais. Je t'en dis deux mots ?`,
        },
      ];

    // Une personne qu'on a DÉJÀ appelée et qui revient à l'échéance qu'on
    // s'était fixée. Le premier angle nomme ce qui s'était passé — réécrire
    // « vous avez laissé vos coordonnées » à quelqu'un qu'on a eu au téléphone
    // sonne faux, et c'est ce qui fait qu'un message ne ressemble à rien.
    case "relance":
      return [
        { cle: "La suite", texte: messageDeRelance(c.derniereReponse ?? null, prenom, moi) },
        {
          cle: "Court",
          texte: `${salut(prenom)} C'est ${moi} — je reviens vers toi comme promis. Ça te dit qu'on en reparle ?`,
        },
        {
          cle: "Un créneau",
          texte: `${salut(prenom)} C'est ${moi}. Je te propose jeudi 18 h ou samedi matin — lequel t'arrange ?`,
        },
      ];

    // Il a cliqué « Je démarre » et le paiement n'est jamais passé. C'est la
    // situation la plus chaude de l'app : quelqu'un avait sorti sa carte.
    case "paiement-en-attente":
      return [
        {
          cle: "Technique",
          texte: `${salut(prenom)} Je vois que le paiement n'est pas passé — souci technique, ou tu préfères qu'on en reparle avant ? Dis-moi 🙂`,
        },
        {
          cle: "Nouveau lien",
          texte: `${salut(prenom)} Le lien de paiement a peut-être expiré de ton côté. Je t'en renvoie un neuf tout de suite si tu veux ?`,
        },
        {
          cle: "Autrement",
          texte: `${salut(prenom)} Si le montant d'un coup te bloque, on peut partir sur un programme plus court pour commencer. Ça t'irait mieux ?`,
        },
      ];
  }
}

/** Le merci qui suit un encaissement — court, chaleureux, et il dit la suite. */
export function merciPaiement(prenom: string): Angle[] {
  return [
    {
      cle: "Chaleureux",
      texte: `Merci ${prenom} ! 🙌 C'est bien reçu — ta commande t'attend au club quand tu veux. On se voit vite !`,
    },
    {
      cle: "Et la suite",
      texte: `Merci ${prenom} ! 🙌 C'est validé. On se cale un point de départ cette semaine pour bien lancer ton programme ?`,
    },
    {
      cle: "Court",
      texte: `Merci ${prenom} ! 🙌 C'est bien reçu, à très vite au club.`,
    },
  ];
}

/** Ce qu'on écrit à un client qui vient de nous écrire — on répond, on ne relance pas. */
export function reponseAuMessage(prenom: string): Angle[] {
  return [
    {
      cle: "J'arrive",
      texte: `${salut(prenom)} Je viens de voir ton message — je te réponds tout de suite 🙂`,
    },
    {
      cle: "Un appel",
      texte: `${salut(prenom)} Merci pour ton message ! C'est plus simple de vive voix — je peux t'appeler dans la journée ?`,
    },
  ];
}
