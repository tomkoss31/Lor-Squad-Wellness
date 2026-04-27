// Chantier Academy direction 1 (2026-04-28).
// Bouton "Mode Présentation Academy" sur la fiche client. Lance le tour
// presentation-client (4 steps + 1 final) via ActiveTourContext.
// Au step final "Voir mon QR code", appelle onShowQr pour ouvrir la
// ClientAccessModal de la fiche en cours.

import { useActiveTour } from "../../onboarding/ActiveTourContext";
import {
  PRESENTATION_CLIENT_TOUR_ID,
  PRESENTATION_CLIENT_STEPS,
} from "../presentationClientSteps";

interface Props {
  onShowQr: () => void;
}

export function PresentationClientButton({ onShowQr }: Props) {
  const { startTour } = useActiveTour();

  return (
    <button
      type="button"
      onClick={() =>
        startTour({
          id: PRESENTATION_CLIENT_TOUR_ID,
          steps: PRESENTATION_CLIENT_STEPS,
          onClose: (reason) => {
            if (reason === "completed") {
              // Fin du tour -> ouvre la modale acces (QR + boutons share)
              // pour que le coach montre le QR au client en RDV.
              onShowQr();
            }
          },
        })
      }
      className="inline-flex min-h-[40px] items-center gap-2 rounded-[12px] px-4 py-2 text-sm font-medium transition"
      style={{
        background: "transparent",
        color: "#7F77DD",
        border: "1px solid rgba(127,119,221,0.4)",
        fontFamily: "DM Sans, sans-serif",
        cursor: "pointer",
      }}
      title="Lance un mini-tour à montrer au client en RDV (1 min)"
    >
      🎓 Mode présentation
    </button>
  );
}
