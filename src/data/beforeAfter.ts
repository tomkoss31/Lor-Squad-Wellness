// =============================================================================
// Résultats avant / après de la boutique HL SKIN (section « Résultats réels »).
//
// ⚠️ POUR AJOUTER QUELQU'UN : déposer le visuel dans public/hlskin/avant-apres/
// (WebP, largeur 1000 px max) puis ajouter une entrée ici. C'est le SEUL fichier
// à toucher — le composant s'adapte tout seul.
//
// ⚠️ RÈGLE DE RÉDACTION (compliance cosmétique — Règlement CE 1223/2009) :
// un cosmétique ne peut PAS revendiquer de soigner une pathologie. Ne jamais
// écrire « rosacée », « acné », « micro-kystes », « eczéma », ni promettre un
// traitement. On décrit l'APPARENCE : rougeurs, teint irrégulier, excès de
// sébum, ridules moins marquées. Les témoignages d'origine mentionnant une
// pathologie ont été reformulés avec l'accord de Thomas (2026-08-11).
//
// ⚠️ Les visuels sont hétérogènes par nature (2 ou 3 panneaux, ratios de 0,60
// à 1,48, certains avec des libellés déjà incrustés). Ils sont donc affichés
// dans leur ratio d'origine, JAMAIS recadrés, et sans étiquette ajoutée.
// =============================================================================

export type BeforeAfterEntry = {
  /** Nom du fichier dans public/hlskin/avant-apres/ (sans .webp). */
  slug: string;
  name: string;
  /** Durée écoulée entre les deux photos (pastille sur le visuel). */
  when: string;
  /** Âge, si la personne l'a mentionné — renforce la preuve. */
  age?: string;
  /** Ce sur quoi elle voulait progresser (vocabulaire cosmétique uniquement). */
  concern: string;
  /** Produit préféré cité. */
  fav: string;
  /** Témoignage à la 1re personne. Absent = carte « visuel seul ». */
  quote?: string;
};

export const BEFORE_AFTER: BeforeAfterEntry[] = [
  {
    slug: "audrey",
    name: "Audrey",
    when: "1 semaine",
    concern: "Rougeurs & tiraillements",
    fav: "Toute la gamme",
    quote:
      "Je n'ai jamais été la fille la plus assidue pour prendre soin de ma peau. J'avais des rougeurs, des tiraillements, des petits boutons de sécheresse. J'ai testé plein de marques, souvent c'était pire. Une semaine plus tard : moins de rougeurs, moins de tiraillements, une peau plus lumineuse et plus douce. Et surtout, zéro maquillage.",
  },
  {
    slug: "vicka",
    name: "Vicka",
    when: "3 semaines",
    concern: "Teint irrégulier",
    fav: "Routine visage",
    quote:
      "Je n'ai jamais été à l'aise avec ma peau au naturel. Entre les rougeurs et mon teint irrégulier, c'était un vrai complexe. Depuis 3 semaines, ma peau est plus douce, plus lumineuse, plus apaisée. Je commence à me sentir plus à l'aise sans fond de teint.",
  },
  {
    slug: "audrey-b",
    name: "Audrey B.",
    when: "1 mois",
    age: "36 ans",
    concern: "Rougeurs",
    fav: "Crème Tension Ultime",
    quote:
      "Avant, c'était gel nettoyant et crème de jour, sans vraie régularité. J'avais des rougeurs que je camouflais systématiquement sous une BB crème. Sur les 15 derniers jours je ne l'ai plus mise, uniquement la routine — et comme le résultat s'améliorait, je ne la mets plus du tout. Bref, je suis refaite !",
  },
  {
    slug: "sophie",
    name: "Sophie",
    when: "2 semaines",
    age: "49 ans",
    concern: "Excès de sébum",
    fav: "Sérum Niacinamide",
    quote:
      "J'ai toujours eu des excès de sébum, surtout au niveau du menton. En 2 semaines avec cette gamme, le sérum a fait toute la différence : j'ai un teint beaucoup plus net et une peau lisse comme jamais je n'ai connu. Ces produits seront à vie dans ma vie, matin et soir.",
  },
  {
    slug: "lydie",
    name: "Lydie",
    when: "4 semaines",
    age: "45 ans",
    concern: "Fermeté & éclat",
    fav: "Sérum Niacinamide",
    quote:
      "À 45 ans, je redécouvre ma peau. Mon produit préféré, c'est le sérum à la niacinamide : mon front est visiblement plus lisse, les ridules sont beaucoup moins marquées. Et tout le monde me le dit !",
  },
  {
    slug: "nicia",
    name: "Nicia",
    when: "21 jours",
    age: "41 ans",
    concern: "Aucune routine",
    fav: "Masque à la menthe",
    quote:
      "À 41 ans, ma routine était inexistante : je me démaquillais sous la douche avec un gel exfoliant, puis une crème de nuit prise au hasard en supermarché. J'étais perdue. Mon produit préféré c'est le masque à la menthe — la texture est magique et l'odeur, un pur bonheur. Aujourd'hui je prends du plaisir avec mes produits.",
  },
  {
    slug: "jessica",
    name: "Jessica",
    when: "21 jours",
    concern: "Contour des yeux",
    fav: "Contour des yeux nourrissant",
    quote:
      "Avant, c'était crème de jour et de nuit Clarins, avec un contour des yeux d'une marque bio. Mon produit préféré, c'est la crème nourrissante contour des yeux : je vois directement la différence et elle est super pratique à appliquer. L'avant / après parle beaucoup en seulement 21 jours. Maintenant c'est une vraie routine, et surtout un réel plaisir dès le matin.",
  },
  {
    slug: "yannick",
    name: "Yannick",
    when: "moins d'un mois",
    age: "58 ans",
    concern: "Hydratation & contour des yeux",
    fav: "Contour des yeux",
    quote:
      "Je pensais que les produits que j'utilisais hydrataient suffisamment ma peau, surtout au niveau des yeux. Cette gamme m'a démontré le contraire. Il y a moins d'un mois entre les deux photos, je reste bluffé encore aujourd'hui.",
  },
  // Cartes « visuel seul » : pas de témoignage à la 1re personne fourni.
  {
    slug: "celine",
    name: "Céline",
    when: "21 jours",
    concern: "Éclat du teint",
    fav: "La nouvelle gamme",
  },
  {
    slug: "guillaume",
    name: "Guillaume",
    when: "21 jours",
    concern: "Routine masculine",
    fav: "La nouvelle gamme",
  },
  {
    slug: "marine",
    name: "Marine",
    when: "21 jours",
    concern: "Éclat du teint",
    fav: "La nouvelle gamme",
  },
];
