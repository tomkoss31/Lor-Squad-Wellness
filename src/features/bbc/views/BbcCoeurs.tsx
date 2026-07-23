// =============================================================================
// BbcCoeurs — le système de cœurs (port du design, BBC Lot 2).
// Un cœur = 1 personne recommandée qui a démarré. Barème officiel Playbook.
// =============================================================================

const TIERS: Array<{ n: string; label: string; reward: string; tone: "hint" | "teal" | "lime"; reached: boolean }> = [
  { n: "1", label: "1 filleul", reward: "1 cœur = 1 personne qui rejoint le club", tone: "hint", reached: true },
  { n: "2", label: "compte ambassadeur", reward: "25% de remise + 2-3 recommandations", tone: "teal", reached: true },
  { n: "3", label: "10 visites offertes", reward: "débloque le statut coach stagiaire", tone: "lime", reached: false },
  { n: "5", label: "30 visites offertes", reward: "membre ambassadeur du club", tone: "lime", reached: false },
];

const MEMBERS: Array<{ name: string; ini: string; hearts: number; next: string; tone: "lime" | "teal" | "hint" }> = [
  { name: "Inès L.", ini: "IL", hearts: 2, next: "à 1 cœur des 10 visites", tone: "lime" },
  { name: "Sarah M.", ini: "SM", hearts: 2, next: "à 1 cœur des 10 visites", tone: "lime" },
  { name: "Karim D.", ini: "KD", hearts: 3, next: "10 visites débloquées 🔥", tone: "teal" },
  { name: "Nadia B.", ini: "NB", hearts: 1, next: "à 1 cœur du compte ambassadeur", tone: "hint" },
  { name: "Léa R.", ini: "LR", hearts: 0, next: "pas encore de cœur", tone: "hint" },
];

const AGENDA: Array<{ day: string; time: string; label: string; who: string; tone: "lime" | "teal" }> = [
  { day: "mardi", time: "20h00", label: "atelier des cœurs", who: "3 membres attendus", tone: "lime" },
  { day: "samedi", time: "20h00", label: "atelier des cœurs", who: "2 membres attendus", tone: "lime" },
  { day: "lundi", time: "20h00", label: "appel ambassadeur", who: "tri A · B · C · D", tone: "teal" },
];

function toneColor(t: "lime" | "teal" | "hint") {
  return t === "lime" ? "var(--ls-bbc-lime-text)" : t === "teal" ? "var(--ls-bbc-teal)" : "var(--ls-bbc-hint)";
}
function toneBg(t: "lime" | "teal" | "hint") {
  return t === "lime" ? "rgba(197,248,42,.12)" : t === "teal" ? "rgba(45,212,191,.12)" : "var(--ls-bbc-s2)";
}

function Eye({ children, right }: { children: string; right?: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
      <span style={{ width: 7, height: 7, borderRadius: 999, background: "var(--ls-bbc-lime)", boxShadow: "0 0 8px var(--ls-bbc-lime)", flex: "none" }} />
      <span style={{ flex: 1, fontFamily: "var(--ls-bbc-font-mono)", fontSize: 11, fontWeight: 600, letterSpacing: "0.14em", color: "var(--ls-bbc-muted)", textTransform: "uppercase" }}>{children}</span>
      {right ? <span style={{ fontFamily: "var(--ls-bbc-font-mono)", fontSize: 11, color: "var(--ls-bbc-hint)" }}>{right}</span> : null}
    </div>
  );
}

const HEART_PATH = "M12 20.3S4.6 15.7 2.6 11.3C1.4 8.7 2.9 5.6 6 5.6c1.9 0 3.2 1.2 4 2.2.8-1 2.1-2.2 4-2.2 3.1 0 4.6 3.1 3.4 5.7C19.4 15.7 12 20.3 12 20.3z";

