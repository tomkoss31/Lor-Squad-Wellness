// Tornade dorée centrée pour Story 9:16 (filigrane derrière contenu).

export function CharterSwirlStory() {
  return (
    <svg
      viewBox="0 0 800 800"
      style={{
        position: "absolute",
        width: 800,
        height: 800,
        top: "50%",
        left: "50%",
        transform: "translate(-50%, -50%)",
        opacity: 0.1,
        pointerEvents: "none",
        zIndex: 0,
      }}
      aria-hidden="true"
    >
      <defs>
        <linearGradient id="charter-story-swirl" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#B8922A" />
          <stop offset="50%" stopColor="#F5DEB3" />
          <stop offset="100%" stopColor="#8B6F1F" />
        </linearGradient>
      </defs>
      <g stroke="url(#charter-story-swirl)" fill="none">
        <path d="M 400 60 Q 700 220 720 400 Q 700 580 400 740 Q 100 580 80 400 Q 100 220 400 60" strokeWidth="2.5" />
        <path d="M 400 130 Q 660 270 680 400 Q 660 530 400 670 Q 140 530 120 400 Q 140 270 400 130" strokeWidth="1.8" />
        <path d="M 400 200 Q 600 310 620 400 Q 600 490 400 600 Q 200 490 180 400 Q 200 310 400 200" strokeWidth="1.2" />
        <path d="M 400 270 Q 540 350 560 400 Q 540 450 400 530 Q 260 450 240 400 Q 260 350 400 270" strokeWidth="0.8" />
      </g>
    </svg>
  );
}
