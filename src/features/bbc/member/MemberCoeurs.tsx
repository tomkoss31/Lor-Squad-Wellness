// =============================================================================
// MemberCoeurs — onglet Cœurs de l'app membre BBC (port du design).
// Statut (cœurs réels via edge) · c'est quoi un cœur · échelle 2/3/5 · échelle
// remises PV 25/35/42/50 + modales pédagogiques · recommander (insert réel
// client_referrals) · badges. Barème = repères config.
// =============================================================================

import { useState } from "react";
import { getSupabaseClient } from "../../../services/supabaseClient";

interface MemberCoeursProps {
  heartsCount: number;
  clientName?: string;
  clientId?: string;
  coachId?: string;
}

const PALIERS = [2, 3, 5];
const HEART_PATH = "M12 20.3S4.6 15.7 2.6 11.3C1.4 8.7 2.9 5.6 6 5.6c1.9 0 3.2 1.2 4 2.2.8-1 2.1-2.2 4-2.2 3.1 0 4.6 3.1 3.4 5.7C19.4 15.7 12 20.3 12 20.3z";

const REWARDS: Array<{ n: number; reward: string }> = [
  { n: 2, reward: "−25 % à vie sur toute ta nutrition" },
  { n: 3, reward: "10 visites offertes" },
  { n: 5, reward: "30 visites offertes" },
];

const REMISES: Array<{ pct: string; cond: string; note: string; edu?: "42" | "50" }> = [
  { pct: "25 %", cond: "pack ambassadeur · dès 2 cœurs", note: "les cœurs te le donnent" },
  { pct: "35 %", cond: "250 PV · tes premières commandes", note: "−10 % de plus à la maison" },
  { pct: "42 %", cond: "1 000 PV", note: "toi + tes proches · appuie pour comprendre", edu: "42" },
  { pct: "50 %", cond: "superviseur · 2 500 PV / 3 mois", note: "le max · appuie pour comprendre", edu: "50" },
];

const EDU: Record<"42" | "50", { title: string; big: string; sub: string; rows: Array<{ k: string; v: string }>; foot: string }> = {
  "42": {
    title: "Comment atteindre 42 %",
    big: "1 000 PV cumulés",
    sub: "≈ toi + tes membres, mois après mois",
    rows: [
      { k: "ta conso à la maison", v: "~100 PV / mois" },
      { k: "proches que tu as recommandés", v: "~900 PV" },
      { k: "total (ça se cumule)", v: "1 000 PV" },
    ],
    foot: "Rien d'obligé : tu consommes ce que tu prends déjà, et ce que commandent tes proches s'ajoute. C'est le cumul qui compte, pas la vitesse.",
  },
  "50": {
    title: "Comment atteindre 50 % (Superviseur)",
    big: "2 500 PV sur 3 mois",
    sub: "≈ 830 PV / mois · le maximum",
    rows: [
      { k: "ta conso à la maison", v: "~100 PV / mois" },
      { k: "8 proches qui commandent /mois", v: "~800 PV / mois" },
      { k: "≈ 900 PV / mois × 3", v: "2 700 PV" },
    ],
    foot: "Le plus haut palier. Il vient quand un petit groupe de proches commande régulièrement grâce à toi — ton coach t'accompagne, à ton rythme.",
  },
};

