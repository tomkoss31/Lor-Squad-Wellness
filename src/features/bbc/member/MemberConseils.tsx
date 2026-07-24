// =============================================================================
// MemberConseils — onglet Conseils de l'app membre BBC (port du design).
// Mot du coach (réel : coach_advice) · assiette idéale · routine du jour.
// Assiette + routine = repères config (personnalisables plus tard).
// =============================================================================

interface MemberConseilsProps {
  coachAdvice?: string | null;
  coachName?: string;
}

const PLATE: Array<{ label: string; pct: string; color: string }> = [
  { label: "protéines", pct: "40 %", color: "var(--ls-bbc-lime)" },
  { label: "légumes", pct: "30 %", color: "var(--ls-bbc-teal)" },
  { label: "féculents", pct: "18 %", color: "var(--ls-bbc-violet, #a78bfa)" },
  { label: "bons gras", pct: "12 %", color: "var(--ls-bbc-coral)" },
];

const ROUTINE: Array<{ label: string; time: string; done: boolean }> = [
  { label: "shake du matin au club", time: "7h", done: true },
  { label: "2 L d'eau dans la journée", time: "toute la journée", done: true },
  { label: "10 000 pas", time: "objectif", done: false },
  { label: "collation protéinée", time: "16h", done: false },
];

export function MemberConseils({ coachAdvice, coachName }: MemberConseilsProps) {
  const coach = (coachName ?? "").split(/\s+/)[0] || "ton coach";
  const initials = ((coach[0] ?? "") + (coach[1] ?? "")).toUpperCase();

  return (
    <>
      {/* mot du coach */}
      <div style={{ background: "var(--ls-bbc-s1)", border: "1px solid var(--ls-bbc-line)", borderLeft: "3px solid var(--ls-bbc-teal)", borderRadius: 16, padding: 16 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
          <div style={{ width: 36, height: 36, borderRadius: "50%", background: "linear-gradient(140deg, var(--ls-bbc-teal), var(--ls-bbc-lime))", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "var(--ls-bbc-font-display)", fontSize: 13, color: "#04201b", flex: "none" }}>{initials}</div>
          <div><div style={{ fontSize: 13, fontWeight: 700 }}>le mot de {coach}</div><div style={{ fontFamily: "var(--ls-bbc-font-mono)", fontSize: 10, color: "var(--ls-bbc-muted)" }}>ton coach</div></div>
        </div>
        <div style={{ fontSize: 13.5, lineHeight: 1.55, color: coachAdvice ? "var(--ls-bbc-text)" : "var(--ls-bbc-muted)" }}>
          {coachAdvice && coachAdvice.trim() ? coachAdvice : "ton coach t'ajoutera bientôt un conseil personnalisé ici."}
        </div>
      </div>

      {/* assiette idéale */}
      <div style={{ background: "var(--ls-bbc-s1)", border: "1px solid var(--ls-bbc-line)", borderRadius: 18, padding: 18 }}>
        <div style={{ display: "inline-flex", alignItems: "center", gap: 8, fontFamily: "var(--ls-bbc-font-mono)", fontSize: 10, fontWeight: 600, letterSpacing: "0.14em", color: "var(--ls-bbc-muted)", textTransform: "uppercase", marginBottom: 14 }}>
          <span style={{ width: 7, height: 7, borderRadius: 999, background: "var(--ls-bbc-lime)", boxShadow: "0 0 8px var(--ls-bbc-lime)" }} />ton assiette idéale
        </div>
        <div style={{ display: "flex", gap: 18, alignItems: "center" }}>
          <div style={{ width: 120, height: 120, borderRadius: "50%", flex: "none", background: "conic-gradient(var(--ls-bbc-lime) 0 40%, var(--ls-bbc-teal) 40% 70%, var(--ls-bbc-violet, #a78bfa) 70% 88%, var(--ls-bbc-coral) 88% 100%)", position: "relative" }}>
            <div style={{ position: "absolute", inset: 26, borderRadius: "50%", background: "var(--ls-bbc-s1)" }} />
          </div>
          <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 9 }}>
            {PLATE.map((p) => (
              <div key={p.label} style={{ display: "flex", alignItems: "center", gap: 9 }}>
                <span style={{ width: 11, height: 11, borderRadius: 3, background: p.color, flex: "none" }} />
                <span style={{ flex: 1, fontSize: 12.5, fontWeight: 500 }}>{p.label}</span>
                <span style={{ fontFamily: "var(--ls-bbc-font-mono)", fontSize: 12, fontWeight: 700, color: "var(--ls-bbc-muted)" }}>{p.pct}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* routine */}
      <div style={{ background: "var(--ls-bbc-s1)", border: "1px solid var(--ls-bbc-line)", borderRadius: 18, padding: 18 }}>
        <div style={{ display: "inline-flex", alignItems: "center", gap: 8, fontFamily: "var(--ls-bbc-font-mono)", fontSize: 10, fontWeight: 600, letterSpacing: "0.14em", color: "var(--ls-bbc-muted)", textTransform: "uppercase", marginBottom: 6 }}>
          <span style={{ width: 7, height: 7, borderRadius: 999, background: "var(--ls-bbc-teal)", boxShadow: "0 0 8px var(--ls-bbc-teal)" }} />ta routine du jour
        </div>
        {ROUTINE.map((r) => (
          <div key={r.label} style={{ display: "flex", alignItems: "center", gap: 12, padding: "11px 0", borderTop: "1px solid var(--ls-bbc-line)" }}>
            <span style={{ width: 26, height: 26, borderRadius: 999, flex: "none", display: "flex", alignItems: "center", justifyContent: "center", background: r.done ? "var(--ls-bbc-lime)" : "transparent", border: `1px solid ${r.done ? "var(--ls-bbc-lime)" : "var(--ls-bbc-line2)"}` }}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke={r.done ? "var(--ls-bbc-lime-ink)" : "var(--ls-bbc-muted)"} strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round"><path d={r.done ? "M20 6 9 17l-5-5" : "M12 7v5l3 2M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18z"} /></svg>
            </span>
            <span style={{ flex: 1, fontSize: 13, fontWeight: 600, color: r.done ? "var(--ls-bbc-text)" : "var(--ls-bbc-muted)" }}>{r.label}</span>
            <span style={{ fontFamily: "var(--ls-bbc-font-mono)", fontSize: 11, color: "var(--ls-bbc-muted)" }}>{r.time}</span>
          </div>
        ))}
      </div>
    </>
  );
}
