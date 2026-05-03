// =============================================================================
// RankSelectorModal — pop-up forcé "Confirme ton rang Herbalife" (2026-11-05)
//
// Auto-affichée par AppLayout dès que currentUser.rankSetAt === null.
// Bloque l'app (overlay opaque, pas de bouton fermer) tant que le distri
// n'a pas confirmé son rang. Set users.rank_set_at = now() à la valid.
//
// Pourquoi forcer ? Le rang détermine la marge retail dans le calc FLEX
// (25/35/42/50%). Sans ça, le moteur de pilotage donne des chiffres faux.
//
// Le distri peut modifier son rang plus tard dans /parametres > Profil
// (Phase G3) ou un admin peut l'override dans /users (Phase G3).
// =============================================================================

import { useState } from "react";
import { getSupabaseClient } from "../../services/supabaseClient";
import {
  RANK_LABELS,
  RANK_MARGINS,
  RANK_ORDER,
  type HerbalifeRank,
} from "../../types/domain";

const RANKS: HerbalifeRank[] = RANK_ORDER;

interface RankSelectorModalProps {
  userId: string;
  initialRank?: HerbalifeRank;
  onConfirmed: (rank: HerbalifeRank) => void;
}

export function RankSelectorModal({
  userId,
  initialRank,
  onConfirmed,
}: RankSelectorModalProps) {
  const [selected, setSelected] = useState<HerbalifeRank>(
    initialRank ?? "distributor_25",
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleConfirm() {
    setSaving(true);
    setError(null);
    const sb = await getSupabaseClient();
    if (!sb) {
      setSaving(false);
      setError("Connexion Supabase indisponible");
      return;
    }
    const { error: e } = await sb
      .from("users")
      .update({
        current_rank: selected,
        rank_set_at: new Date().toISOString(),
      })
      .eq("id", userId);
    setSaving(false);
    if (e) {
      setError(e.message);
      return;
    }
    onConfirmed(selected);
  }

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "color-mix(in srgb, var(--ls-bg) 88%, transparent)",
        backdropFilter: "blur(8px)",
        zIndex: 9999,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 16,
      }}
    >
      <div
        style={{
          background: "var(--ls-surface)",
          border: "1px solid var(--ls-gold)",
          borderRadius: 18,
          padding: 28,
          maxWidth: 540,
          width: "100%",
          maxHeight: "90vh",
          overflowY: "auto",
          boxShadow: "0 24px 80px color-mix(in srgb, var(--ls-gold) 24%, transparent)",
        }}
      >
        <div
          style={{
            fontSize: 11,
            fontFamily: "DM Sans, sans-serif",
            textTransform: "uppercase",
            letterSpacing: 1.4,
            color: "var(--ls-gold)",
            marginBottom: 6,
          }}
        >
          Plan marketing Herbalife
        </div>
        <h2
          style={{
            margin: 0,
            fontFamily: "Syne, sans-serif",
            fontSize: 24,
            color: "var(--ls-text)",
            fontWeight: 700,
          }}
        >
          Confirme ton rang actuel
        </h2>
        <p
          style={{
            margin: "8px 0 22px 0",
            fontSize: 13,
            color: "var(--ls-text-muted)",
            fontFamily: "DM Sans, sans-serif",
            lineHeight: 1.55,
          }}
        >
          Ton rang détermine ta marge retail (25 → 50 %) et donc le calcul
          de tes cibles FLEX. Tu peux le modifier à tout moment dans
          Paramètres &gt; Profil.
        </p>

        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {RANKS.map((r) => {
            const active = selected === r;
            const margin = Math.round((RANK_MARGINS[r] ?? 0) * 100);
            return (
              <button
                key={r}
                type="button"
                onClick={() => setSelected(r)}
                style={{
                  textAlign: "left",
                  padding: "14px 16px",
                  borderRadius: 12,
                  border: active
                    ? "1.5px solid var(--ls-gold)"
                    : "0.5px solid var(--ls-border)",
                  background: active
                    ? "color-mix(in srgb, var(--ls-gold) 12%, var(--ls-surface2))"
                    : "var(--ls-surface2)",
                  cursor: "pointer",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  fontFamily: "DM Sans, sans-serif",
                  color: "var(--ls-text)",
                  fontSize: 14,
                  transition: "all 0.15s",
                }}
              >
                <span style={{ fontWeight: active ? 600 : 400 }}>
                  {RANK_LABELS[r]}
                </span>
                <span
                  style={{
                    fontFamily: "Syne, sans-serif",
                    fontSize: 14,
                    color: active ? "var(--ls-gold)" : "var(--ls-text-muted)",
                    fontWeight: 700,
                  }}
                >
                  {margin}%
                </span>
              </button>
            );
          })}
        </div>

        {error && (
          <div
            style={{
              color: "var(--ls-coral)",
              fontSize: 12,
              marginTop: 12,
            }}
          >
            {error}
          </div>
        )}

        <button
          type="button"
          onClick={handleConfirm}
          disabled={saving}
          style={{
            marginTop: 20,
            width: "100%",
            padding: "14px 20px",
            borderRadius: 12,
            border: "none",
            background: saving
              ? "var(--ls-border)"
              : "linear-gradient(135deg, var(--ls-gold), color-mix(in srgb, var(--ls-gold) 80%, var(--ls-coral)))",
            color: "var(--ls-bg)",
            fontFamily: "Syne, sans-serif",
            fontSize: 15,
            fontWeight: 700,
            cursor: saving ? "wait" : "pointer",
          }}
        >
          {saving ? "Enregistrement…" : "✓ Confirmer mon rang"}
        </button>

        <p
          style={{
            margin: "14px 0 0 0",
            fontSize: 11,
            color: "var(--ls-text-muted)",
            fontFamily: "DM Sans, sans-serif",
            textAlign: "center",
          }}
        >
          Tu pourras le modifier à tout moment.
        </p>
      </div>
    </div>
  );
}
