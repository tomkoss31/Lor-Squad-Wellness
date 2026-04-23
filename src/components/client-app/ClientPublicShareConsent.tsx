// Chantier RGPD partage public (2026-04-24).
// Composant espace client : gestion du consentement partage public.
// - Si pas consenti : CTA "Autoriser le partage" → modale avec texte clair +
//   checkbox obligatoire avant confirmation.
// - Si consenti : bloc vert "Accord donné le XX" + bouton "Retirer mon accord"
//   → révoque + supprime tous les tokens actifs du client.

import { useCallback, useEffect, useState } from "react";
import { getSupabaseClient } from "../../services/supabaseClient";

interface Props {
  clientId: string;
  clientFirstName: string;
}

interface ConsentState {
  consent: boolean;
  consent_at: string | null;
  revoked_at: string | null;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export function ClientPublicShareConsent({ clientId, clientFirstName }: Props) {
  const [state, setState] = useState<ConsentState | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [agreed, setAgreed] = useState(false);
  const [err, setErr] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const sb = await getSupabaseClient();
      if (!sb) return;
      const { data } = await sb
        .from("clients")
        .select("public_share_consent, public_share_consent_at, public_share_revoked_at")
        .eq("id", clientId)
        .maybeSingle();
      if (data) {
        const r = data as {
          public_share_consent: boolean | null;
          public_share_consent_at: string | null;
          public_share_revoked_at: string | null;
        };
        setState({
          consent: !!r.public_share_consent,
          consent_at: r.public_share_consent_at,
          revoked_at: r.public_share_revoked_at,
        });
      }
    } finally {
      setLoading(false);
    }
  }, [clientId]);

  useEffect(() => {
    void load();
  }, [load]);

  const giveConsent = useCallback(async () => {
    setErr("");
    setBusy(true);
    try {
      const sb = await getSupabaseClient();
      if (!sb) throw new Error("Service indisponible.");
      const now = new Date().toISOString();
      const { error } = await sb
        .from("clients")
        .update({
          public_share_consent: true,
          public_share_consent_at: now,
          public_share_revoked_at: null,
        })
        .eq("id", clientId);
      if (error) throw error;
      setModalOpen(false);
      setAgreed(false);
      await load();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Erreur.");
    } finally {
      setBusy(false);
    }
  }, [clientId, load]);

  const revokeConsent = useCallback(async () => {
    setErr("");
    setBusy(true);
    try {
      const sb = await getSupabaseClient();
      if (!sb) throw new Error("Service indisponible.");
      const now = new Date().toISOString();
      // Révoquer le consentement
      const { error: upErr } = await sb
        .from("clients")
        .update({ public_share_revoked_at: now })
        .eq("id", clientId);
      if (upErr) throw upErr;
      // Révoquer tous les tokens actifs (cascade)
      await sb
        .from("client_public_share_tokens")
        .update({ revoked_at: now })
        .eq("client_id", clientId)
        .is("revoked_at", null);
      await load();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Erreur.");
    } finally {
      setBusy(false);
    }
  }, [clientId, load]);

  if (loading) return null;
  const active = state?.consent && !state?.revoked_at;

  return (
    <>
      <div
        style={{
          padding: 16,
          borderRadius: 14,
          border: `1px solid ${active ? "rgba(29,158,117,0.3)" : "rgba(255,255,255,0.08)"}`,
          background: active ? "rgba(29,158,117,0.08)" : "rgba(255,255,255,0.03)",
          marginTop: 16,
        }}
      >
        <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
          <div style={{ fontSize: 20 }}>{active ? "🟢" : "🔒"}</div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: "#F0EDE8", marginBottom: 4 }}>
              Partage public de ta transformation
            </div>
            {active && state?.consent_at ? (
              <>
                <div style={{ fontSize: 12, color: "rgba(240,237,232,0.7)", lineHeight: 1.55 }}>
                  Tu as autorisé le partage anonyme de tes progrès le{" "}
                  <strong>{formatDate(state.consent_at)}</strong>. Ton coach peut créer des liens
                  partageables (durée 30j, ton prénom + chiffres, pas de nom ni contact).
                </div>
                <button
                  type="button"
                  onClick={() => void revokeConsent()}
                  disabled={busy}
                  style={{
                    marginTop: 10,
                    padding: "6px 12px",
                    borderRadius: 8,
                    border: "1px solid rgba(251,191,200,0.3)",
                    background: "transparent",
                    color: "#FBBFC8",
                    fontSize: 12,
                    fontWeight: 600,
                    cursor: busy ? "wait" : "pointer",
                  }}
                >
                  {busy ? "…" : "Retirer mon accord"}
                </button>
              </>
            ) : (
              <>
                <div style={{ fontSize: 12, color: "rgba(240,237,232,0.7)", lineHeight: 1.55 }}>
                  {state?.revoked_at
                    ? "Tu as retiré ton accord. Tu peux le redonner à tout moment."
                    : "Autorise ton coach à partager un résumé anonyme de tes progrès sur les réseaux pour motiver d'autres personnes."}
                </div>
                <button
                  type="button"
                  onClick={() => setModalOpen(true)}
                  style={{
                    marginTop: 10,
                    padding: "8px 14px",
                    borderRadius: 8,
                    border: "none",
                    background: "linear-gradient(135deg, #EF9F27 0%, #BA7517 100%)",
                    color: "#fff",
                    fontSize: 12,
                    fontWeight: 700,
                    cursor: "pointer",
                  }}
                >
                  Autoriser le partage
                </button>
              </>
            )}
            {err ? (
              <div style={{ marginTop: 8, fontSize: 11, color: "#FBBFC8" }}>{err}</div>
            ) : null}
          </div>
        </div>
      </div>

      {modalOpen ? (
        <div
          role="dialog"
          aria-modal="true"
          onClick={() => !busy && setModalOpen(false)}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.75)",
            zIndex: 1000,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 16,
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              maxWidth: 460,
              width: "100%",
              background: "#1a1d20",
              borderRadius: 18,
              padding: 22,
              border: "1px solid rgba(255,255,255,0.1)",
              color: "#F0EDE8",
            }}
          >
            <div style={{ fontSize: 18, fontWeight: 800, marginBottom: 8, fontFamily: "Syne, sans-serif" }}>
              Autoriser le partage public ?
            </div>
            <div
              style={{ fontSize: 13, color: "rgba(240,237,232,0.75)", lineHeight: 1.6, marginBottom: 14 }}
            >
              En cochant ci-dessous, tu autorises ton coach à générer des liens
              <strong> /partage/:token</strong> qui affichent publiquement :
              <ul style={{ marginTop: 8, paddingLeft: 20 }}>
                <li>Ton <strong>prénom</strong> ({clientFirstName}) — pas ton nom</li>
                <li>Tes <strong>chiffres de progression</strong> (poids, masse grasse, muscle)</li>
                <li>Le <strong>prénom</strong> de ton coach</li>
              </ul>
              <div style={{ marginTop: 10 }}>
                Ne seront <strong>jamais</strong> partagés : ton nom, ton âge, ton adresse,
                ton email, ton téléphone. Chaque lien expire automatiquement après
                <strong> 30 jours</strong>. Tu peux retirer ton accord à tout moment — tous
                les liens actifs seront invalidés immédiatement.
              </div>
            </div>

            <label
              style={{
                display: "flex",
                gap: 10,
                alignItems: "flex-start",
                padding: 12,
                borderRadius: 10,
                background: "rgba(255,255,255,0.04)",
                border: "1px solid rgba(255,255,255,0.1)",
                cursor: "pointer",
                fontSize: 13,
                lineHeight: 1.5,
                marginBottom: 14,
              }}
            >
              <input
                type="checkbox"
                checked={agreed}
                onChange={(e) => setAgreed(e.target.checked)}
                style={{ marginTop: 2, accentColor: "#EF9F27" }}
              />
              <span>
                J&apos;accepte que mes chiffres de progression soient partagés publiquement
                sous pseudonyme (prénom uniquement), et je comprends que je peux retirer
                mon accord à tout moment.
              </span>
            </label>

            <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                disabled={busy}
                style={{
                  padding: "10px 18px",
                  borderRadius: 10,
                  border: "1px solid rgba(255,255,255,0.15)",
                  background: "transparent",
                  color: "#F0EDE8",
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: busy ? "wait" : "pointer",
                }}
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={() => void giveConsent()}
                disabled={!agreed || busy}
                style={{
                  padding: "10px 18px",
                  borderRadius: 10,
                  border: "none",
                  background:
                    !agreed || busy
                      ? "rgba(255,255,255,0.1)"
                      : "linear-gradient(135deg, #EF9F27 0%, #BA7517 100%)",
                  color: !agreed || busy ? "rgba(255,255,255,0.4)" : "#fff",
                  fontSize: 13,
                  fontWeight: 700,
                  cursor: !agreed || busy ? "not-allowed" : "pointer",
                }}
              >
                {busy ? "…" : "Autoriser"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
