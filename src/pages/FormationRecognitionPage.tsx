// =============================================================================
// FormationRecognitionPage — Feuille de Reconnaissance interactive (2026-11-04)
//
// Remplace la version statique markdown de la boite a outils. Le distri
// peut maintenant :
//   - Definir une date cible pour chaque palier
//   - Ecrire sa recompense personnelle
//   - Cliquer "Marquer atteint" → set la date reelle automatiquement
//   - Voir sa progression visuelle (paliers atteints / total)
//
// Persistance localStorage par user (cle ls-recognition-{userId}).
// V1 simple. V2 future : table user_recognition_paliers en DB.
// =============================================================================

import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { PageHeading } from "../components/ui/PageHeading";
import { useAppContext } from "../context/AppContext";

const STORAGE_PREFIX = "ls-recognition-";

interface PalierData {
  /** Date cible YYYY-MM-DD (vide si non set). */
  targetDate: string;
  /** Date reelle YYYY-MM-DD (set au "Marquer atteint", vide sinon). */
  reachedDate: string;
  /** Recompense ecrite par le distri. */
  reward: string;
}

interface PalierTemplate {
  id: string;
  emoji: string;
  label: string;
  /** Tag de tier visuel : starter / mid / elite */
  tier: "starter" | "mid" | "elite";
}

const DEFAULT_PALIERS: PalierTemplate[] = [
  { id: "first-client", emoji: "🌱", label: "1er client", tier: "starter" },
  { id: "500-pv", emoji: "💧", label: "500 PV cumulés (Senior Consultant)", tier: "starter" },
  { id: "first-distri", emoji: "🤝", label: "1er distributeur parrainé", tier: "starter" },
  { id: "2500-pv", emoji: "🎯", label: "2 500 PV (QP)", tier: "mid" },
  { id: "supervisor", emoji: "⭐", label: "Supervisor (4 000 PV)", tier: "mid" },
  { id: "first-royalty", emoji: "💰", label: "1er chèque royalties", tier: "mid" },
  { id: "world-team", emoji: "🌍", label: "World Team", tier: "mid" },
  { id: "first-event", emoji: "🎉", label: "1er événement majeur", tier: "mid" },
  { id: "get", emoji: "🚀", label: "GET Team", tier: "elite" },
  { id: "millionaire", emoji: "💎", label: "Millionaire Team", tier: "elite" },
  { id: "presidents", emoji: "👑", label: "President's Team", tier: "elite" },
];

const TIER_META: Record<PalierTemplate["tier"], { color: string; label: string }> = {
  starter: { color: "var(--ls-teal)", label: "Démarrage" },
  mid: { color: "var(--ls-gold)", label: "Construction" },
  elite: { color: "var(--ls-purple)", label: "Élite" },
};

type AllData = Record<string, PalierData>;

function readStored(userId: string): AllData {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(STORAGE_PREFIX + userId);
    if (!raw) return {};
    return JSON.parse(raw) as AllData;
  } catch {
    return {};
  }
}

function writeStored(userId: string, value: AllData): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_PREFIX + userId, JSON.stringify(value));
  } catch {
    /* quota */
  }
}

