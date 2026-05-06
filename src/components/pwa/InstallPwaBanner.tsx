// Hotfix client-login + PWA install (2026-04-24).
// Bannière dismissable au-dessus de ClientAppPage qui invite à installer
// la PWA si pas encore faite. État dismiss persisté en localStorage
// (pwa_banner_dismissed=true).

import { useEffect, useState } from "react";
import { InstallPwaInstructions } from "./InstallPwaInstructions";
import { detectDevice, isStandalonePwa } from "../../lib/utils/detectDevice";

const DISMISS_KEY = "pwa_banner_dismissed";

export function InstallPwaBanner() {
  const [mounted, setMounted] = useState(false);
  const [visible, setVisible] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);

  useEffect(() => {
    setMounted(true);
    if (typeof window === "undefined") return;
    if (isStandalonePwa()) return;
    const dismissed = window.localStorage.getItem(DISMISS_KEY);
    if (dismissed === "true") return;
    setVisible(true);
  }, []);

  useEffect(() => {
    if (!modalOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [modalOpen]);

  function dismiss() {
    setVisible(false);
    try {
      window.localStorage.setItem(DISMISS_KEY, "true");
    } catch {
      // quota / mode privé : on ignore silencieusement
    }
  }

  if (!mounted || !visible) return null;

  return (
    <>
      <div
        style={{
          padding: "12px 14px",
          background: "linear-gradient(135deg, rgba(16,185,129,0.08) 0%, rgba(6,182,212,0.06) 50%, rgba(139,92,246,0.05) 100%)",
          borderBottom: "1px solid rgba(16,185,129,0.20)",
          display: "flex",
          alignItems: "center",
          gap: 10,
          fontFamily: "Inter, system-ui, sans-serif",
        }}
      >
        <span
          aria-hidden="true"
          style={{
            width: 28,
            height: 28,
            borderRadius: 8,
            background: "linear-gradient(135deg, #10B981 0%, #06B6D4 100%)",
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 14,
            flexShrink: 0,
            boxShadow: "0 2px 8px rgba(16,185,129,0.20)",
          }}
        >
          📱
        </span>
        <span style={{ flex: 1, minWidth: 0, fontSize: 13, color: "#0F172A", fontWeight: 500 }}>
          Installe l'app pour un accès rapide
        </span>
        <button
          type="button"
          onClick={() => setModalOpen(true)}
          style={{
            padding: "7px 14px",
            borderRadius: 10,
            background: "linear-gradient(135deg, #10B981 0%, #06B6D4 50%, #8B5CF6 100%)",
            color: "#FFFFFF",
            border: "none",
            fontSize: 12,
            fontFamily: "Sora, system-ui, sans-serif",
            fontWeight: 600,
            cursor: "pointer",
            flexShrink: 0,
            boxShadow: "0 2px 8px rgba(16,185,129,0.25)",
          }}
        >
          Voir comment
        </button>
        <button
          type="button"
          onClick={dismiss}
          aria-label="Fermer"
          style={{
            width: 28,
            height: 28,
            borderRadius: 8,
            border: "none",
            background: "transparent",
            color: "#64748B",
            cursor: "pointer",
            fontSize: 16,
            lineHeight: 1,
            flexShrink: 0,
          }}
        >
          ×
        </button>
      </div>

      {modalOpen ? (
        <div
          role="button"
          tabIndex={0}
          aria-label="Fermer"
          onClick={() => setModalOpen(false)}
          onKeyDown={(e) => {
            if (e.key === "Escape") setModalOpen(false);
          }}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.55)",
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
            aria-label="Installer l'application"
            onClick={(e) => e.stopPropagation()}
            onKeyDown={(e) => e.stopPropagation()}
            style={{
              background: "#FFFFFF",
              borderRadius: 18,
              maxWidth: 420,
              width: "100%",
              padding: 24,
              boxShadow: "0 20px 60px rgba(0,0,0,0.4)",
            }}
          >
            <InstallPwaInstructions device={detectDevice()} />
            <div style={{ marginTop: 18, textAlign: "right" }}>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                style={{
                  padding: "10px 16px",
                  borderRadius: 10,
                  background: "#BA7517",
                  color: "#FFFFFF",
                  border: "none",
                  fontFamily: "DM Sans, sans-serif",
                  fontWeight: 600,
                  fontSize: 13,
                  cursor: "pointer",
                }}
              >
                J'ai compris
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
