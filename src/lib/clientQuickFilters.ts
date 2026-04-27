// =============================================================================
// Filtres rapides pour la page /clients (Chantier C.1, 2026-04-29)
// =============================================================================
//
// 7 chips selectionnables au-dessus de la liste pour filtrer rapidement
// les clients selon des criteres metier composites. Chaque chip a un
// predicat (client, followUps, now) -> boolean qui combine plusieurs
// signaux du domaine.
//
// Persistance localStorage : la selection active est sauvee sous
// "ls.clients.quickFilter" pour retrouver son etat au refresh.
//
// Architecture :
//   - QUICK_FILTERS : array statique des definitions (id, label, emoji,
//     predicate, tone)
//   - applyQuickFilter(filterId, clients, followUps) : helper d application
//   - countClientsForFilter(filterId, clients, followUps) : pour le compteur
//     affiche dans chaque chip
// =============================================================================

import type { Client, FollowUp } from "../types/domain";
import { getClientActiveFollowUp, isRelanceFollowUp } from "./portfolio";

export type QuickFilterId =
  | "all"
  | "to-followup"
  | "on-track"
  | "inactive-30d"
  | "no-rdv"
  | "incomplete"
  | "vip"
  | "new"
  | "fragile";

export interface QuickFilter {
  id: QuickFilterId;
  emoji: string;
  label: string;
  description: string;
  /** Couleur d accent du chip quand actif */
  tone: "gold" | "teal" | "coral" | "purple" | "neutral";
  predicate: (client: Client, ctx: QuickFilterContext) => boolean;
}

export interface QuickFilterContext {
  followUps: FollowUp[];
  now: Date;
}

const MS_PER_DAY = 86_400_000;

function daysSince(dateStr: string | undefined | null, now: Date): number {
  if (!dateStr) return Number.POSITIVE_INFINITY;
  const t = new Date(dateStr).getTime();
  if (Number.isNaN(t)) return Number.POSITIVE_INFINITY;
  return Math.floor((now.getTime() - t) / MS_PER_DAY);
}

function getLastAssessmentDate(client: Client): string | null {
  if (!client.assessments?.length) return null;
  return [...client.assessments]
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0]
    ?.date ?? null;
}

function getFirstAssessmentDate(client: Client): string | null {
  if (!client.assessments?.length) return null;
  return [...client.assessments]
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())[0]
    ?.date ?? null;
}

// ─── Definitions des filtres ──────────────────────────────────────────────────

