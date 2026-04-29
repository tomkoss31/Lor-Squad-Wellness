// useSessionTracker (2026-04-29) — tracking duree des sessions user.
//
// Au mount du AppLayout :
//   - Insert une row dans user_sessions (started_at = now())
//   - Capture l'id retourne
//
// Au unmount / blur / hidden :
//   - Update la row avec ended_at = now() + duration_seconds calcule
//
// Anti-spam : on ne cree pas de nouvelle session si une est active
// depuis moins de 30 secondes (= refresh navigation interne).
//
// Note : sur PWA, les events visibilitychange + beforeunload se complementent.

import { useEffect, useRef } from "react";
import { useAppContext } from "../../../context/AppContext";
import { getSupabaseClient } from "../../../services/supabaseClient";

const MIN_NEW_SESSION_GAP_MS = 30_000; // 30s anti-spam refresh
const HEARTBEAT_INTERVAL_MS = 60_000; // 1 min pour update duration_seconds en live

export function useSessionTracker() {
  const { currentUser } = useAppContext();
  const userId = currentUser?.id ?? null;
  const sessionIdRef = useRef<string | null>(null);
  const startedAtRef = useRef<number>(Date.now());

  useEffect(() => {
    if (!userId) return;
    let cancelled = false;
    let heartbeatTimer: number | null = null;

    async function startSession() {
      try {
        // Anti-spam : si une session a ete demarree il y a < 30s par cet onglet,
        // on ne re-cree pas (cas refresh / navigation rapide).
        const lastStartStr = sessionStorage.getItem("ls-last-session-start");
        if (lastStartStr) {
          const lastStart = parseInt(lastStartStr, 10);
          if (Date.now() - lastStart < MIN_NEW_SESSION_GAP_MS) {
            // Reuse la session existante
            const lastIdStr = sessionStorage.getItem("ls-last-session-id");
            if (lastIdStr) {
              sessionIdRef.current = lastIdStr;
              startedAtRef.current = lastStart;
              return;
            }
          }
        }

        const sb = await getSupabaseClient();
        if (!sb || cancelled) return;
        const { data, error } = await sb
          .from("user_sessions")
          .insert({ user_id: userId })
          .select("id, started_at")
          .single();
        if (error) {
          console.warn("[useSessionTracker] insert failed:", error.message);
          return;
        }
        if (cancelled) return;
        sessionIdRef.current = (data as { id: string }).id;
        startedAtRef.current = new Date((data as { started_at: string }).started_at).getTime();
        sessionStorage.setItem("ls-last-session-id", sessionIdRef.current);
        sessionStorage.setItem("ls-last-session-start", String(startedAtRef.current));
      } catch (err) {
        console.warn("[useSessionTracker] start exception:", err);
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
        await sb
          .from("user_sessions")
          .update({
            ended_at: now.toISOString(),
            duration_seconds: duration,
          })
          .eq("id", id);
        // Note : on ne nettoie pas sessionStorage ici car l onglet peut
        // revenir actif (visibilitychange show) et on veut reutiliser.
        void reason;
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
        // On update duration_seconds sans poser ended_at (la session est toujours active)
        await sb
          .from("user_sessions")
          .update({ duration_seconds: duration })
          .eq("id", id);
      } catch (err) {
        console.warn("[useSessionTracker] heartbeat exception:", err);
      }
    }

    void startSession();

    // Heartbeat toutes les minutes pour que les stats temps reel soient a jour
    heartbeatTimer = window.setInterval(() => {
      void heartbeat();
    }, HEARTBEAT_INTERVAL_MS);

    // Visibility change : fermer quand l onglet devient hidden
    const handleVisibility = () => {
      if (document.visibilityState === "hidden") {
        void endSession("visibility-hidden");
      }
    };
    // beforeunload : fermer quand le user ferme l onglet / navigate away
    const handleBeforeUnload = () => {
      // Synchronous final update avec navigator.sendBeacon si dispo
      const id = sessionIdRef.current;
      if (!id) return;
      const now = Date.now();
      const duration = Math.max(1, Math.floor((now - startedAtRef.current) / 1000));
      // sendBeacon est plus fiable que fetch pendant un unload
      try {
        const blob = new Blob(
          [JSON.stringify({ ended_at: new Date().toISOString(), duration_seconds: duration })],
          { type: "application/json" },
        );
        // Pas d API direct sur Supabase pour update via beacon → on tente l update normal
        // qui peut etre coupe, mais ca passe la majorite du temps. Le heartbeat
        // a aussi maintenu duration_seconds a jour avant.
        void blob;
        void endSession("beforeunload");
      } catch {
        // ignore
      }
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
