// Chantier N (2026-04-26) : message anniversaire pre-rempli + URLs de
// partage WhatsApp / SMS. Style chaleureux casual.

import { calculateAge } from "./age";

export type BirthdayMessageContext = {
  firstName: string;
  birthDate: string | null | undefined;
  coachFirstName: string;
};

/** Message anniversaire pre-rempli (ton casual chaleureux). */
export function buildBirthdayMessage(ctx: BirthdayMessageContext): string {
  const age = calculateAge(ctx.birthDate);
  const ageText = age !== null ? ` ${age} ans aujourd'hui,` : "";
  return `Joyeux anniversaire ${ctx.firstName} ! 🎂🎉${ageText} je te souhaite plein de belles choses pour cette nouvelle annee 💪 — ${ctx.coachFirstName}`;
}

/** URL WhatsApp avec message pre-rempli. */
export function buildBirthdayWhatsAppUrl(phone: string, message: string): string {
  const cleanPhone = phone.replace(/[^\d+]/g, "");
  return `https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`;
}

/** URL SMS (sms: scheme). */
export function buildBirthdaySmsUrl(phone: string, message: string): string {
  const cleanPhone = phone.replace(/[^\d+]/g, "");
  return `sms:${cleanPhone}?&body=${encodeURIComponent(message)}`;
}
