// =============================================================================
// BbcApp — l'environnement BBC dédié (chantier BBC Lot 1, 2026-07-24).
//
// Prise de contrôle COMPLÈTE de l'écran : sa propre sidebar + sa propre
// navigation interne, à la place du chrome classic. Monté par AppLayout quand
// le coach est en BBC (club_model='bbc' ou aperçu admin).
//
// Lot 1 = la charpente fidèle au design (sidebar + topbar + Cockpit) avec des
// données d'exemple (front-only, pas encore branché aux vraies données). Les
// autres vues (Cobayes, Cœurs, Scripts, Formation, Mes clubs…) arrivent aux
// lots suivants — ici elles affichent un écran « à venir » clairement balisé.
// =============================================================================

import "../../styles/bbc-tokens.css";
import { useState, type ReactNode } from "react";
import type { Club } from "../../types/domain";
import { BbcModeSwitch } from "./BbcModeSwitch";
import { BbcScripts } from "./views/BbcScripts";
import { BbcCoeurs } from "./views/BbcCoeurs";
import { BbcClub } from "./views/BbcClub";
import { BbcClubs } from "./views/BbcClubs";
import { BbcFormation } from "./views/BbcFormation";
import { BbcCrm } from "./views/BbcCrm";
import { BbcMessages } from "./views/BbcMessages";
import { BbcCobayeSheet } from "./BbcCobayeSheet";

type BbcView =
  | "cockpit"
  | "crm"
  | "club"
  | "coeurs"
  | "messages"
  | "scripts"
  | "formation"
  | "clubs";

interface BbcAppProps {
  coachName?: string;
  isAdmin?: boolean;
  onSetPreview?: (v: "classic" | "bbc" | null) => void;
  club?: Club | null;
}

const NAV: Array<{ k: BbcView; label: string; icon: string }> = [
  { k: "cockpit", label: "Cockpit", icon: "▦" },
  { k: "crm", label: "Cobayes & membres", icon: "👥" },
  { k: "club", label: "Le club", icon: "☕" },
  { k: "coeurs", label: "Cœurs", icon: "❤️" },
  { k: "messages", label: "Messages", icon: "✉️" },
  { k: "scripts", label: "Scripts", icon: "📝" },
  { k: "formation", label: "Formation", icon: "🎓" },
  { k: "clubs", label: "Mes clubs", icon: "🗺️" },
];

const TITLES: Record<BbcView, { eye: string; title: string }> = {
  cockpit: { eye: "co-pilote du matin", title: "Bon matin" },
  crm: { eye: "cobayes & membres", title: "Ton pipeline" },
  club: { eye: "pointage en direct", title: "Le club ce matin" },
  coeurs: { eye: "réseau & paliers", title: "Les cœurs" },
  messages: { eye: "messagerie", title: "Messages" },
  scripts: { eye: "bibliothèque · verbatim", title: "Les scripts" },
  formation: { eye: "accès gradué", title: "Formation BBC" },
  clubs: { eye: "réseau bbc", title: "Mes clubs" },
};

