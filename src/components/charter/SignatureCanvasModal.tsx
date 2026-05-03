// Modale signature canvas — utilise react-signature-canvas.
// Le user signe avec son doigt (touch) ou la souris, on récupère
// la dataURL PNG (transparent) qui est ensuite stockée en DB.

import { useRef, useState } from "react";
import SignatureCanvas from "react-signature-canvas";

interface Props {
  open: boolean;
  title: string;
  onClose: () => void;
  onSave: (dataUrl: string) => Promise<void> | void;
}

export function SignatureCanvasModal({ open, title, onClose, onSave }: Props) {
  const sigRef = useRef<SignatureCanvas | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!open) return null;

  function handleClear() {
    sigRef.current?.clear();
  }

  async function handleSave() {
    setError(null);
    if (!sigRef.current || sigRef.current.isEmpty()) {
      setError("Signe avant de valider.");
      return;
    }
    setSaving(true);
    try {
      // toDataURL renvoie un PNG transparent en base64.
      const dataUrl = sigRef.current.getCanvas().toDataURL("image/png");
      await onSave(dataUrl);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur de sauvegarde.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(13, 10, 6, 0.78)",
        backdropFilter: "blur(8px)",
        zIndex: 9999,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 20,
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: "#FBF7E9",
          border: "1px solid #B8922A",
          borderRadius: 12,
          padding: 24,
          maxWidth: 560,
          width: "100%",
          boxShadow: "0 24px 80px rgba(0,0,0,0.5)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          style={{
            fontFamily: "'Cinzel', serif",
            fontSize: 11,
            letterSpacing: 4,
            color: "#8B6F1F",
            textTransform: "uppercase",
            fontWeight: 600,
            marginBottom: 8,
            textAlign: "center",
          }}
        >
          ✦ Signature ✦
        </div>
        <h3
          style={{
            fontFamily: "'Cormorant Garamond', serif",
            fontSize: 24,
            fontWeight: 700,
            color: "#2A2419",
            margin: 0,
            textAlign: "center",
            fontStyle: "italic",
          }}
        >
          {title}
        </h3>
        <p
          style={{
            fontFamily: "'Cormorant Garamond', serif",
            fontStyle: "italic",
            fontSize: 13,
            color: "#4A3F2A",
            textAlign: "center",
            margin: "10px 0 18px",
          }}
        >
          Signe dans le cadre ci-dessous (souris ou doigt sur tactile).
        </p>

        <div
          style={{
            background: "#FFFCF0",
            border: "1px dashed #B8922A",
            borderRadius: 4,
            padding: 4,
          }}
        >
          <SignatureCanvas
            ref={sigRef}
            penColor="#1D9E75"
            canvasProps={{
              width: 510,
              height: 200,
              style: {
                width: "100%",
                height: 200,
                display: "block",
                touchAction: "none",
              },
            }}
            backgroundColor="rgba(255, 252, 240, 0)"
          />
        </div>

        {error && (
          <div style={{ color: "#D85A30", fontSize: 12, marginTop: 8, textAlign: "center" }}>
            {error}
          </div>
        )}

        <div
          style={{
            display: "flex",
            gap: 10,
            marginTop: 18,
            flexWrap: "wrap",
            justifyContent: "center",
          }}
        >
          <button
            type="button"
            onClick={handleClear}
            disabled={saving}
            style={btnGhost}
          >
            Effacer
          </button>
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            style={btnGhost}
          >
            Annuler
          </button>
          <button
            type="button"
            onClick={() => void handleSave()}
            disabled={saving}
            style={{
              padding: "12px 24px",
              borderRadius: 8,
              border: "none",
              background: saving
                ? "#888"
                : "linear-gradient(135deg, #B8922A, #8B6F1F)",
              color: "#FFF8E0",
              fontFamily: "'Cinzel', serif",
              fontSize: 12,
              fontWeight: 700,
              letterSpacing: 1.5,
              textTransform: "uppercase",
              cursor: saving ? "wait" : "pointer",
              boxShadow: "0 4px 14px rgba(184, 146, 42, 0.4)",
            }}
          >
            {saving ? "Enregistrement…" : "✓ Valider"}
          </button>
        </div>
      </div>
    </div>
  );
}

const btnGhost: React.CSSProperties = {
  padding: "12px 18px",
  borderRadius: 8,
  border: "1px solid #B8922A",
  background: "transparent",
  color: "#8B6F1F",
  fontFamily: "'Cinzel', serif",
  fontSize: 11,
  fontWeight: 600,
  letterSpacing: 1.5,
  textTransform: "uppercase",
  cursor: "pointer",
};
