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

const AUTO_DISMISS_MS = 6000;

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

  // Auto-dismiss après AUTO_DISMISS_MS
  useEffect(() => {
    if (toasts.length === 0) return;
    const timers = toasts.map((t) =>
      window.setTimeout(() => dismiss(t.id), AUTO_DISMISS_MS)
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
