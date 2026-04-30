// NotificationsTab — preferences notif user (2026-04-30)
// Toggles dans Parametres pour personnaliser les pushs reçues.

import { useEffect, useState } from "react";
import { useAppContext } from "../../context/AppContext";
import { useToast } from "../../context/ToastContext";
import { getSupabaseClient } from "../../services/supabaseClient";

interface Prefs {
  notif_messages: boolean;
  notif_rdv_imminent: boolean;
  notif_morning_digest: boolean;
  notif_quiet_hours: boolean;
  notif_message_batching_min: number;
}

const DEFAULTS: Prefs = {
  notif_messages: true,
  notif_rdv_imminent: true,
  notif_morning_digest: true,
  notif_quiet_hours: false,
  notif_message_batching_min: 5,
};

export function NotificationsTab() {
  const { currentUser } = useAppContext();
  const { push: pushToast } = useToast();
  const [prefs, setPrefs] = useState<Prefs>(DEFAULTS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!currentUser?.id) return;
    let cancelled = false;
    void (async () => {
      try {
        const sb = await getSupabaseClient();
        if (!sb) return;
        const { data, error } = await sb
          .from("users")
          .select("notif_messages, notif_rdv_imminent, notif_morning_digest, notif_quiet_hours, notif_message_batching_min")
          .eq("id", currentUser.id)
          .maybeSingle();
        if (cancelled) return;
        if (error) {
          console.warn("[NotificationsTab] fetch failed:", error.message);
        } else if (data) {
          setPrefs({
            notif_messages: (data as { notif_messages?: boolean }).notif_messages ?? true,
            notif_rdv_imminent: (data as { notif_rdv_imminent?: boolean }).notif_rdv_imminent ?? true,
            notif_morning_digest: (data as { notif_morning_digest?: boolean }).notif_morning_digest ?? true,
            notif_quiet_hours: (data as { notif_quiet_hours?: boolean }).notif_quiet_hours ?? false,
            notif_message_batching_min: (data as { notif_message_batching_min?: number }).notif_message_batching_min ?? 5,
          });
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [currentUser?.id]);

  async function handleSave() {
    if (!currentUser?.id) return;
    setSaving(true);
    try {
      const sb = await getSupabaseClient();
      if (!sb) throw new Error("Supabase indisponible.");
      const { error } = await sb.from("users").update(prefs).eq("id", currentUser.id);
      if (error) throw error;
      pushToast({
        tone: "success",
        title: "Préférences enregistrées",
        message: "Tes notifications sont à jour.",
      });
    } catch (err) {
      pushToast({
        tone: "error",
        title: "Échec",
        message: err instanceof Error ? err.message : "unknown",
      });
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div style={{ padding: 20, color: "var(--ls-text-muted)", fontSize: 13, textAlign: "center" }}>
        Chargement…
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      {/* Hero */}
      <div
        style={{
          padding: "16px 20px",
          background: "var(--ls-surface)",
          border: "0.5px solid color-mix(in srgb, var(--ls-purple) 25%, var(--ls-border))",
          borderLeft: "3px solid var(--ls-purple)",
          borderRadius: 16,
        }}
      >
        <div
          style={{
            fontSize: 10,
            letterSpacing: 1.6,
            textTransform: "uppercase",
            fontWeight: 700,
            color: "var(--ls-purple)",
            marginBottom: 4,
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
          }}
        >
          <span aria-hidden>🔔</span> Notifications
        </div>
        <h2
          style={{
            fontFamily: "Syne, serif",
            fontWeight: 800,
            fontSize: 19,
            color: "var(--ls-text)",
            margin: "0 0 6px 0",
            letterSpacing: "-0.01em",
          }}
        >
          Tes préférences push
        </h2>
        <p
          style={{
            fontSize: 12.5,
            color: "var(--ls-text-muted)",
            lineHeight: 1.55,
            margin: 0,
            fontFamily: "DM Sans, sans-serif",
          }}
        >
          Ajuste quelles notifications tu reçois et à quel rythme. Les changements s'appliquent immédiatement.
        </p>
      </div>

      {/* Toggles */}
      <Card>
        <ToggleRow
          emoji="💬"
          label="Messages clients"
          subtitle="Reçois une notif quand un client t'écrit"
          checked={prefs.notif_messages}
          onChange={(v) => setPrefs((p) => ({ ...p, notif_messages: v }))}
        />
        {prefs.notif_messages && (
          <BatchingPicker
            minutes={prefs.notif_message_batching_min}
            onChange={(min) => setPrefs((p) => ({ ...p, notif_message_batching_min: min }))}
          />
        )}
        <ToggleRow
          emoji="📅"
          label="RDV imminents"
          subtitle="Alerte 5 min avant chaque RDV planifié"
          checked={prefs.notif_rdv_imminent}
          onChange={(v) => setPrefs((p) => ({ ...p, notif_rdv_imminent: v }))}
        />
        <ToggleRow
          emoji="🌅"
          label="Digest matin"
          subtitle="Récap quotidien à 7h00 (RDV, suivis à faire, alertes)"
          checked={prefs.notif_morning_digest}
          onChange={(v) => setPrefs((p) => ({ ...p, notif_morning_digest: v }))}
          last={prefs.notif_messages || prefs.notif_rdv_imminent ? false : true}
        />
        <ToggleRow
          emoji="🌙"
          label="Mode silencieux 22h–7h"
          subtitle="Pas de push pendant la nuit (digest matin reste actif)"
          checked={prefs.notif_quiet_hours}
          onChange={(v) => setPrefs((p) => ({ ...p, notif_quiet_hours: v }))}
          last
        />
      </Card>

      {/* Save */}
      <div style={{ display: "flex", justifyContent: "flex-end" }}>
        <button
          type="button"
          onClick={() => void handleSave()}
          disabled={saving}
          style={{
            padding: "11px 22px",
            borderRadius: 999,
            border: "none",
            background: "linear-gradient(135deg, #EF9F27 0%, #BA7517 100%)",
            color: "#FFFFFF",
            fontSize: 13,
            fontWeight: 700,
            cursor: saving ? "wait" : "pointer",
            fontFamily: "DM Sans, sans-serif",
            boxShadow: "0 6px 16px -4px rgba(186,117,23,0.45), inset 0 1px 0 rgba(255,255,255,0.20)",
            opacity: saving ? 0.6 : 1,
          }}
        >
          {saving ? "Enregistrement…" : "💾 Enregistrer"}
        </button>
      </div>

      {/* Note finale */}
      <div
        style={{
          padding: "12px 14px",
          background: "color-mix(in srgb, var(--ls-gold) 6%, var(--ls-surface))",
          border: "0.5px dashed color-mix(in srgb, var(--ls-gold) 30%, transparent)",
          borderRadius: 12,
          fontSize: 11.5,
          color: "var(--ls-text-muted)",
          lineHeight: 1.55,
          fontFamily: "DM Sans, sans-serif",
        }}
      >
        💡 <strong>Astuce</strong> : pour recevoir les pushs sur ton téléphone, installe l'app comme PWA (sidebar → bouton "Installer Lor'Squad"). Les notifs Web Push fonctionnent uniquement en mode PWA installée sur iOS.
      </div>
    </div>
  );
}

function Card({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        background: "var(--ls-surface)",
        border: "0.5px solid var(--ls-border)",
        borderRadius: 16,
        overflow: "hidden",
      }}
    >
      {children}
    </div>
  );
}

function ToggleRow({
  emoji,
  label,
  subtitle,
  checked,
  onChange,
  last,
}: {
  emoji: string;
  label: string;
  subtitle: string;
  checked: boolean;
  onChange: (v: boolean) => void;
  last?: boolean;
}) {
  return (
    <div
      style={{
        padding: "14px 18px",
        display: "flex",
        alignItems: "center",
        gap: 12,
        borderBottom: last ? "none" : "0.5px solid var(--ls-border)",
        cursor: "pointer",
      }}
      onClick={() => onChange(!checked)}
    >
      <span style={{ fontSize: 22, flexShrink: 0 }}>{emoji}</span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            fontFamily: "Syne, serif",
            fontWeight: 700,
            fontSize: 14,
            color: "var(--ls-text)",
            letterSpacing: "-0.01em",
          }}
        >
          {label}
        </div>
        <div
          style={{
            fontSize: 11.5,
            color: "var(--ls-text-muted)",
            marginTop: 2,
            fontFamily: "DM Sans, sans-serif",
            lineHeight: 1.45,
          }}
        >
          {subtitle}
        </div>
      </div>
      {/* Toggle pill */}
      <div
        style={{
          width: 44,
          height: 24,
          borderRadius: 999,
          background: checked
            ? "linear-gradient(135deg, var(--ls-teal) 0%, color-mix(in srgb, var(--ls-teal) 70%, #000) 100%)"
            : "var(--ls-surface2)",
          border: checked ? "none" : "0.5px solid var(--ls-border)",
          position: "relative",
          transition: "background 0.2s ease",
          flexShrink: 0,
          boxShadow: checked ? "0 4px 10px -3px rgba(45,212,191,0.40)" : "none",
        }}
      >
        <div
          style={{
            width: 18,
            height: 18,
            borderRadius: "50%",
            background: "#FFFFFF",
            position: "absolute",
            top: 2.5,
            left: checked ? 22 : 2.5,
            transition: "left 0.2s ease",
            boxShadow: "0 2px 4px rgba(0,0,0,0.18)",
          }}
        />
      </div>
    </div>
  );
}

