// =============================================================================
// BbcPrelancement — le parcours guidé des 6 semaines avant l'ouverture.
// C'est ce qu'on tend à un nouveau distri : il déroule, il n'invente rien.
// Les 4 portes non négociables décident si le club est prêt à ouvrir.
// =============================================================================

import { useState } from "react";
import { useBbcPrelaunch } from "../useBbcPrelaunch";
import { PRELAUNCH_TASKS, PRELAUNCH_WEEKS } from "../data/bbcPrelaunch";

interface BbcPrelancementProps {
  userId?: string;
  coachName?: string;
}

export function BbcPrelancement({ userId, coachName }: BbcPrelancementProps) {
  const { done, loading, toggle, percent, gatesLeft, readyToOpen, byWeek, currentWeek } = useBbcPrelaunch(userId);
  const [openWeek, setOpenWeek] = useState<number | null>(null);
  const shownWeek = openWeek ?? currentWeek;
  const first = (coachName ?? "").split(/\s+/)[0];

  const gateTasks = PRELAUNCH_TASKS.filter((t) => t.gate);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20, maxWidth: 820 }}>
      {/* Bandeau : prêt à ouvrir ? */}
      <div
        style={{
          position: "relative",
          overflow: "hidden",
          background: readyToOpen ? "rgba(45,212,191,.10)" : "var(--ls-bbc-s1)",
          border: `1px solid ${readyToOpen ? "rgba(45,212,191,.35)" : "rgba(197,248,42,.28)"}`,
          borderRadius: 20,
          padding: "22px 24px",
        }}
      >
        <div style={{ position: "absolute", top: -50, right: -30, width: 220, height: 220, background: `radial-gradient(circle, ${readyToOpen ? "rgba(45,212,191,.16)" : "rgba(197,248,42,.14)"}, transparent 66%)` }} />
        <div style={{ position: "relative" }}>
          <div style={{ fontFamily: "var(--ls-bbc-font-mono)", fontSize: 10.5, letterSpacing: "0.16em", textTransform: "uppercase", color: readyToOpen ? "var(--ls-bbc-teal)" : "var(--ls-bbc-lime-text)", fontWeight: 700 }}>
            {readyToOpen ? "prêt à ouvrir" : "avant d'ouvrir ton club"}
          </div>
          <div style={{ fontFamily: "var(--ls-bbc-font-display)", fontSize: 30, lineHeight: 1.05, marginTop: 6 }}>
            {readyToOpen ? `C'est bon${first ? `, ${first}` : ""} — tu peux ouvrir 🎉` : "6 semaines, pas une de moins"}
          </div>
          <div style={{ fontSize: 12.5, color: "var(--ls-bbc-muted)", marginTop: 6, lineHeight: 1.5, maxWidth: 560 }}>
            {readyToOpen
              ? "Les 4 non-négociables sont cochés. Un club qui ouvre plein reste plein."
              : "Tu ne réinventes rien : tu déroules. Objectif — ouvrir avec une trentaine de membres et un agenda plein d'évaluations."}
          </div>

          {/* progression */}
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 16 }}>
            <div style={{ flex: 1, height: 8, borderRadius: 5, background: "var(--ls-bbc-s2)", overflow: "hidden" }}>
              <div style={{ width: `${percent}%`, height: "100%", background: readyToOpen ? "var(--ls-bbc-teal)" : "var(--ls-bbc-lime)", transition: "width .3s" }} />
            </div>
            <span style={{ fontFamily: "var(--ls-bbc-font-mono)", fontSize: 13, fontWeight: 800, color: readyToOpen ? "var(--ls-bbc-teal)" : "var(--ls-bbc-lime-text)" }}>{percent}%</span>
          </div>

          {/* les 4 portes */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))", gap: 10, marginTop: 16 }}>
            {gateTasks.map((g) => {
              const ok = Boolean(done[g.key]);
              return (
                <div key={g.key} style={{ display: "flex", alignItems: "center", gap: 9, padding: "10px 12px", borderRadius: 12, background: ok ? "rgba(45,212,191,.12)" : "var(--ls-bbc-s2)", border: `1px solid ${ok ? "rgba(45,212,191,.3)" : "var(--ls-bbc-line)"}` }}>
                  <span style={{ width: 20, height: 20, borderRadius: 999, flex: "none", display: "flex", alignItems: "center", justifyContent: "center", background: ok ? "var(--ls-bbc-teal)" : "transparent", border: `1px solid ${ok ? "var(--ls-bbc-teal)" : "var(--ls-bbc-line2)"}`, fontSize: 11, fontWeight: 800, color: ok ? "#052620" : "var(--ls-bbc-hint)" }}>
                    {ok ? "✓" : "🔒"}
                  </span>
                  <span style={{ flex: 1, fontSize: 11.5, fontWeight: 600, color: ok ? "var(--ls-bbc-text)" : "var(--ls-bbc-muted)", lineHeight: 1.3 }}>{g.title}</span>
                </div>
              );
            })}
          </div>
          {!readyToOpen ? (
            <div style={{ fontFamily: "var(--ls-bbc-font-mono)", fontSize: 10.5, color: "var(--ls-bbc-hint)", marginTop: 10 }}>
              {gatesLeft.length} non-négociable{gatesLeft.length > 1 ? "s" : ""} restant{gatesLeft.length > 1 ? "s" : ""}
            </div>
          ) : null}
        </div>
      </div>

      {/* Les 6 semaines */}
      {loading ? (
        <div style={{ fontSize: 12.5, color: "var(--ls-bbc-hint)" }}>chargement…</div>
      ) : (
        PRELAUNCH_WEEKS.map((w) => {
          const stat = byWeek[w.week] ?? { done: 0, total: 0 };
          const complete = stat.done === stat.total && stat.total > 0;
          const isOpen = shownWeek === w.week;
          const tasks = PRELAUNCH_TASKS.filter((t) => t.week === w.week);
          return (
            <div key={w.week} style={{ background: "var(--ls-bbc-s1)", border: `1px solid ${isOpen ? "rgba(197,248,42,.28)" : "var(--ls-bbc-line)"}`, borderRadius: 20, overflow: "hidden" }}>
              <button
                type="button"
                onClick={() => setOpenWeek(isOpen ? -1 : w.week)}
                style={{ display: "flex", alignItems: "center", gap: 14, width: "100%", background: "transparent", border: 0, cursor: "pointer", textAlign: "left", padding: "18px 20px", color: "var(--ls-bbc-text)" }}
              >
                <span style={{ width: 42, height: 42, borderRadius: 13, flex: "none", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "var(--ls-bbc-font-mono)", fontWeight: 800, fontSize: 16, background: complete ? "rgba(45,212,191,.14)" : isOpen ? "rgba(197,248,42,.14)" : "var(--ls-bbc-s2)", border: `1px solid ${complete ? "var(--ls-bbc-teal)" : isOpen ? "var(--ls-bbc-lime)" : "var(--ls-bbc-line)"}`, color: complete ? "var(--ls-bbc-teal)" : isOpen ? "var(--ls-bbc-lime)" : "var(--ls-bbc-hint)" }}>
                  {complete ? "✓" : w.week}
                </span>
                <span style={{ flex: 1, minWidth: 0 }}>
                  <span style={{ display: "block", fontSize: 15, fontWeight: 700 }}>{w.title}</span>
                  <span style={{ display: "block", fontSize: 12, color: "var(--ls-bbc-muted)", marginTop: 2 }}>{w.subtitle}</span>
                </span>
                <span style={{ fontFamily: "var(--ls-bbc-font-mono)", fontSize: 12, color: complete ? "var(--ls-bbc-teal)" : "var(--ls-bbc-hint)", flex: "none" }}>
                  {stat.done}/{stat.total}
                </span>
                <span aria-hidden="true" style={{ fontSize: 12, color: "var(--ls-bbc-hint)", transform: isOpen ? "rotate(180deg)" : "none", transition: "transform .15s" }}>▾</span>
              </button>

              {isOpen ? (
                <div style={{ padding: "0 20px 16px" }}>
                  {tasks.map((t) => {
                    const ok = Boolean(done[t.key]);
                    return (
                      <button
                        key={t.key}
                        type="button"
                        onClick={() => void toggle(t.key)}
                        style={{ display: "flex", alignItems: "flex-start", gap: 12, width: "100%", textAlign: "left", cursor: "pointer", padding: "12px 14px", borderRadius: 13, marginBottom: 8, background: ok ? "rgba(197,248,42,.07)" : "var(--ls-bbc-s2)", border: `1px solid ${ok ? "rgba(197,248,42,.28)" : "var(--ls-bbc-line)"}`, color: "var(--ls-bbc-text)" }}
                      >
                        <span style={{ width: 24, height: 24, borderRadius: 999, flex: "none", display: "flex", alignItems: "center", justifyContent: "center", background: ok ? "var(--ls-bbc-lime)" : "transparent", border: `1px solid ${ok ? "var(--ls-bbc-lime)" : "var(--ls-bbc-line2)"}`, fontSize: 12, fontWeight: 800, color: ok ? "var(--ls-bbc-lime-ink)" : "transparent" }}>
                          ✓
                        </span>
                        <span style={{ flex: 1, minWidth: 0 }}>
                          <span style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                            <span style={{ fontSize: 13.5, fontWeight: 600 }}>{t.title}</span>
                            {t.gate ? (
                              <span style={{ fontFamily: "var(--ls-bbc-font-mono)", fontSize: 9, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--ls-bbc-coral)", background: "rgba(251,113,133,.12)", border: "1px solid rgba(251,113,133,.3)", padding: "2px 7px", borderRadius: 999 }}>
                                non négociable
                              </span>
                            ) : null}
                          </span>
                          <span style={{ display: "block", fontSize: 11.5, color: "var(--ls-bbc-muted)", marginTop: 3, lineHeight: 1.45 }}>{t.why}</span>
                        </span>
                      </button>
                    );
                  })}
                </div>
              ) : null}
            </div>
          );
        })
      )}

      <div style={{ fontFamily: "var(--ls-bbc-font-mono)", fontSize: 10, color: "var(--ls-bbc-hint)", textAlign: "center" }}>
        parcours officiel · module Formation 07
      </div>
    </div>
  );
}
