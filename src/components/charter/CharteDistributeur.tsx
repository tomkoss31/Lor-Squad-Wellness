// =============================================================================
// CharteDistributeur — routeur entre les 3 templates (2026-05-03)
//
// Selon la prop `template`, route vers le sous-composant correspondant :
//   - 'officielle' (default) : CharterOfficielle (A4 paper crème classique)
//   - 'manifeste'            : CharterManifeste  (A4 paper, serment poétique)
//   - 'story'                : CharterStory      (9:16 dark luxury)
//
// Toutes les data passent identiques (distributeur / cosigner / pourquoi /
// objectif / mode / callbacks). Seul le rendu change. Le user choisit son
// template via CharterTemplateSelector dans la page /charte (commit 3).
// =============================================================================

import { forwardRef, lazy, Suspense } from "react";
import type {
  CharterDisplayMode,
  CharterPersonInfo,
  CharterTemplate,
} from "../../types/charter";

// Lazy load pour éviter de charger les 3 SVG sets en même temps.
const CharterOfficielle = lazy(() =>
  import("./CharterOfficielle").then((m) => ({ default: m.CharterOfficielle })),
);
const CharterManifeste = lazy(() =>
  import("./CharterManifeste").then((m) => ({ default: m.CharterManifeste })),
);
const CharterStory = lazy(() =>
  import("./CharterStory").then((m) => ({ default: m.CharterStory })),
);

interface Props {
  distributeur: CharterPersonInfo;
  cosigner: CharterPersonInfo;
  pourquoiText?: string;
  objectif12Mois?: string;
  documentDate?: Date;
  mode: CharterDisplayMode;
  template?: CharterTemplate;
  onPourquoiChange?: (v: string) => void;
  onObjectifChange?: (v: string) => void;
  onSignClick?: () => void;
  onCosignClick?: () => void;
}

export const CharteDistributeur = forwardRef<HTMLDivElement, Props>(
  function CharteDistributeur({ template = "officielle", ...rest }, ref) {
    return (
      <Suspense fallback={<CharterLoading />}>
        {template === "manifeste" ? (
          <CharterManifeste ref={ref} {...rest} />
        ) : template === "story" ? (
          <CharterStory ref={ref} {...rest} />
        ) : (
          <CharterOfficielle ref={ref} {...rest} />
        )}
      </Suspense>
    );
  },
);

function CharterLoading() {
  return (
    <div
      style={{
        width: "100%",
        maxWidth: 794,
        minHeight: 400,
        margin: "0 auto",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        color: "rgba(245, 222, 179, 0.5)",
        fontFamily: "'Cinzel', serif",
        fontSize: 12,
        letterSpacing: 3,
      }}
    >
      ✦ Chargement…
    </div>
  );
}
