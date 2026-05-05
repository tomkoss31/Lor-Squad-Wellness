// =============================================================================
// PinAWTCinematic — pin Active World Team réel selon rang (2026-05-05)
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
  size = 480,
  opacity = 0.18,
  positioned = true,
  rankOverride,
}: PinAWTCinematicProps) {
  const { currentUser } = useAppContext();
  const rank = rankOverride ?? currentUser?.currentRank ?? null;
  const fileName = (rank && RANK_TO_PIN[rank]) ?? DEFAULT_PIN;
  const src = `/pins/${fileName}`;

  const containerStyle: React.CSSProperties = positioned
    ? {
        position: "absolute",
        right: -60,
        top: "50%",
        transform: "translateY(-50%)",
        width: size,
        height: size,
        pointerEvents: "none",
        opacity,
      }
    : {
        width: size,
        height: size,
        pointerEvents: "none",
        opacity,
      };

  return (
    <div className="v5-pin-rotate" style={containerStyle} aria-hidden="true">
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
          // Fond transparent du webp respecté
          background: "transparent",
        }}
      />
    </div>
  );
}
