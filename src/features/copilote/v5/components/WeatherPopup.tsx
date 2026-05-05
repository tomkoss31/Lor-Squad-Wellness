// =============================================================================
// WeatherPopup — Modale météo 5 jours Co-pilote V5 (Chantier D 2026-05-05)
//
// Click sur la weather pill du Co-pilote V5 → ouvre cette modale qui
// affiche :
//   - Jour courant (gros bloc) : ville + temp actuelle + emoji + label
//   - 4 jours suivants en row horizontale : jour court + emoji + max/min
//   - Source Open-Meteo en footer (mention transparente)
//
// Backdrop blur + escape key + click outside = close.
// Si city absent → CTA "Renseigner ma ville" → /parametres.
// =============================================================================

import { useEffect } from "react";
import { Link } from "react-router-dom";
import { useWeatherForecast, shortDayLabel } from "../hooks/useWeatherForecast";

interface WeatherPopupProps {
  open: boolean;
  onClose: () => void;
  city: string | null | undefined;
}

export function WeatherPopup({ open, onClose, city }: WeatherPopupProps) {
  const { forecast, loading, error } = useWeatherForecast(city, open);

  // Escape key close
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, onClose]);

  // Lock body scroll
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  if (!open) return null;

  const todayIso = new Date().toISOString().slice(0, 10);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Météo 5 jours"
      style={backdropStyle}
      onClick={onClose}
    >
      <div
        style={modalStyle}
        onClick={(e) => e.stopPropagation()}
        className="copilote-v5"
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="Fermer"
          style={closeBtnStyle}
        >
          ✕
        </button>

        {!city ? (
          <div style={emptyStateStyle}>
            <div style={{ fontSize: 36, marginBottom: 8 }} aria-hidden="true">
              🌍
            </div>
            <h3 style={titleStyle}>Renseigne ta ville</h3>
            <p style={subtitleStyle}>
              On a besoin de ta ville pour afficher la météo 5 jours sur ton
              Co-pilote.
            </p>
            <Link to="/parametres" style={ctaStyle} onClick={onClose}>
              Aller dans Paramètres →
            </Link>
          </div>
        ) : loading ? (
          <div style={emptyStateStyle}>
            <div style={{ fontSize: 28 }} aria-hidden="true">
              ⏳
            </div>
            <p style={subtitleStyle}>Chargement de la météo…</p>
          </div>
        ) : error ? (
          <div style={emptyStateStyle}>
            <div style={{ fontSize: 28, marginBottom: 6 }} aria-hidden="true">
              ⚠️
            </div>
            <h3 style={titleStyle}>Météo indisponible</h3>
            <p style={subtitleStyle}>{error}</p>
          </div>
        ) : forecast ? (
          <>
            {/* Bloc principal — aujourd'hui */}
            <div style={headerStyle}>
              <div style={cityRowStyle}>
                <span aria-hidden="true">📍</span>
                <span style={cityNameStyle}>{forecast.city}</span>
                {forecast.country && (
                  <span style={countryStyle}>· {forecast.country}</span>
                )}
              </div>
              <div style={currentRowStyle}>
                <div style={currentEmojiStyle} aria-hidden="true">
                  {forecast.current.emoji}
                </div>
                <div style={currentTempStyle}>{forecast.current.temp}°</div>
                <div style={currentLabelStyle}>{forecast.current.label}</div>
              </div>
            </div>

            {/* Row 4 jours suivants */}
            <div style={daysRowStyle}>
              {forecast.days.slice(1, 5).map((day) => (
                <div key={day.date} style={dayCardStyle}>
                  <div style={dayLabelStyle}>
                    {shortDayLabel(day.date, todayIso)}
                  </div>
                  <div style={dayEmojiStyle} aria-hidden="true">
                    {day.emoji}
                  </div>
                  <div style={dayTempStyle}>
                    <span style={tempMaxStyle}>{day.tempMax}°</span>
                    <span style={tempMinStyle}>{day.tempMin}°</span>
                  </div>
                </div>
              ))}
            </div>

            <div style={footerStyle}>
              Données <strong>Open-Meteo</strong> · mise à jour il y a&nbsp;
              {Math.floor((Date.now() - forecast.fetchedAt) / 1000)}s
            </div>
          </>
        ) : null}
      </div>
    </div>
  );
}

// ─── Styles (tokens var(--ls-*) — theme-aware) ───────────────────────────

