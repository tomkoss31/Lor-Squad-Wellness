// =============================================================================
// La clé de doublon — « est-ce la même personne ? », une seule fois pour tous.
//
// LE CONSTAT (mesure du 24/08). Le CRM répondait à cette question à TROIS
// endroits, avec trois réponses différentes :
//
//   · le badge ⚠️        `contact.replace(/\D/g,"").slice(-9)`, seuil ≥ 6
//   · le regroupement    `"e:"+contact` si « @ », sinon `"t:"+9 chiffres`, ≥ 8
//   · la boîte d'arrivée `contact.trim().toLowerCase()` — AUCUNE normalisation
//
// Conséquences vécues, chacune vérifiée :
//   1. Dans la boîte d'arrivée, « 06 12 34 56 78 » et « 0612345678 » sont deux
//      personnes. L'ambre « doublon » ne s'allumait que sur une saisie
//      strictement identique — donc presque jamais.
//   2. Le badge ne teste pas la présence d'un « @ » avant d'extraire les
//      chiffres : `sarah123456@gmail.com` devient le « téléphone » `123456`,
//      six chiffres, seuil atteint. Deux inconnus partageant six chiffres dans
//      leur adresse étaient déclarés doublons. Vérifié en base le 24/08 : la
//      mine n'a pas encore explosé (tout le monde a un vrai numéro), mais c'est
//      exactement le bug « Manon Legrand héritait du RDV de Manon PERRIN ».
//
// ── POURQUOI PLUSIEURS CLÉS ET PAS UNE ────────────────────────────────────
// `CrmLead.contact` vaut `phone || email` : une personne qui laisse son
// téléphone au club et son e-mail sur le bilan en ligne produit une clé « t:… »
// d'un côté et « e:… » de l'autre — et n'est JAMAIS vue comme un doublon.
// C'est précisément le scénario « deux portes » qu'on veut attraper.
//
// On rend donc TOUTES les clés d'une personne (son numéro ET son adresse), et
// deux fiches sont la même personne dès qu'elles en PARTAGENT une.
//
// ── LA RÈGLE NON NÉGOCIABLE ───────────────────────────────────────────────
// Dans le doute, on ne rapproche pas. Un faux positif fusionne deux inconnus
// et fait disparaître quelqu'un du travail à faire — c'est la leçon écrite
// dans `appariementRdv.ts`, payée en prod. Un faux négatif laisse juste deux
// lignes : le coach le voit et le corrige à la main.
// =============================================================================

/** Ce dont dépend le rapprochement. Structurel : ce module ignore tout du hook. */
export interface Joignable {
  phone?: string | null;
  email?: string | null;
  /** Le champ historique `phone || email`. Utilisé seulement si les deux
   *  au-dessus manquent — une source qui ne les expose pas encore. */
  contact?: string | null;
}

/**
 * Un numéro réduit à ses 9 chiffres significatifs, ou `null`.
 *
 * Un numéro français porte 9 chiffres utiles (le « 0 » ou le « +33 » n'en font
 * pas partie). On exige les 9 : en dessous, on ne sait pas de qui on parle.
 * L'ancien seuil de 6 du badge était assez lâche pour rapprocher des inconnus.
 */
export function normaliserTelephone(valeur: unknown): string | null {
  const brut = String(valeur ?? "");
  // ⚠️ Un texte contenant « @ » est une adresse, pas un numéro. Sans ce test,
  // on fabrique un faux téléphone avec les chiffres d'un e-mail.
  if (brut.includes("@")) return null;
  let chiffres = brut.replace(/\D/g, "");
  chiffres = chiffres.replace(/^0+/, "");        // 0612…  → 612…
  chiffres = chiffres.replace(/^33/, "");         // +33 6… → 6…
  if (chiffres.length < 9) return null;
  return chiffres.slice(-9);
}

/** Une adresse en minuscules, ou `null` si ce n'en est pas une. */
export function normaliserEmail(valeur: unknown): string | null {
  const brut = String(valeur ?? "").trim().toLowerCase();
  // Forme minimale d'une adresse : un « @ », un point après, rien autour de vide.
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(brut)) return null;
  return brut;
}

/**
 * TOUTES les clés d'une personne — son numéro et son adresse.
 *
 * Préfixées (`t:` / `e:`) pour qu'un numéro ne puisse jamais entrer en
 * collision avec une adresse.
 */
export function clesDoublon(p: Joignable): string[] {
  const cles: string[] = [];
  const tel = normaliserTelephone(p.phone) ?? normaliserTelephone(p.contact);
  if (tel) cles.push(`t:${tel}`);
  const mail = normaliserEmail(p.email) ?? normaliserEmail(p.contact);
  if (mail) cles.push(`e:${mail}`);
  return cles;
}

/** Deux fiches sont-elles la même personne ? (au moins une clé en commun) */
export function memePersonne(a: Joignable, b: Joignable): boolean {
  const ca = clesDoublon(a);
  if (ca.length === 0) return false;
  const cb = new Set(clesDoublon(b));
  return ca.some((k) => cb.has(k));
}

/**
 * Regroupe des fiches par personne.
 *
 * ⚠️ Transitif par UNION-FIND, et c'est indispensable : si A partage son
 * téléphone avec B, et B son adresse avec C, alors A, B et C sont la même
 * personne — même si A et C n'ont RIEN en commun. Un simple regroupement par
 * clé les aurait laissés en deux paquets, et le CRM aurait affiché deux lignes
 * pour quelqu'un qu'il venait lui-même de reconnaître.
 */
export function grouperParPersonne<T extends Joignable>(fiches: T[]): T[][] {
  const parent = new Map<number, number>();
  const racine = (i: number): number => {
    let r = i;
    while (parent.get(r) !== r) r = parent.get(r)!;
    // Compression de chemin : garde le coût plat sur de longues chaînes.
    let c = i;
    while (parent.get(c) !== r) { const suivant = parent.get(c)!; parent.set(c, r); c = suivant; }
    return r;
  };
  const unir = (a: number, b: number) => { const ra = racine(a), rb = racine(b); if (ra !== rb) parent.set(rb, ra); };

  fiches.forEach((_, i) => parent.set(i, i));
  const vus = new Map<string, number>();
  fiches.forEach((f, i) => {
    for (const k of clesDoublon(f)) {
      const deja = vus.get(k);
      if (deja === undefined) vus.set(k, i);
      else unir(deja, i);
    }
  });

  const paquets = new Map<number, T[]>();
  fiches.forEach((f, i) => {
    const r = racine(i);
    const p = paquets.get(r);
    if (p) p.push(f); else paquets.set(r, [f]);
  });
  return [...paquets.values()];
}
