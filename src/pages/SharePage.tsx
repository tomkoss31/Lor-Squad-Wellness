// Chantier Partage public recap (2026-04-24).
// Route publique /partage/:token — affiche un résumé transformation
// client pour partage Instagram / WhatsApp / tous réseaux.
// CTA "Contacte-moi pour ton bilan gratuit" qui renvoie vers le coach.
//
// Utilise la table client_recaps existante (déjà publique via token).

import { useCallback, useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { getSupabaseClient } from "../services/supabaseClient";

interface RecapData {
  client_first_name: string;
  client_last_name: string;
  coach_name: string;
  coach_whatsapp?: string;
  coach_phone?: string;
  program_title?: string;
  assessment_date: string;
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

export function SharePage() {
  const { token } = useParams<{ token: string }>();
  const [data, setData] = useState<RecapData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    if (!token) {
      setError("Lien incomplet.");
      setLoading(false);
      return;
    }
    try {
      const sb = await getSupabaseClient();
      if (!sb) throw new Error("Service indisponible.");
      const { data: row, error: err } = await sb
        .from("client_recaps")
        .select("*")
        .eq("token", token)
        .maybeSingle();
      if (err) throw err;
      if (!row) throw new Error("Lien introuvable ou expiré.");
      setData(row as unknown as RecapData);
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

  const whatsapp = (data?.coach_whatsapp ?? data?.coach_phone ?? "").replace(/\D/g, "");
  const contactMessage = encodeURIComponent(
    `Salut ${data?.coach_name ?? ""} ! J'ai vu la transformation de ${data?.client_first_name ?? ""}, je veux mon bilan gratuit.`,
  );
  const contactUrl = whatsapp ? `https://wa.me/${whatsapp}?text=${contactMessage}` : "";

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
          <div style={{ textAlign: "center", padding: 60, color: "#FBBFC8" }}>{error}</div>
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
                Avec <strong style={{ color: "#F0EDE8" }}>{data.coach_name}</strong> comme coach
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

            {/* CTA */}
            {contactUrl ? (
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
                  {data.coach_name} offre un <strong style={{ color: "#F5B847" }}>bilan gratuit de 45 min</strong>.
                  Découvre ton point de départ et ton potentiel.
                </p>
                <a
                  href={contactUrl}
                  target="_blank"
                  rel="noreferrer"
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
                  📱 Contacter {data.coach_name.split(" ")[0]} sur WhatsApp
                </a>
              </div>
            ) : null}

            {/* Footer */}
            <div style={{
              textAlign: "center", marginTop: 28,
              fontSize: 11, color: "rgba(240,237,232,0.35)",
              animation: "share-in 0.7s cubic-bezier(0.16,1,0.3,1) 0.7s both",
            }}>
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
