// =============================================================================
// PinAWTCinematic — pin Active World Team réel selon rang (2026-05-05)
// V7 fix (2026-05-08) : ajout watermark "360" italique XL en arriere-plan
// + animation heart-beat sur le pin (en plus de la rotation existante).
// Restauration suite retour Thomas qui voulait conserver le pin par rang
// (signature visuelle de progression coach).
//
// Refonte 2026-05-05 : utilise les vrais .webp dans /public/pins/ selon le
// `current_rank` du user, au lieu d'un SVG dessiné générique. Fond
// transparent natif des webp. Rotation lente 60s, opacity 0.18.
//
// Mapping rang Herbalife → fichier :
//   distributor_25         → distributor.webp
//   senior_consultant_35   → senior-consultant.webp
//   success_builder_42     → success-builder.webp
//   supervisor_50          → supervisor.webp
//   active_supervisor_50   → active-supervisor.webp
//   world_team_50          → world-team.webp
//   active_world_team_50   → active-world-team.webp
//   get_team_50            → get-team.webp
//   get_team_2500_50       → get-team-2500.webp
//   millionaire_50         → millionaire-team.webp
//   millionaire_7500_50    → millionaire-team-7500.webp
//   presidents_50          → president-team.webp
//
// Sur mobile (<480px), masqué automatiquement via CSS scopé (perf).
// =============================================================================

import { useAppContext } from "../../../../context/AppContext";

interface PinAWTCinematicProps {
  size?: number;
  opacity?: number;
  positioned?: boolean;
  /** Override le rang détecté depuis currentUser (pour preview / tests). */
  rankOverride?: string;
}

// Mapping centralisé rang → nom de fichier .webp
const RANK_TO_PIN: Record<string, string> = {
  distributor_25: "distributor.webp",
  senior_consultant_35: "senior-consultant.webp",
  success_builder_42: "success-builder.webp",
  supervisor_50: "supervisor.webp",
  active_supervisor_50: "active-supervisor.webp",
  world_team_50: "world-team.webp",
  active_world_team_50: "active-world-team.webp",
  get_team_50: "get-team.webp",
  get_team_2500_50: "get-team-2500.webp",
  millionaire_50: "millionaire-team.webp",
  millionaire_7500_50: "millionaire-team-7500.webp",
  presidents_50: "president-team.webp",
};

const DEFAULT_PIN = "active-world-team.webp"; // fallback élégant

export function PinAWTCinematic({
  // V7 fix Thomas passe 3 (2026-05-08) : separation visuelle nette
  // entre le pin AWT et le watermark "360".
  // - Pin AWT : 220px, opacity 0.18, ANCRE EN HAUT-DROITE du hero
  //   (libere l espace pour que le 360 puisse respirer en bas)
  // - Watermark "360" : controle separement (cf. component sibling)
  size = 220,
  opacity = 0.18,
  positioned = true,
  rankOverride,
}: PinAWTCinematicProps) {
  const { currentUser } = useAppContext();
  const rank = rankOverride ?? currentUser?.currentRank ?? null;
  const fileName = (rank && RANK_TO_PIN[rank]) ?? DEFAULT_PIN;
  const src = `/pins/${fileName}`;

  // V7 fix : pin AWT remonte vers le coin top-right (au lieu d etre
  // centre verticalement). Laisse l espace bas-droite au watermark 360.
  const containerStyle: React.CSSProperties = positioned
    ? {
        position: "absolute",
        right: -20,
        top: -10,
        width: size,
        height: size,
        pointerEvents: "none",
      }
    : {
        position: "relative",
        width: size,
        height: size,
        pointerEvents: "none",
      };

  return (
    <>
      {/* V7 (2026-05-08) : watermark "360" geant, ancre INDEPENDAMMENT
          du pin (au lieu d etre dans son container). Position fixe dans
          le hero parent : centre-bas, taille proportionnelle a 50% du
          hero, italique Fraunces. */}
      {positioned && (
        <div
          aria-hidden="true"
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            alignItems: "flex-end",
            justifyContent: "flex-end",
            pointerEvents: "none",
            paddingRight: "2%",
            paddingBottom: "-8%",
            overflow: "hidden",
            zIndex: 0,
          }}
        >
          <span
            style={{
              fontFamily:
                "var(--lb360-display-serif, 'Fraunces', 'Cormorant Garamond', serif)",
              fontStyle: "italic",
              fontWeight: 800,
              fontSize: "clamp(280px, 40vw, 520px)",
              lineHeight: 0.85,
              letterSpacing: "-0.07em",
              // Gradient G3 tres subtil sur le 360 — visible sans dominer.
              background:
                "var(--lb360-gradient, linear-gradient(135deg, #10B981 0%, #06B6D4 50%, #8B5CF6 100%))",
              WebkitBackgroundClip: "text",
              backgroundClip: "text",
              color: "transparent",
              WebkitTextFillColor: "transparent",
              opacity: 0.10,
              userSelect: "none",
              whiteSpace: "nowrap",
              transform: "translate(8%, 22%)",
            }}
          >
            360
          </span>
        </div>
      )}

      {/* Pin AWT par rang : maintenant dans le coin top-right (libere
          l espace bas pour le 360). Wrappers imbriques pour combiner
          rotation 60s + heartbeat 3s. */}
      <div style={containerStyle} aria-hidden="true">
        <div
          className="v5-pin-rotate"
          style={{
            position: "absolute",
            inset: 0,
            opacity,
            willChange: "transform",
          }}
        >
          <div
            className="v5-pin-heartbeat"
            style={{
              width: "100%",
              height: "100%",
              willChange: "transform",
            }}
          >
            <img
              src={src}
              alt=""
              width={size}
              height={size}
              loading="lazy"
              style={{
                width: "100%",
                height: "100%",
                objectFit: "contain",
                background: "transparent",
              }}
            />
          </div>
        </div>
      </div>
    </>
  );
}
