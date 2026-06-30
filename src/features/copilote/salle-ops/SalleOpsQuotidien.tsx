// =============================================================================
// SalleOpsQuotidien — écran cockpit « La Base Académie » (onboarding coach).
//
// Pédagogie : chaque étape porte sa leçon APPRENDRE → FAIRE → PREUVE (contenu
// academyLessons, tiré du Notion La Base). Parcours = 6 étapes Go Pro. Noaly en
// tuteur. 100 % tokens --ls-ops-* (theme-aware). Vocab : « Coach en formation ».
//
// Responsive : mobile = colonne unique · desktop (≥1000px) = colonne focus +
// rail latéral persistant (phases · parcours 6 étapes · fil de sécurité).
// =============================================================================

import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { OPS_PHASES, type SalleOpsView } from "./useSalleOps";
import { QuiInviterLive } from "./QuiInviterLive";
import "./salle-ops.css";

const MONO: React.CSSProperties = { fontFamily: "var(--ls-ops-font-mono)" };
const PHASES = OPS_PHASES.map((p) => p.short);

/** Ouvre Noaly (écouté par NoalyFab) avec un prompt pré-injecté. */
function askNoaly(prompt?: string) {
  window.dispatchEvent(new CustomEvent("noaly:ask", { detail: { prompt } }));
}

