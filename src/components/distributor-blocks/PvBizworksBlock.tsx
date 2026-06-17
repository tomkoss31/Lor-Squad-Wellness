// =============================================================================
// PvBizworksBlock — saisie admin du PV Bizworks par tier de remise downline
// =============================================================================
// Extrait de TeamMemberDrilldownModal (Chantier #13 sous-vague A.1, 2026-05-18).
// 5 inputs : PV15 / PV25 (toggle VIP) / PV35 (toggle VIP) / PV42 / PV Royalty.
// Total live + override estim. EUR. Tout a 0 = clear (calcul auto via commandes).
// =============================================================================

import { useEffect, useMemo, useState } from "react";
import { useToast, buildSupabaseErrorToast } from "../../context/ToastContext";
import { usePvBreakdowns } from "../../hooks/usePvBreakdowns";
import {
  COMMISSION_PCT_BY_TIER,
  PV_TO_EUR_RATIO,
  ROYALTY_OVERRIDE_PCT,
  computeOverrideEur,
  currentMonthIso,
  emptyBreakdown,
  totalPvFromBreakdown,
  type PvMonthlyBreakdown,
} from "../../lib/herbalifeFormulas";
import { setUserPvBreakdown } from "../../services/supabaseService";
import { getSupabaseClient } from "../../services/supabaseClient";
import { AdminCard, hintStyle, PvTierRow } from "./_shared";

interface Props {
  memberId: string;
  memberName: string;
  /** ISO YYYY-MM, default = mois en cours. */
  monthIso?: string;
  onApplied?: () => void | Promise<void>;
}

