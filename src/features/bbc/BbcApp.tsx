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
import { BbcReglages } from "./views/BbcReglages";
import { BbcAppels } from "./views/BbcAppels";
import { BbcCobayeSheet } from "./BbcCobayeSheet";
import { useBbcCobayes } from "./useBbcCobayes";
import { useBbcMembers } from "./useBbcMembers";
import { useBbcCalls } from "./useBbcCalls";
import { visitLevel } from "./useBbcVisits";

type BbcView =
  | "cockpit"
  | "crm"
  | "club"
  | "coeurs"
  | "messages"
  | "scripts"
  | "formation"
  | "clubs"
  | "appels"
  | "reglages";

interface BbcAppProps {
  coachName?: string;
  userId?: string;
  isAdmin?: boolean;
  onSetPreview?: (v: "classic" | "bbc" | null) => void;
  club?: Club | null;
  clubs?: Club[];
  onCreateClub?: (name: string, city: string) => Promise<boolean>;
}

const NAV: Array<{ k: BbcView; label: string; icon: string }> = [
  { k: "cockpit", label: "Cockpit", icon: "▦" },
  { k: "crm", label: "Cobayes & membres", icon: "👥" },
  { k: "club", label: "Le club", icon: "☕" },
  { k: "coeurs", label: "Cœurs", icon: "❤️" },
  { k: "appels", label: "Appels", icon: "📞" },
  { k: "messages", label: "Messages", icon: "✉️" },
  { k: "scripts", label: "Scripts", icon: "📝" },
  { k: "formation", label: "Formation", icon: "🎓" },
  { k: "clubs", label: "Mes clubs", icon: "🗺️" },
  { k: "reglages", label: "Réglages", icon: "⚙️" },
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
  appels: { eye: "rituels du club", title: "Les appels" },
  reglages: { eye: "config du club", title: "Réglages" },
};

export function BbcApp({ coachName, userId, isAdmin, onSetPreview, club, clubs, onCreateClub }: BbcAppProps) {
  const [view, setView] = useState<BbcView>("cockpit");
  const [sheet, setSheet] = useState(false);
  const cob = useBbcCobayes(userId);
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

        {view === "cockpit" && (
          <Cockpit
            cobayes={cob.count}
            target={cob.target}
            onSend={() => setSheet(true)}
            userId={userId}
            club={club ?? null}
            onGo={setView}
          />
        )}
        {view === "scripts" && <BbcScripts />}
        {view === "coeurs" && <BbcCoeurs userId={userId} club={club ?? null} />}
        {view === "club" && <BbcClub userId={userId} club={club ?? null} />}
        {view === "clubs" && <BbcClubs clubs={clubs} isAdmin={isAdmin} onCreateClub={onCreateClub} />}
        {view === "formation" && <BbcFormation />}
        {view === "crm" && <BbcCrm userId={userId} />}
        {view === "messages" && <BbcMessages />}
        {view === "appels" && <BbcAppels userId={userId} club={club ?? null} />}
        {view === "reglages" && <BbcReglages club={club ?? null} />}
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
          onSent={(templateKey, contactLabel) => void cob.logCobaye(templateKey, contactLabel)}
        />
      ) : null}
    </div>
  );
}

