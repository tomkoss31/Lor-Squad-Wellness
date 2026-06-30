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
  // Étape consultée : null = on suit l'étape en cours ; sinon on revoit une
  // étape (avant/après) sans la valider.
  const [viewedN, setViewedN] = useState<number | null>(null);
  const activeN = view.activeStepNumber;
  const shownN = viewedN ?? activeN;
  const shownStep = view.steps.find((s) => s.n === shownN) ?? view.steps[0];
  const lesson = shownStep?.lesson ?? null;
  const isActiveShown = shownN === activeN;
  const shownGateKey = isActiveShown ? view.currentGateKey : shownStep?.gateKey ?? null;

  const phaseIndex = Math.max(0, view.phaseIndex);
  const phaseLabel = OPS_PHASES[phaseIndex]?.label ?? "Allumage";
  const activeLabel = view.steps.find((s) => s.state === "active")?.label ?? "";

  /** Clic sur une étape du parcours → on la revoit (sauf verrouillée). */
  function pickStep(n: number) {
    const s = view.steps.find((x) => x.n === n);
    if (!s || s.state === "locked") return;
    setViewedN(n === activeN ? null : n);
  }

  function runFaire() {
    if (!lesson) return;
    if (lesson.faire.linkPath) navigate(lesson.faire.linkPath);
    else if (shownGateKey) void view.toggle(shownGateKey);
  }

  return (
    <div className="ls-ops-root" style={fullscreen ? { ...pageWrap, ...fixedOverlay } : pageWrap}>
      <div className="ls-ops-shell">
        {/* ── COLONNE FOCUS ── */}
        <div className="ls-ops-main" style={column}>
          {/* Bandeau + sortie toujours visible (anti-piège). */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 9, ...MONO, fontSize: 11, letterSpacing: ".12em", textTransform: "uppercase", color: "var(--ls-ops-muted)" }}>
              <span className="ls-ops-dot" />
              <span style={{ color: "var(--ls-ops-text3)" }}>La Base · Verdun (55)</span>
              <span style={{ color: "var(--ls-ops-border-active)" }}>/</span>
              <span style={{ color: "var(--ls-ops-accent-text)" }}>Jour {view.dayNumber} / 90</span>
            </div>
            {onEscape ? (
              <button type="button" onClick={onEscape} style={topEscape}>
                Plus tard →
              </button>
            ) : null}
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

              {!isActiveShown ? (
                <div style={reviewBanner}>
                  <span style={{ flex: 1 }}>
                    {shownStep?.state === "done" ? "✓ Étape déjà validée — tu la revois." : "Aperçu d'une étape à venir."}
                  </span>
                  <button type="button" style={reviewBack} onClick={() => setViewedN(null)}>
                    ← Mon étape
                  </button>
                </div>
              ) : null}

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
                {/* CTA outil : seulement si l'étape mène à un outil (lien). */}
                {lesson.faire.linkPath ? (
                  <button type="button" style={limeCta} onClick={runFaire}>{lesson.faire.ctaLabel} →</button>
                ) : null}
              </div>

              <div style={{ ...softCard, marginTop: 12 }}>
                <div style={stepTag}>3 · Preuve · c'est gagné quand…</div>
                <div style={{ display: "flex", alignItems: "flex-start", gap: 11 }}>
                  <span style={{ width: 22, height: 22, borderRadius: "50%", border: "2px solid var(--ls-ops-accent)", flex: "none", marginTop: 1, boxSizing: "border-box" }} />
                  <p style={{ ...lessonText, margin: 0 }}>{lesson.preuve}</p>
                </div>
                {/* AVANCEMENT :
                    • étape revisitée → on ne valide pas, juste l'état + retour.
                    • autoOnly (vrai bilan/commande) → se valide TOUT SEUL (trigger).
                    • sinon → gros bouton « ✓ C'est fait » (seul moyen d'avancer). */}
                {!isActiveShown ? (
                  <div style={autoNote}>
                    {shownStep?.state === "done"
                      ? "✓ Cette étape est validée."
                      : "Tu pourras valider cette étape quand ce sera son tour."}
                  </div>
                ) : lesson.autoOnly ? (
                  <div style={autoNote}>
                    ⏳ Pas besoin de cocher : cette étape se valide <strong style={{ color: "var(--ls-ops-accent-text)" }}>toute seule</strong> dès que l'acte réel est enregistré (anti-triche).
                  </div>
                ) : shownGateKey ? (
                  <button type="button" style={doneBtn} onClick={() => shownGateKey && void view.toggle(shownGateKey)}>
                    ✓ C'est fait — passer à l'étape suivante
                  </button>
                ) : null}
              </div>

              {/* Réponses prêtes (« comment répondre ») */}
              {lesson.repondre && lesson.repondre.length > 0 ? (
                <div style={{ marginTop: 12 }}>
                  <div style={{ ...MONO, fontSize: 11, letterSpacing: ".14em", textTransform: "uppercase", color: "var(--ls-ops-muted)", margin: "8px 0 10px" }}>
                    Réponses prêtes · comment répondre
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    {lesson.repondre.map((r) => (
                      <Repondre key={r.situation} situation={r.situation} reponse={r.reponse} />
                    ))}
                  </div>
                </div>
              ) : null}
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
            <Progression view={view} activeLabel={activeLabel} shownN={shownN} onPick={pickStep} />
          </div>
        </div>

        {/* ── RAIL LATÉRAL (desktop) ── */}
        <aside className="ls-ops-rail">
          <PhaseTracker phaseIndex={phaseIndex} phaseLabel={phaseLabel} />
          <div style={{ height: 1, background: "var(--ls-ops-border-soft)", margin: "26px 0" }} />
          <div style={{ ...MONO, fontSize: 11, letterSpacing: ".16em", textTransform: "uppercase", color: "var(--ls-ops-muted)", marginBottom: 16 }}>
            Ton parcours · {view.activeStepNumber}/{view.totalSteps}
          </div>
          <RailSteps view={view} shownN={shownN} onPick={pickStep} />
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

