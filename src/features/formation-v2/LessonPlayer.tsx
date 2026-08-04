// =============================================================================
// LessonPlayer — le moteur d'une micro-leçon (2026-08-04).
//
// Trois temps, plein écran : CARTE → CHECK → RÉCOMPENSE. Aucun mur : le check
// donne un feedback immédiat, la leçon se valide sur-le-champ (pas de sponsor,
// pas de note). Maquette validée : scratchpad/formation-v2.html.
// =============================================================================

import { useState } from "react";
import { ConfettiBurst } from "../academy/components/ConfettiBurst";
import type { Lesson, LessonBlock } from "./types";
import { XP_PER_LESSON } from "./types";
import { FORMATION_V2_STYLES } from "./styles";

type Phase = "card" | "check" | "reward";

/** Rendu minimal du `**gras**` sans dépendance markdown. */
function RichText({ text }: { text: string }) {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return (
    <>
      {parts.map((p, i) =>
        p.startsWith("**") && p.endsWith("**") ? (
          <b key={i}>{p.slice(2, -2)}</b>
        ) : (
          <span key={i}>{p}</span>
        ),
      )}
    </>
  );
}

function Block({ block }: { block: LessonBlock }) {
  if (block.kind === "example") {
    return (
      <div className="fv-example">
        {block.label ? <div className="fv-example-l">{block.label}</div> : null}
        <RichText text={block.text} />
      </div>
    );
  }
  if (block.kind === "bullet") {
    return (
      <p className="fv-bullet">
        <span aria-hidden="true" className="fv-bullet-dot">•</span>
        <span><RichText text={block.text} /></span>
      </p>
    );
  }
  return <p className="fv-text"><RichText text={block.text} /></p>;
}

export function LessonPlayer({
  lesson,
  chapterLabel,
  streak,
  onClose,
  onDone,
}: {
  lesson: Lesson;
  /** « Chapitre 2 · Trouver », affiché en surtitre. */
  chapterLabel: string;
  /** Série (jours) affichée sur l'écran de récompense. */
  streak: number;
  onClose: () => void;
  /** Appelé une fois la leçon validée (persiste la progression + XP). */
  onDone: (slug: string) => void;
}) {
  const [phase, setPhase] = useState<Phase>("card");
  const [picked, setPicked] = useState<number | null>(null);
  const [confetti, setConfetti] = useState(false);

  const check = lesson.check;
  const answered = picked !== null;
  const isCorrect = answered && check ? check.options[picked].correct : false;

  const progress = phase === "card" ? 33 : phase === "check" ? 66 : 100;

  function pick(i: number) {
    if (answered) return;
    setPicked(i);
  }

  function goReward() {
    onDone(lesson.slug);
    setPhase("reward");
    setConfetti(true);
  }

  return (
    <div className="fv-screen" role="dialog" aria-modal="true" aria-label={lesson.title}>
      <style>{FORMATION_V2_STYLES}</style>

      {/* barre du haut : fermer + progression de la leçon */}
      {phase !== "reward" ? (
        <div className="fv-lhead">
          <button type="button" className="fv-lclose" onClick={onClose} aria-label="Fermer">✕</button>
          <div className="fv-ltrack"><i style={{ width: `${progress}%` }} /></div>
        </div>
      ) : null}

      {/* ── CARTE ── */}
      {phase === "card" ? (
        <>
          <div className="fv-lbody">
            <div className="fv-kicker">{chapterLabel}</div>
            <h1 className="fv-lh1">{lesson.title}</h1>
            <div className={`fv-force fv-accent-${lesson.accent}`}>
              <div className="fv-force-l">💡 Idée force</div>
              <div className="fv-force-t">{lesson.ideeForce}</div>
            </div>
            {lesson.blocks.map((b, i) => (
              <Block key={i} block={b} />
            ))}
          </div>
          <div className="fv-foot">
            <button type="button" className="fv-cta fv-cta-lime" onClick={() => (check ? setPhase("check") : goReward())}>
              {check ? "J'ai compris →" : "Terminé →"}
            </button>
          </div>
        </>
      ) : null}

      {/* ── CHECK ── */}
      {phase === "check" && check ? (
        <>
          <div className="fv-lbody">
            <div className="fv-kicker">Mini-check · 1 question</div>
            <h2 className="fv-qtitle">{check.question}</h2>
            {check.options.map((opt, i) => {
              const cls = !answered
                ? "fv-opt"
                : i === picked
                  ? opt.correct
                    ? "fv-opt fv-opt-good"
                    : "fv-opt fv-opt-bad"
                  : opt.correct && answered && !isCorrect
                    ? "fv-opt fv-opt-good"
                    : "fv-opt";
              return (
                <button key={i} type="button" className={cls} disabled={answered} onClick={() => pick(i)}>
                  {opt.label}
                </button>
              );
            })}
          </div>
          {answered ? (
            <div className={`fv-foot ${isCorrect ? "fv-foot-good" : "fv-foot-bad"}`}>
              <div className="fv-fbtitle">{isCorrect ? "Exactement 💪" : "Presque…"}</div>
              <div className="fv-fbdesc">{isCorrect ? check.successNote : check.retryNote}</div>
              {isCorrect ? (
                <button type="button" className="fv-cta fv-cta-teal" onClick={goReward}>Génial →</button>
              ) : (
                <button type="button" className="fv-cta fv-cta-ghost" onClick={() => setPicked(null)}>Réessayer</button>
              )}
            </div>
          ) : null}
        </>
      ) : null}

      {/* ── RÉCOMPENSE ── */}
      {phase === "reward" ? (
        <div className="fv-reward">
          <div style={{ fontSize: 52 }} aria-hidden="true">🎉</div>
          <div className="fv-rbig">Leçon terminée !</div>
          <div className="fv-rrow">
            <div className="fv-rstat">
              <div className="fv-rv" style={{ color: "var(--ls-teal)" }}>+{XP_PER_LESSON}</div>
              <div className="fv-rl">✦ XP</div>
            </div>
            <div className="fv-rstat">
              {/* On vient de valider une leçon aujourd'hui : la série vaut au
                  moins 1 (le compteur parent peut encore afficher 0 le temps
                  que l'état se propage). */}
              <div className="fv-rv" style={{ color: "var(--ls-lime)" }}>{Math.max(1, streak)} 🔥</div>
              <div className="fv-rl">Série</div>
            </div>
          </div>
          <button type="button" className="fv-cta fv-cta-teal" style={{ maxWidth: 240 }} onClick={onClose}>
            Continuer le parcours →
          </button>
          <div className="fv-note">Validé tout de suite. Personne à attendre.</div>
        </div>
      ) : null}

      {confetti ? <ConfettiBurst onComplete={() => setConfetti(false)} /> : null}
    </div>
  );
}
