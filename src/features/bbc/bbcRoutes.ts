// =============================================================================
// En mode BBC, c'est l'ADRESSE qui décide (17/09/2026).
//
// LE BUG (carte de l'app, section CRM) : `BbcApp` remplaçait tout l'écran SANS
// jamais regarder l'URL. Or dix fonctions serveur envoient des notifications qui
// pointent vers `/crm…` (nouveau lead, rendez-vous pris, paiement reçu, relance
// à faire) : pour Thomas, Mélanie et Romane — BBC par défaut — le clic ouvrait
// « Ce matin », jamais le lead. Pareil pour `/clients/…`, `/encaissement`,
// `/suivis-du-jour`.
//
// LA RÈGLE : BBC sert ce qu'il SAIT servir, et cède la place à l'app standard
// pour tout le reste. Pas de drapeau, pas d'état caché : une adresse donne
// toujours le même écran.
//   · `/`, `/co-pilote`            → BBC · Ce matin
//   · `/agenda…`                   → BBC · L'agenda (le même que dans le standard)
//   · `/messages`, `/messagerie/…` → BBC · Messages
//   · tout le reste                → l'app standard (le CRM, une fiche client…)
//
// Conséquence voulue : depuis le standard, « Co-pilote », « Agenda » et
// « Messagerie » ramènent au club ; « CRM » et « Dossiers clients » restent dans
// le standard. Le bouton BBC, lui, ramène toujours à `/co-pilote`.
// =============================================================================

export type VueBbcParAdresse = "cockpit" | "agenda" | "messages";

/** La vue de BBC qui sert cette adresse — `null` = BBC cède la place au standard. */
export function vueBbcPourAdresse(pathname: string): VueBbcParAdresse | null {
  const p = (pathname || "/").replace(/\/+$/, "") || "/";
  if (p === "/" || p === "/co-pilote" || p === "/dashboard") return "cockpit";
  if (p === "/agenda" || p.startsWith("/agenda/")) return "agenda";
  if (p === "/messages" || p.startsWith("/messages/") || p.startsWith("/messagerie/")) return "messages";
  return null;
}

/** L'adresse où ramène le bouton « BBC » depuis l'app standard. */
export const ADRESSE_ACCUEIL_BBC = "/co-pilote";