export function SalleOpsQuotidien({
  view,
  onEscape,
  fullscreen,
}: {
  view: SalleOpsView;
  onEscape?: () => void;
  fullscreen?: boolean;
}) {
  const navigate = useNavigate();
  const lesson = view.currentLesson;
  const phaseIndex = Math.max(0, view.phaseIndex);
  const phaseLabel = OPS_PHASES[phaseIndex]?.label ?? "Allumage";
  const activeLabel = view.steps.find((s) => s.state === "active")?.label ?? "";

  function runFaire() {
    if (!lesson) return;
    if (lesson.faire.linkPath) navigate(lesson.faire.linkPath);
    else if (view.currentGateKey) void view.toggle(view.currentGateKey);
  }

  return (
    <div className="ls-ops-root" style={fullscreen ? { ...pageWrap, ...fixedOverlay } : pageWrap}>
      <div className="ls-ops-shell">
        {/* ── COLONNE FOCUS ── */}
        <div className="ls-ops-main" style={column}>
          {/* Bandeau */}
          <div style={{ display: "flex", alignItems: "center", gap: 9, ...MONO, fontSize: 11, letterSpacing: ".12em", textTransform: "uppercase", color: "var(--ls-ops-muted)" }}>
            <span className="ls-ops-dot" />
            <span style={{ color: "var(--ls-ops-text3)" }}>La Base · Verdun (55)</span>
            <span style={{ color: "var(--ls-ops-border-active)" }}>/</span>
            <span style={{ color: "var(--ls-ops-accent-text)" }}>Jour {view.dayNumber} / 90</span>
          </div>

          <div style={hair} />

          <div style={{ ...MONO, fontSize: 11, letterSpacing: ".2em", color: "var(--ls-ops-muted)", textTransform: "uppercase", marginBottom: 4 }}>
            La Base Académie
          </div>
          <h1 className="ls-ops-display" style={title}>Aujourd'hui</h1>
          <div style={{ ...MONO, fontSize: 11, letterSpacing: ".06em", textTransform: "uppercase", color: "var(--ls-ops-faint)", marginTop: 6 }}>
            Coach en formation {view.activated ? "· lancé·e 🚀" : `· étape ${view.activeStepNumber}/${view.totalSteps}`}
          </div>

          {/* Phases — inline mobile, masqué desktop (→ rail) */}
          <div className="ls-ops-hide-desktop">
            <PhaseTracker phaseIndex={phaseIndex} phaseLabel={phaseLabel} />
          </div>

          {/* LEÇON : Apprendre → Faire → Preuve */}
          {lesson ? (
            <div style={{ marginTop: 24 }}>
              <div style={{ ...MONO, fontSize: 11, letterSpacing: ".14em", textTransform: "uppercase", color: "var(--ls-ops-muted)", marginBottom: 4 }}>
                Étape {lesson.goProStep} · {lesson.goProLabel}
              </div>
              <h2 className="ls-ops-display" style={lessonTitle}>{lesson.title}</h2>

              <div style={{ ...softCard, marginTop: 14 }}>
                <div style={stepTag}>1 · Apprendre · 30 sec</div>
                <p style={lessonText}>{lesson.apprendre}</p>
              </div>

              <div style={limeCard}>
                <div style={{ ...MONO, fontSize: 11, letterSpacing: ".14em", textTransform: "uppercase", color: "var(--ls-ops-on-accent2)", marginBottom: 8 }}>
                  2 · Faire · maintenant
                </div>
                <p style={{ fontSize: 14.5, lineHeight: 1.5, color: "var(--ls-ops-on-accent)", margin: 0, fontWeight: 500 }}>
                  {lesson.faire.instruction}
                </p>
                {lesson.faire.script ? <ScriptBox script={lesson.faire.script} /> : null}
                <button type="button" style={limeCta} onClick={runFaire}>{lesson.faire.ctaLabel}</button>
              </div>

              <div style={{ ...softCard, marginTop: 12 }}>
                <div style={stepTag}>3 · Preuve · c'est gagné quand…</div>
                <div style={{ display: "flex", alignItems: "flex-start", gap: 11 }}>
                  <span style={{ width: 22, height: 22, borderRadius: "50%", border: "2px solid var(--ls-ops-accent)", flex: "none", marginTop: 1, boxSizing: "border-box" }} />
                  <p style={{ ...lessonText, margin: 0 }}>{lesson.preuve}</p>
                </div>
              </div>
            </div>
          ) : null}

          {/* Qui inviter (données réelles) */}
          <QuiInviterLive />

          {/* Noaly tuteur */}
          <div style={{ ...card, marginTop: 18, padding: 18, borderRadius: 20 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 13 }}>
              <span className="ls-ops-display" style={noalyBadge}>N</span>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 15, color: "var(--ls-ops-ink)", fontWeight: 600 }}>Noaly</div>
                <div style={{ ...MONO, fontSize: 10.5, letterSpacing: ".1em", textTransform: "uppercase", color: "var(--ls-ops-muted)" }}>ton tuteur · 24/7</div>
              </div>
              <span className="ls-ops-dot" />
            </div>
            <p style={{ fontSize: 14, lineHeight: 1.5, color: "var(--ls-ops-text3)", margin: "13px 0 13px" }}>
              « Bloqué·e sur cette étape ? Demande-moi — je t'aide en 2 secondes. »
            </p>
            <button type="button" onClick={() => askNoaly(lesson?.noalyPrompt)} style={noalyInput} aria-label="Demander à Noaly">
              <span style={{ flex: 1, fontSize: 13, color: "var(--ls-ops-faint)", textAlign: "left" }}>
                {lesson ? `M'aider : ${lesson.goProLabel.toLowerCase()}…` : "Pose ta question…"}
              </span>
              <span style={noalySend} aria-hidden="true">↑</span>
            </button>
          </div>

          {/* Progression — inline mobile, masqué desktop (→ rail) */}
          <div className="ls-ops-hide-desktop">
            <SectionLabel>Ton parcours · {view.totalSteps} étapes</SectionLabel>
            <Progression view={view} activeLabel={activeLabel} />
          </div>
        </div>

        {/* ── RAIL LATÉRAL (desktop) ── */}
        <aside className="ls-ops-rail">
          <PhaseTracker phaseIndex={phaseIndex} phaseLabel={phaseLabel} />
          <div style={{ height: 1, background: "var(--ls-ops-border-soft)", margin: "26px 0" }} />
          <div style={{ ...MONO, fontSize: 11, letterSpacing: ".16em", textTransform: "uppercase", color: "var(--ls-ops-muted)", marginBottom: 16 }}>
            Ton parcours · {view.activeStepNumber}/{view.totalSteps}
          </div>
          <RailSteps view={view} />
          <div style={{ height: 1, background: "var(--ls-ops-border-soft)", margin: "26px 0" }} />
          <div style={{ ...MONO, fontSize: 10.5, letterSpacing: ".12em", textTransform: "uppercase", color: "var(--ls-ops-muted)", marginBottom: 8 }}>
            Fil de sécurité
          </div>
          <p style={{ fontSize: 13, lineHeight: 1.5, color: "var(--ls-ops-text3)", margin: "0 0 12px" }}>
            Un blocage, même bête ? Ton parrain et Noaly sont là. Il n'y a pas de question idiote.
          </p>
          <button type="button" onClick={() => askNoaly(lesson?.noalyPrompt)} style={railNoalyBtn}>
            Demander à Noaly →
          </button>
        </aside>
      </div>

      {/* Barre basse : Académie (focus) / Plus tard (échappatoire). */}
      {onEscape && (
        <div style={bottomNav}>
          <div style={bottomNavInner}>
            <span style={{ ...navItem, color: "var(--ls-ops-accent-text)" }}>
              <span style={navDotOn} /> Académie
            </span>
            <button type="button" onClick={onEscape} style={{ ...navItem, ...navBtn, color: "var(--ls-ops-muted)" }}>
              <span style={navDotOff} /> Plus tard
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Sous-composants ─────────────────────────────────────────────────────────

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ ...MONO, fontSize: 11, letterSpacing: ".16em", textTransform: "uppercase", color: "var(--ls-ops-muted)", margin: "30px 0 14px" }}>
      {children}
    </div>
  );
}

