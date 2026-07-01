// =============================================================================
// ExposuresWeekCard — métrique-reine « Expositions cette semaine » (PR3).
//
// Hero = CHIFFRE / CIBLE (ex "5 / 7"), le gap pilote le comportement.
// Breakdown par type dessous. Perso d'abord, downline ensuite. Bouton de log
// HOM/vidéo en 2 taps. Mobile-first, tokens var(--ls-*).
// =============================================================================

import { useState } from "react";
import { useExposuresWeek, type ManualExposureType } from "../../hooks/useExposuresWeek";

export function ExposuresWeekCard() {
  const { mine, downline, target, loading, logExposure } = useExposuresWeek();
  const [teamOpen, setTeamOpen] = useState(false);
  const [teamQuery, setTeamQuery] = useState("");

  if (loading) return null;
  // Rien à afficher tant que le moteur ne renvoie pas ma ligne (migration PR2
  // pas appliquée, ou pas encore de données) → on masque proprement.
  if (!mine) return null;

  const total = mine.exposures;
  const pct = target > 0 ? Math.min(100, Math.round((total / target) * 100)) : 0;
  const reached = total >= target;

  return (
    <section style={cardStyle}>
      <div style={headerRow}>
        <div>
          <div style={eyebrow}>⚡ Métrique-reine · cette semaine</div>
          <h2 style={titleStyle}>Mes expositions</h2>
        </div>
        <LogExposureButton onLog={logExposure} />
      </div>

      {/* Hero chiffre / cible */}
      <div style={heroRow}>
        <div style={bigNumber}>
          {total}
          <span style={targetPart}> / {target}</span>
        </div>
        <div style={{ flex: 1 }}>
          <div style={barTrack}>
            <div
              style={{
                ...barFill,
                width: `${Math.max(3, pct)}%`,
                background: reached ? "var(--ls-lime)" : "var(--ls-teal)",
              }}
            />
          </div>
          <div style={gapLabel}>
            {reached
              ? "🎯 Cible atteinte — continue !"
              : `Encore ${target - total} pour atteindre ta cible`}
          </div>
        </div>
      </div>

      {/* Breakdown par type */}
      <div style={breakdownRow}>
        <TypePill emoji="📋" label="bilans" n={mine.exp_bilan} />
        <TypePill emoji="🤝" label="RDV" n={mine.exp_rdv} />
        <TypePill emoji="🎤" label="HOM" n={mine.exp_hom} />
        <TypePill emoji="🎬" label="vidéos" n={mine.exp_video} />
      </div>

      {/* Downline — repliée par défaut + filtre (façon Dossiers clients).
          Évite l'effet « liste à plat illisible » quand l'équipe grandit. */}
      {downline.length > 0 ? (
        <div style={downlineBox}>
          <button
            type="button"
            onClick={() => setTeamOpen((v) => !v)}
            style={downlineToggle}
            aria-expanded={teamOpen}
          >
            <span style={downlineTitle}>
              Mon équipe cette semaine
              <span style={teamCount}>{downline.length}</span>
            </span>
            <span
              aria-hidden="true"
              style={{ ...chevron, transform: teamOpen ? "rotate(90deg)" : "none" }}
            >
              ›
            </span>
          </button>

          {teamOpen ? (
            <div style={{ marginTop: 10 }}>
              {downline.length > 4 ? (
                <input
                  type="text"
                  value={teamQuery}
                  onChange={(e) => setTeamQuery(e.target.value)}
                  placeholder="Rechercher un distributeur…"
                  style={teamSearch}
                />
              ) : null}
              {(() => {
                const rows = downline
                  .slice()
                  .sort((a, b) => b.exposures - a.exposures)
                  .filter((r) =>
                    r.name.toLowerCase().includes(teamQuery.trim().toLowerCase()),
                  );
                if (rows.length === 0) {
                  return (
                    <div style={teamEmpty}>Aucun distributeur ne correspond.</div>
                  );
                }
                return rows.map((r) => (
                  <div key={r.user_id} style={downlineRow}>
                    <span style={downlineName}>{r.name}</span>
                    <span style={downlineMeta}>
                      <strong style={{ color: "var(--ls-text)" }}>{r.exposures}</strong> expo
                      {r.recruits_activated > 0 ? (
                        <span style={activatedChip}>+{r.recruits_activated} activé{r.recruits_activated > 1 ? "s" : ""}</span>
                      ) : null}
                    </span>
                  </div>
                ));
              })()}
            </div>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}

// ─── Bouton log HOM / vidéo (2 taps) ─────────────────────────────────────────

function LogExposureButton({
  onLog,
}: {
  onLog: (type: ManualExposureType, prospectLabel?: string) => Promise<boolean>;
}) {
  const [open, setOpen] = useState(false);
  const [type, setType] = useState<ManualExposureType | null>(null);
  const [label, setLabel] = useState("");
  const [saving, setSaving] = useState(false);

  async function submit(t: ManualExposureType) {
    setSaving(true);
    const ok = await onLog(t, label);
    setSaving(false);
    if (ok) {
      setOpen(false);
      setType(null);
      setLabel("");
    }
  }

  if (!open) {
    return (
      <button type="button" onClick={() => setOpen(true)} style={logBtn}>
        + Exposition
      </button>
    );
  }

  return (
    <div style={logPanel}>
      <input
        type="text"
        value={label}
        onChange={(e) => setLabel(e.target.value)}
        placeholder="Prospect (optionnel)"
        style={logInput}
        autoFocus
      />
      <div style={{ display: "flex", gap: 8 }}>
        <button
          type="button"
          disabled={saving}
          onClick={() => { setType("hom"); void submit("hom"); }}
          style={{ ...logChoice, opacity: saving && type === "hom" ? 0.6 : 1 }}
        >
          🎤 HOM
        </button>
        <button
          type="button"
          disabled={saving}
          onClick={() => { setType("video_outil"); void submit("video_outil"); }}
          style={{ ...logChoice, opacity: saving && type === "video_outil" ? 0.6 : 1 }}
        >
          🎬 Vidéo
        </button>
        <button type="button" onClick={() => setOpen(false)} style={logCancel}>
          ✕
        </button>
      </div>
    </div>
  );
}

function TypePill({ emoji, label, n }: { emoji: string; label: string; n: number }) {
  return (
    <div style={typePill}>
      <span aria-hidden="true">{emoji}</span>
      <strong style={{ color: "var(--ls-text)" }}>{n}</strong>
      <span style={{ color: "var(--ls-text-muted)", fontSize: 11.5 }}>{label}</span>
    </div>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const cardStyle: React.CSSProperties = {
  background: "var(--ls-surface)",
  border: "0.5px solid var(--ls-border)",
  borderRadius: 18,
  padding: "18px 18px 16px",
  fontFamily: "DM Sans, sans-serif",
};

const headerRow: React.CSSProperties = {
  display: "flex",
  alignItems: "flex-start",
  justifyContent: "space-between",
  gap: 12,
  marginBottom: 14,
};

const eyebrow: React.CSSProperties = {
  fontSize: 10.5,
  fontWeight: 700,
  letterSpacing: 1.2,
  textTransform: "uppercase",
  color: "var(--ls-teal)",
  marginBottom: 3,
};

const titleStyle: React.CSSProperties = {
  margin: 0,
  fontFamily: "Syne, sans-serif",
  fontSize: 19,
  fontWeight: 800,
  color: "var(--ls-text)",
};

const heroRow: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 16,
  marginBottom: 14,
};

const bigNumber: React.CSSProperties = {
  fontFamily: "Syne, sans-serif",
  fontWeight: 800,
  fontSize: 40,
  lineHeight: 1,
  color: "var(--ls-text)",
  whiteSpace: "nowrap",
};

const targetPart: React.CSSProperties = {
  fontSize: 22,
  color: "var(--ls-text-muted)",
  fontWeight: 700,
};

const barTrack: React.CSSProperties = {
  width: "100%",
  height: 8,
  background: "color-mix(in srgb, var(--ls-text) 10%, transparent)",
  borderRadius: 100,
  overflow: "hidden",
};

const barFill: React.CSSProperties = {
  height: "100%",
  borderRadius: 100,
  transition: "width 0.4s ease",
};

const gapLabel: React.CSSProperties = {
  marginTop: 6,
  fontSize: 12.5,
  color: "var(--ls-text-muted)",
  fontWeight: 600,
};

const breakdownRow: React.CSSProperties = {
  display: "flex",
  flexWrap: "wrap",
  gap: 8,
};

const typePill: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: 6,
  padding: "6px 11px",
  background: "var(--ls-surface2)",
  border: "0.5px solid var(--ls-border)",
  borderRadius: 999,
  fontSize: 13,
  fontWeight: 700,
};

const downlineBox: React.CSSProperties = {
  marginTop: 16,
  paddingTop: 14,
  borderTop: "0.5px solid var(--ls-border)",
};

const downlineToggle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  width: "100%",
  padding: 0,
  background: "transparent",
  border: "none",
  cursor: "pointer",
  fontFamily: "inherit",
};

const downlineTitle: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: 8,
  fontSize: 11,
  fontWeight: 700,
  letterSpacing: 0.8,
  textTransform: "uppercase",
  color: "var(--ls-text-muted)",
};

const teamCount: React.CSSProperties = {
  fontSize: 10.5,
  fontWeight: 700,
  letterSpacing: 0,
  color: "var(--ls-text)",
  background: "var(--ls-surface2)",
  border: "0.5px solid var(--ls-border)",
  borderRadius: 999,
  padding: "1px 7px",
};

const chevron: React.CSSProperties = {
  fontSize: 18,
  lineHeight: 1,
  color: "var(--ls-text-muted)",
  transition: "transform 0.2s ease",
};

const teamSearch: React.CSSProperties = {
  width: "100%",
  padding: "8px 11px",
  marginBottom: 4,
  borderRadius: 10,
  border: "0.5px solid var(--ls-border)",
  background: "var(--ls-surface2)",
  color: "var(--ls-text)",
  fontSize: 13,
  fontFamily: "inherit",
  outline: "none",
  boxSizing: "border-box",
};

const teamEmpty: React.CSSProperties = {
  padding: "10px 2px",
  fontSize: 12.5,
  color: "var(--ls-text-muted)",
  fontStyle: "italic",
};

const downlineRow: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: 10,
  padding: "7px 0",
};

const downlineName: React.CSSProperties = {
  fontSize: 13.5,
  fontWeight: 600,
  color: "var(--ls-text)",
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap",
};

const downlineMeta: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: 8,
  fontSize: 12.5,
  color: "var(--ls-text-muted)",
  whiteSpace: "nowrap",
};

const activatedChip: React.CSSProperties = {
  fontSize: 10.5,
  fontWeight: 700,
  color: "var(--ls-teal)",
  background: "color-mix(in srgb, var(--ls-teal) 14%, transparent)",
  border: "0.5px solid var(--ls-teal)",
  borderRadius: 6,
  padding: "1px 6px",
};

const logBtn: React.CSSProperties = {
  flexShrink: 0,
  padding: "8px 13px",
  background: "var(--ls-teal)",
  color: "var(--ls-bg)",
  border: "none",
  borderRadius: 10,
  fontSize: 12.5,
  fontWeight: 700,
  cursor: "pointer",
  fontFamily: "inherit",
};

const logPanel: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: 8,
  flex: 1,
  maxWidth: 280,
};

const logInput: React.CSSProperties = {
  width: "100%",
  padding: "9px 11px",
  borderRadius: 10,
  border: "0.5px solid var(--ls-border)",
  background: "var(--ls-surface2)",
  color: "var(--ls-text)",
  fontSize: 13,
  fontFamily: "inherit",
  outline: "none",
  boxSizing: "border-box",
};

const logChoice: React.CSSProperties = {
  flex: 1,
  padding: "9px 8px",
  background: "color-mix(in srgb, var(--ls-teal) 12%, var(--ls-surface2))",
  border: "0.5px solid color-mix(in srgb, var(--ls-teal) 40%, var(--ls-border))",
  borderRadius: 10,
  fontSize: 12.5,
  fontWeight: 700,
  color: "var(--ls-text)",
  cursor: "pointer",
  fontFamily: "inherit",
};

const logCancel: React.CSSProperties = {
  width: 38,
  padding: "9px 0",
  background: "transparent",
  border: "0.5px solid var(--ls-border)",
  borderRadius: 10,
  fontSize: 13,
  color: "var(--ls-text-muted)",
  cursor: "pointer",
};
