// Chantier Academy pages démo (2026-04-28).
// Banner gold "MODE DÉMO ACADEMY — données fictives" visible en haut
// des pages démo. Style identique au banner du wizard demo dans
// NewAssessmentPage, pour cohérence cross-pages.

interface DemoBannerProps {
  /** Texte custom à afficher (par défaut générique). */
  label?: string;
}

export function DemoBanner({ label }: DemoBannerProps) {
  return (
    <div
      role="note"
      aria-label="Mode démo Academy"
      style={{
        position: "sticky",
        top: 0,
        zIndex: 50,
        background: "linear-gradient(135deg, #FAEEDA, #F0DBB0)",
        color: "#5C3A05",
        border: "1px solid rgba(186,117,23,0.35)",
        padding: "10px 18px",
        borderRadius: 999,
        fontSize: 12,
        fontWeight: 500,
        fontFamily: "DM Sans, sans-serif",
        boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
        margin: "12px auto 16px",
        width: "fit-content",
        maxWidth: "calc(100% - 32px)",
        textAlign: "center",
      }}
    >
      🎓 {label ?? "Mode démo Academy — toutes les données affichées sont fictives, rien n'est sauvegardé"}
    </div>
  );
}