function BatchingPicker({
  minutes,
  onChange,
}: {
  minutes: number;
  onChange: (min: number) => void;
}) {
  const options = [
    { value: 0, label: "Instantané", subtitle: "1 push par message" },
    { value: 5, label: "5 minutes", subtitle: "groupe les messages dans une fenêtre 5 min" },
    { value: 15, label: "15 minutes", subtitle: "regroupement plus large" },
    { value: 30, label: "30 minutes", subtitle: "minimum d'interruption" },
  ];
  return (
    <div
      style={{
        padding: "12px 18px",
        background: "color-mix(in srgb, var(--ls-purple) 5%, var(--ls-surface2))",
        borderBottom: "0.5px solid var(--ls-border)",
      }}
    >
      <div
        style={{
          fontSize: 10,
          letterSpacing: 1.4,
          textTransform: "uppercase",
          fontWeight: 700,
          color: "var(--ls-purple)",
          marginBottom: 8,
          fontFamily: "DM Sans, sans-serif",
        }}
      >
        ⏱️ Regroupement messages
      </div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
        {options.map((opt) => {
          const isActive = minutes === opt.value;
          return (
            <button
              key={opt.value}
              type="button"
              onClick={() => onChange(opt.value)}
              title={opt.subtitle}
              style={{
                padding: "7px 13px",
                borderRadius: 999,
                border: isActive
                  ? "0.5px solid color-mix(in srgb, var(--ls-purple) 50%, transparent)"
                  : "0.5px solid var(--ls-border)",
                background: isActive
                  ? "linear-gradient(135deg, color-mix(in srgb, var(--ls-purple) 14%, var(--ls-surface)) 0%, var(--ls-surface) 100%)"
                  : "var(--ls-surface)",
                color: isActive ? "var(--ls-purple)" : "var(--ls-text-muted)",
                fontSize: 11.5,
                fontWeight: isActive ? 700 : 500,
                cursor: "pointer",
                fontFamily: "DM Sans, sans-serif",
                transition: "transform 0.15s ease",
              }}
            >
              {opt.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
