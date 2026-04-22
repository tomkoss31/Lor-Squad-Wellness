// Cleanup post-audit (2026-04-23).
// Helper central pour calculer les initiales d'avatar à partir d'un nom.
// Remplace les appels inline `.split().map(n => n[0]).join()` qui pouvaient
// retourner "undefined" (string literal) sur des noms vides ou absents.

export function getInitials(name: string | null | undefined, fallback = "?"): string {
  if (!name) return fallback;
  const trimmed = name.trim();
  if (!trimmed) return fallback;

  const parts = trimmed.split(/\s+/).filter(Boolean);
  if (parts.length === 0) return fallback;
  if (parts.length === 1) {
    const c = parts[0].charAt(0);
    return c ? c.toUpperCase() : fallback;
  }
  const first = parts[0].charAt(0);
  const last = parts[parts.length - 1].charAt(0);
  return `${first}${last}`.toUpperCase() || fallback;
}
