// =============================================================================
// ClientMoodCheckIn — widget mood quotidien (Tier B Module 2, 2026-04-28)
// =============================================================================
//
// Affiche sur l Accueil "Comment tu te sens aujourd'hui ?" avec 5 emojis
// cliquables. Au click :
//   1. RPC record_client_mood(token, mood_key) → upsert + trigger +5 XP
//   2. UI passe en "merci pour ton retour" + texte contextuel selon mood
//   3. Si mood "tough" / "tired" → CTA "Parler à ton coach" → navigate
//      vers messagerie
//
// Invisible si mood deja saisi aujourd hui (avec possibilite de modifier
// via "Changer mon mood").
// =============================================================================

import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getSupabaseClient } from "../../services/supabaseClient";

interface Props {
  token: string;
}

type MoodKey = "great" | "good" | "okay" | "tired" | "tough";

interface MoodDef {
  key: MoodKey;
  emoji: string;
  label: string;
  message: string;
  tone: "teal" | "gold" | "neutral" | "purple" | "coral";
  showCoachCta?: boolean;
}

const MOODS: MoodDef[] = [
  {
    key: "great",
    emoji: "🔥",
    label: "Au top",
    message: "Génial ! Garde ce momentum, tu es sur la bonne voie.",
    tone: "teal",
  },
  {
    key: "good",
    emoji: "🙂",
    label: "Bien",
    message: "Très bien, continue comme ça !",
    tone: "teal",
  },
  {
    key: "okay",
    emoji: "😐",
    label: "Comme ça",
    message: "Une journée moyenne, c'est normal. Demain sera mieux.",
    tone: "neutral",
  },
  {
    key: "tired",
    emoji: "😴",
    label: "Fatigué.e",
    message:
      "Repose-toi bien. Hydrate-toi, dors plus si possible. Tu veux en parler à ton coach ?",
    tone: "purple",
    showCoachCta: true,
  },
  {
    key: "tough",
    emoji: "😣",
    label: "Difficile",
    message:
      "Désolé que ce soit difficile. Tu n'es pas seul.e — on peut en parler ?",
    tone: "coral",
    showCoachCta: true,
  },
];

