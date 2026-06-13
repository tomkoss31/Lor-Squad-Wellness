// =============================================================================
// PlanDuJour — Co-pilote refonte « Plan du jour » (chantier 1, 2026-06-13).
//
// Implémentation FIDÈLE du design Claude Design validé par Thomas
// (bundle co-pilote-v6 / « Plan du jour.dc.html »). Warm dark + gradient G3,
// titre Fraunces italic, vrai pin de rang en filigrane + « 360 », glows,
// états « journée pleine » / « journée calme », file de tâches priorisée
// (badge MAINTENANT), anneau rentabilité G3, anim de validation.
//
// THÈME : piloté par les variables CSS `--pdj-*` définies sur :root (sombre)
// et html.theme-light (clair) — donc il SUIT automatiquement le thème de l'app
// (le même mécanisme que globals.css). On NE dépend PAS de useTheme (qui est un
// useState local non partagé → désync). Fix bug 2026-06-13.
//
// PIN : vrai composant PinAWTCinematic (pin .webp du rang réel du coach), placé
// en filigrane CENTRÉ-DROITE discret (placement du design) pour ne PAS chevaucher
// la jauge rentabilité en haut-droite. Le « 360 » est rendu séparément.
//
// Branché sur les VRAIES données : relances propres (useDormantClients, RPC
// nettoyée chantier 0), rentabilité (useRentabilitySummary), RDV du jour.
// =============================================================================

import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAppContext } from "../../../../context/AppContext";
import { useDormantClients, URGENCY_META, type DormantUrgency } from "../../../../hooks/useDormantClients";
import { useRentabilitySummary } from "../../../../hooks/useRentabilitySummary";
import type { CopiloteData } from "../../../../hooks/useCopiloteData";
import { PinAWTCinematic } from "./PinAWTCinematic";

type Status = "active" | "later" | "done" | "completing";
type Prio = "urgent" | "todo" | "ok";

function firstNameOf(full: string): string {
  return (full || "").trim().split(/\s+/)[0] || "";
}
function hexA(hex: string, a: number): string {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
}
function prioColor(p: Prio): string {
  return p === "urgent" ? "#FB7185" : p === "todo" ? "#C9A84C" : "#10B981";
}
function prioOf(u: DormantUrgency): Prio {
  return u === "never" || u === "high" ? "urgent" : u === "medium" ? "todo" : "ok";
}

function useIsMobile(): boolean {
  const [m, setM] = useState(typeof window !== "undefined" ? window.matchMedia("(max-width: 768px)").matches : false);
  useEffect(() => {
    const mq = window.matchMedia("(max-width: 768px)");
    const fn = () => setM(mq.matches);
    mq.addEventListener?.("change", fn);
    return () => mq.removeEventListener?.("change", fn);
  }, []);
  return m;
}

const PARTICLE_DIRS = [[0, -24], [17, -17], [24, 0], [17, 17], [0, 24], [-17, 17], [-24, 0], [-17, -17]];
const PARTICLE_COLS = ["#10B981", "#06B6D4", "#8B5CF6", "#C9A84C", "#FB7185", "#06B6D4", "#8B5CF6", "#10B981"];

