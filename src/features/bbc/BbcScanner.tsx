// =============================================================================
// BbcScanner — scan caméra du QR membre → valide une visite (chantier BBC).
// Le membre montre son QR (= son token PWA) ; le coach scanne ; on appelle le
// RPC bbc_scan_visit (résout token → client, vérifie l'appartenance, +1 visite).
// Décodage via l'API native BarcodeDetector (Chrome/Android/Edge). Fallback :
// message clair si le navigateur ne la supporte pas (ex. iOS Safari).
// =============================================================================

import { useCallback, useEffect, useRef, useState } from "react";
import { getSupabaseClient } from "../../services/supabaseClient";

interface BbcScannerProps {
  onClose: () => void;
  onScanned?: () => void;
}

interface DetectedCode {
  rawValue: string;
}

export function BbcScanner({ onClose, onScanned }: BbcScannerProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const rafRef = useRef<number | null>(null);
  const busyRef = useRef(false);
  const lastRef = useRef<{ value: string; at: number }>({ value: "", at: 0 });
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<string | null>(null);
  const [supported, setSupported] = useState(true);

  const handleValue = useCallback(
    async (raw: string) => {
      const now = Date.now();
      if (busyRef.current) return;
      // anti-doublon : même QR dans les 4s → ignore.
      if (raw === lastRef.current.value && now - lastRef.current.at < 4000) return;
      busyRef.current = true;
      lastRef.current = { value: raw, at: now };
      try {
        const sb = await getSupabaseClient();
        if (!sb) return;
        const { data, error: rpcErr } = await sb.rpc("bbc_scan_visit", { p_token: raw });
        if (rpcErr) {
          setResult("❌ QR non reconnu");
        } else {
          const r = data as { client_name?: string; visits?: number } | null;
          setResult(`✅ ${r?.client_name ?? "membre"} · ${r?.visits ?? "?"} visite${(r?.visits ?? 0) > 1 ? "s" : ""}`);
          onScanned?.();
        }
      } catch {
        setResult("❌ erreur, réessaie");
      } finally {
        window.setTimeout(() => {
          setResult(null);
          busyRef.current = false;
        }, 1800);
      }
    },
    [onScanned],
  );

  useEffect(() => {
    let cancelled = false;
    const DetectorCtor = (window as unknown as { BarcodeDetector?: new (o: { formats: string[] }) => { detect: (s: CanvasImageSource) => Promise<DetectedCode[]> } }).BarcodeDetector;
    if (!DetectorCtor) {
      setSupported(false);
      return;
    }
    const detector = new DetectorCtor({ formats: ["qr_code"] });

    void (async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play().catch(() => undefined);
        }
        const loop = async () => {
          if (cancelled || !videoRef.current) return;
          try {
            const codes = await detector.detect(videoRef.current);
            if (codes.length && codes[0].rawValue) void handleValue(codes[0].rawValue);
          } catch {
            /* frame non prête — ignore */
          }
          rafRef.current = requestAnimationFrame(() => void loop());
        };
        void loop();
      } catch {
        setError("Impossible d'accéder à la caméra. Autorise l'accès dans ton navigateur.");
      }
    })();

    return () => {
      cancelled = true;
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      streamRef.current?.getTracks().forEach((t) => t.stop());
    };
  }, [handleValue]);

  return (
    <div className="bbc-mode" style={{ position: "fixed", inset: 0, zIndex: 1400, background: "#000", display: "flex", flexDirection: "column" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "calc(14px + env(safe-area-inset-top)) 18px 12px", color: "#FBF7F0" }}>
        <div style={{ fontFamily: "var(--ls-bbc-font-display)", fontSize: 20, color: "var(--ls-bbc-lime)" }}>Scanner un membre</div>
        <button type="button" onClick={onClose} aria-label="Fermer" style={{ width: 38, height: 38, borderRadius: 12, border: "1px solid rgba(255,255,255,.2)", background: "rgba(255,255,255,.08)", color: "#FBF7F0", cursor: "pointer", fontSize: 17 }}>✕</button>
      </div>

      <div style={{ flex: 1, position: "relative", display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden" }}>
        {supported && !error ? (
          <>
            <video ref={videoRef} playsInline muted style={{ width: "100%", height: "100%", objectFit: "cover" }} />
            {/* viseur */}
            <div style={{ position: "absolute", width: 230, height: 230, borderRadius: 24, border: "3px solid var(--ls-bbc-lime)", boxShadow: "0 0 0 9999px rgba(0,0,0,.45)" }} />
          </>
        ) : (
          <div style={{ padding: "40px 24px", textAlign: "center", color: "#FBF7F0", maxWidth: 340 }}>
            <div style={{ fontSize: 30, marginBottom: 12 }} aria-hidden="true">📷</div>
            <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 8 }}>{error ? "Caméra indisponible" : "Scan non supporté ici"}</div>
            <div style={{ fontSize: 13, color: "rgba(251,247,240,.7)", lineHeight: 1.5 }}>
              {error ?? "Ton navigateur ne gère pas le scan QR (souvent iOS Safari). Utilise le device du club (Android/Chrome), ou pointe le membre manuellement depuis l'onglet Le club."}
            </div>
          </div>
        )}
      </div>

      <div style={{ padding: "14px 18px calc(24px + env(safe-area-inset-bottom))", textAlign: "center", color: "#FBF7F0" }}>
        {result ? (
          <div style={{ display: "inline-block", padding: "12px 18px", borderRadius: 14, background: result.startsWith("✅") ? "var(--ls-bbc-lime)" : "var(--ls-bbc-coral)", color: result.startsWith("✅") ? "var(--ls-bbc-lime-ink)" : "#fff", fontWeight: 700, fontSize: 14 }}>{result}</div>
        ) : (
          <div style={{ fontSize: 13, color: "rgba(251,247,240,.7)" }}>place le QR du membre dans le cadre</div>
        )}
      </div>
    </div>
  );
}
