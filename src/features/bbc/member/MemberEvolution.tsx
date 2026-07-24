// =============================================================================
// MemberEvolution — onglet Évolution de l'app membre BBC (port du design).
// Poids + courbe · 3 jauges (masse grasse / muscle / hydratation) ·
// mensurations. Données réelles (bilans + client_measurements). Empty states.
// =============================================================================

interface Metric {
  date?: string;
  weight?: number;
  bodyFat?: number;
  muscleMass?: number;
  hydration?: number;
}
interface Measurement {
  measured_at?: string;
  waist_cm?: number;
  hips_cm?: number;
  thigh_cm?: number;
  arm_cm?: number;
}

interface MemberEvolutionProps {
  metrics: Metric[];
  measurements: Measurement[];
}

function num(v: unknown): number | null {
  return typeof v === "number" && Number.isFinite(v) && v > 0 ? v : null;
}
function fr(n: number, d = 1) {
  return n.toFixed(d).replace(".", ",");
}

export function MemberEvolution({ metrics, measurements }: MemberEvolutionProps) {
  const weights = metrics.map((m) => num(m.weight)).filter((w): w is number => w != null);
  const hasWeight = weights.length >= 2;
  const firstW = weights[0];
  const lastW = weights[weights.length - 1];
  const delta = hasWeight ? Math.round((lastW - firstW) * 10) / 10 : null;

  // courbe
  const W = 300, H = 120, pad = 10;
  const mn = hasWeight ? Math.min(...weights) - 0.3 : 0;
  const mx = hasWeight ? Math.max(...weights) + 0.3 : 1;
  const pts = weights.map((v, i) => [
    pad + (weights.length > 1 ? (i * (W - 2 * pad)) / (weights.length - 1) : 0),
    pad + ((mx - v) / (mx - mn || 1)) * (H - 2 * pad),
  ]);
  const line = pts.map((p, i) => (i ? "L" : "M") + p[0].toFixed(1) + " " + p[1].toFixed(1)).join(" ");
  const area = pts.length ? `${line} L ${pts[pts.length - 1][0].toFixed(1)} ${H - pad} L ${pad} ${H - pad} Z` : "";

  const latest = metrics[metrics.length - 1] ?? {};
  const first = metrics[0] ?? {};
  const gaugeDefs: Array<{ key: keyof Metric; label: string; color: string }> = [
    { key: "bodyFat", label: "masse grasse", color: "var(--ls-bbc-lime)" },
    { key: "muscleMass", label: "muscle", color: "var(--ls-bbc-teal)" },
    { key: "hydration", label: "hydratation", color: "var(--ls-bbc-violet, #a78bfa)" },
  ];
  const gauges = gaugeDefs
    .map((g) => {
      const v = num(latest[g.key]);
      if (v == null) return null;
      const f = num(first[g.key]);
      const d = f != null ? Math.round((v - f) * 10) / 10 : null;
      const off = (163 * (1 - Math.min(Math.max(v / 100, 0), 1))).toFixed(1);
      return { label: g.label, color: g.color, val: `${Math.round(v)}%`, off, delta: d == null ? "stable" : `${d > 0 ? "+" : ""}${fr(d, 0)} pts` };
    })
    .filter(Boolean) as Array<{ label: string; color: string; val: string; off: string; delta: string }>;

  const lastM = measurements[measurements.length - 1];
  const firstM = measurements[0];
  const mDefs: Array<{ key: keyof Measurement; label: string }> = [
    { key: "waist_cm", label: "tour de taille" },
    { key: "hips_cm", label: "hanches" },
    { key: "thigh_cm", label: "cuisses" },
    { key: "arm_cm", label: "bras" },
  ];
  const mensur = lastM
    ? (mDefs
        .map((m) => {
          const v = num(lastM[m.key]);
          if (v == null) return null;
          const f = firstM ? num(firstM[m.key]) : null;
          const d = f != null ? Math.round((v - f) * 10) / 10 : null;
          return { label: m.label, val: `${fr(v, 0)} cm`, delta: d == null ? "—" : `${d > 0 ? "+" : ""}${fr(d, 0)}`, up: d != null && d > 0 };
        })
        .filter(Boolean) as Array<{ label: string; val: string; delta: string; up: boolean }>)
    : [];

  return (
    <>
      {hasWeight ? (
        <div style={{ background: "var(--ls-bbc-s1)", border: "1px solid var(--ls-bbc-line)", borderRadius: 18, padding: 18 }}>
          <div style={{ display: "inline-flex", alignItems: "center", gap: 8, fontFamily: "var(--ls-bbc-font-mono)", fontSize: 10, fontWeight: 600, letterSpacing: "0.14em", color: "var(--ls-bbc-muted)", textTransform: "uppercase" }}>
            <span style={{ width: 7, height: 7, borderRadius: 999, background: "var(--ls-bbc-lime)", boxShadow: "0 0 8px var(--ls-bbc-lime)" }} />ton poids
          </div>
          <div style={{ display: "flex", alignItems: "flex-end", gap: 10, marginTop: 12 }}>
            <span style={{ fontFamily: "var(--ls-bbc-font-display)", fontSize: 44, lineHeight: 0.85, color: "var(--ls-bbc-lime)" }}>{delta != null && delta > 0 ? "+" : ""}{delta != null ? fr(delta) : "—"}</span>
            <span style={{ fontFamily: "var(--ls-bbc-font-mono)", fontWeight: 600, fontSize: 18, color: "var(--ls-bbc-muted)", paddingBottom: 4 }}>kg</span>
          </div>
          <div style={{ fontSize: 12, color: "var(--ls-bbc-muted)", marginTop: 4 }}>{fr(firstW)} → {fr(lastW)} kg</div>
          <svg width="100%" height="120" viewBox="0 0 300 120" preserveAspectRatio="none" style={{ marginTop: 12, overflow: "visible" }}>
            <defs><linearGradient id="mwf" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="var(--ls-bbc-lime)" stopOpacity="0.22" /><stop offset="1" stopColor="var(--ls-bbc-lime)" stopOpacity="0" /></linearGradient></defs>
            <path d={area} fill="url(#mwf)" />
            <path d={line} fill="none" stroke="var(--ls-bbc-lime)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
            {pts.length ? <circle cx={pts[pts.length - 1][0].toFixed(1)} cy={pts[pts.length - 1][1].toFixed(1)} r="4.5" fill="var(--ls-bbc-lime)" /> : null}
          </svg>
        </div>
      ) : (
        <div style={{ background: "var(--ls-bbc-s1)", border: "1px solid var(--ls-bbc-line)", borderRadius: 18, padding: "22px 18px", textAlign: "center" }}>
          <div style={{ fontSize: 30 }} aria-hidden="true">📈</div>
          <div style={{ fontFamily: "var(--ls-bbc-font-display)", fontSize: 20, marginTop: 8 }}>ta transformation commence</div>
          <div style={{ fontSize: 12.5, color: "var(--ls-bbc-muted)", marginTop: 6, lineHeight: 1.5 }}>ta 1ʳᵉ pesée au club, c'est ton point de départ. la courbe se remplit à chaque visite.</div>
        </div>
      )}

      {gauges.length ? (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
          {gauges.map((g) => (
            <div key={g.label} style={{ background: "var(--ls-bbc-s1)", border: "1px solid var(--ls-bbc-line)", borderRadius: 16, padding: "14px 10px", textAlign: "center" }}>
              <div style={{ position: "relative", width: 64, height: 64, margin: "0 auto" }}>
                <svg width="64" height="64" viewBox="0 0 64 64">
                  <circle cx="32" cy="32" r="26" fill="none" stroke="var(--ls-bbc-s2)" strokeWidth="6" />
                  <circle cx="32" cy="32" r="26" fill="none" stroke={g.color} strokeWidth="6" strokeLinecap="round" strokeDasharray="163" strokeDashoffset={g.off} transform="rotate(-90 32 32)" />
                </svg>
                <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "var(--ls-bbc-font-mono)", fontWeight: 700, fontSize: 15, color: g.color }}>{g.val}</div>
              </div>
              <div style={{ fontSize: 11, fontWeight: 600, marginTop: 8 }}>{g.label}</div>
              <div style={{ fontSize: 10, color: "var(--ls-bbc-muted)" }}>{g.delta}</div>
            </div>
          ))}
        </div>
      ) : null}

      <div style={{ background: "var(--ls-bbc-s1)", border: "1px solid var(--ls-bbc-line)", borderRadius: 18, padding: 18 }}>
        <div style={{ display: "inline-flex", alignItems: "center", gap: 8, fontFamily: "var(--ls-bbc-font-mono)", fontSize: 10, fontWeight: 600, letterSpacing: "0.14em", color: "var(--ls-bbc-muted)", textTransform: "uppercase", marginBottom: 14 }}>
          <span style={{ width: 7, height: 7, borderRadius: 999, background: "var(--ls-bbc-teal)", boxShadow: "0 0 8px var(--ls-bbc-teal)" }} />mes mensurations
        </div>
        {mensur.length ? (
          <>
            <div style={{ display: "flex", gap: 16, alignItems: "center" }}>
              <svg width="60" height="130" viewBox="0 0 70 150" style={{ flex: "none" }}>
                <path d="M35 8a9 9 0 1 1 0 18 9 9 0 0 1 0-18zM22 30h26l-4 40h-18zM26 70h18l2 46h-9l-2-30-2 30h-9z" fill="none" stroke="var(--ls-bbc-teal)" strokeWidth="2" strokeLinejoin="round" />
              </svg>
              <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 8 }}>
                {mensur.map((m) => (
                  <div key={m.label} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <span style={{ flex: 1, fontSize: 12.5, fontWeight: 500, color: "var(--ls-bbc-muted)" }}>{m.label}</span>
                    <span style={{ fontFamily: "var(--ls-bbc-font-mono)", fontSize: 14, fontWeight: 700 }}>{m.val}</span>
                    <span style={{ fontFamily: "var(--ls-bbc-font-mono)", fontSize: 11, fontWeight: 600, width: 42, textAlign: "right", color: m.up ? "var(--ls-bbc-teal)" : "var(--ls-bbc-lime-text)" }}>{m.delta}</span>
                  </div>
                ))}
              </div>
            </div>
          </>
        ) : (
          <div style={{ fontSize: 12.5, color: "var(--ls-bbc-muted)", lineHeight: 1.5 }}>on prend tes premières mesures ensemble à ton prochain passage — c'est ton point de départ.</div>
        )}
      </div>
    </>
  );
}