export function BbcApp({ coachName, isAdmin, onSetPreview, club }: BbcAppProps) {
  const [view, setView] = useState<BbcView>("cockpit");
  const [cobayes, setCobayes] = useState(14);
  const [sheet, setSheet] = useState(false);
  const first = (coachName ?? "").split(/\s+/)[0] || "";
  const clubName = club?.name ?? "Mon club";
  const clubCity = club?.city ?? "Verdun";
  const t = TITLES[view];

  return (
    <div className="bbc-mode bbc-shell">
      {/* ── Sidebar (desktop) ─────────────────────────────────────────── */}
      <aside className="bbc-sidebar">
        <div style={{ display: "flex", alignItems: "center", gap: 11, padding: "4px 8px 14px" }}>
          <span
            style={{
              fontFamily: "var(--ls-bbc-font-display)",
              fontSize: 22,
              color: "var(--ls-bbc-lime)",
              lineHeight: 1,
            }}
          >
            BBC
          </span>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontFamily: "var(--ls-bbc-font-display)", fontSize: 14, lineHeight: 1 }}>{clubName}</div>
            <div style={{ fontFamily: "var(--ls-bbc-font-mono)", fontSize: 9.5, color: "var(--ls-bbc-hint)", letterSpacing: "0.06em", marginTop: 3 }}>
              {clubCity} · 7h–11h
            </div>
          </div>
        </div>

        <nav style={{ display: "flex", flexDirection: "column", gap: 2, flex: 1, overflowY: "auto" }}>
          {NAV.map((n) => {
            const active = n.k === view;
            return (
              <button
                key={n.k}
                type="button"
                className="bbc-navitem"
                onClick={() => setView(n.k)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  width: "100%",
                  border: 0,
                  cursor: "pointer",
                  textAlign: "left",
                  padding: "11px 12px",
                  borderRadius: 12,
                  background: active ? "var(--ls-bbc-s2)" : "transparent",
                  color: active ? "var(--ls-bbc-lime)" : "var(--ls-bbc-muted)",
                  fontFamily: "var(--ls-bbc-font-body)",
                  fontSize: 13.5,
                  fontWeight: 600,
                  transition: "background 0.15s, color 0.15s",
                }}
              >
                <span aria-hidden="true" style={{ fontSize: 16, width: 20, textAlign: "center" }}>
                  {n.icon}
                </span>
                <span style={{ flex: 1 }}>{n.label}</span>
              </button>
            );
          })}
        </nav>

        <div style={{ display: "flex", flexDirection: "column", gap: 10, paddingTop: 12, borderTop: "1px solid var(--ls-bbc-line)" }}>
          {isAdmin && onSetPreview ? (
            <BbcModeSwitch value="bbc" onChange={(v) => onSetPreview(v)} compact />
          ) : null}
          <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "2px 4px" }}>
            <div
              style={{
                width: 32,
                height: 32,
                borderRadius: "50%",
                background: "var(--ls-bbc-s3)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontFamily: "var(--ls-bbc-font-mono)",
                fontSize: 12,
                fontWeight: 700,
                color: "var(--ls-bbc-teal)",
                flex: "none",
              }}
            >
              {(first[0] ?? "?").toUpperCase()}
            </div>
            <div style={{ minWidth: 0, flex: 1 }}>
              <div style={{ fontSize: 12.5, fontWeight: 700 }}>{first || "Coach"}</div>
              <div style={{ fontSize: 10.5, color: "var(--ls-bbc-hint)" }}>{isAdmin ? "admin · propriétaire" : "coach"}</div>
            </div>
          </div>
        </div>
      </aside>

      {/* ── Main ──────────────────────────────────────────────────────── */}
      <main className="bbc-main">
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 16, marginBottom: 20 }}>
          <div>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                fontFamily: "var(--ls-bbc-font-mono)",
                fontSize: 11,
                fontWeight: 600,
                letterSpacing: "0.16em",
                color: "var(--ls-bbc-muted)",
                textTransform: "uppercase",
              }}
            >
              <span style={{ width: 7, height: 7, borderRadius: 999, background: "var(--ls-bbc-lime)", boxShadow: "0 0 8px var(--ls-bbc-lime)" }} />
              {t.eye}
            </div>
            <div style={{ fontFamily: "var(--ls-bbc-font-display)", fontSize: 32, letterSpacing: "0.01em", lineHeight: 1.05, marginTop: 8 }}>
              {view === "cockpit" && first ? `${t.title}, ${first}` : t.title}
            </div>
          </div>
          {isAdmin && onSetPreview ? (
            <BbcModeSwitch value="bbc" onChange={(v) => onSetPreview(v)} />
          ) : null}
        </div>

        {view === "cockpit" && <Cockpit cobayes={cobayes} target={20} onSend={() => setSheet(true)} />}
        {view === "scripts" && <BbcScripts />}
        {view === "coeurs" && <BbcCoeurs />}
        {view === "club" && <BbcClub />}
        {view === "clubs" && <BbcClubs />}
        {view === "formation" && <BbcFormation />}
        {view === "crm" && <BbcCrm />}
        {view === "messages" && <BbcMessages />}
      </main>

      {/* ── Bottom nav (mobile) ───────────────────────────────────────── */}
      <nav className="bbc-bottomnav bbc-mode">
        {NAV.slice(0, 5).map((n) => {
          const active = n.k === view;
          return (
            <button
              key={n.k}
              type="button"
              onClick={() => setView(n.k)}
              style={{
                flex: 1,
                background: "transparent",
                border: 0,
                cursor: "pointer",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 3,
                padding: "4px 2px",
                color: active ? "var(--ls-bbc-lime)" : "var(--ls-bbc-hint)",
                fontFamily: "var(--ls-bbc-font-body)",
                fontSize: 10,
                fontWeight: 600,
              }}
            >
              <span aria-hidden="true" style={{ fontSize: 18 }}>
                {n.icon}
              </span>
              {n.label.split(" ")[0]}
            </button>
          );
        })}
      </nav>

      {sheet ? (
        <BbcCobayeSheet
          onClose={() => setSheet(false)}
          onSent={() => setCobayes((c) => Math.min(c + 1, 20))}
        />
      ) : null}
    </div>
  );
}