export const QUICK_FILTERS: QuickFilter[] = [
  {
    id: "all",
    emoji: "📋",
    label: "Tous",
    description: "Tous les clients de la base courante.",
    tone: "neutral",
    predicate: () => true,
  },
  {
    id: "to-followup",
    emoji: "🔥",
    label: "À relancer",
    description:
      "Client avec RDV en retard ou en attente (meme definition que la stat Relances).",
    tone: "coral",
    predicate: (client, ctx) => {
      // Utilise la meme definition que le reste de l app (cf. portfolio.ts).
      // getClientActiveFollowUp exclut deja lost/stopped/paused/freeFollowUp.
      const active = getClientActiveFollowUp(client, ctx.followUps);
      return active !== null && isRelanceFollowUp(active);
    },
  },
  {
    id: "on-track",
    emoji: "🎯",
    label: "Au cap",
    description:
      "Client actif (lifecycle=active) avec au moins 1 bilan complet.",
    tone: "teal",
    predicate: (client) => {
      if (client.lifecycleStatus !== "active") return false;
      return (client.assessments?.length ?? 0) >= 1;
    },
  },
  {
    id: "inactive-30d",
    emoji: "💤",
    label: "Inactifs >30j",
    description:
      "Actif mais aucun bilan depuis plus de 30 jours.",
    tone: "purple",
    predicate: (client, ctx) => {
      // On filtre uniquement parmi les actifs (pas pause/stopped/lost).
      if (client.lifecycleStatus && client.lifecycleStatus !== "active") return false;
      const lastDate = getLastAssessmentDate(client);
      if (!lastDate) return false;
      return daysSince(lastDate, ctx.now) > 30;
    },
  },
  {
    id: "no-rdv",
    emoji: "📭",
    label: "Sans RDV",
    description: "Client actif sans RDV programme dans le futur.",
    tone: "gold",
    predicate: (client, ctx) => {
      // On filtre uniquement parmi les actifs.
      if (client.lifecycleStatus && client.lifecycleStatus !== "active") return false;
      // getClientActiveFollowUp = null si pas de RDV scheduled futur valide.
      const active = getClientActiveFollowUp(client, ctx.followUps);
      return active === null;
    },
  },
  {
    id: "incomplete",
    emoji: "⚠️",
    label: "Bilan incomplet",
    description:
      "Aucun bilan ou bilan initial avec poids/taille/age manquant.",
    tone: "coral",
    predicate: (client) => {
      if (!client.assessments || client.assessments.length === 0) return true;
      const initial = client.assessments.find((a) => a.type === "initial");
      if (!initial) return true;
      if (!client.age || client.age === 0) return true;
      if (!client.height || client.height === 0) return true;
      if (!initial.bodyScan?.weight || initial.bodyScan.weight === 0) return true;
      return false;
    },
  },
  {
    id: "vip",
    emoji: "⭐",
    label: "VIP",
    description: "Au moins 3 bilans realises (clients fideles).",
    tone: "gold",
    predicate: (client) => (client.assessments?.length ?? 0) >= 3,
  },
  {
    id: "new",
    emoji: "🌱",
    label: "Nouveaux",
    description: "Premier bilan il y a 14 jours ou moins.",
    tone: "teal",
    predicate: (client, ctx) => {
      const firstDate = getFirstAssessmentDate(client);
      if (!firstDate) return false;
      return daysSince(firstDate, ctx.now) <= 14;
    },
  },
  {
    id: "fragile",
    emoji: "🩹",
    label: "Fragiles",
    description: "Marques manuellement comme fragiles par le coach.",
    tone: "coral",
    predicate: (client) => client.isFragile === true,
  },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

export function applyQuickFilter(
  filterId: QuickFilterId,
  clients: Client[],
  ctx: QuickFilterContext,
): Client[] {
  const filter = QUICK_FILTERS.find((f) => f.id === filterId) ?? QUICK_FILTERS[0];
  return clients.filter((c) => filter.predicate(c, ctx));
}

export function countClientsForFilter(
  filterId: QuickFilterId,
  clients: Client[],
  ctx: QuickFilterContext,
): number {
  return applyQuickFilter(filterId, clients, ctx).length;
}

// ─── Persistance localStorage ─────────────────────────────────────────────────

const STORAGE_KEY = "ls.clients.quickFilter";

export function loadStoredQuickFilter(): QuickFilterId {
  if (typeof window === "undefined") return "all";
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (!stored) return "all";
    const valid = QUICK_FILTERS.some((f) => f.id === stored);
    return valid ? (stored as QuickFilterId) : "all";
  } catch {
    return "all";
  }
}

export function saveStoredQuickFilter(filterId: QuickFilterId): void {
  if (typeof window === "undefined") return;
  try {
    if (filterId === "all") {
      window.localStorage.removeItem(STORAGE_KEY);
    } else {
      window.localStorage.setItem(STORAGE_KEY, filterId);
    }
  } catch {
    // localStorage unavailable (quotas, mode prive) -> silent fail
  }
}

// ─── Couleurs des tones (mapping vers --ls-* tokens) ──────────────────────────

export function getQuickFilterToneColors(tone: QuickFilter["tone"]): {
  bg: string;
  border: string;
  text: string;
} {
  switch (tone) {
    case "gold":
      return {
        bg: "color-mix(in srgb, var(--ls-gold) 12%, transparent)",
        border: "var(--ls-gold)",
        text: "var(--ls-gold)",
      };
    case "teal":
      return {
        bg: "color-mix(in srgb, var(--ls-teal) 12%, transparent)",
        border: "var(--ls-teal)",
        text: "var(--ls-teal)",
      };
    case "coral":
      return {
        bg: "color-mix(in srgb, var(--ls-coral) 12%, transparent)",
        border: "var(--ls-coral)",
        text: "var(--ls-coral)",
      };
    case "purple":
      return {
        bg: "color-mix(in srgb, var(--ls-purple) 12%, transparent)",
        border: "var(--ls-purple)",
        text: "var(--ls-purple)",
      };
    default:
      return {
        bg: "var(--ls-surface2)",
        border: "var(--ls-border)",
        text: "var(--ls-text-muted)",
      };
  }
}
