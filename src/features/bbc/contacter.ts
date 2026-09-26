// =============================================================================
// « Contacter aujourd'hui » — QUI le coach doit joindre, et POURQUOI.
//
// Thomas (18/09/2026) : « le gros trou, c'est la prospection, je ne contacte
// pas assez de monde ». L'app remplit donc la liste elle-même, à partir de ce
// qu'elle sait déjà, et la range par urgence. Objectif : 20 contacts par jour
// (« normalement c'est 20 »). Les 6 règles ont été validées par Thomas.
//
// Fonctions PURES, sans React ni base : testables, et la même liste sert à
// « Le matin » (les 5 premiers) et à l'onglet « Contacter » (tout).
//
// Livraison B : les 6 règles, avec la dernière visite de chaque membre lue en
// base (`bbc_dernieres_visites`, hook useBbcSignaux) pour « absente depuis
// 6 jours » et « contente depuis 3 semaines ».
// 7e règle (journal, bloc B, 8 — Thomas le 21/09 : « ok pour 3 jours ») : elle
// notait son journal au moins 5 jours sur 7, puis plus rien depuis 3 à 14 jours.
// Même rang que « absente », qui passe devant ; relancée une fois, elle ne revient
// pas tant qu'elle n'a pas repris (`journal_signaux_club`, `deja_relancee`).
// 9e règle (comptoir, lot 2, 26/09) : « son F1 arrive au bout » — elle emporte du
// F1, il lui en reste 1 ou 0, et le club ferme demain ou après-demain
// (`club_maison`, `f1AuBout` dans caisse/maison.ts). Pas si elle est passée
// aujourd'hui : la caisse lui a déjà proposé de quoi tenir.
// =============================================================================

import type { CrmLead } from "../../hooks/useCrmLeads";
import type { BbcMember } from "./useBbcMembers";
import { nextPalier, type HeartMember } from "./useBbcHearts";
import type { SignalVisites } from "./useBbcSignaux";
import { nomAffiche } from "../crm/nomPropre";
import type { ReglagesHoraires } from "./agenda/agendaClub";
import { f1AuBout, jourParis, nomDuJour, type DonneesMaison } from "./caisse/maison";

/** Le nom complet d'un lead pour la liste : « Amélie Durand », le prénom seul si on n'a pas le nom. */
function nomCompletLead(l: CrmLead): string {
  const prenom = l.firstName && l.firstName !== "—" ? l.firstName : null;
  return nomAffiche(prenom, l.lastName ?? null, l.firstName || "—");
}

/** Le prénom d'une personne : le sien s'il est connu, sinon le premier mot de son nom. */
function prenomDe(nom: string, prenom?: string | null): string {
  return (prenom ?? "").trim() || nom.split(/\s+/)[0] || nom;
}

export type RaisonContact =
  | "lead_nouveau"
  | "relance_due"
  | "neuvieme_visite"
  | "carte_finie"
  | "absente"
  | "contente"
  | "journal"
  | "coeur"
  /** Montée de niveau (XP) depuis moins de 7 jours : la féliciter (24/09). */
  | "niveau"
  /** Plus qu'un sachet de F1 à la maison, le club ferme bientôt (comptoir, lot 2). */
  | "f1_bout";

export interface AContacter {
  /** Stable : sert de clé React et de `contact_label` quand on note le geste. */
  key: string;
  /** Le PRÉNOM : c'est lui qu'on écrit dans le message (« Salut Amélie ! ») et qu'on note. */
  nom: string;
  /** Prénom + nom, pour la LISTE (22/09, Thomas : « il manque les noms » — trois Amélie,
   *  deux Sandrine : avec le prénom seul, on ne sait pas qui appeler). */
  nomComplet: string;
  raison: RaisonContact;
  /** La phrase sous le prénom — ce qui explique pourquoi cette personne est là. */
  texte: string;
  geste: "appeler" | "ecrire";
  /** 1 = tout de suite … 5 = dernier essai. Sert au tri. */
  urgence: 1 | 2 | 3 | 4 | 5;
  telephone: string | null;
  lead?: CrmLead;
  membreId?: string;
  /** Depuis quand elle attend, pour les leads (minutes). */
  attenteMin?: number;
  /** Le jour de fermeture, pour « son F1 arrive au bout » (« dimanche »). */
  quand?: string;
}

