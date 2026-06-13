// =============================================================================
// PlanDuJour — Co-pilote refonte « Plan du jour » (chantier 1, 2026-06-13).
//
// Remplace le hero éditorial. Une SEULE file d'actions priorisée (RDV du jour
// → relances propres → inbox), dans le shell premium signature (360 filigrane
// + pin de rang tournant) que Thomas tient à garder. Noaly narre la journée en
// tête ; chaque relance se traite en 1 tap (WhatsApp pré-rempli) avec « Fait »
// et « Plus tard ». Mini-jauge rentabilité dans le coin (anneau + €).
//
// Les relances viennent de useDormantClients → RPC nettoyée au chantier 0
// (exclut pause / arrêtés / suivi libre). Donc la liste est déjà propre.
//
// v1 : « Fait / Plus tard » en état local (persistance = brique suivante) ;
// message WhatsApp pré-rempli (génération Noaly perso = brique suivante).
// =============================================================================

import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAppContext } from "../../../../context/AppContext";
import { useDormantClients, URGENCY_META } from "../../../../hooks/useDormantClients";
import { useRentabilitySummary } from "../../../../hooks/useRentabilitySummary";
import type { CopiloteData } from "../../../../hooks/useCopiloteData";

const MAX_RELANCES = 5;

function firstNameOf(full: string): string {
  return (full || "").trim().split(/\s+/)[0] || "";
}

