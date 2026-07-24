// =============================================================================
// BbcCoeurs — le système de cœurs, DONNÉES RÉELLES (chantier BBC).
// Barème (config) + « à valider » (le coach confirme qu'une reco a démarré =
// 1 cœur) + « mur des cœurs » (membres réels + progression palier) via
// useBbcHearts / client_referrals. Agenda + formule = repères (config).
// =============================================================================

import { useBbcHearts, nextPalier } from "../useBbcHearts";

const TIERS: Array<{ n: string; label: string; reward: string; tone: "hint" | "teal" | "lime" }> = [
  { n: "1", label: "1 filleul", reward: "1 cœur = 1 personne qui rejoint le club", tone: "hint" },
  { n: "2", label: "compte ambassadeur", reward: "25% de remise + 2-3 recommandations", tone: "teal" },
  { n: "3", label: "10 visites offertes", reward: "débloque le statut coach stagiaire", tone: "lime" },
  { n: "5", label: "30 visites offertes", reward: "membre ambassadeur du club", tone: "lime" },
];

const AGENDA: Array<{ day: string; time: string; label: string; who: string; tone: "lime" | "teal" }> = [
  { day: "mardi", time: "20h00", label: "atelier des cœurs", who: "aider à trouver ses 2 cœurs", tone: "lime" },
  { day: "samedi", time: "20h00", label: "atelier des cœurs", who: "aider à trouver ses 2 cœurs", tone: "lime" },
  { day: "lundi", time: "20h00", label: "appel ambassadeur", who: "tri A · B · C · D", tone: "teal" },
];

const HEART_PATH = "M12 20.3S4.6 15.7 2.6 11.3C1.4 8.7 2.9 5.6 6 5.6c1.9 0 3.2 1.2 4 2.2.8-1 2.1-2.2 4-2.2 3.1 0 4.6 3.1 3.4 5.7C19.4 15.7 12 20.3 12 20.3z";

