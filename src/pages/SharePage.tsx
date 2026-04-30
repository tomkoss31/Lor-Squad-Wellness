// Chantier RGPD partage public (2026-04-24).
// Route publique /partage/:token — affiche un résumé transformation client
// ANONYMISÉ pour partage Instagram / WhatsApp / tous réseaux.
//
// Sécurité RGPD :
// - Données fetchées via Edge Function resolve-public-share (service_role)
// - Token vérifié : non révoqué, non expiré (30j), consentement client actif
// - Affichage anonymisé : prénom uniquement, pas de nom, pas de PII coach
// - CTA générique vers labase-nutrition.com (pas de lien WhatsApp direct)
// - Meta noindex/nofollow pour bloquer les moteurs de recherche
// - Vue loggée côté serveur (ip_hash SHA256 + user_agent)

import { useCallback, useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { getSupabaseClient } from "../services/supabaseClient";
import { extractFunctionError } from "../lib/utils/extractFunctionError";

interface ResolvedData {
  client_first_name: string;
  coach_first_name: string;
  program_title?: string;
  expires_at: string;
  body_scan?: {
    weight?: number;
    bodyFat?: number;
    muscleMass?: number;
    hydration?: number;
  };
  metrics_history?: Array<{
    date: string;
    weight?: number;
    bodyFat?: number;
    muscleMass?: number;
    hydration?: number;
  }>;
}

type ResolveReason = "not_found" | "expired" | "revoked" | "consent_revoked" | "server_error";

function reasonToMessage(reason: ResolveReason | string | null): string {
  switch (reason) {
    case "expired":
      return "Ce lien a expiré. Demande au coach un nouveau lien de partage.";
    case "revoked":
    case "consent_revoked":
      return "Ce lien n'est plus actif — la personne concernée a retiré son accord de partage.";
    case "not_found":
      return "Lien introuvable.";
    default:
      return "Impossible d'afficher ce contenu pour le moment.";
  }
}

export function SharePage() {
  const { token } = useParams<{ token: string }>();
  const [data, setData] = useState<ResolvedData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Meta noindex/nofollow pour cette page publique (RGPD)
  useEffect(() => {
    const prev = document.querySelector<HTMLMetaElement>('meta[name="robots"]');
    const meta = prev ?? document.createElement("meta");
    meta.name = "robots";
    meta.content = "noindex, nofollow, noarchive, nosnippet";
    if (!prev) document.head.appendChild(meta);
    return () => {
      if (!prev && meta.parentNode) meta.parentNode.removeChild(meta);
    };
  }, []);

  const load = useCallback(async () => {
    if (!token) {
      setError("Lien incomplet.");
      setLoading(false);
      return;
    }
    try {
      const sb = await getSupabaseClient();
      if (!sb) throw new Error("Service indisponible.");
      const { data: resp, error: err } = await sb.functions.invoke("resolve-public-share", {
        body: { token },
      });
      // Audit 2026-04-30 : extraction body via helper (cas 4xx/5xx).
      const r = (resp ?? {}) as { valid?: boolean; reason?: string; data?: ResolvedData };
      if (err || !r.valid || !r.data) {
        if (r.reason) {
          setError(reasonToMessage(r.reason));
          return;
        }
        const msg = await extractFunctionError(resp, err, "Lien non valide.");
        setError(msg);
        return;
      }
      setData(r.data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur.");
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    void load();
  }, [load]);

  // Calcul des deltas si historique disponible
  const metrics = data?.metrics_history ?? [];
  const first = metrics[0];
  const last = metrics[metrics.length - 1] ?? data?.body_scan;
  const deltaWeight = first && last?.weight != null && first.weight != null ? last.weight - first.weight : null;
  const deltaBodyFat = first && last?.bodyFat != null && first.bodyFat != null ? last.bodyFat - first.bodyFat : null;
  const deltaMuscleKg =
    first && last?.muscleMass != null && first.muscleMass != null ? last.muscleMass - first.muscleMass : null;

  const hasProgress = deltaWeight != null && deltaWeight < 0;

  // CTA générique (pas de numéro WhatsApp du coach — RGPD)
  const ctaUrl = "https://labase-nutrition.com";

  return (
    <div style={{
      minHeight: "100dvh",
      background: "#0A0D0F",
      color: "#F0EDE8",
      fontFamily: "DM Sans, sans-serif",
      padding: "24px 18px",
      position: "relative",
      overflow: "hidden",
    }}>
      <style>{`
        @keyframes share-blob-1 { 0%{transform:translate(0,0)scale(1)}100%{transform:translate(60px,50px)scale(1.1)} }
        @keyframes share-blob-2 { 0%{transform:translate(0,0)scale(1)}100%{transform:translate(-70px,-40px)scale(1.1)} }
        @keyframes share-in { from{opacity:0;transform:translateY(16px)} to{opacity:1;transform:translateY(0)} }
        @keyframes share-stat { from{opacity:0;transform:scale(0.9)} to{opacity:1;transform:scale(1)} }
      `}</style>

      <div aria-hidden="true" style={{
        position: "absolute", top: "-14%", left: "-10%",
        width: 500, height: 500, borderRadius: "50%",
        background: "radial-gradient(circle, #1D9E75 0%, transparent 70%)",
        filter: "blur(90px)", opacity: 0.3, pointerEvents: "none",
        animation: "share-blob-1 32s ease-in-out infinite alternate",
      }} />
      <div aria-hidden="true" style={{
        position: "absolute", bottom: "-15%", right: "-8%",
        width: 480, height: 480, borderRadius: "50%",
        background: "radial-gradient(circle, #EF9F27 0%, transparent 70%)",
        filter: "blur(90px)", opacity: 0.26, pointerEvents: "none",
        animation: "share-blob-2 36s ease-in-out infinite alternate",
      }} />

      <div style={{ position: "relative", zIndex: 1, maxWidth: 520, margin: "0 auto" }}>
        {loading ? (
          <div style={{ textAlign: "center", padding: 60, color: "rgba(240,237,232,0.5)" }}>Chargement…</div>
        ) : error ? (
          <div style={{ textAlign: "center", padding: 60 }}>
            <div style={{
              fontSize: 48, marginBottom: 16, opacity: 0.5,
            }}>🔒</div>
            <div style={{ color: "#FBBFC8", fontSize: 14, lineHeight: 1.6, maxWidth: 380, margin: "0 auto" }}>
              {error}
            </div>
            <a
              href="/welcome"
              style={{
                display: "inline-block", marginTop: 24, padding: "12px 22px",
                borderRadius: 10, background: "rgba(255,255,255,0.08)",
                color: "#F0EDE8", textDecoration: "none",
                fontSize: 13, fontWeight: 600,
              }}
            >
              Découvrir Lor&apos;Squad Wellness
            </a>
          </div>
        ) : data ? (
          <div style={{ animation: "share-in 0.7s cubic-bezier(0.16,1,0.3,1) both" }}>
            {/* Header */}
            <div style={{ textAlign: "center", marginBottom: 28 }}>
              <div style={{
                width: 64, height: 64, borderRadius: 16, margin: "0 auto 14px",
                background: "linear-gradient(135deg, #EF9F27 0%, #BA7517 100%)",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 28,
                boxShadow: "0 8px 24px rgba(186,117,23,0.3)",
              }}>
                ⭐
              </div>
              <div style={{
                fontSize: 11, letterSpacing: "0.14em", textTransform: "uppercase",
                color: "#EF9F27", fontWeight: 700, marginBottom: 8,
              }}>
                Transformation Lor&apos;Squad
              </div>
              <h1 style={{
                fontFamily: "Syne, sans-serif", fontSize: 26, fontWeight: 800,
                margin: 0, letterSpacing: "-0.01em", lineHeight: 1.2,
              }}>
                {data.client_first_name} a pris son{" "}
                <span style={{
                  background: "linear-gradient(135deg, #EF9F27 0%, #F5B847 100%)",
                  WebkitBackgroundClip: "text",
                  backgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                  color: "transparent",
                }}>
                  envol
                </span>
              </h1>
              <p style={{ fontSize: 14, color: "rgba(240,237,232,0.6)", marginTop: 10, lineHeight: 1.55 }}>
                Accompagné·e par <strong style={{ color: "#F0EDE8" }}>{data.coach_first_name}</strong>
                {data.program_title ? ` · ${data.program_title}` : ""}
              </p>
            </div>

            {/* Stats */}
            {hasProgress ? (
              <div style={{
                background: "rgba(255,255,255,0.04)",
                border: "1px solid rgba(239,159,39,0.22)",
                borderRadius: 20,
                padding: 22,
                marginBottom: 22,
                animation: "share-in 0.7s cubic-bezier(0.16,1,0.3,1) 0.2s both",
              }}>
                <div style={{
                  fontSize: 10, letterSpacing: "0.12em", textTransform: "uppercase",
                  color: "rgba(240,237,232,0.5)", fontWeight: 700, marginBottom: 14, textAlign: "center",
                }}>
                  Résultats
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                  {deltaWeight != null && deltaWeight < 0 ? (
                    <StatCard label="Poids" value={`-${Math.abs(deltaWeight).toFixed(1)} kg`} delay={0.3} />
                  ) : null}
                  {deltaBodyFat != null && deltaBodyFat < 0 ? (
                    <StatCard label="Masse grasse" value={`-${Math.abs(deltaBodyFat).toFixed(1)} pts`} delay={0.4} />
                  ) : null}
                  {deltaMuscleKg != null && deltaMuscleKg > 0 ? (
                    <StatCard label="Muscle" value={`+${deltaMuscleKg.toFixed(1)} kg`} delay={0.5} />
                  ) : null}
                  <StatCard label="Sessions" value={`${metrics.length}`} delay={0.6} />
                </div>
              </div>
            ) : (
              <div style={{
                background: "rgba(239,159,39,0.08)",
                border: "1px solid rgba(239,159,39,0.25)",
                borderRadius: 18,
                padding: 18,
                marginBottom: 22,
                fontSize: 13,
                color: "rgba(240,237,232,0.8)",
                lineHeight: 1.6,
                textAlign: "center",
              }}>
                {data.client_first_name} a démarré son parcours Lor&apos;Squad.{" "}
                <strong style={{ color: "#F5B847" }}>Le suivi commence.</strong> Premières mesures posées — tu veux voir
                ton potentiel toi aussi ?
              </div>
            )}

            {/* CTA générique (pas de contact direct coach — RGPD) */}
            <div style={{
              background: "linear-gradient(135deg, rgba(239,159,39,0.14), rgba(186,117,23,0.1))",
              border: "1px solid rgba(239,159,39,0.35)",
              borderRadius: 20,
              padding: 22,
              textAlign: "center",
              animation: "share-in 0.7s cubic-bezier(0.16,1,0.3,1) 0.5s both",
            }}>
              <h2 style={{
                fontFamily: "Syne, sans-serif", fontSize: 20, fontWeight: 700,
                margin: "0 0 8px", color: "#F0EDE8",
              }}>
                Ton tour maintenant ?
              </h2>
              <p style={{ fontSize: 13, color: "rgba(240,237,232,0.7)", margin: "0 0 16px", lineHeight: 1.55 }}>
                Découvre ton <strong style={{ color: "#F5B847" }}>bilan gratuit</strong> et ton potentiel de
                transformation avec un coach certifié Lor&apos;Squad.
              </p>
              <a
                href={ctaUrl}
                target="_blank"
                rel="noopener noreferrer nofollow"
                style={{
                  display: "inline-block",
                  padding: "14px 28px",
                  borderRadius: 12,
                  background: "linear-gradient(135deg, #EF9F27 0%, #BA7517 100%)",
                  color: "#fff",
                  textDecoration: "none",
                  fontFamily: "Syne, sans-serif",
                  fontWeight: 700,
                  fontSize: 14,
                  boxShadow: "0 4px 18px rgba(186,117,23,0.4)",
                }}
              >
                ✨ Je veux mon bilan gratuit
              </a>
            </div>

            {/* Footer RGPD */}
            <div style={{
              textAlign: "center", marginTop: 28,
              fontSize: 11, color: "rgba(240,237,232,0.45)",
              lineHeight: 1.6,
              animation: "share-in 0.7s cubic-bezier(0.16,1,0.3,1) 0.7s both",
            }}>
              Partagé avec l&apos;accord de <strong>{data.client_first_name}</strong>.
              <br />
              Propulsé par <strong style={{ color: "#EF9F27" }}>Lor&apos;Squad Wellness</strong>
              <br />
              <a href="/welcome" style={{ color: "rgba(240,237,232,0.45)", textDecoration: "underline" }}>
                Découvrir l&apos;app
              </a>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}

function StatCard({ label, value, delay }: { label: string; value: string; delay: number }) {
  return (
    <div style={{
      background: "rgba(29,158,117,0.12)",
      border: "1px solid rgba(29,158,117,0.3)",
      borderRadius: 14,
      padding: "14px 16px",
      textAlign: "center",
      animation: `share-stat 0.5s cubic-bezier(0.16,1,0.3,1) ${delay}s both`,
    }}>
      <div style={{
        fontSize: 10, letterSpacing: "0.08em", textTransform: "uppercase",
        color: "rgba(240,237,232,0.55)", fontWeight: 600, marginBottom: 4,
      }}>
        {label}
      </div>
      <div style={{
        fontFamily: "Syne, sans-serif",
        fontSize: 22,
        fontWeight: 800,
        color: "#1D9E75",
        lineHeight: 1,
      }}>
        {value}
      </div>
    </div>
  );
}