/** « attend depuis 21 min » / « attend depuis 8 h » / « attend depuis 3 jours ». */
export function attente(minutes: number): string {
  if (minutes < 60) return `attend depuis ${Math.max(1, Math.round(minutes))} min`;
  if (minutes < 48 * 60) return `attend depuis ${Math.round(minutes / 60)} h`;
  return `attend depuis ${Math.round(minutes / (60 * 24))} jours`;
}

/** « Elle a lâché son journal » : une habitude (5 jours sur 7), puis un silence de 3 à 14 jours. */
export const JOURNAL_LACHE = { joursNotes: 5, silenceMin: 3, silenceMax: 14 } as const;

/** Les jours entre une date (AAAA-MM-JJ) et aujourd'hui, à l'heure de Paris. */
function joursDepuis(jour: string, maintenant: Date): number {
  const auj = new Intl.DateTimeFormat("fr-CA", { timeZone: "Europe/Paris", year: "numeric", month: "2-digit", day: "2-digit" }).format(maintenant);
  return Math.round((Date.parse(`${auj}T00:00:00Z`) - Date.parse(`${jour}T00:00:00Z`)) / 86_400_000);
}

const SOURCE_TEXTE: Partial<Record<CrmLead["source"], string>> = {
  "bilan-online": "Bilan en ligne",
  vip: "Club VIP",
  "reco-client": "Recommandation",
  intention: "Recommandation",
};

