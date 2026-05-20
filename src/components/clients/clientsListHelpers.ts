// =============================================================================
// clientsListHelpers — extraits de ClientsPage.tsx (refacto 2026-05-19)
//
// Phase 3.5 brainstorm Égypte — étape 1/3 refacto ClientsPage.
// Helpers de présentation (badges statut, formats date relative) +
// helper d'export CSV. Aucune dépendance React, fonctions pures.
// =============================================================================

import type { Client, LifecycleStatus, User } from "../../types/domain";
import { LIFECYCLE_LABELS, LIFECYCLE_TONES } from "../../types/domain";
import { isClientProgramStarted } from "../../lib/calculations";

export function getOwnerAvatarColors(role: User["role"]) {
  switch (role) {
    case "admin":
      return { bg: "#E6F1FB", text: "#0C447C" };
    case "referent":
      return { bg: "#FAEEDA", text: "#633806" };
    case "distributor":
    default:
      return { bg: "#EAF3DE", text: "#27500A" };
  }
}

export const LIFECYCLE_TONE_TO_COLORS: Record<
  "teal" | "gold" | "muted" | "coral",
  { bg: string; color: string }
> = {
  teal: { bg: "rgba(13,148,136,0.1)", color: "var(--ls-teal)" },
  gold: { bg: "rgba(184,146,42,0.1)", color: "var(--ls-gold)" },
  muted: { bg: "var(--ls-surface2)", color: "var(--ls-text-muted)" },
  coral: { bg: "rgba(220,38,38,0.1)", color: "var(--ls-coral)" },
};

export function getClientStatusInfo(client: Client, nextFollowUp: string | undefined) {
  // Priorité 1 : lifecycle stopped/lost/paused → label direct
  const lifecycle: LifecycleStatus =
    client.lifecycleStatus ?? (isClientProgramStarted(client) ? "active" : "not_started");
  if (lifecycle === "stopped" || lifecycle === "lost" || lifecycle === "paused") {
    const colors = LIFECYCLE_TONE_TO_COLORS[LIFECYCLE_TONES[lifecycle]];
    return { label: LIFECYCLE_LABELS[lifecycle], bg: colors.bg, color: colors.color };
  }
  // Priorité 2 : RDV urgent ou en retard
  if (nextFollowUp && isOverdue(nextFollowUp)) {
    return { label: "Relance", bg: "rgba(220,38,38,0.1)", color: "var(--ls-coral)" };
  }
  if (nextFollowUp) {
    const daysUntil = getDaysUntil(nextFollowUp);
    if (daysUntil !== null && daysUntil <= 2) {
      return { label: "RDV", bg: "rgba(184,146,42,0.1)", color: "var(--ls-gold)" };
    }
  }
  // Priorité 3 : lifecycle basique
  const colors = LIFECYCLE_TONE_TO_COLORS[LIFECYCLE_TONES[lifecycle]];
  return { label: LIFECYCLE_LABELS[lifecycle], bg: colors.bg, color: colors.color };
}

export function isOverdue(dateStr: string | undefined): boolean {
  if (!dateStr) return false;
  return new Date(dateStr).getTime() < Date.now();
}

export function getDaysUntil(dateStr: string | undefined): number | null {
  if (!dateStr) return null;
  const diff = new Date(dateStr).getTime() - Date.now();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

export function getRelativeTime(dateStr: string | undefined): string {
  if (!dateStr) return "—";
  const days = getDaysUntil(dateStr);
  if (days === null) return "—";
  if (days < 0) return `depuis ${Math.abs(days)} j`;
  if (days === 0) return "aujourd'hui";
  if (days === 1) return "demain";
  if (days < 30) return `dans ${days} jours`;
  const months = Math.floor(days / 30);
  return `dans ${months} mois`;
}

/** Timestamp du dernier bilan (any type) pour tri. */
export function getLastAssessmentTime(client: Client): number | null {
  if (!client.assessments || client.assessments.length === 0) return null;
  let max = 0;
  for (const a of client.assessments) {
    const t = new Date(a.date).getTime();
    if (!Number.isNaN(t) && t > max) max = t;
  }
  return max > 0 ? max : null;
}

/**
 * Export CSV des clients filtrés. Génère un fichier avec colonnes :
 * Prénom, Nom, Tél, Email, Ville, Statut, Programme, Dernier bilan.
 * Téléchargement direct via Blob + anchor.
 */
export function exportClientsCsv(clients: Client[]) {
  if (clients.length === 0) return;
  const header = [
    "Prénom",
    "Nom",
    "Téléphone",
    "Email",
    "Ville",
    "Statut",
    "Programme",
    "Dernier bilan",
  ];
  const rows = clients.map((c) => {
    const lastAt = getLastAssessmentTime(c);
    const lastDate = lastAt ? new Date(lastAt).toISOString().slice(0, 10) : "";
    return [
      c.firstName ?? "",
      c.lastName ?? "",
      c.phone ?? "",
      c.email ?? "",
      c.city ?? "",
      c.lifecycleStatus ?? "",
      c.currentProgram ?? "",
      lastDate,
    ];
  });
  const csv = [header, ...rows]
    .map((row) =>
      row
        .map((cell) => {
          const s = String(cell ?? "");
          if (s.includes(",") || s.includes('"') || s.includes("\n")) {
            return `"${s.replace(/"/g, '""')}"`;
          }
          return s;
        })
        .join(","),
    )
    .join("\n");
  // BOM pour Excel reconnaisse l'UTF-8 + accents.
  const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  const datestamp = new Date().toISOString().slice(0, 10);
  a.download = `clients-export-${datestamp}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}