function PhaseTracker({ phaseIndex, phaseLabel }: { phaseIndex: number; phaseLabel: string }) {
  const limeSegments = phaseIndex + 1;
  return (
    <div style={{ marginTop: 22 }}>
      <div style={{ display: "flex", justifyContent: "space-between", ...MONO, fontSize: 10.5, letterSpacing: ".12em", textTransform: "uppercase", color: "var(--ls-ops-muted)", marginBottom: 9 }}>
        <span>Phase · <span style={{ color: "var(--ls-ops-accent-text)" }}>{phaseLabel}</span></span>
        <span style={{ color: "var(--ls-ops-faint)" }}>{phaseIndex + 1} / {PHASES.length}</span>
      </div>
      <div style={{ display: "flex", gap: 5 }}>
        {PHASES.map((_, i) => (
          <div key={i} style={{ flex: 1, height: 6, borderRadius: 3, background: i < limeSegments ? "var(--ls-ops-accent)" : "var(--ls-ops-hair)" }} />
        ))}
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", marginTop: 7, ...MONO, fontSize: 11, letterSpacing: ".03em", textTransform: "uppercase" }}>
        {PHASES.map((p, i) => (
          <span key={p} style={{ color: i === phaseIndex ? "var(--ls-ops-accent-text)" : "var(--ls-ops-faint)" }}>{p}</span>
        ))}
      </div>
    </div>
  );
}

