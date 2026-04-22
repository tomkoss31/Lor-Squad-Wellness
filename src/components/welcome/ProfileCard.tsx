// Chantier Welcome Page + Magic Links (2026-04-24).
// Card cliquable d'un profil (Client / Distri / Prospect).

interface Props {
  icon: string;
  title: string;
  subtitle: string;
  onClick: () => void;
  delayMs?: number;
}

export function ProfileCard({ icon, title, subtitle, onClick, delayMs = 0 }: Props) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="welcome-profile-card"
      style={{
        width: "100%",
        display: "flex",
        alignItems: "center",
        gap: 14,
        padding: "16px 18px",
        background: "var(--ls-surface)",
        border: "1px solid var(--ls-border)",
        borderRadius: 14,
        cursor: "pointer",
        textAlign: "left",
        transition: "transform 150ms ease, border-color 150ms, background 150ms, box-shadow 150ms",
        animation: `welcome-fade-in 0.5s ease-out ${delayMs}ms both`,
        fontFamily: "DM Sans, sans-serif",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.borderColor = "var(--ls-gold)";
        e.currentTarget.style.background = "var(--ls-surface2)";
        e.currentTarget.style.boxShadow = "0 4px 16px rgba(186,117,23,0.15)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.borderColor = "var(--ls-border)";
        e.currentTarget.style.background = "var(--ls-surface)";
        e.currentTarget.style.boxShadow = "none";
      }}
    >
      <div
        aria-hidden="true"
        style={{
          width: 44,
          height: 44,
          borderRadius: 12,
          background: "var(--ls-surface2)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 22,
          flexShrink: 0,
        }}
      >
        {icon}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 14, fontWeight: 600, color: "var(--ls-text)", marginBottom: 2 }}>
          {title}
        </div>
        <div style={{ fontSize: 12, color: "var(--ls-text-muted)", lineHeight: 1.4 }}>
          {subtitle}
        </div>
      </div>
      <svg
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill="none"
        stroke="var(--ls-text-muted)"
        strokeWidth="2"
        style={{ flexShrink: 0 }}
      >
        <polyline points="9 18 15 12 9 6" />
      </svg>
    </button>
  );
}
