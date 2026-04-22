// Chantier Module Mensurations (2026-04-24).
// Panel principal : silhouette (face/dos) + liste mesures + résumé
// évolution. Mode coach (saisit pour son client) OU client (saisit
// pour lui-même).

import { useMemo, useState } from "react";
import { SilhouetteSvg } from "./SilhouetteSvg";
import { MeasurementGuideModal } from "./MeasurementGuideModal";
import { useMeasurements } from "./hooks/useMeasurements";
import { useToast } from "../../context/ToastContext";
import { MEASUREMENT_GUIDES, type MeasurementKey } from "../../data/measurementGuides";
import {
  calculateTotalCmLost,
  countFilledKeys,
  getInitialSession,
  getLatestSession,
  getZoneDelta,
  type ClientMeasurement,
} from "../../lib/measurementCalculations";

export interface MeasurementsPanelProps {
  clientId: string;
  gender: "male" | "female";
  authorType: "coach" | "client";
  authorUserId: string | null;
  /** Nom à afficher en badge de la session "autre auteur" (ex: "Thomas" ou "le client") */
  otherAuthorLabel?: string;
}

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString("fr-FR", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  } catch {
    return iso;
  }
}

/**
 * Merge draft + dernière session pour afficher les "valeurs en cours"
 * sur la silhouette (prévisu avant enregistrement).
 */
function mergeWithDraft(
  latest: Partial<ClientMeasurement> | null,
  draft: Partial<Record<MeasurementKey, number>>,
): Partial<ClientMeasurement> {
  const merged: Partial<ClientMeasurement> = { ...(latest ?? {}) };
  for (const [k, v] of Object.entries(draft)) {
    if (v != null) (merged as Record<string, number>)[k] = v;
  }
  return merged;
}

