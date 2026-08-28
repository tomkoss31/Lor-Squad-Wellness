// =============================================================================
// RdvDuJour — le cœur du Co-pilote minimal (2026-08-28)
//
// Demande de Thomas : « la seule chose dont j'ai besoin sur le Co-pilote, c'est
// le rendez-vous d'aujourd'hui, dans combien de temps et avec qui. Juste un
// rappel de l'agenda. » Maquette validée à 390 px avant ce composant.
//
// Ne fait AUCUNE requête : lit `useCopiloteData`, qui dérive tout de
// `AppContext` (déjà chargé). C'est justement le point du chantier — le
// Co-pilote ne doit plus rien retaper sur Supabase à l'ouverture.
// =============================================================================

import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import type { CopiloteData } from "../../../../hooks/useCopiloteData";
import { RDV_GRACE_PERIOD_MS } from "../../../../lib/timeConstants";

const IMMINENT_MS = 2 * 60 * 60 * 1000; // < 2 h → liseré corail (ça arrive)

export function RdvDuJour({ data, now }: { data: CopiloteData; now: Date }) {
  const navigate = useNavigate();

  // Les RDV du jour encore devant nous (un RDV reste « à venir » jusqu'à 15 min
  // après l'heure — même grâce que le reste de l'app).
  const aVenir = useMemo(
    () =>
      data.todayAgendaAll.filter(
        (a) => a.time.getTime() + RDV_GRACE_PERIOD_MS >= now.getTime(),
      ),
    [data.todayAgendaAll, now],
  );

  const ouvrirAgenda = () => navigate("/agenda");

  // ── État : aucun RDV devant soi aujourd'hui ──────────────────────────────
  if (aVenir.length === 0) {
    const prochain = data.nextRdvBeyondToday;
    return (
      <section style={cardStyle} aria-label="Rendez-vous du jour">
        <div style={{ ...eyebrowStyle, color: "var(--ls-text-hint)" }}>Aujourd'hui</div>
        <h2 style={emptyTitleStyle}>Aucun rendez-vous</h2>
        <p style={emptyTextStyle}>La journée est à toi. Rien de calé, personne à recevoir.</p>
        {prochain ? (
          <button type="button" onClick={ouvrirAgenda} style={nextRowStyle}>
            <ArrowIcon />
            <span style={nextTimeStyle}>{jourLabel(prochain.time, now)}</span>
            <span style={nextNameStyle}>{prochain.name}</span>
          </button>
        ) : null}
      </section>
    );
  }

  // ── État : RDV aujourd'hui ────────────────────────────────────────────────
  const [prochain, ...ensuite] = aVenir;
  const imminent = prochain.time.getTime() - now.getTime() <= IMMINENT_MS;
  const accent = imminent ? "var(--ls-coral)" : "var(--ls-teal)";

  return (
    <section
      style={{ ...cardStyle, borderLeft: `4px solid ${accent}`, paddingLeft: 18 }}
      aria-label="Prochain rendez-vous"
    >
      <div style={{ ...eyebrowStyle, color: accent }}>
        <ClockIcon /> Prochain rendez-vous
      </div>
      <div style={countStyle}>
        {formatDelai(prochain.time, now)}
        <span style={countAtStyle}> · {heure(prochain.time)}</span>
      </div>
      <div style={whoStyle}>{prochain.name}</div>
      <div style={metaStyle}>{prochain.type}</div>

      <button type="button" onClick={ouvrirAgenda} style={goStyle}>
        <CalIcon /> Ouvrir dans l'agenda
      </button>

      {ensuite.length > 0 ? (
        <div style={{ marginTop: 16 }}>
          <div style={laterLabelStyle}>Aussi aujourd'hui</div>
          {ensuite.map((a) => (
            <button key={a.id} type="button" onClick={ouvrirAgenda} style={rowStyle}>
              <span style={rowTimeStyle}>{heure(a.time)}</span>
              <span style={rowNameStyle}>{a.name}</span>
              <span style={rowTypeStyle}>{a.type}</span>
            </button>
          ))}
        </div>
      ) : null}
    </section>
  );
}

// ─── Formatage (exporté pour test) ───────────────────────────────────────────

export function formatDelai(target: Date, now: Date): string {
  const ms = target.getTime() - now.getTime();
  if (ms <= 0) return "Maintenant";
  const totalMin = Math.round(ms / 60000);
  if (totalMin < 60) return `Dans ${totalMin} min`;
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  return m === 0 ? `Dans ${h} h` : `Dans ${h} h ${String(m).padStart(2, "0")}`;
}

export function heure(d: Date): string {
  return new Intl.DateTimeFormat("fr-FR", { hour: "2-digit", minute: "2-digit" })
    .format(d)
    .replace(":", " h ");
}

export function jourLabel(target: Date, now: Date): string {
  const d0 = new Date(now); d0.setHours(0, 0, 0, 0);
  const t0 = new Date(target); t0.setHours(0, 0, 0, 0);
  const diffJours = Math.round((t0.getTime() - d0.getTime()) / 86_400_000);
  const t = heure(target);
  if (diffJours <= 1) return `Demain · ${t}`;
  const jour = new Intl.DateTimeFormat("fr-FR", { weekday: "short", day: "numeric", month: "short" }).format(target);
  return `${jour} · ${t}`;
}

