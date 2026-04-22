// Chantier Polish Vue complète + refonte bilan (2026-04-24).
// Panneau notes coach affiché à la place de la sidebar sur NewAssessmentPage,
// visible uniquement sur les étapes 1-5 et 13 (indices 0-4 et 12).
//
// - Bouton "← Retour Co-pilote" en haut (gold ghost).
// - Textarea libre avec auto-save 3s.
// - Quick-tags pré-remplis : clic ajoute le label à la note.
// - Sur mobile, devient un drawer bottom déclenché par un bouton flottant.

import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";

const QUICK_TAGS = [
  "Motivée",
  "Motivé",
  "Grignotage soir",
  "Pas de sport",
  "Objectif clair",
  "À relancer",
  "Besoin d'un boost",
  "Stress élevé",
];

interface Props {
  clientFirstName: string;
  value: string;
  onChange: (v: string) => void;
  /** Sauvegarde persistante (DB) appelée avec debounce 3s */
  onAutoSave?: (v: string) => void | Promise<void>;
  /** Desktop : affiche la sidebar classique. Mobile : drawer */
  mobile?: boolean;
  onClose?: () => void;
}

export function NotesPanel({
  clientFirstName,
  value,
  onChange,
  onAutoSave,
  mobile = false,
  onClose,
}: Props) {
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const firstRunRef = useRef(true);

  useEffect(() => {
    if (firstRunRef.current) {
      firstRunRef.current = false;
      return;
    }
    if (!onAutoSave) return;
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      void Promise.resolve(onAutoSave(value)).then(() => setLastSavedAt(new Date()));
    }, 3000);
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [value, onAutoSave]);

  function appendTag(tag: string) {
    const sep = value && !value.endsWith("\n") ? "\n" : "";
    onChange(`${value}${sep}- ${tag}`);
  }

  const body = (
    <>
      {!mobile ? (
        <Link
          to="/co-pilote"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            padding: "7px 12px",
            borderRadius: 10,
            background: "transparent",
            border: "1px solid #EF9F27",
            color: "#BA7517",
            fontSize: 12,
            fontFamily: "DM Sans, sans-serif",
            fontWeight: 600,
            textDecoration: "none",
            marginBottom: 12,
            alignSelf: "flex-start",
          }}
        >
          ← Retour Co-pilote
        </Link>
      ) : null}

      <div
        style={{
          fontFamily: "Syne, sans-serif",
          fontSize: 14,
          fontWeight: 700,
          color: "var(--ls-text)",
          marginBottom: 6,
        }}
      >
        Mes notes · {clientFirstName || "Client"}
      </div>
      <div style={{ fontSize: 11, color: "var(--ls-text-muted)", marginBottom: 10 }}>
        Auto-save toutes les 3 sec.
        {lastSavedAt ? ` Dernière sauvegarde ${lastSavedAt.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}.` : ""}
      </div>

      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Impressions, points d'attention, phrases clés du client..."
        rows={mobile ? 8 : 16}
        style={{
          width: "100%",
          padding: 10,
          borderRadius: 10,
          border: "1px solid var(--ls-border)",
          background: "var(--ls-surface)",
          color: "var(--ls-text)",
          fontSize: 13,
          fontFamily: "DM Sans, sans-serif",
          resize: "vertical",
          minHeight: 140,
          lineHeight: 1.5,
        }}
      />

      <div style={{ marginTop: 12 }}>
        <div
          style={{
            fontSize: 10,
            letterSpacing: "0.08em",
            textTransform: "uppercase",
            color: "var(--ls-text-muted)",
            fontWeight: 700,
            marginBottom: 6,
          }}
        >
          Notes rapides
        </div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
          {QUICK_TAGS.map((tag) => (
            <button
              key={tag}
              type="button"
              onClick={() => appendTag(tag)}
              style={{
                padding: "5px 10px",
                borderRadius: 999,
                border: "1px solid var(--ls-border)",
                background: "var(--ls-surface)",
                color: "var(--ls-text-muted)",
                fontSize: 11,
                fontFamily: "DM Sans, sans-serif",
                cursor: "pointer",
              }}
            >
              + {tag}
            </button>
          ))}
        </div>
      </div>

      {mobile && onClose ? (
        <button
          type="button"
          onClick={onClose}
          style={{
            marginTop: 14,
            width: "100%",
            padding: "10px 14px",
            borderRadius: 10,
            background: "#BA7517",
            border: "none",
            color: "#FFFFFF",
            cursor: "pointer",
            fontSize: 13,
            fontFamily: "DM Sans, sans-serif",
            fontWeight: 600,
          }}
        >
          Fermer
        </button>
      ) : null}
    </>
  );

  if (mobile) {
    return (
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Notes coach"
        style={{
          position: "fixed",
          inset: 0,
          background: "rgba(0,0,0,0.5)",
          zIndex: 5000,
          display: "flex",
          alignItems: "flex-end",
          justifyContent: "center",
        }}
        onClick={onClose}
        onKeyDown={(e) => {
          if (e.key === "Escape" && onClose) onClose();
        }}
      >
        <div
          onClick={(e) => e.stopPropagation()}
          onKeyDown={(e) => e.stopPropagation()}
          style={{
            background: "var(--ls-surface)",
            borderTopLeftRadius: 20,
            borderTopRightRadius: 20,
            padding: 18,
            width: "100%",
            maxWidth: 520,
            maxHeight: "90vh",
            overflowY: "auto",
            display: "flex",
            flexDirection: "column",
            boxShadow: "0 -10px 40px rgba(0,0,0,0.4)",
          }}
        >
          {body}
        </div>
      </div>
    );
  }

  return (
    <aside
      style={{
        width: 260,
        flexShrink: 0,
        padding: "16px 14px",
        background: "var(--ls-surface)",
        border: "1px solid var(--ls-border)",
        borderRadius: 16,
        display: "flex",
        flexDirection: "column",
        alignSelf: "flex-start",
        position: "sticky",
        top: 16,
        maxHeight: "calc(100vh - 32px)",
        overflowY: "auto",
      }}
    >
      {body}
    </aside>
  );
}