function toneColor(t: "lime" | "teal" | "hint") {
  return t === "lime" ? "var(--ls-bbc-lime-text)" : t === "teal" ? "var(--ls-bbc-teal)" : "var(--ls-bbc-hint)";
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

interface BbcCoeursProps {
  userId?: string;
}

export function BbcCoeurs({ userId }: BbcCoeursProps) {
  const { members, pending, loading, validate } = useBbcHearts(userId);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      {/* barème (config) */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 16 }}>
        {TIERS.map((t) => (
          <div key={t.n} style={{ background: "var(--ls-bbc-s1)", border: "1px solid var(--ls-bbc-line)", borderTop: `2px solid ${toneColor(t.tone)}`, borderRadius: 18, padding: "18px 18px 16px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill={toneColor(t.tone)} aria-hidden="true"><path d={HEART_PATH} /></svg>
              <span style={{ fontFamily: "var(--ls-bbc-font-mono)", fontWeight: 800, fontSize: 22, color: toneColor(t.tone) }}>{t.n}</span>
            </div>
            <div style={{ fontSize: 13.5, fontWeight: 700 }}>{t.label}</div>
            <div style={{ fontSize: 11.5, color: "var(--ls-bbc-muted)", marginTop: 4, lineHeight: 1.4 }}>{t.reward}</div>
          </div>
        ))}
      </div>

      {/* À valider (reco saisie par le membre → le coach confirme le démarrage) */}
      {pending.length > 0 ? (
        <div style={{ background: "var(--ls-bbc-s1)", border: "1px solid rgba(197,248,42,.32)", borderRadius: 20, padding: "20px 24px" }}>
          <Eye right={`${pending.length} à valider`}>recos à valider</Eye>
          <div style={{ fontSize: 12, color: "var(--ls-bbc-muted)", marginBottom: 12 }}>Un cœur ne compte que si la personne a <b style={{ color: "var(--ls-bbc-text)" }}>démarré</b>. Confirme.</div>
          {pending.map((p) => (
            <div key={p.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 0", borderTop: "1px solid var(--ls-bbc-line)", flexWrap: "wrap" }}>
              <div style={{ flex: 1, minWidth: 160 }}>
                <div style={{ fontSize: 13.5, fontWeight: 600 }}>{p.referredName || "—"}</div>
                <div style={{ fontSize: 11.5, color: "var(--ls-bbc-muted)" }}>recommandé·e par {p.fromClientName}{p.referredContact ? ` · ${p.referredContact}` : ""}</div>
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <button type="button" onClick={() => void validate(p.id, true)} style={{ border: 0, cursor: "pointer", fontSize: 11.5, fontWeight: 700, padding: "8px 13px", borderRadius: 10, background: "var(--ls-bbc-lime)", color: "var(--ls-bbc-lime-ink)" }}>a démarré ❤️</button>
                <button type="button" onClick={() => void validate(p.id, false)} style={{ border: "1px solid var(--ls-bbc-line2)", cursor: "pointer", fontSize: 11.5, fontWeight: 600, padding: "8px 13px", borderRadius: 10, background: "transparent", color: "var(--ls-bbc-muted)" }}>pas encore</button>
              </div>
            </div>
          ))}
        </div>
      ) : null}

      {/* Mur des cœurs (réel) */}
      <div style={{ background: "var(--ls-bbc-s1)", border: "1px solid var(--ls-bbc-line)", borderRadius: 20, padding: "22px 24px" }}>
        <Eye>le mur des cœurs</Eye>
        <div style={{ fontSize: 12, color: "var(--ls-bbc-muted)", marginBottom: 14 }}>Qui est à un cœur d'un palier — c'est là que se fabriquent les coachs.</div>
        {loading ? (
          <div style={{ fontSize: 12.5, color: "var(--ls-bbc-hint)", padding: "12px 0" }}>chargement…</div>
        ) : members.length === 0 ? (
          <div style={{ fontSize: 12.5, color: "var(--ls-bbc-hint)", padding: "12px 0" }}>
            Aucun cœur pour l'instant. Les recos saisies par tes membres (app membre → Recommander) apparaîtront ici à valider.
          </div>
        ) : (
          members.map((m) => {
            const np = nextPalier(m.hearts);
            const atOne = np !== null && np - m.hearts === 1;
            return (
              <div key={m.key} style={{ display: "flex", alignItems: "center", gap: 14, padding: "13px 0", borderTop: "1px solid var(--ls-bbc-line)" }}>
                <span style={{ width: 40, height: 40, borderRadius: 999, flex: "none", background: atOne ? "rgba(197,248,42,.12)" : "var(--ls-bbc-s2)", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "var(--ls-bbc-font-mono)", fontSize: 12, fontWeight: 700, color: atOne ? "var(--ls-bbc-lime-text)" : "var(--ls-bbc-muted)" }}>
                  {(m.name[0] ?? "?").toUpperCase()}
                </span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 14, fontWeight: 600 }}>{m.name}</div>
                  <div style={{ fontSize: 11.5, color: atOne ? "var(--ls-bbc-lime-text)" : "var(--ls-bbc-muted)" }}>
                    {np === null ? "palier max atteint 🔥" : atOne ? `à 1 cœur du palier ${np}` : `${m.hearts} / ${np} vers le prochain palier`}
                  </div>
                </div>
                <div style={{ display: "flex", gap: 5 }}>
                  {[1, 2, 3, 4, 5].map((i) => (
                    <svg key={i} width="15" height="15" viewBox="0 0 24 24" fill={i <= m.hearts ? "var(--ls-bbc-lime)" : "var(--ls-bbc-s2)"} aria-hidden="true"><path d={HEART_PATH} /></svg>
                  ))}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* agenda + formule (repères config) */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 20 }}>
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
        <div style={{ background: "rgba(45,212,191,.08)", border: "1px solid rgba(45,212,191,.26)", borderRadius: 18, padding: "16px 18px", alignSelf: "start" }}>
          <div style={{ fontFamily: "var(--ls-bbc-font-mono)", fontSize: 10, fontWeight: 600, letterSpacing: "0.14em", color: "var(--ls-bbc-teal)", textTransform: "uppercase", marginBottom: 8 }}>la formule</div>
          <div style={{ fontSize: 15, fontWeight: 600, lineHeight: 1.4 }}>relation + résultat = recommandation</div>
          <div style={{ fontSize: 11.5, color: "var(--ls-bbc-muted)", marginTop: 6, lineHeight: 1.5 }}>S'il manque l'un des deux, il n'y a pas de cœur. On demande à chaque étape, jamais « ça t'intéresse ? » mais « qui connais-tu ? ».</div>
        </div>
      </div>
    </div>
  );
}
