// Chantier Module Mensurations (2026-04-24).
// 10 zones de mesure avec position SVG (180x380), guides how-to et
// erreurs courantes. Utilisé par SilhouetteSvg + MeasurementGuideModal.

export type MeasurementKey =
  | "neck"
  | "chest"
  | "waist"
  | "hips"
  | "thigh_left"
  | "thigh_right"
  | "arm_left"
  | "arm_right"
  | "calf_left"
  | "calf_right";

export interface MeasurementGuide {
  key: MeasurementKey;
  label: string;
  shortLabel: string;
  zone: "head" | "torso" | "legs" | "arms";
  view: "face" | "back" | "both";
  /** Position sur silhouette 180x400 (face). Miroir auto pour back. */
  position: { x: number; y: number };
  howToMeasure: string[];
  commonMistakes: string[];
  orientation: "horizontal" | "vertical";
}

export const MEASUREMENT_GUIDES: MeasurementGuide[] = [
  {
    key: "neck",
    label: "Tour de cou",
    shortLabel: "Cou",
    zone: "head",
    view: "both",
    position: { x: 90, y: 58 },
    orientation: "horizontal",
    howToMeasure: [
      "Place le mètre juste sous la pomme d'Adam",
      "Garde le mètre horizontal, à plat",
      "Ne serre pas — le mètre doit juste toucher la peau",
    ],
    commonMistakes: [
      "Passer le mètre en diagonale",
      "Serrer trop fort",
    ],
  },
  {
    key: "chest",
    label: "Tour de poitrine",
    shortLabel: "Poitrine",
    zone: "torso",
    view: "face",
    position: { x: 90, y: 115 },
    orientation: "horizontal",
    howToMeasure: [
      "Place le mètre à la partie la plus large du buste",
      "Horizontal, passant sous les aisselles",
      "Respire normalement, ne bloque pas l'air",
    ],
    commonMistakes: [
      "Mesurer en inspirant à fond",
      "Mètre trop haut (sur les épaules)",
    ],
  },
  {
    key: "waist",
    label: "Tour de taille",
    shortLabel: "Taille",
    zone: "torso",
    view: "face",
    position: { x: 90, y: 175 },
    orientation: "horizontal",
    howToMeasure: [
      "Mesure à hauteur du nombril",
      "Expire normalement, ne bloque pas ta respiration",
      "Tiens-toi droit, bras le long du corps",
      "Mètre horizontal, juste à plat contre la peau",
    ],
    commonMistakes: [
      "Mesurer en bloquant le ventre",
      "Serrer trop fort",
      "Mesurer trop haut ou trop bas",
    ],
  },
  {
    key: "hips",
    label: "Tour de hanches",
    shortLabel: "Hanches",
    zone: "torso",
    view: "back",
    position: { x: 90, y: 220 },
    orientation: "horizontal",
    howToMeasure: [
      "Place le mètre à la partie la plus large des fesses",
      "Pieds serrés, jambes droites",
      "Mètre bien horizontal, parallèle au sol",
    ],
    commonMistakes: [
      "Mesurer trop haut (au niveau de la taille)",
      "Écarter les jambes",
    ],
  },
  {
    key: "thigh_left",
    label: "Cuisse gauche",
    shortLabel: "Cuisse G.",
    zone: "legs",
    view: "face",
    position: { x: 78, y: 265 },
    orientation: "horizontal",
    howToMeasure: [
      "Mesure au milieu de la cuisse, à environ 25 cm au-dessus du genou",
      "Jambe droite, pied à plat au sol",
      "Mètre horizontal, à plat",
    ],
    commonMistakes: [
      "Plier la jambe",
      "Mesurer trop près du genou ou de l'aine",
    ],
  },
  {
    key: "thigh_right",
    label: "Cuisse droite",
    shortLabel: "Cuisse D.",
    zone: "legs",
    view: "face",
    position: { x: 102, y: 265 },
    orientation: "horizontal",
    howToMeasure: [
      "Mesure au milieu de la cuisse, à environ 25 cm au-dessus du genou",
      "Jambe droite, pied à plat au sol",
      "Mètre horizontal, à plat",
    ],
    commonMistakes: [
      "Plier la jambe",
      "Mesurer trop près du genou ou de l'aine",
    ],
  },
  {
    key: "arm_left",
    label: "Bras gauche",
    shortLabel: "Bras G.",
    zone: "arms",
    view: "face",
    position: { x: 52, y: 140 },
    orientation: "horizontal",
    howToMeasure: [
      "Mesure au milieu du biceps, bras détendu le long du corps",
      "Mètre horizontal autour du bras",
    ],
    commonMistakes: [
      "Contracter le biceps",
      "Mesurer trop près du coude ou de l'épaule",
    ],
  },
  {
    key: "arm_right",
    label: "Bras droit",
    shortLabel: "Bras D.",
    zone: "arms",
    view: "face",
    position: { x: 128, y: 140 },
    orientation: "horizontal",
    howToMeasure: [
      "Mesure au milieu du biceps, bras détendu le long du corps",
      "Mètre horizontal autour du bras",
    ],
    commonMistakes: [
      "Contracter le biceps",
      "Mesurer trop près du coude ou de l'épaule",
    ],
  },
  {
    key: "calf_left",
    label: "Mollet gauche",
    shortLabel: "Mollet G.",
    zone: "legs",
    view: "face",
    position: { x: 80, y: 340 },
    orientation: "horizontal",
    howToMeasure: [
      "Mesure à la partie la plus large du mollet",
      "Jambe droite, pied à plat",
    ],
    commonMistakes: [
      "Contracter le mollet",
      "Mesurer près de la cheville",
    ],
  },
  {
    key: "calf_right",
    label: "Mollet droit",
    shortLabel: "Mollet D.",
    zone: "legs",
    view: "face",
    position: { x: 100, y: 340 },
    orientation: "horizontal",
    howToMeasure: [
      "Mesure à la partie la plus large du mollet",
      "Jambe droite, pied à plat",
    ],
    commonMistakes: [
      "Contracter le mollet",
      "Mesurer près de la cheville",
    ],
  },
];

export const MEASUREMENT_KEYS: MeasurementKey[] = MEASUREMENT_GUIDES.map((g) => g.key);

export function getGuide(key: MeasurementKey): MeasurementGuide {
  const g = MEASUREMENT_GUIDES.find((x) => x.key === key);
  if (!g) throw new Error(`Guide introuvable pour ${key}`);
  return g;
}
