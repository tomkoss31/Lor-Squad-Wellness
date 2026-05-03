// Watermark feuille Herbalife filigrane (rotation 15°).

export function CharterLeafWatermark() {
  return (
    <svg
      viewBox="0 0 200 240"
      style={{
        position: "absolute",
        bottom: 70,
        right: 50,
        width: 180,
        opacity: 0.05,
        zIndex: 0,
        transform: "rotate(15deg)",
        pointerEvents: "none",
      }}
      aria-hidden="true"
    >
      <defs>
        <linearGradient id="charter-leaf-grad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#B8922A" />
          <stop offset="100%" stopColor="#EFD18A" />
        </linearGradient>
      </defs>
      <path
        d="M 100 20 Q 50 80 60 150 Q 90 130 100 130 Q 110 130 140 150 Q 150 80 100 20 Z"
        fill="url(#charter-leaf-grad)"
        opacity="0.7"
      />
      <path
        d="M 100 80 Q 80 130 100 220"
        stroke="url(#charter-leaf-grad)"
        strokeWidth="1.5"
        fill="none"
        opacity="0.7"
      />
      <path
        d="M 100 110 Q 95 180 100 220"
        stroke="url(#charter-leaf-grad)"
        strokeWidth="0.8"
        fill="none"
        opacity="0.4"
      />
    </svg>
  );
}
