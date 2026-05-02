// =============================================================================
// LessonCard — card 1 leçon Formation (Phase F-UI)
//
// Affiche le titre de la leçon + durée + contenu rendu via MarkdownRenderer
// (kind=text) ou un block specifique (kind=video / school-link / checklist).
// =============================================================================

import type { FormationLesson } from "../../data/formation";
import { MarkdownRenderer } from "./MarkdownRenderer";

interface Props {
  lesson: FormationLesson;
  index: number;
}

const KIND_META: Record<string, { emoji: string; label: string }> = {
  text: { emoji: "📖", label: "Lecture" },
  video: { emoji: "▶", label: "Vidéo" },
  "school-link": { emoji: "🎓", label: "Vidéo School" },
  checklist: { emoji: "☑", label: "Checklist" },
  interactive: { emoji: "🎮", label: "Interactif" },
};

export function LessonCard({ lesson, index }: Props) {
  const meta = KIND_META[lesson.kind] ?? KIND_META.text;

  return (
    <article
      style={{
        background: "var(--ls-surface)",
        border: "0.5px solid var(--ls-border)",
        borderRadius: 14,
        padding: "18px 20px",
        fontFamily: "DM Sans, sans-serif",
      }}
    >
      <header
        style={{
          display: "flex",
          alignItems: "baseline",
          gap: 10,
          marginBottom: 12,
          paddingBottom: 10,
          borderBottom: "0.5px solid var(--ls-border)",
        }}
      >
        <span
          style={{
            fontFamily: "Syne, serif",
            fontSize: 13,
            fontWeight: 800,
            color: "var(--ls-gold)",
            background: "color-mix(in srgb, var(--ls-gold) 14%, transparent)",
            padding: "2px 8px",
            borderRadius: 6,
            letterSpacing: "0.02em",
            flexShrink: 0,
          }}
        >
          {String(index + 1).padStart(2, "0")}
        </span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <h3
            style={{
              fontFamily: "Syne, serif",
              fontSize: 16,
              fontWeight: 700,
              margin: 0,
              color: "var(--ls-text)",
              letterSpacing: "-0.01em",
            }}
          >
            {lesson.title}
          </h3>
          <div style={{ fontSize: 11, color: "var(--ls-text-muted)", marginTop: 2 }}>
            <span aria-hidden="true">{meta.emoji}</span> {meta.label} · {lesson.durationMin} min
          </div>
        </div>
      </header>

      {/* Body selon kind */}
      {lesson.kind === "text" || lesson.kind === "checklist" ? (
        lesson.contentMarkdown ? (
          <MarkdownRenderer content={lesson.contentMarkdown} />
        ) : (
          <p style={{ color: "var(--ls-text-hint)", fontStyle: "italic" }}>
            (Contenu à venir)
          </p>
        )
      ) : null}

      {lesson.kind === "video" && lesson.videoUrl ? (
        <div style={{ aspectRatio: "16/9", borderRadius: 12, overflow: "hidden", background: "#000" }}>
          <iframe
            src={lesson.videoUrl}
            title={lesson.title}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            style={{ width: "100%", height: "100%", border: "none" }}
          />
        </div>
      ) : null}

      {lesson.kind === "school-link" && lesson.schoolUrl ? (
        <a
          href={lesson.schoolUrl}
          target="_blank"
          rel="noopener noreferrer"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
            padding: "10px 14px",
            background: "linear-gradient(135deg, var(--ls-purple) 0%, color-mix(in srgb, var(--ls-purple) 70%, #000) 100%)",
            color: "white",
            borderRadius: 999,
            textDecoration: "none",
            fontFamily: "Syne, serif",
            fontWeight: 700,
            fontSize: 13,
          }}
        >
          🎓 Ouvrir sur Herbalife School →
        </a>
      ) : null}
    </article>
  );
}
