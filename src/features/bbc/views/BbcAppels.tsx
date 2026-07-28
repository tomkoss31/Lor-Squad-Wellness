// =============================================================================
// BbcAppels — les rituels du club : inscriptions, présence, « patate chaude ».
// Occurrences calculées depuis la config du club. Après l'appel : on pointe qui
// était là, puis on fait le suivi 10 min (règle de la patate chaude, module 06).
// =============================================================================

import { useState, type CSSProperties } from "react";
import { useBbcCalls } from "../useBbcCalls";
import { useBbcVisits } from "../useBbcVisits";
import type { NextCall } from "../data/bbcCalls";
import type { Club } from "../../../types/domain";

interface BbcAppelsProps {
  userId?: string;
  club?: Club | null;
}

function fmtDay(d: Date) {
  return d.toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "short" });
}
function fmtTime(d: Date) {
  return d.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
}

export function BbcAppels({ userId, club }: BbcAppelsProps) {
  const { nextCalls, forOccurrence, toProcess, loading, register, unregister, setAttendance, markFollowUp } = useBbcCalls(userId, club?.settings);
  const { members } = useBbcVisits(userId);
  const [pickFor, setPickFor] = useState<NextCall | null>(null);

  // Une occurrence par rituel (la plus proche), pour ne pas noyer l'écran.
  const upcoming = nextCalls.filter((c, i, arr) => arr.findIndex((x) => x.key === c.key) === i).slice(0, 3);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20, maxWidth: 780 }}>
      {/* à traiter : présence + patate chaude */}
      {toProcess.length > 0 ? (
        <div style={{ background: "rgba(251,113,133,.08)", border: "1px solid rgba(251,113,133,.26)", borderRadius: 20, padding: "18px 20px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4, fontFamily: "var(--ls-bbc-font-mono)", fontSize: 11, fontWeight: 600, letterSpacing: "0.14em", color: "var(--ls-bbc-coral)", textTransform: "uppercase" }}>
            <span style={{ width: 7, height: 7, borderRadius: 999, background: "var(--ls-bbc-coral)", boxShadow: "0 0 8px var(--ls-bbc-coral)" }} />à traiter après l'appel
          </div>
          <div style={{ fontSize: 12, color: "var(--ls-bbc-muted)", marginBottom: 10 }}>
            Pointe qui était là, puis fais le suivi dans les 10 minutes — c'est là que ça se joue.
          </div>
          {toProcess.map((r) => (
            <div key={r.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 0", borderTop: "1px solid var(--ls-bbc-line)", flexWrap: "wrap" }}>
              <div style={{ flex: 1, minWidth: 150 }}>
                <div style={{ fontSize: 13.5, fontWeight: 600 }}>{r.clientName}</div>
                <div style={{ fontSize: 11.5, color: "var(--ls-bbc-muted)" }}>
                  {fmtDay(new Date(r.scheduledAt))} · {fmtTime(new Date(r.scheduledAt))}
                </div>
              </div>
              {r.attended === null ? (
                <div style={{ display: "flex", gap: 8 }}>
                  <button type="button" onClick={() => void setAttendance(r.id, true)} style={btnFilled}>était là</button>
                  <button type="button" onClick={() => void setAttendance(r.id, false)} style={btnGhost}>absent</button>
                </div>
              ) : r.attended && !r.followedUpAt ? (
                <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                  <button type="button" onClick={() => void markFollowUp(r.id)} style={{ ...btnFilled, background: "var(--ls-bbc-teal)", color: "#052620" }}>
                    suivi 10 min fait
                  </button>
                  <button type="button" onClick={() => void setAttendance(r.id, null)} style={btnGhost} title="Repointer cette présence">
                    corriger
                  </button>
                </div>
              ) : (
                /* Pointé « absent » ou suivi déjà fait : reste corrigeable la
                   journée, sinon une erreur de pointage était définitive. */
                <button type="button" onClick={() => void setAttendance(r.id, null)} style={btnGhost} title="Repointer cette présence">
                  corriger
                </button>
              )}
            </div>
          ))}
        </div>
      ) : null}

      {/* prochaines occurrences */}
      {loading ? (
        <div style={{ fontSize: 12.5, color: "var(--ls-bbc-hint)" }}>chargement…</div>
      ) : (
        upcoming.map((c) => {
          const inscrits = forOccurrence(c.key, c.at);
          return (
            <div key={c.key} style={{ background: "var(--ls-bbc-s1)", border: `1px solid ${c.isToday ? "rgba(197,248,42,.32)" : "var(--ls-bbc-line)"}`, borderRadius: 20, padding: "18px 20px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap", marginBottom: 10 }}>
                <div style={{ flex: 1, minWidth: 180 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, fontFamily: "var(--ls-bbc-font-mono)", fontSize: 10.5, letterSpacing: "0.14em", textTransform: "uppercase", color: c.isToday ? "var(--ls-bbc-lime-text)" : "var(--ls-bbc-muted)", fontWeight: 700 }}>
                    <span style={{ width: 7, height: 7, borderRadius: 999, background: c.isToday ? "var(--ls-bbc-lime)" : "var(--ls-bbc-teal)", boxShadow: `0 0 8px ${c.isToday ? "var(--ls-bbc-lime)" : "var(--ls-bbc-teal)"}` }} />
                    {c.isToday ? "aujourd'hui" : fmtDay(c.at)}
                  </div>
                  <div style={{ fontFamily: "var(--ls-bbc-font-display)", fontSize: 20, marginTop: 4 }}>{c.label}</div>
                  <div style={{ fontFamily: "var(--ls-bbc-font-mono)", fontSize: 12, color: "var(--ls-bbc-muted)", marginTop: 2 }}>{fmtTime(c.at)}</div>
                </div>
                <span style={{ fontFamily: "var(--ls-bbc-font-mono)", fontSize: 12, fontWeight: 700, color: inscrits.length ? "var(--ls-bbc-lime-text)" : "var(--ls-bbc-hint)" }}>
                  {inscrits.length} inscrit{inscrits.length > 1 ? "s" : ""}
                </span>
                <button type="button" onClick={() => setPickFor(c)} style={btnFilled}>+ inscrire</button>
              </div>

              {inscrits.length === 0 ? (
                <div style={{ fontSize: 12, color: "var(--ls-bbc-hint)", paddingTop: 10, borderTop: "1px solid var(--ls-bbc-line)" }}>
                  Personne d'inscrit pour l'instant — inscris tes membres après leur bilan des 10.
                </div>
              ) : (
                inscrits.map((r) => (
                  <div key={r.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 0", borderTop: "1px solid var(--ls-bbc-line)" }}>
                    <span style={{ width: 8, height: 8, borderRadius: 999, background: "var(--ls-bbc-teal)", flex: "none" }} />
                    <span style={{ flex: 1, fontSize: 13.5, fontWeight: 600 }}>{r.clientName}</span>
                    <span style={{ fontFamily: "var(--ls-bbc-font-mono)", fontSize: 10.5, color: "var(--ls-bbc-teal)", textTransform: "uppercase" }}>inscrit ✓</span>
                    <button
                      type="button"
                      onClick={() => void unregister(r.id)}
                      title="Retirer de cet appel"
                      aria-label={`Retirer ${r.clientName} de cet appel`}
                      style={{ border: "1px solid var(--ls-bbc-line2)", background: "transparent", cursor: "pointer", fontSize: 11, fontWeight: 700, padding: "5px 10px", borderRadius: 9, color: "var(--ls-bbc-muted)", flex: "none" }}
                    >
                      retirer
                    </button>
                  </div>
                ))
              )}
            </div>
          );
        })
      )}

      {/* sélecteur de membre */}
      {pickFor ? (
        <div onClick={() => setPickFor(null)} style={{ position: "fixed", inset: 0, zIndex: 1300, background: "rgba(0,0,0,.65)", display: "flex", alignItems: "flex-end", justifyContent: "center" }}>
          <div onClick={(e) => e.stopPropagation()} className="bbc-mode" style={{ width: "100%", maxWidth: 460, maxHeight: "80vh", overflowY: "auto", background: "var(--ls-bbc-s1)", border: "1px solid var(--ls-bbc-line2)", borderRadius: "24px 24px 0 0", padding: "20px 22px calc(24px + env(safe-area-inset-bottom))", color: "var(--ls-bbc-text)", fontFamily: "var(--ls-bbc-font-body)" }}>
            <div style={{ display: "flex", alignItems: "flex-start", gap: 12, marginBottom: 12 }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontFamily: "var(--ls-bbc-font-display)", fontSize: 20 }}>Inscrire à {pickFor.label}</div>
                <div style={{ fontSize: 12, color: "var(--ls-bbc-muted)", marginTop: 2 }}>{fmtDay(pickFor.at)} · {fmtTime(pickFor.at)}</div>
              </div>
              <button type="button" onClick={() => setPickFor(null)} style={{ width: 32, height: 32, borderRadius: 10, background: "var(--ls-bbc-s2)", border: "1px solid var(--ls-bbc-line)", color: "var(--ls-bbc-muted)", cursor: "pointer", fontSize: 15, flex: "none" }}>✕</button>
            </div>
            {members.length === 0 ? (
              <div style={{ fontSize: 12.5, color: "var(--ls-bbc-hint)", padding: "10px 0" }}>Aucun membre BBC pour l'instant.</div>
            ) : (
              members.map((m) => {
                const already = forOccurrence(pickFor.key, pickFor.at).some((r) => r.clientId === m.id);
                return (
                  <button
                    key={m.id}
                    type="button"
                    disabled={already}
                    onClick={async () => {
                      const ok = await register(m.id, pickFor.key, pickFor.at);
                      if (ok) setPickFor(null);
                    }}
                    style={{ display: "flex", alignItems: "center", gap: 12, width: "100%", textAlign: "left", padding: "12px 14px", borderRadius: 12, marginBottom: 8, background: already ? "var(--ls-bbc-s2)" : "transparent", border: "1px solid var(--ls-bbc-line)", color: "var(--ls-bbc-text)", cursor: already ? "default" : "pointer", opacity: already ? 0.6 : 1 }}
                  >
                    <span style={{ flex: 1, fontSize: 13.5, fontWeight: 600 }}>{m.name}</span>
                    <span style={{ fontFamily: "var(--ls-bbc-font-mono)", fontSize: 11, color: already ? "var(--ls-bbc-teal)" : "var(--ls-bbc-lime-text)" }}>
                      {already ? "déjà inscrit ✓" : "inscrire"}
                    </span>
                  </button>
                );
              })
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}

const btnFilled: CSSProperties = {
  border: 0,
  cursor: "pointer",
  fontSize: 11.5,
  fontWeight: 700,
  padding: "9px 14px",
  borderRadius: 10,
  background: "var(--ls-bbc-lime)",
  color: "var(--ls-bbc-lime-ink)",
  fontFamily: "var(--ls-bbc-font-body)",
  flex: "none",
};

const btnGhost: CSSProperties = {
  border: "1px solid var(--ls-bbc-line2)",
  cursor: "pointer",
  fontSize: 11.5,
  fontWeight: 600,
  padding: "9px 14px",
  borderRadius: 10,
  background: "transparent",
  color: "var(--ls-bbc-muted)",
  fontFamily: "var(--ls-bbc-font-body)",
  flex: "none",
};
