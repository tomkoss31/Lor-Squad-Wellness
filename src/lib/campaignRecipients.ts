// =============================================================================
// campaignRecipients — parse d'une liste collée / CSV en destinataires.
// Chantier Campagnes, étape 3 (2026-08).
//
// Entrée : le texte brut collé par l'admin (export Meta Ads, Excel copié, une
// adresse par ligne…). On veut être TOLÉRANT : virgule / point-virgule / tab,
// avec ou sans ligne d'en-tête, colonnes dans n'importe quel ordre.
//
// Sortie : la liste dédupliquée {email, firstName} + un récap chiffré
// (importées / doublons / invalides) pour l'écran d'aperçu de la maquette.
// L'exclusion des désabonnés (email_suppressions) se fait APRÈS, côté page,
// car elle demande la base — ici on reste pur et testable.
// =============================================================================

export interface ParsedRecipient {
  email: string;
  firstName: string | null;
}

export interface ParseResult {
  recipients: ParsedRecipient[];
  totalLines: number; // lignes de données non vides rencontrées
  duplicates: number; // doublons d'email retirés
  invalid: number; // lignes sans email valide
  hasFirstName: boolean; // au moins un prénom détecté → perso possible
}

// Validation simple et robuste (pas de RFC complète : on veut juste écarter le
// bruit évident, Resend rejettera le reste). Pas d'espace, un @, un point après.
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function isEmail(s: string): boolean {
  return EMAIL_RE.test(s);
}

// En-têtes reconnus pour la colonne prénom (accents/casse ignorés).
const FIRSTNAME_HEADERS = new Set(["prenom", "prénom", "firstname", "first_name", "first name", "nom"]);
const EMAIL_HEADERS = new Set(["email", "e-mail", "courriel", "mail", "adresse", "adresse email"]);

function norm(s: string): string {
  return s.trim().toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
}

function splitCells(line: string): string[] {
  // délimiteur = le plus fréquent parmi ; , tab. Défaut : la ligne entière.
  const counts: Record<string, number> = {
    ";": (line.match(/;/g) || []).length,
    ",": (line.match(/,/g) || []).length,
    "\t": (line.match(/\t/g) || []).length,
  };
  const delim = Object.entries(counts).sort((a, b) => b[1] - a[1])[0];
  if (!delim || delim[1] === 0) return [line.trim()];
  return line.split(delim[0]).map((c) => c.trim().replace(/^["']|["']$/g, ""));
}

/**
 * Parse le texte collé en destinataires dédupliqués.
 * Détecte une éventuelle ligne d'en-tête pour repérer les colonnes email/prénom ;
 * sinon, cherche l'email dans n'importe quelle cellule et prend la 1re autre
 * cellule non-email comme prénom probable.
 */
export function parseRecipients(raw: string): ParseResult {
  const lines = raw
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  if (lines.length === 0) {
    return { recipients: [], totalLines: 0, duplicates: 0, invalid: 0, hasFirstName: false };
  }

  // Détection d'en-tête : la 1re ligne ne contient pas d'email ET contient un
  // libellé connu.
  const firstCells = splitCells(lines[0]).map(norm);
  const firstHasEmail = splitCells(lines[0]).some(isEmail);
  const looksLikeHeader =
    !firstHasEmail && firstCells.some((c) => EMAIL_HEADERS.has(c) || FIRSTNAME_HEADERS.has(c));

  let emailIdx = -1;
  let nameIdx = -1;
  let dataLines = lines;

  if (looksLikeHeader) {
    firstCells.forEach((c, i) => {
      if (emailIdx === -1 && EMAIL_HEADERS.has(c)) emailIdx = i;
      if (nameIdx === -1 && FIRSTNAME_HEADERS.has(c)) nameIdx = i;
    });
    dataLines = lines.slice(1);
  }

  const seen = new Set<string>();
  const recipients: ParsedRecipient[] = [];
  let duplicates = 0;
  let invalid = 0;
  let totalLines = 0;
  let hasFirstName = false;

  for (const line of dataLines) {
    totalLines++;
    const cells = splitCells(line);

    // email : par colonne d'en-tête si connue, sinon 1re cellule qui ressemble.
    let email = "";
    if (emailIdx >= 0 && cells[emailIdx] && isEmail(cells[emailIdx])) {
      email = cells[emailIdx];
    } else {
      email = cells.find(isEmail) ?? "";
    }
    email = email.trim().toLowerCase();

    if (!isEmail(email)) {
      invalid++;
      continue;
    }

    // prénom : colonne d'en-tête si connue, sinon 1re cellule non-email non vide.
    let firstName: string | null = null;
    if (nameIdx >= 0 && cells[nameIdx]) {
      firstName = cells[nameIdx].trim() || null;
    } else if (cells.length > 1) {
      const cand = cells.find((c) => c && !isEmail(c));
      firstName = cand ? cand.trim() : null;
    }
    if (firstName) {
      // Capitalise proprement (« marie » → « Marie ») sans casser « Jean-Luc ».
      firstName = firstName.replace(/(^|[\s-])([a-zà-ÿ])/g, (_, sep, ch) => sep + ch.toUpperCase());
      hasFirstName = true;
    }

    if (seen.has(email)) {
      duplicates++;
      continue;
    }
    seen.add(email);
    recipients.push({ email, firstName });
  }

  return { recipients, totalLines, duplicates, invalid, hasFirstName };
}
