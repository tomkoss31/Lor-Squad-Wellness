// Gamification 6 - Recap semaine derniere partageable (2026-04-29).
// Card affichee sur /team admin. Visuel synthetique 1:1 carré (parfait
// pour partage groupes WhatsApp / Insta) + 3 boutons partage :
//   1. 💬 WhatsApp : ouvre wa.me avec texte preformat
//   2. 📋 Copier le texte
//   3. 🖼️ Telecharger PNG (capture html2canvas du visuel)

import { useEffect, useRef, useState } from "react";
import { getSupabaseClient } from "../../../services/supabaseClient";

interface TopRow {
  name: string;
  count: number;
}

interface RecapData {
  loading: boolean;
  error: string | null;
  weekStart: Date | null;
  weekEnd: Date | null;
  totalBilans: number;
  totalMessages: number;
  totalNewClients: number;
  topBilans: TopRow[];
  topMessages: TopRow[];
}

function formatRange(start: Date | null, end: Date | null): string {
  if (!start || !end) return "—";
  const opts: Intl.DateTimeFormatOptions = { day: "numeric", month: "short" };
  return `${start.toLocaleDateString("fr-FR", opts)} – ${end.toLocaleDateString("fr-FR", opts)}`;
}

function buildShareText(data: RecapData): string {
  const range = formatRange(data.weekStart, data.weekEnd);
  const lines: string[] = [];
  lines.push(`📊 Récap Lor'Squad — semaine ${range}`);
  lines.push("");
  lines.push("📈 Total équipe :");
  lines.push(`• ${data.totalBilans} bilan${data.totalBilans > 1 ? "s" : ""} créé${data.totalBilans > 1 ? "s" : ""}`);
  lines.push(`• ${data.totalMessages} message${data.totalMessages > 1 ? "s" : ""} échangé${data.totalMessages > 1 ? "s" : ""}`);
  lines.push(`• ${data.totalNewClients} nouveau${data.totalNewClients > 1 ? "x" : ""} client${data.totalNewClients > 1 ? "s" : ""}`);
  lines.push("");
  if (data.topBilans.length > 0) {
    lines.push("🏆 Top bilans :");
    const medals = ["🥇", "🥈", "🥉"];
    data.topBilans.forEach((r, i) => {
      lines.push(`${medals[i] ?? `${i + 1}.`} ${r.name} — ${r.count} bilan${r.count > 1 ? "s" : ""}`);
    });
    lines.push("");
  }
  if (data.topMessages.length > 0) {
    lines.push("💬 Top messages :");
    const medals = ["🥇", "🥈", "🥉"];
    data.topMessages.forEach((r, i) => {
      lines.push(`${medals[i] ?? `${i + 1}.`} ${r.name} — ${r.count} msg${r.count > 1 ? "s" : ""}`);
    });
    lines.push("");
  }
  lines.push("#LorSquadWellness #LorSquadAcademy");
  return lines.join("\n");
}

