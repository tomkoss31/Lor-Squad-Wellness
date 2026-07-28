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
import type { Club, ClubSettings } from "../../types/domain";
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
import { BbcSemaine } from "./views/BbcSemaine";
import { BbcLiens } from "./views/BbcLiens";
import { BbcPrelancement } from "./views/BbcPrelancement";
import { BbcClub100 } from "./views/BbcClub100";
import { BbcCobayeSheet } from "./BbcCobayeSheet";
import { useBbcCobayes } from "./useBbcCobayes";
import { useBbcMembers } from "./useBbcMembers";
import { useBbcHearts, nextPalier } from "./useBbcHearts";
import { useBbcCalls } from "./useBbcCalls";
import { visitLevel } from "./useBbcVisits";
import { DEFAULT_CLUB_SETTINGS } from "./useClubSettings";
import { useBbcFormationProgress } from "./useBbcFormationProgress";
import { BBC_FORMATION_MODULES } from "./data/bbcFormation";

type BbcView =
  | "cockpit"
  | "crm"
  | "club"
  | "semaine"
  | "coeurs"
  | "messages"
  | "scripts"
  | "formation"
  | "clubs"
  | "appels"
  | "prelancement"
  | "club100"
  | "reglages";

type SectionKey = "club" | "membres" | "coeurs" | "ressources" | "monclub";

interface BbcAppProps {
  coachName?: string;
  userId?: string;
  isAdmin?: boolean;
  onSetPreview?: (v: "classic" | "bbc" | null) => void;
  club?: Club | null;
  clubs?: Club[];
  onCreateClub?: (name: string, city: string) => Promise<boolean>;
  onRenameClub?: (clubId: string, name: string, city: string) => Promise<boolean>;
}

// 5 entrées, pas une de plus. Le quotidien du coach — les visites, les fiches
// membres, les cœurs, les scripts — tient au premier niveau ; le reste vit en
// onglet DANS sa section. Le menu à 13 entrées d'avant était illisible et
// obligeait à un tiroir « Plus » sur mobile, où la moitié du club se cachait.
type Section = { k: SectionKey; label: string; icon: string; tabs: { k: BbcView; label: string }[] };
const SECTIONS: Section[] = [
  {
    k: "club",
    label: "Le club",
    icon: "☕",
    tabs: [
      { k: "cockpit", label: "Ce matin" },
      { k: "semaine", label: "La semaine" },
      { k: "club", label: "Les visites" },
      { k: "appels", label: "Les appels" },
    ],
  },
  {
    k: "membres",
    label: "Membres",
    icon: "👥",
    tabs: [
      { k: "crm", label: "Mes membres" },
      { k: "messages", label: "Messages" },
    ],
  },
  { k: "coeurs", label: "Cœurs", icon: "❤️", tabs: [{ k: "coeurs", label: "Les cœurs" }] },
  {
    k: "ressources",
    label: "Ressources",
    icon: "🎓",
    tabs: [
      { k: "scripts", label: "Scripts & liens" },
      { k: "formation", label: "Formation" },
      { k: "prelancement", label: "Pré-lancement" },
    ],
  },
  {
    k: "monclub",
    label: "Mon club",
    icon: "⚙️",
    tabs: [
      // Plus d'onglet « La carte » (retiré le 2026-07-28) : l'app n'encaisse
      // nulle part au comptoir, donc les prix de vente à l'unité ne pilotaient
      // rien. La carte est physique, au club, sous les yeux des membres. Seul
      // le COÛT d'une visite restait utile — il vit dans « Rentabilité ».
      { k: "club100", label: "Rentabilité" },
      { k: "clubs", label: "Mes clubs" },
      { k: "reglages", label: "Réglages" },
    ],
  },
];

/** Dans quelle section vit une vue — sert aux raccourcis du Cockpit. */
function sectionDe(view: BbcView): SectionKey {
  return SECTIONS.find((s) => s.tabs.some((t) => t.k === view))?.k ?? "club";
}

const TITLES: Record<BbcView, { eye: string; title: string }> = {
  cockpit: { eye: "co-pilote du matin", title: "Bon matin" },
  crm: { eye: "cobayes & membres", title: "Ton pipeline" },
  club: { eye: "pointage en direct", title: "Le club ce matin" },
  semaine: { eye: "la semaine du club", title: "Cette semaine" },
  coeurs: { eye: "réseau & paliers", title: "Les cœurs" },
  messages: { eye: "messagerie", title: "Messages" },
  scripts: { eye: "tout ce que tu envoies", title: "Scripts & liens" },
  formation: { eye: "accès gradué", title: "Formation BBC" },
  clubs: { eye: "réseau bbc", title: "Mes clubs" },
  appels: { eye: "rituels du club", title: "Les appels" },
  prelancement: { eye: "avant l'ouverture", title: "Pré-lancement" },
  club100: { eye: "le modèle · tes chiffres", title: "Club 100 & rentabilité" },
  reglages: { eye: "config du club", title: "Réglages" },
};

