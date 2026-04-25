// Chantier birthday block (2026-04-25).
// Helpers pour détecter les anniversaires clients et générer un message
// WhatsApp pré-rempli.

import { calculateAge } from "./age";

/** True si l'anniversaire (jour + mois) tombe aujourd'hui. */
export function isBirthdayToday(birthDate: string | null | undefined): boolean {
  if (!birthDate) return false;
  const birth = new Date(birthDate);
  if (Number.isNaN(birth.getTime())) return false;
  const now = new Date();
  return birth.getDate() === now.getDate() && birth.getMonth() === now.getMonth();
}

/**
 * True si l'anniversaire est dans les `daysAhead` prochains jours
 * (anniversaire à venir cette année OU l'an prochain si déjà passé).
 */
export function isBirthdaySoon(
  birthDate: string | null | undefined,
  daysAhead = 7,
): boolean {
  if (!birthDate) return false;
  const birth = new Date(birthDate);
  if (Number.isNaN(birth.getTime())) return false;

  const now = new Date();
  const thisYearBirthday = new Date(
    now.getFullYear(),
    birth.getMonth(),
    birth.getDate(),
  );
  // Reset à minuit pour éviter "même jour mais déjà passé en heure".
  now.setHours(0, 0, 0, 0);
  thisYearBirthday.setHours(0, 0, 0, 0);

  const target =
    thisYearBirthday.getTime() < now.getTime()
      ? new Date(now.getFullYear() + 1, birth.getMonth(), birth.getDate())
      : thisYearBirthday;

  const diffDays = Math.ceil(
    (target.getTime() - now.getTime()) / (1000 * 60 * 60 * 24),
  );
  return diffDays >= 0 && diffDays <= daysAhead;
}

/** Nombre de jours avant le prochain anniversaire (>= 0). */
export function daysUntilBirthday(birthDate: string | null | undefined): number | null {
  if (!birthDate) return null;
  const birth = new Date(birthDate);
  if (Number.isNaN(birth.getTime())) return null;
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const thisYear = new Date(now.getFullYear(), birth.getMonth(), birth.getDate());
  thisYear.setHours(0, 0, 0, 0);
  const target =
    thisYear.getTime() < now.getTime()
      ? new Date(now.getFullYear() + 1, birth.getMonth(), birth.getDate())
      : thisYear;
  return Math.ceil((target.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
}

/**
 * URL WhatsApp pré-remplie pour souhaiter un anniversaire.
 * Phone : tout caractère non numérique sauf "+" est strippé.
 */
export function buildBirthdayWhatsAppUrl(
  phone: string,
  firstName: string,
  age: number | null,
): string {
  const cleanPhone = (phone ?? "").replace(/[^\d+]/g, "");
  const message = age
    ? `Joyeux anniversaire ${firstName} ! 🎂 ${age} ans aujourd'hui, je te souhaite plein de belles choses pour cette nouvelle année 💪 — Thomas`
    : `Joyeux anniversaire ${firstName} ! 🎂 Je te souhaite plein de belles choses pour cette nouvelle année 💪 — Thomas`;
  return `https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`;
}

/**
 * Calcule l'âge que la personne aura à son prochain anniversaire si
 * `birthDate` est dans le passé. Si l'anniversaire est aujourd'hui :
 * âge actuel (= calculateAge). Si à venir : âge actuel + 1.
 */
export function ageAtNextBirthday(
  birthDate: string | null | undefined,
): number | null {
  const current = calculateAge(birthDate);
  if (current === null) return null;
  if (isBirthdayToday(birthDate)) return current;
  return current + 1;
}