export function PvBizworksBlock({ memberId, memberName, monthIso, onApplied }: Props) {
  const { push: pushToast } = useToast();
  const month = monthIso ?? currentMonthIso();
  const { getForUser, refetch } = usePvBreakdowns(month);
  const existingBreakdown = getForUser(memberId);

  const [pvDraft, setPvDraft] = useState({
    pv15: "",
    pv25: "",
    pv35: "",
    pv42: "",
    pvRoyalty: "",
    pv25IsVip: false,
    pv35IsVip: false,
  });
  const [saving, setSaving] = useState(false);

  // Hydrate inputs quand le breakdown est fetched
  useEffect(() => {
    if (existingBreakdown) {
      setPvDraft({
        pv15: existingBreakdown.pv15 ? String(existingBreakdown.pv15) : "",
        pv25: existingBreakdown.pv25 ? String(existingBreakdown.pv25) : "",
        pv35: existingBreakdown.pv35 ? String(existingBreakdown.pv35) : "",
        pv42: existingBreakdown.pv42 ? String(existingBreakdown.pv42) : "",
        pvRoyalty: existingBreakdown.pvRoyalty ? String(existingBreakdown.pvRoyalty) : "",
        pv25IsVip: existingBreakdown.pv25IsVip,
        pv35IsVip: existingBreakdown.pv35IsVip,
      });
    }
  }, [existingBreakdown?.userId, existingBreakdown?.month, existingBreakdown]);

  const draftBreakdown = useMemo<PvMonthlyBreakdown>(() => {
    const parse = (s: string) => {
      const n = Number(s.replace(",", "."));
      return Number.isFinite(n) && n >= 0 ? n : 0;
    };
    return {
      ...emptyBreakdown(memberId, month),
      pv15: parse(pvDraft.pv15),
      pv25: parse(pvDraft.pv25),
      pv35: parse(pvDraft.pv35),
      pv42: parse(pvDraft.pv42),
      pvRoyalty: parse(pvDraft.pvRoyalty),
      pv25IsVip: pvDraft.pv25IsVip,
      pv35IsVip: pvDraft.pv35IsVip,
    };
  }, [pvDraft, memberId, month]);

  const draftTotalPv = totalPvFromBreakdown(draftBreakdown);
  const draftOverrideEur = computeOverrideEur(draftBreakdown);

  async function handleSave() {
    if (saving) return;
    setSaving(true);
    try {
      await setUserPvBreakdown({
        userId: memberId,
        month,
        pv15: draftBreakdown.pv15,
        pv25: draftBreakdown.pv25,
        pv35: draftBreakdown.pv35,
        pv42: draftBreakdown.pv42,
        pvRoyalty: draftBreakdown.pvRoyalty,
        pv25IsVip: draftBreakdown.pv25IsVip,
        pv35IsVip: draftBreakdown.pv35IsVip,
      });
      // Unification (2026-06-16) : le total du breakdown pilote AUSSI la jauge
      // Co-pilote (users.monthly_pv_override) → plus de divergence entre les
      // deux saisies. Le breakdown reste la source du rang + de la commission
      // (formules inchangées) ; on aligne juste l'affichage de la jauge.
      try {
        const sb = await getSupabaseClient();
        if (sb) {
          await sb.rpc("set_user_pv_override", {
            p_user_id: memberId,
            p_month: month,
            p_pv: draftTotalPv > 0 ? draftTotalPv : null,
          });
        }
      } catch {
        /* best-effort : la jauge se resynchronisera au prochain enregistrement */
      }
      const isCleared = draftTotalPv === 0;
      pushToast({
        tone: "success",
        title: isCleared ? "Breakdown efface" : "PV Bizworks enregistres",
        message: isCleared
          ? `${memberName} → calcul auto (commandes app)`
          : `${memberName} → ${draftTotalPv.toLocaleString("fr-FR")} PV · override estim. ${Math.round(draftOverrideEur).toLocaleString("fr-FR")} €`,
      });
      await refetch();
      await onApplied?.();
    } catch (err) {
      pushToast(buildSupabaseErrorToast(err, "Impossible d'enregistrer le PV."));
    } finally {
      setSaving(false);
    }
  }

  return (
    <AdminCard highlighted={!!existingBreakdown} style={{ marginTop: 12 }}>
      <div
        style={{
          fontSize: 12,
          fontWeight: 700,
          color: "var(--ls-text)",
          letterSpacing: 0.3,
          marginBottom: 4,
          display: "flex",
          alignItems: "center",
          gap: 6,
          flexWrap: "wrap",
        }}
      >
        <span>📊 PV Bizworks · {month} · breakdown par tier</span>
        {existingBreakdown ? (
          <span
            style={{
              fontSize: 10,
              padding: "2px 6px",
              borderRadius: 6,
              background: "color-mix(in srgb, var(--ls-teal) 18%, transparent)",
              color: "var(--ls-teal)",
              textTransform: "uppercase",
              letterSpacing: 0.5,
            }}
          >
            Saisi
          </span>
        ) : null}
      </div>
      <div style={hintStyle}>
        Transcris depuis ta fiche RO Herbalife le PV de {memberName} par palier.
        Mid-month rank-up : si le distri etait a 25% puis a 35%, repartis. Tout a 0 = clear.
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 10 }}>
        <PvTierRow
          label="PV à 15% (Préféré VIP)"
          tip={`commission toi : ${Math.round(COMMISSION_PCT_BY_TIER.pv15 * 100)}%`}
          value={pvDraft.pv15}
          onChange={(v) => setPvDraft({ ...pvDraft, pv15: v })}
        />
        <PvTierRow
          label={pvDraft.pv25IsVip ? "PV à 25% (Silver VIP)" : "PV à 25% (Distributor)"}
          tip={`commission toi : ${Math.round(COMMISSION_PCT_BY_TIER.pv25 * 100)}% · ⭐ pour basculer VIP/Distri`}
          value={pvDraft.pv25}
          onChange={(v) => setPvDraft({ ...pvDraft, pv25: v })}
          vipFlag={pvDraft.pv25IsVip}
          onToggleVip={() => setPvDraft({ ...pvDraft, pv25IsVip: !pvDraft.pv25IsVip })}
        />
        <PvTierRow
          label={pvDraft.pv35IsVip ? "PV à 35% (Gold VIP)" : "PV à 35% (Senior Consultant)"}
          tip={`commission toi : ${Math.round(COMMISSION_PCT_BY_TIER.pv35 * 100)}% · ⭐ pour basculer VIP/Distri`}
          value={pvDraft.pv35}
          onChange={(v) => setPvDraft({ ...pvDraft, pv35: v })}
          vipFlag={pvDraft.pv35IsVip}
          onToggleVip={() => setPvDraft({ ...pvDraft, pv35IsVip: !pvDraft.pv35IsVip })}
        />
        <PvTierRow
          label="PV à 42% (Success Builder)"
          tip={`commission toi : ${Math.round(COMMISSION_PCT_BY_TIER.pv42 * 100)}%`}
          value={pvDraft.pv42}
          onChange={(v) => setPvDraft({ ...pvDraft, pv42: v })}
        />
        <PvTierRow
          label="PV Royalty (downline Supervisor 50%)"
          tip={`royalty toi : ${Math.round(ROYALTY_OVERRIDE_PCT * 100)}%`}
          value={pvDraft.pvRoyalty}
          onChange={(v) => setPvDraft({ ...pvDraft, pvRoyalty: v })}
        />
      </div>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          padding: "8px 10px",
          borderRadius: 8,
          background: "var(--ls-surface)",
          marginBottom: 10,
          fontSize: 12,
          gap: 12,
          flexWrap: "wrap",
        }}
      >
        <span style={{ color: "var(--ls-text-muted)" }}>
          Total :{" "}
          <strong style={{ color: "var(--ls-text)" }}>
            {draftTotalPv.toLocaleString("fr-FR")} PV
          </strong>
        </span>
        <span style={{ color: "var(--ls-teal)", fontWeight: 700 }}>
          Override estim. ~{Math.round(draftOverrideEur).toLocaleString("fr-FR")} €
        </span>
      </div>
      <div
        style={{
          fontSize: 10,
          color: "var(--ls-text-muted)",
          fontStyle: "italic",
          marginBottom: 8,
        }}
      >
        Ratio {PV_TO_EUR_RATIO} €/PV (calibre fiche RO 2026-03)
      </div>
      <button
        type="button"
        onClick={() => void handleSave()}
        disabled={saving}
        style={{
          width: "100%",
          padding: "9px 14px",
          borderRadius: 10,
          border: "none",
          background: saving
            ? "var(--ls-surface2)"
            : "linear-gradient(135deg, #10B981 0%, #06B6D4 50%, #8B5CF6 100%)",
          color: saving ? "var(--ls-text-muted)" : "#FFFFFF",
          fontSize: 12,
          fontWeight: 700,
          fontFamily: "Sora, system-ui, sans-serif",
          cursor: saving ? "wait" : "pointer",
        }}
      >
        {saving ? "…" : "Appliquer"}
      </button>
    </AdminCard>
  );
}