export function WeeklyRecapCard() {
  const [data, setData] = useState<RecapData>({
    loading: true,
    error: null,
    weekStart: null,
    weekEnd: null,
    totalBilans: 0,
    totalMessages: 0,
    totalNewClients: 0,
    topBilans: [],
    topMessages: [],
  });
  const [downloading, setDownloading] = useState(false);
  const [copied, setCopied] = useState(false);
  const captureRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const sb = await getSupabaseClient();
        if (!sb) return;
        const { data: rows, error } = await sb.rpc("get_last_week_recap");
        if (cancelled) return;
        if (error) {
          setData((d) => ({ ...d, loading: false, error: error.message }));
          return;
        }
        const row = Array.isArray(rows) && rows.length > 0 ? rows[0] : null;
        if (!row) {
          setData((d) => ({ ...d, loading: false }));
          return;
        }
        const r = row as {
          week_start: string;
          week_end: string;
          total_bilans: number;
          total_messages: number;
          total_new_clients: number;
          top_bilans: TopRow[];
          top_messages: TopRow[];
        };
        setData({
          loading: false,
          error: null,
          weekStart: r.week_start ? new Date(r.week_start) : null,
          weekEnd: r.week_end ? new Date(r.week_end) : null,
          totalBilans: r.total_bilans ?? 0,
          totalMessages: r.total_messages ?? 0,
          totalNewClients: r.total_new_clients ?? 0,
          topBilans: Array.isArray(r.top_bilans) ? r.top_bilans : [],
          topMessages: Array.isArray(r.top_messages) ? r.top_messages : [],
        });
      } catch (err) {
        if (!cancelled) {
          setData((d) => ({
            ...d,
            loading: false,
            error: err instanceof Error ? err.message : "unknown",
          }));
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const text = buildShareText(data);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      alert("Impossible de copier. Sélectionne le texte manuellement.");
    }
  }

  function handleWhatsApp() {
    const url = `https://wa.me/?text=${encodeURIComponent(text)}`;
    window.open(url, "_blank", "noopener,noreferrer");
  }

  async function handleDownloadImage() {
    if (!captureRef.current) return;
    setDownloading(true);
    try {
      const html2canvas = (await import("html2canvas")).default;
      const canvas = await html2canvas(captureRef.current, {
        scale: 2.5,
        backgroundColor: null,
        useCORS: true,
        logging: false,
      });
      canvas.toBlob((blob) => {
        if (!blob) return;
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `recap-lorsquad-${data.weekStart?.toISOString().slice(0, 10) ?? "semaine"}.png`;
        a.click();
        URL.revokeObjectURL(url);
      }, "image/png");
    } catch (err) {
      console.warn("[WeeklyRecap] download failed", err);
      alert("Téléchargement impossible. Réessaie.");
    } finally {
      setDownloading(false);
    }
  }

  if (data.loading || data.error) return null;

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 14,
      }}
    >
      <div>
        <p
          style={{
            fontSize: 11,
            color: "var(--ls-text-muted)",
            textTransform: "uppercase",
            letterSpacing: "0.06em",
            margin: 0,
          }}
        >
          📤 À partager dans tes groupes
        </p>
        <h3
          style={{
            fontFamily: "Syne, serif",
            fontSize: 18,
            fontWeight: 500,
            color: "var(--ls-text)",
            margin: "4px 0 0",
          }}
        >
          Récap semaine dernière
        </h3>
        <p style={{ fontSize: 12, color: "var(--ls-text-muted)", margin: "4px 0 0" }}>
          Du <strong>{formatRange(data.weekStart, data.weekEnd)}</strong> · figé, partageable tel quel
        </p>
      </div>

      {/* Visuel capturable 1:1 (carré, format universel groupes) */}
      <div
        ref={captureRef}
        style={{
          aspectRatio: "1 / 1",
          maxWidth: 540,
          width: "100%",
          margin: "0 auto",
          background: "linear-gradient(135deg, #FAF6E8 0%, #F0E5C8 100%)",
          border: "1.5px solid #B8922A",
          borderRadius: 18,
          padding: "32px 28px",
          display: "flex",
          flexDirection: "column",
          fontFamily: "Georgia, serif",
          color: "#2C2C2A",
          position: "relative",
          overflow: "hidden",
        }}
      >
        {/* Ornement coin gold */}
        <div
          aria-hidden
          style={{
            position: "absolute",
            top: 14,
            left: 14,
            right: 14,
            bottom: 14,
            border: "0.5px solid rgba(184,146,42,0.4)",
            borderRadius: 12,
            pointerEvents: "none",
          }}
        />

        {/* Header */}
        <div style={{ textAlign: "center", marginBottom: 20 }}>
          <div
            style={{
              fontFamily: "system-ui, sans-serif",
              fontSize: 9,
              letterSpacing: "0.4em",
              color: "#B8922A",
              fontWeight: 600,
            }}
          >
            LOR&apos;SQUAD WELLNESS
          </div>
          <h2
            style={{
              fontFamily: "Georgia, serif",
              fontSize: 26,
              fontWeight: 400,
              fontStyle: "italic",
              color: "#2C2C2A",
              margin: "8px 0 0",
              lineHeight: 1.1,
            }}
          >
            Récap de la semaine
          </h2>
          <p
            style={{
              fontFamily: "system-ui, sans-serif",
              fontSize: 11,
              color: "#5C4A0F",
              margin: "6px 0 0",
              fontWeight: 500,
            }}
          >
            {formatRange(data.weekStart, data.weekEnd)}
          </p>
        </div>

        {/* Stats globales */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(3, 1fr)",
            gap: 10,
            marginBottom: 18,
          }}
        >
          <div style={{ background: "white", borderRadius: 10, padding: "10px 8px", textAlign: "center" }}>
            <div style={{ fontSize: 22 }}>📋</div>
            <div style={{ fontFamily: "Syne, serif", fontSize: 22, fontWeight: 700, color: "#B8922A", lineHeight: 1.1, marginTop: 2 }}>
              {data.totalBilans}
            </div>
            <div style={{ fontSize: 9, color: "#888780", textTransform: "uppercase", letterSpacing: "0.05em", marginTop: 2 }}>
              Bilans
            </div>
          </div>
          <div style={{ background: "white", borderRadius: 10, padding: "10px 8px", textAlign: "center" }}>
            <div style={{ fontSize: 22 }}>💬</div>
            <div style={{ fontFamily: "Syne, serif", fontSize: 22, fontWeight: 700, color: "#1D9E75", lineHeight: 1.1, marginTop: 2 }}>
              {data.totalMessages}
            </div>
            <div style={{ fontSize: 9, color: "#888780", textTransform: "uppercase", letterSpacing: "0.05em", marginTop: 2 }}>
              Messages
            </div>
          </div>
          <div style={{ background: "white", borderRadius: 10, padding: "10px 8px", textAlign: "center" }}>
            <div style={{ fontSize: 22 }}>🌱</div>
            <div style={{ fontFamily: "Syne, serif", fontSize: 22, fontWeight: 700, color: "#7F77DD", lineHeight: 1.1, marginTop: 2 }}>
              {data.totalNewClients}
            </div>
            <div style={{ fontSize: 9, color: "#888780", textTransform: "uppercase", letterSpacing: "0.05em", marginTop: 2 }}>
              Nouveaux
            </div>
          </div>
        </div>

        {/* Top 3 bilans */}
        <div style={{ marginBottom: 12 }}>
          <p style={{ fontSize: 10, color: "#5C4A0F", textTransform: "uppercase", letterSpacing: "0.08em", margin: "0 0 6px", fontWeight: 600 }}>
            🏆 Top bilans
          </p>
          {data.topBilans.length === 0 ? (
            <p style={{ fontSize: 12, color: "#888780", fontStyle: "italic", margin: 0 }}>
              Aucun bilan cette semaine.
            </p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              {data.topBilans.map((r, i) => {
                const medal = ["🥇", "🥈", "🥉"][i] ?? `${i + 1}.`;
                return (
                  <div
                    key={r.name}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 10,
                      background: "rgba(184,146,42,0.10)",
                      padding: "6px 10px",
                      borderRadius: 8,
                    }}
                  >
                    <span style={{ fontSize: 14 }}>{medal}</span>
                    <span style={{ flex: 1, fontSize: 12, color: "#2C2C2A", fontWeight: 500, fontFamily: "system-ui, sans-serif" }}>
                      {r.name}
                    </span>
                    <span style={{ fontSize: 12, fontWeight: 700, color: "#B8922A", fontFamily: "Syne, serif" }}>
                      {r.count}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer hashtag */}
        <div
          style={{
            marginTop: "auto",
            paddingTop: 12,
            borderTop: "0.5px solid rgba(184,146,42,0.35)",
            textAlign: "center",
            fontSize: 9,
            letterSpacing: "0.3em",
            color: "#B8922A",
            fontWeight: 600,
            fontFamily: "system-ui, sans-serif",
          }}
        >
          #LORSQUADACADEMY
        </div>
      </div>

      {/* Boutons partage */}
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", justifyContent: "center" }}>
        <button
          type="button"
          onClick={handleWhatsApp}
          style={{
            background: "#25D366",
            color: "white",
            border: "none",
            padding: "10px 16px",
            borderRadius: 10,
            fontSize: 13,
            fontWeight: 600,
            cursor: "pointer",
            fontFamily: "DM Sans, sans-serif",
            display: "flex",
            alignItems: "center",
            gap: 6,
            boxShadow: "0 2px 6px rgba(37,211,102,0.30)",
          }}
        >
          💬 Partager WhatsApp
        </button>
        <button
          type="button"
          onClick={handleCopy}
          style={{
            background: copied ? "#1D9E75" : "var(--ls-surface2)",
            color: copied ? "white" : "var(--ls-text)",
            border: "0.5px solid var(--ls-border)",
            padding: "10px 16px",
            borderRadius: 10,
            fontSize: 13,
            fontWeight: 500,
            cursor: "pointer",
            fontFamily: "DM Sans, sans-serif",
            display: "flex",
            alignItems: "center",
            gap: 6,
          }}
        >
          {copied ? "✓ Copié" : "📋 Copier le texte"}
        </button>
        <button
          type="button"
          onClick={handleDownloadImage}
          disabled={downloading}
          style={{
            background: "linear-gradient(135deg, #EF9F27, #BA7517)",
            color: "white",
            border: "none",
            padding: "10px 16px",
            borderRadius: 10,
            fontSize: 13,
            fontWeight: 600,
            cursor: downloading ? "wait" : "pointer",
            fontFamily: "DM Sans, sans-serif",
            display: "flex",
            alignItems: "center",
            gap: 6,
            boxShadow: "0 2px 6px rgba(186,117,23,0.25)",
            opacity: downloading ? 0.6 : 1,
          }}
        >
          {downloading ? "🖼️ Génération…" : "🖼️ Télécharger PNG"}
        </button>
      </div>
    </div>
  );
}
