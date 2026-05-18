// =============================================================================
// DistriQuickLink — pill cliquable cohérent vers /distributors/:id
// =============================================================================
// Chantier #13 sous-vague B.4 (2026-05-18). Style/comportement clic unifies
// pour les surfaces qui listent des distri sans pouvoir wrapper toute la
// ligne dans un Link (FlexTeamPage MemberRow = button toggle).
//
// Pour les surfaces ou toute la ligne PEUT etre cliquable, on prefere wrap
// dans un Link (cf. EquipeTab MemberCard, PvTeamPage PvDistriRow).
// =============================================================================

import { Link } from "react-router-dom";
import type { MouseEvent } from "react";

interface Props {
  userId: string;
  /** Comportement par defaut : navigate. Si true, ouvre dans un nouvel onglet. */
  newTab?: boolean;
  /** Texte court a cote du chevron. Default "Fiche". */
  label?: string;
  /** Compact (sans label, juste icone). Default false. */
  iconOnly?: boolean;
}

export function DistriQuickLink({ userId, newTab, label = "Fiche", iconOnly }: Props) {
  // stopPropagation pour eviter de declencher un toggle/onClick parent
  const handleClick = (e: MouseEvent<HTMLAnchorElement>) => {
    e.stopPropagation();
  };

  return (
    <Link
      to={`/distributors/${userId}`}
      target={newTab ? "_blank" : undefined}
      rel={newTab ? "noopener noreferrer" : undefined}
      onClick={handleClick}
      title="Ouvrir la fiche distri"
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        padding: iconOnly ? 6 : "5px 10px",
        borderRadius: 8,
        background: "var(--ls-surface)",
        border: "0.5px solid var(--ls-border)",
        color: "var(--ls-text-muted)",
        fontSize: 11,
        fontFamily: "DM Sans, sans-serif",
        fontWeight: 500,
        textDecoration: "none",
        flexShrink: 0,
        transition: "color 0.15s, border-color 0.15s, background 0.15s",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.color = "var(--ls-teal)";
        e.currentTarget.style.borderColor = "color-mix(in srgb, var(--ls-teal) 40%, transparent)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.color = "var(--ls-text-muted)";
        e.currentTarget.style.borderColor = "var(--ls-border)";
      }}
    >
      {!iconOnly && label}
      <svg
        width="12"
        height="12"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        aria-hidden="true"
      >
        <polyline points="9 18 15 12 9 6" />
      </svg>
    </Link>
  );
}
