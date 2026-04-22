// Chantier Module Mensurations (2026-04-24).
// Section dédiée "Mes mesures" pour l'app PWA client.
// - Fetch le sexe du client depuis la table clients (pour silhouette correcte)
// - Encart motivation en haut
// - Réutilise le MeasurementsPanel en mode client

import { useEffect, useState } from "react";
import { getSupabaseClient } from "../../services/supabaseClient";
import { MeasurementsPanel } from "./MeasurementsPanel";
import { calculateTotalCmLost, getInitialSession, getLatestSession, type ClientMeasurement } from "../../lib/measurementCalculations";

interface Props {
  clientId: string;
  coachFirstName?: string;
}

export function ClientMeasurementsSection({ clientId, coachFirstName }: Props) {
  const [gender, setGender] = useState<"male" | "female">("female");
  const [motivationData, setMotivationData] = useState<{ totalLost: number; sessions: number } | null>(null);

  useEffect(() => {
    void (async () => {
      const sb = await getSupabaseClient();
      if (!sb) return;
      // 1. Récupère le sexe du client (pour silhouette)
      const { data: client } = await sb
        .from("clients")
        .select("sex")
        .eq("id", clientId)
        .maybeSingle();
      if (client?.sex === "male" || client?.sex === "female") {
        setGender(client.sex);
      }
      // 2. Récupère les sessions pour l'encart motivation
      const { data: sessions } = await sb
        .from("client_measurements")
        .select("*")
        .eq("client_id", clientId)
        .order("measured_at", { ascending: false });
      const list = (sessions ?? []) as ClientMeasurement[];
      const latest = getLatestSession(list);
      const initial = getInitialSession(list);
      setMotivationData({
        totalLost: calculateTotalCmLost(initial, latest),
        sessions: list.length,
      });
    })();
  }, [clientId]);

  const noMeasures = motivationData && motivationData.sessions === 0;
  const oneMeasure = motivationData && motivationData.sessions === 1;
  const hasProgress = motivationData && motivationData.sessions >= 2 && motivationData.totalLost > 0;
  const regression = motivationData && motivationData.sessions >= 2 && motivationData.totalLost < 0;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      {/* Encart motivation */}
      <div
        style={{
          background: noMeasures || oneMeasure
            ? "linear-gradient(135deg, rgba(239,159,39,0.12), rgba(186,117,23,0.08))"
            : hasProgress
              ? "linear-gradient(135deg, rgba(29,158,117,0.14), rgba(15,110,86,0.1))"
              : "var(--ls-surface2, #f4f1ec)",
          border: `1px solid ${
            noMeasures || oneMeasure
              ? "rgba(239,159,39,0.25)"
              : hasProgress
                ? "rgba(29,158,117,0.3)"
                : "rgba(0,0,0,0.08)"
          }`,
          borderRadius: 14,
          padding: "14px 16px",
          fontFamily: "DM Sans, sans-serif",
        }}
      >
        {noMeasures ? (
          <>
            <div style={{ fontSize: 15, fontWeight: 700, color: "#BA7517", fontFamily: "Syne, sans-serif" }}>
              Première mesure ? C&apos;est parti ! 📏
            </div>
            <div style={{ fontSize: 12, color: "#6b6f7a", marginTop: 4, lineHeight: 1.5 }}>
              Clique sur un point de la silhouette (les ronds gold qui pulsent) pour saisir ta première mesure.
              Plus tu en fais, plus tu verras ton évolution !
            </div>
          </>
        ) : oneMeasure ? (
          <>
            <div style={{ fontSize: 14, fontWeight: 700, color: "#BA7517", fontFamily: "Syne, sans-serif" }}>
              Bravo pour ta première session ! 💪
            </div>
            <div style={{ fontSize: 12, color: "#6b6f7a", marginTop: 4, lineHeight: 1.5 }}>
              Reviens dans 2-3 semaines pour une nouvelle mesure et voir ton évolution.
            </div>
          </>
        ) : hasProgress ? (
          <>
            <div style={{ fontSize: 15, fontWeight: 700, color: "#1D9E75", fontFamily: "Syne, sans-serif" }}>
              🎉 Tu as perdu {motivationData!.totalLost.toFixed(1)} cm au total !
            </div>
            <div style={{ fontSize: 12, color: "#6b6f7a", marginTop: 4, lineHeight: 1.5 }}>
              Bravo, continue comme ça ! Chaque nouvelle mesure confirme ta progression.
            </div>
          </>
        ) : regression ? (
          <>
            <div style={{ fontSize: 14, fontWeight: 700, color: "#BA7517", fontFamily: "Syne, sans-serif" }}>
              Phase de stabilisation 🔁
            </div>
            <div style={{ fontSize: 12, color: "#6b6f7a", marginTop: 4, lineHeight: 1.5 }}>
              Pas de souci, chaque parcours a ses phases. Parles-en avec {coachFirstName ?? "ton coach"} !
            </div>
          </>
        ) : motivationData ? (
          <>
            <div style={{ fontSize: 14, fontWeight: 700, color: "var(--ls-text)", fontFamily: "Syne, sans-serif" }}>
              {motivationData.sessions} sessions enregistrées
            </div>
            <div style={{ fontSize: 12, color: "#6b6f7a", marginTop: 4, lineHeight: 1.5 }}>
              Continue à mesurer régulièrement pour suivre ton évolution.
            </div>
          </>
        ) : null}
      </div>

      {/* Panel principal */}
      <MeasurementsPanel
        clientId={clientId}
        gender={gender}
        authorType="client"
        authorUserId={null}
        otherAuthorLabel={coachFirstName ?? "ton coach"}
      />
    </div>
  );
}
