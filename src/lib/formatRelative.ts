// =============================================================================
// formatRelative — formattage de dates relatives en francais (Polish, 2026-04-29)
// =============================================================================
//
// Helper unique pour produire des chaines comme :
//   "Aujourd'hui à 14h00"
//   "Demain à 10h00"
//   "Hier à 18h30"
//   "Il y a 3 jours"
//   "Dans 2 jours"
//   "Il y a 2 mois"
//
// Si la date est aujourd hui ou demain/hier : on inclut l heure.
// Au-dela : juste la duree relative.
// =============================================================================

const MS_PER_DAY = 86_400_000;

function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear()
    && a.getMonth() === b.getMonth()
    && a.getDate() === b.getDate()
  );
}

function formatTime(d: Date): string {
  return d.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
}

export function formatRelative(input: string | Date | null | undefined, ref: Date = new Date()): string {
  if (!input) return "—";
  const d = input instanceof Date ? input : new Date(input);
  if (Number.isNaN(d.getTime())) return "—";

  const today = new Date(ref.getFullYear(), ref.getMonth(), ref.getDate());
  const yesterday = new Date(today.getTime() - MS_PER_DAY);
  const tomorrow = new Date(today.getTime() + MS_PER_DAY);

  if (isSameDay(d, ref)) {
    return `Aujourd'hui à ${formatTime(d)}`;
  }
  if (isSameDay(d, yesterday)) {
    return `Hier à ${formatTime(d)}`;
  }
  if (isSameDay(d, tomorrow)) {
    return `Demain à ${formatTime(d)}`;
  }

  const diffDays = Math.floor((d.getTime() - ref.getTime()) / MS_PER_DAY);

  // Futur (>1j)
  if (diffDays > 1) {
    if (diffDays < 7) return `Dans ${diffDays} jours`;
    if (diffDays < 30) {
      const weeks = Math.floor(diffDays / 7);
      return `Dans ${weeks} semaine${weeks > 1 ? "s" : ""}`;
    }
    if (diffDays < 365) {
      const months = Math.floor(diffDays / 30);
      return `Dans ${months} mois`;
    }
    const years = Math.floor(diffDays / 365);
    return `Dans ${years} an${years > 1 ? "s" : ""}`;
  }

  // Passe (<-1j)
  const ago = Math.abs(diffDays);
  if (ago < 7) return `Il y a ${ago} jour${ago > 1 ? "s" : ""}`;
  if (ago < 30) {
    const weeks = Math.floor(ago / 7);
    return `Il y a ${weeks} semaine${weeks > 1 ? "s" : ""}`;
  }
  if (ago < 365) {
    const months = Math.floor(ago / 30);
    return `Il y a ${months} mois`;
  }
  const years = Math.floor(ago / 365);
  return `Il y a ${years} an${years > 1 ? "s" : ""}`;
}

/** Variante compacte pour cards / chips (ex: "Aujourd'hui", "Hier", "Il y a 3j"). */
export function formatRelativeShort(input: string | Date | null | undefined, ref: Date = new Date()): string {
  if (!input) return "—";
  const d = input instanceof Date ? input : new Date(input);
  if (Number.isNaN(d.getTime())) return "—";

  const today = new Date(ref.getFullYear(), ref.getMonth(), ref.getDate());
  const yesterday = new Date(today.getTime() - MS_PER_DAY);
  const tomorrow = new Date(today.getTime() + MS_PER_DAY);

  if (isSameDay(d, ref)) return "Aujourd'hui";
  if (isSameDay(d, yesterday)) return "Hier";
  if (isSameDay(d, tomorrow)) return "Demain";

  const diffDays = Math.floor((d.getTime() - ref.getTime()) / MS_PER_DAY);
  if (diffDays > 1) {
    if (diffDays < 7) return `Dans ${diffDays}j`;
    if (diffDays < 30) return `Dans ${Math.floor(diffDays / 7)}sem`;
    if (diffDays < 365) return `Dans ${Math.floor(diffDays / 30)} mois`;
    return `Dans ${Math.floor(diffDays / 365)}an${Math.floor(diffDays / 365) > 1 ? "s" : ""}`;
  }
  const ago = Math.abs(diffDays);
  if (ago < 7) return `Il y a ${ago}j`;
  if (ago < 30) return `Il y a ${Math.floor(ago / 7)}sem`;
  if (ago < 365) return `Il y a ${Math.floor(ago / 30)} mois`;
  return `Il y a ${Math.floor(ago / 365)}an${Math.floor(ago / 365) > 1 ? "s" : ""}`;
}
