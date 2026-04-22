// Chantier Centre de Formation V1 (2026-04-23).
// Modale YouTube embed + bouton "J'ai terminé" qui marque la ressource
// comme vue via le hook useTraining.markCompleted.

import { useEffect, useMemo } from "react";
import { Button } from "../ui/Button";

/** Extract YouTube video id from an URL (watch?v=, youtu.be/, /embed/). */
function extractYouTubeId(url: string | null): string | null {
  if (!url) return null;
  try {
    const u = new URL(url);
    const host = u.hostname.replace(/^www\./, "");
    if (host === "youtu.be") {
      return u.pathname.slice(1) || null;
    }
    if (host.endsWith("youtube.com")) {
      if (u.pathname === "/watch") {
        return u.searchParams.get("v");
      }
      if (u.pathname.startsWith("/embed/")) {
        return u.pathname.split("/")[2] ?? null;
      }
      if (u.pathname.startsWith("/shorts/")) {
        return u.pathname.split("/")[2] ?? null;
      }
    }
  } catch {
    // fallthrough
  }
  return null;
}

export function VideoPlayerModal({
  open,
  title,
  videoUrl,
  onClose,
  onCompleted,
  alreadyCompleted,
}: {
  open: boolean;
  title: string;
  videoUrl: string | null;
  onClose: () => void;
  onCompleted: () => void;
  alreadyCompleted: boolean;
}) {
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  const embedUrl = useMemo(() => {
    const id = extractYouTubeId(videoUrl);
    return id ? `https://www.youtube.com/embed/${id}?rel=0&modestbranding=1` : null;
  }, [videoUrl]);

  if (!open) return null;

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
        background: "rgba(0,0,0,0.7)",
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
        aria-label={title}
        onClick={(e) => e.stopPropagation()}
        onKeyDown={(e) => e.stopPropagation()}
        style={{
          background: "#FFFFFF",
          borderRadius: 14,
          maxWidth: 820,
          width: "100%",
          overflow: "hidden",
          boxShadow: "0 20px 60px rgba(0,0,0,0.5)",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "12px 16px",
            borderBottom: "1px solid rgba(0,0,0,0.08)",
          }}
        >
          <p
            style={{
              fontFamily: "Syne, sans-serif",
              fontSize: 14,
              fontWeight: 700,
              color: "#111827",
              margin: 0,
            }}
          >
            {title}
          </p>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fermer"
            style={{
              width: 30,
              height: 30,
              borderRadius: 8,
              border: "none",
              background: "transparent",
              color: "#6B7280",
              cursor: "pointer",
              fontSize: 18,
              lineHeight: 1,
            }}
          >
            ✕
          </button>
        </div>

        <div
          style={{
            position: "relative",
            width: "100%",
            aspectRatio: "16 / 9",
            background: "#000000",
          }}
        >
          {embedUrl ? (
            <iframe
              src={embedUrl}
              title={title}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              style={{ position: "absolute", inset: 0, width: "100%", height: "100%", border: 0 }}
            />
          ) : (
            <div
              style={{
                position: "absolute",
                inset: 0,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#FFFFFF",
                fontSize: 13,
                padding: 24,
                textAlign: "center",
              }}
            >
              URL vidéo invalide. Contacte l'admin pour mettre à jour cette ressource.
            </div>
          )}
        </div>

        <div
          style={{
            padding: "12px 16px",
            display: "flex",
            justifyContent: "flex-end",
            gap: 8,
            borderTop: "1px solid rgba(0,0,0,0.08)",
          }}
        >
          <Button variant="secondary" onClick={onClose}>
            Fermer
          </Button>
          {alreadyCompleted ? (
            <Button onClick={onClose}>
              ✓ Déjà vu — Fermer
            </Button>
          ) : (
            <Button onClick={onCompleted}>
              J'ai terminé
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

export { extractYouTubeId };
