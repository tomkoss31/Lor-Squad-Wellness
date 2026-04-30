// useSessionTracker V2 (2026-04-30) — tracking duree des sessions user.
//
// Au mount du AppLayout :
//   - Insert une row dans user_sessions (started_at = now())
//   - Capture l'id retourne
//
// Au unmount / blur / hidden :
//   - Update la row avec ended_at = now() + duration_seconds calcule
//
// V2 (2026-04-30) :
//   - Anti-spam reduit a 5s (au lieu de 30s) pour eviter les "trous" si
//     un insert echoue
//   - Logs explicites en cas d'erreur RLS / fetch
//   - Verification que la session inseree existe avant heartbeat

import { useEffect, useRef } from "react";
import { useAppContext } from "../../../context/AppContext";
import { getSupabaseClient } from "../../../services/supabaseClient";

const MIN_NEW_SESSION_GAP_MS = 5_000; // 5s anti-spam (V2 reduit de 30s)
const HEARTBEAT_INTERVAL_MS = 60_000; // 1 min pour update duration_seconds en live

/**
 * Detection device_type via navigator.userAgent (V3 — 2026-04-30).
 * 'mobile' = iPhone / Android phone
 * 'tablet' = iPad / Android tablet
 * 'desktop' = autre (PC, Mac, Linux, etc)
 */
function detectDeviceType(): "desktop" | "mobile" | "tablet" {
  if (typeof navigator === "undefined") return "desktop";
  const ua = navigator.userAgent || "";
  // Tablet d'abord (iPad peut matcher "Mobile" sur iPad OS 13+ desktop mode)
  if (/iPad|Android(?!.*Mobile)|Tablet/i.test(ua)) return "tablet";
  if (/iPhone|iPod|Android.*Mobile|Mobile/i.test(ua)) return "mobile";
  return "desktop";
}

export function useSessionTracker() {
  const { currentUser } = useAppContext();
  const userId = currentUser?.id ?? null;
  const sessionIdRef = useRef<string | null>(null);
  const startedAtRef = useRef<number>(Date.now());

  useEffect(() => {
    if (!userId) {
      console.info("[useSessionTracker] no userId yet, skipping");
      return;
    }
    let cancelled = false;
    let heartbeatTimer: number | null = null;

    async function startSession() {
      try {
        const sb = await getSupabaseClient();
        if (!sb) {
          console.warn("[useSessionTracker] supabase client unavailable");
          return;
        }
        if (cancelled) return;

        // Anti-spam court : si une session a ete demarree il y a < 5s par cet onglet,
        // on ne re-cree pas (cas refresh / navigation rapide).
        const lastStartStr = sessionStorage.getItem("ls-last-session-start");
        const lastIdStr = sessionStorage.getItem("ls-last-session-id");
        if (lastStartStr && lastIdStr) {
          const lastStart = parseInt(lastStartStr, 10);
          if (Date.now() - lastStart < MIN_NEW_SESSION_GAP_MS) {
            // Verifier que la session existe encore en DB avant de reutiliser
            const { data: existing } = await sb
              .from("user_sessions")
              .select("id")
              .eq("id", lastIdStr)
              .maybeSingle();
            if (existing && !cancelled) {
              console.info("[useSessionTracker] reuse session", lastIdStr);
              sessionIdRef.current = lastIdStr;
              startedAtRef.current = lastStart;
              return;
            }
          }
        }

        // Insert nouvelle session avec device_type detecte
        const deviceType = detectDeviceType();
        const { data, error } = await sb
          .from("user_sessions")
          .insert({ user_id: userId, device_type: deviceType })
          .select("id, started_at")
          .single();
        if (error) {
          console.error("[useSessionTracker] INSERT FAILED:", error.message, error);
          return;
        }
        if (cancelled || !data) return;
        const inserted = data as { id: string; started_at: string };
        sessionIdRef.current = inserted.id;
        startedAtRef.current = new Date(inserted.started_at).getTime();
        sessionStorage.setItem("ls-last-session-id", inserted.id);
        sessionStorage.setItem("ls-last-session-start", String(startedAtRef.current));
        console.info("[useSessionTracker] new session created", inserted.id);
      } catch (err) {
        console.error("[useSessionTracker] start exception:", err);
      }
    }

    async function endSession(reason: string) {
      const id = sessionIdRef.current;
      if (!id) return;
      try {
        const sb = await getSupabaseClient();
        if (!sb) return;
        const now = new Date();
        const duration = Math.max(1, Math.floor((now.getTime() - startedAtRef.current) / 1000));
        const { error } = await sb
          .from("user_sessions")
          .update({
            ended_at: now.toISOString(),
            duration_seconds: duration,
          })
          .eq("id", id);
        if (error) {
          console.warn("[useSessionTracker] end UPDATE failed:", error.message);
        } else {
          console.info(`[useSessionTracker] session ended (${reason}, ${duration}s)`);
        }
      } catch (err) {
        console.warn("[useSessionTracker] end exception:", err);
      }
    }

    async function heartbeat() {
      const id = sessionIdRef.current;
      if (!id) return;
      try {
        const sb = await getSupabaseClient();
        if (!sb) return;
        const now = Date.now();
        const duration = Math.max(1, Math.floor((now - startedAtRef.current) / 1000));
        const { error } = await sb
          .from("user_sessions")
          .update({ duration_seconds: duration })
          .eq("id", id);
        if (error) {
          console.warn("[useSessionTracker] heartbeat UPDATE failed:", error.message);
        }
      } catch (err) {
        console.warn("[useSessionTracker] heartbeat exception:", err);
      }
    }

    void startSession();

    // Heartbeat toutes les minutes pour que les stats temps reel soient a jour
    heartbeatTimer = window.setInterval(() => {
      void heartbeat();
    }, HEARTBEAT_INTERVAL_MS);

    // Visibility change : update duration quand l onglet devient hidden
    const handleVisibility = () => {
      if (document.visibilityState === "hidden") {
        void heartbeat(); // update sans set ended_at (l onglet peut revenir)
      } else if (document.visibilityState === "visible" && sessionIdRef.current === null) {
        // Si l'onglet redevient visible et qu'on a pas de session, on recree
        void startSession();
      }
    };
    // beforeunload : finaliser duration_seconds
    const handleBeforeUnload = () => {
      void endSession("beforeunload");
    };

    document.addEventListener("visibilitychange", handleVisibility);
    window.addEventListener("beforeunload", handleBeforeUnload);

    return () => {
      cancelled = true;
      if (heartbeatTimer !== null) window.clearInterval(heartbeatTimer);
      document.removeEventListener("visibilitychange", handleVisibility);
      window.removeEventListener("beforeunload", handleBeforeUnload);
      void endSession("cleanup");
    };
  }, [userId]);
}
