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
  // V7 fix Thomas passe 2 (2026-05-08) : size reduit 340 → 280 +
  // opacity 0.22 → 0.16 — le pin masquait encore le watermark "360"
  // derriere. Maintenant l ordre visuel est : 360 watermark > pin
  // par rang en filigrane plus subtil > contenu hero au-dessus.
  size = 280,
  opacity = 0.16,
  positioned = true,
  rankOverride,
}: PinAWTCinematicProps) {
  const { currentUser } = useAppContext();
  const rank = rankOverride ?? currentUser?.currentRank ?? null;
  const fileName = (rank && RANK_TO_PIN[rank]) ?? DEFAULT_PIN;
  const src = `/pins/${fileName}`;

  // Container : positionne le bloc decoratif en bas-droite du hero
  // (positioned=true) ou laisse le parent decider (positioned=false).
  const containerStyle: React.CSSProperties = positioned
    ? {
        position: "absolute",
        right: -60,
        top: "50%",
        transform: "translateY(-50%)",
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
    <div style={containerStyle} aria-hidden="true">
      {/* V7 (2026-05-08) : watermark "360" italique XL derriere le pin.
          Position absolue dans le container, font-size relatif a la taille
          du pin (pour echelle proportionnelle). Color blanc tres transparent
          (4%) + heritage gradient G3 sur cette transparence — visible sans
          dominer. Il EST visible meme avec overflow:hidden parent car ce
          container l ancre dans le hero. */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          pointerEvents: "none",
        }}
      >
        <span
          style={{
            fontFamily:
              "var(--lb360-display-serif, 'Fraunces', 'Cormorant Garamond', serif)",
            fontStyle: "italic",
            fontWeight: 700,
            fontSize: Math.round(size * 1.1),
            lineHeight: 1,
            letterSpacing: "-0.06em",
            color: "rgba(255, 255, 255, 0.05)",
            userSelect: "none",
            transform: "translateX(-8%)",
            whiteSpace: "nowrap",
          }}
        >
          360
        </span>
      </div>

      {/* Pin AWT par rang : 2 wrappers imbriques pour combiner les
          animations (CSS ne supporte pas 2 transforms differents sur
          un meme element via 2 classes). Outer = rotation 60s,
          inner = heartbeat 3s. */}
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
  );
}