function ymdToday(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function FormationRecognitionPage() {
  const navigate = useNavigate();
  const { currentUser } = useAppContext();
  const userId = currentUser?.id ?? null;
  const [data, setData] = useState<AllData>({});

  useEffect(() => {
    if (!userId) return;
    setData(readStored(userId));
  }, [userId]);

  function updatePalier(id: string, partial: Partial<PalierData>) {
    if (!userId) return;
    setData((prev) => {
      const current = prev[id] ?? { targetDate: "", reachedDate: "", reward: "" };
      const next = { ...prev, [id]: { ...current, ...partial } };
      writeStored(userId, next);
      return next;
    });
  }

  const reachedCount = useMemo(
    () => DEFAULT_PALIERS.filter((p) => data[p.id]?.reachedDate).length,
    [data],
  );
  const totalCount = DEFAULT_PALIERS.length;
  const progress = totalCount > 0 ? Math.round((reachedCount / totalCount) * 100) : 0;

  return (
    <div className="space-y-6" style={{ paddingBottom: 60 }}>
      <button
        type="button"
        onClick={() => navigate("/formation/boite-a-outils")}
        style={{
          background: "transparent",
          border: "0.5px solid var(--ls-border)",
          color: "var(--ls-text-muted)",
          padding: "8px 14px",
          borderRadius: 10,
          fontSize: 12,
          cursor: "pointer",
          fontFamily: "DM Sans, sans-serif",
        }}
      >
        ← Retour à la boîte à outils
      </button>

      <PageHeading
        eyebrow="Engagement · paliers + récompenses"
        title="Feuille de Reconnaissance"
        description="Pour chaque palier atteint, une récompense pré-définie. Le moteur intime qui te fait tenir 12 mois."
      />

      {/* Progress global */}
      <div
        style={{
          padding: "20px 22px",
          borderRadius: 18,
          background:
            "linear-gradient(135deg, color-mix(in srgb, var(--ls-coral) 10%, var(--ls-surface)) 0%, color-mix(in srgb, var(--ls-gold) 6%, var(--ls-surface)) 100%)",
          border: "0.5px solid color-mix(in srgb, var(--ls-coral) 28%, var(--ls-border))",
          fontFamily: "DM Sans, sans-serif",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "baseline",
            marginBottom: 10,
            flexWrap: "wrap",
            gap: 8,
          }}
        >
          <span
            style={{
              fontSize: 11,
              fontWeight: 700,
              letterSpacing: "0.18em",
              textTransform: "uppercase",
              color: "var(--ls-coral)",
            }}
          >
            ✦ Ta progression
          </span>
          <span
            style={{
              fontFamily: "Syne, serif",
              fontWeight: 800,
              fontSize: 24,
              color: "var(--ls-text)",
              letterSpacing: "-0.02em",
            }}
          >
            {reachedCount}
            <span style={{ fontSize: 14, color: "var(--ls-text-muted)", fontWeight: 600 }}>
              /{totalCount}
            </span>{" "}
            <span style={{ fontSize: 13, color: "var(--ls-coral)", fontWeight: 600 }}>
              ({progress}%)
            </span>
          </span>
        </div>
        <div
          style={{
            height: 8,
            background: "var(--ls-surface2)",
            borderRadius: 999,
            overflow: "hidden",
            boxShadow: "inset 0 1px 2px rgba(0,0,0,0.10)",
          }}
        >
          <div
            style={{
              width: `${progress}%`,
              height: "100%",
              background: "linear-gradient(90deg, var(--ls-teal) 0%, var(--ls-gold) 50%, var(--ls-coral) 100%)",
              borderRadius: 999,
              transition: "width 700ms cubic-bezier(0.4, 0, 0.2, 1)",
            }}
          />
        </div>
      </div>

      {/* Liste paliers groupés par tier */}
      {(["starter", "mid", "elite"] as const).map((tier) => {
        const paliers = DEFAULT_PALIERS.filter((p) => p.tier === tier);
        const tierMeta = TIER_META[tier];
        return (
          <section key={tier}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                marginBottom: 12,
                paddingBottom: 8,
                borderBottom: `0.5px solid color-mix(in srgb, ${tierMeta.color} 22%, var(--ls-border))`,
              }}
            >
              <h3
                style={{
                  fontFamily: "Syne, serif",
                  fontWeight: 700,
                  fontSize: 16,
                  margin: 0,
                  color: tierMeta.color,
                  letterSpacing: "-0.012em",
                }}
              >
                {tierMeta.label}
              </h3>
              <span
                style={{
                  fontSize: 11,
                  color: "var(--ls-text-muted)",
                  fontFamily: "DM Sans, sans-serif",
                }}
              >
                ({paliers.filter((p) => data[p.id]?.reachedDate).length}/{paliers.length})
              </span>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {paliers.map((p) => {
                const palData = data[p.id] ?? { targetDate: "", reachedDate: "", reward: "" };
                const isReached = !!palData.reachedDate;
                return (
                  <PalierCard
                    key={p.id}
                    template={p}
                    data={palData}
                    accent={tierMeta.color}
                    isReached={isReached}
                    onTargetDateChange={(v) => updatePalier(p.id, { targetDate: v })}
                    onRewardChange={(v) => updatePalier(p.id, { reward: v })}
                    onMarkReached={() => updatePalier(p.id, { reachedDate: ymdToday() })}
                    onUnmarkReached={() => updatePalier(p.id, { reachedDate: "" })}
                  />
                );
              })}
            </div>
          </section>
        );
      })}

      {/* Footer rappel */}
      <div
        style={{
          padding: "14px 16px",
          background: "var(--ls-surface2)",
          border: "0.5px dashed var(--ls-border)",
          borderRadius: 12,
          fontSize: 12,
          color: "var(--ls-text-muted)",
          lineHeight: 1.6,
          fontFamily: "DM Sans, sans-serif",
        }}
      >
        💡 <strong>Comment choisir tes récompenses</strong> · Tangibles (week-end Lisbonne, pas
        « plus de liberté »), significatives (qui te font vibrer), progressives (du dej resto au
        voyage), visibles (photo punaisée dans ton bureau ou fond d&apos;écran).
        <br />
        <br />
        🔒 Tes données sont enregistrées sur ton appareil.
      </div>
    </div>
  );
}

// ─── PalierCard ────────────────────────────────────────────────────────────

interface PalierCardProps {
  template: PalierTemplate;
  data: PalierData;
  accent: string;
  isReached: boolean;
  onTargetDateChange: (v: string) => void;
  onRewardChange: (v: string) => void;
  onMarkReached: () => void;
  onUnmarkReached: () => void;
}

