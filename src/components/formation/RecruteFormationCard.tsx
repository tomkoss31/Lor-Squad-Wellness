// =============================================================================
// RecruteFormationCard — card recrue dans /formation/mon-equipe (Phase C)
//
// Affiche pour une recrue de la lignee descendante :
//   - Avatar + nom + date de recrutement
//   - 3 mini-barres progression N1/N2/N3 (% modules valides)
//   - Alerte contextuelle "1 module en attente de ta validation"
//   - Click → ouvre la modale validation OU page detail
// =============================================================================

import { Link } from "react-router-dom";
import { FORMATION_LEVELS } from "../../data/formation";
import type { User } from "../../types/domain";
import type { FormationProgressRow } from "../../features/formation/types-db";

interface Props {
  recrue: User;
  progressRows: FormationProgressRow[];
  /** Nb de modules de cette recrue qui attendent ma validation. */
  pendingForMe: number;
}

const ACCENT: Record<string, string> = {
  gold: "var(--ls-gold)",
  teal: "var(--ls-teal)",
  purple: "var(--ls-purple)",
};

function formatDays(iso?: string | null): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  const days = Math.floor((Date.now() - d.getTime()) / (1000 * 60 * 60 * 24));
  if (days === 0) return "aujourd'hui";
  if (days === 1) return "il y a 1 jour";
  if (days < 30) return `il y a ${days} jours`;
  const months = Math.floor(days / 30);
  if (months === 1) return "il y a 1 mois";
  if (months < 12) return `il y a ${months} mois`;
  const years = Math.floor(months / 12);
  return years === 1 ? "il y a 1 an" : `il y a ${years} ans`;
}

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
}

export function RecruteFormationCard({ recrue, progressRows, pendingForMe }: Props) {
  // Phase 2 : modules vides → tous les calculs sont a 0. Sera vivant en Phase F.
  const hasPending = pendingForMe > 0;

  return (
    <div
      style={{
        position: "relative",
        padding: 16,
        background: "var(--ls-surface)",
        border: "0.5px solid var(--ls-border)",
        borderLeft: hasPending ? "3px solid var(--ls-gold)" : "3px solid transparent",
        borderRadius: 14,
        fontFamily: "DM Sans, sans-serif",
        display: "flex",
        flexDirection: "column",
        gap: 12,
      }}
    >
      {/* Header : avatar + nom + date */}
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <div
          style={{
            width: 44,
            height: 44,
            borderRadius: "50%",
            background: "linear-gradient(135deg, var(--ls-gold) 0%, color-mix(in srgb, var(--ls-gold) 70%, #000) 100%)",
            color: "var(--ls-gold-contrast, #FFFFFF)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontFamily: "Syne, serif",
            fontWeight: 800,
            fontSize: 14,
            flexShrink: 0,
          }}
          aria-hidden="true"
        >
          {getInitials(recrue.name)}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div
            style={{
              fontFamily: "Syne, serif",
              fontWeight: 800,
              fontSize: 15,
              color: "var(--ls-text)",
              letterSpacing: "-0.01em",
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
            }}
          >
            {recrue.name}
          </div>
          {recrue.createdAt ? (
            <div style={{ fontSize: 11, color: "var(--ls-text-muted)", marginTop: 1 }}>
              Recrutée {formatDays(recrue.createdAt)}
            </div>
          ) : null}
        </div>
      </div>

      {/* Progression N1/N2/N3 */}
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        {FORMATION_LEVELS.map((level) => {
          const totalModules = level.modules.length;
          const completedInLevel = progressRows.filter(
            (p) =>
              level.modules.some((m) => m.id === p.module_id) &&
              p.status === "validated",
          ).length;
          const percent = totalModules > 0 ? Math.round((completedInLevel / totalModules) * 100) : 0;
          const accentVar = ACCENT[level.accent] ?? "var(--ls-gold)";
          return (
            <div
              key={level.id}
              style={{ display: "flex", alignItems: "center", gap: 10 }}
            >
              <span
                style={{
                  fontSize: 11,
                  fontWeight: 700,
                  color: accentVar,
                  width: 80,
                  flexShrink: 0,
                }}
              >
                N{level.order} {level.title}
              </span>
              <div
                style={{
                  flex: 1,
                  height: 5,
                  borderRadius: 3,
                  background: "var(--ls-surface2)",
                  overflow: "hidden",
                }}
              >
                <div
                  style={{
                    width: totalModules > 0 ? `${percent}%` : "0%",
                    height: "100%",
                    background: accentVar,
                    transition: "width 0.4s ease",
                  }}
                />
              </div>
              <span
                style={{
                  fontSize: 11,
                  color: totalModules === 0 ? "var(--ls-text-hint)" : "var(--ls-text-muted)",
                  width: 50,
                  textAlign: "right",
                  flexShrink: 0,
                  fontVariantNumeric: "tabular-nums",
                }}
              >
                {totalModules === 0 ? "—" : `${completedInLevel}/${totalModules}`}
              </span>
            </div>
          );
        })}
      </div>

      {/* Alerte contextuelle si validation en attente */}
      {hasPending ? (
        <Link
          to="/messages?tab=formation"
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            padding: "8px 12px",
            background: "color-mix(in srgb, var(--ls-gold) 12%, transparent)",
            border: "0.5px solid color-mix(in srgb, var(--ls-gold) 30%, transparent)",
            borderRadius: 10,
            color: "var(--ls-gold)",
            fontSize: 12,
            fontWeight: 600,
            textDecoration: "none",
          }}
        >
          ⚠️ {pendingForMe} module{pendingForMe > 1 ? "s" : ""} en attente de ta validation
          <span style={{ marginLeft: "auto" }}>→</span>
        </Link>
      ) : null}
    </div>
  );
}
