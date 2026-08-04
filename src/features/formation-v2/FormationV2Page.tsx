// =============================================================================
// FormationV2Page — le hub « chemin » (2026-08-04).
//
// Un seul point vert = la prochaine leçon. Les autres sont faites (✓) ou
// verrouillées mais VISIBLES. Remplace « Module 1/9 · 0/18 validés ».
// Lot 1 du chantier « formation façon Duolingo ». Maquette :
// scratchpad/formation-v2.html.
// =============================================================================

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { FORMATION_V2_CHAPTERS, FORMATION_V2_LESSONS, FORMATION_V2_TOTAL } from "./content";
import { LessonPlayer } from "./LessonPlayer";
import { FormationV2Done } from "./FormationV2Done";
import { useFormationV2Progress } from "./useFormationV2Progress";
import { FORMATION_V2_STYLES } from "./styles";
import type { Lesson } from "./types";

type NodeState = "done" | "active" | "lock";

export function FormationV2Page() {
  const { doneSet, doneCount, streak, doneToday, activeSlug, markDone, xp } = useFormationV2Progress();
  const [open, setOpen] = useState<Lesson | null>(null);
  const [showDone, setShowDone] = useState(false);
  const [searchParams, setSearchParams] = useSearchParams();

  const allDone = doneCount === FORMATION_V2_TOTAL;
  // La leçon ouverte est-elle la DERNIÈRE non faite ? La valider clôt le parcours.
  const isFinisher = !!open && !doneSet.has(open.slug) && doneCount === FORMATION_V2_TOTAL - 1;
  const activeLesson = FORMATION_V2_LESSONS.find((l) => l.slug === activeSlug) ?? null;

  // État de chaque leçon : faite / active / verrouillée (après l'active).
  const nodeState = useMemo(() => {
    const activeIndex = FORMATION_V2_LESSONS.findIndex((l) => l.slug === activeSlug);
    const map = new Map<string, NodeState>();
    FORMATION_V2_LESSONS.forEach((l, i) => {
      if (doneSet.has(l.slug)) map.set(l.slug, "done");
      else if (l.slug === activeSlug) map.set(l.slug, "active");
      else if (activeIndex === -1 || i > activeIndex) map.set(l.slug, "lock");
      else map.set(l.slug, "lock");
    });
    return map;
  }, [doneSet, activeSlug]);

  // Deep-link `?lecon=slug` : ouvre une leçon précise (push, annonce, écran de
  // fin). On n'ouvre QUE si elle n'est pas verrouillée — on ne saute pas le
  // séquentiel, dont dépend la reconstruction serveur de la progression.
  useEffect(() => {
    const slug = searchParams.get("lecon");
    if (!slug) return;
    const lesson = FORMATION_V2_LESSONS.find((l) => l.slug === slug);
    if (lesson && nodeState.get(slug) !== "lock") setOpen(lesson);
    const next = new URLSearchParams(searchParams);
    next.delete("lecon");
    setSearchParams(next, { replace: true });
  }, [searchParams, nodeState, setSearchParams]);

  const chapterLabelFor = (lesson: Lesson) => {
    const ch = FORMATION_V2_CHAPTERS.find((c) => c.lessons.some((l) => l.slug === lesson.slug));
    return ch ? `Chapitre ${ch.number} · ${ch.theme}` : lesson.title;
  };

  return (
    <div className="fv-wrap" style={{ maxWidth: 560, margin: "0 auto", padding: "4px 4px 40px" }}>
      <style>{FORMATION_V2_STYLES}</style>

      <div className="fv-top">
        <div>
          <p className="fv-cn" style={{ margin: 0 }}>Ma formation</p>
          <h1 style={{ fontFamily: "Anton, Impact, sans-serif", fontSize: 26, letterSpacing: ".4px", margin: "2px 0 0", color: "var(--ls-text)" }}>
            Apprendre en avançant
          </h1>
        </div>
        <div className="fv-top-sp">
          <span className="fv-streak">🔥 {streak}</span>
          <span className="fv-xp">✦ {xp}</span>
        </div>
      </div>

      {/* Badges : une médaille par chapitre (allumée quand il est fini) + le
          diplôme final. Progrès visible d'un coup d'œil. */}
      <div className="fv-badges" aria-label="Tes badges de formation">
        {FORMATION_V2_CHAPTERS.map((c) => {
          const earned = c.lessons.every((l) => doneSet.has(l.slug));
          return (
            <span
              key={c.slug}
              className={`fv-badge${earned ? " fv-badge-on" : ""}`}
              title={`Chapitre ${c.number} · ${c.theme}${earned ? " ✓" : ""}`}
            >
              {c.badge}
            </span>
          );
        })}
        <span className={`fv-badge fv-badge-final${allDone ? " fv-badge-on" : ""}`} title="Diplômé">
          🎓
        </span>
      </div>

      {/* Objectif du jour + reprise en 1 tap : la même carte fait les deux. */}
      {!allDone && activeLesson ? (
        <button type="button" className="fv-focus" onClick={() => setOpen(activeLesson)}>
          <span className="fv-focus-main">
            <span className="fv-focus-tag">{doneToday ? "✅ Leçon du jour faite" : "🎯 Ta leçon du jour"}</span>
            <span className="fv-focus-title">{activeLesson.pathLabel}</span>
          </span>
          <span className="fv-focus-cta">{doneToday ? "Continuer →" : "Commencer →"}</span>
        </button>
      ) : null}

      {allDone ? (
        <button type="button" className="fv-donebar" onClick={() => setShowDone(true)}>
          🎓 Parcours terminé — voir mon bilan →
        </button>
      ) : null}

      {FORMATION_V2_CHAPTERS.map((chapter) => {
        const done = chapter.lessons.filter((l) => doneSet.has(l.slug)).length;
        const pct = Math.round((done / chapter.lessons.length) * 100);
        return (
          <section key={chapter.slug}>
            <div className="fv-chapter">
              <div className="fv-cn">Chapitre {chapter.number} · {chapter.theme}</div>
              <div className="fv-ct">{chapter.title}</div>
              <div className="fv-cbar"><i style={{ width: `${pct}%` }} /></div>
            </div>
            <div className="fv-path">
              {chapter.lessons.map((lesson, i) => {
                const st = nodeState.get(lesson.slug) ?? "lock";
                return (
                  <div key={lesson.slug} style={{ display: "contents" }}>
                    {i > 0 ? <span className="fv-link" /> : null}
                    <div className={`fv-node${st === "active" ? " fv-node-active" : ""}`}>
                      {st === "active" ? <span className="fv-startchip">COMMENCER</span> : null}
                      <button
                        type="button"
                        className={`fv-dot fv-dot-${st}`}
                        disabled={st === "lock"}
                        aria-label={lesson.title}
                        onClick={() => st !== "lock" && setOpen(lesson)}
                      >
                        {st === "done" ? "✓" : st === "lock" ? "🔒" : lesson.icon}
                      </button>
                      <span className="fv-nl">{lesson.pathLabel}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        );
      })}

      {open ? (
        <LessonPlayer
          lesson={open}
          chapterLabel={chapterLabelFor(open)}
          streak={streak}
          onClose={() => setOpen(null)}
          onDone={markDone}
          finisher={isFinisher}
          onFinish={() => {
            setOpen(null);
            setShowDone(true);
          }}
        />
      ) : null}

      {showDone ? (
        <FormationV2Done xp={xp} streak={streak} onClose={() => setShowDone(false)} />
      ) : null}
    </div>
  );
}