// ─── Icônes (inline, pas d'emoji dans l'UI produit) ──────────────────────────

const svgBase = {
  width: 14, height: 14, viewBox: "0 0 24 24", fill: "none",
  stroke: "currentColor", strokeWidth: 2, strokeLinecap: "round" as const, strokeLinejoin: "round" as const,
};
function ClockIcon() {
  return (<svg {...svgBase} aria-hidden="true"><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></svg>);
}
function CalIcon() {
  return (<svg {...svgBase} aria-hidden="true"><rect x="3" y="4" width="18" height="18" rx="2" /><path d="M16 2v4M8 2v4M3 10h18" /></svg>);
}
function ArrowIcon() {
  return (<svg {...svgBase} style={{ color: "var(--ls-teal)", flex: "none" }} aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6" /></svg>);
}

// ─── Styles (tokens --ls-* uniquement) ───────────────────────────────────────

const cardStyle: React.CSSProperties = {
  background: "var(--ls-surface)",
  border: "1px solid var(--ls-border)",
  borderRadius: 22,
  padding: 20,
  margin: "4px 0",
};

const eyebrowStyle: React.CSSProperties = {
  fontFamily: "var(--lb360-mono, 'JetBrains Mono', monospace)",
  fontSize: 10.5,
  fontWeight: 600,
  letterSpacing: "0.15em",
  textTransform: "uppercase",
  display: "flex",
  alignItems: "center",
  gap: 7,
};

const countStyle: React.CSSProperties = {
  fontFamily: "Syne, sans-serif",
  fontWeight: 800,
  fontSize: 34,
  lineHeight: 1.05,
  color: "var(--ls-text)",
  margin: "12px 0 2px",
  letterSpacing: "-0.01em",
};
const countAtStyle: React.CSSProperties = { fontSize: 17, fontWeight: 700, color: "var(--ls-text-muted)" };

const whoStyle: React.CSSProperties = {
  fontFamily: "Syne, sans-serif",
  fontWeight: 700,
  fontSize: 22,
  margin: "12px 0 3px",
  color: "var(--ls-text)",
  letterSpacing: "-0.01em",
};
const metaStyle: React.CSSProperties = {
  fontFamily: "var(--lb360-mono, 'JetBrains Mono', monospace)",
  fontSize: 13,
  color: "var(--ls-text-muted)",
};

const goStyle: React.CSSProperties = {
  marginTop: 17,
  width: "100%",
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  gap: 8,
  background: "transparent",
  border: "1px solid var(--ls-border2)",
  color: "var(--ls-text)",
  borderRadius: 999,
  padding: "11px 16px",
  fontFamily: "'DM Sans', sans-serif",
  fontWeight: 600,
  fontSize: 14,
  cursor: "pointer",
};

const laterLabelStyle: React.CSSProperties = {
  fontFamily: "var(--lb360-mono, 'JetBrains Mono', monospace)",
  fontSize: 10,
  letterSpacing: "0.18em",
  textTransform: "uppercase",
  color: "var(--ls-text-hint)",
  margin: "0 2px 8px",
};
const rowStyle: React.CSSProperties = {
  width: "100%",
  display: "flex",
  alignItems: "center",
  gap: 13,
  padding: "12px 4px",
  borderTop: "1px solid var(--ls-border)",
  background: "transparent",
  cursor: "pointer",
  textAlign: "left",
};
const rowTimeStyle: React.CSSProperties = {
  fontFamily: "var(--lb360-mono, 'JetBrains Mono', monospace)",
  fontSize: 14,
  color: "var(--ls-text)",
  width: 62,
  flex: "none",
};
const rowNameStyle: React.CSSProperties = { fontFamily: "Syne, sans-serif", fontWeight: 600, fontSize: 15, color: "var(--ls-text)", flex: 1 };
const rowTypeStyle: React.CSSProperties = { fontSize: 12, color: "var(--ls-text-hint)" };

const emptyTitleStyle: React.CSSProperties = {
  fontFamily: "Syne, sans-serif",
  fontWeight: 800,
  fontSize: 26,
  margin: "12px 0 6px",
  color: "var(--ls-text)",
  letterSpacing: "-0.01em",
};
const emptyTextStyle: React.CSSProperties = { fontSize: 14.5, color: "var(--ls-text-muted)", margin: "0 0 16px" };
const nextRowStyle: React.CSSProperties = {
  width: "100%",
  display: "flex",
  alignItems: "center",
  gap: 11,
  paddingTop: 14,
  borderTop: "1px solid var(--ls-border)",
  background: "transparent",
  cursor: "pointer",
  textAlign: "left",
};
const nextTimeStyle: React.CSSProperties = {
  fontFamily: "var(--lb360-mono, 'JetBrains Mono', monospace)",
  fontSize: 12.5,
  color: "var(--ls-teal)",
  flex: "none",
};
const nextNameStyle: React.CSSProperties = { fontFamily: "Syne, sans-serif", fontWeight: 600, fontSize: 15, color: "var(--ls-text)" };