// ── Cockpit (fidèle au design, données d'exemple front-only) ──────────────
function Cockpit({ cobayes, target, onSend }: { cobayes: number; target: number; onSend: () => void }) {
  const ringOffset = Math.max(0, Math.round(578 * (1 - Math.min(cobayes / target, 1))));
  const left = Math.max(0, target - cobayes);
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16, maxWidth: 720 }}>
      {/* Formation banner */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 14,
          background: "var(--ls-bbc-s1)",
          border: "1px solid var(--ls-bbc-line)",
          borderRadius: 16,
          padding: "14px 18px",
        }}
      >
        <span aria-hidden="true" style={{ fontSize: 20 }}>
          📚
        </span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 14, fontWeight: 700 }}>Formation BBC — reprendre le chapitre 3</div>
          <div style={{ height: 5, borderRadius: 3, background: "var(--ls-bbc-s2)", marginTop: 8, maxWidth: 340, overflow: "hidden" }}>
            <div style={{ width: "60%", height: "100%", background: "var(--ls-bbc-lime)", borderRadius: 3 }} />
          </div>
        </div>
        <Chip>Lot 5</Chip>
      </div>

      {/* Hero cobayes */}
      <div
        style={{
          position: "relative",
          background: "var(--ls-bbc-s1)",
          border: "1px solid var(--ls-bbc-line)",
          borderRadius: 22,
          padding: "24px 20px",
          textAlign: "center",
          overflow: "hidden",
        }}
      >
        <div style={{ position: "absolute", top: -30, left: "50%", transform: "translateX(-50%)", width: 320, height: 320, background: "radial-gradient(circle, rgba(197,248,42,.15), transparent 66%)" }} />
        <div style={{ position: "relative" }}>
          <div style={{ fontFamily: "var(--ls-bbc-font-mono)", fontSize: 11, fontWeight: 600, letterSpacing: "0.16em", color: "var(--ls-bbc-muted)", textTransform: "uppercase", marginBottom: 14 }}>
            cobayes du jour
          </div>
          <div style={{ position: "relative", width: 200, height: 200, margin: "0 auto" }}>
            <svg width="200" height="200" viewBox="0 0 220 220" aria-hidden="true">
              <circle cx="110" cy="110" r="92" fill="none" stroke="var(--ls-bbc-s2)" strokeWidth="15" />
              <circle cx="110" cy="110" r="92" fill="none" stroke="var(--ls-bbc-lime)" strokeWidth="15" strokeLinecap="round" strokeDasharray="578" strokeDashoffset={ringOffset} transform="rotate(-90 110 110)" style={{ transition: "stroke-dashoffset .5s ease" }} />
            </svg>
            <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
              <div style={{ fontFamily: "var(--ls-bbc-font-mono)", fontWeight: 800, fontSize: 64, color: "var(--ls-bbc-lime-text)", lineHeight: 0.85 }}>{cobayes}</div>
              <div style={{ fontFamily: "var(--ls-bbc-font-mono)", fontWeight: 500, fontSize: 18, color: "var(--ls-bbc-muted)", marginTop: 4 }}>/ {target}</div>
            </div>
          </div>
          <div style={{ marginTop: 12, fontSize: 12, color: "var(--ls-bbc-muted)" }}>
            cobayes envoyés aujourd'hui · <span style={{ color: "var(--ls-bbc-lime-text)" }}>{left > 0 ? `encore ${left} ce matin` : "objectif atteint 🔥"}</span>
          </div>
          <button
            type="button"
            onClick={onSend}
            style={{
              marginTop: 16,
              width: "100%",
              maxWidth: 360,
              height: 52,
              border: 0,
              borderRadius: 14,
              background: "var(--ls-bbc-lime)",
              color: "var(--ls-bbc-lime-ink)",
              fontFamily: "var(--ls-bbc-font-body)",
              fontSize: 16,
              fontWeight: 700,
              cursor: "pointer",
            }}
          >
            ＋ envoyer un cobaye
          </button>
        </div>
      </div>

      <SectionCard eye="☕ le club ce matin" right="2 / 4 pointés">
        <MemberRow name="Sarah M." note="arrivée · 7h04" tone="teal" action="pointé" />
        <MemberRow name="Karim D." note="arrivé · 7h10" tone="teal" action="pointé" />
        <MemberRow name="Yanis B." note="attendu" tone="muted" action="pointer" />
        <MemberRow name="Léa R." note="bilan des 10 à faire" tone="coral" action="bilan" />
      </SectionCard>

      <SectionCard eye="❤️ à un cœur du palier" right="qui relancer">
        <MemberRow name="Inès L." note="à 1 cœur du palier junior" tone="lime" action="relancer" filled />
        <MemberRow name="Thomas P." note="à 1 cœur du palier junior" tone="lime" action="relancer" filled />
      </SectionCard>

      <SectionCard eye="📞 prochain appel" right="">
        <MemberRow name="Nadia — inscrite hier" note="9h30" tone="teal" action="rappeler" />
        <MemberRow name="Paul — relance J+2" note="10h15" tone="teal" action="rappeler" />
      </SectionCard>

      <div style={{ textAlign: "center", fontSize: 11, color: "var(--ls-bbc-hint)", lineHeight: 1.5, marginTop: 2 }}>
        Cockpit BBC — charpente du Lot 1, données d'exemple.
        <br />
        Le compteur cobayes, le pointage et les cœurs se branchent aux lots suivants.
      </div>
    </div>
  );
}

