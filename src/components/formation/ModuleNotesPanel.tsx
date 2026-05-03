// =============================================================================
// ModuleNotesPanel — quick win #3 (2026-11-04)
//
// Textarea de notes personnelles persistee par user + module.
// Stockage localStorage : cle `ls-formation-notes-{userId}-{moduleId}`.
//
// V1 : localStorage uniquement. V2 si besoin cross-device : migration
// vers une table `formation_user_notes` (user_id, module_id, content,
// updated_at). Le composant garde la meme API.
//
// UX :
//   - Textarea auto-resize qui grandit avec le contenu
//   - Auto-save debounce 600ms
//   - Indicateur subtle "Sauvegardé · il y a X" (date relative)
//   - Compteur caracteres a droite
//
// Theme-aware via var(--ls-*).
// =============================================================================

import { useEffect, useRef, useState } from "react";
import { useAppContext } from "../../context/AppContext";
import { formatModuleShort } from "../../data/formation";

const STORAGE_PREFIX = "ls-formation-notes-";
const SAVE_DEBOUNCE_MS = 600;
const MAX_CHARS = 5000;

interface ModuleNotesPanelProps {
  moduleId: string;
  /** Pour personnaliser le placeholder. */
  moduleNumber?: string;
}

interface StoredNote {
  content: string;
  updatedAtIso: string;
}

function readStored(key: string): StoredNote | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<StoredNote>;
    if (typeof parsed.content !== "string") return null;
    return {
      content: parsed.content,
      updatedAtIso: parsed.updatedAtIso ?? new Date().toISOString(),
    };
  } catch {
    return null;
  }
}

function writeStored(key: string, value: StoredNote): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // quota → silent
  }
}

function formatRelative(iso: string | null): string {
  if (!iso) return "";
  const then = new Date(iso).getTime();
  const now = Date.now();
  const diffSec = Math.max(0, Math.round((now - then) / 1000));
  if (diffSec < 5) return "à l'instant";
  if (diffSec < 60) return `il y a ${diffSec}s`;
  const diffMin = Math.round(diffSec / 60);
  if (diffMin < 60) return `il y a ${diffMin} min`;
  const diffH = Math.round(diffMin / 60);
  if (diffH < 24) return `il y a ${diffH} h`;
  const diffD = Math.round(diffH / 24);
  if (diffD < 7) return `il y a ${diffD} j`;
  return new Date(iso).toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "short",
  });
}

