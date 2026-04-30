// Chantier RGPD partage public (2026-04-24).
// Bouton coach pour générer/copier un lien /partage/:token anonymisé.
// Passe par l'Edge Function create-public-share-token (vérifie le
// consentement client). Affiche compteur de vues + expiration.
//
// - Si client n'a pas consenti → bouton désactivé avec tooltip explicatif
// - Token expirable (30j par défaut, géré serveur)
// - "Renouveler" crée un nouveau token

import { useCallback, useEffect, useState } from "react";
import { getSupabaseClient } from "../../services/supabaseClient";
import { useToast } from "../../context/ToastContext";
import { extractFunctionError } from "../../lib/utils/extractFunctionError";

interface Props {
  clientId: string;
  clientFirstName: string;
  publicShareConsent: boolean;
  publicShareRevokedAt?: string;
}

interface TokenRow {
  token: string;
  expires_at: string;
  view_count: number;
  revoked_at: string | null;
}

function daysUntil(iso: string): number {
  const diff = new Date(iso).getTime() - Date.now();
  return Math.max(0, Math.ceil(diff / 86_400_000));
}

export function SharePublicButton({
  clientId,
  clientFirstName,
  publicShareConsent,
  publicShareRevokedAt,
}: Props) {
  const { push: pushToast } = useToast();
  const [loading, setLoading] = useState(false);
  const [fetchingExisting, setFetchingExisting] = useState(true);
  const [existing, setExisting] = useState<TokenRow | null>(null);

  const consentActive = publicShareConsent && !publicShareRevokedAt;

  // Charger le dernier token actif (si existe) pour afficher vues + expiration
  const loadExisting = useCallback(async () => {
    try {
      const sb = await getSupabaseClient();
      if (!sb) return;
      const { data } = await sb
        .from("client_public_share_tokens")
        .select("token, expires_at, view_count, revoked_at")
        .eq("client_id", clientId)
        .is("revoked_at", null)
        .gte("expires_at", new Date().toISOString())
        .order("created_at", { ascending: false })
        .limit(1);
      setExisting(((data ?? [])[0] as TokenRow | undefined) ?? null);
    } catch {
      setExisting(null);
    } finally {
      setFetchingExisting(false);
    }
  }, [clientId]);

  useEffect(() => {
    void loadExisting();
  }, [loadExisting]);

  const createOrReuseAndCopy = useCallback(
    async (forceNew = false) => {
      setLoading(true);
      try {
        if (!consentActive) {
          throw new Error("Le client n'a pas encore donné son accord pour le partage public.");
        }
        const sb = await getSupabaseClient();
        if (!sb) throw new Error("Service indisponible.");

        let tokenRow: TokenRow | null = forceNew ? null : existing;

        if (!tokenRow) {
          const { data, error } = await sb.functions.invoke("create-public-share-token", {
            body: { client_id: clientId },
          });
          // Audit 2026-04-30 : extraction body via helper (cas 4xx/5xx).
          const r = (data ?? {}) as {
            success?: boolean;
            token?: string;
            expires_at?: string;
            view_count?: number;
            error?: string;
            reason?: string;
          };
          if (error || !r.success || !r.token || !r.expires_at) {
            if (r.reason === "client_did_not_consent") {
              throw new Error("Consentement client manquant ou révoqué.");
            }
            const msg = await extractFunctionError(data, error, "Création du lien impossible.");
            throw new Error(msg);
          }
          tokenRow = {
            token: r.token,
            expires_at: r.expires_at,
            view_count: r.view_count ?? 0,
            revoked_at: null,
          };
          setExisting(tokenRow);
        }

        const url = `${window.location.origin}/partage/${tokenRow.token}`;
        await navigator.clipboard.writeText(url);
        pushToast({
          tone: "success",
          title: forceNew ? "Nouveau lien copié !" : "Lien copié !",
          message: `Colle-le sur Insta/WhatsApp. Expire dans ${daysUntil(tokenRow.expires_at)} jours.`,
        });
      } catch (e) {
        const msg = e instanceof Error ? e.message : "Erreur inconnue.";
        pushToast({ tone: "error", title: "Action impossible", message: msg });
      } finally {
        setLoading(false);
      }
    },
    [consentActive, existing, clientId, pushToast],
  );

  const disabledReason = !consentActive
    ? `${clientFirstName} n'a pas encore coché son accord de partage public dans son espace client.`
    : null;

  const viewCount = existing?.view_count ?? 0;
  const daysLeft = existing ? daysUntil(existing.expires_at) : null;

  return (
    <div style={{ display: "inline-flex", flexDirection: "column", gap: 4 }}>
      <div style={{ display: "inline-flex", gap: 6, alignItems: "center", flexWrap: "wrap" }}>
        <button
          type="button"
          onClick={() => void createOrReuseAndCopy(false)}
          disabled={loading || fetchingExisting || !consentActive}
          title={
            disabledReason ??
            "Copier un lien public anonymisé pour partager la transformation sur les réseaux"
          }
          className="inline-flex min-h-[40px] items-center gap-2 rounded-[12px] border border-[var(--ls-border2)] bg-[var(--ls-surface2)] px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/[0.08] disabled:cursor-not-allowed disabled:opacity-50"
          style={{ cursor: loading ? "wait" : undefined }}
        >
          {loading ? (
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10" strokeOpacity="0.25" />
              <path d="M22 12a10 10 0 0 1-10 10" />
            </svg>
          ) : (
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" />
              <polyline points="16 6 12 2 8 6" />
              <line x1="12" y1="2" x2="12" y2="15" />
            </svg>
          )}
          {loading ? "Copie..." : consentActive ? "📣 Partage public" : "📣 Partage (accord requis)"}
        </button>
        {existing && consentActive ? (
          <button
            type="button"
            onClick={() => void createOrReuseAndCopy(true)}
            disabled={loading}
            title="Créer un nouveau lien (l'ancien reste actif jusqu'à son expiration)"
            className="inline-flex min-h-[40px] items-center gap-1 rounded-[12px] border border-[var(--ls-border2)] bg-[var(--ls-surface2)] px-3 py-2 text-xs font-semibold text-white/80 transition hover:bg-white/[0.08] disabled:opacity-50"
          >
            🔄
          </button>
        ) : null}
      </div>
      {existing && consentActive ? (
        <div style={{ fontSize: 11, color: "rgba(240,237,232,0.55)", paddingLeft: 2 }}>
          👁 {viewCount} vue{viewCount > 1 ? "s" : ""} · Expire dans {daysLeft} j
        </div>
      ) : !consentActive ? (
        <div style={{ fontSize: 11, color: "rgba(251,191,200,0.7)", paddingLeft: 2 }}>
          En attente de l&apos;accord du client
        </div>
      ) : null}
    </div>
  );
}
