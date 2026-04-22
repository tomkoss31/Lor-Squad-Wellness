// Chantier Messagerie bidirectionnelle (2026-04-22) — commit 5/6.
// CTA discret en haut de l'app client pour activer les notifs push. Affiché
// UNIQUEMENT si :
//   - Le navigateur supporte les push (serviceWorker + PushManager + Notif)
//   - La permission est 'default' (ni accordée ni refusée)
//
// Si déjà accordée → on souscrit silencieusement au premier rendu puis
// l'UI disparaît. Si refusée → on disparaît aussi (l'user ne veut pas).
//
// Souscription via RPC SECURITY DEFINER upsert_client_push_subscription_by_token
// pour contourner RLS sans ouvrir la table à l'anon complet.

import { useEffect, useState } from "react";
import { getSupabaseClient } from "../../services/supabaseClient";

const VAPID_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY ?? "";

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = atob(base64);
  const arr = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) arr[i] = rawData.charCodeAt(i);
  return arr;
}

async function subscribeAndStore(token: string): Promise<"ok" | "skipped" | "error"> {
  try {
    if (!VAPID_KEY) return "error";
    if (typeof window === "undefined") return "skipped";
    if (!("serviceWorker" in navigator) || !("PushManager" in window)) return "skipped";

    const reg = await navigator.serviceWorker.ready;
    let subscription = await reg.pushManager.getSubscription();
    if (!subscription) {
      subscription = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        // Cast pour TS 5.6 qui se plaint de ArrayBufferLike vs ArrayBuffer.
        applicationServerKey: urlBase64ToUint8Array(VAPID_KEY) as unknown as ArrayBuffer,
      });
    }
    const json = subscription.toJSON();

    const sb = await getSupabaseClient();
    if (!sb) return "error";
    const { error } = await sb.rpc("upsert_client_push_subscription_by_token", {
      p_token: token,
      p_endpoint: json.endpoint ?? "",
      p_p256dh: json.keys?.p256dh ?? "",
      p_auth: json.keys?.auth ?? "",
      p_user_agent: typeof navigator !== "undefined" ? navigator.userAgent : null,
    });
    if (error) return "error";
    return "ok";
  } catch {
    return "error";
  }
}

type OptInState = "hidden" | "prompt" | "subscribing" | "done" | "failed";

export function ClientPushOptIn({ token, coachFirstName }: { token: string; coachFirstName: string }) {
  const [state, setState] = useState<OptInState>("hidden");

  useEffect(() => {
    if (typeof window === "undefined") return;
    const supported =
      "Notification" in window &&
      "serviceWorker" in navigator &&
      "PushManager" in window;
    if (!supported) return;

    const perm = Notification.permission;
    if (perm === "granted") {
      // Déjà accordée → souscrire en silence au premier render.
      void subscribeAndStore(token).then((r) => {
        if (r === "ok") setState("done");
        else setState("hidden");
      });
      return;
    }
    if (perm === "denied") {
      setState("hidden");
      return;
    }
    // default → montrer le prompt
    setState("prompt");
  }, [token]);

  async function handleActivate() {
    setState("subscribing");
    try {
      const perm = await Notification.requestPermission();
      if (perm !== "granted") {
        setState("failed");
        return;
      }
      const result = await subscribeAndStore(token);
      setState(result === "ok" ? "done" : "failed");
    } catch {
      setState("failed");
    }
  }

  if (state === "hidden" || state === "done") return null;

  if (state === "failed") {
    return (
      <div
        role="status"
        style={{
          padding: "10px 14px",
          background: "rgba(220,38,38,0.08)",
          border: "1px solid rgba(220,38,38,0.2)",
          borderRadius: 12,
          color: "#B91C1C",
          fontSize: 12,
          margin: "12px 16px 0",
        }}
      >
        Impossible d'activer les notifications. Vérifie les paramètres de ton
        navigateur.
      </div>
    );
  }

  return (
    <div
      style={{
        margin: "12px 16px 0",
        padding: "12px 14px",
        background: "linear-gradient(135deg, #FFFBEB 0%, #FEF3C7 100%)",
        border: "1px solid rgba(184,146,42,0.3)",
        borderRadius: 14,
        display: "flex",
        alignItems: "center",
        gap: 12,
      }}
    >
      <div
        aria-hidden="true"
        style={{
          width: 34,
          height: 34,
          borderRadius: 10,
          background: "#B8922A",
          color: "#FFFFFF",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 16,
          flexShrink: 0,
        }}
      >
        🔔
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            fontFamily: "Syne, sans-serif",
            fontSize: 13,
            fontWeight: 700,
            color: "#633806",
            marginBottom: 2,
          }}
        >
          Active les notifications
        </div>
        <div style={{ fontSize: 11, color: "#854F0B", lineHeight: 1.4 }}>
          Reçois un ping quand {coachFirstName} te répond — en temps réel.
        </div>
      </div>
      <button
        type="button"
        onClick={() => void handleActivate()}
        disabled={state === "subscribing"}
        style={{
          padding: "8px 14px",
          borderRadius: 10,
          background: "#B8922A",
          color: "#FFFFFF",
          border: "none",
          fontSize: 12,
          fontWeight: 600,
          fontFamily: "DM Sans, sans-serif",
          cursor: state === "subscribing" ? "default" : "pointer",
          flexShrink: 0,
        }}
      >
        {state === "subscribing" ? "…" : "Activer"}
      </button>
    </div>
  );
}