function Progression({ view, activeLabel }: { view: SalleOpsView; activeLabel: string }) {
  return (
    <div style={{ ...card, padding: "18px 16px", borderRadius: 18 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        {view.steps.map((s, i) => (
          <Step key={s.n} n={s.n} state={s.state} connectorDone={s.state === "done"} last={i === view.steps.length - 1} />
        ))}
      </div>
      <div style={{ marginTop: 14, textAlign: "center" }}>
        <div style={{ fontSize: 15, color: "var(--ls-ops-ink)", fontWeight: 600 }}>
          {view.activated ? "Tu es lancé·e 🚀" : `Étape ${view.activeStepNumber} sur ${view.totalSteps} · ${activeLabel}`}
        </div>
        <div style={{ fontSize: 13, color: "var(--ls-ops-muted)", marginTop: 3, lineHeight: 1.4 }}>
          {view.activated
            ? "Tes fondations sont posées. Place au rythme : une exposition par jour."
            : "Apprends, fais, prouve. Une étape à la fois."}
        </div>
      </div>
    </div>
  );
}

/** Liste verticale des 6 étapes Go Pro (rail desktop). */
function RailSteps({ view }: { view: SalleOpsView }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
      {view.steps.map((s, i) => {
        const done = s.state === "done";
        const active = s.state === "active";
        const locked = s.state === "locked";
        const last = i === view.steps.length - 1;
        return (
          <div key={s.n} style={{ display: "flex", gap: 13, alignItems: "flex-start" }}>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", flex: "none" }}>
              <div
                className={active ? "ls-ops-ring" : undefined}
                style={{
                  width: active ? 28 : 24,
                  height: active ? 28 : 24,
                  borderRadius: "50%",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 12,
                  boxSizing: "border-box",
                  fontFamily: active ? "var(--ls-ops-font-display)" : "inherit",
                  ...(done || active
                    ? { background: "var(--ls-ops-accent)", color: "var(--ls-ops-on-accent)", fontWeight: 700 }
                    : { border: "2px solid var(--ls-ops-disabled)", color: "var(--ls-ops-faint)" }),
                }}
              >
                {done ? "✓" : locked ? "🔒" : s.n}
              </div>
              {!last && <div style={{ width: 2, height: 22, background: done ? "var(--ls-ops-accent)" : "var(--ls-ops-hair)" }} />}
            </div>
            <div style={{ paddingTop: 2, paddingBottom: last ? 0 : 8 }}>
              <div style={{ fontSize: 14, fontWeight: active ? 600 : 400, color: active ? "var(--ls-ops-ink)" : done ? "var(--ls-ops-text3)" : "var(--ls-ops-faint)" }}>
                {s.label}
              </div>
              {locked ? (
                <div style={{ ...MONO, fontSize: 10, letterSpacing: ".06em", textTransform: "uppercase", color: "var(--ls-ops-faint)", marginTop: 2 }}>
                  bientôt · faire faire
                </div>
              ) : null}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function ScriptBox({ script }: { script: string }) {
  const [copied, setCopied] = useState(false);
  function copy() {
    try {
      void navigator.clipboard?.writeText(script);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      /* clipboard indispo — best-effort */
    }
  }
  return (
    <div style={scriptBox}>
      <p style={{ fontSize: 13.5, lineHeight: 1.5, color: "var(--ls-ops-on-accent3)", margin: "0 0 10px", fontStyle: "italic" }}>
        « {script} »
      </p>
      <button type="button" onClick={copy} style={scriptCopy}>
        {copied ? "✓ Copié" : "Copier le message"}
      </button>
    </div>
  );
}

function Step({ n, state, connectorDone, last }: { n: number; state: "done" | "active" | "todo" | "locked"; connectorDone: boolean; last: boolean }) {
  const done = state === "done";
  const active = state === "active";
  const locked = state === "locked";
  return (
    <>
      <div
        className={active ? "ls-ops-ring" : undefined}
        style={{
          width: active ? 30 : 26,
          height: active ? 30 : 26,
          borderRadius: "50%",
          flex: "none",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: active ? 15 : 13,
          fontFamily: active ? "var(--ls-ops-font-display)" : "inherit",
          boxSizing: "border-box",
          ...(done || active
            ? { background: "var(--ls-ops-accent)", color: "var(--ls-ops-on-accent)", fontWeight: 700 }
            : { border: "2px solid var(--ls-ops-disabled)", color: "var(--ls-ops-faint)" }),
        }}
      >
        {done ? "✓" : locked ? "🔒" : n}
      </div>
      {!last && <div style={{ height: 2, flex: 1, background: connectorDone ? "var(--ls-ops-accent)" : "var(--ls-ops-hair)", margin: "0 6px" }} />}
    </>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const pageWrap: React.CSSProperties = {
  background: "var(--ls-ops-bg)",
  minHeight: "100%",
  padding: "calc(16px + env(safe-area-inset-top)) 0 calc(40px + env(safe-area-inset-bottom))",
};

const fixedOverlay: React.CSSProperties = {
  position: "fixed",
  inset: 0,
  zIndex: 50,
  overflowY: "auto",
  WebkitOverflowScrolling: "touch",
};

const column: React.CSSProperties = {
  width: "100%",
  maxWidth: 560,
  margin: "0 auto",
  padding: "0 24px",
  boxSizing: "border-box",
};

const hair: React.CSSProperties = {
  height: 1,
  background: "linear-gradient(90deg, var(--ls-ops-hair), transparent)",
  margin: "14px 0 18px",
};

const title: React.CSSProperties = {
  fontSize: "clamp(40px, 12vw, 56px)",
  lineHeight: 0.9,
  letterSpacing: ".01em",
  color: "var(--ls-ops-ink)",
  margin: 0,
};

const lessonTitle: React.CSSProperties = {
  fontSize: "clamp(30px, 9vw, 40px)",
  lineHeight: 0.94,
  letterSpacing: ".01em",
  color: "var(--ls-ops-ink)",
  margin: 0,
};

const softCard: React.CSSProperties = {
  background: "var(--ls-ops-surface)",
  border: "1px solid var(--ls-ops-border)",
  borderRadius: 16,
  padding: 16,
};

const stepTag: React.CSSProperties = {
  fontFamily: "var(--ls-ops-font-mono)",
  fontSize: 11,
  letterSpacing: ".14em",
  textTransform: "uppercase",
  color: "var(--ls-ops-accent-text)",
  marginBottom: 8,
};

const lessonText: React.CSSProperties = {
  fontSize: 14,
  lineHeight: 1.55,
  color: "var(--ls-ops-text2)",
  margin: 0,
};

const limeCard: React.CSSProperties = {
  marginTop: 12,
  background: "var(--ls-ops-accent)",
  borderRadius: 18,
  padding: "18px 18px 16px",
};

const scriptBox: React.CSSProperties = {
  marginTop: 12,
  background: "color-mix(in srgb, var(--ls-ops-on-accent) 8%, transparent)",
  border: "1px solid color-mix(in srgb, var(--ls-ops-on-accent) 22%, transparent)",
  borderRadius: 12,
  padding: "12px 13px",
};

const scriptCopy: React.CSSProperties = {
  width: "100%",
  background: "var(--ls-ops-cta-bg)",
  color: "var(--ls-ops-accent)",
  border: "none",
  borderRadius: 10,
  padding: 11,
  fontSize: 13,
  fontWeight: 700,
  cursor: "pointer",
  fontFamily: "inherit",
};

const limeCta: React.CSSProperties = {
  marginTop: 14,
  width: "100%",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  background: "var(--ls-ops-cta-bg)",
  color: "var(--ls-ops-accent)",
  border: "none",
  borderRadius: 14,
  padding: 15,
  fontWeight: 700,
  fontSize: 16,
  minHeight: 44,
  boxSizing: "border-box",
  cursor: "pointer",
  fontFamily: "inherit",
};

const card: React.CSSProperties = {
  background: "var(--ls-ops-surface)",
  border: "1px solid var(--ls-ops-border)",
  borderRadius: 16,
};

const noalyBadge: React.CSSProperties = {
  width: 40,
  height: 40,
  borderRadius: 13,
  background: "var(--ls-ops-accent)",
  color: "var(--ls-ops-on-accent)",
  flex: "none",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontSize: 18,
};

const noalyInput: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 10,
  width: "100%",
  background: "var(--ls-ops-bg)",
  border: "1px solid var(--ls-ops-border)",
  borderRadius: 12,
  padding: "12px 14px",
  cursor: "pointer",
  fontFamily: "inherit",
};

const noalySend: React.CSSProperties = {
  width: 30,
  height: 30,
  borderRadius: 9,
  background: "var(--ls-ops-accent)",
  color: "var(--ls-ops-on-accent)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontWeight: 700,
  flex: "none",
};

const railNoalyBtn: React.CSSProperties = {
  width: "100%",
  background: "var(--ls-ops-cta-bg)",
  border: "1px solid var(--ls-ops-border-active)",
  color: "var(--ls-ops-accent-text)",
  borderRadius: 12,
  padding: "11px 14px",
  fontSize: 13,
  fontWeight: 600,
  cursor: "pointer",
  fontFamily: "inherit",
};

const bottomNav: React.CSSProperties = {
  position: "sticky",
  bottom: 0,
  zIndex: 5,
  padding: "12px 24px calc(14px + env(safe-area-inset-bottom))",
  background: "linear-gradient(180deg, transparent, var(--ls-ops-bg) 38%)",
};

const bottomNavInner: React.CSSProperties = {
  maxWidth: 460,
  margin: "0 auto",
  display: "flex",
  justifyContent: "space-around",
  alignItems: "center",
  gap: 8,
  background: "var(--ls-ops-surface)",
  border: "1px solid var(--ls-ops-border)",
  borderRadius: 18,
  padding: 8,
};

const navItem: React.CSSProperties = {
  flex: 1,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  gap: 8,
  padding: "10px 8px",
  fontFamily: "var(--ls-ops-font-mono)",
  fontSize: 11,
  letterSpacing: ".08em",
  textTransform: "uppercase",
  fontWeight: 500,
};

const navBtn: React.CSSProperties = {
  background: "transparent",
  border: "none",
  cursor: "pointer",
  borderRadius: 12,
};

const navDotOn: React.CSSProperties = {
  width: 18,
  height: 18,
  borderRadius: 5,
  border: "2px solid var(--ls-ops-accent)",
  boxSizing: "border-box",
};

const navDotOff: React.CSSProperties = {
  width: 18,
  height: 18,
  borderRadius: "50%",
  border: "2px solid var(--ls-ops-faint)",
  boxSizing: "border-box",
};
