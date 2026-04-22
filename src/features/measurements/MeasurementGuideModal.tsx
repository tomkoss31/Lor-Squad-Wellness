// Chantier Module Mensurations (2026-04-24).
// Modale 2 écrans (Guide + Saisie) au clic sur un point silhouette.

import { useEffect, useState } from "react";
import { getGuide, type MeasurementKey } from "../../data/measurementGuides";
import { parseMeasurementInput } from "../../lib/measurementCalculations";

type Screen = "guide" | "input";

interface Props {
  open: boolean;
  zoneKey: MeasurementKey | null;
  currentValue: number | null;
  previousValue: number | null;
  previousDate: string | null;
  onClose: () => void;
  onSave: (value: number) => Promise<void>;
}

/**
 * Illustration générique schématique : cercle + mètre-ruban orienté
 * selon la zone. Sobre, dark-mode ready.
 */
function ZoomIllustration({ zoneKey }: { zoneKey: MeasurementKey }) {
  const orientation = getGuide(zoneKey).orientation;
  return (
    <svg viewBox="0 0 160 160" width="160" height="160" aria-hidden="true">
      <defs>
        <linearGradient id="zoom-grad" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="var(--ls-surface2, #2a2f3a)" />
          <stop offset="100%" stopColor="var(--ls-surface, #1a1d26)" />
        </linearGradient>
      </defs>
      {/* Zone ovale (représente la partie du corps) */}
      <ellipse cx="80" cy="80" rx="46" ry="58" fill="url(#zoom-grad)" stroke="var(--ls-text-hint, #6b6f7a)" strokeWidth="1.2" />
      {/* Mètre-ruban accent teal */}
      {orientation === "horizontal" ? (
        <>
          <line x1="22" y1="80" x2="138" y2="80" stroke="#1D9E75" strokeWidth="3" strokeLinecap="round" />
          <line x1="22" y1="80" x2="138" y2="80" stroke="#FFFFFF" strokeWidth="1" strokeDasharray="4 4" strokeLinecap="round" />
          {/* flèches */}
          <polygon points="22,76 16,80 22,84" fill="#1D9E75" />
          <polygon points="138,76 144,80 138,84" fill="#1D9E75" />
          <text x="80" y="100" textAnchor="middle" fontSize="10" fill="var(--ls-text-muted, #9aa0ac)" fontFamily="DM Sans, sans-serif">
            horizontal · à plat
          </text>
        </>
      ) : (
        <>
          <line x1="80" y1="22" x2="80" y2="138" stroke="#1D9E75" strokeWidth="3" strokeLinecap="round" />
          <polygon points="76,22 80,16 84,22" fill="#1D9E75" />
          <polygon points="76,138 80,144 84,138" fill="#1D9E75" />
          <text x="80" y="158" textAnchor="middle" fontSize="10" fill="var(--ls-text-muted, #9aa0ac)" fontFamily="DM Sans, sans-serif">
            vertical
          </text>
        </>
      )}
    </svg>
  );
}

function formatDate(iso: string | null): string {
  if (!iso) return "";
  try {
    return new Date(iso).toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" });
  } catch {
    return iso;
  }
}

