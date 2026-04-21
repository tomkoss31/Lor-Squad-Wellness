import { useEffect, useState } from "react";
import type { Client } from "../../types/domain";
import { useAppContext } from "../../context/AppContext";
import { useToast, buildSupabaseErrorToast } from "../../context/ToastContext";
import { Card } from "../ui/Card";

interface Props {
  client: Client;
}

/**
 * Chantier bilan updates (2026-04-20) — bloc "À savoir sur ce client".
 * Affiche la note libre générale du client (loisirs, anecdotes) avec un
 * bouton "Modifier" qui ouvre une modale d'édition simple.
 */
export function ClientGeneralNote({ client }: Props) {
  const { setClientGeneralNote } = useAppContext();
  const { push: pushToast } = useToast();
  const [editOpen, setEditOpen] = useState(false);
  const [draft, setDraft] = useState(client.generalNote ?? "");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!editOpen) setDraft(client.generalNote ?? "");
  }, [client.generalNote, editOpen]);

  const hasNote = Boolean(client.generalNote?.trim());

  async function handleSave() {
    setSaving(true);
    try {
      await setClientGeneralNote(client.id, draft.trim());
      pushToast({ tone: "success", title: "Note enregistrée" });
      setEditOpen(false);
    } catch (err) {
      pushToast(
        buildSupabaseErrorToast(
          err,
          "Impossible d'enregistrer la note. Vérifie la migration SQL general_note."
        )
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <Card className="space-y-3">
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span aria-hidden="true" style={{ fontSize: 18 }}>📝</span>
            <p className="eyebrow-label" style={{ margin: 0 }}>À savoir sur ce client</p>
          </div>
          <button
            type="button"
            onClick={() => setEditOpen(true)}
            style={{
              padding: "6px 12px",
              borderRadius: 9,
              border: "1px solid var(--ls-border)",
              background: "transparent",
              color: "var(--ls-text-muted)",
              fontSize: 11,
              fontWeight: 600,
              cursor: "pointer",
              fontFamily: "'DM Sans', sans-serif",
            }}
          >
            {hasNote ? "Modifier" : "Ajouter"}
          </button>
        </div>
        <div
          style={{
            fontSize: 13,
            lineHeight: 1.6,
            color: hasNote ? "var(--ls-text)" : "var(--ls-text-hint)",
            fontStyle: hasNote ? "normal" : "italic",
            whiteSpace: "pre-wrap",
            margin: 0,
          }}
        >
          {hasNote
            ? client.generalNote
            : "Aucune note personnelle enregistrée pour l'instant. Ajoute ici loisirs, préférences, anecdotes — tout ce qui aide à créer du lien."}
        </div>
      </Card>

      {editOpen && (
        <div
          role="button"
          tabIndex={0}
          aria-label="Fermer la fenêtre"
          onClick={() => !saving && setEditOpen(false)}
          onKeyDown={(e) => { if (e.key === 'Escape') { if (!saving) setEditOpen(false); } }}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.55)",
            zIndex: 10000,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 16,
            fontFamily: "'DM Sans', sans-serif",
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            onKeyDown={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-label="Modifier la note client"
            style={{
              background: "var(--ls-surface)",
              borderRadius: 14,
              width: "100%",
              maxWidth: 480,
              padding: 22,
              border: "1px solid var(--ls-border)",
              boxShadow: "0 20px 60px rgba(0,0,0,0.35)",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, marginBottom: 12 }}>
              <h2 style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: 18, color: "var(--ls-text)", margin: 0 }}>
                📝 À savoir sur {client.firstName}
              </h2>
              <button
                type="button"
                onClick={() => !saving && setEditOpen(false)}
                aria-label="Fermer"
                style={{ background: "transparent", border: "none", color: "var(--ls-text-muted)", fontSize: 22, cursor: saving ? "wait" : "pointer", padding: 4, lineHeight: 1 }}
              >
                ×
              </button>
            </div>
            <p style={{ fontSize: 12, color: "var(--ls-text-muted)", margin: "0 0 12px", lineHeight: 1.5 }}>
              Loisirs, préférences, anecdotes — tout ce qui aide à personnaliser la relation.
            </p>
            <textarea
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              rows={8}
              placeholder="Ex : Aime le cheval · Va à la piscine le mardi · Adore les barres Mars…"
              className="ls-input"
              style={{ resize: "vertical", width: "100%", minHeight: 140 }}
              disabled={saving}
              autoFocus
            />
            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 14 }}>
              <button
                type="button"
                onClick={() => !saving && setEditOpen(false)}
                disabled={saving}
                style={{
                  padding: "10px 18px",
                  borderRadius: 10,
                  border: "1px solid var(--ls-border)",
                  background: "transparent",
                  color: "var(--ls-text-muted)",
                  fontSize: 13,
                  cursor: saving ? "wait" : "pointer",
                  fontFamily: "'DM Sans', sans-serif",
                }}
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={() => void handleSave()}
                disabled={saving}
                style={{
                  padding: "10px 18px",
                  borderRadius: 10,
                  border: "none",
                  background: "var(--ls-gold)",
                  color: "var(--ls-gold-contrast, #0B0D11)",
                  fontSize: 13,
                  fontWeight: 700,
                  fontFamily: "'Syne', sans-serif",
                  cursor: saving ? "wait" : "pointer",
                }}
              >
                {saving ? "Enregistrement…" : "Enregistrer"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
