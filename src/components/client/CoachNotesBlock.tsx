// Chantier Polish Vue complète + refonte bilan (2026-04-24).
// Notes coach vivantes (post-bilan) + bilan initial archivé :
// - <details> repliable avec les notes du bilan initial (lecture seule)
// - Timeline de notes typées (suivi / ajustement produits / ressenti / libre)
// - Champ ajout rapide en bas (type + texte + bouton Enregistrer)
//
// Stockage : table client_notes (cf migration 20260423091000).

import { useCallback, useEffect, useState } from "react";
import { getSupabaseClient } from "../../services/supabaseClient";
import { useAppContext } from "../../context/AppContext";
import { useToast } from "../../context/ToastContext";
import { CoachNotesPrintView } from "./CoachNotesPrintView";

type NoteType = "followup" | "product_adjustment" | "feeling" | "free";

interface ClientNote {
  id: string;
  client_id: string;
  author_id: string | null;
  type: NoteType;
  content: string;
  created_at: string;
}

const TYPE_META: Record<NoteType, { label: string; color: string }> = {
  followup: { label: "Suivi", color: "#1D9E75" },
  product_adjustment: { label: "Ajustement produits", color: "#EF9F27" },
  feeling: { label: "Ressenti client", color: "#D4537E" },
  free: { label: "Libre", color: "#888780" },
};

function formatRelative(dateIso: string): string {
  try {
    return new Date(dateIso).toLocaleString("fr-FR", {
      dateStyle: "medium",
      timeStyle: "short",
    });
  } catch {
    return dateIso;
  }
}

interface Props {
  clientId: string;
  clientName: string;
  initialAssessmentNotes: string | null;
  initialAssessmentDate: string | null;
}

