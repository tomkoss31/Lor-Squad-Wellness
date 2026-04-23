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

const ACCENT_COLORS: Record<Accent, { bg: string; bgDark: string; text: string }> = {
  teal: {
    bg: "rgba(29, 158, 117, 0.14)",
    bgDark: "rgba(29, 158, 117, 0.22)",
    text: "#0F6E56",
  },
  gold: {
    bg: "rgba(239, 159, 39, 0.16)",
    bgDark: "rgba(239, 159, 39, 0.24)",
    text: "#BA7517",
  },
  magenta: {
    bg: "rgba(212, 83, 126, 0.14)",
    bgDark: "rgba(212, 83, 126, 0.22)",
    text: "#A93B63",
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
          background: rgba(255, 255, 255, 0.72);
          backdrop-filter: blur(10px) saturate(140%);
          -webkit-backdrop-filter: blur(10px) saturate(140%);
          border: 1px solid rgba(239, 159, 39, 0.15);
          border-radius: 16px;
          cursor: pointer;
          text-align: left;
          font-family: 'DM Sans', sans-serif;
          color: inherit;
          box-shadow: 0 1px 2px rgba(11,13,17,0.04), 0 4px 12px rgba(11,13,17,0.03);
          transition:
            transform 0.25s cubic-bezier(0.16, 1, 0.3, 1),
            box-shadow 0.25s cubic-bezier(0.16, 1, 0.3, 1),
            border-color 0.25s ease,
            background 0.25s ease;
          opacity: 0;
          animation: welcome-card-in 0.7s cubic-bezier(0.16, 1, 0.3, 1) both;
        }
        :root[data-theme="dark"] .welcome-profile-card,
        html.dark .welcome-profile-card {
          background: rgba(255, 255, 255, 0.04);
          border: 1px solid rgba(255, 255, 255, 0.08);
          box-shadow: 0 1px 2px rgba(0,0,0,0.12), 0 4px 16px rgba(0,0,0,0.08);
        }
        .welcome-profile-card:hover {
          transform: translateY(-2px);
          border-color: rgba(239, 159, 39, 0.4);
          box-shadow: 0 4px 20px rgba(239, 159, 39, 0.1), 0 2px 6px rgba(11,13,17,0.06);
          background: rgba(255, 255, 255, 0.88);
        }
        :root[data-theme="dark"] .welcome-profile-card:hover,
        html.dark .welcome-profile-card:hover {
          background: rgba(255, 255, 255, 0.06);
          border-color: rgba(239, 159, 39, 0.45);
          box-shadow: 0 4px 24px rgba(239, 159, 39, 0.14), 0 2px 6px rgba(0,0,0,0.15);
        }
        .welcome-profile-card:focus-visible {
          outline: 2px solid #EF9F27;
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
          font-size: 15px;
          font-weight: 600;
          color: var(--ls-text, #0B0D11);
          margin-bottom: 2px;
          line-height: 1.3;
        }
        :root[data-theme="dark"] .welcome-profile-card__title,
        html.dark .welcome-profile-card__title { color: #F0EDE8; }
        .welcome-profile-card__sub {
          font-size: 13px;
          color: rgba(11, 13, 17, 0.6);
          line-height: 1.4;
        }
        :root[data-theme="dark"] .welcome-profile-card__sub,
        html.dark .welcome-profile-card__sub { color: rgba(240, 237, 232, 0.58); }
        .welcome-profile-card__arrow {
          font-size: 18px;
          color: rgba(11, 13, 17, 0.38);
          flex-shrink: 0;
          transition: transform 0.25s cubic-bezier(0.16, 1, 0.3, 1), color 0.25s ease;
          line-height: 1;
        }
        :root[data-theme="dark"] .welcome-profile-card__arrow,
        html.dark .welcome-profile-card__arrow { color: rgba(240, 237, 232, 0.35); }
        .welcome-profile-card:hover .welcome-profile-card__arrow {
          transform: translateX(4px);
          color: #EF9F27;
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
