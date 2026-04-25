// Chantier birth_date (2026-04-25).
// Helpers pour calculer l'âge depuis une date de naissance et basculer
// proprement entre legacy `client.age` (DB) et `client.birthDate` (nouveau).

/**
 * Calcule l'âge à partir d'une date de naissance ISO (AAAA-MM-JJ ou ISO 8601).
 * Retourne null si invalide ou absente.
 */
export function calculateAge(birthDate: string | null | undefined): number | null {
  if (!birthDate) return null;
  const birth = new Date(birthDate);
  if (Number.isNaN(birth.getTime())) return null;

  const now = new Date();
  let age = now.getFullYear() - birth.getFullYear();
  const monthDiff = now.getMonth() - birth.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && now.getDate() < birth.getDate())) {
    age--;
  }
  return age >= 0 ? age : null;
}

/**
 * Retourne l'âge effectif d'un client.
 * Priorité : birthDate (calculé dynamiquement) > age (legacy DB).
 */
export function getEffectiveAge(client: {
  birthDate?: string | null;
  age?: number | null;
}): number | null {
  const calculated = calculateAge(client.birthDate);
  if (calculated !== null) return calculated;
  return typeof client.age === "number" ? client.age : null;
}

/**
 * Format français long pour affichage (ex : "12 mai 1985").
 */
export function formatBirthDate(birthDate: string | null | undefined): string {
  if (!birthDate) return "—";
  const d = new Date(birthDate);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

/** Format court "JJ/MM" (utilitaire pour la liste anniversaires). */
export function formatBirthDateShort(birthDate: string | null | undefined): string {
  if (!birthDate) return "";
  const d = new Date(birthDate);
  if (Number.isNaN(d.getTime())) return "";
  return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}`;
}