// Variables de thème (sombre = :root, clair = html.theme-light) → suit l'app.
const PDJ_THEME_CSS = `
:root{
  --pdj-text-strong:#F8FAFC;--pdj-text:#F1F5F9;--pdj-text-sec:rgba(241,245,249,0.6);--pdj-text-faint:rgba(241,245,249,0.42);
  --pdj-hero-bg:linear-gradient(135deg,#1A1410 0%,#1C1817 50%,#15131A 100%);--pdj-hero-border:rgba(241,245,249,0.07);--pdj-hero-shadow:0 40px 100px rgba(0,0,0,0.5);
  --pdj-card-bg:rgba(241,245,249,0.03);--pdj-card-border:rgba(241,245,249,0.08);--pdj-card-shadow:none;--pdj-divider:rgba(241,245,249,0.1);
  --pdj-ghost-border:rgba(241,245,249,0.14);--pdj-ghost-bg:rgba(241,245,249,0.05);--pdj-checkbox-border:rgba(241,245,249,0.22);
  --pdj-rdv-bg:rgba(6,182,212,0.06);--pdj-rdv-border:rgba(6,182,212,0.18);--pdj-calm-bg:rgba(16,185,129,0.06);--pdj-calm-border:rgba(16,185,129,0.20);
  --pdj-glow-em:rgba(16,185,129,0.20);--pdj-glow-vi:rgba(139,92,246,0.18);--pdj-ring-track:rgba(241,245,249,0.12);--pdj-ring-text:#F8FAFC;
  --pdj-pin-op:0.13;--pdj-ten-op:0.13;
}
html.theme-light{
  --pdj-text-strong:#211B16;--pdj-text:#2E2722;--pdj-text-sec:rgba(46,39,34,0.62);--pdj-text-faint:rgba(46,39,34,0.46);
  --pdj-hero-bg:linear-gradient(135deg,#FFFDFB 0%,#FBF6F1 50%,#F7F3FA 100%);--pdj-hero-border:rgba(46,39,34,0.10);--pdj-hero-shadow:0 30px 80px rgba(46,39,34,0.14);
  --pdj-card-bg:#FFFFFF;--pdj-card-border:rgba(46,39,34,0.09);--pdj-card-shadow:0 1px 2px rgba(46,39,34,0.05);--pdj-divider:rgba(46,39,34,0.12);
  --pdj-ghost-border:rgba(46,39,34,0.16);--pdj-ghost-bg:rgba(46,39,34,0.04);--pdj-checkbox-border:rgba(46,39,34,0.28);
  --pdj-rdv-bg:rgba(6,182,212,0.09);--pdj-rdv-border:rgba(6,182,212,0.28);--pdj-calm-bg:rgba(16,185,129,0.09);--pdj-calm-border:rgba(16,185,129,0.30);
  --pdj-glow-em:rgba(16,185,129,0.14);--pdj-glow-vi:rgba(139,92,246,0.12);--pdj-ring-track:rgba(46,39,34,0.13);--pdj-ring-text:#211B16;
  --pdj-pin-op:0.07;--pdj-ten-op:0.09;
}
@keyframes pdj-sheen{0%{background-position:-200% 0}100%{background-position:200% 0}}
@keyframes pdj-pop{0%{transform:scale(0.2)}55%{transform:scale(1.18)}100%{transform:scale(1)}}
@keyframes pdj-burst{from{transform:translate(-50%,-50%) translate(0,0) scale(1);opacity:1}to{transform:translate(-50%,-50%) translate(var(--tx),var(--ty)) scale(0.2);opacity:0}}
`;

