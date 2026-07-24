// =============================================================================
// BbcClientApp — l'app MEMBRE BBC (PWA), port du design validé Thomas.
// Coquille (header + scroll + bottom nav + Noaly + QR plein écran) + onglet
// ACCUEIL entièrement câblé en réel (visites, QR du token, transformation Δ
// poids, prochain RDV). Évolution / Cœurs / Conseils / Messages : portés dans
// les commits suivants (déjà dessinés). Identité --ls-bbc-*.
// =============================================================================

import "../../styles/bbc-tokens.css";
import { useState } from "react";
import { QRCode } from "../../components/ui/QRCode";
import { MemberEvolution } from "./member/MemberEvolution";
import { MemberCoeurs } from "./member/MemberCoeurs";
import { MemberConseils } from "./member/MemberConseils";
import { MemberMessages } from "./member/MemberMessages";

type MemberTab = "accueil" | "evolution" | "coeurs" | "conseils" | "messages";

interface BbcClientAppProps {
  clientName?: string;
  coachName?: string;
  programTitle?: string;
  token?: string;
  visitsCount?: number;
  weightDeltaKg?: number | null;
  currentWeight?: number | null;
  nextRdvDate?: string | null;
  nextRdvType?: string | null;
  metrics?: Array<{ date?: string; weight?: number; bodyFat?: number; muscleMass?: number; hydration?: number }>;
  measurements?: Array<{ measured_at?: string; waist_cm?: number; hips_cm?: number; thigh_cm?: number; arm_cm?: number }>;
  heartsCount?: number;
  clientId?: string;
  coachId?: string;
  coachAdvice?: string | null;
}

const CARD_MAX = 10;

function initials(name?: string) {
  const parts = (name ?? "").trim().split(/\s+/).filter(Boolean);
  return ((parts[0]?.[0] ?? "") + (parts[1]?.[0] ?? "")).toUpperCase() || "?";
}
function fmtRdv(iso?: string | null) {
  if (!iso) return null;
  try {
    return new Date(iso).toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" }) +
      " · " + new Date(iso).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
  } catch {
    return null;
  }
}