export function PlanDuJour({ data }: { data: CopiloteData }) {
  const { currentUser, unreadMessageCount } = useAppContext();
  const navigate = useNavigate();
  const { clients: dormants } = useDormantClients(currentUser?.id ?? null);
  const { totalMargin, projection } = useRentabilitySummary(currentUser?.id ?? null);

  const [done, setDone] = useState<Set<string>>(new Set());
  const [snoozed, setSnoozed] = useState<Set<string>>(new Set());

  const pct = projection > 0 ? Math.min(100, Math.round((totalMargin / projection) * 100)) : 0;

  const relances = useMemo(
    () => dormants.filter((c) => !snoozed.has(c.client_id)).slice(0, MAX_RELANCES),
    [dormants, snoozed]
  );
  const moreRelances = Math.max(0, dormants.filter((c) => !snoozed.has(c.client_id)).length - MAX_RELANCES);

  const rdvs = data.todayAgenda;
  const inboxPending = data.pendingFollowups.length;
  const doneCount = relances.filter((c) => done.has(c.client_id)).length;

  const narration = useMemo(() => {
    const r = relances.length;
    if (rdvs.length > 0) {
      const top = relances[0] ? `, ${firstNameOf(relances[0].client_name)} en tête` : "";
      return `${rdvs.length} RDV aujourd'hui${r > 0 ? ` et ${r} relance${r > 1 ? "s" : ""} prioritaire${r > 1 ? "s" : ""}${top}` : ""}.`;
    }
    if (r > 0) {
      const top = relances[0] ? `, ${firstNameOf(relances[0].client_name)} en tête` : "";
      return `Pas de RDV aujourd'hui — concentre-toi sur ${r} relance${r > 1 ? "s" : ""} prioritaire${r > 1 ? "s" : ""}${top}.`;
    }
    return "Journée libre et liste de relances à jour — profites-en pour prospecter ou préparer demain.";
  }, [rdvs.length, relances]);

  function relanceWhatsApp(c: (typeof dormants)[number]) {
    const meta = URGENCY_META[c.urgency];
    const prenom = firstNameOf(c.client_name);
    const msg =
      c.urgency === "never"
        ? `Salut ${prenom} 👋 On n'a pas encore démarré ensemble — ça te dirait qu'on cale un petit point pour te lancer ? 🌿`
        : `Salut ${prenom} 👋 Ça fait un moment ! Je repensais à ton suivi — où tu en es en ce moment ? Si tu veux on refait un point ensemble cette semaine 🙂`;
    void meta;
    const phone = (c.client_phone ?? "").replace(/\D/g, "");
    const base = phone ? `https://wa.me/${phone}` : "https://wa.me/";
    window.open(`${base}?text=${encodeURIComponent(msg)}`, "_blank", "noopener");
    setDone((prev) => new Set(prev).add(c.client_id));
  }

  const fmtMargin = Math.round(totalMargin).toLocaleString("fr-FR");

  return (
    <section style={heroStyle} aria-label="Ton plan du jour">
      <style>{`
        @keyframes pdj-spin{to{transform:rotate(360deg)}}
        @media (prefers-reduced-motion: reduce){.pdj-pin,.pdj-pin>span{animation:none!important}}
      `}</style>

      <div aria-hidden="true" style={watermarkStyle}>360</div>
      <div aria-hidden="true" className="pdj-pin" style={pinStyle}>
        <span style={{ fontSize: 26, display: "inline-block", animation: "pdj-spin 22s linear infinite reverse" }}>🌿</span>
      </div>

      <div style={{ position: "relative", zIndex: 2 }}>
        {/* Noaly narre la journée */}
        <div style={noalyLineStyle}>
          <span aria-hidden="true" style={noalyIconStyle}>✨</span>
          <span><strong style={{ color: "#D7C8FF", fontWeight: 600 }}>Noaly ·</strong> {narration}</span>
        </div>

        {/* En-tête + mini-jauge rentabilité */}
        <div style={headRowStyle}>
          <div>
            <div style={kickerStyle}>▸ Ton plan du jour</div>
            <h2 style={titleStyle}>Ce qui compte aujourd'hui</h2>
            <div style={progStyle}>
              {relances.length > 0 ? `${doneCount} / ${relances.length} relance${relances.length > 1 ? "s" : ""} traitée${doneCount > 1 ? "s" : ""}` : "Rangé par priorité"}
            </div>
          </div>
          <button type="button" onClick={() => navigate("/rentabilite")} style={rentBtnStyle} aria-label="Voir ma rentabilité">
            <span aria-hidden="true" style={ringStyle(pct)}><span style={ringHoleStyle}>{pct}%</span></span>
            <span style={{ textAlign: "left" }}>
              <span style={{ fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: 16, display: "block" }}>{fmtMargin} €</span>
              <span style={{ fontSize: 9.5, color: "rgba(255,255,255,.6)" }}>ce mois · {pct}% projection</span>
              <span style={addOrderChipStyle}>+ commande hors-app</span>
            </span>
          </button>
        </div>

        {/* File d'actions */}
        <div style={rowsStyle}>
          {/* RDV du jour */}
          {rdvs.length === 0 ? (
            <Row accent="var(--ls-teal)" tag="Agenda" name="Aucun RDV aujourd'hui" desc="Journée libre — relance" ok />
          ) : (
            rdvs.map((rdv) => (
              <Row
                key={rdv.id}
                accent={rdv.kind === "rdv-prospect" ? "var(--ls-purple)" : "var(--ls-teal)"}
                tag={rdv.kind === "rdv-prospect" ? "RDV prospect" : "RDV client"}
                name={rdv.name}
                desc={`${rdv.type} · ${new Intl.DateTimeFormat("fr-FR", { hour: "2-digit", minute: "2-digit" }).format(rdv.time)}`}
                onPrimary={() => navigate(`/clients/${rdv.clientId}`)}
                primaryLabel="Ouvrir"
              />
            ))
          )}

          {/* Relances propres */}
          {relances.map((c) => {
            const meta = URGENCY_META[c.urgency];
            const isDone = done.has(c.client_id);
            const sub =
              c.last_order_date == null
                ? `Jamais commandé · ~${c.pv_potential} PV potentiels`
                : `${c.days_since_last_order} j sans commande · ~${c.pv_potential} PV${c.last_program_name ? ` · ${c.last_program_name}` : ""}`;
            return (
              <Row
                key={c.client_id}
                accent={meta.color}
                tag={meta.label}
                name={c.client_name}
                desc={isDone ? "Relancé ✓" : sub}
                ok={isDone}
                wa={!isDone ? () => relanceWhatsApp(c) : undefined}
                snooze={!isDone ? () => setSnoozed((p) => new Set(p).add(c.client_id)) : undefined}
                onCheck={() => setDone((p) => { const n = new Set(p); n.has(c.client_id) ? n.delete(c.client_id) : n.add(c.client_id); return n; })}
              />
            );
          })}

          {moreRelances > 0 ? (
            <Row accent="var(--ls-gold)" tag="Plan PV" name={`+${moreRelances} client${moreRelances > 1 ? "s" : ""} à reconquérir`} desc="Voir le plan de relance complet" onPrimary={() => navigate("/pv")} primaryLabel="Voir tout →" />
          ) : null}

          {/* Inbox */}
          {inboxPending > 0 ? (
            <Row accent="var(--ls-coral)" tag="Inbox" name={`${inboxPending} suivi${inboxPending > 1 ? "s" : ""} à traiter`} desc="Suivis protocole en attente" onPrimary={() => navigate("/messages")} primaryLabel="Ouvrir" />
          ) : (
            <Row accent="var(--ls-teal)" tag="Inbox" name="Messagerie à jour" desc={`${(unreadMessageCount ?? 0) === 0 ? "0 message en attente" : `${unreadMessageCount} non lus`}`} ok={(unreadMessageCount ?? 0) === 0} onPrimary={() => navigate("/messages")} primaryLabel="Ouvrir" />
          )}
        </div>

        <div style={footStyle}>
          🔌 Relances filtrées (hors pause · arrêtés · suivi libre). 💡 « ✨ WhatsApp » = message pré-rempli, bientôt écrit par Noaly.
        </div>
      </div>
    </section>
  );
}

