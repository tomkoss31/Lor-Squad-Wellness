// =============================================================================
// « Sa confirmation n'est pas partie » — l'alerte que j'avais perdue.
//
// L'HISTOIRE (21/08, en production) : Ghislaine réserve pour le mardi 25 à
// 10 h. Le même matin, la campagne d'ouverture part à 199 adresses et épuise
// le quota Resend de 100 mails par jour. Trois envois de confirmation tombent
// dans le vide, l'un après l'autre. Ni elle ni les coachs ne reçoivent quoi que
// ce soit, et PERSONNE ne pouvait le savoir : l'information était déjà en base
// (`confirm_email_sent_at` à null), affichée nulle part.
//
// CE QUI S'EST PASSÉ ENSUITE (31/08) : l'alerte vivait dans le pavé des
// rendez-vous. En sortant ce pavé du CRM, je l'ai emportée avec — sans la
// remplacer. Un filet de sécurité retiré en silence, c'est le scénario du
// 21/08 qui redevient possible.
//
// LA RÈGLE, inchangée depuis le premier jour : on n'alerte QUE si la personne
// a laissé une adresse. Quelqu'un venu avec un numéro n'attendait aucun mail —
// lui afficher « sa confirmation n'est pas partie » serait crier au loup.
// C'est le même test que l'edge, qui n'envoie que dans ce cas.
// =============================================================================

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export interface RdvConfirmable {
  id: string;
  first_name: string | null;
  last_name: string | null;
  contact: string | null;
  slot_start: string;
  status: string;
  confirm_email_sent_at: string | null;
}

export interface ConfirmationRatee {
  id: string;
  nom: string;
  email: string;
  slotStart: string;
}

export function estUnEmail(contact: string | null | undefined): boolean {
  return EMAIL_RE.test((contact ?? "").trim());
}

/**
 * Les rendez-vous À VENIR dont la confirmation n'est jamais partie.
 *
 * Bornée aux rendez-vous acceptés (`confirmed`) : une demande encore en
 * attente n'a par définition pas de confirmation à envoyer, et une annulation
 * n'en attend plus. Bornée aussi au futur — prévenir quelqu'un de l'horaire
 * d'un rendez-vous déjà passé n'a plus d'objet.
 */
export function confirmationsRatees(
  bookings: RdvConfirmable[],
  maintenant: Date,
): ConfirmationRatee[] {
  const t = maintenant.getTime();
  return bookings
    .filter((b) => b.status === "confirmed")
    .filter((b) => !b.confirm_email_sent_at)
    .filter((b) => estUnEmail(b.contact))
    .filter((b) => {
      const d = new Date(b.slot_start).getTime();
      return !Number.isNaN(d) && d >= t;
    })
    .map((b) => ({
      id: b.id,
      nom: `${b.first_name ?? ""} ${b.last_name ?? ""}`.trim() || "Sans nom",
      email: (b.contact ?? "").trim(),
      slotStart: b.slot_start,
    }))
    .sort((a, b) => a.slotStart.localeCompare(b.slotStart));
}
