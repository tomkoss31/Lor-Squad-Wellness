// Médaillon L✦S — gradient radial 3D effect.
// 2 tailles : "lg" 78px (header) / "sm" 38px (footer).

interface Props {
  size?: "lg" | "sm";
  text?: string;
}

export function CharterMedallion({ size = "lg", text = "L✦S" }: Props) {
  const px = size === "lg" ? 78 : 38;
  const fontSize = size === "lg" ? 22 : 11;
  const letterSpacing = size === "lg" ? 1.5 : 0.5;
  const innerInset = size === "lg" ? 4 : 3;

  return (
    <div
      style={{
        width: px,
        height: px,
        borderRadius: "50%",
        margin: size === "lg" ? "0 auto 22px" : 0,
        background:
          "radial-gradient(circle at 32% 28%, #FFF4D4 0%, #F5DEB3 18%, #B8922A 50%, #8B6F1F 85%, #5A4612 100%)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontFamily: "'Cinzel', serif",
        fontSize,
        color: "#FFF8E0",
        fontWeight: 700,
        letterSpacing,
        boxShadow:
          size === "lg"
            ? "inset 0 -3px 6px rgba(90, 70, 18, 0.5), inset 0 3px 6px rgba(255, 244, 212, 0.4), inset 0 0 0 2px rgba(184, 146, 42, 0.6), 0 6px 18px rgba(184, 146, 42, 0.4), 0 2px 4px rgba(0,0,0,0.2)"
            : "inset 0 -2px 3px rgba(90, 70, 18, 0.4), inset 0 2px 2px rgba(255, 244, 212, 0.35), 0 2px 6px rgba(184, 146, 42, 0.35)",
        textShadow: "0 1px 2px rgba(90, 70, 18, 0.6), 0 -1px 0 rgba(255, 244, 212, 0.3)",
        position: "relative",
        flexShrink: 0,
      }}
      aria-hidden="true"
    >
      {text}
      <span
        style={{
          position: "absolute",
          inset: innerInset,
          borderRadius: "50%",
          border: "1px solid rgba(255, 244, 212, 0.4)",
          pointerEvents: "none",
        }}
      />
    </div>
  );
}