// ─── Ligne d'action ─────────────────────────────────────────────────────────
function Row(props: {
  accent: string;
  tag: string;
  name: string;
  desc: string;
  ok?: boolean;
  wa?: () => void;
  snooze?: () => void;
  onPrimary?: () => void;
  primaryLabel?: string;
  onCheck?: () => void;
}) {
  const { accent, tag, name, desc, ok, wa, snooze, onPrimary, primaryLabel, onCheck } = props;
  return (
    <div style={{ ...rowStyle, opacity: ok ? 0.5 : 1 }}>
      <span aria-hidden="true" style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: 3, background: accent }} />
      <span aria-hidden="true" style={{ flex: "0 0 auto", width: 8, height: 8, borderRadius: "50%", background: accent, boxShadow: `0 0 8px ${accent}` }} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 7, flexWrap: "wrap" }}>
          <span style={{ fontSize: 8.5, fontWeight: 700, letterSpacing: 0.5, textTransform: "uppercase", padding: "2px 6px", borderRadius: 20, color: accent, background: `color-mix(in srgb, ${accent} 18%, transparent)` }}>{tag}</span>
          <span style={{ fontWeight: 700, fontSize: 13.5, color: "#fff" }}>{name}</span>
        </div>
        <div style={{ fontSize: 11, color: "rgba(255,255,255,.62)", marginTop: 1 }}>{desc}</div>
      </div>
      <div style={{ display: "flex", gap: 6, flexShrink: 0, flexWrap: "wrap", justifyContent: "flex-end" }}>
        {wa ? <button type="button" onClick={wa} style={{ ...btnBase, background: "#25D366", color: "#06241f" }}>✨ WhatsApp</button> : null}
        {snooze ? <button type="button" onClick={snooze} style={{ ...btnBase, background: "rgba(255,255,255,.08)", color: "#fff", border: "1px solid rgba(255,255,255,.16)" }}>Plus tard</button> : null}
        {onPrimary ? <button type="button" onClick={onPrimary} style={{ ...btnBase, background: "rgba(255,255,255,.08)", color: "#fff", border: "1px solid rgba(255,255,255,.16)" }}>{primaryLabel ?? "Ouvrir"}</button> : null}
      </div>
      {onCheck ? (
        <button type="button" onClick={onCheck} aria-label={ok ? "Marquer non fait" : "Marquer fait"} style={{ flex: "0 0 auto", width: 22, height: 22, borderRadius: 7, border: ok ? "1.5px solid var(--ls-teal)" : "1.5px solid rgba(255,255,255,.18)", background: ok ? "var(--ls-teal)" : "transparent", color: ok ? "#06241f" : "rgba(255,255,255,.45)", cursor: "pointer", fontSize: 12 }}>{ok ? "✓" : "○"}</button>
      ) : ok ? (
        <span aria-hidden="true" style={{ flex: "0 0 auto", width: 22, height: 22, borderRadius: 7, background: "var(--ls-teal)", color: "#06241f", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12 }}>✓</span>
      ) : null}
    </div>
  );
}