export function ModuleNotesPanel({ moduleId, moduleNumber }: ModuleNotesPanelProps) {
  const { currentUser } = useAppContext();
  const userId = currentUser?.id ?? null;
  const storageKey = userId ? `${STORAGE_PREFIX}${userId}-${moduleId}` : null;

  const [content, setContent] = useState<string>("");
  const [lastSavedAt, setLastSavedAt] = useState<string | null>(null);
  const [isDirty, setIsDirty] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const saveTimerRef = useRef<number | null>(null);

  // Load au mount + change de module
  useEffect(() => {
    if (!storageKey) return;
    const stored = readStored(storageKey);
    if (stored) {
      setContent(stored.content);
      setLastSavedAt(stored.updatedAtIso);
    } else {
      setContent("");
      setLastSavedAt(null);
    }
    setIsDirty(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storageKey]);

  // Auto-resize textarea
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.max(120, el.scrollHeight + 4)}px`;
  }, [content]);

  // Auto-save debounce
  useEffect(() => {
    if (!isDirty || !storageKey) return;
    if (saveTimerRef.current) {
      window.clearTimeout(saveTimerRef.current);
    }
    setIsSaving(true);
    saveTimerRef.current = window.setTimeout(() => {
      const nowIso = new Date().toISOString();
      writeStored(storageKey, { content, updatedAtIso: nowIso });
      setLastSavedAt(nowIso);
      setIsDirty(false);
      setIsSaving(false);
    }, SAVE_DEBOUNCE_MS);
    return () => {
      if (saveTimerRef.current) window.clearTimeout(saveTimerRef.current);
    };
  }, [content, isDirty, storageKey]);

  // Update relative time every 30s pour rafraichir "il y a X min"
  const [, force] = useState(0);
  useEffect(() => {
    const id = window.setInterval(() => force((n) => n + 1), 30_000);
    return () => window.clearInterval(id);
  }, []);

  if (!userId) return null;

  const charsLeft = MAX_CHARS - content.length;
  const overLimit = charsLeft < 0;

  return (
    <section
      style={{
        position: "relative",
        padding: "20px 22px 18px",
        borderRadius: 18,
        background: "var(--ls-surface)",
        border: "0.5px solid color-mix(in srgb, var(--ls-purple) 18%, var(--ls-border))",
        boxShadow: "0 4px 16px -10px color-mix(in srgb, var(--ls-purple) 25%, transparent)",
      }}
    >
      {/* Header eyebrow + meta save */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 12,
          marginBottom: 10,
          flexWrap: "wrap",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: 16 }} aria-hidden="true">
            📝
          </span>
          <span
            style={{
              fontFamily: "DM Sans, sans-serif",
              fontSize: 11,
              fontWeight: 700,
              letterSpacing: "0.18em",
              textTransform: "uppercase",
              color: "var(--ls-purple)",
            }}
          >
            ✦ Mes notes · {moduleNumber ? formatModuleShort(moduleNumber) : "ce module"}
          </span>
        </div>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            fontFamily: "DM Sans, sans-serif",
            fontSize: 11,
            color: "var(--ls-text-muted)",
          }}
        >
          {isSaving ? (
            <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
              <span style={{ opacity: 0.6 }}>•</span> Sauvegarde…
            </span>
          ) : lastSavedAt ? (
            <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
              <span style={{ color: "var(--ls-teal)" }}>✓</span>
              Sauvegardé {formatRelative(lastSavedAt)}
            </span>
          ) : null}
        </div>
      </div>

      {/* Titre + helper */}
      <h3
        style={{
          fontFamily: "Syne, serif",
          fontWeight: 700,
          fontSize: 16,
          letterSpacing: "-0.012em",
          color: "var(--ls-text)",
          margin: "0 0 4px",
        }}
      >
        Tes annotations sur ce module
      </h3>
      <p
        style={{
          fontFamily: "DM Sans, sans-serif",
          fontSize: 12.5,
          color: "var(--ls-text-muted)",
          margin: "0 0 12px",
          lineHeight: 1.5,
        }}
      >
        Ce que tu retiens, les questions à creuser, des phrases à reprendre. Visible uniquement par toi.
      </p>

      <textarea
        ref={textareaRef}
        value={content}
        onChange={(e) => {
          setContent(e.target.value);
          setIsDirty(true);
        }}
        placeholder="Ex : « Idée à tester avec Marie » · « Revoir l'objection prix » · « Citation : si c'est facile à faire, c'est facile à ne pas faire »"
        maxLength={MAX_CHARS + 100} // permet d aller un peu au-dela puis afficher l alerte
        style={{
          width: "100%",
          minHeight: 120,
          padding: "12px 14px",
          borderRadius: 12,
          background: "var(--ls-input-bg, var(--ls-surface2))",
          border: overLimit
            ? "1.5px solid var(--ls-coral)"
            : "1.5px solid var(--ls-border)",
          color: "var(--ls-text)",
          fontFamily: "DM Sans, sans-serif",
          fontSize: 13.5,
          lineHeight: 1.55,
          resize: "none",
          outline: "none",
          transition: "border-color 180ms ease",
        }}
      />

      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginTop: 8,
          fontFamily: "DM Sans, sans-serif",
          fontSize: 11,
          color: overLimit ? "var(--ls-coral)" : "var(--ls-text-hint)",
          gap: 12,
          flexWrap: "wrap",
        }}
      >
        <span>
          🔒 Stocké localement sur ton appareil
        </span>
        <span style={{ fontWeight: overLimit ? 700 : 500 }}>
          {content.length} / {MAX_CHARS} caractères
          {overLimit ? " · trop long" : ""}
        </span>
      </div>
    </section>
  );
}
