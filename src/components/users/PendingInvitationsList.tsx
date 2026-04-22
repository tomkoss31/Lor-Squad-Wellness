// Chantier Invitation distributeur V2 (2026-04-24).
// Liste des invitations distributeur "sponsor" actives (non consommées,
// non expirées) pour le user courant. Bouton Copier lien + Annuler.

import { useCallback, useEffect, useState } from "react";
import { getSupabaseClient } from "../../services/supabaseClient";
import { useToast } from "../../context/ToastContext";

interface Invitation {
  id: string;
  token: string;
  first_name: string | null;
  phone: string | null;
  created_at: string;
  expires_at: string;
}

function relativeAge(iso: string): string {
  try {
    const ms = Date.now() - new Date(iso).getTime();
    const h = Math.floor(ms / (60 * 60 * 1000));
    if (h < 1) return "à l'instant";
    if (h < 24) return `il y a ${h} h`;
    const d = Math.floor(h / 24);
    return `il y a ${d} jour${d > 1 ? "s" : ""}`;
  } catch {
    return iso;
  }
}

function buildInviteUrl(token: string): string {
  if (typeof window === "undefined") return `/bienvenue-distri?token=${token}`;
  return `${window.location.origin}/bienvenue-distri?token=${token}`;
}

interface Props {
  /** Incrémenter pour forcer un reload (ex: après création) */
  refreshKey?: number;
}

export function PendingInvitationsList({ refreshKey = 0 }: Props) {
  const { push: pushToast } = useToast();
  const [list, setList] = useState<Invitation[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const sb = await getSupabaseClient();
      if (!sb) return;
      const nowIso = new Date().toISOString();
      const { data, error } = await sb
        .from("distributor_invitation_tokens")
        .select("id, token, first_name, phone, created_at, expires_at")
        .eq("variant", "sponsor")
        .is("consumed_at", null)
        .gt("expires_at", nowIso)
        .order("created_at", { ascending: false });
      if (error) throw error;
      setList((data ?? []) as Invitation[]);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Erreur inconnue";
      pushToast({ tone: "error", title: "Chargement invitations", message: msg });
    } finally {
      setLoading(false);
    }
  }, [pushToast]);

  useEffect(() => {
    void load();
  }, [load, refreshKey]);

  async function cancelInvite(id: string) {
    try {
      const sb = await getSupabaseClient();
      if (!sb) return;
      const { error } = await sb.from("distributor_invitation_tokens").delete().eq("id", id);
      if (error) throw error;
      pushToast({ tone: "success", title: "Invitation annulée" });
      void load();
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Erreur inconnue";
      pushToast({ tone: "error", title: "Annulation impossible", message: msg });
    }
  }

  async function copyLink(token: string) {
    try {
      await navigator.clipboard.writeText(buildInviteUrl(token));
      pushToast({ tone: "success", title: "Lien copié" });
    } catch {
      pushToast({ tone: "error", title: "Copie impossible" });
    }
  }

  if (loading) {
    return (
      <div style={{ fontSize: 12, color: "var(--ls-text-muted)", padding: "8px 0" }}>
        Chargement invitations...
      </div>
    );
  }

  if (list.length === 0) {
    return null;
  }

  return (
    <div
      style={{
        background: "var(--ls-surface)",
        border: "1px solid var(--ls-border)",
        borderRadius: 14,
        padding: "14px 16px",
        marginTop: 10,
        fontFamily: "DM Sans, sans-serif",
      }}
    >
      <div
        style={{
          fontSize: 11,
          letterSpacing: "0.08em",
          textTransform: "uppercase",
          color: "var(--ls-text-muted)",
          fontWeight: 700,
          marginBottom: 10,
        }}
      >
        Invitations en cours ({list.length})
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {list.map((inv) => (
          <div
            key={inv.id}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              padding: "8px 10px",
              borderRadius: 10,
              background: "var(--ls-surface2)",
              flexWrap: "wrap",
            }}
          >
            <div style={{ minWidth: 0, flex: 1 }}>
              <div style={{ fontSize: 13, color: "var(--ls-text)", fontWeight: 500 }}>
                {inv.first_name ?? "Invité"}
                {inv.phone ? ` · ${inv.phone}` : ""}
              </div>
              <div style={{ fontSize: 11, color: "var(--ls-text-muted)" }}>
                Envoyé {relativeAge(inv.created_at)}
              </div>
            </div>
            <button
              type="button"
              onClick={() => void copyLink(inv.token)}
              style={{
                padding: "6px 10px",
                borderRadius: 8,
                background: "transparent",
                border: "1px solid var(--ls-border)",
                color: "var(--ls-gold)",
                cursor: "pointer",
                fontSize: 11,
                fontWeight: 600,
              }}
            >
              Copier lien
            </button>
            <button
              type="button"
              onClick={() => void cancelInvite(inv.id)}
              style={{
                padding: "6px 10px",
                borderRadius: 8,
                background: "transparent",
                border: "1px solid var(--ls-border)",
                color: "#A32D2D",
                cursor: "pointer",
                fontSize: 11,
                fontWeight: 500,
              }}
            >
              Annuler
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
