// =============================================================================
// CelebrationCard — anniversaires clients du jour (chantier 2026-05-08)
// =============================================================================
//
// S affiche en haut du Co-pilote coach quand au moins un client a un
// anniversaire aujourd hui (date de naissance OU 1m/3m/6m sur le programme).
//
// Source : RPC get_today_celebrations() qui retourne array de
// {client_id, first_name, last_name, kind, age_now?, since_days?}.
//
// Pour chaque celebration, propose un bouton "Envoyer un message" qui
// ouvre WhatsApp avec un message pre-rempli adapte au type d evenement
// (joyeux anniversaire / 1 mois sur le programme / etc).
//
// Card invisible si zero celebration → no-op visual.
// =============================================================================

import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAppContext } from "../../context/AppContext";
import { getSupabaseClient } from "../../services/supabaseClient";

type CelebrationKind = "birthday" | "program_1m" | "program_3m" | "program_6m";

interface Celebration {
  client_id: string;
  first_name: string;
  last_name: string;
  kind: CelebrationKind;
  age_now?: number;
  since_days?: number;
  birth_date?: string;
  started_at?: string;
}

interface KindMeta {
  emoji: string;
  label: (c: Celebration) => string;
  message: (firstName: string, c: Celebration, coachFirstName: string) => string;
}

const KIND_META: Record<CelebrationKind, KindMeta> = {
  birthday: {
    emoji: "🎉",
    label: (c) => (c.age_now ? `Anniversaire · ${c.age_now} ans` : "Anniversaire"),
    message: (firstName, c, coachFirstName) =>
      `Joyeux anniversaire ${firstName} ! 🎉🎂\n\n${
        c.age_now
          ? `${c.age_now} ans, ça se fête. `
          : ""
      }Je voulais te souhaiter une magnifique journée et continuer cette belle aventure ensemble. Tu fais un super boulot, garde cette énergie 💪\n\nÀ très vite,\n${coachFirstName}`,
  },
  program_1m: {
    emoji: "🌱",
    label: () => "1 mois sur le programme",
    message: (firstName, _c, coachFirstName) =>
      `Hello ${firstName} ! 🌱\n\nÇa fait 1 mois aujourd'hui que tu as démarré ton programme — déjà ! Bravo pour ta régularité, c'est exactement ce qui fait la différence.\n\nDis-moi comment tu te sens, qu'est-ce qui marche bien, ce qu'on peut ajuster ?\n\nFier·e de t'accompagner,\n${coachFirstName}`,
  },
  program_3m: {
    emoji: "🥈",
    label: () => "3 mois sur le programme",
    message: (firstName, _c, coachFirstName) =>
      `${firstName}, tu réalises ? 🥈\n\n3 mois pile aujourd'hui que tu es sur ton programme. La régularité paie, et tu en es la preuve. Je suis vraiment fier·e du chemin parcouru.\n\nOn refait un point ensemble cette semaine pour célébrer + caler la suite ?\n\n${coachFirstName}`,
  },
  program_6m: {
    emoji: "🥇",
    label: () => "6 mois sur le programme",
    message: (firstName, _c, coachFirstName) =>
      `${firstName} 🥇\n\n6 MOIS sur ton programme aujourd'hui. C'est plus qu'une habitude, c'est un mode de vie maintenant. Tu es une référence pour moi et pour les nouveaux qui démarrent.\n\nOn fait un point ensemble cette semaine ? J'aimerais qu'on célèbre ça ensemble.\n\nMerci pour ta confiance,\n${coachFirstName}`,
  },
};