const backdropStyle: React.CSSProperties = {
  position: "fixed",
  inset: 0,
  background: "rgba(10, 8, 6, 0.55)",
  backdropFilter: "blur(8px)",
  WebkitBackdropFilter: "blur(8px)",
  zIndex: 1000,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  padding: 16,
  animation: "ls-fade-in 200ms ease-out",
};

const modalStyle: React.CSSProperties = {
  background: "var(--ls-surface)",
  color: "var(--ls-text-strong)",
  borderRadius: 22,
  padding: "28px 26px 20px",
  width: "100%",
  maxWidth: 480,
  boxShadow: "0 24px 60px rgba(0,0,0,0.35)",
  position: "relative",
  border: "1px solid var(--ls-border)",
};

const closeBtnStyle: React.CSSProperties = {
  position: "absolute",
  top: 12,
  right: 14,
  background: "transparent",
  border: "none",
  fontSize: 18,
  color: "var(--ls-text-muted)",
  cursor: "pointer",
  width: 32,
  height: 32,
  borderRadius: 8,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
};

const headerStyle: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  marginBottom: 20,
};

const cityRowStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 6,
  fontSize: 13,
  color: "var(--ls-text-muted)",
  fontFamily: "DM Sans, sans-serif",
  marginBottom: 14,
};

const cityNameStyle: React.CSSProperties = {
  fontWeight: 700,
  color: "var(--ls-text-strong)",
};

const countryStyle: React.CSSProperties = {
  color: "var(--ls-text-muted)",
};

const currentRowStyle: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  gap: 4,
};

const currentEmojiStyle: React.CSSProperties = {
  fontSize: 56,
  lineHeight: 1,
};

const currentTempStyle: React.CSSProperties = {
  fontSize: 56,
  fontWeight: 800,
  fontFamily: "'JetBrains Mono', monospace",
  color: "var(--ls-gold)",
  letterSpacing: -2,
  lineHeight: 1,
};

const currentLabelStyle: React.CSSProperties = {
  fontSize: 14,
  color: "var(--ls-text-muted)",
  marginTop: 4,
  fontFamily: "DM Sans, sans-serif",
};

const daysRowStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(4, 1fr)",
  gap: 8,
  marginBottom: 16,
};

const dayCardStyle: React.CSSProperties = {
  background: "var(--ls-surface2)",
  border: "1px solid var(--ls-border)",
  borderRadius: 12,
  padding: "12px 6px",
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  gap: 6,
};

const dayLabelStyle: React.CSSProperties = {
  fontSize: 11,
  fontWeight: 700,
  letterSpacing: 1,
  color: "var(--ls-text-muted)",
  textTransform: "uppercase",
  fontFamily: "DM Sans, sans-serif",
};

const dayEmojiStyle: React.CSSProperties = {
  fontSize: 26,
  lineHeight: 1,
};

const dayTempStyle: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  gap: 2,
  fontFamily: "'JetBrains Mono', monospace",
};

const tempMaxStyle: React.CSSProperties = {
  fontSize: 14,
  fontWeight: 700,
  color: "var(--ls-text-strong)",
};

const tempMinStyle: React.CSSProperties = {
  fontSize: 12,
  color: "var(--ls-text-muted)",
};

const footerStyle: React.CSSProperties = {
  fontSize: 11,
  color: "var(--ls-text-muted)",
  textAlign: "center",
  paddingTop: 8,
  borderTop: "1px solid var(--ls-border)",
  fontFamily: "DM Sans, sans-serif",
};

const titleStyle: React.CSSProperties = {
  fontFamily: "Syne, sans-serif",
  fontSize: 18,
  fontWeight: 700,
  margin: "8px 0 4px",
  color: "var(--ls-text-strong)",
};

const subtitleStyle: React.CSSProperties = {
  fontSize: 13,
  color: "var(--ls-text-muted)",
  textAlign: "center",
  fontFamily: "DM Sans, sans-serif",
  margin: "4px 0 12px",
  maxWidth: 320,
  lineHeight: 1.5,
};

const ctaStyle: React.CSSProperties = {
  background: "linear-gradient(180deg, #EF9F27, #BA7517)",
  color: "white",
  textDecoration: "none",
  padding: "10px 18px",
  borderRadius: 10,
  fontWeight: 700,
  fontSize: 13,
  fontFamily: "DM Sans, sans-serif",
};

const emptyStateStyle: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  justifyContent: "center",
  padding: "24px 12px",
  textAlign: "center",
};
