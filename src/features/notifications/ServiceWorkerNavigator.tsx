// =============================================================================
// ServiceWorkerNavigator — relais entre SW et React Router (2026-05-05)
//
// Le Service Worker (public/sw.js) intercepte le clic sur une notification
// et envoie un postMessage au front : { type: "SW_NAVIGATE", url: "/agenda?…" }
//
// Ce composant écoute ces messages et appelle navigate(url) pour router en
// interne (pas de full reload, transition fluide React Router).
//
// Doit être monté À L'INTÉRIEUR de <BrowserRouter> pour avoir accès à
// useNavigate. Render null — c'est juste un effet.
// =============================================================================

import { useEffect } from "react";
import { useNavigate } from "react-router-dom";

interface SwNavigateMessage {
  type: "SW_NAVIGATE";
  url: string;
}

function isSwNavigateMessage(data: unknown): data is SwNavigateMessage {
  if (!data || typeof data !== "object") return false;
  const m = data as Record<string, unknown>;
  return m.type === "SW_NAVIGATE" && typeof m.url === "string" && m.url.length > 0;
}

export function ServiceWorkerNavigator() {
  const navigate = useNavigate();

  useEffect(() => {
    if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) {
      return;
    }

    const handleMessage = (event: MessageEvent) => {
      if (!isSwNavigateMessage(event.data)) return;
      try {
        // Safety : on ne route que sur des paths internes (commencent par /).
        // Évite tout risque d'open-redirect via une notif craftée.
        const url = event.data.url;
        if (!url.startsWith("/") || url.startsWith("//")) {
          return;
        }
        navigate(url);
      } catch (err) {
        console.warn("[SW navigate] Failed:", err);
      }
    };

    navigator.serviceWorker.addEventListener("message", handleMessage);
    return () => {
      navigator.serviceWorker.removeEventListener("message", handleMessage);
    };
  }, [navigate]);

  return null;
}
