// =============================================================================
// CharterStory — template "Story" 9:16 dark luxury (STUB commit 1, full 2/4)
// =============================================================================

import { forwardRef } from "react";
import type {
  CharterDisplayMode,
  CharterPersonInfo,
} from "../../types/charter";

interface Props {
  distributeur: CharterPersonInfo;
  cosigner: CharterPersonInfo;
  pourquoiText?: string;
  objectif12Mois?: string;
  documentDate?: Date;
  mode: CharterDisplayMode;
  onPourquoiChange?: (v: string) => void;
  onObjectifChange?: (v: string) => void;
  onSignClick?: () => void;
  onCosignClick?: () => void;
}

export const CharterStory = forwardRef<HTMLDivElement, Props>(
  function CharterStory(_props, ref) {
    return (
      <div
        ref={ref}
        style={{
          width: "100%",
          maxWidth: 450,
          aspectRatio: "9 / 16",
          margin: "0 auto",
          background:
            "radial-gradient(ellipse at 30% 15%, #2A2014 0%, #1A1410 35%, #0D0906 70%, #050302 100%)",
          borderRadius: 14,
          color: "#FAF6E8",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: "'Cinzel', serif",
          fontSize: 12,
          letterSpacing: 3,
          opacity: 0.5,
        }}
      >
        ✦ STORY (livré commit 2/4) ✦
      </div>
    );
  },
);