export function PlanDuJour({ data }: { data: CopiloteData }) {
  const { currentUser, unreadMessageCount } = useAppContext();
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const { clients: dormants } = useDormantClients(currentUser?.id ?? null);
  const { totalMargin, projection } = useRentabilitySummary(currentUser?.id ?? null);

  const [statuses, setStatuses] = useState<Record<string, Status>>({});
  const timers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});
  useEffect(() => () => { Object.values(timers.current).forEach(clearTimeout); }, []);

  const setStatus = (id: string, s: Status) => setStatuses((prev) => ({ ...prev, [id]: s }));
  const complete = (id: string) => {
    if (timers.current[id]) return;
    setStatus(id, "completing");
    timers.current[id] = setTimeout(() => { setStatus(id, "done"); delete timers.current[id]; }, 680);
  };

  const pct = projection > 0 ? Math.min(100, Math.round((totalMargin / projection) * 100)) : 0;
  const amount = `${Math.round(totalMargin).toLocaleString("fr-FR")} €`;

  const rdvs = useMemo(
    () => data.todayAgenda.map((r) => ({
      id: r.id, clientId: r.clientId,
      time: new Intl.DateTimeFormat("fr-FR", { hour: "2-digit", minute: "2-digit" }).format(r.time),
      tag: r.kind === "rdv-prospect" ? "RDV prospect" : "RDV client",
      name: r.name, sub: r.type,
    })),
    [data.todayAgenda]
  );

  const inboxCount = (unreadMessageCount ?? 0) + data.pendingFollowups.length;
  const allTasks = useMemo(() => {
    const relances = dormants.map((c) => ({
      id: c.client_id, kind: "relance" as const, phone: c.client_phone, urgency: c.urgency,
      tag: URGENCY_META[c.urgency].label, name: c.client_name, prio: prioOf(c.urgency),
      sub: c.last_order_date == null
        ? `Jamais commandé · ~${c.pv_potential} PV potentiels`
        : `${c.days_since_last_order} j sans commande · ~${c.pv_potential} PV${c.last_program_name ? ` · ${c.last_program_name}` : ""}`,
    }));
    const inbox = inboxCount > 0
      ? [{ id: "inbox", kind: "inbox" as const, phone: null, urgency: "recent" as DormantUrgency, tag: "Inbox", name: `${inboxCount} à traiter`, prio: "ok" as Prio, sub: "Messages & suivis en attente" }]
      : [];
    return [...relances, ...inbox];
  }, [dormants, inboxCount]);

  const status = (id: string): Status => statuses[id] ?? "active";
  const active = allTasks.filter((t) => { const s = status(t.id); return s === "active" || s === "completing"; });
  const done = allTasks.filter((t) => { const s = status(t.id); return s === "done" || s === "later"; });
  const total = allTasks.length;
  const treated = total - active.length;
  const isCalme = rdvs.length === 0 && total === 0;

  const noalyText = isCalme
    ? "Journée libre devant toi — aucun RDV, ta liste est à jour. Le moment idéal pour prospecter ou préparer demain."
    : rdvs.length > 0
      ? `${rdvs.length} RDV aujourd'hui${active.length > 0 ? ` et ${active.length} relance${active.length > 1 ? "s" : ""} prioritaire${active.length > 1 ? "s" : ""}${active[0] ? `, ${firstNameOf(active[0].name)} en tête` : ""}` : ""}.`
      : `Pas de RDV aujourd'hui — concentre-toi sur ${active.length} relance${active.length > 1 ? "s" : ""} prioritaire${active.length > 1 ? "s" : ""}${active[0] ? `, ${firstNameOf(active[0].name)} en tête` : ""}.`;

  function relanceWA(t: { id: string; name: string; phone: string | null; urgency: DormantUrgency }) {
    const prenom = firstNameOf(t.name);
    const msg = t.urgency === "never"
      ? `Salut ${prenom} 👋 On n'a pas encore démarré ensemble — ça te dirait qu'on cale un petit point pour te lancer ? 🌿`
      : `Salut ${prenom} 👋 Ça fait un moment ! Je repensais à ton suivi — où tu en es en ce moment ? Si tu veux on refait un point cette semaine 🙂`;
    const phone = (t.phone ?? "").replace(/\D/g, "");
    window.open(`${phone ? `https://wa.me/${phone}` : "https://wa.me/"}?text=${encodeURIComponent(msg)}`, "_blank", "noopener");
    complete(t.id);
  }

  const eyebrow = new Intl.DateTimeFormat("fr-FR", { weekday: "short", day: "numeric", month: "short" }).format(new Date()).toUpperCase();

  const heroStyle: React.CSSProperties = {
    position: "relative", overflow: "hidden", background: "var(--pdj-hero-bg)",
    border: "1px solid var(--pdj-hero-border)", borderRadius: 24,
    padding: isMobile ? "24px 20px 30px" : "40px 38px 44px", boxShadow: "var(--pdj-hero-shadow)",
  };

  return (
    <section style={heroStyle} aria-label="Ton plan du jour">
      <style>{PDJ_THEME_CSS}</style>

      {/* Glows */}
      <div aria-hidden="true" style={{ position: "absolute", left: -120, top: -120, width: 440, height: 440, background: "radial-gradient(circle, var(--pdj-glow-em), transparent 70%)", filter: "blur(18px)", pointerEvents: "none" }} />
      <div aria-hidden="true" style={{ position: "absolute", right: -150, bottom: -150, width: 500, height: 500, background: "radial-gradient(circle, var(--pdj-glow-vi), transparent 70%)", filter: "blur(18px)", pointerEvents: "none" }} />

      {/* Vrai pin de rang en filigrane, centré-droite discret (placement du
          design) → ne chevauche PAS la jauge en haut-droite. */}
      <div aria-hidden="true" style={{ position: "absolute", right: -34, top: "50%", transform: "translateY(-50%)", width: 360, height: 360, opacity: "var(--pdj-pin-op)" as unknown as number, pointerEvents: "none", zIndex: 0 }}>
        <PinAWTCinematic positioned={false} size={360} opacity={1} />
      </div>

      {/* « 360 » filigrane gradient G3 (bas-droite) */}
      <div aria-hidden="true" style={{ position: "absolute", right: 18, bottom: -48, fontFamily: "'Fraunces', serif", fontStyle: "italic", fontWeight: 600, fontSize: 300, lineHeight: 0.8, background: "linear-gradient(135deg,#10B981 0%,#06B6D4 50%,#8B5CF6 100%)", WebkitBackgroundClip: "text", backgroundClip: "text", color: "transparent", opacity: "var(--pdj-ten-op)" as unknown as number, pointerEvents: "none", userSelect: "none", zIndex: 0 }}>360</div>

      <div style={{ position: "relative", zIndex: 2 }}>
        {/* Ligne Noaly */}
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 24 }}>
          <div aria-hidden="true" style={{ width: 26, height: 26, borderRadius: 8, background: "linear-gradient(135deg,#10B981 0%,#06B6D4 50%,#8B5CF6 100%)", flex: "0 0 auto", boxShadow: "0 4px 14px rgba(6,182,212,0.4)" }} />
          <div style={{ fontSize: 13.5, lineHeight: 1.45, color: "var(--pdj-text-sec)" }}>
            <span style={{ fontFamily: "'Sora', sans-serif", fontWeight: 700, color: "var(--pdj-text-strong)" }}>Noaly</span> · {noalyText}
          </div>
        </div>

        {/* En-tête : titre + jauge */}
        <div style={isMobile ? { display: "flex", flexDirection: "column", gap: 18 } : { display: "flex", flexWrap: "wrap", justifyContent: "space-between", alignItems: "flex-start", gap: "22px 24px" }}>
          <div style={{ minWidth: 240, flex: "1 0 320px" }}>
            <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, letterSpacing: "0.16em", color: "var(--pdj-text-faint)", marginBottom: 10, whiteSpace: "nowrap" }}>{eyebrow} · TON PLAN DU JOUR</div>
            <h1 style={{ margin: 0, fontFamily: "'Fraunces', serif", fontStyle: "italic", fontWeight: 600, fontSize: isMobile ? 33 : 40, lineHeight: 1.04, color: "var(--pdj-text-strong)", letterSpacing: "-0.01em" }}>Ton plan du jour</h1>
            <div style={{ marginTop: 10, fontSize: 14.5, color: "var(--pdj-text-sec)" }}>Ce qui compte aujourd'hui · rangé par priorité</div>
            {!isCalme && total > 0 ? (
              <div style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 16, maxWidth: 330 }}>
                <div style={{ flex: 1, height: 5, borderRadius: 3, background: "var(--pdj-ring-track)", overflow: "hidden" }}>
                  <div style={{ width: `${total > 0 ? Math.round((treated / total) * 100) : 0}%`, height: "100%", borderRadius: 3, background: "linear-gradient(90deg,#10B981,#06B6D4,#8B5CF6)", transition: "width .4s ease" }} />
                </div>
                <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 12, color: "var(--pdj-text-sec)", whiteSpace: "nowrap" }}>{treated} / {total} traité</span>
              </div>
            ) : null}
          </div>

          {/* Jauge rentabilité */}
          <div style={isMobile
            ? { display: "flex", flexDirection: "row", alignItems: "center", padding: "14px 16px", background: "var(--pdj-card-bg)", border: "1px solid var(--pdj-card-border)", boxShadow: "var(--pdj-card-shadow)", borderRadius: 14 }
            : { display: "flex", flexDirection: "column", alignItems: "flex-end", flex: "0 0 auto", maxWidth: 232, marginLeft: "auto" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
              <Ring pct={pct} size={isMobile ? 72 : 78} />
              <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
                <span style={{ fontFamily: "'Sora', sans-serif", fontWeight: 800, fontSize: 26, color: "var(--pdj-text-strong)", lineHeight: 1 }}>{amount}</span>
                <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, color: "var(--pdj-text-faint)" }}>ce mois · {pct} % proj.</span>
                <button type="button" onClick={() => navigate("/rentabilite")} style={{ marginTop: 6, alignSelf: "flex-start", display: "inline-flex", alignItems: "center", gap: 5, background: "var(--pdj-ghost-bg)", border: "1px solid var(--pdj-ghost-border)", color: "var(--pdj-text-sec)", fontFamily: "'Inter', sans-serif", fontSize: 11.5, fontWeight: 500, padding: "6px 11px", borderRadius: 9, cursor: "pointer" }}>+ commande hors-app</button>
              </div>
            </div>
          </div>
        </div>

        {/* Corps */}
        <div style={{ marginTop: 30 }}>
          {!isCalme ? (
            <>
              {rdvs.length > 0 ? (
                <>
                  <SectionLabel>Rendez-vous du jour</SectionLabel>
                  <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 26 }}>
                    {rdvs.map((r) => (
                      <div key={r.id} style={{ display: "flex", alignItems: "center", gap: 16, padding: "16px 18px", background: "var(--pdj-rdv-bg)", border: "1px solid var(--pdj-rdv-border)", borderRadius: 14 }}>
                        <div style={{ fontFamily: "'JetBrains Mono', monospace", fontWeight: 600, fontSize: 15, color: "#0891B2", width: 50, flex: "0 0 auto" }}>{r.time}</div>
                        <div style={{ width: 1, height: 36, background: "var(--pdj-divider)", flex: "0 0 auto" }} />
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <span style={{ display: "inline-block", fontSize: 10.5, fontFamily: "'JetBrains Mono', monospace", letterSpacing: "0.06em", color: "#0891B2", background: "rgba(6,182,212,0.12)", border: "1px solid rgba(6,182,212,0.28)", padding: "2px 7px", borderRadius: 6, marginBottom: 5 }}>{r.tag}</span>
                          <div style={{ fontFamily: "'Sora', sans-serif", fontWeight: 700, fontSize: 16, color: "var(--pdj-text-strong)" }}>{r.name}</div>
                          <div style={{ fontSize: 13, color: "var(--pdj-text-sec)", marginTop: 2 }}>{r.sub}</div>
                        </div>
                        <button type="button" onClick={() => navigate(`/clients/${r.clientId}`)} style={{ flex: "0 0 auto", background: "rgba(6,182,212,0.16)", border: "1px solid rgba(6,182,212,0.34)", color: "#0E7490", fontFamily: "'Sora', sans-serif", fontWeight: 600, fontSize: 13, padding: "9px 18px", borderRadius: 10, cursor: "pointer" }}>Ouvrir</button>
                      </div>
                    ))}
                  </div>
                </>
              ) : null}

              <SectionLabel>Relances &amp; inbox · par priorité</SectionLabel>
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {active.map((t, i) => {
                  const c = prioColor(t.prio);
                  const focus = i === 0;
                  const completing = status(t.id) === "completing";
                  return (
                    <div key={t.id} style={{ display: "flex", padding: "15px 18px", background: focus ? hexA(c, 0.07) : "var(--pdj-card-bg)", border: `1px solid ${focus ? hexA(c, 0.5) : "var(--pdj-card-border)"}`, boxShadow: focus ? `0 0 0 1px ${hexA(c, 0.18)}, 0 12px 30px ${hexA(c, 0.12)}` : "var(--pdj-card-shadow)", borderRadius: 14, alignItems: isMobile ? "stretch" : "center", flexDirection: isMobile ? "column" : "row", gap: isMobile ? 12 : 14 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 14, flex: 1, minWidth: 0 }}>
                        <div style={{ width: 4, height: 46, borderRadius: 3, flex: "0 0 auto", background: c, boxShadow: `0 0 14px ${hexA(c, 0.5)}` }} />
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                            <span style={{ display: "inline-block", fontSize: 10.5, fontFamily: "'JetBrains Mono', monospace", letterSpacing: "0.06em", color: c, background: hexA(c, 0.13), border: `1px solid ${hexA(c, 0.28)}`, padding: "2px 7px", borderRadius: 6 }}>{t.tag}</span>
                            {focus ? (
                              <span style={{ fontSize: 9.5, fontFamily: "'JetBrains Mono', monospace", letterSpacing: "0.12em", fontWeight: 600, color: "#fff", background: "linear-gradient(135deg,#10B981,#06B6D4,#8B5CF6)", padding: "3px 8px", borderRadius: 6 }}>MAINTENANT</span>
                            ) : null}
                          </div>
                          <div style={{ fontFamily: "'Sora', sans-serif", fontWeight: 700, fontSize: 16, color: "var(--pdj-text-strong)", marginTop: 5 }}>{t.name}</div>
                          <div style={{ fontSize: 13, color: "var(--pdj-text-sec)", marginTop: 2 }}>{t.sub}</div>
                        </div>
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, flex: "0 0 auto", flexWrap: "wrap", justifyContent: isMobile ? "flex-start" : "flex-end", paddingLeft: isMobile ? 18 : 0 }}>
                        {!completing ? (
                          <>
                            {t.kind === "relance" ? (
                              <>
                                <button type="button" onClick={() => relanceWA(t)} style={{ display: "inline-flex", alignItems: "center", gap: 6, background: "linear-gradient(135deg,#25D366,#1FA855)", border: "none", color: "#fff", fontFamily: "'Sora', sans-serif", fontWeight: 600, fontSize: 13, padding: "9px 14px", borderRadius: 10, cursor: "pointer", boxShadow: "0 6px 16px rgba(37,211,102,0.26)" }}>✨ WhatsApp</button>
                                <button type="button" onClick={() => setStatus(t.id, "later")} style={{ background: "transparent", border: "1px solid var(--pdj-ghost-border)", color: "var(--pdj-text-sec)", fontFamily: "'Inter', sans-serif", fontSize: 13, padding: "9px 12px", borderRadius: 10, cursor: "pointer" }}>Plus tard</button>
                              </>
                            ) : (
                              <button type="button" onClick={() => navigate("/messages")} style={{ background: "rgba(16,185,129,0.14)", border: "1px solid rgba(16,185,129,0.34)", color: "#059669", fontFamily: "'Sora', sans-serif", fontWeight: 600, fontSize: 13, padding: "9px 16px", borderRadius: 10, cursor: "pointer" }}>Ouvrir</button>
                            )}
                            <div onClick={() => complete(t.id)} title="Marquer comme fait" role="button" tabIndex={0} style={{ width: 30, height: 30, borderRadius: "50%", border: "2px solid var(--pdj-checkbox-border)", cursor: "pointer", flex: "0 0 auto" }} />
                          </>
                        ) : (
                          <div style={{ position: "relative", width: 30, height: 30, flex: "0 0 auto" }}>
                            <div style={{ position: "absolute", inset: 0, borderRadius: "50%", background: "linear-gradient(135deg,#10B981,#06B6D4)", display: "flex", alignItems: "center", justifyContent: "center", color: "#04241a", fontWeight: 800, fontSize: 15, animation: "pdj-pop .4s ease", boxShadow: "0 0 18px rgba(16,185,129,0.5)" }}>✓</div>
                            {PARTICLE_DIRS.map((d, pi) => (
                              <span key={pi} style={{ position: "absolute", left: "50%", top: "50%", width: 6, height: 6, borderRadius: "50%", background: PARTICLE_COLS[pi], ["--tx" as string]: `${d[0]}px`, ["--ty" as string]: `${d[1]}px`, animation: "pdj-burst .6s ease-out forwards", pointerEvents: "none" } as React.CSSProperties} />
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}

                {active.length === 0 ? (
                  <div style={{ textAlign: "center", padding: 30, border: "1px solid var(--pdj-calm-border)", borderRadius: 14, background: "linear-gradient(110deg, var(--pdj-calm-bg), var(--pdj-calm-bg)), linear-gradient(110deg, rgba(16,185,129,0) 30%, rgba(6,182,212,0.18) 50%, rgba(139,92,246,0) 70%)", backgroundSize: "100% 100%, 200% 100%", animation: "pdj-sheen 3.5s linear infinite", color: "#10B981", fontFamily: "'Sora', sans-serif", fontWeight: 600, fontSize: 15 }}>Liste à jour ✓ — tout est traité, belle journée</div>
                ) : null}
              </div>

              {done.length > 0 ? (
                <div style={{ marginTop: 22 }}>
                  <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, letterSpacing: "0.14em", color: "var(--pdj-text-faint)", marginBottom: 6 }}>FAIT AUJOURD'HUI</div>
                  {done.map((d) => (
                    <div key={d.id} style={{ display: "flex", alignItems: "center", gap: 14, padding: "11px 18px", opacity: 0.55 }}>
                      <div onClick={() => setStatus(d.id, "active")} role="button" tabIndex={0} style={{ width: 26, height: 26, borderRadius: "50%", background: "linear-gradient(135deg,#10B981,#06B6D4)", display: "flex", alignItems: "center", justifyContent: "center", color: "#04241a", fontWeight: 800, fontSize: 14, cursor: "pointer", flex: "0 0 auto" }}>✓</div>
                      <div style={{ flex: 1, minWidth: 0, fontFamily: "'Sora', sans-serif", fontWeight: 600, fontSize: 14.5, color: "var(--pdj-text)", textDecoration: "line-through" }}>{d.name}</div>
                      <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, color: "var(--pdj-text-faint)" }}>{status(d.id) === "later" ? "Reporté" : "Fait"}</span>
                    </div>
                  ))}
                </div>
              ) : null}
            </>
          ) : (
            <CalmeState navigate={navigate} />
          )}
        </div>
      </div>
    </section>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, letterSpacing: "0.14em", color: "var(--pdj-text-faint)", marginBottom: 12, textTransform: "uppercase" }}>{children}</div>;
}