export function CelebrationCard() {
  const navigate = useNavigate();
  const { currentUser, clients } = useAppContext();
  const [celebrations, setCelebrations] = useState<Celebration[] | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!currentUser?.id) return;
    let cancelled = false;
    void (async () => {
      try {
        const sb = await getSupabaseClient();
        if (!sb) return;
        // Pas besoin de passer p_coach_user_id : le RPC utilise
        // auth.uid() par defaut si omis.
        const { data, error } = await sb.rpc("get_today_celebrations");
        if (cancelled) return;
        if (error) {
          console.warn("[CelebrationCard] rpc error:", error.message);
          setCelebrations([]);
          return;
        }
        const payload = (data ?? {}) as { celebrations?: Celebration[] };
        setCelebrations(payload.celebrations ?? []);
      } catch (err) {
        console.warn("[CelebrationCard] fetch failed:", err);
        if (!cancelled) setCelebrations([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [currentUser?.id]);

  // Pas de loading state UI — discret, on attend silencieusement
  if (loading) return null;
  if (!celebrations || celebrations.length === 0) return null;

  const coachFirstName =
    (currentUser?.name ?? "").trim().split(/\s+/)[0] || "Ton coach";

  function getClientPhone(clientId: string): string | null {
    const client = clients?.find((c) => c.id === clientId);
    return client?.phone ?? null;
  }

  function formatPhoneE164(raw: string): string {
    // Normalise : retire espaces/+/-/() et passe en E164 sans '+'
    const digits = raw.replace(/[^\d]/g, "");
    if (digits.startsWith("0")) {
      // Numero français 0X... → 33X...
      return "33" + digits.slice(1);
    }
    return digits;
  }

  function handleSendWhatsApp(c: Celebration) {
    const meta = KIND_META[c.kind];
    const message = meta.message(c.first_name, c, coachFirstName);
    const phone = getClientPhone(c.client_id);
    const phoneE164 = phone ? formatPhoneE164(phone) : "";
    const url = phoneE164
      ? `https://wa.me/${phoneE164}?text=${encodeURIComponent(message)}`
      : `https://wa.me/?text=${encodeURIComponent(message)}`;
    window.open(url, "_blank", "noopener,noreferrer");
  }

  return (
    <section style={cardStyle} className="reveal" aria-label="Célébrations clients aujourd'hui">
      {/* Halo decoratif gold (heritage / chaleur) top-right */}
      <div aria-hidden="true" style={haloStyle} />

      <div style={headerStyle}>
        <div style={eyebrowStyle}>
          <span style={liveDotStyle} />
          🎂 À célébrer aujourd&apos;hui
        </div>
        <div style={countBadgeStyle}>
          {celebrations.length} client{celebrations.length > 1 ? "s" : ""}
        </div>
      </div>

      <div style={listStyle}>
        {celebrations.map((c) => {
          const meta = KIND_META[c.kind];
          return (
            <div key={`${c.client_id}-${c.kind}`} style={rowStyle}>
              <div style={emojiBubbleStyle} aria-hidden="true">
                {meta.emoji}
              </div>
              <div style={infoStyle}>
                <div style={nameStyle}>
                  {c.first_name} {c.last_name}
                </div>
                <div style={kindLabelStyle}>{meta.label(c)}</div>
              </div>
              <div style={actionsStyle}>
                <button
                  type="button"
                  onClick={() => handleSendWhatsApp(c)}
                  style={btnPrimaryStyle}
                  title="Envoyer un message WhatsApp pré-rempli"
                >
                  💬 Envoyer
                </button>
                <button
                  type="button"
                  onClick={() => navigate(`/clients/${c.client_id}`)}
                  style={btnGhostStyle}
                  title="Ouvrir la fiche client"
                >
                  Fiche →
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

// ─── Styles ────────────────────────────────────────────────────────────────

const cardStyle: React.CSSProperties = {
  position: "relative",
  isolation: "isolate",
  overflow: "hidden",
  background:
    "linear-gradient(135deg, color-mix(in srgb, #B8922A 8%, var(--ls-surface)) 0%, color-mix(in srgb, #D4537E 6%, var(--ls-surface)) 100%)",
  border: "1px solid color-mix(in srgb, #B8922A 22%, var(--ls-border))",
  borderRadius: 18,
  padding: "18px 22px",
  marginBottom: 14,
  boxShadow:
    "0 1px 2px rgba(15,23,42,0.04), 0 8px 24px -10px rgba(184,146,42,0.18)",
};

const haloStyle: React.CSSProperties = {
  position: "absolute",
  top: -80,
  right: -60,
  width: 240,
  height: 240,
  background:
    "radial-gradient(circle, color-mix(in srgb, #B8922A 26%, transparent), transparent 65%)",
  pointerEvents: "none",
  zIndex: 0,
  filter: "blur(8px)",
};

const headerStyle: React.CSSProperties = {
  position: "relative",
  zIndex: 1,
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  marginBottom: 14,
  flexWrap: "wrap",
  gap: 10,
};

const eyebrowStyle: React.CSSProperties = {
  fontFamily: "var(--lb360-mono, 'JetBrains Mono', monospace)",
  fontSize: 11,
  letterSpacing: "0.14em",
  textTransform: "uppercase",
  fontWeight: 600,
  color: "color-mix(in srgb, #B8922A 75%, var(--ls-text))",
  display: "inline-flex",
  alignItems: "center",
  gap: 8,
};

const liveDotStyle: React.CSSProperties = {
  width: 7,
  height: 7,
  borderRadius: "50%",
  background: "#B8922A",
  boxShadow: "0 0 0 4px color-mix(in srgb, #B8922A 22%, transparent)",
  display: "inline-block",
};

const countBadgeStyle: React.CSSProperties = {
  fontSize: 11,
  padding: "3px 10px",
  borderRadius: 999,
  background: "color-mix(in srgb, #B8922A 14%, transparent)",
  color: "color-mix(in srgb, #B8922A 85%, var(--ls-text))",
  border: "1px solid color-mix(in srgb, #B8922A 28%, transparent)",
  fontWeight: 700,
  fontFamily: "var(--lb360-mono, 'JetBrains Mono', monospace)",
  letterSpacing: "0.04em",
};

const listStyle: React.CSSProperties = {
  position: "relative",
  zIndex: 1,
  display: "flex",
  flexDirection: "column",
  gap: 8,
};

const rowStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "44px 1fr auto",
  gap: 12,
  alignItems: "center",
  padding: "10px 14px",
  borderRadius: 12,
  background: "color-mix(in srgb, var(--ls-surface) 80%, transparent)",
  border: "1px solid color-mix(in srgb, #B8922A 14%, var(--ls-border))",
};

const emojiBubbleStyle: React.CSSProperties = {
  width: 40,
  height: 40,
  borderRadius: 12,
  background: "color-mix(in srgb, #B8922A 16%, var(--ls-surface))",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontSize: 22,
  flexShrink: 0,
};

const infoStyle: React.CSSProperties = {
  minWidth: 0,
};

const nameStyle: React.CSSProperties = {
  fontFamily: "var(--lb360-display, 'Sora', sans-serif)",
  fontSize: 14,
  fontWeight: 700,
  color: "var(--ls-text)",
  letterSpacing: "-0.005em",
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap",
};

const kindLabelStyle: React.CSSProperties = {
  fontSize: 12,
  color: "var(--ls-text-muted)",
  fontFamily: "var(--lb360-body, 'Inter', sans-serif)",
  marginTop: 2,
};

const actionsStyle: React.CSSProperties = {
  display: "flex",
  gap: 6,
  flexShrink: 0,
};

const btnPrimaryStyle: React.CSSProperties = {
  background:
    "var(--lb360-gradient, linear-gradient(135deg, #10B981 0%, #06B6D4 50%, #8B5CF6 100%))",
  color: "white",
  border: "none",
  padding: "8px 14px",
  borderRadius: 10,
  fontWeight: 700,
  fontSize: 12,
  cursor: "pointer",
  fontFamily: "var(--lb360-display, 'Sora', sans-serif)",
  letterSpacing: "0.01em",
  boxShadow: "0 4px 12px -4px color-mix(in srgb, #10B981 50%, transparent)",
  transition: "transform 0.18s ease, filter 0.18s ease",
};

const btnGhostStyle: React.CSSProperties = {
  background: "transparent",
  color: "var(--ls-text-muted)",
  border: "1px solid var(--ls-border)",
  padding: "8px 12px",
  borderRadius: 10,
  fontWeight: 600,
  fontSize: 12,
  cursor: "pointer",
  fontFamily: "var(--lb360-display, 'Sora', sans-serif)",
};
