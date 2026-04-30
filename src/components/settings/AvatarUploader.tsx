// AvatarUploader (2026-04-30) — upload avatar user.
// Pas de crop visuel pour MVP : compression auto cote client (canvas)
// + upload Supabase Storage bucket user-avatars (path = userId/avatar.webp).
// Theme-aware var(--ls-*).

import { useRef, useState } from "react";
import { useAppContext } from "../../context/AppContext";
import { getSupabaseClient } from "../../services/supabaseClient";

interface Props {
  /** URL actuelle (null si pas d'avatar). */
  currentUrl: string | null;
  /** Initiales fallback (ex: "TH"). */
  initials: string;
  /** Callback apres upload reussi (url publique). */
  onUploaded: (url: string) => void;
  /** Callback apres remove. */
  onRemoved: () => void;
}

const MAX_SIZE = 256; // px (carre)
const MIME_OUT = "image/webp";
const QUALITY = 0.85;

async function compressImage(file: File): Promise<Blob> {
  // Lecture du fichier
  const dataUrl = await new Promise<string>((resolve, reject) => {
    const fr = new FileReader();
    fr.onload = () => resolve(fr.result as string);
    fr.onerror = reject;
    fr.readAsDataURL(file);
  });

  // Charger dans une img
  const img = await new Promise<HTMLImageElement>((resolve, reject) => {
    const i = new Image();
    i.onload = () => resolve(i);
    i.onerror = reject;
    i.src = dataUrl;
  });

  // Crop carre centre + resize a MAX_SIZE
  const minDim = Math.min(img.width, img.height);
  const sx = (img.width - minDim) / 2;
  const sy = (img.height - minDim) / 2;

  const canvas = document.createElement("canvas");
  canvas.width = MAX_SIZE;
  canvas.height = MAX_SIZE;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("canvas-2d-unavailable");
  ctx.drawImage(img, sx, sy, minDim, minDim, 0, 0, MAX_SIZE, MAX_SIZE);

  // Convert to WebP blob
  const blob = await new Promise<Blob | null>((resolve) => {
    canvas.toBlob((b) => resolve(b), MIME_OUT, QUALITY);
  });
  if (!blob) throw new Error("canvas-toblob-failed");
  return blob;
}

