// =============================================================================
// BbcClubs — le réseau de clubs (port du design, BBC Lot 5).
// Cartes clubs + « dupliquer un club » = la duplication rendue visible.
// =============================================================================

const CLUBS: Array<{ name: string; city: string; pv: string; cob: string; members: string; tone: string; live: boolean }> = [
  { name: "Verdun", city: "Lyon 7e", pv: "8 420", cob: "14", members: "37", tone: "var(--ls-bbc-lime)", live: true },
  { name: "Confluence", city: "Lyon 2e", pv: "5 110", cob: "9", members: "24", tone: "var(--ls-bbc-teal)", live: false },
];

export function BbcClubs() {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 20 }}>
      {CLUBS.map((c) => (
        <div key={c.name} style={{ background: "var(--ls-bbc-s1)", border: `1px solid ${c.live ? c.tone : "var(--ls-bbc-line)"}`, borderRadius: 20, padding: 24, display: "flex", flexDirection: "column", gap: 16 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div style={{ width: 44, height: 44, borderRadius: 13, background: c.tone, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "var(--ls-bbc-font-display)", fontSize: 19, color: "var(--ls-bbc-lime-ink)" }}>B</div>
            <span style={{ display: "flex", alignItems: "center", gap: 6, fontFamily: "var(--ls-bbc-font-mono)", fontSize: 11, textTransform: "uppercase", letterSpacing: "0.1em", color: c.live ? "var(--ls-bbc-teal)" : "var(--ls-bbc-hint)" }}>
              <span style={{ width: 7, height: 7, borderRadius: 999, background: c.live ? "var(--ls-bbc-teal)" : "var(--ls-bbc-hint)", boxShadow: c.live ? "0 0 7px var(--ls-bbc-teal)" : "none" }} />{c.live ? "ouvert · 7h-11h" : "fermé"}
            </span>
          </div>
          <div>
            <div style={{ fontFamily: "var(--ls-bbc-font-display)", fontSize: 24, letterSpacing: "0.01em" }}>{c.name}</div>
            <div style={{ fontSize: 12.5, color: "var(--ls-bbc-muted)", marginTop: 2 }}>{c.city}</div>
          </div>
          <div style={{ display: "flex", gap: 20, paddingTop: 14, borderTop: "1px solid var(--ls-bbc-line)" }}>
            {[
              { v: c.cob, l: "cobayes", c: "var(--ls-bbc-lime-text)" },
              { v: c.members, l: "membres", c: "var(--ls-bbc-text)" },
              { v: c.pv, l: "pv du mois", c: "var(--ls-bbc-text)" },
            ].map((s) => (
              <div key={s.l}>
                <div style={{ fontFamily: "var(--ls-bbc-font-mono)", fontWeight: 800, fontSize: 22, color: s.c, lineHeight: 1 }}>{s.v}</div>
                <div style={{ fontSize: 10.5, color: "var(--ls-bbc-hint)", marginTop: 4 }}>{s.l}</div>
              </div>
            ))}
          </div>
        </div>
      ))}
      {/* dupliquer */}
      <div style={{ border: "1.5px dashed var(--ls-bbc-line2)", borderRadius: 20, padding: 24, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 12, textAlign: "center" }}>
        <div style={{ width: 48, height: 48, borderRadius: 14, background: "var(--ls-bbc-s1)", border: "1px solid var(--ls-bbc-line)", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--ls-bbc-lime)" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M12 5v14M5 12h14" /></svg>
        </div>
        <div style={{ fontSize: 14, fontWeight: 700 }}>dupliquer un club</div>
        <div style={{ fontSize: 11.5, color: "var(--ls-bbc-muted)", maxWidth: 200 }}>Le modèle BBC, prêt à ouvrir sur un nouveau site.</div>
      </div>
    </div>
  );
}
