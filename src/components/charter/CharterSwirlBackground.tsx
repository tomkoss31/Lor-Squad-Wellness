// Tornades dorées filigrane (background) — 2 swirls SVG.

export function CharterSwirlBackground() {
  return (
    <>
      {/* Swirl principal top-right */}
      <svg
        viewBox="0 0 1100 1100"
        style={{
          position: "absolute",
          width: 1100,
          height: 1100,
          top: -350,
          right: -350,
          opacity: 0.07,
          pointerEvents: "none",
          zIndex: 0,
        }}
        aria-hidden="true"
      >
        <defs>
          <linearGradient id="charter-swirl-main" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#B8922A" />
            <stop offset="50%" stopColor="#EFD18A" />
            <stop offset="100%" stopColor="#8B6F1F" />
          </linearGradient>
        </defs>
        <g stroke="url(#charter-swirl-main)" fill="none">
          <path d="M 550 100 Q 850 250 880 550 Q 850 850 550 1000 Q 250 850 220 550 Q 250 250 550 100" strokeWidth="2.5" />
          <path d="M 550 160 Q 800 290 825 550 Q 800 810 550 940 Q 300 810 275 550 Q 300 290 550 160" strokeWidth="1.8" />
          <path d="M 550 220 Q 750 320 775 550 Q 750 780 550 880 Q 350 780 325 550 Q 350 320 550 220" strokeWidth="1.4" />
          <path d="M 550 280 Q 700 360 725 550 Q 700 740 550 820 Q 400 740 375 550 Q 400 360 550 280" strokeWidth="1" />
          <path d="M 550 340 Q 650 400 675 550 Q 650 700 550 760 Q 450 700 425 550 Q 450 400 550 340" strokeWidth="0.7" />
          <path d="M 100 100 Q 300 200 500 100" strokeWidth="1.5" />
          <path d="M 700 100 Q 900 200 1050 100" strokeWidth="1.5" />
        </g>
      </svg>

      {/* Swirl secondaire bottom-left */}
      <svg
        viewBox="0 0 800 800"
        style={{
          position: "absolute",
          width: 800,
          height: 800,
          bottom: -250,
          left: -250,
          opacity: 0.05,
          pointerEvents: "none",
          zIndex: 0,
        }}
        aria-hidden="true"
      >
        <defs>
          <linearGradient id="charter-swirl-2" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#B8922A" />
            <stop offset="100%" stopColor="#EFD18A" />
          </linearGradient>
        </defs>
        <g stroke="url(#charter-swirl-2)" fill="none">
          <path d="M 400 100 Q 600 250 600 400 Q 600 550 400 700 Q 200 550 200 400 Q 200 250 400 100" strokeWidth="2" />
          <path d="M 400 160 Q 560 290 560 400 Q 560 510 400 640 Q 240 510 240 400 Q 240 290 400 160" strokeWidth="1.4" />
          <path d="M 400 220 Q 520 320 520 400 Q 520 480 400 580 Q 280 480 280 400 Q 280 320 400 220" strokeWidth="1" />
        </g>
      </svg>
    </>
  );
}