export function aContacter(args: {
  leads: CrmLead[];
  membres: BbcMember[];
  coeurs: HeartMember[];
  /** Dernière visite et visites sur 30 j, par membre (livraison B). Sans elles, les règles
   *  « absente » et « contente » ne s'appliquent pas — jamais de fausse alerte. */
  signaux?: Map<string, SignalVisites>;
  /** Le niveau XP de chaque membre et le jour de sa dernière montée (24/09, useXpApercu). */
  niveaux?: Map<string, { niveau: number; monteLe: string | null; titre?: string }>;
  /** Ce que chaque membre a emporté et ses jours au club (`club_maison`, lot 2 du comptoir). */
  maison?: Map<string, DonneesMaison>;
  /** Les horaires du club : sans eux, jamais de « club fermé ». */
  horaires?: ReglagesHoraires | null;
  maintenant?: Date;
}): AContacter[] {
  const now = args.maintenant ?? new Date();
  const aujourdhui = jourParis(now);
  const JOUR = 24 * 60 * 60 * 1000;
  const out: AContacter[] = [];

  // 8e règle (24/09) : une montée de niveau de moins de 7 jours, pas encore fêtée — la clé
  // porte le niveau, donc chaque montée est un nouveau contact, et « déjà fait » tient.
  for (const m of args.membres) {
    const x = args.niveaux?.get(m.id);
    if (!x || x.niveau < 2 || !x.monteLe) continue;
    const depuis = (now.getTime() - new Date(x.monteLe + "T00:00:00").getTime()) / JOUR;
    if (depuis < 0 || depuis > 7) continue;
    const titre = x.titre ?? `niveau ${x.niveau}`;
    out.push({ key: `membre:${m.id}:niveau${x.niveau}`, nom: prenomDe(m.name, m.prenom), nomComplet: m.name, raison: "niveau", texte: `${titre} depuis ${depuis < 1 ? "aujourd'hui" : depuis < 2 ? "hier" : `${Math.floor(depuis)} jours`} — la féliciter`, geste: "ecrire", urgence: 3, telephone: m.phone ?? null, membreId: m.id });
  }

  for (const l of args.leads) {
    if (l.dormant || l.status === "converted" || l.status === "lost") continue;
    const geste: AContacter["geste"] = l.phone ? "appeler" : "ecrire";
    if (l.status === "new") {
      const min = Math.max(0, (now.getTime() - new Date(l.createdAt).getTime()) / 60000);
      const dou = l.viaName ? `Recommandé·e par ${l.viaName}` : SOURCE_TEXTE[l.source] ?? "Lead";
      out.push({
        key: `lead:${l.key}`,
        nom: l.firstName,
        nomComplet: nomCompletLead(l),
        raison: "lead_nouveau",
        texte: `${dou}, pas encore ${geste === "appeler" ? "appelé·e" : "contacté·e"} · ${attente(min)}`,
        geste,
        urgence: 1,
        telephone: l.phone,
        lead: l,
        attenteMin: min,
      });
      continue;
    }
    if (l.relanceDue) {
      out.push({
        key: `lead:${l.key}`,
        nom: l.firstName,
        nomComplet: nomCompletLead(l),
        raison: "relance_due",
        texte: "À relancer aujourd'hui, comme convenu",
        geste,
        urgence: 2,
        telephone: l.phone,
        lead: l,
      });
    }
  }

  for (const m of args.membres) {
    if (!m.card || m.card.expired) continue;
    const sig = args.signaux?.get(m.id);
    const joursSans = sig?.derniereVisite ? (now.getTime() - new Date(sig.derniereVisite).getTime()) / JOUR : null;
    const joursDepuisDebut = m.startDate ? (now.getTime() - new Date(m.startDate).getTime()) / JOUR : null;
    const journal = sig?.journal;
    const silence = journal ? joursDepuis(journal.derniereLigne, now) : null;
    const journalLache = !!journal && !journal.dejaRelancee && journal.joursNotes >= JOURNAL_LACHE.joursNotes
      && silence != null && silence >= JOURNAL_LACHE.silenceMin && silence <= JOURNAL_LACHE.silenceMax;
    const bout = !m.visitedToday && args.maison ? f1AuBout(args.maison.get(m.id) ?? null, args.horaires, aujourdhui) : null;
    if (m.card.used >= m.card.type) {
      out.push({ key: `membre:${m.id}:carte`, nom: prenomDe(m.name, m.prenom), nomComplet: m.name, raison: "carte_finie", texte: `Carte ${m.card.type} finie : proposer le bilan et la carte suivante`, geste: "ecrire", urgence: 3, telephone: m.phone ?? null, membreId: m.id });
    } else if (m.card.used === m.card.type - 1) {
      out.push({ key: `membre:${m.id}:neuf`, nom: prenomDe(m.name, m.prenom), nomComplet: m.name, raison: "neuvieme_visite", texte: `${m.card.used}e visite : lui proposer le bilan de la ${m.card.type}e`, geste: "ecrire", urgence: 3, telephone: m.phone ?? null, membreId: m.id });
    } else if (!m.visitedToday && joursSans !== null && joursSans >= 6) {
      out.push({ key: `membre:${m.id}:absente`, nom: prenomDe(m.name, m.prenom), nomComplet: m.name, raison: "absente", texte: `Pas venue depuis ${Math.round(joursSans)} jours`, geste: "ecrire", urgence: 3, telephone: m.phone ?? null, membreId: m.id });
    } else if (bout) {
      // La clé porte le jour de fermeture : prévenue une fois pour ce dimanche-là.
      const quand = nomDuJour(bout.ferme, aujourdhui);
      out.push({ key: `membre:${m.id}:f1bout:${bout.ferme}`, nom: prenomDe(m.name, m.prenom), nomComplet: m.name, raison: "f1_bout", texte: `${bout.reste === 0 ? "Plus de F1 à la maison" : "Plus qu'un sachet de F1 à la maison"}, club fermé ${quand} : lui proposer de quoi tenir`, geste: "ecrire", urgence: 3, telephone: m.phone ?? null, membreId: m.id, quand });
    } else if (journalLache && journal) {
      out.push({ key: `membre:${m.id}:journal`, nom: prenomDe(m.name, m.prenom), nomComplet: m.name, raison: "journal", texte: `Notait son journal ${journal.joursNotes} jours sur 7, plus rien depuis ${silence} jours`, geste: "ecrire", urgence: 3, telephone: m.phone ?? null, membreId: m.id });
    } else if (m.hearts === 0 && joursDepuisDebut !== null && joursDepuisDebut >= 21 && (sig?.visites30j ?? 0) >= 6) {
      out.push({ key: `membre:${m.id}:contente`, nom: prenomDe(m.name, m.prenom), nomComplet: m.name, raison: "contente", texte: `Vient depuis ${Math.floor(joursDepuisDebut / 7)} semaines, ${sig?.visites30j} visites ce mois : lui demander une amie`, geste: "ecrire", urgence: 4, telephone: m.phone ?? null, membreId: m.id });
    }
  }

  const dejaMembre = new Set(out.filter((c) => c.membreId).map((c) => c.membreId));
  for (const h of args.coeurs) {
    const next = nextPalier(h.hearts);
    if (next === null || next - h.hearts !== 1) continue;
    if (dejaMembre.has(h.key)) continue;
    out.push({ key: `coeur:${h.key}`, nom: prenomDe(h.name), nomComplet: h.name, raison: "coeur", texte: `${h.hearts} ♥ · à 1 cœur du palier ${next} : lui demander une amie`, geste: "ecrire", urgence: 4, telephone: null, membreId: h.key });
  }

  return out.sort((a, b) => a.urgence - b.urgence || (b.attenteMin ?? 0) - (a.attenteMin ?? 0) || a.nomComplet.localeCompare(b.nomComplet, "fr"));
}

