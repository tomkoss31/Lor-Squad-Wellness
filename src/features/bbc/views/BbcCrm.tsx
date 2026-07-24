// =============================================================================
// BbcCrm — « Cobayes & membres » : la liste RÉELLE des membres BBC du coach,
// cliquable, avec un RÉCAP complet par membre (contact, objectif, programme,
// statut, visites, cœurs, RDV). Données réelles via useBbcMembers.
// =============================================================================

import { useState } from "react";
import { useBbcMembers, type BbcMember } from "../useBbcMembers";
import { visitLevel } from "../useBbcVisits";

function objLabel(o?: string) {
  const map: Record<string, string> = {
    "weight-loss": "perte de poids",
    sport: "sport / performance",
    "mass-gain": "prise de masse",
    strength: "force",
    cutting: "sèche",
    endurance: "endurance",
    fitness: "forme",
    competition: "compétition",
  };
  return o ? map[o] ?? o : "—";
}
function lifeLabel(s?: string) {
  const map: Record<string, string> = {
    active: "en suivi actif",
    not_started: "à démarrer",
    paused: "en pause",
    stopped: "arrêté",
    lost: "perdu",
  };
  return s ? map[s] ?? s : "—";
}
function fmtDate(iso?: string | null) {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" });
  } catch {
    return "—";
  }
}
function levelColor(v: number) {
  const l = visitLevel(v);
  return l === "bilan" ? "var(--ls-bbc-coral)" : l === "warn" ? "var(--ls-bbc-amber)" : "var(--ls-bbc-teal)";
}

interface BbcCrmProps {
  userId?: string;
}

export function BbcCrm({ userId }: BbcCrmProps) {
  const { members, loading } = useBbcMembers(userId);
  const [open, setOpen] = useState<string | null>(null);

  const totalVisits = members.reduce((s, m) => s + m.visits, 0);
  const totalHearts = members.reduce((s, m) => s + m.hearts, 0);
  const pending = members.reduce((s, m) => s + m.pendingHearts, 0);

  const stats: Array<{ label: string; value: string; tone: string }> = [
    { label: "membres BBC", value: String(members.length), tone: "var(--ls-bbc-lime-text)" },
    { label: "visites cumulées", value: String(totalVisits), tone: "var(--ls-bbc-teal)" },
    { label: "cœurs", value: String(totalHearts), tone: "var(--ls-bbc-lime-text)" },
    { label: "recos à valider", value: String(pending), tone: pending ? "var(--ls-bbc-coral)" : "var(--ls-bbc-text)" },
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 16 }}>
        {stats.map((s) => (
          <div key={s.label} style={{ background: "var(--ls-bbc-s1)", border: "1px solid var(--ls-bbc-line)", borderRadius: 16, padding: "18px 20px", borderTop: `2px solid ${s.tone}` }}>
            <div style={{ fontFamily: "var(--ls-bbc-font-mono)", fontSize: 10, fontWeight: 600, letterSpacing: "0.14em", color: "var(--ls-bbc-muted)", textTransform: "uppercase" }}>{s.label}</div>
            <div style={{ fontFamily: "var(--ls-bbc-font-mono)", fontWeight: 800, fontSize: 34, color: s.tone, lineHeight: 1, marginTop: 8 }}>{s.value}</div>
          </div>
        ))}
      </div>

      <div style={{ background: "var(--ls-bbc-s1)", border: "1px solid var(--ls-bbc-line)", borderRadius: 20, padding: "18px 20px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4, fontFamily: "var(--ls-bbc-font-mono)", fontSize: 11, fontWeight: 600, letterSpacing: "0.14em", color: "var(--ls-bbc-muted)", textTransform: "uppercase" }}>
          <span style={{ width: 7, height: 7, borderRadius: 999, background: "var(--ls-bbc-lime)", boxShadow: "0 0 8px var(--ls-bbc-lime)" }} />mes membres BBC
        </div>
        <div style={{ fontSize: 12, color: "var(--ls-bbc-muted)", marginBottom: 12 }}>Tape un membre pour voir son récap complet.</div>
        {loading ? (
          <div style={{ fontSize: 12.5, color: "var(--ls-bbc-hint)", padding: "12px 0" }}>chargement…</div>
        ) : members.length === 0 ? (
          <div style={{ fontSize: 12.5, color: "var(--ls-bbc-hint)", padding: "12px 0", lineHeight: 1.5 }}>
            Aucun membre BBC pour l'instant. Passe un client en membre BBC depuis sa fiche (Actions → « Passer en membre BBC »).
          </div>
        ) : (
          members.map((m) => (
            <MemberRow key={m.id} m={m} open={open === m.id} onToggle={() => setOpen(open === m.id ? null : m.id)} />
          ))
        )}
      </div>
    </div>
  );
}

