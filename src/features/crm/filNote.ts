// =============================================================================
// filNote — lire la note d'un lead comme un FIL, et savoir quoi en épingler.
//
// ── CE QUI A DÉCLENCHÉ CE FICHIER (10/09/2026) ──────────────────────────────
// Justine avait répondu à un SMS de relance en revenant sur le site et en
// laissant « Dispos indiquées : Après 16h du lundi au mercredi ». Personne ne
// l'a vu. Un rappel « deuxième SMS sans réponse → APPEL » a été posé pour le
// lendemain sur quelqu'un qui venait de répondre — et ses créneaux (après 16h)
// n'existaient même pas dans l'agenda du club à ce moment-là.
//
// Deux causes cumulées, corrigées ensemble :
//   1. `fusionFiches` JETAIT sa note (cf. le commentaire là-bas) ;
//   2. le volet lead — l'écran ouvert sur CHAQUE lead — n'affichait pas les
//      notes du tout. Seule la fiche pleine les montrait.
//
// ── LA RÈGLE, ET C'EST TOUTE LA LEÇON ───────────────────────────────────────
// On épingle par NATURE, jamais par POSITION. Chez Justine, l'information
// vitale n'était PAS la dernière entrée du journal : c'était la note entière
// d'une fiche annexe. Une règle « montre la dernière ligne » l'aurait ratée.
//
// Et on ne SUPPRIME rien : les trois rangs sont toujours rendus, les traces
// simplement atténuées. Une règle qui choisit quoi montrer choisit aussi quoi
// cacher — c'est exactement ce qui a coûté Justine, on ne le refait pas.
//
// Module pur : aucun import React, testable en isolation.
// =============================================================================

/** Ce qu'une entrée du fil vaut, du plus faible au plus fort. */
export type RangEntree = "trace" | "main" | "parole";

export interface Entree {
  texte: string;
  rang: RangEntree;
}

export interface Fil {
  /** Toutes les entrées, DANS L'ORDRE DU CHAMP. Jamais retriées. */
  entrees: Entree[];
  /** La seule ligne visible au repos. */
  epingle: Entree;
  /** `epingle.texte` mis sur une ligne et coupé à 110 caractères. */
  apercu: string;
  tronque: boolean;
}

/**
 * Les motifs des écritures AUTOMATIQUES dans `notes`.
 *
 * ⚠️ CONTRAT : toute nouvelle écriture automatique dans `notes` — edge
 * function, RPC, script d'ops — ajoute son motif ici. Même statut que la règle
 * « tout insert `client_messages` utilise un type de l'union `domain.ts` » :
 * si on l'oublie, une trace machine peut se retrouver épinglée à la place de
 * la parole d'une personne.
 */
const MOTIFS_TRACE = [
  "lead formulaire meta",
  "arrive automatiquement via make",
  "identifiant meta",
  "numero normalise",
  "prenom douteux",
  "sms de premier contact",
  "expediteur twilio",
  "fusion du",
  "fiche supprimee",
];

/**
 * Ce qui trahit la PAROLE de la personne (par opposition à une décision du
 * coach ou à une trace machine).
 *
 * ⚠️ AUCUN `\d{1,2}h` NU, jamais, même « pour élargir la détection » :
 * « son RDV du 03/09 14h » deviendrait une disponibilité, et on rappellerait
 * à 14 h quelqu'un qui a annulé. Toute reconnaissance d'horaire EXIGE une
 * préposition.
 */
const PAROLE =
  /\b(dispos? indiquees|dispo\w*|joignable|rappelle[- ]moi|(apres|avant|entre|des|jusqu.?a) \d{1,2} ?h|uniquement le|que le (matin|soir|samedi|week))\b/;

/** Pour les TESTS uniquement — jamais pour l'affichage. La base mélange
 *  l'accentué (« Dispos indiquées ») et le non-accentué (« A ANNULE »). */
const norm = (s: string): string =>
  s.toLowerCase().normalize("NFD").replace(/\p{Diacritic}/gu, "");

/** Premier test gagnant. L'ordre est ce qui rend l'ensemble sûr : une trace ne
 *  peut jamais être promue en parole. */
function rangDe(texte: string): RangEntree {
  const n = norm(texte);
  if (MOTIFS_TRACE.some((m) => n.includes(m))) return "trace";
  if (texte.startsWith("🕑") || texte.startsWith("↩︎") || PAROLE.test(n)) return "parole";
  return "main";
}

/** La dernière entrée d'un rang donné, ou `undefined`. */
const derniere = (entrees: Entree[], rang: RangEntree): Entree | undefined => {
  for (let i = entrees.length - 1; i >= 0; i -= 1) if (entrees[i].rang === rang) return entrees[i];
  return undefined;
};

export function filNote(notes: string | null | undefined): Fil | null {
  // Les notes collées depuis Windows portent des CRLF : sans ça, le rendu en
  // `white-space: pre-wrap` afficherait des lignes fantômes.
  const t = (notes ?? "").replace(/\r\n?/g, "\n").trim();
  if (!t) return null;

  // Les trois séparateurs réellement écrits en base, chacun tracé à sa source :
  //   ` | `  l'import Meta, la frappe de Thomas, et la fusion des doublons ;
  //   `\n`   le retour d'un lead sur le site (« ↩︎ Revenu·e le … ») ;
  //   ` · `  UNIQUEMENT devant 🕑 — la RPC des disponibilités. Le lookahead est
  //          obligatoire : sans lui, un « · » de ponctuation couperait une
  //          phrase en deux.
  const morceaux = t
    .split(/\s*\|\s*|\s*\n+\s*|\s+·\s+(?=🕑)/)
    .map((s) => s.trim())
    .filter(Boolean);
  if (!morceaux.length) return null;

  const entrees: Entree[] = morceaux.map((texte) => ({ texte, rang: rangDe(texte) }));

  // ── L'ÉPINGLE, choisie par NATURE ────────────────────────────────────────
  // Une disponibilité redonnée remplace la précédente, d'où « la dernière ».
  // Si personne n'a jamais rien dit, on montre quand même la dernière trace :
  // en encre atténuée, elle dit d'un coup d'œil que le silence est total —
  // mieux qu'une carte vide qui ne dit rien.
  const epingle =
    derniere(entrees, "parole") ?? derniere(entrees, "main") ?? entrees[entrees.length - 1];

  const plat = epingle.texte.replace(/\s+/g, " ");
  const tronque = plat.length > 110;
  // Coupe au dernier espace pour ne pas trancher un mot en deux.
  const apercu = tronque
    ? `${plat.slice(0, 110).replace(/\s+\S*$/, "")}…`
    : plat;

  return { entrees, epingle, apercu, tronque };
}