/** Le message prêt à envoyer — court, à la première personne, jamais une relance de robot. */
export function messagePour(c: AContacter, coachPrenom: string): string {
  const moi = coachPrenom || "l'équipe";
  switch (c.raison) {
    case "lead_nouveau":
      return `Bonjour ${c.nom}, c'est ${moi} du Breakfast Club à Verdun. J'ai bien reçu votre demande — quand êtes-vous joignable pour en parler 5 minutes ?`;
    case "relance_due":
      return `Bonjour ${c.nom}, c'est ${moi} du Breakfast Club. Comme convenu, je reviens vers vous : on se cale un petit-déjeuner découverte cette semaine ?`;
    case "neuvieme_visite":
      return `${c.nom}, plus qu'une visite et on fait ton bilan ! On se cale ça au prochain passage ?`;
    case "carte_finie":
      return `${c.nom}, ta carte est finie, bravo ! On fait ton bilan et on parle de la suite au prochain passage ?`;
    case "absente":
      return `Salut ${c.nom} ! On ne t'a pas vue depuis quelques jours, tout va bien ? Le club t'attend demain matin, je te garde ton shake 🙂`;
    case "journal":
      return `Coucou ${c.nom} ! Ton journal est tout calme depuis quelques jours, tout va bien ? Pas besoin de tout noter : ton petit-déj et ton déjeuner, ça me suffit pour te guider 🙂`;
    case "contente":
      return `${c.nom}, ça fait plaisir de te voir aussi régulière 💪 Tu as quelqu'un autour de toi qui aimerait essayer ? Je lui offre sa première visite.`;
    case "coeur":
      return `${c.nom}, tu es à un cœur du palier suivant 💛 Tu as quelqu'un autour de toi qui aimerait essayer ? Je lui offre sa première visite.`;
    case "niveau":
      return `${c.nom}, tu viens de passer un niveau dans ton app 🎉 C'est ta régularité qui paie — continue comme ça, et tes XP te font gagner des cadeaux au bar.`;
    case "f1_bout":
      return `Coucou ${c.nom} ! Le club est fermé ${c.quand ?? "bientôt"} : il te reste de quoi faire tes shakes à la maison ? Passe avant, je te prépare tes sachets 🙂`;
  }
}