function MemberRow({ m, open, onToggle }: { m: BbcMember; open: boolean; onToggle: () => void }) {
  const lvlColor = levelColor(m.visits);
  return (
    <div style={{ borderTop: "1px solid var(--ls-bbc-line)" }}>
      <button type="button" onClick={onToggle} style={{ display: "flex", alignItems: "center", gap: 13, width: "100%", background: "transparent", border: 0, cursor: "pointer", textAlign: "left", padding: "13px 4px", color: "var(--ls-bbc-text)" }}>
        <span style={{ width: 40, height: 40, borderRadius: 999, flex: "none", background: "var(--ls-bbc-s2)", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "var(--ls-bbc-font-mono)", fontSize: 13, fontWeight: 700, color: lvlColor }}>{m.name[0]?.toUpperCase() ?? "?"}</span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 14, fontWeight: 600 }}>{m.name}</div>
          <div style={{ fontSize: 11.5, color: "var(--ls-bbc-muted)" }}>{m.started ? "membre" : "à démarrer"} · {objLabel(m.objective)}</div>
        </div>
        <span style={{ fontFamily: "var(--ls-bbc-font-mono)", fontSize: 12, color: lvlColor }}>{m.visits}/10</span>
        <span style={{ fontFamily: "var(--ls-bbc-font-mono)", fontSize: 12, color: "var(--ls-bbc-lime-text)" }}>{m.hearts}♥</span>
        <span aria-hidden="true" style={{ fontSize: 11, color: "var(--ls-bbc-hint)", transform: open ? "rotate(180deg)" : "none", transition: "transform .15s" }}>▾</span>
      </button>

      {open ? (
        <div style={{ padding: "4px 4px 16px", display: "flex", flexDirection: "column", gap: 12 }}>
          {/* chiffres clés */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10 }}>
            <Stat label="visites" value={`${m.visits}/10`} color={lvlColor} sub={visitLevel(m.visits) === "bilan" ? "bilan à faire" : visitLevel(m.visits) === "warn" ? "bientôt bilan" : "actif"} />
            <Stat label="cœurs" value={`${m.hearts}`} color="var(--ls-bbc-lime-text)" sub={m.pendingHearts ? `${m.pendingHearts} à valider` : "à jour"} />
            <Stat label="statut" value={lifeLabel(m.lifecycleStatus)} color="var(--ls-bbc-text)" small sub="" />
          </div>
          {/* détails */}
          <div style={{ background: "var(--ls-bbc-s2)", border: "1px solid var(--ls-bbc-line)", borderRadius: 14, padding: "12px 14px", display: "flex", flexDirection: "column", gap: 8 }}>
            <Line k="Objectif" v={objLabel(m.objective)} />
            <Line k="Programme" v={m.program || "—"} />
            <Line k="Démarré le" v={fmtDate(m.startDate)} />
            <Line k="Prochain RDV" v={fmtDate(m.nextFollowUp)} />
            <Line k="Téléphone" v={m.phone || "—"} />
            <Line k="Email" v={m.email || "—"} />
          </div>
        </div>
      ) : null}
    </div>
  );
}

function Stat({ label, value, color, sub, small }: { label: string; value: string; color: string; sub: string; small?: boolean }) {
  return (
    <div style={{ background: "var(--ls-bbc-s2)", border: "1px solid var(--ls-bbc-line)", borderRadius: 14, padding: "12px 10px", textAlign: "center" }}>
      <div style={{ fontFamily: "var(--ls-bbc-font-mono)", fontSize: 9, letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--ls-bbc-muted)" }}>{label}</div>
      <div style={{ fontFamily: small ? "var(--ls-bbc-font-body)" : "var(--ls-bbc-font-mono)", fontWeight: small ? 600 : 800, fontSize: small ? 12.5 : 20, color, lineHeight: 1.1, marginTop: 5 }}>{value}</div>
      {sub ? <div style={{ fontSize: 9.5, color: "var(--ls-bbc-hint)", marginTop: 3 }}>{sub}</div> : null}
    </div>
  );
}

function Line({ k, v }: { k: string; v: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 12.5 }}>
      <span style={{ flex: "none", width: 100, color: "var(--ls-bbc-muted)" }}>{k}</span>
      <span style={{ flex: 1, fontWeight: 600, color: "var(--ls-bbc-text)", overflow: "hidden", textOverflow: "ellipsis" }}>{v}</span>
    </div>
  );
}
