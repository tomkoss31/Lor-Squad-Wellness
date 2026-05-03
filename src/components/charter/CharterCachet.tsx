// Cachet rond rotated -12° "★ LOR'SQUAD ★ 🌿 WELLNESS YYYY".
// Année dynamique = current year.

export function CharterCachet() {
  const year = new Date().getFullYear();
  return (
    <div
      style={{
        position: "absolute",
        bottom: 80,
        left: 70,
        width: 95,
        height: 95,
        border: "2px solid #B8922A",
        borderRadius: "50%",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        textAlign: "center",
        transform: "rotate(-12deg)",
        fontFamily: "'Cinzel', serif",
        color: "#8B6F1F",
        zIndex: 4,
        background: "rgba(251, 247, 233, 0.4)",
        opacity: 0.85,
        boxShadow:
          "inset 0 0 0 5px rgba(251, 247, 233, 0.6), inset 0 0 0 6px #B8922A",
      }}
      aria-hidden="true"
    >
      <div style={{ fontSize: 7, letterSpacing: 2, fontWeight: 700, marginTop: 8 }}>
        ★ LOR&apos;SQUAD ★
      </div>
      <div style={{ fontSize: 26, margin: "2px 0", filter: "sepia(0.3)" }}>🌿</div>
      <div style={{ fontSize: 7, letterSpacing: 2, fontWeight: 700, marginBottom: 8 }}>
        WELLNESS {year}
      </div>
    </div>
  );
}