function Ring({ pct, size }: { pct: number; size: number }) {
  const R = 34, C = 2 * Math.PI * R, off = C * (1 - pct / 100);
  return (
    <svg width={size} height={size} viewBox="0 0 88 88" style={{ display: "block", flex: "0 0 auto" }} aria-hidden="true">
      <defs>
        <linearGradient id="pdj-g3ring" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#10B981" />
          <stop offset="50%" stopColor="#06B6D4" />
          <stop offset="100%" stopColor="#8B5CF6" />
        </linearGradient>
      </defs>
      <circle cx={44} cy={44} r={R} fill="none" stroke="var(--pdj-ring-track)" strokeWidth={7} />
      <circle cx={44} cy={44} r={R} fill="none" stroke="url(#pdj-g3ring)" strokeWidth={7} strokeLinecap="round" strokeDasharray={C} strokeDashoffset={off} transform="rotate(-90 44 44)" />
      <text x={44} y={45} textAnchor="middle" dominantBaseline="central" fontFamily="Sora, sans-serif" fontSize={21} fontWeight={800} fill="var(--pdj-ring-text)">{pct}%</text>
    </svg>
  );
}

function CalmeState({ navigate }: { navigate: (p: string) => void }) {
  const suggestions = [
    { id: "s1", color: "#10B981", name: "Prospecter 3 nouveaux contacts", sub: "Relance ta liste d'invités · objectif 3 messages envoyés", to: "/crm" },
    { id: "s2", color: "#06B6D4", name: "Préparer les RDV de demain", sub: "Relis les bilans avant tes prochains rendez-vous", to: "/agenda" },
    { id: "s3", color: "#8B5CF6", name: "Réveiller tes « Très dormants »", sub: "Tes contacts sans nouvelle depuis longtemps", to: "/pv" },
  ];
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 22, padding: 30, background: "var(--pdj-calm-bg)", border: "1px solid var(--pdj-calm-border)", borderRadius: 18 }}>
        <div style={{ width: 64, height: 64, borderRadius: "50%", background: "linear-gradient(135deg,#10B981,#06B6D4)", display: "flex", alignItems: "center", justifyContent: "center", flex: "0 0 auto", boxShadow: "0 10px 30px rgba(16,185,129,0.35)" }}>
          <span style={{ color: "#04241a", fontSize: 30, fontWeight: 800 }}>✓</span>
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontFamily: "'Fraunces', serif", fontStyle: "italic", fontWeight: 600, fontSize: 26, color: "var(--pdj-text-strong)" }}>Journée libre</div>
          <div style={{ fontSize: 14, color: "var(--pdj-text-sec)", marginTop: 6, lineHeight: 1.55 }}>Aucun RDV, ta liste est à jour. Profites-en pour prospecter ou préparer demain — l'avance d'aujourd'hui, c'est le chiffre de la semaine prochaine.</div>
        </div>
      </div>
      <SectionLabel>Suggestions de Noaly</SectionLabel>
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {suggestions.map((s) => (
          <div key={s.id} onClick={() => navigate(s.to)} role="button" tabIndex={0} style={{ display: "flex", alignItems: "center", gap: 14, padding: "15px 18px", background: "var(--pdj-card-bg)", border: "1px solid var(--pdj-card-border)", boxShadow: "var(--pdj-card-shadow)", borderRadius: 14, cursor: "pointer" }}>
            <div style={{ width: 10, height: 10, borderRadius: "50%", background: s.color, boxShadow: `0 0 12px ${hexA(s.color, 0.6)}`, flex: "0 0 auto" }} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontFamily: "'Sora', sans-serif", fontWeight: 600, fontSize: 15, color: "var(--pdj-text-strong)" }}>{s.name}</div>
              <div style={{ fontSize: 13, color: "var(--pdj-text-sec)", marginTop: 2 }}>{s.sub}</div>
            </div>
            <span style={{ fontFamily: "'Inter', sans-serif", fontSize: 16, color: "var(--pdj-text-faint)" }}>→</span>
          </div>
        ))}
      </div>
    </div>
  );
}