export function BbcCoeurs() {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      {/* tiers */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 16 }}>
        {TIERS.map((t) => (
          <div key={t.n} style={{ background: "var(--ls-bbc-s1)", border: "1px solid var(--ls-bbc-line)", borderTop: `2px solid ${toneColor(t.tone)}`, borderRadius: 18, padding: "18px 18px 16px" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
              <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill={toneColor(t.tone)} aria-hidden="true"><path d={HEART_PATH} /></svg>
                <span style={{ fontFamily: "var(--ls-bbc-font-mono)", fontWeight: 800, fontSize: 22, color: toneColor(t.tone) }}>{t.n}</span>
              </span>
              <span style={{ fontFamily: "var(--ls-bbc-font-mono)", fontSize: 9.5, letterSpacing: "0.1em", textTransform: "uppercase", color: t.reached ? "var(--ls-bbc-teal)" : "var(--ls-bbc-hint)" }}>{t.reached ? "atteint" : "à venir"}</span>
            </div>
            <div style={{ fontSize: 13.5, fontWeight: 700 }}>{t.label}</div>
            <div style={{ fontSize: 11.5, color: "var(--ls-bbc-muted)", marginTop: 4, lineHeight: 1.4 }}>{t.reward}</div>
          </div>
        ))}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1.5fr) minmax(0, 1fr)", gap: 20, alignItems: "start" }} className="bbc-coeurs-grid">
        {/* mur des cœurs */}
        <div style={{ background: "var(--ls-bbc-s1)", border: "1px solid var(--ls-bbc-line)", borderRadius: 20, padding: "22px 24px" }}>
          <Eye>le mur des cœurs · verdun</Eye>
          <div style={{ fontSize: 12, color: "var(--ls-bbc-muted)", marginBottom: 14 }}>Qui est à un cœur d'un palier — c'est là que se fabriquent les coachs.</div>
          {MEMBERS.map((m) => (
            <div key={m.name} style={{ display: "flex", alignItems: "center", gap: 14, padding: "13px 0", borderTop: "1px solid var(--ls-bbc-line)" }}>
              <span style={{ width: 40, height: 40, borderRadius: 999, flex: "none", background: toneBg(m.tone), display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "var(--ls-bbc-font-mono)", fontSize: 12, fontWeight: 700, color: toneColor(m.tone) }}>{m.ini}</span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 14, fontWeight: 600 }}>{m.name}</div>
                <div style={{ fontSize: 11.5, color: toneColor(m.tone) }}>{m.next}</div>
              </div>
              <div style={{ display: "flex", gap: 5 }}>
                {[1, 2, 3, 4, 5].map((i) => (
                  <svg key={i} width="15" height="15" viewBox="0 0 24 24" fill={i <= m.hearts ? toneColor(m.tone) : "var(--ls-bbc-s2)"} aria-hidden="true"><path d={HEART_PATH} /></svg>
                ))}
              </div>
              {m.hearts === 2 ? (
                <span style={{ fontSize: 11, fontWeight: 700, color: "var(--ls-bbc-lime-ink)", background: "var(--ls-bbc-lime)", padding: "7px 13px", borderRadius: 10, cursor: "pointer" }}>relancer</span>
              ) : null}
            </div>
          ))}
        </div>

        {/* agenda + formule */}
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          <div style={{ background: "var(--ls-bbc-s1)", border: "1px solid var(--ls-bbc-line)", borderRadius: 20, padding: "22px 24px" }}>
            <Eye>les rendez-vous cœurs</Eye>
            {AGENDA.map((a) => (
              <div key={a.day + a.label} style={{ display: "flex", alignItems: "center", gap: 13, padding: "12px 0", borderTop: "1px solid var(--ls-bbc-line)" }}>
                <div style={{ width: 52, flex: "none" }}>
                  <div style={{ fontSize: 12.5, fontWeight: 700, color: toneColor(a.tone), textTransform: "capitalize" }}>{a.day}</div>
                  <div style={{ fontFamily: "var(--ls-bbc-font-mono)", fontSize: 11, color: "var(--ls-bbc-muted)" }}>{a.time}</div>
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 600 }}>{a.label}</div>
                  <div style={{ fontSize: 11, color: "var(--ls-bbc-muted)" }}>{a.who}</div>
                </div>
              </div>
            ))}
          </div>
          <div style={{ background: "rgba(45,212,191,.08)", border: "1px solid rgba(45,212,191,.26)", borderRadius: 18, padding: "16px 18px" }}>
            <div style={{ fontFamily: "var(--ls-bbc-font-mono)", fontSize: 10, fontWeight: 600, letterSpacing: "0.14em", color: "var(--ls-bbc-teal)", textTransform: "uppercase", marginBottom: 8 }}>la formule</div>
            <div style={{ fontSize: 15, fontWeight: 600, lineHeight: 1.4 }}>relation + résultat = recommandation</div>
            <div style={{ fontSize: 11.5, color: "var(--ls-bbc-muted)", marginTop: 6, lineHeight: 1.5 }}>S'il manque l'un des deux, il n'y a pas de cœur. On demande à chaque étape, jamais « ça t'intéresse ? » mais « qui connais-tu ? ».</div>
          </div>
        </div>
      </div>
    </div>
  );
}
