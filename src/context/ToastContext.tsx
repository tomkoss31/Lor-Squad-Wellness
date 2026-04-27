import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";

export type ToastTone = "error" | "warning" | "success" | "info";

export interface Toast {
  id: string;
  tone: ToastTone;
  title: string;
  message?: string;
  createdAt: number;
}

interface ToastContextValue {
  toasts: Toast[];
  push: (toast: Omit<Toast, "id" | "createdAt">) => void;
  dismiss: (id: string) => void;
  clear: () => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

// Durations par tone (Polish #6 — 2026-04-29). Standardisation :
//   success / info  = 4s (lecture rapide, message court)
//   warning         = 5s (un peu plus pour le contexte)
//   error           = 6s (plus long pour relire le message d erreur)
const AUTO_DISMISS_MS_BY_TONE: Record<ToastTone, number> = {
  success: 4000,
  info: 4000,
  warning: 5000,
  error: 6000,
};

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const push = useCallback((toast: Omit<Toast, "id" | "createdAt">) => {
    const id = `toast-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const next: Toast = { ...toast, id, createdAt: Date.now() };
    setToasts((prev) => [...prev, next]);
  }, []);

  const dismiss = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const clear = useCallback(() => setToasts([]), []);

  // Auto-dismiss : duration depend du tone du toast.
  useEffect(() => {
    if (toasts.length === 0) return;
    const timers = toasts.map((t) =>
      window.setTimeout(() => dismiss(t.id), AUTO_DISMISS_MS_BY_TONE[t.tone]),
    );
    return () => timers.forEach(window.clearTimeout);
  }, [toasts, dismiss]);

  return (
    <ToastContext.Provider value={{ toasts, push, dismiss, clear }}>
      {children}
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within ToastProvider");
  return ctx;
}

/**
 * Helper pour construire un toast d'erreur à partir d'une exception / d'un
 * retour Supabase `{ error }`. Tombe sur `fallbackMessage` si l'erreur n'est
 * pas parsable.
 *
 * Usage :
 *   try {
 *     const { error } = await sb.from('x').insert(...);
 *     if (error) throw error;
 *   } catch (err) {
 *     push(buildSupabaseErrorToast(err, "Impossible d'enregistrer X."));
 *   }
 */
export function buildSupabaseErrorToast(
  error: unknown,
  fallbackMessage: string
): Omit<Toast, "id" | "createdAt"> {
  const message =
    error instanceof Error
      ? error.message
      : typeof error === "object" && error !== null && "message" in error
        ? String((error as { message: unknown }).message)
        : fallbackMessage;
  return {
    tone: "error",
    title: "Erreur serveur",
    message: message || fallbackMessage,
  };
}