export function MeasurementGuideModal({
  open,
  zoneKey,
  currentValue,
  previousValue,
  previousDate,
  onClose,
  onSave,
}: Props) {
  const [screen, setScreen] = useState<Screen>("guide");
  const [inputValue, setInputValue] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) {
      setScreen("guide");
      setInputValue("");
      setError("");
      setSaving(false);
      return;
    }
    setInputValue(currentValue != null ? String(currentValue) : "");
  }, [open, currentValue]);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  if (!open || !zoneKey) return null;

  const guide = getGuide(zoneKey);
  const delta =
    previousValue != null && currentValue != null ? currentValue - previousValue : null;

  async function handleSave() {
    const parsed = parseMeasurementInput(inputValue);
    if (parsed == null) {
      setError("Valeur invalide (entre 1 et 300 cm).");
      return;
    }
    setSaving(true);
    try {
      await onSave(parsed);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur lors de la sauvegarde.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div
      role="button"
      tabIndex={0}
      aria-label="Fermer"
      onClick={onClose}
      onKeyDown={(e) => {
        if (e.key === "Escape") onClose();
      }}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.6)",
        zIndex: 10000,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 16,
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={guide.label}
        onClick={(e) => e.stopPropagation()}
        onKeyDown={(e) => e.stopPropagation()}
        style={{
          background: "var(--ls-surface)",
          border: "1px solid var(--ls-border)",
          borderRadius: 18,
          maxWidth: 460,
          width: "100%",
          maxHeight: "90vh",
          overflowY: "auto",
          padding: 22,
          boxShadow: "0 20px 60px rgba(0,0,0,0.5)",
          fontFamily: "DM Sans, sans-serif",
          color: "var(--ls-text)",
        }}
      >
        <h3
          style={{
            fontFamily: "Syne, sans-serif",
            fontSize: 18,
            fontWeight: 700,
            color: "var(--ls-text)",
            margin: 0,
            marginBottom: 12,
          }}
        >
          Mesurer · {guide.label}
        </h3>

        {screen === "guide" ? (
          <>
            <div style={{ display: "flex", justifyContent: "center", marginBottom: 14 }}>
              <ZoomIllustration zoneKey={zoneKey} />
            </div>

            <div style={{ marginBottom: 14 }}>
              <div
                style={{
                  fontSize: 10,
                  letterSpacing: "0.08em",
                  textTransform: "uppercase",
                  color: "var(--ls-text-muted)",
                  fontWeight: 700,
                  marginBottom: 6,
                }}
              >
                Comment mesurer
              </div>
              <ol style={{ margin: 0, paddingLeft: 18, fontSize: 13, lineHeight: 1.6 }}>
                {guide.howToMeasure.map((h, i) => (
                  <li key={i} style={{ color: "var(--ls-text)", marginBottom: 4 }}>
                    {h}
                  </li>
                ))}
              </ol>
            </div>

            <div
              style={{
                marginBottom: 16,
                padding: "10px 12px",
                background: "rgba(226,75,74,0.08)",
                borderLeft: "3px solid #E24B4A",
                borderRadius: 8,
              }}
            >
              <div
                style={{
                  fontSize: 10,
                  letterSpacing: "0.08em",
                  textTransform: "uppercase",
                  color: "#E24B4A",
                  fontWeight: 700,
                  marginBottom: 6,
                }}
              >
                À éviter
              </div>
              <ul style={{ margin: 0, paddingLeft: 18, fontSize: 12, lineHeight: 1.5 }}>
                {guide.commonMistakes.map((m, i) => (
                  <li key={i} style={{ color: "var(--ls-text-muted)" }}>
                    {m}
                  </li>
                ))}
              </ul>
            </div>

            <div style={{ display: "flex", gap: 8, justifyContent: "space-between", alignItems: "center" }}>
              <button
                type="button"
                onClick={onClose}
                style={{
                  padding: "9px 14px",
                  borderRadius: 10,
                  background: "transparent",
                  border: "1px solid var(--ls-border)",
                  color: "var(--ls-text-muted)",
                  cursor: "pointer",
                  fontSize: 12,
                }}
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={() => setScreen("input")}
                style={{
                  padding: "10px 16px",
                  borderRadius: 10,
                  background: "linear-gradient(135deg, #EF9F27 0%, #BA7517 100%)",
                  border: "none",
                  color: "#FFFFFF",
                  cursor: "pointer",
                  fontSize: 13,
                  fontWeight: 600,
                }}
              >
                J'ai compris, je mesure →
              </button>
            </div>
          </>
        ) : (
          <>
            {previousValue != null ? (
              <div style={{ fontSize: 12, color: "var(--ls-text-muted)", marginBottom: 10 }}>
                Dernière mesure : <strong style={{ color: "var(--ls-text)" }}>{previousValue} cm</strong>
                {previousDate ? ` · ${formatDate(previousDate)}` : ""}
              </div>
            ) : null}

            <label style={{ display: "block", marginBottom: 12 }}>
              <span style={{ fontSize: 11, color: "var(--ls-text-muted)", fontWeight: 600 }}>
                Nouvelle mesure (cm)
              </span>
              <div style={{ position: "relative", marginTop: 4 }}>
                <input
                  type="text"
                  inputMode="decimal"
                  value={inputValue}
                  onChange={(e) => {
                    setInputValue(e.target.value);
                    setError("");
                  }}
                  placeholder="Ex: 78,5"
                  autoFocus
                  style={{
                    width: "100%",
                    padding: "12px 44px 12px 14px",
                    borderRadius: 10,
                    border: "1px solid var(--ls-border)",
                    background: "var(--ls-surface2)",
                    color: "var(--ls-text)",
                    fontSize: 18,
                    fontWeight: 600,
                    fontFamily: "Syne, sans-serif",
                  }}
                />
                <span
                  style={{
                    position: "absolute",
                    right: 14,
                    top: "50%",
                    transform: "translateY(-50%)",
                    fontSize: 13,
                    color: "var(--ls-text-muted)",
                    fontWeight: 600,
                  }}
                >
                  cm
                </span>
              </div>
            </label>

            {delta != null ? (
              <div style={{ fontSize: 12, color: delta < 0 ? "#1D9E75" : "#BA7517", marginBottom: 12 }}>
                Évolution actuelle : {delta > 0 ? "+" : ""}{delta.toFixed(1)} cm depuis le départ
              </div>
            ) : null}

            {error ? (
              <div
                style={{
                  background: "#FCEBEB",
                  color: "#501313",
                  border: "1px solid #E24B4A",
                  borderRadius: 8,
                  padding: "8px 10px",
                  fontSize: 12,
                  marginBottom: 12,
                }}
              >
                {error}
              </div>
            ) : null}

            <div style={{ display: "flex", gap: 8, justifyContent: "space-between" }}>
              <button
                type="button"
                onClick={() => setScreen("guide")}
                style={{
                  padding: "9px 14px",
                  borderRadius: 10,
                  background: "transparent",
                  border: "1px solid var(--ls-border)",
                  color: "var(--ls-text-muted)",
                  cursor: "pointer",
                  fontSize: 12,
                }}
              >
                ← Revoir le guide
              </button>
              <button
                type="button"
                onClick={() => void handleSave()}
                disabled={saving}
                style={{
                  padding: "10px 18px",
                  borderRadius: 10,
                  background: saving ? "var(--ls-border)" : "linear-gradient(135deg, #1D9E75, #0F6E56)",
                  border: "none",
                  color: "#FFFFFF",
                  cursor: saving ? "wait" : "pointer",
                  fontSize: 13,
                  fontWeight: 600,
                }}
              >
                {saving ? "Enregistrement..." : "Enregistrer"}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