export function MemberCoeurs({ heartsCount, clientName, clientId, coachId }: MemberCoeursProps) {
  const cur = Math.max(0, heartsCount);
  const [prenom, setPrenom] = useState("");
  const [contact, setContact] = useState("");
  const [sending, setSending] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [modal, setModal] = useState<"42" | "50" | null>(null);

  async function send() {
    if (sending || !prenom.trim() || !clientId || !coachId) return;
    setSending(true);
    try {
      const sb = await getSupabaseClient();
      if (sb) {
        await sb.from("client_referrals").insert({
          from_client_id: clientId,
          from_client_name: clientName ?? "",
          coach_id: coachId,
          referred_name: prenom.trim(),
          referred_contact: contact.trim(),
          status: "new",
        });
      }
      setPrenom("");
      setContact("");
      setToast("invitation envoyée 🎉");
      window.setTimeout(() => setToast(null), 2400);
    } catch {
      setToast("oups, réessaie");
      window.setTimeout(() => setToast(null), 2400);
    } finally {
      setSending(false);
    }
  }

  return (
    <>
      {/* statut */}
      {cur >= 2 ? (
        <div style={{ position: "relative", overflow: "hidden", background: "var(--ls-bbc-s2)", border: "1px solid rgba(197,248,42,.34)", borderRadius: 20, padding: 20 }}>
          <div style={{ position: "absolute", top: -40, right: -30, width: 180, height: 180, background: "radial-gradient(circle, rgba(197,248,42,.16), transparent 65%)" }} />
          <div style={{ position: "relative" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, fontFamily: "var(--ls-bbc-font-mono)", fontSize: 10, fontWeight: 600, letterSpacing: "0.15em", color: "var(--ls-bbc-lime-text)", textTransform: "uppercase" }}>
              <span style={{ width: 7, height: 7, borderRadius: 999, background: "var(--ls-bbc-lime)", boxShadow: "0 0 8px var(--ls-bbc-lime)" }} />tu as {cur} cœurs · ambassadeur
            </div>
            <div style={{ display: "flex", alignItems: "flex-end", gap: 8, marginTop: 12 }}>
              <span style={{ fontFamily: "var(--ls-bbc-font-display)", fontSize: 52, lineHeight: 0.8, color: "var(--ls-bbc-lime)" }}>−25 %</span>
              <span style={{ fontSize: 12, color: "var(--ls-bbc-muted)", paddingBottom: 8 }}>à vie sur ta nutrition</span>
            </div>
            {cur < 3 ? <div style={{ fontSize: 12.5, color: "var(--ls-bbc-muted)", marginTop: 8, lineHeight: 1.5 }}>Encore <strong style={{ color: "var(--ls-bbc-lime-text)" }}>1 cœur</strong> et le club t'offre <strong style={{ color: "var(--ls-bbc-lime-text)" }}>10 petits-déj</strong> 🎁</div> : null}
          </div>
        </div>
      ) : (
        <div style={{ background: "var(--ls-bbc-s2)", border: "1px solid var(--ls-bbc-line2)", borderRadius: 20, padding: "22px 20px", textAlign: "center" }}>
          <div style={{ fontSize: 30 }} aria-hidden="true">❤️</div>
          <div style={{ fontFamily: "var(--ls-bbc-font-display)", fontSize: 22, marginTop: 8 }}>tes cœurs commencent ici</div>
          <div style={{ fontSize: 12.5, color: "var(--ls-bbc-muted)", marginTop: 6, lineHeight: 1.5 }}>invite ton premier proche : à 2 cœurs tu débloques <strong style={{ color: "var(--ls-bbc-lime-text)" }}>−25 % à vie</strong> sur ta nutrition.</div>
        </div>
      )}

      {/* c'est quoi un cœur */}
      <div style={{ background: "var(--ls-bbc-s1)", border: "1px solid var(--ls-bbc-line)", borderRadius: 18, padding: 18 }}>
        <div style={{ fontFamily: "var(--ls-bbc-font-mono)", fontSize: 10, fontWeight: 600, letterSpacing: "0.14em", color: "var(--ls-bbc-muted)", textTransform: "uppercase", marginBottom: 8 }}>c'est quoi un cœur ?</div>
        <div style={{ fontSize: 13, lineHeight: 1.55 }}>Un cœur = <strong style={{ color: "var(--ls-bbc-lime-text)" }}>une personne que tu recommandes et qui démarre au club</strong>. Tu la présentes, on lui offre son premier petit-déj, elle rejoint le club → tu gagnes un cœur. Tes proches profitent, toi t'es récompensée.</div>
      </div>

      {/* échelle cœurs */}
      <div style={{ background: "var(--ls-bbc-s1)", border: "1px solid var(--ls-bbc-line)", borderRadius: 18, padding: 18 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 18 }}>
          <span style={{ width: 7, height: 7, borderRadius: 999, background: "var(--ls-bbc-lime)", boxShadow: "0 0 8px var(--ls-bbc-lime)", flex: "none" }} />
          <span style={{ fontFamily: "var(--ls-bbc-font-mono)", fontSize: 11, fontWeight: 600, letterSpacing: "0.14em", color: "var(--ls-bbc-muted)", textTransform: "uppercase" }}>tes cœurs → tes récompenses</span>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", padding: "0 20px", marginBottom: 16 }}>
          {PALIERS.map((n) => {
            const done = cur >= n;
            return (
              <div key={n} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
                <div style={{ width: 40, height: 40, borderRadius: 999, display: "flex", alignItems: "center", justifyContent: "center", background: done ? "var(--ls-bbc-lime)" : "var(--ls-bbc-bg)", border: `2px solid ${done ? "var(--ls-bbc-lime)" : "var(--ls-bbc-line2)"}` }}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill={done ? "var(--ls-bbc-lime-ink)" : "none"} stroke={done ? "var(--ls-bbc-lime-ink)" : "var(--ls-bbc-hint)"} strokeWidth="2"><path d={HEART_PATH} /></svg>
                </div>
                <span style={{ fontFamily: "var(--ls-bbc-font-mono)", fontWeight: 700, fontSize: 13, color: done ? "var(--ls-bbc-lime-text)" : "var(--ls-bbc-hint)" }}>{n}</span>
              </div>
            );
          })}
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {REWARDS.map((r) => {
            const done = cur >= r.n;
            const next = !done && PALIERS.find((p) => p > cur) === r.n;
            return (
              <div key={r.n} style={{ display: "flex", alignItems: "center", gap: 11, padding: "11px 13px", borderRadius: 13, background: done ? "rgba(197,248,42,.10)" : "var(--ls-bbc-s2)", border: `1px solid ${done ? "rgba(197,248,42,.3)" : "var(--ls-bbc-line)"}` }}>
                <span style={{ fontFamily: "var(--ls-bbc-font-mono)", fontWeight: 800, fontSize: 15, color: done ? "var(--ls-bbc-lime-text)" : "var(--ls-bbc-hint)", width: 26, flex: "none" }}>{r.n}♥</span>
                <span style={{ flex: 1, fontSize: 13, fontWeight: 600, color: done || next ? "var(--ls-bbc-text)" : "var(--ls-bbc-muted)" }}>{r.reward}</span>
                <span style={{ fontFamily: "var(--ls-bbc-font-mono)", fontSize: 10, textTransform: "uppercase", color: done ? "var(--ls-bbc-lime-text)" : next ? "var(--ls-bbc-teal)" : "var(--ls-bbc-hint)" }}>{done ? "obtenu ✓" : next ? "à 1 cœur" : "à venir"}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* échelle remises PV */}
      <div style={{ background: "var(--ls-bbc-s1)", border: "1px solid var(--ls-bbc-line)", borderRadius: 18, padding: 18 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
          <span style={{ width: 7, height: 7, borderRadius: 999, background: "var(--ls-bbc-teal)", boxShadow: "0 0 8px var(--ls-bbc-teal)", flex: "none" }} />
          <span style={{ fontFamily: "var(--ls-bbc-font-mono)", fontSize: 11, fontWeight: 600, letterSpacing: "0.14em", color: "var(--ls-bbc-muted)", textTransform: "uppercase" }}>faire grimper ta remise</span>
        </div>
        <div style={{ fontSize: 12, color: "var(--ls-bbc-muted)", lineHeight: 1.5, marginBottom: 14 }}>Les cœurs te donnent tes <strong style={{ color: "var(--ls-bbc-text)" }}>25 %</strong>. Ensuite ça monte avec ce que tu consommes <strong style={{ color: "var(--ls-bbc-text)" }}>à la maison</strong> (compté en points, les PV).</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {REMISES.map((r, i) => (
            <div key={r.pct} onClick={() => r.edu && setModal(r.edu)} style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 14px", borderRadius: 13, background: i === 0 ? "rgba(197,248,42,.10)" : "var(--ls-bbc-s2)", border: `1px solid ${i === 0 ? "rgba(197,248,42,.32)" : "var(--ls-bbc-line)"}`, cursor: r.edu ? "pointer" : "default" }}>
              <span style={{ fontFamily: "var(--ls-bbc-font-display)", fontSize: 22, color: i === 0 ? "var(--ls-bbc-lime-text)" : i < 2 ? "var(--ls-bbc-text)" : "var(--ls-bbc-muted)", width: 56, flex: "none" }}>{r.pct}</span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 12.5, fontWeight: 600 }}>{r.cond}</div>
                <div style={{ fontSize: 11, color: "var(--ls-bbc-muted)", marginTop: 1 }}>{r.note}</div>
              </div>
              <span style={{ fontFamily: "var(--ls-bbc-font-mono)", fontSize: 9.5, textTransform: "uppercase", color: i === 0 ? "var(--ls-bbc-lime-text)" : "var(--ls-bbc-teal)", whiteSpace: "nowrap" }}>{i === 0 ? "actuel ✓" : i === 1 ? "prochaine" : "voir →"}</span>
            </div>
          ))}
        </div>
      </div>

      {/* recommander */}
      <div style={{ background: "var(--ls-bbc-s1)", border: "1px solid var(--ls-bbc-line)", borderRadius: 18, padding: 18 }}>
        <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 2 }}>recommande un proche</div>
        <div style={{ fontSize: 12, color: "var(--ls-bbc-muted)", marginBottom: 12 }}>on lui offre son premier petit-déj. quand il rejoint le club, tu gagnes un cœur.</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 9 }}>
          <input value={prenom} onChange={(e) => setPrenom(e.target.value)} placeholder="prénom" style={{ height: 48, borderRadius: 12, border: "1px solid var(--ls-bbc-line)", background: "var(--ls-bbc-s2)", color: "var(--ls-bbc-text)", fontFamily: "var(--ls-bbc-font-body)", fontSize: 16, padding: "0 14px", outline: "none" }} />
          <input value={contact} onChange={(e) => setContact(e.target.value)} placeholder="téléphone ou email" style={{ height: 48, borderRadius: 12, border: "1px solid var(--ls-bbc-line)", background: "var(--ls-bbc-s2)", color: "var(--ls-bbc-text)", fontFamily: "var(--ls-bbc-font-body)", fontSize: 16, padding: "0 14px", outline: "none" }} />
          <button type="button" onClick={() => void send()} disabled={sending || !prenom.trim()} style={{ height: 50, border: 0, borderRadius: 12, background: "var(--ls-bbc-lime)", color: "var(--ls-bbc-lime-ink)", fontFamily: "var(--ls-bbc-font-body)", fontSize: 15, fontWeight: 700, cursor: sending || !prenom.trim() ? "not-allowed" : "pointer", opacity: sending || !prenom.trim() ? 0.55 : 1 }}>{sending ? "envoi…" : "envoyer l'invitation"}</button>
        </div>
      </div>

      {/* modale éducative remise */}
      {modal ? (
        <div onClick={() => setModal(null)} style={{ position: "fixed", inset: 0, zIndex: 80, background: "rgba(0,0,0,.6)", display: "flex", alignItems: "flex-end" }}>
          <div onClick={(e) => e.stopPropagation()} className="bbc-mode" style={{ width: "100%", maxWidth: 460, margin: "0 auto", background: "var(--ls-bbc-s1)", border: "1px solid var(--ls-bbc-line2)", borderRadius: "26px 26px 0 0", padding: "20px 20px calc(22px + env(safe-area-inset-bottom))", color: "var(--ls-bbc-text)", fontFamily: "var(--ls-bbc-font-body)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
              <div style={{ flex: 1, fontSize: 16, fontWeight: 700 }}>{EDU[modal].title}</div>
              <button type="button" onClick={() => setModal(null)} style={{ width: 32, height: 32, borderRadius: 10, background: "var(--ls-bbc-s2)", border: "1px solid var(--ls-bbc-line)", color: "var(--ls-bbc-muted)", cursor: "pointer", fontSize: 15 }}>✕</button>
            </div>
            <div style={{ textAlign: "center", padding: "6px 0 16px" }}>
              <div style={{ fontFamily: "var(--ls-bbc-font-display)", fontSize: 34, color: "var(--ls-bbc-lime)", lineHeight: 1 }}>{EDU[modal].big}</div>
              <div style={{ fontSize: 12, color: "var(--ls-bbc-muted)", marginTop: 6 }}>{EDU[modal].sub}</div>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {EDU[modal].rows.map((row, i) => (
                <div key={row.k} style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 14px", borderRadius: 12, background: i === EDU[modal].rows.length - 1 ? "rgba(197,248,42,.10)" : "var(--ls-bbc-s2)", border: `1px solid ${i === EDU[modal].rows.length - 1 ? "rgba(197,248,42,.3)" : "var(--ls-bbc-line)"}` }}>
                  <span style={{ flex: 1, fontSize: 12.5, color: "var(--ls-bbc-muted)" }}>{row.k}</span>
                  <span style={{ fontFamily: "var(--ls-bbc-font-mono)", fontSize: 13, fontWeight: 700, color: i === EDU[modal].rows.length - 1 ? "var(--ls-bbc-lime-text)" : "var(--ls-bbc-text)", whiteSpace: "nowrap" }}>{row.v}</span>
                </div>
              ))}
            </div>
            <div style={{ fontSize: 12, color: "var(--ls-bbc-muted)", lineHeight: 1.55, marginTop: 14, padding: "13px 15px", borderRadius: 12, background: "var(--ls-bbc-s2)", border: "1px dashed var(--ls-bbc-line2)" }}>{EDU[modal].foot}</div>
          </div>
        </div>
      ) : null}

      {/* toast */}
      {toast ? (
        <div style={{ position: "fixed", bottom: 96, left: "50%", transform: "translateX(-50%)", zIndex: 88, padding: "12px 16px", borderRadius: 14, background: "var(--ls-bbc-lime)", color: "var(--ls-bbc-lime-ink)", fontFamily: "var(--ls-bbc-font-body)", fontSize: 13, fontWeight: 700, whiteSpace: "nowrap" }}>{toast}</div>
      ) : null}
    </>
  );
}
