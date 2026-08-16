// =============================================================================
// agendaLien — mettre un rendez-vous du CRM dans l'agenda personnel du coach.
//
// ⚠️ LE POINT À NE PAS SE RACONTER : rien ne synchronise La Base 360 avec Google
// Agenda. Un rendez-vous réservé sur le site du club vit dans `rdv_bookings` et
// nulle part ailleurs. La maquette proposait « Voir dans Google Agenda » — ce
// bouton aurait menti : il n'y a rien à y voir tant que personne ne l'y a mis.
//
// Donc on propose « Ajouter à mon agenda », et c'est exactement ce que ça fait :
// un lien de création d'événement pré-rempli. Le coach reste maître de son
// agenda, et la phrase à l'écran décrit le geste réel.
//
// Google d'abord (c'est ce qu'utilise l'équipe), en UTC — le format Google veut
// un instant absolu, et le club vit à Paris avec deux changements d'heure par
// an. Passer une heure locale sans fuseau décalerait la moitié de l'année.
// =============================================================================

/** `2026-08-21T09:00:00+02:00` → `20260821T070000Z`. */
export function horodatageGoogle(iso: string): string | null {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
}

export interface RdvPourAgenda {
  slotStart: string;
  slotEnd?: string | null;
}

/** Durée retenue quand la fin n'est pas connue. Un bilan dure une heure. */
const DUREE_PAR_DEFAUT_MS = 60 * 60 * 1000;

/**
 * Le lien de création d'événement, ou `null` si la date est inexploitable —
 * un bouton qui mène à un formulaire vide vaut moins que pas de bouton.
 */
export function lienGoogleAgenda(
  rdv: RdvPourAgenda | null | undefined,
  opts: { titre: string; details?: string; lieu?: string },
): string | null {
  if (!rdv) return null;
  const debut = new Date(rdv.slotStart);
  if (Number.isNaN(debut.getTime())) return null;

  const finMs = rdv.slotEnd ? new Date(rdv.slotEnd).getTime() : NaN;
  // Une fin absente, illisible, ou antérieure au début : on repart du début.
  const fin =
    Number.isNaN(finMs) || finMs <= debut.getTime()
      ? new Date(debut.getTime() + DUREE_PAR_DEFAUT_MS)
      : new Date(finMs);

  const d1 = horodatageGoogle(debut.toISOString());
  const d2 = horodatageGoogle(fin.toISOString());
  if (!d1 || !d2) return null;

  const p = new URLSearchParams({
    action: "TEMPLATE",
    text: opts.titre,
    dates: `${d1}/${d2}`,
  });
  if (opts.details) p.set("details", opts.details);
  if (opts.lieu) p.set("location", opts.lieu);
  return `https://calendar.google.com/calendar/render?${p.toString()}`;
}
