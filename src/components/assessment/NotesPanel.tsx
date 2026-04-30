// Chantier Polish Vue complète + refonte bilan (2026-04-24).
// Panneau notes coach affiché à la place de la sidebar sur NewAssessmentPage,
// visible uniquement sur les étapes 1-5 et 13 (indices 0-4 et 12).
//
// - Bouton "← Retour Co-pilote" en haut (gold ghost).
// - Textarea libre avec auto-save 3s.
// - Quick-tags pré-remplis : clic ajoute le label à la note.
// - Sur mobile, devient un drawer bottom déclenché par un bouton flottant.

import { useCallback, useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { getSupabaseClient } from "../../services/supabaseClient";
import { useAppContext } from "../../context/AppContext";

const QUICK_TAGS = [
  "Motivée",
  "Très motivée",
  "Moyennement motivée",
  "Grignotage soir",
  "Pas de sport",
  "Déjà eu des régimes",
  "Objectif clair",
  "Objectif flou",
  "Sceptique",
  "Prête à s'engager",
];

type LiveNoteType = "followup" | "product_adjustment" | "feeling" | "free";
interface ClientNote {
  id: string;
  type: LiveNoteType;
  content: string;
  created_at: string;
}
const TYPE_LABEL: Record<LiveNoteType, string> = {
  followup: "Suivi",
  product_adjustment: "Ajust. produits",
  feeling: "Ressenti",
  free: "Libre",
};
const TYPE_COLOR: Record<LiveNoteType, string> = {
  followup: "#1D9E75",
  product_adjustment: "#EF9F27",
  feeling: "#D4537E",
  free: "#888780",
};

interface Props {
  clientFirstName: string;
  value: string;
  onChange: (v: string) => void;
  /** Sauvegarde persistante (DB) appelée avec debounce 3s */
  onAutoSave?: (v: string) => void | Promise<void>;
  /** Desktop : affiche la sidebar classique. Mobile : drawer */
  mobile?: boolean;
  onClose?: () => void;
  /** V2 : si fourni, charge les notes existantes du client + permet ajout standalone */
  clientId?: string | null;
}

export function NotesPanel({
  clientFirstName,
  value,
  onChange,
  onAutoSave,
  mobile = false,
  onClose,
  clientId,
}: Props) {
  const { currentUser } = useAppContext();
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const firstRunRef = useRef(true);

  // V2 (2026-04-24) : timeline des notes existantes + ajout standalone
  const [existingNotes, setExistingNotes] = useState<ClientNote[]>([]);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [showStandaloneForm, setShowStandaloneForm] = useState(false);
  const [standaloneType, setStandaloneType] = useState<LiveNoteType>("followup");
  const [standaloneContent, setStandaloneContent] = useState("");
  const [standaloneSaving, setStandaloneSaving] = useState(false);

  const loadNotes = useCallback(async () => {
    if (!clientId) return;
    try {
      const sb = await getSupabaseClient();
      if (!sb) return;
      const { data } = await sb
        .from("client_notes")
        .select("id,type,content,created_at")
        .eq("client_id", clientId)
        .order("created_at", { ascending: false });
      setExistingNotes((data ?? []) as ClientNote[]);
    } catch {
      // silent — panel reste fonctionnel sans timeline
    }
  }, [clientId]);

  useEffect(() => {
    void loadNotes();
  }, [loadNotes]);

  async function saveStandalone() {
    if (!clientId || !currentUser || !standaloneContent.trim()) return;
    setStandaloneSaving(true);
    try {
      const sb = await getSupabaseClient();
      if (!sb) return;
      await sb.from("client_notes").insert({
        client_id: clientId,
        author_id: currentUser.id,
        type: standaloneType,
        content: standaloneContent.trim(),
      });
      setStandaloneContent("");
      setStandaloneType("followup");
      setShowStandaloneForm(false);
      await loadNotes();
    } finally {
      setStandaloneSaving(false);
    }
  }

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
        Notes · {clientFirstName || "Client"}
      </div>

      {/* V2 Section 1 — Timeline notes existantes (lecture seule) */}
      {clientId ? (
        <div style={{ marginBottom: 14 }}>
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
            Notes existantes
          </div>
          {existingNotes.length === 0 ? (
            <div
              style={{
                fontSize: 11,
                color: "var(--ls-text-muted)",
                fontStyle: "italic",
                padding: "6px 0",
              }}
            >
              Aucune note existante
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 5, maxHeight: 180, overflowY: "auto" }}>
              {existingNotes.map((n) => {
                const expanded = expandedId === n.id;
                const dateStr = new Date(n.created_at).toLocaleDateString("fr-FR", {
                  day: "2-digit",
                  month: "short",
                });
                return (
                  <button
                    key={n.id}
                    type="button"
                    onClick={() => setExpandedId(expanded ? null : n.id)}
                    style={{
                      textAlign: "left",
                      background: "var(--ls-surface2)",
                      borderLeft: `3px solid ${TYPE_COLOR[n.type]}`,
                      borderRadius: 6,
                      padding: "6px 8px",
                      border: "none",
                      cursor: "pointer",
                      color: "var(--ls-text)",
                    }}
                  >
                    <div style={{ fontSize: 10, fontWeight: 700, color: TYPE_COLOR[n.type] }}>
                      {TYPE_LABEL[n.type]} · {dateStr}
                    </div>
                    <div
                      style={{
                        fontSize: 11,
                        marginTop: 3,
                        lineHeight: 1.4,
                        whiteSpace: "pre-wrap",
                        display: expanded ? "block" : "-webkit-box",
                        WebkitLineClamp: expanded ? "unset" : 2,
                        WebkitBoxOrient: "vertical" as const,
                        overflow: "hidden",
                      }}
                    >
                      {n.content}
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      ) : null}

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
        Nouvelle note — ce bilan
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

      {/* V2 Section 3 — Ajouter une note vivante standalone */}
      {clientId ? (
        <div style={{ marginTop: 14, paddingTop: 12, borderTop: "1px dashed var(--ls-border)" }}>
          {!showStandaloneForm ? (
            <button
              type="button"
              onClick={() => setShowStandaloneForm(true)}
              style={{
                width: "100%",
                padding: "8px 10px",
                borderRadius: 8,
                border: "1px solid var(--ls-border)",
                background: "transparent",
                color: "var(--ls-text-muted)",
                fontSize: 11,
                fontFamily: "DM Sans, sans-serif",
                cursor: "pointer",
                lineHeight: 1.4,
              }}
            >
              + Note vivante (hors bilan)
            </button>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <select
                value={standaloneType}
                onChange={(e) => setStandaloneType(e.target.value as LiveNoteType)}
                style={{
                  padding: "6px 8px",
                  borderRadius: 6,
                  border: "1px solid var(--ls-border)",
                  background: "var(--ls-surface)",
                  color: "var(--ls-text)",
                  fontSize: 11,
                }}
              >
                <option value="followup">Suivi</option>
                <option value="product_adjustment">Ajust. produits</option>
                <option value="feeling">Ressenti</option>
                <option value="free">Libre</option>
              </select>
              <textarea
                value={standaloneContent}
                onChange={(e) => setStandaloneContent(e.target.value)}
                placeholder="Note vivante..."
                rows={2}
                style={{
                  padding: 6,
                  borderRadius: 6,
                  border: "1px solid var(--ls-border)",
                  background: "var(--ls-surface)",
                  color: "var(--ls-text)",
                  fontSize: 11,
                  resize: "vertical",
                  fontFamily: "DM Sans, sans-serif",
                }}
              />
              <div style={{ display: "flex", gap: 6, justifyContent: "flex-end" }}>
                <button
                  type="button"
                  onClick={() => {
                    setShowStandaloneForm(false);
                    setStandaloneContent("");
                  }}
                  style={{
                    padding: "5px 10px",
                    borderRadius: 6,
                    border: "1px solid var(--ls-border)",
                    background: "transparent",
                    color: "var(--ls-text-muted)",
                    fontSize: 10,
                    cursor: "pointer",
                  }}
                >
                  Annuler
                </button>
                <button
                  type="button"
                  onClick={() => void saveStandalone()}
                  disabled={standaloneSaving || !standaloneContent.trim()}
                  style={{
                    padding: "5px 10px",
                    borderRadius: 6,
                    background: standaloneContent.trim() ? "#BA7517" : "var(--ls-border)",
                    color: "#FFFFFF",
                    border: "none",
                    fontSize: 10,
                    fontWeight: 600,
                    cursor: standaloneSaving || !standaloneContent.trim() ? "not-allowed" : "pointer",
                  }}
                >
                  {standaloneSaving ? "..." : "Enregistrer"}
                </button>
              </div>
            </div>
          )}
        </div>
      ) : null}

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
        {/* eslint-disable-next-line jsx-a11y/no-static-element-interactions -- Wrapper for stopPropagation, dialog role inside */}
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
