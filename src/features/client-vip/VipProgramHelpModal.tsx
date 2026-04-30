// =============================================================================
// VipProgramHelpModal — modale d'aide accessible depuis la fiche client
// =============================================================================
//
// Ouvre la doc complète du programme VIP en plein écran (mêmes contenus
// que /parametres > Programme VIP) pour que le coach puisse consulter
// la doc EN CONTEXTE de la fiche client (ex: pendant un RDV pour pitcher
// le programme).
// =============================================================================

import { VipProgramDoc } from "./VipProgramDoc";

interface Props {
  onClose: () => void;
}

export function VipProgramHelpModal({ onClose }: Props) {
  return (
    // eslint-disable-next-line jsx-a11y/click-events-have-key-events -- Backdrop, ESC at dialog level
    <div
      role="dialog"
      aria-modal="true"
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.55)",
        zIndex: 1000,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 16,
        overflowY: "auto",
      }}
      onClick={onClose}
    >
      {/* eslint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-static-element-interactions -- stopPropagation only */}
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: "var(--ls-bg)",
          borderRadius: 16,
          maxWidth: 720,
          width: "100%",
          maxHeight: "90vh",
          overflowY: "auto",
          padding: 20,
          position: "relative",
          boxShadow: "0 20px 60px rgba(0,0,0,0.30)",
        }}
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="Fermer"
          style={{
            position: "sticky",
            top: 0,
            float: "right",
            width: 36,
            height: 36,
            borderRadius: 10,
            background: "var(--ls-surface)",
            border: "0.5px solid var(--ls-border)",
            color: "var(--ls-text)",
            fontSize: 18,
            fontWeight: 700,
            cursor: "pointer",
            zIndex: 2,
          }}
        >
          ✕
        </button>
        <VipProgramDoc />
      </div>
    </div>
  );
}
