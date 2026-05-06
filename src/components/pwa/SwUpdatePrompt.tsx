// =============================================================================
// SwUpdatePrompt — détection de mise à jour Service Worker (2026-05-06)
//
// Quand on déploie une nouvelle version de l'app (ex: rebrand, fix, feature),
// le browser télécharge le nouveau `sw.js` mais le garde en état "waiting"
// derrière l'ancien SW actif. Sans ce composant, l'user reste sur l'ancienne
// version visuelle/JS jusqu'à ce qu'il ferme COMPLÈTEMENT toutes les tabs et
// la PWA — ce qui peut prendre des jours.
//
// Solution : on écoute `registration.waiting`. Dès qu'un nouveau SW est en
// attente, on affiche un toast en bas de l'écran "Mise à jour disponible →
// Cliquer pour activer". Click → on poke le SW avec `skipWaiting` + reload.
//
// Bonus : pour les utilisateurs qui avaient activé les notifs avec
// l'ancien SW, leur endpoint Apple Push est obsolète (le nouveau SW
// génère un nouvel endpoint au re-install). Donc après update, on
// déclenche un FORCE RE-SUBSCRIBE silencieux pour préserver leurs
// notifications.
// =============================================================================

import { useEffect, useState } from "react";
import { getSupabaseClient } from "../../services/supabaseClient";

const VAPID_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY ?? "";

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) outputArray[i] = rawData.charCodeAt(i);
  return outputArray;
}

interface Props {
  /** User ID si connecte (pour re-subscribe automatique apres update). */
  userId?: string;
  userName?: string;
}