// ── Cockpit (fidèle au design, données d'exemple front-only) ──────────────
function Cockpit({ cobayes, target, onSend, userId, club, onGo }: { cobayes: number; target: number; onSend: () => void; userId?: string; club: Club | null; onGo: (v: BbcView) => void }) {
  const ringOffset = Math.max(0, Math.round(578 * (1 - Math.min(cobayes / target, 1))));
  const left = Math.max(0, target - cobayes);
  const { members, loading } = useBbcMembers(userId);

  // Le club ce matin : qui a pointé aujourd'hui + qui est à faire.
  const pointes = members.filter((m) => m.visitedToday);
  const bilans = members.filter((m) => m.visits >= 10);
  // À un cœur du palier : le prochain palier est à 1 cœur.
  const PALIERS = [2, 3, 5];
  const aUnCoeur = members.filter((m) => {
    const next = PALIERS.find((p) => p > m.hearts);
    return next !== undefined && next - m.hearts === 1;
  });
  const aValider = members.reduce((s, m) => s + m.pendingHearts, 0);
  // Rituels : prochaine occurrence + inscrits réels + suivis en attente.
  const calls = useBbcCalls(userId, club?.settings);
  const nextCall = calls.nextCalls[0];
  const inscrits = nextCall ? calls.forOccurrence(nextCall.key, nextCall.at).length : 0;

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

      {/* ☕ le club ce matin — réel */}
      <SectionCard eye="☕ le club ce matin" right={members.length ? `${pointes.length} / ${members.length} pointés` : ""}>
        {loading ? (
          <Empty>chargement…</Empty>
        ) : members.length === 0 ? (
          <Empty>Aucun membre BBC. Passe un client en membre depuis sa fiche (Actions).</Empty>
        ) : (
          <>
            {members.slice(0, 4).map((m) => {
              const lvl = visitLevel(m.visits);
              return (
                <MemberRow
                  key={m.id}
                  name={m.name}
                  note={m.visitedToday ? `pointé aujourd'hui · ${m.visits}/10` : lvl === "bilan" ? "bilan des 10 à faire" : `${m.visits}/10 visites`}
                  tone={m.visitedToday ? "teal" : lvl === "bilan" ? "coral" : "muted"}
                  action={m.visitedToday ? "pointé" : lvl === "bilan" ? "bilan" : "pointer"}
                  onClick={() => onGo("club")}
                />
              );
            })}
            {bilans.length ? <Empty>🎯 {bilans.map((b) => b.name).join(", ")} → bilan des 10 à faire.</Empty> : null}
          </>
        )}
      </SectionCard>

      {/* ❤️ à un cœur du palier — réel */}
      <SectionCard eye="❤️ à un cœur du palier" right={aValider ? `${aValider} à valider` : "qui relancer"}>
        {loading ? (
          <Empty>chargement…</Empty>
        ) : aUnCoeur.length === 0 ? (
          <Empty>{aValider ? "Des recos attendent ta validation dans l'onglet Cœurs." : "Personne à un cœur d'un palier pour l'instant."}</Empty>
        ) : (
          aUnCoeur.slice(0, 4).map((m) => {
            const next = PALIERS.find((p) => p > m.hearts);
            return (
              <MemberRow
                key={m.id}
                name={m.name}
                note={`${m.hearts}♥ · à 1 cœur du palier ${next}`}
                tone="lime"
                action="relancer"
                filled
                onClick={() => onGo("coeurs")}
              />
            );
          })
        )}
      </SectionCard>

      {/* 📞 prochain appel — depuis la config du club */}
      <SectionCard eye="📞 prochain appel" right={inscrits ? `${inscrits} inscrit${inscrits > 1 ? "s" : ""}` : ""}>
        {nextCall ? (
          <>
            <MemberRow
              name={nextCall.label}
              note={`${nextCall.when} · ${inscrits} inscrit${inscrits > 1 ? "s" : ""}`}
              tone={nextCall.isToday ? "lime" : "teal"}
              action={nextCall.isToday ? "aujourd'hui" : "inscrire"}
              filled={nextCall.isToday}
              onClick={() => onGo("appels")}
            />
            {calls.toProcess.length ? (
              <Empty>📞 {calls.toProcess.length} suivi{calls.toProcess.length > 1 ? "s" : ""} à faire après le dernier appel.</Empty>
            ) : null}
          </>
        ) : (
          <Empty>Aucun rituel configuré pour ce club.</Empty>
        )}
      </SectionCard>
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

function Empty({ children }: { children: ReactNode }) {
  return (
    <div style={{ fontSize: 12, color: "var(--ls-bbc-hint)", padding: "12px 0", borderTop: "1px solid var(--ls-bbc-line)", lineHeight: 1.5 }}>
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
  onClick,
}: {
  name: string;
  note: string;
  tone: "teal" | "coral" | "lime" | "muted";
  action: string;
  filled?: boolean;
  onClick?: () => void;
}) {
  const color =
    tone === "teal" ? "var(--ls-bbc-teal)" : tone === "coral" ? "var(--ls-bbc-coral)" : tone === "lime" ? "var(--ls-bbc-lime-text)" : "var(--ls-bbc-hint)";
  return (
    <div onClick={onClick} style={{ display: "flex", alignItems: "center", gap: 12, padding: "11px 0", borderTop: "1px solid var(--ls-bbc-line)", cursor: onClick ? "pointer" : "default" }}>
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
