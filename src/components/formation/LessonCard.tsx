// =============================================================================
// LessonCard — card 1 leçon Formation (Phase F-UI + feature #8 2026-11-04)
//
// Affiche le titre de la leçon + durée + contenu selon kind :
//   - text       : MarkdownRenderer
//   - video      : iframe YouTube/Vimeo
//   - school-link: bouton externe Herbalife School
//   - checklist  : items cochables persistes localStorage (feature #8)
//   - audio      : <audio controls> + transcription markdown optional (feature #8)
//   - interactive: placeholder (V2)
// =============================================================================

import { useEffect, useState } from "react";
import type { FormationLesson } from "../../data/formation";
import { useAppContext } from "../../context/AppContext";
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
  audio: { emoji: "🎧", label: "Audio" },
  interactive: { emoji: "🎮", label: "Interactif" },
};

// Parse markdown checklist "- [ ] item" / "- [x] item" → items
function parseChecklistFromMarkdown(md: string): Array<{ id: string; label: string }> {
  const lines = md.split("\n");
  const items: Array<{ id: string; label: string }> = [];
  let counter = 0;
  for (const line of lines) {
    const match = line.match(/^[\s-]*\[([ xX])\]\s+(.+)$/);
    if (match) {
      counter += 1;
      items.push({ id: `auto-${counter}`, label: match[2].trim() });
    }
  }
  return items;
}

export function LessonCard({ lesson, index }: Props) {
  const meta = KIND_META[lesson.kind] ?? KIND_META.text;

  return (
    <article
      className="ls-lesson-card"
      style={{
        background: "var(--ls-surface)",
        border: "0.5px solid var(--ls-border)",
        borderRadius: 14,
        padding: "18px 20px",
        fontFamily: "DM Sans, sans-serif",
        animation: `ls-lesson-fade-up 0.45s cubic-bezier(0.16, 1, 0.3, 1) ${index * 80}ms backwards`,
        transition: "transform 0.18s ease, box-shadow 0.18s ease",
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
      {lesson.kind === "text" ? (
        lesson.contentMarkdown ? (
          <MarkdownRenderer content={lesson.contentMarkdown} />
        ) : (
          <p style={{ color: "var(--ls-text-hint)", fontStyle: "italic" }}>
            (Contenu à venir)
          </p>
        )
      ) : null}

      {lesson.kind === "checklist" ? (
        <ChecklistBody lesson={lesson} />
      ) : null}

      {lesson.kind === "audio" && lesson.audioUrl ? (
        <AudioBody lesson={lesson} />
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
      <style>{`
        @keyframes ls-lesson-fade-up {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .ls-lesson-card:hover {
          transform: translateY(-2px);
          box-shadow: 0 6px 18px color-mix(in srgb, var(--ls-text) 6%, transparent);
        }
        @media (prefers-reduced-motion: reduce) {
          .ls-lesson-card { animation: none !important; transition: none !important; }
        }
      `}</style>
    </article>
  );
}

// ─── Sub-components feature #8 (2026-11-04) ───────────────────────────────

const CHECKLIST_PREFIX = "ls-lesson-checklist-";

function ChecklistBody({ lesson }: { lesson: FormationLesson }) {
  const { currentUser } = useAppContext();
  const userId = currentUser?.id ?? null;
  const items =
    lesson.checklistItems && lesson.checklistItems.length > 0
      ? lesson.checklistItems
      : parseChecklistFromMarkdown(lesson.contentMarkdown ?? "");

  const storageKey = userId ? `${CHECKLIST_PREFIX}${userId}-${lesson.id}` : null;
  const [checked, setChecked] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (!storageKey) return;
    try {
      const raw = window.localStorage.getItem(storageKey);
      if (raw) setChecked(JSON.parse(raw) as Record<string, boolean>);
      else setChecked({});
    } catch {
      setChecked({});
    }
  }, [storageKey]);

  function toggle(id: string) {
    if (!storageKey) return;
    setChecked((prev) => {
      const next = { ...prev, [id]: !prev[id] };
      try {
        window.localStorage.setItem(storageKey, JSON.stringify(next));
      } catch {
        /* quota */
      }
      return next;
    });
  }

  if (items.length === 0) {
    return lesson.contentMarkdown ? (
      <MarkdownRenderer content={lesson.contentMarkdown} />
    ) : (
      <p style={{ color: "var(--ls-text-hint)", fontStyle: "italic" }}>
        (Aucun item dans la checklist)
      </p>
    );
  }

  const doneCount = items.filter((i) => checked[i.id]).length;
  const allDone = doneCount === items.length;

  return (
    <div>
      {/* Progress mini */}
      <div
        style={{
          fontSize: 11,
          color: allDone ? "var(--ls-teal)" : "var(--ls-text-muted)",
          fontFamily: "DM Sans, sans-serif",
          fontWeight: 600,
          marginBottom: 12,
          display: "flex",
          alignItems: "center",
          gap: 8,
        }}
      >
        <span>
          {allDone ? "✓" : "○"} {doneCount}/{items.length} {allDone ? "terminé" : "fait"}
        </span>
        <div
          style={{
            flex: 1,
            height: 4,
            background: "var(--ls-surface2)",
            borderRadius: 999,
            overflow: "hidden",
          }}
        >
          <div
            style={{
              width: `${(doneCount / items.length) * 100}%`,
              height: "100%",
              background: allDone ? "var(--ls-teal)" : "var(--ls-gold)",
              transition: "width 300ms ease, background 300ms ease",
            }}
          />
        </div>
      </div>

      {/* Items */}
      <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: 8 }}>
        {items.map((item) => {
          const isOn = !!checked[item.id];
          return (
            <li key={item.id}>
              <label
                style={{
                  display: "flex",
                  alignItems: "flex-start",
                  gap: 10,
                  padding: "10px 12px",
                  borderRadius: 10,
                  background: isOn ? "color-mix(in srgb, var(--ls-teal) 6%, var(--ls-surface2))" : "var(--ls-surface2)",
                  border: isOn
                    ? "0.5px solid color-mix(in srgb, var(--ls-teal) 40%, transparent)"
                    : "0.5px solid var(--ls-border)",
                  cursor: "pointer",
                  transition: "all 200ms ease",
                  fontFamily: "DM Sans, sans-serif",
                }}
              >
                <input
                  type="checkbox"
                  checked={isOn}
                  onChange={() => toggle(item.id)}
                  style={{
                    width: 18,
                    height: 18,
                    accentColor: "var(--ls-teal)",
                    flexShrink: 0,
                    marginTop: 1,
                  }}
                />
                <span
                  style={{
                    fontSize: 13.5,
                    color: isOn ? "var(--ls-text-muted)" : "var(--ls-text)",
                    textDecoration: isOn ? "line-through" : "none",
                    lineHeight: 1.5,
                  }}
                >
                  {item.label}
                </span>
              </label>
            </li>
          );
        })}
      </ul>

      {/* Hint persist */}
      <p
        style={{
          fontSize: 10.5,
          color: "var(--ls-text-hint)",
          marginTop: 10,
          fontStyle: "italic",
          fontFamily: "DM Sans, sans-serif",
        }}
      >
        🔒 Tes coches restent enregistrées sur ton appareil.
      </p>
    </div>
  );
}