export function BbcClientApp(props: BbcClientAppProps) {
  const { clientName, coachName, token, visitsCount = 0, weightDeltaKg, currentWeight, nextRdvDate, nextRdvType, metrics = [], measurements = [], heartsCount = 0, clientId, coachId, coachAdvice } = props;
  const [tab, setTab] = useState<MemberTab>("accueil");
  const [qrFull, setQrFull] = useState(false);
  const [noaly, setNoaly] = useState(false);

  const first = (clientName ?? "").split(/\s+/)[0] || "toi";
  const coach = (coachName ?? "").split(/\s+/)[0] || "ton coach";
  const visits = Math.max(0, visitsCount);
  const shown = Math.min(visits, CARD_MAX);
  const left = Math.max(0, CARD_MAX - visits);
  const isNew = visits === 0 && (weightDeltaKg == null);
  const rdv = fmtRdv(nextRdvDate);

  const NAV: Array<{ k: MemberTab; label: string; d: string; badge?: boolean }> = [
    { k: "accueil", label: "Accueil", d: "M3 3h7v7H3zM14 3h7v7h-7zM3 14h7v7H3zM14 14h7v7h-7z" },
    { k: "evolution", label: "Évolution", d: "M3 12h4l2-7 4 14 2-7h6" },
    { k: "coeurs", label: "Cœurs", d: "M12 20.3S4.6 15.7 2.6 11.3C1.4 8.7 2.9 5.6 6 5.6c1.9 0 3.2 1.2 4 2.2.8-1 2.1-2.2 4-2.2 3.1 0 4.6 3.1 3.4 5.7C19.4 15.7 12 20.3 12 20.3z" },
    { k: "conseils", label: "Conseils", d: "M12 3a6 6 0 0 0-4 10.5c.7.6 1 1.2 1 2V17h6v-1.5c0-.8.3-1.4 1-2A6 6 0 0 0 12 3zM9 21h6" },
    { k: "messages", label: "Messages", d: "M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z", badge: true },
  ];

  return (
    <div className="bbc-mode" style={{ position: "relative", minHeight: "100vh", background: "var(--ls-bbc-bg)", color: "var(--ls-bbc-text)", fontFamily: "var(--ls-bbc-font-body)", maxWidth: 460, margin: "0 auto", overflow: "hidden" }}>
      {/* header */}
      <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "calc(14px + env(safe-area-inset-top)) 18px 8px" }}>
        <div style={{ width: 46, height: 46, borderRadius: "50%", background: "linear-gradient(140deg, var(--ls-bbc-teal), var(--ls-bbc-lime))", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "var(--ls-bbc-font-display)", fontSize: 16, color: "#04201b", flex: "none" }}>{initials(clientName)}</div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 17, fontWeight: 600, lineHeight: 1.15 }}>Salut {first} !</div>
          <div style={{ fontFamily: "var(--ls-bbc-font-mono)", fontSize: 10, color: "var(--ls-bbc-muted)", marginTop: 2 }}>ton club du matin · carte {visits}/{CARD_MAX}</div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 5, padding: "5px 10px", borderRadius: 999, background: "var(--ls-bbc-s1)", border: "1px solid var(--ls-bbc-line)", flex: "none" }}>
          <span style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--ls-bbc-teal)", boxShadow: "0 0 6px var(--ls-bbc-teal)" }} />
          <span style={{ fontFamily: "var(--ls-bbc-font-mono)", fontSize: 10, color: "var(--ls-bbc-muted)", whiteSpace: "nowrap" }}>coach {coach}</span>
        </div>
      </div>

      {/* content */}
      <div style={{ padding: "8px 16px 96px", display: "flex", flexDirection: "column", gap: 14 }}>
        {tab === "accueil" ? (
          <>
            {/* HERO carte membre + QR */}
            <div style={{ position: "relative", background: "var(--ls-bbc-s2)", border: "1px solid rgba(197,248,42,.34)", borderRadius: 22, padding: 18, overflow: "hidden" }}>
              <div style={{ position: "absolute", top: -50, right: -40, width: 200, height: 200, background: "radial-gradient(circle, rgba(197,248,42,.16), transparent 65%)" }} />
              <div style={{ position: "relative" }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
                  <span style={{ display: "inline-flex", alignItems: "center", gap: 7, fontFamily: "var(--ls-bbc-font-mono)", fontSize: 10, fontWeight: 600, letterSpacing: "0.15em", color: "var(--ls-bbc-muted)", textTransform: "uppercase" }}>
                    <span style={{ width: 7, height: 7, borderRadius: 999, background: "var(--ls-bbc-lime)", boxShadow: "0 0 8px var(--ls-bbc-lime)" }} />carte de membre
                  </span>
                  <span style={{ fontSize: 10, fontWeight: 600, color: "var(--ls-bbc-lime-text)", border: "1px solid rgba(197,248,42,.4)", padding: "4px 10px", borderRadius: 999 }}>carte · {CARD_MAX} visites</span>
                </div>
                <div style={{ display: "flex", alignItems: "flex-end", gap: 8 }}>
                  <span style={{ fontFamily: "var(--ls-bbc-font-mono)", fontWeight: 800, fontSize: 56, lineHeight: 0.8, color: "var(--ls-bbc-lime)" }}>{visits}</span>
                  <span style={{ fontFamily: "var(--ls-bbc-font-mono)", fontWeight: 500, fontSize: 22, color: "var(--ls-bbc-muted)", paddingBottom: 6 }}>/ {CARD_MAX}</span>
                  <span style={{ flex: 1, textAlign: "right", fontSize: 11, color: "var(--ls-bbc-muted)", paddingBottom: 8 }}>{isNew ? "ta carte démarre" : left > 0 ? `plus que ${left} visite${left > 1 ? "s" : ""}` : "carte complète 🎉"}</span>
                </div>
                <div style={{ display: "flex", gap: 5, marginTop: 12 }}>
                  {Array.from({ length: CARD_MAX }).map((_, i) => (
                    <div key={i} style={{ flex: 1, height: 8, borderRadius: 3, background: i < shown ? "var(--ls-bbc-lime)" : "var(--ls-bbc-s1)" }} />
                  ))}
                </div>
                <div style={{ fontSize: 11, fontWeight: 500, color: "var(--ls-bbc-lime-text)", marginTop: 9 }}>
                  {isNew ? "ta 1ʳᵉ visite est offerte 🎁" : left > 0 ? `plus que ${left} → ton bilan des 10 t'attend 🎁` : "bilan des 10 à faire avec ton coach 🎁"}
                </div>
                {token ? (
                  <button type="button" onClick={() => setQrFull(true)} style={{ width: "100%", textAlign: "left", border: 0, cursor: "pointer", display: "flex", gap: 14, alignItems: "center", marginTop: 14, background: "#FBF7F0", borderRadius: 16, padding: 14 }}>
                    <QRCode value={token} size={80} fgColor="0B0D11" bgColor="FBF7F0" />
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 14, fontWeight: 700, color: "#0B0D11" }}>montre ce code au coach</div>
                      <div style={{ fontSize: 12, color: "#5b6472", marginTop: 3 }}>il scanne, ta visite du jour est validée.</div>
                      <div style={{ display: "inline-flex", alignItems: "center", gap: 5, fontFamily: "var(--ls-bbc-font-mono)", fontSize: 10, fontWeight: 600, color: "var(--ls-bbc-teal)", marginTop: 7, textTransform: "uppercase" }}>agrandir</div>
                    </div>
                  </button>
                ) : null}
              </div>
            </div>

            {/* transformation */}
            {isNew ? (
              <div style={{ borderRadius: 18, padding: 18, background: "var(--ls-bbc-s1)", border: "1px solid var(--ls-bbc-line)", display: "flex", alignItems: "center", gap: 13 }}>
                <div style={{ width: 40, height: 40, borderRadius: 11, background: "rgba(197,248,42,.14)", display: "flex", alignItems: "center", justifyContent: "center", flex: "none", fontSize: 18 }} aria-hidden="true">📈</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 14, fontWeight: 700 }}>ta transformation démarre</div>
                  <div style={{ fontSize: 12, color: "var(--ls-bbc-muted)", marginTop: 2 }}>ta 1ʳᵉ pesée au club = ton point de départ.</div>
                </div>
              </div>
            ) : weightDeltaKg != null ? (
              <div style={{ position: "relative", overflow: "hidden", borderRadius: 18, padding: 20, textAlign: "center", background: "var(--ls-bbc-s1)", border: "1px solid rgba(197,248,42,.28)" }}>
                <div style={{ position: "absolute", top: -40, left: "50%", transform: "translateX(-50%)", width: 220, height: 220, background: "radial-gradient(circle, rgba(197,248,42,.14), transparent 66%)" }} />
                <div style={{ position: "relative" }}>
                  <div style={{ fontFamily: "var(--ls-bbc-font-mono)", fontSize: 10, letterSpacing: "0.16em", textTransform: "uppercase", color: "var(--ls-bbc-muted)", fontWeight: 600, marginBottom: 4 }}>ta transformation</div>
                  <div style={{ fontFamily: "var(--ls-bbc-font-display)", fontSize: 48, lineHeight: 1, color: "var(--ls-bbc-lime)" }}>{weightDeltaKg > 0 ? "+" : ""}{weightDeltaKg.toFixed(1).replace(".", ",")}</div>
                  <div style={{ fontFamily: "var(--ls-bbc-font-mono)", fontSize: 11, color: "var(--ls-bbc-muted)", marginTop: 4 }}>kg depuis le départ{currentWeight ? ` · ${currentWeight.toFixed(1).replace(".", ",")} kg aujourd'hui` : ""}</div>
                  <button type="button" onClick={() => setTab("evolution")} style={{ marginTop: 14, background: "var(--ls-bbc-lime)", border: 0, borderRadius: 10, padding: "10px 16px", color: "var(--ls-bbc-lime-ink)", fontFamily: "var(--ls-bbc-font-body)", fontSize: 12.5, fontWeight: 700, cursor: "pointer" }}>voir toute mon évolution →</button>
                </div>
              </div>
            ) : null}

            {/* RDV */}
            {rdv ? (
              <div style={{ background: "var(--ls-bbc-s1)", border: "1px solid var(--ls-bbc-line)", borderLeft: "3px solid var(--ls-bbc-teal)", borderRadius: 16, padding: 15, display: "flex", alignItems: "center", gap: 13 }}>
                <div style={{ width: 40, height: 40, borderRadius: 11, background: "rgba(45,212,191,.14)", display: "flex", alignItems: "center", justifyContent: "center", flex: "none", fontSize: 18 }} aria-hidden="true">📅</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontFamily: "var(--ls-bbc-font-mono)", fontSize: 9, letterSpacing: "0.14em", textTransform: "uppercase", color: "var(--ls-bbc-muted)", fontWeight: 600 }}>prochain rdv</div>
                  <div style={{ fontSize: 15, fontWeight: 600, marginTop: 2 }}>{rdv}</div>
                  {nextRdvType ? <div style={{ fontSize: 12, color: "var(--ls-bbc-muted)", marginTop: 2 }}>{nextRdvType} avec {coach}.</div> : null}
                </div>
              </div>
            ) : (
              <div style={{ background: "var(--ls-bbc-s1)", border: "1px solid var(--ls-bbc-line)", borderRadius: 16, padding: 15, display: "flex", alignItems: "center", gap: 13 }}>
                <div style={{ width: 40, height: 40, borderRadius: 11, background: "var(--ls-bbc-s2)", display: "flex", alignItems: "center", justifyContent: "center", flex: "none", fontSize: 18 }} aria-hidden="true">📅</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 14, fontWeight: 600 }}>pas encore de rdv</div>
                  <div style={{ fontSize: 12, color: "var(--ls-bbc-muted)", marginTop: 2 }}>demande à {coach} ton prochain créneau depuis la messagerie.</div>
                </div>
              </div>
            )}

            {/* cœurs / remise */}
            <div style={{ background: "linear-gradient(135deg, color-mix(in srgb, var(--ls-bbc-lime) 12%, var(--ls-bbc-s1)), var(--ls-bbc-s1))", border: "1px solid rgba(197,248,42,.3)", borderRadius: 18, padding: 18 }}>
              <div style={{ fontFamily: "var(--ls-bbc-font-mono)", fontSize: 9, letterSpacing: "0.14em", textTransform: "uppercase", color: "var(--ls-bbc-lime-text)", fontWeight: 700, marginBottom: 4 }}>tes cœurs</div>
              <div style={{ fontSize: 16, fontWeight: 700 }}>fais découvrir ton club</div>
              <div style={{ fontSize: 12.5, color: "var(--ls-bbc-muted)", lineHeight: 1.5, margin: "8px 0 14px" }}>2 cœurs = <strong style={{ color: "var(--ls-bbc-lime-text)" }}>−25 % à vie</strong> sur ta nutrition · 3 = 10 visites offertes · 5 = 30.</div>
              <button type="button" onClick={() => setTab("coeurs")} style={{ width: "100%", minHeight: 46, borderRadius: 12, border: 0, cursor: "pointer", background: "var(--ls-bbc-lime)", color: "var(--ls-bbc-lime-ink)", fontFamily: "var(--ls-bbc-font-body)", fontSize: 14, fontWeight: 700 }}>recommander un proche</button>
            </div>

            {/* tuiles */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              <button type="button" onClick={() => setTab("evolution")} style={{ textAlign: "center", background: "var(--ls-bbc-s1)", border: "1px solid var(--ls-bbc-line)", borderRadius: 16, padding: "16px 12px", cursor: "pointer", color: "var(--ls-bbc-text)" }}>
                <div style={{ fontSize: 22 }} aria-hidden="true">📐</div>
                <div style={{ fontSize: 13.5, fontWeight: 700, marginTop: 6 }}>mes mensurations</div>
                <div style={{ fontSize: 11, color: "var(--ls-bbc-muted)", marginTop: 2 }}>suis ton évolution</div>
              </button>
              <button type="button" onClick={() => setTab("conseils")} style={{ textAlign: "center", background: "var(--ls-bbc-s1)", border: "1px solid var(--ls-bbc-line)", borderRadius: 16, padding: "16px 12px", cursor: "pointer", color: "var(--ls-bbc-text)" }}>
                <div style={{ fontSize: 22 }} aria-hidden="true">💡</div>
                <div style={{ fontSize: 13.5, fontWeight: 700, marginTop: 6 }}>mes conseils</div>
                <div style={{ fontSize: 11, color: "var(--ls-bbc-muted)", marginTop: 2 }}>assiette & routine</div>
              </button>
            </div>
          </>
        ) : tab === "evolution" ? (
          <MemberEvolution metrics={metrics} measurements={measurements} />
        ) : tab === "coeurs" ? (
          <MemberCoeurs heartsCount={heartsCount} clientName={clientName} clientId={clientId} coachId={coachId} />
        ) : tab === "conseils" ? (
          <MemberConseils coachAdvice={coachAdvice} coachName={coachName} />
        ) : (
          <MemberMessages token={token ?? ""} coachName={coachName} />
        )}
      </div>

      {/* bottom nav */}
      <div style={{ position: "fixed", bottom: 0, left: 0, right: 0, maxWidth: 460, margin: "0 auto", display: "flex", alignItems: "flex-end", padding: "8px 4px calc(20px + env(safe-area-inset-bottom))", background: "color-mix(in srgb, var(--ls-bbc-bg) 82%, transparent)", backdropFilter: "blur(14px)", borderTop: "1px solid var(--ls-bbc-line)", zIndex: 20 }}>
        {NAV.slice(0, 3).map((n) => (
          <NavBtn key={n.k} n={n} active={tab === n.k} onClick={() => setTab(n.k)} />
        ))}
        <button type="button" onClick={() => setNoaly(true)} style={{ flex: "none", width: 62, display: "flex", flexDirection: "column", alignItems: "center", gap: 4, background: "none", border: 0, cursor: "pointer", padding: "6px 0 4px" }}>
          <span style={{ width: 50, height: 50, marginTop: -20, borderRadius: 17, background: "linear-gradient(140deg, var(--ls-bbc-teal), var(--ls-bbc-lime))", border: "3px solid var(--ls-bbc-bg)", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <span aria-hidden="true" style={{ fontSize: 22 }}>✦</span>
          </span>
          <span style={{ fontSize: 9, fontWeight: 600, color: "var(--ls-bbc-teal)" }}>Noaly</span>
        </button>
        {NAV.slice(3).map((n) => (
          <NavBtn key={n.k} n={n} active={tab === n.k} onClick={() => setTab(n.k)} />
        ))}
      </div>

      {/* QR plein écran */}
      {qrFull && token ? (
        <div onClick={() => setQrFull(false)} style={{ position: "fixed", inset: 0, zIndex: 90, background: "#FBF7F0", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 22, padding: 30, cursor: "pointer" }}>
          <div style={{ fontFamily: "var(--ls-bbc-font-display)", fontSize: 22, color: "#0B0D11" }}>{first} · BBC</div>
          <QRCode value={token} size={260} fgColor="0B0D11" bgColor="FBF7F0" />
          <div style={{ fontSize: 12, fontWeight: 600, color: "#5b6472" }}>luminosité au max · touche pour fermer</div>
        </div>
      ) : null}

      {/* Noaly sheet */}
      {noaly ? (
        <div onClick={() => setNoaly(false)} style={{ position: "fixed", inset: 0, zIndex: 75, background: "rgba(0,0,0,.55)", display: "flex", alignItems: "flex-end" }}>
          <div onClick={(e) => e.stopPropagation()} style={{ width: "100%", maxWidth: 460, margin: "0 auto", background: "var(--ls-bbc-s1)", border: "1px solid var(--ls-bbc-line2)", borderRadius: "26px 26px 0 0", padding: "16px 18px calc(22px + env(safe-area-inset-bottom))" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 11, marginBottom: 13 }}>
              <div style={{ width: 40, height: 40, borderRadius: 13, background: "linear-gradient(140deg, var(--ls-bbc-teal), var(--ls-bbc-lime))", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20 }} aria-hidden="true">✦</div>
              <div style={{ flex: 1 }}><div style={{ fontSize: 16, fontWeight: 700 }}>Noaly</div><div style={{ fontSize: 11, color: "var(--ls-bbc-muted)" }}>ton assistante du club</div></div>
              <button type="button" onClick={() => setNoaly(false)} style={{ width: 32, height: 32, borderRadius: 10, background: "var(--ls-bbc-s2)", border: "1px solid var(--ls-bbc-line)", color: "var(--ls-bbc-muted)", cursor: "pointer", fontSize: 15 }}>✕</button>
            </div>
            <div style={{ background: "var(--ls-bbc-s2)", border: "1px solid var(--ls-bbc-line)", borderRadius: "16px 16px 16px 5px", padding: "12px 14px", fontSize: 13.5, lineHeight: 1.5 }}>Salut {first} ! Une question sur ton matin, une recette, ta carte ? (branchement à venir)</div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function NavBtn({ n, active, onClick }: { n: { label: string; d: string; badge?: boolean }; active: boolean; onClick: () => void }) {
  const color = active ? "var(--ls-bbc-lime)" : "var(--ls-bbc-muted)";
  return (
    <button type="button" onClick={onClick} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 4, background: "none", border: 0, cursor: "pointer", padding: "6px 0 4px", color, boxShadow: active ? "inset 0 2px 0 var(--ls-bbc-lime)" : "inset 0 2px 0 transparent", position: "relative" }}>
      <svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={n.d} /></svg>
      <span style={{ fontSize: 9, fontWeight: 600 }}>{n.label}</span>
    </button>
  );
}