export function ClientMoodCheckIn({ token }: Props) {
  const navigate = useNavigate();
  const [todayMood, setTodayMood] = useState<MoodKey | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [showEditor, setShowEditor] = useState(false);

  // Fetch initial mood today
  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    void (async () => {
      try {
        const sb = await getSupabaseClient();
        if (!sb) return;
        const { data } = await sb.rpc("get_client_mood_today", { p_token: token });
        if (cancelled) return;
        const payload = (data ?? {}) as { mood_key?: MoodKey | null; has_today?: boolean };
        if (payload.mood_key) setTodayMood(payload.mood_key);
      } catch (err) {
        console.warn("[MoodCheckIn] fetch failed:", err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [token]);

  async function pickMood(mood: MoodKey) {
    if (submitting) return;
    setSubmitting(true);
    try {
      const sb = await getSupabaseClient();
      if (!sb) return;
      await sb.rpc("record_client_mood", {
        p_token: token,
        p_mood_key: mood,
        p_comment: null,
      });
      setTodayMood(mood);
      setShowEditor(false);
    } catch (err) {
      console.warn("[MoodCheckIn] submit failed:", err);
    } finally {
      setSubmitting(false);
    }
  }

  function goToMessages() {
    navigate(`/client/${token}?tab=messages`);
  }

  if (loading) return null;

  // Mode "deja saisi aujourd hui" sans editor ouvert
  if (todayMood && !showEditor) {
    const def = MOODS.find((m) => m.key === todayMood);
    if (!def) return null;
    return (
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 12,
          padding: "12px 14px",
          background:
            def.tone === "teal"
              ? "rgba(29,158,117,0.08)"
              : def.tone === "purple"
                ? "rgba(127,119,221,0.08)"
                : def.tone === "coral"
                  ? "rgba(220,38,38,0.06)"
                  : "rgba(184,146,42,0.06)",
          border: `0.5px solid ${
            def.tone === "teal"
              ? "rgba(29,158,117,0.25)"
              : def.tone === "purple"
                ? "rgba(127,119,221,0.25)"
                : def.tone === "coral"
                  ? "rgba(220,38,38,0.25)"
                  : "rgba(184,146,42,0.25)"
          }`,
          borderRadius: 14,
          marginBottom: 14,
          fontFamily: "DM Sans, sans-serif",
        }}
      >
        <span style={{ fontSize: 26, lineHeight: 1 }}>{def.emoji}</span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div
            style={{
              fontSize: 12,
              color: "#6B6B62",
              fontFamily: "DM Sans, sans-serif",
            }}
          >
            Aujourd&apos;hui · <strong>{def.label}</strong>
          </div>
          <div style={{ fontSize: 12, color: "#374151", marginTop: 2, lineHeight: 1.4 }}>
            {def.message}
          </div>
        </div>
        <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
          {def.showCoachCta ? (
            <button
              type="button"
              onClick={goToMessages}
              style={{
                padding: "6px 11px",
                background: "linear-gradient(135deg, #EF9F27 0%, #BA7517 100%)",
                color: "white",
                border: "none",
                borderRadius: 8,
                fontSize: 11,
                fontWeight: 700,
                fontFamily: "Syne, serif",
                cursor: "pointer",
              }}
            >
              💬 Parler
            </button>
          ) : null}
          <button
            type="button"
            onClick={() => setShowEditor(true)}
            style={{
              padding: "6px 10px",
              background: "transparent",
              color: "#888",
              border: "0.5px solid rgba(0,0,0,0.12)",
              borderRadius: 8,
              fontSize: 10,
              cursor: "pointer",
              fontFamily: "DM Sans, sans-serif",
            }}
          >
            Changer
          </button>
        </div>
      </div>
    );
  }

  // Mode "saisie" : 5 emojis cliquables
  return (
    <div
      style={{
        background:
          "linear-gradient(135deg, rgba(255,255,255,1) 0%, rgba(252,245,225,0.7) 100%)",
        border: "0.5px solid rgba(184,146,42,0.30)",
        borderRadius: 14,
        padding: "14px 14px",
        marginBottom: 14,
        fontFamily: "DM Sans, sans-serif",
      }}
    >
      <div
        style={{
          fontSize: 11,
          letterSpacing: 1.4,
          textTransform: "uppercase",
          color: "#B8922A",
          fontWeight: 700,
          marginBottom: 10,
        }}
      >
        😊 Comment tu te sens aujourd&apos;hui ?
      </div>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(5, 1fr)",
          gap: 6,
        }}
      >
        {MOODS.map((m) => (
          <button
            key={m.key}
            type="button"
            onClick={() => void pickMood(m.key)}
            disabled={submitting}
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 4,
              padding: "10px 4px",
              background: "white",
              border: "0.5px solid rgba(0,0,0,0.06)",
              borderRadius: 10,
              cursor: submitting ? "wait" : "pointer",
              fontFamily: "inherit",
              transition: "transform 120ms ease, background 120ms ease",
            }}
            onMouseEnter={(e) => {
              if (submitting) return;
              e.currentTarget.style.transform = "translateY(-2px)";
              e.currentTarget.style.background = "rgba(184,146,42,0.04)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = "translateY(0)";
              e.currentTarget.style.background = "white";
            }}
          >
            <span style={{ fontSize: 26, lineHeight: 1 }}>{m.emoji}</span>
            <span
              style={{
                fontSize: 9,
                fontWeight: 600,
                color: "#374151",
                fontFamily: "DM Sans, sans-serif",
                textAlign: "center",
              }}
            >
              {m.label}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
