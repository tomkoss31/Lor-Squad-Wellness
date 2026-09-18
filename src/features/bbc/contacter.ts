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
// Livraison A : les règles qu'on peut calculer côté app. « Absente depuis
// 6 jours » attend la fonction en base de la livraison B (la date de dernière
// visite n'est pas encore dans le hook des membres).
// =============================================================================

import type { CrmLead } from "../../hooks/useCrmLeads";
import type { BbcMember } from "./useBbcMembers";
import { nextPalier, type HeartMember } from "./useBbcHearts";

export type RaisonContact =
  | "lead_nouveau"
  | "relance_due"
  | "neuvieme_visite"
  | "carte_finie"
  | "coeur";

export interface AContacter {
  /** Stable : sert de clé React et de `contact_label` quand on note le geste. */
  key: string;
  nom: string;
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
}

/** « attend depuis 21 min » / « attend depuis 8 h » / « attend depuis 3 jours ». */
export function attente(minutes: number): string {
  if (minutes < 60) return `attend depuis ${Math.max(1, Math.round(minutes))} min`;
  if (minutes < 48 * 60) return `attend depuis ${Math.round(minutes / 60)} h`;
  return `attend depuis ${Math.round(minutes / (60 * 24))} jours`;
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
  maintenant?: Date;
}): AContacter[] {
  const now = args.maintenant ?? new Date();
  const out: AContacter[] = [];

  for (const l of args.leads) {
    if (l.dormant || l.status === "converted" || l.status === "lost") continue;
    const geste: AContacter["geste"] = l.phone ? "appeler" : "ecrire";
    if (l.status === "new") {
      const min = Math.max(0, (now.getTime() - new Date(l.createdAt).getTime()) / 60000);
      const dou = l.viaName ? `Recommandé·e par ${l.viaName}` : SOURCE_TEXTE[l.source] ?? "Lead";
      out.push({
        key: `lead:${l.key}`,
        nom: l.firstName,
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
    if (m.card.used >= m.card.type) {
      out.push({ key: `membre:${m.id}:carte`, nom: m.name, raison: "carte_finie", texte: `Carte ${m.card.type} finie : proposer le bilan et la carte suivante`, geste: "ecrire", urgence: 3, telephone: m.phone ?? null, membreId: m.id });
    } else if (m.card.used === m.card.type - 1) {
      out.push({ key: `membre:${m.id}:neuf`, nom: m.name, raison: "neuvieme_visite", texte: `${m.card.used}e visite : lui proposer le bilan de la ${m.card.type}e`, geste: "ecrire", urgence: 3, telephone: m.phone ?? null, membreId: m.id });
    }
  }

  const dejaMembre = new Set(out.filter((c) => c.membreId).map((c) => c.membreId));
  for (const h of args.coeurs) {
    const next = nextPalier(h.hearts);
    if (next === null || next - h.hearts !== 1) continue;
    if (dejaMembre.has(h.key)) continue;
    out.push({ key: `coeur:${h.key}`, nom: h.name, raison: "coeur", texte: `${h.hearts} ♥ · à 1 cœur du palier ${next} : lui demander une amie`, geste: "ecrire", urgence: 4, telephone: null, membreId: h.key });
  }

  return out.sort((a, b) => a.urgence - b.urgence || (b.attenteMin ?? 0) - (a.attenteMin ?? 0) || a.nom.localeCompare(b.nom, "fr"));
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
    case "coeur":
      return `${c.nom}, tu es à un cœur du palier suivant 💛 Tu as quelqu'un autour de toi qui aimerait essayer ? Je lui offre sa première visite.`;
  }
}