export function SwUpdatePrompt({ userId, userName }: Props) {
  const [waitingWorker, setWaitingWorker] = useState<ServiceWorker | null>(null);
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;
    let cancelled = false;

    void navigator.serviceWorker.ready.then((reg) => {
      if (cancelled) return;

      // 1. SW deja en attente au mount
      if (reg.waiting) {
        setWaitingWorker(reg.waiting);
      }

      // 2. Nouveau SW detecte (updatefound = browser telecharge nouveau sw.js)
      reg.addEventListener("updatefound", () => {
        const newWorker = reg.installing;
        if (!newWorker) return;
        newWorker.addEventListener("statechange", () => {
          if (
            newWorker.state === "installed" &&
            navigator.serviceWorker.controller
          ) {
            // Un controlleur existe deja (= ancien SW) ET un nouveau est
            // installe -> nouveau en attente.
            setWaitingWorker(newWorker);
          }
        });
      });

      // 3. Check toutes les 60s pour les updates (au cas ou updatefound miss)
      const interval = window.setInterval(() => {
        void reg.update();
      }, 60_000);
      return () => window.clearInterval(interval);
    });

    return () => {
      cancelled = true;
    };
  }, []);

  /**
   * Apres update : si le user avait des notifs actives, on force une
   * re-subscription silencieuse pour ne pas perdre les notifs.
   */
  async function rebindNotifications() {
    if (!userId || !VAPID_KEY) return;
    try {
      const reg = await navigator.serviceWorker.ready;
      const existingSub = await reg.pushManager.getSubscription();
      if (!existingSub) return; // user pas abonne, rien a faire

      // Unsubscribe puis resubscribe pour avoir un endpoint frais
      await existingSub.unsubscribe();
      const newSub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_KEY) as unknown as BufferSource,
      });

      const sb = await getSupabaseClient();
      if (!sb) return;

      const json = newSub.toJSON();
      // Delete les anciennes subs pour cet user (cleanup orphans)
      await sb.from("push_subscriptions").delete().eq("user_id", userId);
      // Insert la nouvelle
      await sb.from("push_subscriptions").insert({
        user_id: userId,
        endpoint: json.endpoint,
        p256dh: json.keys?.p256dh ?? "",
        auth: json.keys?.auth ?? "",
        user_name: userName ?? null,
        updated_at: new Date().toISOString(),
      });
      console.info("[sw-update] notifications rebind OK");
    } catch (err) {
      console.warn("[sw-update] rebind notifications failed:", err);
    }
  }

  async function handleUpdate() {
    if (!waitingWorker || updating) return;
    setUpdating(true);

    // 1. Tell new SW to take control
    waitingWorker.postMessage({ type: "SKIP_WAITING" });

    // 2. Reload quand le nouveau SW prend le controle
    let reloaded = false;
    navigator.serviceWorker.addEventListener("controllerchange", () => {
      if (reloaded) return;
      reloaded = true;
      // Avant reload : rebind notifs si user en avait
      void rebindNotifications().finally(() => {
        window.location.reload();
      });
    });

    // Fallback : si controllerchange ne fire pas dans 2s, force reload
    window.setTimeout(() => {
      if (!reloaded) {
        reloaded = true;
        void rebindNotifications().finally(() => {
          window.location.reload();
        });
      }
    }, 2000);
  }

  if (!waitingWorker) return null;

  return (
    <>
      <style>{`
        @keyframes lb360-update-slide-up {
          from { opacity: 0; transform: translate(-50%, 20px); }
          to { opacity: 1; transform: translate(-50%, 0); }
        }
      `}</style>
      <div
        role="alert"
        style={{
          position: "fixed",
          bottom: 24,
          left: "50%",
          transform: "translateX(-50%)",
          zIndex: 99999,
          maxWidth: "calc(100vw - 32px)",
          width: 360,
          background: "#FFFFFF",
          borderRadius: 16,
          padding: "14px 16px",
          boxShadow:
            "0 10px 32px rgba(15,23,42,0.18), 0 4px 12px rgba(16,185,129,0.10)",
          border: "1px solid rgba(16,185,129,0.30)",
          display: "flex",
          alignItems: "center",
          gap: 12,
          fontFamily: "Inter, system-ui, sans-serif",
          animation: "lb360-update-slide-up 320ms ease-out both",
        }}
      >
        {/* Icone logo orbe G3 pulsant */}
        <div
          style={{
            position: "relative",
            width: 40,
            height: 40,
            flexShrink: 0,
          }}
        >
          <div
            aria-hidden="true"
            style={{
              position: "absolute",
              inset: -4,
              borderRadius: "50%",
              background:
                "radial-gradient(circle, rgba(16,185,129,0.30) 0%, transparent 70%)",
              animation: "lb360-update-pulse 1.6s ease-in-out infinite",
              filter: "blur(4px)",
            }}
          />
          <img
            src="/brand/labase360/app-icon-512.svg"
            alt=""
            style={{
              position: "relative",
              width: 40,
              height: 40,
              borderRadius: 10,
            }}
          />
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
          <div
            style={{
              fontFamily: "Sora, system-ui, sans-serif",
              fontWeight: 700,
              fontSize: 13,
              color: "#0F172A",
              letterSpacing: "-0.01em",
              marginBottom: 2,
            }}
          >
            ✨ Mise à jour disponible
          </div>
          <div
            style={{
              fontSize: 11.5,
              color: "#64748B",
              lineHeight: 1.4,
            }}
          >
            La Base 360 a évolué. Active la nouvelle version maintenant.
          </div>
        </div>

        <button
          type="button"
          onClick={() => void handleUpdate()}
          disabled={updating}
          style={{
            flexShrink: 0,
            padding: "10px 16px",
            borderRadius: 10,
            background:
              "linear-gradient(135deg, #10B981 0%, #06B6D4 50%, #8B5CF6 100%)",
            border: "none",
            color: "#FFFFFF",
            fontFamily: "Sora, system-ui, sans-serif",
            fontWeight: 600,
            fontSize: 12,
            cursor: updating ? "wait" : "pointer",
            boxShadow: "0 2px 8px rgba(16,185,129,0.25)",
            opacity: updating ? 0.7 : 1,
          }}
        >
          {updating ? "…" : "Activer"}
        </button>
      </div>
    </>
  );
}
