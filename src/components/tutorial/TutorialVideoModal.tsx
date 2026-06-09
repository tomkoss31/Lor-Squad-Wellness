// =============================================================================
// TutorialVideoModal — modale vidéo YouTube réutilisable (#6, 2026-06-09).
// Overlay sombre + iframe 16/9 + titre. Fermeture clic-hors / Échap.
// Logique d'extraction d'ID centralisée dans data/tutorials.ts.
// =============================================================================

import { useEffect } from "react";
import { youtubeIdFromUrl } from "../../data/tutorials";

interface Props {
  youtubeUrl: string;
  title?: string;
  description?: string;
  onClose: () => void;
}

export function TutorialVideoModal({ youtubeUrl, title, description, onClose }: Props) {
  // Échap pour fermer (en plus du clic sur l'overlay).
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const id = youtubeIdFromUrl(youtubeUrl);
  const embedUrl = id
    ? `https://www.youtube.com/embed/${id}?autoplay=1&rel=0`
    : youtubeUrl;

  return (
    <div
      role="button"
      tabIndex={0}
      aria-label="Fermer la vidéo"
      onClick={onClose}
      onKeyDown={(e) => {
        if (e.key === "Escape") onClose();
      }}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.85)",
        backdropFilter: "blur(6px)",
        WebkitBackdropFilter: "blur(6px)",
        zIndex: 10000,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: 16,
        gap: 14,
      }}
    >
      {title ? (
        <div
          onClick={(e) => e.stopPropagation()}
          onKeyDown={(e) => e.stopPropagation()}
          role="presentation"
          style={{ width: "100%", maxWidth: 900, textAlign: "left" }}
        >
          <div
            style={{
              fontFamily: "Syne, sans-serif",
              fontSize: 18,
              fontWeight: 700,
              color: "#FBF7F0",
            }}
          >
            {title}
          </div>
          {description ? (
            <div style={{ fontSize: 13, color: "rgba(251,247,240,0.7)", marginTop: 2 }}>
              {description}
            </div>
          ) : null}
        </div>
      ) : null}

      <div
        role="dialog"
        aria-modal="true"
        aria-label={title ?? "Tutoriel vidéo"}
        onClick={(e) => e.stopPropagation()}
        onKeyDown={(e) => e.stopPropagation()}
        style={{
          width: "100%",
          maxWidth: 900,
          aspectRatio: "16/9",
          borderRadius: 16,
          overflow: "hidden",
          boxShadow: "0 24px 64px rgba(0,0,0,0.5)",
          background: "#000",
        }}
      >
        <iframe
          src={embedUrl}
          title={title ?? "Tutoriel"}
          width="100%"
          height="100%"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
          style={{ border: "none", display: "block" }}
        />
      </div>

      <button
        type="button"
        onClick={onClose}
        style={{
          background: "rgba(255,255,255,0.1)",
          color: "#FBF7F0",
          border: "1px solid rgba(255,255,255,0.2)",
          borderRadius: 999,
          padding: "8px 18px",
          fontSize: 13,
          fontFamily: "DM Sans, sans-serif",
          fontWeight: 600,
          cursor: "pointer",
        }}
      >
        Fermer ✕
      </button>
    </div>
  );
}