function PalierCard({
  template,
  data,
  accent,
  isReached,
  onTargetDateChange,
  onRewardChange,
  onMarkReached,
  onUnmarkReached,
}: PalierCardProps) {
  return (
    <div
      style={{
        padding: "14px 16px",
        borderRadius: 14,
        background: isReached
          ? `color-mix(in srgb, ${accent} 8%, var(--ls-surface))`
          : "var(--ls-surface)",
        border: isReached
          ? `0.5px solid color-mix(in srgb, ${accent} 50%, transparent)`
          : "0.5px solid var(--ls-border)",
        borderLeft: `3px solid ${accent}`,
        transition: "all 250ms ease",
        fontFamily: "DM Sans, sans-serif",
      }}
    >
      {/* Header palier : icone + label + bouton atteint */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 12,
          marginBottom: 12,
          flexWrap: "wrap",
        }}
      >
        <div
          style={{
            width: 40,
            height: 40,
            borderRadius: 12,
            background: isReached
              ? `linear-gradient(135deg, ${accent} 0%, color-mix(in srgb, ${accent} 70%, var(--ls-bg)) 100%)`
              : "var(--ls-surface2)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 20,
            boxShadow: isReached ? `0 4px 12px color-mix(in srgb, ${accent} 30%, transparent)` : "none",
            flexShrink: 0,
          }}
          aria-hidden="true"
        >
          {isReached ? "✓" : template.emoji}
        </div>
        <div style={{ flex: 1, minWidth: 200 }}>
          <div
            style={{
              fontFamily: "Syne, serif",
              fontWeight: 700,
              fontSize: 14,
              color: isReached ? "var(--ls-text-muted)" : "var(--ls-text)",
              textDecoration: isReached ? "line-through" : "none",
              letterSpacing: "-0.01em",
            }}
          >
            {template.label}
          </div>
          {isReached ? (
            <div
              style={{
                fontSize: 11,
                color: accent,
                marginTop: 2,
                fontWeight: 600,
              }}
            >
              ✓ Atteint le {data.reachedDate}
            </div>
          ) : null}
        </div>
        <button
          type="button"
          onClick={isReached ? onUnmarkReached : onMarkReached}
          style={{
            padding: "6px 14px",
            borderRadius: 999,
            background: isReached
              ? "var(--ls-surface2)"
              : `linear-gradient(135deg, ${accent} 0%, color-mix(in srgb, ${accent} 70%, var(--ls-bg)) 100%)`,
            border: isReached ? "0.5px solid var(--ls-border)" : "none",
            color: isReached ? "var(--ls-text-muted)" : "var(--ls-bg)",
            fontFamily: "DM Sans, sans-serif",
            fontSize: 11,
            fontWeight: 700,
            cursor: "pointer",
            transition: "all 200ms ease",
            flexShrink: 0,
          }}
        >
          {isReached ? "↩ Annuler" : "✓ Marquer atteint"}
        </button>
      </div>

      {/* Inputs : date cible + récompense */}
      <div style={{ display: "grid", gap: 10, gridTemplateColumns: "1fr 2fr" }}>
        <div>
          <label
            style={{
              display: "block",
              fontSize: 10,
              fontWeight: 700,
              letterSpacing: "0.14em",
              textTransform: "uppercase",
              color: "var(--ls-text-muted)",
              marginBottom: 4,
            }}
          >
            Date cible
          </label>
          <input
            type="date"
            value={data.targetDate}
            onChange={(e) => onTargetDateChange(e.target.value)}
            style={{
              width: "100%",
              padding: "8px 10px",
              borderRadius: 8,
              background: "var(--ls-input-bg, var(--ls-surface2))",
              border: "0.5px solid var(--ls-border)",
              color: "var(--ls-text)",
              fontFamily: "DM Sans, sans-serif",
              fontSize: 12.5,
            }}
          />
        </div>
        <div>
          <label
            style={{
              display: "block",
              fontSize: 10,
              fontWeight: 700,
              letterSpacing: "0.14em",
              textTransform: "uppercase",
              color: "var(--ls-text-muted)",
              marginBottom: 4,
            }}
          >
            Ma récompense
          </label>
          <input
            type="text"
            value={data.reward}
            onChange={(e) => onRewardChange(e.target.value)}
            placeholder="Ex : Week-end à Lisbonne avec mon mec"
            style={{
              width: "100%",
              padding: "8px 10px",
              borderRadius: 8,
              background: "var(--ls-input-bg, var(--ls-surface2))",
              border: "0.5px solid var(--ls-border)",
              color: "var(--ls-text)",
              fontFamily: "DM Sans, sans-serif",
              fontSize: 12.5,
            }}
          />
        </div>
      </div>
    </div>
  );
}
