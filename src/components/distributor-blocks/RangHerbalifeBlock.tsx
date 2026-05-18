// =============================================================================
// RangHerbalifeBlock — admin edition du rang Herbalife (12 paliers)
// =============================================================================
// Extrait de TeamMemberDrilldownModal (Chantier #13 sous-vague A.1, 2026-05-18).
// =============================================================================

import { useState } from "react";
import { useToast, buildSupabaseErrorToast } from "../../context/ToastContext";
import { setUserRankAdmin } from "../../services/supabaseService";
import {
  RANK_LABELS,
  RANK_ORDER,
  type HerbalifeRank,
  type User,
} from "../../types/domain";
import { AdminCard, hintStyle, labelStyle, PrimaryActionButton } from "./_shared";

interface Props {
  memberId: string;
  memberName: string;
  fullUser: User | null;
  onApplied?: () => void | Promise<void>;
}

export function RangHerbalifeBlock({ memberId, memberName, fullUser, onApplied }: Props) {
  const { push: pushToast } = useToast();
  const [rankDraft, setRankDraft] = useState<HerbalifeRank>(
    (fullUser?.currentRank as HerbalifeRank | undefined) ?? "distributor_25",
  );
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    if (saving) return;
    setSaving(true);
    try {
      await setUserRankAdmin(memberId, rankDraft);
      pushToast({
        tone: "success",
        title: "Rang mis a jour",
        message: `${memberName} → ${RANK_LABELS[rankDraft]}`,
      });
      await onApplied?.();
    } catch (err) {
      pushToast(buildSupabaseErrorToast(err, "Impossible de mettre a jour le rang."));
    } finally {
      setSaving(false);
    }
  }

  return (
    <AdminCard style={{ marginTop: 18 }}>
      <div style={labelStyle}>🎖️ Rang Herbalife</div>
      <div style={hintStyle}>
        Ajuste le rang si le distri ne l'a pas fait lui-meme. Determine la marge retail
        dans les calculs FLEX / Rentabilite.
      </div>
      <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
        <select
          value={rankDraft}
          onChange={(e) => setRankDraft(e.target.value as HerbalifeRank)}
          style={{
            flex: "1 1 200px",
            padding: "9px 12px",
            borderRadius: 10,
            border: "1px solid var(--ls-border)",
            background: "var(--ls-surface)",
            color: "var(--ls-text)",
            fontSize: 13,
            fontFamily: "Inter, system-ui, sans-serif",
            cursor: "pointer",
          }}
        >
          {RANK_ORDER.map((r) => (
            <option key={r} value={r}>
              {RANK_LABELS[r]}
            </option>
          ))}
        </select>
        <PrimaryActionButton
          label="Appliquer"
          onClick={() => void handleSave()}
          busy={saving}
          disabled={rankDraft === fullUser?.currentRank}
        />
      </div>
    </AdminCard>
  );
}