function Progression({ view, activeLabel, shownN, onPick }: { view: SalleOpsView; activeLabel: string; shownN: number; onPick: (n: number) => void }) {
  return (
    <div style={{ ...card, padding: "18px 16px", borderRadius: 18 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        {view.steps.map((s, i) => (
          <Step key={s.n} n={s.n} state={s.state} picked={s.n === shownN} connectorDone={s.state === "done"} last={i === view.steps.length - 1} onPick={onPick} />
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
        <div style={{ ...MONO, fontSize: 10, letterSpacing: ".06em", textTransform: "uppercase", color: "var(--ls-ops-faint)", marginTop: 8 }}>
          Touche une étape pour la revoir
        </div>
      </div>
    </div>
  );
}

/** Liste verticale des étapes Go Pro (rail desktop), cliquable pour revisiter. */
function RailSteps({ view, shownN, onPick }: { view: SalleOpsView; shownN: number; onPick: (n: number) => void }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
      {view.steps.map((s, i) => {
        const done = s.state === "done";
        const active = s.state === "active";
        const locked = s.state === "locked";
        const last = i === view.steps.length - 1;
        return (
          <button
            type="button"
            key={s.n}
            disabled={locked}
            onClick={() => onPick(s.n)}
            style={{
              display: "flex",
              gap: 13,
              alignItems: "flex-start",
              width: "100%",
              textAlign: "left",
              background: s.n === shownN && !active ? "var(--ls-ops-surface)" : "transparent",
              border: "none",
              borderRadius: 10,
              padding: s.n === shownN && !active ? "4px 6px" : "0",
              cursor: locked ? "default" : "pointer",
              fontFamily: "inherit",
            }}
          >
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
          </button>
        );
      })}
    </div>
  );
}

function Repondre({ situation, reponse }: { situation: string; reponse: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div style={{ ...softCard, padding: "13px 15px", cursor: "pointer" }} onClick={() => setOpen((v) => !v)}>
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <span style={{ flex: 1, fontSize: 14, color: "var(--ls-ops-ink)", fontWeight: 500 }}>{situation}</span>
        <span style={{ ...MONO, fontSize: 14, color: "var(--ls-ops-accent-text)" }} aria-hidden="true">{open ? "−" : "+"}</span>
      </div>
      {open ? (
        <p style={{ fontSize: 13.5, lineHeight: 1.55, color: "var(--ls-ops-text3)", margin: "10px 0 0" }}>{reponse}</p>
      ) : null}
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

function Step({ n, state, connectorDone, last, picked, onPick }: { n: number; state: "done" | "active" | "todo" | "locked"; connectorDone: boolean; last: boolean; picked: boolean; onPick: (n: number) => void }) {
  const done = state === "done";
  const active = state === "active";
  const locked = state === "locked";
  return (
    <>
      <button
        type="button"
        disabled={locked}
        onClick={() => onPick(n)}
        className={active ? "ls-ops-ring" : undefined}
        aria-label={`Étape ${n}`}
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
          cursor: locked ? "default" : "pointer",
          outline: picked && !active ? "2px solid var(--ls-ops-accent-text)" : "none",
          outlineOffset: 2,
          padding: 0,
          ...(done || active
            ? { background: "var(--ls-ops-accent)", color: "var(--ls-ops-on-accent)", border: "none", fontWeight: 700 }
            : { background: "transparent", border: "2px solid var(--ls-ops-disabled)", color: "var(--ls-ops-faint)" }),
        }}
      >
        {done ? "✓" : locked ? "🔒" : n}
      </button>
      {!last && <div style={{ height: 2, flex: 1, background: connectorDone ? "var(--ls-ops-accent)" : "var(--ls-ops-hair)", margin: "0 6px" }} />}
    </>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const pageWrap: React.CSSProperties = {
  background: "var(--ls-ops-bg)",
  minHeight: "100%",
  // Grosse marge basse : le contenu (dont « ✓ C'est fait ») doit passer
  // AU-DESSUS de la nav du bas de l'app, jamais caché derrière.
  padding: "calc(16px + env(safe-area-inset-top)) 0 calc(120px + env(safe-area-inset-bottom))",
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

const topEscape: React.CSSProperties = {
  flex: "none",
  fontFamily: "var(--ls-ops-font-mono)",
  fontSize: 11,
  letterSpacing: ".06em",
  textTransform: "uppercase",
  color: "var(--ls-ops-text3)",
  background: "var(--ls-ops-surface)",
  border: "1px solid var(--ls-ops-border)",
  borderRadius: 999,
  padding: "7px 13px",
  cursor: "pointer",
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

const reviewBanner: React.CSSProperties = {
  marginTop: 12,
  display: "flex",
  alignItems: "center",
  gap: 10,
  background: "var(--ls-ops-surface)",
  border: "1px solid var(--ls-ops-border-active)",
  borderRadius: 12,
  padding: "10px 12px",
  fontSize: 12.5,
  color: "var(--ls-ops-text3)",
};

const reviewBack: React.CSSProperties = {
  flex: "none",
  fontFamily: "var(--ls-ops-font-mono)",
  fontSize: 11,
  letterSpacing: ".04em",
  color: "var(--ls-ops-accent-text)",
  background: "transparent",
  border: "1px solid var(--ls-ops-border-active)",
  borderRadius: 999,
  padding: "6px 11px",
  cursor: "pointer",
};

const autoNote: React.CSSProperties = {
  marginTop: 14,
  background: "color-mix(in srgb, var(--ls-ops-accent) 8%, transparent)",
  border: "1px solid var(--ls-ops-border-active)",
  borderRadius: 12,
  padding: "12px 14px",
  fontSize: 13,
  lineHeight: 1.5,
  color: "var(--ls-ops-text3)",
};

const doneBtn: React.CSSProperties = {
  width: "100%",
  marginTop: 14,
  background: "var(--ls-ops-accent)",
  border: "none",
  color: "var(--ls-ops-on-accent)",
  borderRadius: 12,
  padding: 14,
  fontSize: 15,
  fontWeight: 700,
  cursor: "pointer",
  fontFamily: "inherit",
  minHeight: 44,
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