export function BbcApp({ coachName, userId, isAdmin, onSetPreview, club: clubProp, clubs, onCreateClub, onRenameClub }: BbcAppProps) {
  // Les réglages fraîchement enregistrés priment sur ceux chargés au montage :
  // `useBbcMode` ne les relit qu'au démarrage, et sans ça les appels, les cœurs
  // et les cartes restaient sur les anciennes valeurs jusqu'à un F5 — assez
  // longtemps pour inscrire des membres à la mauvaise heure.
  const [reglagesFrais, setReglagesFrais] = useState<ClubSettings | null>(null);
  const club = clubProp && reglagesFrais ? { ...clubProp, settings: reglagesFrais } : clubProp;
  const [section, setSection] = useState<SectionKey>("club");
  const [view, setViewState] = useState<BbcView>("cockpit");
  const [sheet, setSheet] = useState(false);
  const cob = useBbcCobayes(userId);
  const first = (coachName ?? "").split(/\s+/)[0] || "";
  const clubName = club?.name ?? "Mon club";
  const clubCity = club?.city ?? "Verdun";
  const t = TITLES[view];
  const sectionCourante = SECTIONS.find((s) => s.k === section) ?? SECTIONS[0];

  /** Va sur une vue en réalignant la section — les raccourcis du Cockpit
   *  traversent les sections, la barre latérale doit suivre. */
  function setView(v: BbcView) {
    setSection(sectionDe(v));
    setViewState(v);
  }

  /** Ouvre une section sur son premier onglet. */
  function ouvrirSection(s: Section) {
    setSection(s.k);
    setViewState(s.tabs[0].k);
  }

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
              {clubCity} · {club?.settings?.open_hours || DEFAULT_CLUB_SETTINGS.open_hours}
            </div>
          </div>
        </div>

        <nav style={{ display: "flex", flexDirection: "column", gap: 3, flex: 1, overflowY: "auto", paddingTop: 4 }}>
          {SECTIONS.map((s) => {
            const active = s.k === section;
            return (
              <button
                key={s.k}
                type="button"
                className="bbc-navitem"
                onClick={() => ouvrirSection(s)}
                aria-current={active ? "page" : undefined}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  width: "100%",
                  border: 0,
                  cursor: "pointer",
                  textAlign: "left",
                  padding: "13px 12px",
                  borderRadius: 12,
                  background: active ? "var(--ls-bbc-s2)" : "transparent",
                  color: active ? "var(--ls-bbc-lime)" : "var(--ls-bbc-muted)",
                  fontFamily: "var(--ls-bbc-font-body)",
                  fontSize: 14,
                  fontWeight: 600,
                  transition: "background 0.15s, color 0.15s",
                }}
              >
                <span aria-hidden="true" style={{ fontSize: 17, width: 20, textAlign: "center" }}>
                  {s.icon}
                </span>
                <span style={{ flex: 1 }}>{s.label}</span>
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

        {/* Onglets de la section — masqués quand elle n'en a qu'un seul. */}
        {sectionCourante.tabs.length > 1 ? (
          <div
            role="tablist"
            aria-label={sectionCourante.label}
            style={{ display: "flex", gap: 7, flexWrap: "wrap", marginBottom: 22, borderBottom: "1px solid var(--ls-bbc-line)", paddingBottom: 12 }}
          >
            {sectionCourante.tabs.map((tab) => {
              const on = tab.k === view;
              return (
                <button
                  key={tab.k}
                  type="button"
                  role="tab"
                  aria-selected={on}
                  onClick={() => setViewState(tab.k)}
                  style={{
                    padding: "9px 15px",
                    borderRadius: 11,
                    cursor: "pointer",
                    fontFamily: "var(--ls-bbc-font-body)",
                    fontSize: 13.5,
                    fontWeight: 700,
                    border: on ? "1px solid var(--ls-bbc-lime)" : "1px solid var(--ls-bbc-line)",
                    background: on ? "var(--ls-bbc-lime)" : "var(--ls-bbc-s1)",
                    color: on ? "var(--ls-bbc-lime-ink)" : "var(--ls-bbc-muted)",
                    transition: "background .15s, color .15s",
                  }}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>
        ) : null}

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
        {view === "scripts" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 26 }}>
            <BbcLiens coachName={coachName} settings={club?.settings ?? null} clubName={club?.name} />
            <BbcScripts />
          </div>
        )}
        {view === "coeurs" && <BbcCoeurs userId={userId} club={club ?? null} />}
        {view === "club" && <BbcClub userId={userId} club={club ?? null} />}
        {view === "semaine" && <BbcSemaine userId={userId} club={club ?? null} />}
        {view === "clubs" && <BbcClubs clubs={clubs} isAdmin={isAdmin} onCreateClub={onCreateClub} onRenameClub={onRenameClub} />}
        {view === "formation" && <BbcFormation />}
        {view === "crm" && <BbcCrm userId={userId} />}
        {view === "messages" && <BbcMessages userId={userId} coachName={coachName} />}
        {view === "appels" && <BbcAppels userId={userId} club={club ?? null} />}
        {view === "prelancement" && <BbcPrelancement userId={userId} coachName={coachName} />}
        {view === "club100" && <BbcClub100 userId={userId} clubId={club?.id ?? null} />}
        {view === "reglages" && <BbcReglages club={club ?? null} onSaved={setReglagesFrais} />}
      </main>

      {/* ── Bottom nav (mobile) : les 5 sections, rien de caché ───────── */}
      <nav className="bbc-bottomnav bbc-mode">
        {SECTIONS.map((s) => {
          const active = s.k === section;
          return (
            <button
              key={s.k}
              type="button"
              onClick={() => ouvrirSection(s)}
              aria-current={active ? "page" : undefined}
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
                {s.icon}
              </span>
              {s.label}
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
  // Bilan = carte consommée, pas le cumul de visites à vie.
  const bilans = members.filter((m) => m.card && m.card.used >= m.card.type);
  // Cœurs : MÊME source que l'onglet Cœurs (sinon les deux écrans affichent
  // des compteurs différents — l'un limité aux membres BBC, l'autre non).
  const heartsData = useBbcHearts(userId);
  // Progression de formation réelle — sert le bandeau ci-dessous, qui ne
  // s'affiche pas du tout si la base ne sait rien dire (`available` false).
  const formation = useBbcFormationProgress(userId);
  const modulesFaits = BBC_FORMATION_MODULES.filter((m) => formation.done[m.n]).length;
  const aUnCoeur = heartsData.members.filter((m) => {
    const next = nextPalier(m.hearts);
    return next !== null && next - m.hearts === 1;
  });
  const aValider = heartsData.pending.length;
  // Rituels : prochaine occurrence + inscrits réels + suivis en attente.
  const calls = useBbcCalls(userId, club?.settings);
  const nextCall = calls.nextCalls[0];
  const inscrits = nextCall ? calls.forOccurrence(nextCall.key, nextCall.at).length : 0;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16, maxWidth: 720 }}>
      {/* Formation : progression RÉELLE, ou rien.
          Avant, ce bandeau affichait « reprendre le chapitre 3 » et une barre
          figée à 60 % — pour tout le monde, à vie, quoi qu'on ait lu. Un
          indicateur qui ne bouge jamais apprend à ignorer l'écran. On ne le
          montre donc que si la progression est réellement lisible en base, et
          on ne le montre plus du tout une fois les 9 modules déroulés. */}
      {formation.available && modulesFaits < BBC_FORMATION_MODULES.length ? (
        <button
          type="button"
          onClick={() => onGo("formation")}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 14,
            width: "100%",
            textAlign: "left",
            cursor: "pointer",
            background: "var(--ls-bbc-s1)",
            border: "1px solid var(--ls-bbc-line)",
            borderRadius: 16,
            padding: "14px 18px",
            color: "var(--ls-bbc-text)",
            fontFamily: "var(--ls-bbc-font-body)",
          }}
        >
          <span aria-hidden="true" style={{ fontSize: 20 }}>📚</span>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 14, fontWeight: 700 }}>
              {modulesFaits === 0 ? "Formation BBC — commencer" : "Formation BBC — continuer"}
            </div>
            <div style={{ height: 5, borderRadius: 3, background: "var(--ls-bbc-s2)", marginTop: 8, maxWidth: 340, overflow: "hidden" }}>
              <div
                style={{
                  width: `${Math.round((modulesFaits / BBC_FORMATION_MODULES.length) * 100)}%`,
                  height: "100%",
                  background: "var(--ls-bbc-lime)",
                  borderRadius: 3,
                  transition: "width .3s",
                }}
              />
            </div>
          </div>
          <span style={{ fontFamily: "var(--ls-bbc-font-mono)", fontSize: 11.5, color: "var(--ls-bbc-muted)", flex: "none" }}>
            {modulesFaits} / {BBC_FORMATION_MODULES.length}
          </span>
        </button>
      ) : null}

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
              const lvl = visitLevel(m.card?.used ?? 0, m.card?.type);
              const solde = m.card ? `${m.card.used}/${m.card.type}` : `${m.visits} au total`;
              return (
                <MemberRow
                  key={m.id}
                  name={m.name}
                  note={m.visitedToday ? `pointé aujourd'hui · ${solde}` : lvl === "bilan" ? "carte finie · bilan à faire" : `${solde}${m.card ? "" : " · pas de carte"}`}
                  tone={m.visitedToday ? "teal" : lvl === "bilan" ? "coral" : "muted"}
                  action={m.visitedToday ? "pointé" : lvl === "bilan" ? "bilan" : "pointer"}
                  onClick={() => onGo("club")}
                />
              );
            })}
            {bilans.length ? <Empty>🎯 {bilans.map((b) => b.name).join(", ")} → carte finie, bilan à faire.</Empty> : null}
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
            const next = nextPalier(m.hearts);
            return (
              <MemberRow
                key={m.key}
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