// ─── Styles ─────────────────────────────────────────────────────────────────
const heroStyle: React.CSSProperties = {
  position: "relative",
  overflow: "hidden",
  borderRadius: 20,
  padding: "20px 22px 14px",
  background: "radial-gradient(120% 140% at 85% 0%, #16322B 0%, #0E1A1C 45%, #0C1116 100%)",
  border: "1px solid rgba(45,212,191,.18)",
};
const watermarkStyle: React.CSSProperties = {
  position: "absolute", right: "6%", top: "46%", transform: "translateY(-50%)",
  fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: 230, lineHeight: 1,
  color: "rgba(255,255,255,.035)", letterSpacing: "-10px", pointerEvents: "none", userSelect: "none",
};
const pinStyle: React.CSSProperties = {
  position: "absolute", top: 18, right: 24, width: 92, height: 92, borderRadius: "50%",
  background: "repeating-conic-gradient(rgba(201,168,76,.20) 0deg 12deg, rgba(201,168,76,.05) 12deg 24deg)",
  border: "2px solid rgba(201,168,76,.30)", display: "flex", alignItems: "center", justifyContent: "center",
  animation: "pdj-spin 22s linear infinite", opacity: 0.5, pointerEvents: "none",
};
const noalyLineStyle: React.CSSProperties = {
  display: "flex", alignItems: "center", gap: 9, fontSize: 12.5, color: "#fff",
  background: "rgba(139,92,246,.14)", border: "1px solid rgba(139,92,246,.30)", borderRadius: 11,
  padding: "9px 12px", marginBottom: 13, maxWidth: "92%",
};
const noalyIconStyle: React.CSSProperties = {
  width: 22, height: 22, borderRadius: 7, flex: "0 0 auto",
  background: "linear-gradient(135deg, var(--ls-purple), var(--ls-teal))",
  display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12,
};
const headRowStyle: React.CSSProperties = { display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 14, flexWrap: "wrap" };
const kickerStyle: React.CSSProperties = { fontSize: 10.5, letterSpacing: 2, textTransform: "uppercase", color: "var(--ls-gold)", fontWeight: 700, fontFamily: "'JetBrains Mono', monospace" };
const titleStyle: React.CSSProperties = { fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: 23, letterSpacing: "-0.4px", margin: "6px 0 0", color: "#fff" };
const progStyle: React.CSSProperties = { fontSize: 11.5, color: "rgba(255,255,255,.62)", marginTop: 4 };
const rentBtnStyle: React.CSSProperties = {
  display: "flex", alignItems: "center", gap: 10, background: "rgba(255,255,255,.05)",
  border: "1px solid rgba(255,255,255,.12)", borderRadius: 13, padding: "9px 12px", cursor: "pointer",
};
const ringHoleStyle: React.CSSProperties = {
  position: "absolute", width: 32, height: 32, borderRadius: "50%", background: "#10201E",
  display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10.5, fontWeight: 700,
  fontFamily: "'Syne', sans-serif", color: "#fff",
};
function ringStyle(pct: number): React.CSSProperties {
  return {
    width: 44, height: 44, borderRadius: "50%", flex: "0 0 auto", position: "relative",
    display: "flex", alignItems: "center", justifyContent: "center",
    background: `conic-gradient(var(--ls-purple) 0% ${pct}%, rgba(255,255,255,.10) ${pct}% 100%)`,
  };
}
const addOrderChipStyle: React.CSSProperties = {
  display: "inline-block", marginTop: 5, fontSize: 10, fontWeight: 700, color: "var(--ls-gold)",
  background: "color-mix(in srgb, var(--ls-gold) 16%, transparent)", borderRadius: 7, padding: "4px 8px",
};
const rowsStyle: React.CSSProperties = { marginTop: 15, display: "flex", flexDirection: "column", gap: 8, maxWidth: 780 };
const rowStyle: React.CSSProperties = {
  display: "flex", alignItems: "center", gap: 11, position: "relative", overflow: "hidden",
  background: "rgba(255,255,255,.045)", border: "1px solid rgba(255,255,255,.09)", borderRadius: 12, padding: "11px 13px",
};
const btnBase: React.CSSProperties = {
  fontSize: 11, fontWeight: 600, padding: "7px 11px", borderRadius: 9, border: "none",
  cursor: "pointer", whiteSpace: "nowrap", fontFamily: "'DM Sans', sans-serif",
};
const footStyle: React.CSSProperties = {
  marginTop: 12, paddingTop: 9, borderTop: "1px solid rgba(255,255,255,.08)",
  fontSize: 11, color: "rgba(255,255,255,.6)",
};