export function MeasurementsPanel({
  clientId,
  gender,
  authorType,
  authorUserId,
  otherAuthorLabel = authorType === "coach" ? "le client" : "ton coach",
}: MeasurementsPanelProps) {
  const { push: pushToast } = useToast();
  const { sessions, loading, error, saveSession } = useMeasurements(clientId);
  const [view, setView] = useState<"face" | "back">("face");
  const [activeKey, setActiveKey] = useState<MeasurementKey | null>(null);
  const [draft, setDraft] = useState<Partial<Record<MeasurementKey, number>>>({});
  const [committing, setCommitting] = useState(false);

  const latest = useMemo(() => getLatestSession(sessions), [sessions]);
  const initial = useMemo(() => getInitialSession(sessions), [sessions]);
  const merged = useMemo(() => mergeWithDraft(latest, draft), [latest, draft]);
  const draftCount = Object.keys(draft).length;
  const filledLatest = countFilledKeys(latest);
  const totalLost = useMemo(
    () => calculateTotalCmLost(initial, latest),
    [initial, latest],
  );

  const activeGuide = activeKey
    ? MEASUREMENT_GUIDES.find((g) => g.key === activeKey) ?? null
    : null;
  const activeCurrent =
    (activeKey && (merged as Record<string, number | null>)[activeKey]) ?? null;
  const activePrevious =
    (activeKey && initial ? (initial[activeKey] as number | null | undefined) : null) ?? null;

  async function handleSaveOne(value: number) {
    if (!activeKey) return;
    setDraft((d) => ({ ...d, [activeKey]: value }));
    setActiveKey(null);
  }

  async function handleCommitSession() {
    if (draftCount === 0) return;
    setCommitting(true);
    try {
      await saveSession(clientId, draft, authorType, authorUserId);
      setDraft({});
      pushToast({ tone: "success", title: "Session enregistrée" });
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Erreur inconnue.";
      pushToast({ tone: "error", title: "Sauvegarde impossible", message: msg });
    } finally {
      setCommitting(false);
    }
  }

  function cancelDraft() {
    setDraft({});
  }

  return (
    <div
      style={{
        background: "var(--ls-surface)",
        border: "1px solid var(--ls-border)",
        borderRadius: 18,
        padding: 20,
        fontFamily: "DM Sans, sans-serif",
      }}
    >
      {/* Header : titre + toggle face/dos + compteur */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: 10,
          marginBottom: 14,
        }}
      >
        <div>
          <h3
            style={{
              fontFamily: "Syne, sans-serif",
              fontSize: 16,
              fontWeight: 700,
              color: "var(--ls-text)",
              margin: 0,
            }}
          >
            Mensurations
          </h3>
          <div style={{ fontSize: 11, color: "var(--ls-text-muted)", marginTop: 2 }}>
            {filledLatest}/10 zones renseignées
            {latest ? ` · dernière session ${formatDate(latest.measured_at)}` : ""}
          </div>
        </div>
        <div
          role="group"
          aria-label="Vue silhouette"
          style={{
            display: "inline-flex",
            padding: 3,
            borderRadius: 10,
            border: "1px solid var(--ls-border)",
            background: "var(--ls-surface2)",
          }}
        >
          {(["face", "back"] as const).map((v) => (
            <button
              key={v}
              type="button"
              onClick={() => setView(v)}
              style={{
                padding: "5px 14px",
                border: "none",
                borderRadius: 7,
                background: view === v ? "var(--ls-surface)" : "transparent",
                color: view === v ? "var(--ls-text)" : "var(--ls-text-muted)",
                fontSize: 11,
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              {v === "face" ? "Face" : "Dos"}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div style={{ fontSize: 12, color: "var(--ls-text-muted)", padding: 20, textAlign: "center" }}>
          Chargement des mesures...
        </div>
      ) : error ? (
        <div style={{ fontSize: 12, color: "#E24B4A", padding: 20, textAlign: "center" }}>
          {error}
        </div>
      ) : (
        <div
          style={{
            display: "grid",
            gap: 18,
            gridTemplateColumns: "minmax(180px, 1fr) minmax(220px, 2fr)",
          }}
          className="measurements-grid"
        >
          {/* Silhouette */}
          <div style={{ display: "flex", justifyContent: "center", alignItems: "flex-start" }}>
            <SilhouetteSvg
              gender={gender}
              view={view}
              measurements={merged}
              onPointClick={setActiveKey}
              activeKey={activeKey}
            />
          </div>

          {/* Liste des mesures */}
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {MEASUREMENT_GUIDES.map((g) => {
              const current = (merged as Record<string, number | null>)[g.key] ?? null;
              const inDraft = draft[g.key] != null;
              const delta = getZoneDelta(initial, merged, g.key);
              return (
                <button
                  key={g.key}
                  type="button"
                  onClick={() => setActiveKey(g.key)}
                  style={{
                    textAlign: "left",
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    padding: "8px 10px",
                    borderRadius: 10,
                    background: inDraft ? "rgba(239,159,39,0.12)" : "var(--ls-surface2)",
                    border: `1px solid ${inDraft ? "#EF9F27" : "var(--ls-border)"}`,
                    cursor: "pointer",
                    color: "var(--ls-text)",
                    fontFamily: "DM Sans, sans-serif",
                  }}
                >
                  <span
                    aria-hidden="true"
                    style={{
                      width: 8,
                      height: 8,
                      borderRadius: "50%",
                      background: current != null ? "#1D9E75" : "#BA7517",
                      flexShrink: 0,
                    }}
                  />
                  <span style={{ flex: 1, fontSize: 13 }}>{g.label}</span>
                  <span
                    style={{
                      fontSize: 13,
                      fontWeight: 600,
                      fontFamily: "Syne, sans-serif",
                      color: current != null ? "var(--ls-text)" : "var(--ls-text-muted)",
                      minWidth: 52,
                      textAlign: "right",
                    }}
                  >
                    {current != null ? `${current} cm` : "—"}
                  </span>
                  {delta != null ? (
                    <span
                      style={{
                        fontSize: 11,
                        color: delta < 0 ? "#1D9E75" : delta > 0 ? "#BA7517" : "var(--ls-text-muted)",
                        minWidth: 42,
                        textAlign: "right",
                      }}
                    >
                      {delta > 0 ? "+" : ""}{delta.toFixed(1)}
                    </span>
                  ) : null}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Footer : récap total + boutons */}
      <div
        style={{
          marginTop: 16,
          paddingTop: 14,
          borderTop: "1px solid var(--ls-border)",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: 12,
          flexWrap: "wrap",
        }}
      >
        <div>
          {sessions.length >= 2 && totalLost !== 0 ? (
            <div style={{ fontSize: 13, color: totalLost > 0 ? "#1D9E75" : "#BA7517", fontWeight: 600 }}>
              {totalLost > 0 ? `🎉 Total perdu : -${totalLost.toFixed(1)} cm` : `Total : +${Math.abs(totalLost).toFixed(1)} cm`}
              <span style={{ fontWeight: 400, color: "var(--ls-text-muted)", marginLeft: 6, fontSize: 11 }}>
                depuis la 1ère session
              </span>
            </div>
          ) : sessions.length === 0 ? (
            <div style={{ fontSize: 12, color: "var(--ls-text-muted)" }}>
              {authorType === "client"
                ? "Première mesure ? C'est parti ! Clique sur un point de la silhouette."
                : "Aucune mesure encore. Clique sur un point de la silhouette pour saisir."}
            </div>
          ) : (
            <div style={{ fontSize: 12, color: "var(--ls-text-muted)" }}>
              {sessions.length} session{sessions.length > 1 ? "s" : ""} enregistrée{sessions.length > 1 ? "s" : ""}
              {latest?.measured_by_type && latest.measured_by_type !== authorType ? (
                <span style={{ marginLeft: 6, padding: "2px 6px", borderRadius: 6, background: "var(--ls-surface2)", fontSize: 10 }}>
                  Dernière saisie : {otherAuthorLabel}
                </span>
              ) : null}
            </div>
          )}
        </div>

        {draftCount > 0 ? (
          <div style={{ display: "flex", gap: 8 }}>
            <button
              type="button"
              onClick={cancelDraft}
              disabled={committing}
              style={{
                padding: "9px 14px",
                borderRadius: 10,
                background: "transparent",
                border: "1px solid var(--ls-border)",
                color: "var(--ls-text-muted)",
                cursor: committing ? "wait" : "pointer",
                fontSize: 12,
              }}
            >
              Annuler
            </button>
            <button
              type="button"
              onClick={() => void handleCommitSession()}
              disabled={committing}
              style={{
                padding: "10px 16px",
                borderRadius: 10,
                background: "linear-gradient(135deg, #1D9E75, #0F6E56)",
                border: "none",
                color: "#FFFFFF",
                cursor: committing ? "wait" : "pointer",
                fontSize: 13,
                fontWeight: 600,
              }}
            >
              {committing ? "Enregistrement..." : `Enregistrer (${draftCount})`}
            </button>
          </div>
        ) : null}
      </div>

      <MeasurementGuideModal
        open={!!activeGuide}
        zoneKey={activeKey}
        currentValue={activeCurrent}
        previousValue={activePrevious}
        previousDate={initial?.measured_at ?? null}
        onClose={() => setActiveKey(null)}
        onSave={handleSaveOne}
      />

      {/* Responsive mobile : stack vertical */}
      <style>{`
        @media (max-width: 640px) {
          .measurements-grid {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </div>
  );
}
