import { Link } from "react-router-dom";
import type { Prospect } from "../../types/domain";
import { PROSPECT_STATUS_LABELS } from "../../types/domain";

interface ProspectCardProps {
  prospect: Prospect;
  ownerName?: string;
  showDate?: boolean;      // true = affiche la date complète, false = juste l'heure
  onClick?: (prospect: Prospect) => void;
}

const SOURCE_COLORS: Record<string, { bg: string; fg: string }> = {
  "Meta Ads":          { bg: "rgba(124,58,237,0.12)", fg: "var(--ls-purple)" },
  "Instagram":         { bg: "rgba(251,113,133,0.12)", fg: "var(--ls-coral)" },
  "TikTok":            { bg: "rgba(45,212,191,0.12)", fg: "var(--ls-teal)" },
  "Bouche à oreille":  { bg: "rgba(201,168,76,0.12)", fg: "var(--ls-gold)" },
  "Parrainage":        { bg: "rgba(201,168,76,0.12)", fg: "var(--ls-gold)" },
  "Événement":         { bg: "rgba(45,212,191,0.12)", fg: "var(--ls-teal)" },
  "Autre":             { bg: "var(--ls-surface2)",    fg: "var(--ls-text-muted)" },
};

const STATUS_COLORS: Record<Prospect["status"], { bg: string; fg: string }> = {
  scheduled: { bg: "rgba(45,212,191,0.1)",   fg: "var(--ls-teal)" },
  done:      { bg: "var(--ls-surface2)",     fg: "var(--ls-text-muted)" },
  converted: { bg: "rgba(45,212,191,0.18)",  fg: "var(--ls-teal)" },
  lost:      { bg: "rgba(251,113,133,0.1)",  fg: "var(--ls-coral)" },
  no_show:   { bg: "rgba(251,113,133,0.1)",  fg: "var(--ls-coral)" },
  cancelled: { bg: "var(--ls-surface2)",     fg: "var(--ls-text-hint)" },
};

function formatTime(iso: string): string {
  try {
    return new Date(iso).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
  } catch {
    return "—";
  }
}

function formatShortDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString("fr-FR", { day: "2-digit", month: "short" });
  } catch {
    return "—";
  }
}

export function ProspectCard({ prospect, ownerName, showDate = false, onClick }: ProspectCardProps) {
  const sourceStyle = SOURCE_COLORS[prospect.source] ?? SOURCE_COLORS["Autre"];
  const statusStyle = STATUS_COLORS[prospect.status];
  const timeLabel = showDate ? formatShortDate(prospect.rdvDate) : formatTime(prospect.rdvDate);
  const subtimeLabel = showDate ? formatTime(prospect.rdvDate) : null;

  const content = (
    <>
      {/* Colonne heure/date */}
      <div style={{ minWidth: 60, textAlign: "center", flexShrink: 0 }}>
        <div style={{ fontFamily: "Syne, sans-serif", fontWeight: 700, fontSize: 14, color: "var(--ls-text)" }}>
          {timeLabel}
        </div>
        {subtimeLabel && (
          <div style={{ fontSize: 11, color: "var(--ls-text-hint)", marginTop: 2 }}>
            {subtimeLabel}
          </div>
        )}
      </div>

      {/* Colonne infos */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 14, fontWeight: 600, color: "var(--ls-text)", marginBottom: 2 }}>
          {prospect.firstName} {prospect.lastName}
        </div>
        <div style={{ fontSize: 11, color: "var(--ls-text-muted)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {prospect.phone && <span>{prospect.phone}</span>}
          {prospect.phone && prospect.note && <span> · </span>}
          {prospect.note && <span>{prospect.note}</span>}
          {!prospect.phone && !prospect.note && ownerName && <span>Pour {ownerName}</span>}
        </div>
      </div>

      {/* Badges source + status */}
      <div style={{ display: "flex", flexDirection: "column", gap: 4, alignItems: "flex-end", flexShrink: 0 }}>
        <span
          style={{
            fontSize: 10,
            fontWeight: 600,
            padding: "3px 10px",
            borderRadius: 10,
            background: sourceStyle.bg,
            color: sourceStyle.fg,
            fontFamily: "DM Sans, sans-serif",
            whiteSpace: "nowrap",
          }}
        >
          {prospect.source}
        </span>
        {prospect.status !== "scheduled" && (
          <span
            style={{
              fontSize: 9,
              fontWeight: 600,
              padding: "2px 8px",
              borderRadius: 8,
              background: statusStyle.bg,
              color: statusStyle.fg,
              fontFamily: "DM Sans, sans-serif",
            }}
          >
            {PROSPECT_STATUS_LABELS[prospect.status]}
          </span>
        )}
      </div>
    </>
  );

  const rowStyle: React.CSSProperties = {
    display: "flex",
    alignItems: "center",
    gap: 14,
    padding: "12px 16px",
    background: "var(--ls-surface)",
    border: "1px solid var(--ls-border)",
    borderRadius: 14,
    transition: "all 0.15s",
    textDecoration: "none",
    color: "inherit",
    cursor: onClick ? "pointer" : "default",
  };

  if (onClick) {
    return (
      <button
        type="button"
        onClick={() => onClick(prospect)}
        style={{ ...rowStyle, width: "100%", textAlign: "left", font: "inherit" }}
        onMouseEnter={(e) => { e.currentTarget.style.borderColor = "var(--ls-gold)"; }}
        onMouseLeave={(e) => { e.currentTarget.style.borderColor = "var(--ls-border)"; }}
      >
        {content}
      </button>
    );
  }

  // Si un client a été converti → lien vers sa fiche
  if (prospect.convertedClientId) {
    return (
      <Link to={`/clients/${prospect.convertedClientId}`} style={rowStyle}>
        {content}
      </Link>
    );
  }

  return <div style={rowStyle}>{content}</div>;
}
