// =============================================================================
// EngagementTable — table des membres triable + filtrable (2026-05-04)
//
// Affiche tous les membres de l'équipe avec colonnes : Nom, Statut, XP,
// Level, Last seen, Streak (lifetime_login), Activité 7-30j. Tri par
// colonne, filtre par statut, click ligne = drill-down modale.
// =============================================================================

import { useMemo, useState } from "react";
import {
  STATUS_META,
  type TeamMemberEngagement,
  type TeamMemberStatus,
} from "../../hooks/useTeamEngagement";

type SortKey = "xp_total" | "name" | "last_seen_at" | "academy_percent" | "bilans_30d";
type SortDir = "asc" | "desc";

interface EngagementTableProps {
  members: TeamMemberEngagement[];
  excludeRootId?: string | null;
  onMemberClick?: (memberId: string) => void;
}

function initialsOf(name: string): string {
  if (!name) return "?";
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function formatRelative(iso: string | null): string {
  if (!iso) return "—";
  try {
    const d = new Date(iso);
    const diffMs = Date.now() - d.getTime();
    const days = Math.floor(diffMs / (24 * 3600 * 1000));
    if (days === 0) return "aujourd'hui";
    if (days === 1) return "hier";
    if (days < 7) return `il y a ${days}j`;
    if (days < 30) return `il y a ${Math.floor(days / 7)}sem.`;
    if (days < 365) return `il y a ${Math.floor(days / 30)}m`;
    return `il y a ${Math.floor(days / 365)}an`;
  } catch {
    return "—";
  }
}

const STATUS_FILTERS: Array<{ value: "all" | TeamMemberStatus; label: string; emoji: string }> = [
  { value: "all", label: "Tous", emoji: "👥" },
  { value: "active", label: "Actifs", emoji: "✅" },
  { value: "idle", label: "Discrets", emoji: "🌤" },
  { value: "stuck", label: "Bloqués", emoji: "⚠️" },
  { value: "decroche", label: "Décrochés", emoji: "🔻" },
  { value: "never_started", label: "Pas démarrés", emoji: "⚪" },
];

export function EngagementTable({ members, excludeRootId, onMemberClick }: EngagementTableProps) {
  const [statusFilter, setStatusFilter] = useState<"all" | TeamMemberStatus>("all");
  const [sortKey, setSortKey] = useState<SortKey>("xp_total");
  const [sortDir, setSortDir] = useState<SortDir>("desc");

  const filtered = useMemo(() => {
    let list = members.filter((m) => !excludeRootId || m.user_id !== excludeRootId);
    if (statusFilter !== "all") {
      list = list.filter((m) => m.status === statusFilter);
    }
    list.sort((a, b) => {
      let va: number | string | null = a[sortKey] as number | string | null;
      let vb: number | string | null = b[sortKey] as number | string | null;
      if (sortKey === "name") {
        va = (va as string) ?? "";
        vb = (vb as string) ?? "";
      } else if (sortKey === "last_seen_at") {
        va = va ? new Date(va as string).getTime() : 0;
        vb = vb ? new Date(vb as string).getTime() : 0;
      } else {
        va = (va as number) ?? 0;
        vb = (vb as number) ?? 0;
      }
      if (va < vb) return sortDir === "asc" ? -1 : 1;
      if (va > vb) return sortDir === "asc" ? 1 : -1;
      return 0;
    });
    return list;
  }, [members, statusFilter, sortKey, sortDir, excludeRootId]);

  const counts = useMemo(() => {
    const base: Record<string, number> = {
      all: 0,
      active: 0,
      idle: 0,
      stuck: 0,
      decroche: 0,
      never_started: 0,
    };
    for (const m of members) {
      if (excludeRootId && m.user_id === excludeRootId) continue;
      base.all += 1;
      base[m.status] = (base[m.status] ?? 0) + 1;
    }
    return base;
  }, [members, excludeRootId]);

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir(key === "name" ? "asc" : "desc");
    }
  };

  return (
    <div>
      {/* Filtres statut */}
      <div style={filterRowStyle}>
        {STATUS_FILTERS.map((f) => {
          const active = statusFilter === f.value;
          const count = counts[f.value] ?? 0;
          return (
            <button
              key={f.value}
              type="button"
              onClick={() => setStatusFilter(f.value)}
              style={filterChipStyle(active)}
            >
              <span aria-hidden="true">{f.emoji}</span>
              {f.label}
              <span style={chipCounterStyle(active)}>{count}</span>
            </button>
          );
        })}
      </div>

      {/* Table */}
      {filtered.length === 0 ? (
        <div style={emptyStyle}>Aucun membre dans cette catégorie.</div>
      ) : (
        <div style={tableScrollStyle}>
          <table style={tableStyle}>
            <thead>
              <tr>
                <SortableHeader label="Nom" sortKey="name" current={sortKey} dir={sortDir} onClick={toggleSort} />
                <th style={thStyle}>Statut</th>
                <SortableHeader label="XP" sortKey="xp_total" current={sortKey} dir={sortDir} onClick={toggleSort} align="right" />
                <th style={thStyle}>Level</th>
                <SortableHeader
                  label="Academy"
                  sortKey="academy_percent"
                  current={sortKey}
                  dir={sortDir}
                  onClick={toggleSort}
                  align="right"
                />
                <SortableHeader
                  label="Bilans 30j"
                  sortKey="bilans_30d"
                  current={sortKey}
                  dir={sortDir}
                  onClick={toggleSort}
                  align="right"
                />
                <SortableHeader
                  label="Vu"
                  sortKey="last_seen_at"
                  current={sortKey}
                  dir={sortDir}
                  onClick={toggleSort}
                />
              </tr>
            </thead>
            <tbody>
              {filtered.map((m) => {
                const status = STATUS_META[m.status];
                return (
                  <tr
                    key={m.user_id}
                    onClick={() => onMemberClick?.(m.user_id)}
                    style={{ ...trStyle, cursor: onMemberClick ? "pointer" : "default" }}
                  >
                    <td style={tdNameStyle}>
                      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <div style={miniAvatarStyle}>{initialsOf(m.name)}</div>
                        <div>
                          <div style={{ fontWeight: 600, color: "var(--ls-text)", fontSize: 13 }}>{m.name}</div>
                          <div style={{ fontSize: 10, color: "var(--ls-text-muted)" }}>
                            {m.role === "admin" ? "Admin" : m.role === "referent" ? "Référent" : "Distri"}
                            {m.current_rank && ` · ${m.current_rank}`}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td style={tdStyle}>
                      <span style={statusPillStyle(status.color)}>
                        <span aria-hidden="true">{status.emoji}</span>
                        {status.label}
                      </span>
                    </td>
                    <td style={tdRightStyle}>
                      <span style={{ fontFamily: "Syne, sans-serif", fontWeight: 700, color: "var(--ls-text)" }}>
                        {m.xp_total.toLocaleString("fr-FR")}
                      </span>
                    </td>
                    <td style={tdStyle}>{m.xp_level}</td>
                    <td style={tdRightStyle}>
                      <AcademyMiniProgress percent={m.academy_percent} step={m.academy_step} />
                    </td>
                    <td style={tdRightStyle}>{m.bilans_30d}</td>
                    <td style={tdStyle}>
                      <span style={{ fontSize: 11, color: "var(--ls-text-muted)" }}>
                        {formatRelative(m.last_seen_at)}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function SortableHeader({
  label,
  sortKey,
  current,
  dir,
  onClick,
  align,
}: {
  label: string;
  sortKey: SortKey;
  current: SortKey;
  dir: SortDir;
  onClick: (k: SortKey) => void;
  align?: "left" | "right";
}) {
  const isActive = current === sortKey;
  return (
    <th
      style={{ ...thStyle, textAlign: align ?? "left", cursor: "pointer" }}
      onClick={() => onClick(sortKey)}
    >
      <span
        style={{
          color: isActive ? "var(--ls-gold)" : "var(--ls-text-muted)",
          display: "inline-flex",
          alignItems: "center",
          gap: 4,
        }}
      >
        {label}
        {isActive && <span style={{ fontSize: 9 }}>{dir === "asc" ? "▲" : "▼"}</span>}
      </span>
    </th>
  );
}

function AcademyMiniProgress({ percent, step }: { percent: number; step: number }) {
  const color =
    percent >= 100
      ? "var(--ls-teal)"
      : percent >= 50
        ? "var(--ls-gold)"
        : "var(--ls-text-muted)";
  return (
    <div style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
      <div style={progressBarBgStyle}>
        <div
          style={{
            ...progressBarFillStyle,
            background: color,
            width: `${Math.min(percent, 100)}%`,
          }}
        />
      </div>
      <span style={{ fontSize: 10, color: "var(--ls-text-muted)", minWidth: 32, textAlign: "right" }}>
        {step}/12
      </span>
    </div>
  );
}

// ─── Styles ────────────────────────────────────────────────────────────────

const filterRowStyle: React.CSSProperties = {
  display: "flex",
  flexWrap: "wrap",
  gap: 8,
  marginBottom: 14,
};

const filterChipStyle = (active: boolean): React.CSSProperties => ({
  padding: "6px 12px",
  borderRadius: 999,
  border: active ? "1.5px solid var(--ls-gold)" : "0.5px solid var(--ls-border)",
  background: active ? "color-mix(in srgb, var(--ls-gold) 14%, var(--ls-surface))" : "var(--ls-surface)",
  color: active ? "var(--ls-gold)" : "var(--ls-text-muted)",
  fontSize: 12,
  fontFamily: "DM Sans, sans-serif",
  fontWeight: active ? 700 : 500,
  cursor: "pointer",
  display: "inline-flex",
  alignItems: "center",
  gap: 6,
});

const chipCounterStyle = (active: boolean): React.CSSProperties => ({
  fontSize: 10,
  fontWeight: 700,
  padding: "1px 6px",
  borderRadius: 6,
  background: active ? "var(--ls-gold)" : "var(--ls-surface2)",
  color: active ? "var(--ls-bg)" : "var(--ls-text-muted)",
  marginLeft: 2,
});

const tableScrollStyle: React.CSSProperties = {
  width: "100%",
  overflowX: "auto",
  background: "var(--ls-surface)",
  borderRadius: 12,
  border: "0.5px solid var(--ls-border)",
};

const tableStyle: React.CSSProperties = {
  width: "100%",
  borderCollapse: "collapse",
};

const thStyle: React.CSSProperties = {
  padding: "12px 14px",
  textAlign: "left",
  fontSize: 11,
  fontWeight: 600,
  textTransform: "uppercase",
  letterSpacing: 0.6,
  color: "var(--ls-text-muted)",
  fontFamily: "DM Sans, sans-serif",
  borderBottom: "0.5px solid var(--ls-border)",
  background: "var(--ls-surface2)",
};

const trStyle: React.CSSProperties = {
  borderBottom: "0.5px solid var(--ls-border)",
  transition: "background 0.12s",
};

const tdStyle: React.CSSProperties = {
  padding: "12px 14px",
  fontSize: 13,
  color: "var(--ls-text)",
  verticalAlign: "middle",
};

const tdRightStyle: React.CSSProperties = {
  ...tdStyle,
  textAlign: "right",
};

const tdNameStyle: React.CSSProperties = {
  ...tdStyle,
  minWidth: 180,
};

const miniAvatarStyle: React.CSSProperties = {
  width: 32,
  height: 32,
  borderRadius: 10,
  background: "var(--ls-surface2)",
  border: "0.5px solid var(--ls-border)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontFamily: "Syne, sans-serif",
  fontSize: 11,
  fontWeight: 700,
  color: "var(--ls-text)",
  flexShrink: 0,
};

const statusPillStyle = (color: string): React.CSSProperties => ({
  display: "inline-flex",
  alignItems: "center",
  gap: 4,
  padding: "3px 9px",
  borderRadius: 8,
  fontSize: 11,
  fontWeight: 600,
  background: `color-mix(in srgb, ${color} 14%, transparent)`,
  color,
  border: `0.5px solid ${color}`,
  fontFamily: "DM Sans, sans-serif",
});

const progressBarBgStyle: React.CSSProperties = {
  width: 60,
  height: 6,
  background: "var(--ls-surface2)",
  borderRadius: 3,
  overflow: "hidden",
};

const progressBarFillStyle: React.CSSProperties = {
  height: "100%",
  borderRadius: 3,
  transition: "width 0.4s ease",
};

const emptyStyle: React.CSSProperties = {
  padding: "30px 20px",
  textAlign: "center",
  color: "var(--ls-text-muted)",
  fontSize: 13,
  fontFamily: "DM Sans, sans-serif",
};