export function AvatarUploader({ currentUrl, initials, onUploaded, onRemoved }: Props) {
  const { currentUser } = useAppContext();
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!currentUser?.id) {
      setError("Reconnecte-toi pour uploader un avatar.");
      return;
    }
    setError(null);
    setUploading(true);

    try {
      const blob = await compressImage(file);
      const sb = await getSupabaseClient();
      if (!sb) throw new Error("Supabase indisponible.");

      // Path : userId/avatar.webp (overwrite a chaque upload)
      const path = `${currentUser.id}/avatar.webp`;
      const { error: upErr } = await sb.storage
        .from("user-avatars")
        .upload(path, blob, {
          contentType: MIME_OUT,
          cacheControl: "3600",
          upsert: true,
        });
      if (upErr) throw upErr;

      // URL publique avec cache-bust
      const { data } = sb.storage.from("user-avatars").getPublicUrl(path);
      const publicUrl = `${data.publicUrl}?t=${Date.now()}`;

      // Update users.avatar_url
      const { error: updErr } = await sb
        .from("users")
        .update({ avatar_url: publicUrl })
        .eq("id", currentUser.id);
      if (updErr) throw updErr;

      onUploaded(publicUrl);
    } catch (err) {
      console.error("[AvatarUploader] upload failed:", err);
      setError(err instanceof Error ? err.message : "Échec de l'upload.");
    } finally {
      setUploading(false);
      // Reset input pour permettre re-upload du meme fichier
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  async function handleRemove() {
    if (!currentUser?.id) return;
    setUploading(true);
    setError(null);
    try {
      const sb = await getSupabaseClient();
      if (!sb) throw new Error("Supabase indisponible.");
      // Remove from storage
      await sb.storage.from("user-avatars").remove([`${currentUser.id}/avatar.webp`]);
      // Clear avatar_url
      const { error: updErr } = await sb
        .from("users")
        .update({ avatar_url: null })
        .eq("id", currentUser.id);
      if (updErr) throw updErr;
      onRemoved();
    } catch (err) {
      console.warn("[AvatarUploader] remove failed:", err);
      setError(err instanceof Error ? err.message : "Échec de la suppression.");
    } finally {
      setUploading(false);
    }
  }

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
      {/* Avatar preview */}
      <div
        role="button"
        tabIndex={0}
        aria-label="Changer l'avatar"
        onClick={() => !uploading && inputRef.current?.click()}
        onKeyDown={(e) => {
          if ((e.key === "Enter" || e.key === " ") && !uploading) {
            e.preventDefault();
            inputRef.current?.click();
          }
        }}
        style={{
          position: "relative",
          width: 96,
          height: 96,
          borderRadius: "50%",
          background: currentUrl
            ? `url(${currentUrl}) center/cover`
            : "linear-gradient(135deg, var(--ls-teal) 0%, color-mix(in srgb, var(--ls-teal) 70%, #000) 100%)",
          color: "#FFFFFF",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: "Syne, serif",
          fontWeight: 800,
          fontSize: 30,
          letterSpacing: "-0.02em",
          cursor: uploading ? "wait" : "pointer",
          boxShadow: "0 8px 22px -6px rgba(45,212,191,0.40), inset 0 2px 0 rgba(255,255,255,0.20)",
          flexShrink: 0,
          transition: "transform 0.15s ease",
        }}
        onMouseEnter={(e) => {
          if (!uploading) e.currentTarget.style.transform = "scale(1.04)";
        }}
        onMouseLeave={(e) => { e.currentTarget.style.transform = "none"; }}
      >
        {!currentUrl && initials}
        {/* Overlay au hover : icone camera */}
        <div
          aria-hidden
          style={{
            position: "absolute",
            inset: 0,
            borderRadius: "50%",
            background: "rgba(0,0,0,0.45)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 24,
            opacity: 0,
            transition: "opacity 0.15s ease",
          }}
          onMouseEnter={(e) => { e.currentTarget.style.opacity = "1"; }}
          onMouseLeave={(e) => { e.currentTarget.style.opacity = "0"; }}
        >
          📷
        </div>
      </div>

      {/* Actions + status */}
      <div style={{ flex: 1, minWidth: 200 }}>
        <div
          style={{
            fontFamily: "Syne, serif",
            fontWeight: 700,
            fontSize: 15,
            color: "var(--ls-text)",
            marginBottom: 4,
            letterSpacing: "-0.01em",
          }}
        >
          Photo de profil
        </div>
        <div
          style={{
            fontSize: 12,
            color: "var(--ls-text-muted)",
            marginBottom: 10,
            fontFamily: "DM Sans, sans-serif",
            lineHeight: 1.5,
          }}
        >
          {uploading
            ? "Upload en cours…"
            : "JPG/PNG/WebP, max 2 Mo. Image carrée recommandée."}
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <button
            type="button"
            disabled={uploading}
            onClick={() => inputRef.current?.click()}
            style={{
              padding: "8px 14px",
              borderRadius: 999,
              border: "none",
              background: "linear-gradient(135deg, #EF9F27 0%, #BA7517 100%)",
              color: "#FFFFFF",
              fontSize: 12,
              fontWeight: 700,
              cursor: uploading ? "wait" : "pointer",
              fontFamily: "DM Sans, sans-serif",
              boxShadow: "0 4px 10px -3px rgba(186,117,23,0.40)",
              opacity: uploading ? 0.6 : 1,
              transition: "transform 0.15s ease, filter 0.15s ease",
            }}
            onMouseEnter={(e) => {
              if (!uploading) {
                e.currentTarget.style.transform = "translateY(-1px)";
                e.currentTarget.style.filter = "brightness(1.08)";
              }
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = "none";
              e.currentTarget.style.filter = "none";
            }}
          >
            {currentUrl ? "🔄 Changer" : "📤 Uploader"}
          </button>
          {currentUrl && (
            <button
              type="button"
              disabled={uploading}
              onClick={() => void handleRemove()}
              style={{
                padding: "8px 14px",
                borderRadius: 999,
                border: "0.5px solid color-mix(in srgb, var(--ls-coral) 35%, transparent)",
                background: "color-mix(in srgb, var(--ls-coral) 10%, transparent)",
                color: "var(--ls-coral)",
                fontSize: 12,
                fontWeight: 600,
                cursor: uploading ? "wait" : "pointer",
                fontFamily: "DM Sans, sans-serif",
                opacity: uploading ? 0.6 : 1,
              }}
            >
              🗑️ Retirer
            </button>
          )}
        </div>
        {error && (
          <div
            style={{
              marginTop: 8,
              fontSize: 11.5,
              color: "var(--ls-coral)",
              fontWeight: 600,
              fontFamily: "DM Sans, sans-serif",
            }}
          >
            ⚠️ {error}
          </div>
        )}
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        onChange={(e) => void handleFileChange(e)}
        style={{ display: "none" }}
      />
    </div>
  );
}
