// =============================================================================
// PvOverrideBlock — saisie admin du PV total Bizworks ce mois
// =============================================================================
// Override la jauge mensuelle Co-pilote avec le vrai chiffre Bizworks
// (source de vérité Herbalife). L'app ne sait calculer que les PV des
// commandes passées via fiche client → systématiquement sous-estimés.
//
// 1 input simple, 30 sec/mois. Conf actée dans CLAUDE.md "Memo Bizworks
// 2026-05-05". RPC + colonnes DB livrées dans migration 20261107080000.
//
// Cette UI était la pièce manquante. Ajout 2026-05-26.
// =============================================================================

import { useEffect, useState, type CSSProperties } from "react";
import { useToast } from "../../context/ToastContext";
import { getSupabaseClient } from "../../services/supabaseClient";
import { currentMonthIso } from "../../lib/herbalifeFormulas";
import { AdminCard, SectionTitle, hintStyle } from "./_shared";

interface Props {
  memberId: string;
  memberName: string;
  /** Valeur initiale connue côté caller (depuis users.monthly_pv_override). */
  initialOverride?: number | null;
  /** Mois ISO de l'initialOverride. Si != mois courant, l'override est obsolète. */
  initialOverrideMonth?: string | null;
  onApplied?: () => void | Promise<void>;
}

export function PvOverrideBlock({
  memberId,
  memberName,
  initialOverride,
  initialOverrideMonth,
  onApplied,
}: Props) {
  const { push: pushToast } = useToast();
  const month = currentMonthIso();
  const isCurrentMonth = initialOverrideMonth === month;
  const initialValue = isCurrentMonth && typeof initialOverride === "number" ? String(initialOverride) : "";

  const [draft, setDraft] = useState(initialValue);
  const [saving, setSaving] = useState(false);
  const [clearing, setClearing] = useState(false);

  useEffect(() => {
    setDraft(initialValue);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [memberId, initialOverride, initialOverrideMonth]);

  const draftNum = (() => {
    const n = Number(draft.replace(",", "."));
    return Number.isFinite(n) && n >= 0 ? n : null;
  })();
  const dirty = draft !== initialValue;

  async function apply() {
    if (saving || draftNum === null) return;
    setSaving(true);
    try {
      const sb = await getSupabaseClient();
      if (!sb) throw new Error("Service indisponible.");
      const { error } = await sb.rpc("set_user_pv_override", {
        p_user_id: memberId,
        p_month: month,
        p_pv: draftNum,
      });
      if (error) throw error;
      pushToast({
        tone: "success",
        title: `✅ PV Bizworks de ${memberName} : ${draftNum}`,
      });
      await onApplied?.();
    } catch (e) {
      pushToast({
        tone: "error",
        title: e instanceof Error ? e.message : "Erreur d'application.",
      });
    } finally {
      setSaving(false);
    }
  }

  async function clearOverride() {
    if (clearing) return;
    if (!confirm(`Supprimer l'override PV de ${memberName} ? La jauge repassera au calcul auto.`)) return;
    setClearing(true);
    try {
      const sb = await getSupabaseClient();
      if (!sb) throw new Error("Service indisponible.");
      const { error } = await sb.rpc("set_user_pv_override", {
        p_user_id: memberId,
        p_month: month,
        p_pv: null,
      });
      if (error) throw error;
      setDraft("");
      pushToast({ tone: "success", title: "🗑 Override supprimé" });
      await onApplied?.();
    } catch (e) {
      pushToast({
        tone: "error",
        title: e instanceof Error ? e.message : "Erreur de suppression.",
      });
    } finally {
      setClearing(false);
    }
  }

  const hasActiveOverride = isCurrentMonth && typeof initialOverride === "number";

  return (
    <AdminCard highlighted={hasActiveOverride} style={{ marginBottom: 14 }}>
      <SectionTitle>💼 Override PV Bizworks (mois en cours)</SectionTitle>
      <p style={hintStyle}>
        Saisis le PV total réel depuis Bizworks (source Herbalife) pour ce mois.
        Override la jauge Co-pilote du distri (sinon calcul auto basé uniquement
        sur les commandes passées dans l'app, systématiquement sous-estimé).
      </p>

      <div style={{ display: "flex", gap: 8, alignItems: "stretch", marginTop: 10, flexWrap: "wrap" }}>
        <input
          type="number"
          inputMode="numeric"
          min={0}
          step={1}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="ex : 4250"
          aria-label="PV total Bizworks"
          style={inputStyle}
        />
        <button
          type="button"
          onClick={apply}
          disabled={saving || !dirty || draftNum === null}
          style={{
            ...applyBtnStyle,
            opacity: saving || !dirty || draftNum === null ? 0.5 : 1,
            cursor: saving || !dirty || draftNum === null ? "not-allowed" : "pointer",
          }}
        >
          {saving ? "…" : "Appliquer"}
        </button>
        {hasActiveOverride && (
          <button
            type="button"
            onClick={clearOverride}
            disabled={clearing}
            style={clearBtnStyle}
            title="Supprimer l'override → repasse au calcul auto"
          >
            {clearing ? "…" : "🗑"}
          </button>
        )}
      </div>

      {hasActiveOverride && (
        <p style={{ ...hintStyle, marginTop: 8, color: "var(--ls-teal)" }}>
          ✓ Override actif : {initialOverride} PV pour {month}
        </p>
      )}
    </AdminCard>
  );
}

const inputStyle: CSSProperties = {
  flex: "1 1 140px",
  padding: "9px 12px",
  borderRadius: 10,
  border: "0.5px solid var(--ls-border)",
  background: "var(--ls-bg)",
  color: "var(--ls-text)",
  fontSize: 14,
  fontFamily: "DM Sans, sans-serif",
  minWidth: 0,
};

const applyBtnStyle: CSSProperties = {
  padding: "9px 16px",
  borderRadius: 10,
  border: "none",
  background: "linear-gradient(135deg, var(--ls-gold), color-mix(in srgb, var(--ls-gold) 80%, var(--ls-coral)))",
  color: "var(--ls-bg)",
  fontFamily: "Syne, sans-serif",
  fontSize: 13,
  fontWeight: 700,
};

const clearBtnStyle: CSSProperties = {
  padding: "9px 14px",
  borderRadius: 10,
  border: "0.5px solid var(--ls-border)",
  background: "transparent",
  color: "var(--ls-coral)",
  fontSize: 14,
  cursor: "pointer",
};
