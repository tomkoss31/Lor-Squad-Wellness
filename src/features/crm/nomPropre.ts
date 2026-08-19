// =============================================================================
// nomPropre — écrire le nom des gens correctement, quoi qu'ils aient tapé.
//
// Les formulaires publics ne corrigent rien : la base contient « claire
// dehaese », « Fatiha Lamri zeggar » et « Manon PERRIN ». Depuis que le nom de
// famille est affiché en titre de fiche (16/08), ça se voit — et un prénom en
// minuscule dans un message pré-rempli (« Hello claire ! ») fait négligé.
//
// La règle qui évite de casser les noms bien écrits : on ne retouche QUE les
// mots entièrement en minuscules ou entièrement en majuscules. Un mot qui porte
// déjà une majuscule intérieure — McDonald, O'Brien, d'Artagnan — a été tapé
// avec soin, on n'y touche pas.
// =============================================================================

/** Les particules restent en minuscules — sauf en tête de nom. */
const PARTICULES = new Set(["de", "du", "des", "le", "la", "les", "van", "von", "da", "di", "el"]);

function motPropre(mot: string): string {
  if (!mot) return mot;

  // Un mot entièrement en capitales n'est pas un choix typographique, c'est un
  // formulaire rempli avec la touche majuscule enfoncée : « PERRIN » → « Perrin ».
  const toutEnCapitales = mot === mot.toLocaleUpperCase("fr-FR");
  if (!toutEnCapitales) {
    // On ne préserve une majuscule intérieure que si le mot commence déjà par
    // une majuscule — c'est la signature d'un nom tapé avec soin (McDonald,
    // O'Brien, LeGall). « éGLÉ », lui, commence en bas : c'est une maladresse,
    // pas une intention, et il se normalise comme les autres.
    const commenceParUneMajuscule = /^[A-ZÀ-Þ]/.test(mot);
    const aUneMajusculeInterieure = /[A-ZÀ-Þ]/.test(mot.slice(1));
    if (commenceParUneMajuscule && aUneMajusculeInterieure) return mot;
  }

  const bas = mot.toLocaleLowerCase("fr-FR");
  // Les composés se recomposent morceau par morceau : « jean-marc » →
  // « Jean-Marc », « lamri-zeggar » → « Lamri-Zeggar », « d'artagnan » →
  // « D'Artagnan ».
  return bas.replace(/(^|[-'’])([a-zà-þ])/g, (_, sep: string, lettre: string) =>
    sep + lettre.toLocaleUpperCase("fr-FR"),
  );
}

/**
 * Le nom tel qu'on l'écrit à l'écran. Renvoie la chaîne vide pour une entrée
 * vide — l'appelant décide quoi afficher à la place, ce module n'invente pas
 * de « — ».
 */
export function nomPropre(brut: string | null | undefined): string {
  if (!brut) return "";
  const mots = brut.trim().split(/\s+/);
  return mots
    .map((mot, i) => {
      const bas = mot.toLocaleLowerCase("fr-FR");
      // Une particule garde sa minuscule, sauf si le nom commence par elle.
      if (i > 0 && PARTICULES.has(bas)) return bas;
      return motPropre(mot);
    })
    .join(" ");
}

/**
 * Le nom complet tel qu'on l'affiche : « Claire Dehaese », pas « claire » ni
 * « claire dehaese ». Le prénom seul si on n'a pas le nom, et le repli fourni
 * si on n'a ni l'un ni l'autre.
 *
 * Un seul endroit décide de cette règle — sinon chaque écran réinvente son
 * `${prenom} ${nom}` et l'un d'eux oublie la casse. Mesuré le 19/08 : la base
 * contient « dehaese », « PERRIN », « Lamri zeggar ». Aucune n'est écrite comme
 * on l'écrirait à la main.
 */
export function nomAffiche(
  prenom: string | null | undefined,
  nom: string | null | undefined,
  repli = "Prospect",
): string {
  const p = nomPropre(prenom);
  const n = nomPropre(nom);
  return [p, n].filter(Boolean).join(" ") || repli;
}
