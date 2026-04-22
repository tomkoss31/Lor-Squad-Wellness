// Chantier Client access unification (2026-04-24).
// Bouton discret "Aperçu app client" (icône œil) dans le header fiche
// client. Permet au coach d'ouvrir la vue app dans un nouvel onglet.
//
// Sécurité : la route /client/:token est publique mais token-gated
// (un recap_token unique par client est nécessaire pour déchiffrer).
// Sans token valide, ClientAppPage renvoie "Accès invalide". Le token
// existe dans la table client_recaps — créé au 1er clic si absent, puis
// réutilisé.

import { useState } from "react";
import { getSupabaseClient } from "../../services/supabaseClient";
import { useToast } from "../../context/ToastContext";

interface Props {
  clientId: string;
  clientFirstName: string;
  clientLastName: string;
  coachName: string;
  /** Compact mode : juste l'icône (header). Sinon bouton + label. */
  compact?: boolean;
}

export function ClientAppPreviewButton({
  clientId,
  clientFirstName,
  clientLastName,
  coachName,
  compact = true,
}: Props) {
  const { push: pushToast } = useToast();
  const [loading, setLoading] = useState(false);

  async function openPreview() {
    setLoading(true);
    try {
      const sb = await getSupabaseClient();
      if (!sb) throw new Error("Supabase indisponible.");

      // 1. Cherche un recap existant pour ce client (le plus récent)
      const { data: existing } = await sb
        .from("client_recaps")
        .select("token")
        .eq("client_id", clientId)
        .order("created_at", { ascending: false })
        .limit(1);

      let token = (existing?.[0]?.token as string | undefined) ?? null;

      // 2. Si aucun recap n'existe → on en crée un minimal (juste pour
      //    avoir un token d'aperçu). Nécessaire pour la première fois.
      if (!token) {
        const { data: created, error: createErr } = await sb
          .from("client_recaps")
          .insert({
            client_id: clientId,
            coach_name: coachName,
            client_first_name: clientFirstName,
            client_last_name: clientLastName,
            assessment_date: new Date().toISOString(),
          })
          .select("token")
          .single();
        if (createErr) throw createErr;
        token = (created?.token as string | undefined) ?? null;
      }

      if (!token) throw new Error("Impossible de générer le token d'aperçu.");

      // 3. Ouvrir dans un nouvel onglet
      const url = `${window.location.origin}/client/${token}`;
      window.open(url, "_blank", "noopener,noreferrer");
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Erreur inconnue.";
      pushToast({ tone: "error", title: "Aperçu impossible", message: msg });
    } finally {
      setLoading(false);
    }
  }

  if (compact) {
    return (
      <button
        type="button"
        onClick={() => void openPreview()}
        disabled={loading}
        title="Aperçu de l'app telle que le client la voit"
        aria-label="Aperçu app client"
        style={{
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          width: 36,
          height: 36,
          borderRadius: 10,
          background: "transparent",
          border: "1px solid var(--ls-border)",
          color: "var(--ls-text-muted)",
          cursor: loading ? "wait" : "pointer",
          transition: "all 0.15s",
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.background = "var(--ls-surface2)";
          e.currentTarget.style.color = "var(--ls-text)";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = "transparent";
          e.currentTarget.style.color = "var(--ls-text-muted)";
        }}
      >
        {loading ? (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10" strokeOpacity="0.2" />
            <path d="M22 12a10 10 0 0 1-10 10" />
          </svg>
        ) : (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
            <circle cx="12" cy="12" r="3" />
          </svg>
        )}
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={() => void openPreview()}
      disabled={loading}
      style={{
        padding: "8px 14px",
        borderRadius: 10,
        background: "transparent",
        border: "1px solid var(--ls-border)",
        color: "var(--ls-text-muted)",
        cursor: loading ? "wait" : "pointer",
        fontSize: 12,
        fontFamily: "DM Sans, sans-serif",
        fontWeight: 500,
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
      }}
    >
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
        <circle cx="12" cy="12" r="3" />
      </svg>
      {loading ? "Ouverture…" : "Aperçu app client"}
    </button>
  );
}