function Chip({ children }: { children: ReactNode }) {
  return (
    <span
      style={{
        fontSize: 10,
        fontWeight: 800,
        color: "var(--ls-bbc-lime-ink)",
        background: "var(--ls-bbc-lime)",
        padding: "3px 8px",
        borderRadius: 999,
        whiteSpace: "nowrap",
        fontFamily: "var(--ls-bbc-font-mono)",
      }}
    >
      {children}
    </span>
  );
}

function SectionCard({ eye, right, children }: { eye: string; right: string; children: ReactNode }) {
  return (
    <div style={{ background: "var(--ls-bbc-s1)", border: "1px solid var(--ls-bbc-line)", borderRadius: 20, padding: "18px 20px 8px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
        <span style={{ fontFamily: "var(--ls-bbc-font-mono)", fontSize: 11, fontWeight: 600, letterSpacing: "0.14em", color: "var(--ls-bbc-muted)", textTransform: "uppercase", flex: 1 }}>
          {eye}
        </span>
        {right ? (
          <span style={{ fontFamily: "var(--ls-bbc-font-mono)", fontSize: 11, color: "var(--ls-bbc-hint)" }}>{right}</span>
        ) : null}
      </div>
      {children}
    </div>
  );
}

function MemberRow({
  name,
  note,
  tone,
  action,
  filled,
}: {
  name: string;
  note: string;
  tone: "teal" | "coral" | "lime" | "muted";
  action: string;
  filled?: boolean;
}) {
  const color =
    tone === "teal" ? "var(--ls-bbc-teal)" : tone === "coral" ? "var(--ls-bbc-coral)" : tone === "lime" ? "var(--ls-bbc-lime-text)" : "var(--ls-bbc-hint)";
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "11px 0", borderTop: "1px solid var(--ls-bbc-line)" }}>
      <span style={{ width: 8, height: 8, borderRadius: 999, flex: "none", background: color }} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13.5, fontWeight: 600 }}>{name}</div>
        <div style={{ fontSize: 11.5, color: tone === "coral" ? "var(--ls-bbc-coral)" : "var(--ls-bbc-muted)" }}>{note}</div>
      </div>
      <span
        style={{
          fontSize: 11,
          fontWeight: 700,
          padding: "6px 12px",
          borderRadius: 10,
          whiteSpace: "nowrap",
          background: filled ? "var(--ls-bbc-lime)" : "transparent",
          color: filled ? "var(--ls-bbc-lime-ink)" : color,
          border: filled ? "0" : `1px solid ${tone === "muted" ? "var(--ls-bbc-line)" : color}`,
        }}
      >
        {action}
      </span>
    </div>
  );
}
