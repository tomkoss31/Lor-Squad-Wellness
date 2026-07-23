// =============================================================================
// BbcClub — pointage du club en direct (port du design, BBC Lot 3).
// Présents / scan QR / alerte bilan des 10 + grille de pointage 1 tap.
// =============================================================================

const POINTAGE: Array<{ name: string; ini: string; tone: "teal" | "lime" | "coral" | "hint"; time: string; visits: string; cta: string }> = [
  { name: "Sarah M.", ini: "SM", tone: "teal", time: "7h04", visits: "7 / 10", cta: "pointé" },
  { name: "Karim D.", ini: "KD", tone: "teal", time: "7h10", visits: "9 / 10", cta: "pointé" },
  { name: "Inès L.", ini: "IL", tone: "teal", time: "7h12", visits: "3 / 10", cta: "pointé" },
  { name: "Yanis B.", ini: "YB", tone: "hint", time: "attendu", visits: "5 / 10", cta: "pointer" },
  { name: "Nadia B.", ini: "NB", tone: "lime", time: "1re visite", visits: "0 / 10", cta: "scanner" },
  { name: "Léa R.", ini: "LR", tone: "coral", time: "bilan des 10", visits: "10 / 10", cta: "bilan" },
];

function tc(t: "teal" | "lime" | "coral" | "hint") {
  return t === "teal" ? "var(--ls-bbc-teal)" : t === "lime" ? "var(--ls-bbc-lime-text)" : t === "coral" ? "var(--ls-bbc-coral)" : "var(--ls-bbc-hint)";
}
function tbg(t: "teal" | "lime" | "coral" | "hint") {
  return t === "teal" ? "rgba(45,212,191,.12)" : t === "lime" ? "rgba(197,248,42,.12)" : t === "coral" ? "rgba(251,113,133,.12)" : "var(--ls-bbc-s2)";
}

export function BbcClub() {
  const present = POINTAGE.filter((p) => p.cta === "pointé").length;
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 20 }}>
        {/* live */}
        <div style={{ position: "relative", background: "var(--ls-bbc-s1)", border: "1px solid var(--ls-bbc-line)", borderRadius: 20, padding: "22px 24px", overflow: "hidden" }}>
          <div style={{ position: "absolute", top: -40, right: -40, width: 200, height: 200, background: "radial-gradient(circle, rgba(45,212,191,.14), transparent 66%)" }} />
          <div style={{ position: "relative" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, fontFamily: "var(--ls-bbc-font-mono)", fontSize: 11, fontWeight: 600, letterSpacing: "0.14em", color: "var(--ls-bbc-muted)", textTransform: "uppercase" }}>
              <span style={{ width: 7, height: 7, borderRadius: 999, background: "var(--ls-bbc-teal)", boxShadow: "0 0 8px var(--ls-bbc-teal)" }} />en direct · verdun
            </div>
            <div style={{ display: "flex", alignItems: "baseline", gap: 10, marginTop: 14 }}>
              <span style={{ fontFamily: "var(--ls-bbc-font-mono)", fontWeight: 800, fontSize: 56, lineHeight: 0.8, color: "var(--ls-bbc-teal)" }}>{present}</span>
              <span style={{ fontFamily: "var(--ls-bbc-font-mono)", fontWeight: 500, fontSize: 24, color: "var(--ls-bbc-muted)" }}>/ {POINTAGE.length}</span>
            </div>
            <div style={{ fontSize: 13, color: "var(--ls-bbc-muted)", marginTop: 6 }}>présents ce matin · ouverture 7h00</div>
          </div>
        </div>
        {/* scan */}
        <div style={{ background: "var(--ls-bbc-s1)", border: "1px solid var(--ls-bbc-line)", borderRadius: 20, padding: "22px 24px", display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center", gap: 12 }}>
          <div style={{ width: 56, height: 56, borderRadius: 16, background: "var(--ls-bbc-lime)", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="var(--ls-bbc-lime-ink)" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M3 7V5a2 2 0 0 1 2-2h2M17 3h2a2 2 0 0 1 2 2v2M21 17v2a2 2 0 0 1-2 2h-2M7 21H5a2 2 0 0 1-2-2v-2M3 12h18" /></svg>
          </div>
          <div style={{ fontSize: 15, fontWeight: 700, textAlign: "center" }}>scanner un membre</div>
          <div style={{ fontSize: 12, color: "var(--ls-bbc-muted)", textAlign: "center" }}>Il montre son QR, la visite du jour est validée.</div>
        </div>
        {/* alert */}
        <div style={{ background: "rgba(251,113,133,.10)", border: "1px solid rgba(251,113,133,.28)", borderRadius: 20, padding: "22px 24px", display: "flex", flexDirection: "column", gap: 10, justifyContent: "center" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, fontFamily: "var(--ls-bbc-font-mono)", fontSize: 11, fontWeight: 600, letterSpacing: "0.14em", color: "var(--ls-bbc-coral)", textTransform: "uppercase" }}>
            <span style={{ width: 7, height: 7, borderRadius: 999, background: "var(--ls-bbc-coral)", boxShadow: "0 0 8px var(--ls-bbc-coral)" }} />bilan des 10
          </div>
          <div style={{ fontSize: 14, fontWeight: 600 }}>Léa R. a fait ses 10 visites</div>
          <div style={{ fontSize: 12, color: "var(--ls-bbc-muted)" }}>C'est le moment de faire le bilan et de proposer la suite.</div>
          <span style={{ alignSelf: "flex-start", fontSize: 12, fontWeight: 700, color: "var(--ls-bbc-coral)", cursor: "pointer" }}>faire le bilan →</span>
        </div>
      </div>

      {/* pointage grid */}
      <div style={{ background: "var(--ls-bbc-s1)", border: "1px solid var(--ls-bbc-line)", borderRadius: 20, padding: "22px 24px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16, fontFamily: "var(--ls-bbc-font-mono)", fontSize: 11, fontWeight: 600, letterSpacing: "0.14em", color: "var(--ls-bbc-muted)", textTransform: "uppercase" }}>
          <span style={{ width: 7, height: 7, borderRadius: 999, background: "var(--ls-bbc-lime)", boxShadow: "0 0 8px var(--ls-bbc-lime)" }} />pointage du matin
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 14 }}>
          {POINTAGE.map((p) => (
            <div key={p.name} style={{ display: "flex", alignItems: "center", gap: 13, padding: "14px 16px", borderRadius: 14, background: "var(--ls-bbc-s2)", border: "1px solid var(--ls-bbc-line)" }}>
              <span style={{ width: 44, height: 44, borderRadius: 999, flex: "none", background: tbg(p.tone), display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "var(--ls-bbc-font-mono)", fontSize: 13, fontWeight: 700, color: tc(p.tone) }}>{p.ini}</span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 14, fontWeight: 600 }}>{p.name}</div>
                <div style={{ fontSize: 11.5, color: "var(--ls-bbc-muted)" }}>{p.time} · {p.visits}</div>
              </div>
              <span style={{ fontSize: 11, fontWeight: 700, color: tc(p.tone), background: tbg(p.tone), padding: "7px 12px", borderRadius: 10, cursor: "pointer" }}>{p.cta}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
