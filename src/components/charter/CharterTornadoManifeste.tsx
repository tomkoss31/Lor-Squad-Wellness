// Tornades dorées Manifeste : 1 grosse à droite (ruban + hachures) + 1 plus
// petite à gauche en bas (ovale concentrique).

export function CharterTornadoManifeste() {
  return (
    <>
      {/* Tornade right (ruban + hachures) */}
      <svg
        viewBox="0 0 600 1000"
        preserveAspectRatio="xMidYMid meet"
        style={{
          position: "absolute",
          top: -40,
          right: -180,
          width: 600,
          height: 1000,
          pointerEvents: "none",
          zIndex: 0,
          opacity: 0.65,
        }}
        aria-hidden="true"
      >
        <defs>
          <linearGradient id="charter-manifest-tornado" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#D4A937" />
            <stop offset="50%" stopColor="#F8DDA0" />
            <stop offset="100%" stopColor="#8B6F1F" />
          </linearGradient>
        </defs>
        <path
          d="M 80 50 Q 320 100 440 250 Q 540 380 510 500 Q 470 620 350 700 Q 240 790 320 920 Q 410 1000 530 1010"
          stroke="url(#charter-manifest-tornado)"
          strokeWidth="2.5"
          fill="none"
          opacity="0.85"
        />
        <path
          d="M 110 80 Q 330 130 420 270 Q 510 390 485 510 Q 455 620 360 695 Q 270 770 350 880 Q 430 950 520 980"
          stroke="url(#charter-manifest-tornado)"
          strokeWidth="1.5"
          fill="none"
          opacity="0.55"
        />
        <path
          d="M 140 110 Q 340 160 400 290 Q 480 400 460 510 Q 440 610 370 685 Q 300 750 380 850 Q 450 910 510 950"
          stroke="url(#charter-manifest-tornado)"
          strokeWidth="0.8"
          fill="none"
          opacity="0.35"
        />
        {/* Hachures dorées (ambiance Mark Hughes) */}
        <g stroke="url(#charter-manifest-tornado)" strokeWidth="0.4" fill="none" opacity="0.18">
          <path d="M 200 30 L 600 180" />
          <path d="M 230 60 L 600 210" />
          <path d="M 260 90 L 600 240" />
          <path d="M 290 120 L 600 270" />
          <path d="M 320 150 L 600 300" />
          <path d="M 350 180 L 600 330" />
          <path d="M 380 210 L 600 360" />
          <path d="M 410 240 L 600 390" />
          <path d="M 440 270 L 600 420" />
        </g>
      </svg>

      {/* Tornade left bottom (ovales concentriques) */}
      <svg
        viewBox="0 0 480 600"
        style={{
          position: "absolute",
          bottom: -120,
          left: -180,
          width: 480,
          height: 600,
          pointerEvents: "none",
          zIndex: 0,
          opacity: 0.4,
        }}
        aria-hidden="true"
      >
        <defs>
          <linearGradient id="charter-manifest-tornado-left" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#D4A937" />
            <stop offset="100%" stopColor="#8B6F1F" />
          </linearGradient>
        </defs>
        <g stroke="url(#charter-manifest-tornado-left)" fill="none">
          <path
            d="M 240 50 Q 380 150 400 300 Q 380 450 240 550 Q 100 450 80 300 Q 100 150 240 50"
            strokeWidth="1.5"
            opacity="0.7"
          />
          <path
            d="M 240 100 Q 350 180 370 300 Q 350 420 240 500 Q 130 420 110 300 Q 130 180 240 100"
            strokeWidth="1"
            opacity="0.5"
          />
          <path
            d="M 240 150 Q 320 210 340 300 Q 320 390 240 450 Q 160 390 140 300 Q 160 210 240 150"
            strokeWidth="0.6"
            opacity="0.35"
          />
        </g>
      </svg>
    </>
  );
}
