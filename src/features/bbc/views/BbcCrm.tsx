// =============================================================================
// BbcCrm — pipeline cobayes & membres (port du design, BBC Lot 2).
// Stats + table (statut / cœurs / visites / dernier contact / prochaine action).
// =============================================================================

const STATS: Array<{ label: string; value: string; delta: string; tone: string }> = [
  { label: "nouveaux", value: "6", delta: "+2 aujourd'hui", tone: "var(--ls-bbc-lime)" },
  { label: "cobayes en cours", value: "14", delta: "8 à pointer", tone: "var(--ls-bbc-teal)" },
  { label: "à convertir", value: "5", delta: "bilan des 10", tone: "var(--ls-bbc-coral)" },
  { label: "membres actifs", value: "37", delta: "+4 vs M-1", tone: "var(--ls-bbc-text)" },
];

type Tone = "teal" | "lime" | "coral";
const ROWS: Array<{ name: string; ini: string; status: string; stone: Tone; hearts: string; visits: string; last: string; next: string; ntone: Tone }> = [
  { name: "Sarah M.", ini: "SM", status: "membre", stone: "teal", hearts: "2", visits: "7 / 10", last: "aujourd'hui", next: "relancer palier", ntone: "lime" },
  { name: "Inès L.", ini: "IL", status: "cobaye", stone: "lime", hearts: "2", visits: "3 / 10", last: "aujourd'hui", next: "expliquer junior", ntone: "lime" },
  { name: "Karim D.", ini: "KD", status: "membre", stone: "teal", hearts: "1", visits: "9 / 10", last: "aujourd'hui", next: "carte presque pleine", ntone: "teal" },
  { name: "Léa R.", ini: "LR", status: "à convertir", stone: "coral", hearts: "0", visits: "10 / 10", last: "il y a 2 j", next: "bilan des 10", ntone: "coral" },
  { name: "Paul V.", ini: "PV", status: "nouveau", stone: "lime", hearts: "0", visits: "0 / 10", last: "hier", next: "1er rdv 10h15", ntone: "teal" },
  { name: "Nadia B.", ini: "NB", status: "nouveau", stone: "lime", hearts: "0", visits: "0 / 10", last: "hier", next: "appeler 9h30", ntone: "teal" },
  { name: "Thomas P.", ini: "TP", status: "cobaye", stone: "lime", hearts: "2", visits: "5 / 10", last: "il y a 1 j", next: "relancer palier", ntone: "lime" },
];

function tc(t: Tone) {
  return t === "teal" ? "var(--ls-bbc-teal)" : t === "lime" ? "var(--ls-bbc-lime-text)" : "var(--ls-bbc-coral)";
}
function tbg(t: Tone) {
  return t === "teal" ? "rgba(45,212,191,.12)" : t === "lime" ? "rgba(197,248,42,.12)" : "rgba(251,113,133,.12)";
}

const COLS = "minmax(0,1.6fr) minmax(0,1fr) 52px minmax(0,1fr) minmax(0,1.1fr) minmax(0,1.4fr)";

export function BbcCrm() {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 16 }}>
        {STATS.map((s) => (
          <div key={s.label} style={{ background: "var(--ls-bbc-s1)", border: "1px solid var(--ls-bbc-line)", borderRadius: 16, padding: "18px 20px", borderTop: `2px solid ${s.tone}` }}>
            <div style={{ fontFamily: "var(--ls-bbc-font-mono)", fontSize: 10, fontWeight: 600, letterSpacing: "0.14em", color: "var(--ls-bbc-muted)", textTransform: "uppercase" }}>{s.label}</div>
            <div style={{ fontFamily: "var(--ls-bbc-font-mono)", fontWeight: 800, fontSize: 34, color: s.tone, lineHeight: 1, marginTop: 8 }}>{s.value}</div>
            <div style={{ fontSize: 11.5, color: "var(--ls-bbc-muted)", marginTop: 6 }}>{s.delta}</div>
          </div>
        ))}
      </div>

      <div style={{ background: "var(--ls-bbc-s1)", border: "1px solid var(--ls-bbc-line)", borderRadius: 20, padding: "8px 8px 12px", overflowX: "auto" }}>
        <div style={{ minWidth: 680 }}>
          <div style={{ display: "grid", gridTemplateColumns: COLS, gap: 12, padding: "14px 18px", fontFamily: "var(--ls-bbc-font-mono)", fontSize: 10, fontWeight: 600, letterSpacing: "0.12em", color: "var(--ls-bbc-hint)", textTransform: "uppercase" }}>
            <span>nom</span><span>statut</span><span>cœurs</span><span>visites</span><span>dernier contact</span><span>prochaine action</span>
          </div>
          {ROWS.map((r) => (
            <div key={r.name} style={{ display: "grid", gridTemplateColumns: COLS, gap: 12, alignItems: "center", padding: "13px 18px", borderTop: "1px solid var(--ls-bbc-line)" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 11, minWidth: 0 }}>
                <span style={{ width: 34, height: 34, borderRadius: 999, flex: "none", background: tbg(r.stone), display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "var(--ls-bbc-font-mono)", fontSize: 11, fontWeight: 700, color: tc(r.stone) }}>{r.ini}</span>
                <span style={{ fontSize: 13.5, fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{r.name}</span>
              </div>
              <span><span style={{ display: "inline-block", fontSize: 11, fontWeight: 600, color: tc(r.stone), background: tbg(r.stone), padding: "4px 11px", borderRadius: 999 }}>{r.status}</span></span>
              <span style={{ fontFamily: "var(--ls-bbc-font-mono)", fontSize: 13, fontWeight: 700 }}>{r.hearts}</span>
              <span style={{ fontFamily: "var(--ls-bbc-font-mono)", fontSize: 12.5, color: "var(--ls-bbc-muted)" }}>{r.visits}</span>
              <span style={{ fontSize: 12.5, color: "var(--ls-bbc-muted)" }}>{r.last}</span>
              <span style={{ fontSize: 12.5, fontWeight: 600, color: tc(r.ntone) }}>{r.next}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
