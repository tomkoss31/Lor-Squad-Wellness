// =============================================================================
// AvatarWithRing — avatar + ring streak progressif (2026-05-05)
//
// Cercle SVG autour de l'avatar qui visualise la progression streak du
// distri. Plein doré quand la quête du jour est validée, vide sinon.
//
// Anatomie :
//   - Cercle de fond gris clair (toute la circonférence)
//   - Arc gold (fraction circonférence selon `progress` 0-1)
//   - Avatar gradient gold→coral au centre (ou photo profil si fournie)
// =============================================================================

interface AvatarWithRingProps {
  /** Taille totale du composant (avatar + ring) en px. Défaut 34. */
  size?: number;
  /** Progression streak 0-1 (ex. 0.8 = 80 % de l'anneau gold). */
  progress?: number;
  /** Initiales fallback si pas de photo (max 2 chars). */
  initials?: string;
  /** URL de la photo de profil (optionnel). */
  photoUrl?: string;
  /** Couleur du ring. Défaut gold. */
  ringColor?: string;
}

export function AvatarWithRing({
  size = 34,
  progress = 0.8,
  initials = "T",
  photoUrl,
  ringColor = "#D4A937",
}: AvatarWithRingProps) {
  // Géométrie SVG : cercle de fond + arc progress
  const center = size / 2;
  const radius = (size - 4) / 2; // -4 pour padding ring
  const circumference = 2 * Math.PI * radius;
  const dashLength = circumference * Math.max(0, Math.min(progress, 1));

  return (
    <div
      style={{
        position: "relative",
        width: size,
        height: size,
        flexShrink: 0,
      }}
    >
      {/* Ring SVG */}
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        style={{ position: "absolute", inset: 0, transform: "rotate(-90deg)" }}
        aria-hidden="true"
      >
        {/* Track gris clair */}
        <circle
          cx={center}
          cy={center}
          r={radius}
          fill="none"
          stroke="#F0E8D6"
          strokeWidth="2"
        />
        {/* Arc progression */}
        <circle
          cx={center}
          cy={center}
          r={radius}
          fill="none"
          stroke={ringColor}
          strokeWidth="2"
          strokeDasharray={`${dashLength} ${circumference}`}
          strokeLinecap="round"
        />
      </svg>

      {/* Avatar centré (inset 3px pour respirer dans le ring) */}
      <div
        style={{
          position: "absolute",
          inset: 3,
          borderRadius: "50%",
          background: photoUrl
            ? `url(${photoUrl}) center/cover`
            : "linear-gradient(135deg, #D4A937, #D85A30)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "white",
          fontFamily: "DM Sans, sans-serif",
          fontSize: Math.floor(size * 0.32),
          fontWeight: 800,
          letterSpacing: 0.5,
          textTransform: "uppercase",
        }}
        aria-label={`Avatar de ${initials}`}
      >
        {!photoUrl && initials.slice(0, 2)}
      </div>
    </div>
  );
}