function AudioBody({ lesson }: { lesson: FormationLesson }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <div
        style={{
          padding: "14px 16px",
          background: "linear-gradient(135deg, color-mix(in srgb, var(--ls-purple) 12%, var(--ls-surface)) 0%, var(--ls-surface) 100%)",
          border: "0.5px solid color-mix(in srgb, var(--ls-purple) 30%, var(--ls-border))",
          borderRadius: 12,
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
            marginBottom: 12,
          }}
        >
          <div
            style={{
              width: 40,
              height: 40,
              borderRadius: 10,
              background: "linear-gradient(135deg, var(--ls-purple) 0%, color-mix(in srgb, var(--ls-purple) 70%, var(--ls-bg)) 100%)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 20,
              boxShadow: "0 2px 8px color-mix(in srgb, var(--ls-purple) 35%, transparent)",
              flexShrink: 0,
            }}
          >
            🎧
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div
              style={{
                fontSize: 11,
                fontWeight: 700,
                letterSpacing: "0.14em",
                textTransform: "uppercase",
                color: "var(--ls-purple)",
                fontFamily: "DM Sans, sans-serif",
              }}
            >
              ✦ Podcast d&apos;apprentissage
            </div>
            <div
              style={{
                fontSize: 11,
                color: "var(--ls-text-muted)",
                fontFamily: "DM Sans, sans-serif",
                marginTop: 2,
              }}
            >
              Écoute en marchant ou en voiture · {lesson.durationMin} min
            </div>
          </div>
        </div>
        <audio
          controls
          src={lesson.audioUrl}
          preload="metadata"
          style={{
            width: "100%",
          }}
        />
      </div>
      {lesson.contentMarkdown ? (
        <details style={{ fontFamily: "DM Sans, sans-serif" }}>
          <summary
            style={{
              cursor: "pointer",
              fontSize: 12,
              color: "var(--ls-text-muted)",
              padding: "6px 0",
              fontWeight: 600,
            }}
          >
            📄 Voir la transcription
          </summary>
          <div style={{ marginTop: 10 }}>
            <MarkdownRenderer content={lesson.contentMarkdown} />
          </div>
        </details>
      ) : null}
    </div>
  );
}
