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
}
