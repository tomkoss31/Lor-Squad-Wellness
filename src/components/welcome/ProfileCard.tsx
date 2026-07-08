// Chantier Welcome Premium Redesign (2026-04-24).
// Card glassmorphism premium : icône colorée par accent (teal/gold/magenta),
// bordure subtile gold au hover, flèche qui glisse, élévation.

type Accent = "teal" | "gold" | "magenta";

interface Props {
  icon: string;
  title: string;
  subtitle: string;
  onClick: () => void;
  delayMs?: number;
  accent?: Accent;
}

// Identité v2 (2026-07) : tints lime/teal/coral sur card sombre.
const ACCENT_COLORS: Record<Accent, { bg: string; bgDark: string; text: string }> = {
  teal: {
    bg: "rgba(45, 212, 191, 0.14)",
    bgDark: "rgba(45, 212, 191, 0.22)",
    text: "#2DD4BF",
  },
  gold: {
    bg: "rgba(197, 248, 42, 0.14)",
    bgDark: "rgba(197, 248, 42, 0.22)",
    text: "#c5f82a",
  },
  magenta: {
    bg: "rgba(251, 113, 133, 0.16)",
    bgDark: "rgba(251, 113, 133, 0.22)",
    text: "#FB7185",
  },
};

export function ProfileCard({ icon, title, subtitle, onClick, delayMs = 0, accent = "gold" }: Props) {
  const accentColors = ACCENT_COLORS[accent];
  return (
    <button
      type="button"
      onClick={onClick}
      className={`welcome-profile-card welcome-profile-card--${accent}`}
      aria-label={`Continuer en tant que ${title}`}
      style={{ animationDelay: `${delayMs}ms` }}
    >
      <style>{`
        .welcome-profile-card {
          width: 100%;
          display: flex;
          align-items: center;
          gap: 14px;
          padding: 18px 20px;
          background: #1a1e22;
          border: 1px solid rgba(255, 255, 255, 0.10);
          border-radius: 16px;
          cursor: pointer;
          text-align: left;
          font-family: 'DM Sans', sans-serif;
          color: inherit;
          box-shadow: 0 4px 16px rgba(0,0,0,0.25);
          transition:
            transform 0.25s cubic-bezier(0.16, 1, 0.3, 1),
            box-shadow 0.25s cubic-bezier(0.16, 1, 0.3, 1),
            border-color 0.25s ease,
            background 0.25s ease;
          opacity: 0;
          animation: welcome-card-in 0.7s cubic-bezier(0.16, 1, 0.3, 1) both;
        }
        .welcome-profile-card:hover {
          transform: translateY(-2px);
          border-color: rgba(197, 248, 42, 0.45);
          box-shadow: 0 6px 24px rgba(0,0,0,0.35);
          background: #1f242a;
        }
        .welcome-profile-card:focus-visible {
          outline: 2px solid #c5f82a;
          outline-offset: 2px;
        }
        .welcome-profile-card__icon {
          width: 48px;
          height: 48px;
          border-radius: 13px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          font-size: 22px;
          flex-shrink: 0;
          transition: transform 0.3s cubic-bezier(0.16, 1, 0.3, 1);
        }
        .welcome-profile-card:hover .welcome-profile-card__icon {
          transform: rotate(-4deg) scale(1.05);
        }
        .welcome-profile-card__body {
          flex: 1;
          min-width: 0;
        }
        .welcome-profile-card__title {
          font-size: 15.5px;
          font-weight: 700;
          color: #F1EFE8;
          margin-bottom: 3px;
          line-height: 1.3;
          letter-spacing: -0.005em;
        }
        .welcome-profile-card__sub {
          font-size: 13px;
          font-weight: 500;
          color: rgba(240, 237, 232, 0.62);
          line-height: 1.4;
        }
        /* Au hover, le titre prend la couleur d accent — friendly + match page */
        .welcome-profile-card--teal:hover .welcome-profile-card__title { color: #2DD4BF; }
        .welcome-profile-card--gold:hover .welcome-profile-card__title { color: #c5f82a; }
        .welcome-profile-card--magenta:hover .welcome-profile-card__title { color: #FB7185; }
        .welcome-profile-card__arrow {
          font-size: 18px;
          color: rgba(240, 237, 232, 0.32);
          flex-shrink: 0;
          transition: transform 0.25s cubic-bezier(0.16, 1, 0.3, 1), color 0.25s ease;
          line-height: 1;
        }
        .welcome-profile-card:hover .welcome-profile-card__arrow {
          transform: translateX(4px);
          color: #c5f82a;
        }

        @keyframes welcome-card-in {
          from { opacity: 0; transform: translateY(18px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @media (prefers-reduced-motion: reduce) {
          .welcome-profile-card { animation: none !important; opacity: 1; }
          .welcome-profile-card:hover { transform: none; }
          .welcome-profile-card:hover .welcome-profile-card__icon { transform: none; }
          .welcome-profile-card:hover .welcome-profile-card__arrow { transform: none; }
        }
      `}</style>

      <div
        className="welcome-profile-card__icon"
        aria-hidden="true"
        style={{
          background: accentColors.bg,
        }}
      >
        {icon}
      </div>
      <div className="welcome-profile-card__body">
        <div className="welcome-profile-card__title">{title}</div>
        <div className="welcome-profile-card__sub">{subtitle}</div>
      </div>
      <span className="welcome-profile-card__arrow" aria-hidden="true">→</span>
    </button>
  );
}