export function CoachNotesBlock({
  clientId,
  clientName,
  initialAssessmentNotes,
  initialAssessmentDate,
}: Props) {
  const { currentUser, users } = useAppContext();
  const { push: pushToast } = useToast();
  const [notes, setNotes] = useState<ClientNote[]>([]);
  const [loading, setLoading] = useState(true);
  const [draftType, setDraftType] = useState<NoteType>("followup");
  const [draftContent, setDraftContent] = useState("");
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const sb = await getSupabaseClient();
      if (!sb) {
        setLoading(false);
        return;
      }
      const { data, error } = await sb
        .from("client_notes")
        .select("*")
        .eq("client_id", clientId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      setNotes((data ?? []) as ClientNote[]);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Erreur inconnue";
      pushToast({ tone: "error", title: "Chargement notes", message: msg });
    } finally {
      setLoading(false);
    }
  }, [clientId, pushToast]);

  useEffect(() => {
    void load();
  }, [load]);

  async function addNote() {
    if (!draftContent.trim()) return;
    if (!currentUser) return;
    setSaving(true);
    try {
      const sb = await getSupabaseClient();
      if (!sb) throw new Error("Supabase indisponible");
      const { error } = await sb.from("client_notes").insert({
        client_id: clientId,
        author_id: currentUser.id,
        type: draftType,
        content: draftContent.trim(),
      });
      if (error) throw error;
      setDraftContent("");
      setDraftType("followup");
      await load();
      pushToast({ tone: "success", title: "Note enregistrée" });
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Erreur inconnue";
      pushToast({ tone: "error", title: "Erreur", message: msg });
    } finally {
      setSaving(false);
    }
  }

  function authorName(id: string | null): string {
    if (!id) return "Anonyme";
    const u = users.find((x) => x.id === id);
    return u?.name ?? "Coach";
  }

  const printNotes = notes.map((n) => ({
    type: n.type,
    content: n.content,
    created_at: n.created_at,
    author_name: authorName(n.author_id),
  }));

  return (
    <>
    <CoachNotesPrintView
      clientName={clientName}
      initialAssessmentNotes={initialAssessmentNotes}
      initialAssessmentDate={initialAssessmentDate}
      notes={printNotes}
    />
    <div
      style={{
        background: "var(--ls-surface)",
        border: "1px solid var(--ls-border)",
        borderRadius: 18,
        padding: "18px 20px",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          marginBottom: 14,
          flexWrap: "wrap",
        }}
      >
        <div
          style={{
            width: 28,
            height: 28,
            borderRadius: 8,
            background: "#BA7517",
            color: "#FFFFFF",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontWeight: 700,
            fontFamily: "Syne, sans-serif",
            fontSize: 14,
          }}
        >
          N
        </div>
        <h3
          style={{
            fontFamily: "Syne, sans-serif",
            fontSize: 16,
            fontWeight: 700,
            color: "var(--ls-text)",
            margin: 0,
          }}
        >
          Notes coach
        </h3>
        <span
          style={{
            padding: "2px 8px",
            borderRadius: 999,
            background: "var(--ls-surface2)",
            color: "var(--ls-text-muted)",
            fontSize: 10,
            letterSpacing: "0.08em",
            textTransform: "uppercase",
            fontWeight: 700,
          }}
        >
          Privé
        </span>
        {/* Chantier V2 (2026-04-24) : bouton Exporter → window.print()
            sur la vue imprimable dédiée (CSS @media print). */}
        <button
          type="button"
          onClick={() => {
            if (typeof window !== "undefined") window.print();
          }}
          style={{
            marginLeft: "auto",
            padding: "6px 12px",
            borderRadius: 8,
            border: "1px solid var(--ls-border)",
            background: "transparent",
            color: "var(--ls-gold)",
            cursor: "pointer",
            fontSize: 11,
            fontFamily: "DM Sans, sans-serif",
            fontWeight: 600,
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
          }}
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="6 9 6 2 18 2 18 9"/>
            <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/>
            <rect x="6" y="14" width="12" height="8"/>
          </svg>
          Exporter
        </button>
      </div>

      {/* Bloc archivé : notes du bilan initial (si existe) */}
      {initialAssessmentNotes ? (
        <details
          style={{
            marginBottom: 14,
            padding: "10px 12px",
            border: "1px solid var(--ls-border)",
            borderRadius: 10,
            background: "var(--ls-surface2)",
          }}
        >
          <summary
            style={{
              cursor: "pointer",
              fontSize: 13,
              fontWeight: 600,
              color: "var(--ls-text)",
            }}
          >
            Notes du bilan initial
            {initialAssessmentDate ? ` · ${formatRelative(initialAssessmentDate)}` : ""}
          </summary>
          <div
            style={{
              marginTop: 10,
              padding: 10,
              background: "var(--ls-surface)",
              borderRadius: 8,
              fontSize: 13,
              color: "var(--ls-text)",
              whiteSpace: "pre-wrap",
              lineHeight: 1.5,
            }}
          >
            {initialAssessmentNotes}
          </div>
        </details>
      ) : null}

      {/* Timeline notes vivantes */}
      <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 14 }}>
        {loading ? (
          <div style={{ fontSize: 12, color: "var(--ls-text-muted)" }}>Chargement...</div>
        ) : notes.length === 0 ? (
          <div style={{ fontSize: 12, color: "var(--ls-text-muted)", fontStyle: "italic" }}>
            Aucune note pour le moment.
          </div>
        ) : (
          notes.map((n) => {
            const meta = TYPE_META[n.type];
            return (
              <div
                key={n.id}
                style={{
                  background: "var(--ls-surface2)",
                  borderLeft: `3px solid ${meta.color}`,
                  borderRadius: 8,
                  padding: "10px 12px",
                }}
              >
                <div style={{ fontSize: 12, marginBottom: 4 }}>
                  <span style={{ fontWeight: 700, color: meta.color }}>{meta.label}</span>
                  <span style={{ color: "var(--ls-text-muted)", marginLeft: 8 }}>
                    {formatRelative(n.created_at)} · {authorName(n.author_id)}
                  </span>
                </div>
                <div
                  style={{
                    fontSize: 13,
                    color: "var(--ls-text)",
                    whiteSpace: "pre-wrap",
                    lineHeight: 1.5,
                  }}
                >
                  {n.content}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Ajout rapide */}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 8,
          padding: "12px",
          background: "var(--ls-surface2)",
          borderRadius: 10,
          border: "1px dashed var(--ls-border)",
        }}
      >
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <select
            value={draftType}
            onChange={(e) => setDraftType(e.target.value as NoteType)}
            style={{
              padding: "8px 10px",
              borderRadius: 8,
              border: "1px solid var(--ls-border)",
              background: "var(--ls-surface)",
              color: "var(--ls-text)",
              fontSize: 12,
              fontFamily: "DM Sans, sans-serif",
            }}
          >
            <option value="followup">Suivi</option>
            <option value="product_adjustment">Ajustement produits</option>
            <option value="feeling">Ressenti client</option>
            <option value="free">Libre</option>
          </select>
        </div>
        <textarea
          value={draftContent}
          onChange={(e) => setDraftContent(e.target.value)}
          placeholder="Nouvelle note..."
          rows={3}
          style={{
            padding: "10px",
            borderRadius: 8,
            border: "1px solid var(--ls-border)",
            background: "var(--ls-surface)",
            color: "var(--ls-text)",
            fontSize: 13,
            fontFamily: "DM Sans, sans-serif",
            resize: "vertical",
            minHeight: 60,
          }}
        />
        <div style={{ display: "flex", justifyContent: "flex-end" }}>
          <button
            type="button"
            onClick={() => void addNote()}
            disabled={saving || !draftContent.trim()}
            style={{
              padding: "8px 14px",
              borderRadius: 8,
              background: draftContent.trim() ? "#BA7517" : "var(--ls-border)",
              color: "#FFFFFF",
              border: "none",
              fontSize: 12,
              fontFamily: "DM Sans, sans-serif",
              fontWeight: 600,
              cursor: saving || !draftContent.trim() ? "not-allowed" : "pointer",
            }}
          >
            {saving ? "Enregistrement..." : "Enregistrer"}
          </button>
        </div>
      </div>
    </div>
    </>
  );
}
