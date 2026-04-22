// Chantier Co-pilote V4 (2026-04-24).
// Helpers purs pour la page /co-pilote : greeting, mood, PV %.
// Extraits pour être testables facilement (Vitest).

export function greetingFor(hour: number): string {
  if (hour >= 5 && hour < 12) return "Bonjour";
  if (hour >= 12 && hour < 18) return "Bon après-midi";
  if (hour >= 18 && hour < 23) return "Bonsoir";
  return "Bonne nuit";
}

export type MoodLevel = "calm" | "easy" | "productive" | "intense";

export function moodForLoad(totalEvents: number): { level: MoodLevel; label: string } {
  if (totalEvents === 0) return { level: "calm", label: "Journée calme, profites-en ☕" };
  if (totalEvents <= 3) return { level: "easy", label: "Tranquille aujourd'hui" };
  if (totalEvents <= 6) return { level: "productive", label: "Journée productive 💪" };
  return { level: "intense", label: "Grosse journée 🚀" };
}

export function pvProgressPercent(current: number, target: number): number {
  if (!target || target <= 0) return 0;
  const pct = Math.round((current / target) * 100);
  return Math.max(0, Math.min(pct, 100));
}

/** Jours restants dans le mois en cours (inclut aujourd'hui). */
export function daysRemainingInMonth(now: Date = new Date()): number {
  const last = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  return Math.max(0, last - now.getDate() + 1);
}

/** Libellé "dans X" depuis maintenant. Renvoie "maintenant", "dans 5 min",
 *  "dans 2h", "dans 3h 20". Utilisé par la Hero card. */
export function formatCountdown(target: Date, now: Date = new Date()): string {
  const diffMs = target.getTime() - now.getTime();
  if (diffMs <= 60_000) return "maintenant";
  const mins = Math.round(diffMs / 60_000);
  if (mins < 60) return `dans ${mins} min`;
  const hours = Math.floor(mins / 60);
  const leftover = mins % 60;
  if (hours < 24 && leftover === 0) return `dans ${hours}h`;
  if (hours < 24) return `dans ${hours}h ${leftover.toString().padStart(2, "0")}`;
  const days = Math.floor(hours / 24);
  return `dans ${days} jour${days > 1 ? "s" : ""}`;
}

/** Conversion bilans → clients actifs ce mois.
 *  Retourne un % arrondi, 0 si pas de bilans (pas de division par zéro). */
export function conversionRatePercent(
  assessmentsThisMonth: number,
  activeClientsThisMonth: number,
): number {
  if (assessmentsThisMonth === 0) return 0;
  return Math.round(
    (activeClientsThisMonth / assessmentsThisMonth) * 100,
  );
}
