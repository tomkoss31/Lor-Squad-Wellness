// Chantier Refactor onboarding additif (2026-04-26).
// Types generiques pour TourRunner (Academy + futurs tours coach).
// Le tuto client app existant continue de tourner sur OnboardingTutorial
// sans dependre de ces types.

import type { ReactNode } from "react";

export type TutorialPlacement = "center" | "top" | "bottom";

export interface TutorialStep {
  /** Identifiant unique du step (utile pour debug + cle React). */
  id: string;
  /** CSS selector de la cible spotlight. undefined = modale centree. */
  target?: string;
  /** Placement du popover. Defaut "center" si pas de target, sinon "bottom". */
  placement?: TutorialPlacement;
  /** Titre du popover (Syne 17px dans le pattern actuel). */
  title: string;
  /** Contenu du popover. JSX riche autorise. */
  body: ReactNode;
  /** Pathname requis avant d afficher le step (cross-route). */
  route?: string;
  /** Override du label "Suivant" (ex: "Continuer"). */
  nextLabel?: string;
  /** Affiche "Terminer le tuto 🎉" au lieu de "Suivant". */
  isLast?: boolean;
  /** Hook a l entree du step (ex: open un menu). */
  onEnter?: () => void;
  /** Hook a la sortie du step (ex: close un menu). */
  onExit?: () => void;
  /**
   * Si true, le clic sur le target est INTERCEPTE (preventDefault +
   * stopPropagation) et le tour n avance pas — le user doit utiliser
   * le bouton "Suivant" pour progresser. Utile quand cliquer sur le
   * target naviguerait ailleurs et casserait le tour. Defaut false.
   * Patch 2 (2026-04-26).
   */
  manualAdvance?: boolean;
  /**
   * Builder de route async, prend precedence sur `route` si present.
   * Utile pour construire des routes dynamiques /clients/:id avec un
   * id resolu au moment ou le step devient actif. Vague finale (2026-04-27).
   */
  routeBuilder?: () => Promise<string>;
  /**
   * Ne montrer ce step qu aux users de ce role. Si absent, montre a tous.
   * Travail 2 (2026-04-27) : utile pour la section welcome ou les champs
   * Herbalife/sponsor/coach-referent ne sont visibles qu aux distri.
   */
  requiredRole?: "distributor" | "admin" | "referent";
  /**
   * Cle d illustration SVG inline a afficher au-dessus du titre.
   * Polish C (2026-04-28) : rend les modales center plus engageantes.
   * Voir TutorialIllustration.tsx pour la liste des kinds disponibles.
   */
  illustrationKey?: TutorialIllustrationKind;
  /**
   * Polish G (2026-04-28) : avance auto sur interaction DOM reelle.
   * Si defini, TourRunner ecoute event sur target. Quand declenche
   * (et valueMatch passe si fourni), le tour avance au step suivant.
   * Exemple: advanceOn={ event: "input", valueMatch: ".+" } -> avance
   * des que le user tape quelque chose. Combine avec manualAdvance:
   * input/change ne sont pas interceptes (seul click l est).
   */
  advanceOn?: {
    event: "click" | "input" | "change";
    /** Regex (string) que la valeur doit matcher pour avancer. */
    valueMatch?: string;
    /** Delai apres l evenement avant d avancer. Defaut 600ms (debounce typing). */
    debounceMs?: number;
  };
}

export type TutorialIllustrationKind =
  | "wave"
  | "rocket"
  | "person-card"
  | "calendar-glow"
  | "chat-bubble"
  | "shopping-bag"
  | "phone-pwa"
  | "trophy"
  | "sparkles"
  | "ring-progress"
  | "alert-shield"
  | "qr-share"
  // Polish E (2026-04-28) : mini-screenshots annotes des vrais ecrans
  | "mockup-thank-you"
  | "mockup-program-card"
  | "mockup-agenda-list"
  | "mockup-sport-alerts";
